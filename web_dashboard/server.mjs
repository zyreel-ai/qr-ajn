import http from 'node:http';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.VERCEL ? path.join('/tmp', 'qr-ajn', 'data') : path.join(root, 'data');
const uploadsDir = path.join(dataDir, 'uploads');
const dbFile = process.env.QR_AJN_DATA_FILE ? path.resolve(process.env.QR_AJN_DATA_FILE) : path.join(dataDir, 'local-db.json');
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const publicOrigin = String(process.env.PUBLIC_ORIGIN || '').replace(/\/$/, '');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
const isVercel = Boolean(process.env.VERCEL);
let pgPool = null;
if (databaseUrl) {
  const {Pool} = await import('pg');
  pgPool = new Pool({
    connectionString: databaseUrl,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true
  });
}
const JSON_LIMIT = 256 * 1024;
const IMAGE_LIMIT = 4 * 1024 * 1024;
const PDF_LIMIT = 12 * 1024 * 1024;
const MAX_EVENTS = 150000;
const RESERVED_SLUGS = new Set([
  'admin','api','manage','login','signup','privacy','terms','contact','about','analytics','assets','public','r','create','profile','profiles','qr','qrs','media','favicon','robots','sitemap','ads','health','index','404','manifest','static','dashboard','workspace','account','pricing','premium','billing','create-profile','create-qr'
]);
const mime = new Map([
  ['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.mjs','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],
  ['.json','application/json; charset=utf-8'],['.svg','image/svg+xml; charset=utf-8'],['.png','image/png'],['.jpg','image/jpeg'],['.jpeg','image/jpeg'],
  ['.webp','image/webp'],['.ico','image/x-icon'],['.txt','text/plain; charset=utf-8'],['.xml','application/xml; charset=utf-8'],['.webmanifest','application/manifest+json; charset=utf-8'],['.pdf','application/pdf']
]);

let mutationQueue = Promise.resolve();
const rateBuckets = new Map();
await ensureDatabase();

const server = http.createServer(async (req,res) => {
  const requestId = crypto.randomUUID();
  setHeaders(res, requestId);
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    if (req.method === 'GET' && url.pathname === '/api/v1/health') {
      const db = await readDb();
      return json(res,200,{
        ok:!isVercel||Boolean(pgPool), product:'QR AJN', version:'8.4.0', mode:'qr-profile-analytics', database:pgPool?'postgres-jsonb':isVercel?'unconfigured':'local-json', persistence:pgPool?'durable':isVercel?'not-configured':'local',
        auth:'removed', workspace:'removed', billing:'removed', premium:'removed', cloudFunctions:'removed',
        dynamicQrs:db.qrs.length, profiles:db.profiles.length, scanEvents:db.scans.length, profileEvents:db.profileEvents.length
      });
    }

    const publicLinkAvailabilityMatch=url.pathname.match(/^\/api\/links\/([a-z0-9-]{1,40})\/availability$/);
    if(publicLinkAvailabilityMatch && req.method==='GET'){
      const slug=cleanSlug(publicLinkAvailabilityMatch[1]); let reason='';
      try{validatePublicSlug(slug,'Brand link');}catch(e){reason=e.message||'Invalid link.';}
      if(reason)return json(res,200,{available:false,slug,reason});
      const db=await readDb(); const usedByProfile=db.profiles.some(x=>x.slug===slug); const usedByQr=db.qrs.some(x=>x.brandSlug===slug);
      return json(res,200,{available:!usedByProfile&&!usedByQr,slug,reason:usedByProfile||usedByQr?'This link is already in use.':''});
    }

    // ------------------------- Trackable QR API -------------------------
    if (req.method === 'POST' && url.pathname === '/api/qrs') {
      enforceRate(req, 'qr-create', 30, 60_000);
      const body = await readJson(req);
      const destinationUrl = safeHttpUrl(body.destinationUrl);
      const brandSlug = cleanSlug(body.brandSlug || body.name);
      validatePublicSlug(brandSlug,'Brand link');
      const name = cleanText(body.name || brandSlug, 100) || brandSlug;
      const manageToken = token();
      const createdAt = nowIso();
      const qr = { id:id('qr'), slug:uniqueCode(9), brandSlug, tokenHash:sha256(manageToken), name, destinationUrl, isActive:true, scanCount:0, createdAt, updatedAt:createdAt };
      await mutateDb(db => {
        if(db.profiles.some(x=>x.slug===brandSlug)||db.qrs.some(x=>x.brandSlug===brandSlug)) throw httpError(409,'That public link is already in use. Choose another.');
        while (db.qrs.some(x=>x.slug===qr.slug)) qr.slug=uniqueCode(9);
        db.qrs.push(qr);
      });
      const origin = effectiveOrigin(req);
      return json(res,201,{qr:publicQr(qr),manageToken,redirectUrl:`${origin}/${qr.brandSlug}`,legacyRedirectUrl:`${origin}/r/${qr.slug}`,manageUrl:`${origin}/manage/${qr.id}/${manageToken}`});
    }

    const qrManageMatch = url.pathname.match(/^\/api\/manage\/qrs\/([A-Za-z0-9_-]{6,100})$/);
    if (qrManageMatch && req.method === 'GET') {
      enforceRate(req,'qr-manage-read',240,60_000);
      const db=await readDb(); const qr=db.qrs.find(x=>x.id===qrManageMatch[1]);
      if(!qr) return json(res,404,{error:'QR not found'}); authorizeManage(req,qr);
      return json(res,200,managementPayload(qr,db));
    }
    if (qrManageMatch && req.method === 'PATCH') {
      enforceRate(req,'qr-manage-write',90,60_000); const body=await readJson(req); let result;
      await mutateDb(db=>{ const qr=db.qrs.find(x=>x.id===qrManageMatch[1]); if(!qr) throw httpError(404,'QR not found'); authorizeManage(req,qr);
        if(Object.hasOwn(body,'name')) qr.name=cleanText(body.name,100)||qr.name;
        if(Object.hasOwn(body,'destinationUrl')) qr.destinationUrl=safeHttpUrl(body.destinationUrl);
        if(Object.hasOwn(body,'isActive')) qr.isActive=Boolean(body.isActive);
        qr.updatedAt=nowIso(); result=publicQr(qr);
      });
      return json(res,200,{qr:result});
    }
    if (qrManageMatch && req.method === 'DELETE') {
      enforceRate(req,'qr-manage-write',30,60_000);
      await mutateDb(db=>{ const i=db.qrs.findIndex(x=>x.id===qrManageMatch[1]); if(i<0) throw httpError(404,'QR not found'); authorizeManage(req,db.qrs[i]); const qrId=db.qrs[i].id; db.qrs.splice(i,1); db.scans=db.scans.filter(x=>x.qrId!==qrId); });
      return json(res,200,{deleted:true});
    }

    const qrRedirectMatch=url.pathname.match(/^\/r\/((?!p-)[A-Za-z0-9_-]{5,80})$/);
    if(qrRedirectMatch && req.method==='GET'){
      let destination; let unavailable=false;
      await mutateDb(db=>{ const qr=db.qrs.find(x=>x.slug===qrRedirectMatch[1]); if(!qr||qr.isActive===false){unavailable=true;return;} destination=safeHttpUrl(qr.destinationUrl); const event=scanEvent(req,db.meta.installSecret,qr.id); qr.scanCount=Number(qr.scanCount||0)+1; qr.updatedAt=nowIso(); db.scans.push(event); trimEvents(db); });
      if(unavailable) return htmlMessage(res,404,'QR unavailable','This trackable QR is missing, paused or deleted.');
      res.setHeader('cache-control','no-store, no-cache, must-revalidate'); res.writeHead(302,{location:destination}); return res.end();
    }

    // ------------------------- Public profile API -------------------------
    if (req.method === 'POST' && url.pathname === '/api/profiles') {
      enforceRate(req,'profile-create',20,60_000);
      const body=await readJson(req); const slug=cleanSlug(body.slug); validateSlug(slug);
      const manageToken=token(); const createdAt=nowIso();
      const profile=normalizeProfileInput(body,{slug,manageToken,createdAt});
      await mutateDb(db=>{ if(db.profiles.some(x=>x.slug===slug)||db.qrs.some(x=>x.brandSlug===slug)) throw httpError(409,'That public link is already in use. Choose another.'); while(db.profiles.some(x=>x.qrSlug===profile.qrSlug)) profile.qrSlug=`p-${uniqueCode(10)}`; db.profiles.push(profile); });
      const origin=effectiveOrigin(req);
      return json(res,201,{profile:publicProfile(profile,origin),manageToken,publicUrl:`${origin}/${slug}`,manageUrl:`${origin}/manage/profile/${slug}/${manageToken}`,profileQrUrl:`${origin}/r/${profile.qrSlug}`});
    }

    const profileApiMatch=url.pathname.match(/^\/api\/profiles\/([a-z0-9-]{3,40})$/);
    if(profileApiMatch && req.method==='GET'){
      const db=await readDb(); const profile=db.profiles.find(x=>x.slug===profileApiMatch[1]);
      if(!profile||profile.isActive===false) return json(res,404,{error:'Profile not found'});
      return json(res,200,{profile:publicProfile(profile,effectiveOrigin(req))});
    }

    const profileActionMatch=url.pathname.match(/^\/api\/profiles\/([a-z0-9-]{3,40})\/actions$/);
    if(profileActionMatch && req.method==='POST'){
      enforceRate(req,'profile-action',240,60_000); const body=await readJson(req); const action=cleanAction(body.action); const label=cleanText(body.label||'',80);
      await mutateDb(db=>{ const profile=db.profiles.find(x=>x.slug===profileActionMatch[1]); if(!profile||profile.isActive===false) throw httpError(404,'Profile not found'); db.profileEvents.push(profileEvent(req,db.meta.installSecret,profile.id,'action',{action,label})); trimEvents(db); });
      return json(res,201,{ok:true});
    }

    const profileDocShareMatch=url.pathname.match(/^\/api\/profiles\/([a-z0-9-]{3,40})\/documents\/([a-z0-9-]{1,60})\/share$/);
    if(profileDocShareMatch && req.method==='POST'){
      enforceRate(req,'profile-doc-share',180,60_000);
      await mutateDb(db=>{ const p=db.profiles.find(x=>x.slug===profileDocShareMatch[1]); if(!p||p.isActive===false) throw httpError(404,'Profile not found'); const d=p.documents.find(x=>x.slug===profileDocShareMatch[2]); if(!d) throw httpError(404,'Document not found'); db.profileEvents.push(profileEvent(req,db.meta.installSecret,p.id,'document_share',{documentSlug:d.slug,label:d.title})); trimEvents(db); });
      return json(res,201,{ok:true});
    }

    // ------------------------- Profile management -------------------------
    const profileManageMatch=url.pathname.match(/^\/api\/manage\/profiles\/([a-z0-9-]{3,40})$/);
    if(profileManageMatch && req.method==='GET'){
      enforceRate(req,'profile-manage-read',240,60_000); const db=await readDb(); const p=db.profiles.find(x=>x.slug===profileManageMatch[1]); if(!p) return json(res,404,{error:'Profile not found'}); authorizeManage(req,p); return json(res,200,profileManagementPayload(p,db,effectiveOrigin(req)));
    }
    if(profileManageMatch && req.method==='PATCH'){
      enforceRate(req,'profile-manage-write',90,60_000); const body=await readJson(req); let result;
      await mutateDb(db=>{ const p=db.profiles.find(x=>x.slug===profileManageMatch[1]); if(!p) throw httpError(404,'Profile not found'); authorizeManage(req,p); applyProfilePatch(p,body); p.updatedAt=nowIso(); result=publicProfile(p,effectiveOrigin(req)); });
      return json(res,200,{profile:result});
    }
    if(profileManageMatch && req.method==='DELETE'){
      enforceRate(req,'profile-manage-delete',20,60_000); let files=[];
      await mutateDb(db=>{ const i=db.profiles.findIndex(x=>x.slug===profileManageMatch[1]); if(i<0) throw httpError(404,'Profile not found'); const p=db.profiles[i]; authorizeManage(req,p); files=profileFiles(p); const pid=p.id; db.profiles.splice(i,1); db.profileEvents=db.profileEvents.filter(x=>x.profileId!==pid); });
      await Promise.all(files.map(safeDeleteUpload)); return json(res,200,{deleted:true});
    }

    const mediaMatch=url.pathname.match(/^\/api\/manage\/profiles\/([a-z0-9-]{3,40})\/media\/(logo|cover)$/);
    if(mediaMatch && req.method==='PUT'){
      enforceRate(req,'profile-media',30,60_000); const mimeType=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase(); const ext=imageExtension(mimeType); if(!ext) throw httpError(415,'Use PNG, JPEG or WebP images only.'); const buffer=await readBuffer(req,IMAGE_LIMIT); if(buffer.length<20||!validImageSignature(buffer,mimeType)) throw httpError(400,'Image file is empty, invalid or does not match its file type.');
      const media={id:id('media'),fileName:`${id('img')}${ext}`,mime:mimeType,size:buffer.length,updatedAt:nowIso()}; await fs.writeFile(path.join(uploadsDir,media.fileName),buffer,{flag:'wx'}); let previous=null; let result;
      try{await mutateDb(db=>{const p=db.profiles.find(x=>x.slug===mediaMatch[1]); if(!p) throw httpError(404,'Profile not found'); authorizeManage(req,p); previous=p.media?.[mediaMatch[2]]?.fileName||null; p.media=p.media||{}; p.media[mediaMatch[2]]=media; p.updatedAt=nowIso(); result=publicProfile(p,effectiveOrigin(req));});}catch(e){await safeDeleteUpload(media.fileName);throw e;} if(previous) await safeDeleteUpload(previous); return json(res,200,{profile:result});
    }
    if(mediaMatch && req.method==='DELETE'){
      let previous=null; let result; await mutateDb(db=>{const p=db.profiles.find(x=>x.slug===mediaMatch[1]); if(!p) throw httpError(404,'Profile not found'); authorizeManage(req,p); previous=p.media?.[mediaMatch[2]]?.fileName||null; if(p.media) p.media[mediaMatch[2]]=null; p.updatedAt=nowIso(); result=publicProfile(p,effectiveOrigin(req));}); if(previous) await safeDeleteUpload(previous); return json(res,200,{profile:result});
    }

    const docsCreateMatch=url.pathname.match(/^\/api\/manage\/profiles\/([a-z0-9-]{3,40})\/documents$/);
    if(docsCreateMatch && req.method==='POST'){
      enforceRate(req,'profile-doc-upload',30,60_000); const contentType=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase(); if(contentType!=='application/pdf') throw httpError(415,'Only PDF documents are supported.'); const title=cleanText(headerValue(req,'x-document-title')||'Document',100)||'Document'; const docSlug=cleanDocumentSlug(headerValue(req,'x-document-slug')||title); const buffer=await readBuffer(req,PDF_LIMIT); if(buffer.length<5||buffer.subarray(0,5).toString('ascii')!=='%PDF-') throw httpError(400,'The uploaded file is not a valid PDF.'); const fileName=`${id('pdf')}.pdf`; await fs.writeFile(path.join(uploadsDir,fileName),buffer,{flag:'wx'}); let result;
      try{await mutateDb(db=>{const p=db.profiles.find(x=>x.slug===docsCreateMatch[1]); if(!p) throw httpError(404,'Profile not found'); authorizeManage(req,p); if(p.documents.length>=20) throw httpError(400,'A profile can contain up to 20 PDFs.'); if(p.documents.some(x=>x.slug===docSlug)) throw httpError(409,'That document link name already exists.'); const d={id:id('doc'),slug:docSlug,title,fileName,mime:'application/pdf',size:buffer.length,createdAt:nowIso(),updatedAt:nowIso()}; p.documents.push(d); p.updatedAt=nowIso(); result=publicDocument(d,p,effectiveOrigin(req));});}catch(e){await safeDeleteUpload(fileName);throw e;} return json(res,201,{document:result});
    }

    const docManageMatch=url.pathname.match(/^\/api\/manage\/profiles\/([a-z0-9-]{3,40})\/documents\/([a-z0-9-]{1,60})$/);
    if(docManageMatch && req.method==='DELETE'){
      let fileName=null; await mutateDb(db=>{const p=db.profiles.find(x=>x.slug===docManageMatch[1]); if(!p) throw httpError(404,'Profile not found'); authorizeManage(req,p); const i=p.documents.findIndex(x=>x.slug===docManageMatch[2]); if(i<0) throw httpError(404,'Document not found'); fileName=p.documents[i].fileName; p.documents.splice(i,1); p.updatedAt=nowIso(); db.profileEvents=db.profileEvents.filter(e=>!(e.profileId===p.id&&e.documentSlug===docManageMatch[2]));}); if(fileName) await safeDeleteUpload(fileName); return json(res,200,{deleted:true});
    }

    // ------------------------- Media and clean document routes -------------------------
    const mediaPublicMatch=url.pathname.match(/^\/media\/([A-Za-z0-9_-]{6,100})$/);
    if(mediaPublicMatch && (req.method==='GET'||req.method==='HEAD')){
      const db=await readDb(); let found=null; for(const p of db.profiles){for(const kind of ['logo','cover']){const m=p.media?.[kind]; if(m?.id===mediaPublicMatch[1]){found=m;break;}} if(found)break;}
      if(!found) return htmlMessage(res,404,'Image not found','This profile image is unavailable.'); return serveUpload(found,res,req.method==='HEAD');
    }

    const profileQrMatch=url.pathname.match(/^\/r\/(p-[A-Za-z0-9_-]{6,80})$/);
    if(profileQrMatch && req.method==='GET'){
      let slug=null; let unavailable=false; await mutateDb(db=>{const p=db.profiles.find(x=>x.qrSlug===profileQrMatch[1]); if(!p||p.isActive===false){unavailable=true;return;} slug=p.slug; db.profileEvents.push(profileEvent(req,db.meta.installSecret,p.id,'qr_scan',{})); trimEvents(db);}); if(unavailable) return htmlMessage(res,404,'Profile unavailable','This QR AJN profile is missing or paused.'); const origin=effectiveOrigin(req); res.setHeader('cache-control','no-store'); res.writeHead(302,{location:`${origin}/${slug}?from=qr`}); return res.end();
    }

    const docPublicMatch=url.pathname.match(/^\/([a-z0-9-]{3,40})\/([a-z0-9-]{1,60})$/);
    if(docPublicMatch && (req.method==='GET'||req.method==='HEAD')){
      let found=null; let profile=null; const db=await readDb(); profile=db.profiles.find(x=>x.slug===docPublicMatch[1]); if(profile&&profile.isActive!==false) found=profile.documents.find(x=>x.slug===docPublicMatch[2]); if(!profile||!found) return htmlMessage(res,404,'Document not found','This public PDF is unavailable.');
      if(req.method==='GET') await mutateDb(d=>{const p=d.profiles.find(x=>x.id===profile.id); if(!p||p.isActive===false)return; const doc=p.documents.find(x=>x.slug===found.slug); if(!doc)return; d.profileEvents.push(profileEvent(req,d.meta.installSecret,p.id,'document_view',{documentSlug:doc.slug,label:doc.title})); trimEvents(d);});
      return serveUpload(found,res,req.method==='HEAD',{contentDisposition:`inline; filename="${asciiFilename(found.title)}.pdf"`});
    }

    // ------------------------- HTML routing -------------------------
    if ((req.method==='GET'||req.method==='HEAD')) {
      const publicPageMatch=url.pathname.match(/^\/([a-z0-9-]{3,40})\/?$/);
      if(publicPageMatch && !RESERVED_SLUGS.has(publicPageMatch[1])){
        const publicSlug=publicPageMatch[1]; const db=await readDb(); const p=db.profiles.find(x=>x.slug===publicSlug);
        if(p){
          if(p.isActive===false)return serveStaticFile('404.html',res,req.method==='HEAD',404);
          if(req.method==='GET')await mutateDb(d=>{const profile=d.profiles.find(x=>x.id===p.id);if(profile&&profile.isActive!==false){d.profileEvents.push(profileEvent(req,d.meta.installSecret,profile.id,'profile_view',{}));trimEvents(d);}});
          return serveProfileHtml(p,res,req.method==='HEAD',effectiveOrigin(req));
        }
        const brandedQr=db.qrs.find(x=>x.brandSlug===publicSlug);
        if(brandedQr){
          if(brandedQr.isActive===false)return htmlMessage(res,404,'QR unavailable','This trackable QR is paused or unavailable.');
          if(req.method==='HEAD'){const destination=safeHttpUrl(brandedQr.destinationUrl);res.setHeader('cache-control','no-store');res.writeHead(302,{location:destination});return res.end();}
          let destination=''; await mutateDb(d=>{const qr=d.qrs.find(x=>x.id===brandedQr.id);if(!qr||qr.isActive===false)throw httpError(404,'QR unavailable');destination=safeHttpUrl(qr.destinationUrl);qr.scanCount=Number(qr.scanCount||0)+1;qr.updatedAt=nowIso();d.scans.push(scanEvent(req,d.meta.installSecret,qr.id));trimEvents(d);});
          res.setHeader('cache-control','no-store, no-cache, must-revalidate');res.writeHead(302,{location:destination});return res.end();
        }
        return serveStaticFile('404.html',res,req.method==='HEAD',404);
      }
      return serveRoute(url.pathname,res,req.method==='HEAD');
    }

    return json(res,405,{error:'Method not allowed',requestId});
  } catch(error){
    const status=Number(error.statusCode||500); if(status>=500) console.error(`[${requestId}]`,error); return json(res,status,{error:error.message||'Request failed',requestId});
  }
});

server.listen(port,process.env.VERCEL ? undefined : host,()=>{
  console.log('');
  console.log('============================================================');
  console.log(' QR AJN 8.4 :: PROFESSIONAL QR + PROFILES + LIVE ANALYTICS');
  console.log(' NO AUTH | NO WORKSPACE | NO BILLING | NO CLOUD FUNCTIONS');
  console.log('============================================================');
  console.log(` Local:  http://127.0.0.1:${port}`);
  if(host==='0.0.0.0') console.log(` LAN:    use this PC LAN IP on port ${port} for phone scans`);
  console.log(` Health: http://127.0.0.1:${port}/api/v1/health`);
  console.log(' Keep this window open while testing.');
});

async function serveRoute(pathname,res,headOnly){
  const spa = pathname==='/' || pathname==='/create' || pathname==='/create-profile' || /^\/manage\/[A-Za-z0-9_-]{6,100}\/[A-Za-z0-9_-]{20,200}$/.test(pathname) || /^\/manage\/profile\/[a-z0-9-]{3,40}\/[A-Za-z0-9_-]{20,200}$/.test(pathname);
  const mapped = new Map([['/privacy','privacy.html'],['/terms','terms.html'],['/contact','contact.html'],['/about','about.html']]);
  let relative = mapped.get(pathname) || (spa?'index.html':pathname.replace(/^\/+/,'')); if(!relative) relative='index.html';
  if(relative.includes('..')||relative.includes('\\')||path.isAbsolute(relative)) return htmlMessage(res,400,'Invalid path','The requested path is invalid.');
  return serveStaticFile(relative,res,headOnly,200);
}
async function serveProfileHtml(profile,res,headOnly,origin){
  try{
    let html=await fs.readFile(path.join(root,'index.html'),'utf8');
    const title=`${profile.name} · QR AJN`; const description=(profile.tagline||profile.about||`${profile.name} public profile on QR AJN`).slice(0,180); const pageUrl=`${origin}/${profile.slug}`; const image=profile.media?.cover?`${origin}/media/${profile.media.cover.id}`:profile.media?.logo?`${origin}/media/${profile.media.logo.id}`:`${origin}/og-cover.svg`;
    html=html.replace(/<title>[^<]*<\/title>/,`<title>${escapeHtml(title)}</title>`);
    html=html.replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${escapeAttr(description)}">`);
    html=html.replace(/<link rel="canonical" href="[^"]*">/,`<link rel="canonical" href="${escapeAttr(pageUrl)}">`);
    html=html.replace(/<meta property="og:title" content="[^"]*">/,`<meta property="og:title" content="${escapeAttr(title)}">`);
    html=html.replace(/<meta property="og:description" content="[^"]*">/,`<meta property="og:description" content="${escapeAttr(description)}">`);
    html=html.replace(/<meta property="og:url" content="[^"]*">/,`<meta property="og:url" content="${escapeAttr(pageUrl)}">`);
    html=html.replace(/<meta property="og:image" content="[^"]*">/,`<meta property="og:image" content="${escapeAttr(image)}">`);
    res.setHeader('content-type','text/html; charset=utf-8');res.setHeader('cache-control','no-cache');res.writeHead(200);return res.end(headOnly?null:html);
  }catch{return serveStaticFile('index.html',res,headOnly,200);}
}

async function serveStaticFile(relative,res,headOnly,status=200){
  const file=path.join(root,relative); if(!file.startsWith(root)) return htmlMessage(res,403,'Forbidden','The requested path is not accessible.');
  try{const stat=await fs.stat(file);if(!stat.isFile())throw new Error('not-file');const body=headOnly?null:await fs.readFile(file);res.setHeader('content-type',mime.get(path.extname(file).toLowerCase())||'application/octet-stream');res.setHeader('cache-control',/\.(html|js|css|json)$/i.test(file)?'no-cache':'public, max-age=3600');res.writeHead(status);return res.end(body);}catch{if(relative!=='404.html'){try{return await serveStaticFile('404.html',res,headOnly,404);}catch{}}return htmlMessage(res,404,'Page not found','The requested page does not exist.');}
}
async function serveUpload(meta,res,headOnly,{contentDisposition=null}={}){
  const file=path.join(uploadsDir,meta.fileName); if(!file.startsWith(uploadsDir)) return htmlMessage(res,403,'Forbidden','File is unavailable.');
  try{const stat=await fs.stat(file);res.setHeader('content-type',meta.mime||mime.get(path.extname(file))||'application/octet-stream');res.setHeader('content-length',String(stat.size));res.setHeader('cache-control','public, max-age=300');if(contentDisposition)res.setHeader('content-disposition',contentDisposition);res.writeHead(200);if(headOnly)return res.end();fssync.createReadStream(file).pipe(res);}catch{return htmlMessage(res,404,'File not found','This file is unavailable.');}
}

function normalizeProfileInput(body,{slug,manageToken,createdAt}){
  return {
    id:id('profile'), slug, tokenHash:sha256(manageToken), qrSlug:`p-${uniqueCode(10)}`, isActive:true,
    name:requiredText(body.name,'Profile name',100), category:cleanText(body.category||'',80), tagline:cleanText(body.tagline||'',160), about:cleanText(body.about||'',2000),
    phone:cleanText(body.phone||'',40), whatsapp:cleanText(body.whatsapp||'',40), email:optionalEmail(body.email), website:optionalHttpUrl(body.website), address:cleanText(body.address||'',300), mapsUrl:optionalHttpUrl(body.mapsUrl), workingHours:cleanText(body.workingHours||'',300),
    social:normalizeSocial(body.social||{}), customLinks:normalizeCustomLinks(body.customLinks||[]), appearance:normalizeAppearance(body.appearance||{}), media:{logo:null,cover:null}, documents:[], createdAt, updatedAt:createdAt
  };
}
function applyProfilePatch(p,body){
  if(Object.hasOwn(body,'name')) p.name=requiredText(body.name,'Profile name',100);
  if(Object.hasOwn(body,'category')) p.category=cleanText(body.category,80);
  if(Object.hasOwn(body,'tagline')) p.tagline=cleanText(body.tagline,160);
  if(Object.hasOwn(body,'about')) p.about=cleanText(body.about,2000);
  if(Object.hasOwn(body,'phone')) p.phone=cleanText(body.phone,40);
  if(Object.hasOwn(body,'whatsapp')) p.whatsapp=cleanText(body.whatsapp,40);
  if(Object.hasOwn(body,'email')) p.email=optionalEmail(body.email);
  if(Object.hasOwn(body,'website')) p.website=optionalHttpUrl(body.website);
  if(Object.hasOwn(body,'address')) p.address=cleanText(body.address,300);
  if(Object.hasOwn(body,'mapsUrl')) p.mapsUrl=optionalHttpUrl(body.mapsUrl);
  if(Object.hasOwn(body,'workingHours')) p.workingHours=cleanText(body.workingHours,300);
  if(Object.hasOwn(body,'social')) p.social=normalizeSocial(body.social||{});
  if(Object.hasOwn(body,'customLinks')) p.customLinks=normalizeCustomLinks(body.customLinks||[]);
  if(Object.hasOwn(body,'appearance')) p.appearance=normalizeAppearance(body.appearance||{});
  if(Object.hasOwn(body,'isActive')) p.isActive=Boolean(body.isActive);
}
function publicProfile(p,origin){
  return {id:p.id,slug:p.slug,isActive:p.isActive,name:p.name,category:p.category,tagline:p.tagline,about:p.about,phone:p.phone,whatsapp:p.whatsapp,email:p.email,website:p.website,address:p.address,mapsUrl:p.mapsUrl,workingHours:p.workingHours,social:p.social,customLinks:p.customLinks,appearance:p.appearance||{template:'minimal',accent:'indigo'},createdAt:p.createdAt,updatedAt:p.updatedAt,publicUrl:`${origin}/${p.slug}`,profileQrUrl:`${origin}/r/${p.qrSlug}`,media:{logo:p.media?.logo?`${origin}/media/${p.media.logo.id}`:null,cover:p.media?.cover?`${origin}/media/${p.media.cover.id}`:null},documents:(p.documents||[]).map(d=>publicDocument(d,p,origin))};
}
function publicDocument(d,p,origin){return {id:d.id,slug:d.slug,title:d.title,size:d.size,createdAt:d.createdAt,url:`${origin}/${p.slug}/${d.slug}`};}
function profileManagementPayload(p,db,origin){
  const events=db.profileEvents.filter(x=>x.profileId===p.id).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  const scans=events.filter(x=>x.type==='qr_scan'); const views=events.filter(x=>x.type==='profile_view'); const actions=events.filter(x=>x.type==='action'); const docViews=events.filter(x=>x.type==='document_view'); const docShares=events.filter(x=>x.type==='document_share'); const humans=events.filter(x=>!x.isBot); const uniqueApprox=new Set(humans.map(x=>x.visitorHash)).size;
  const metrics={qrScans:metricWindow(scans),profileViews:metricWindow(views),totalActions:actions.length,documentViews:docViews.length,documentShares:docShares.length,uniqueApprox,automated:events.filter(x=>x.isBot).length,lastActivityAt:events[0]?.createdAt||null};
  const documents=(p.documents||[]).map(d=>({...publicDocument(d,p,origin),views:docViews.filter(e=>e.documentSlug===d.slug).length,shares:docShares.filter(e=>e.documentSlug===d.slug).length}));
  return {profile:publicProfile(p,origin),metrics,daily:profileDailySeries(events,30),devices:bucket(events,'device'),browsers:bucket(events,'browser'),systems:bucket(events,'os'),topActions:actionBuckets(events),documents,recent:events.slice(0,60).map(publicProfileEvent)};
}
function metricWindow(events){const now=Date.now();const dayStart=new Date().setHours(0,0,0,0);return {total:events.length,today:events.filter(x=>Date.parse(x.createdAt)>=dayStart).length,last7:events.filter(x=>Date.parse(x.createdAt)>=now-6*86400000).length,last30:events.filter(x=>Date.parse(x.createdAt)>=now-29*86400000).length};}
function profileDailySeries(events,days){const map=new Map();const out=[];const today=new Date();for(let i=days-1;i>=0;i--){const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()-i);const key=localDateKey(d);map.set(key,{scans:0,views:0,clicks:0});out.push({date:key,scans:0,views:0,clicks:0});}for(const e of events){const key=localDateKey(new Date(e.createdAt));if(!map.has(key))continue;const v=map.get(key);if(e.type==='qr_scan')v.scans++;else if(e.type==='profile_view')v.views++;else if(e.type==='action'||e.type==='document_view'||e.type==='document_share')v.clicks++;}return out.map(x=>({...x,...map.get(x.date)}));}
function actionBuckets(events){const m=new Map();for(const e of events){let label='';if(e.type==='action')label=e.action||'Other';else if(e.type==='document_view')label='PDF views';else if(e.type==='document_share')label='PDF shares';else continue;m.set(label,(m.get(label)||0)+1);}return [...m.entries()].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count).slice(0,12);}
function publicProfileEvent(e){return {type:e.type,action:e.action||null,label:e.label||null,documentSlug:e.documentSlug||null,device:e.device,browser:e.browser,os:e.os,referrer:e.referrer,isBot:e.isBot,createdAt:e.createdAt};}

function managementPayload(qr,db){
  const events=db.scans.filter(x=>x.qrId===qr.id).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)); const humans=events.filter(x=>!x.isBot); const metrics={...metricWindow(events),total:Number(qr.scanCount||events.length),uniqueApprox:new Set(humans.map(x=>x.visitorHash)).size,automated:events.filter(x=>x.isBot).length,firstScanAt:events.at(-1)?.createdAt||null,lastScanAt:events[0]?.createdAt||null};
  return {qr:publicQr(qr),metrics,daily:dailySeries(events,30),devices:bucket(events,'device'),browsers:bucket(events,'browser'),systems:bucket(events,'os'),recent:events.slice(0,50).map(publicScan)};
}
function dailySeries(events,days){const map=new Map();const out=[];const today=new Date();for(let i=days-1;i>=0;i--){const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()-i);const key=localDateKey(d);map.set(key,0);out.push({date:key,count:0});}for(const e of events){const key=localDateKey(new Date(e.createdAt));if(map.has(key))map.set(key,map.get(key)+1);}return out.map(x=>({...x,count:map.get(x.date)||0}));}
function bucket(events,key){const m=new Map();for(const e of events){const v=e[key]||'Unknown';m.set(v,(m.get(v)||0)+1);}return [...m.entries()].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count);}
function publicScan(e){return {device:e.device,browser:e.browser,os:e.os,referrer:e.referrer,isBot:e.isBot,createdAt:e.createdAt};}
function publicQr(qr){return {id:qr.id,slug:qr.slug,brandSlug:qr.brandSlug||'',name:qr.name,destinationUrl:qr.destinationUrl,isActive:qr.isActive,scanCount:Number(qr.scanCount||0),createdAt:qr.createdAt,updatedAt:qr.updatedAt};}

function profileEvent(req,secret,profileId,type,extra){const ua=String(req.headers['user-agent']||'').slice(0,500);const parsed=parseUa(ua);return {id:id('evt'),profileId,type,...extra,createdAt:nowIso(),visitorHash:visitorHash(req,secret),device:parsed.device,browser:parsed.browser,os:parsed.os,referrer:safeReferrer(req.headers.referer||req.headers.referrer||''),isBot:isBot(ua)};}
function scanEvent(req,secret,qrId){const ua=String(req.headers['user-agent']||'').slice(0,500);const parsed=parseUa(ua);return {id:id('scan'),qrId,createdAt:nowIso(),visitorHash:visitorHash(req,secret),device:parsed.device,browser:parsed.browser,os:parsed.os,referrer:safeReferrer(req.headers.referer||req.headers.referrer||''),isBot:isBot(ua)};}
function parseUa(ua){const u=ua.toLowerCase();let device='Desktop';if(/ipad|tablet|kindle|silk/.test(u))device='Tablet';else if(/mobi|android|iphone|ipod/.test(u))device='Mobile';let browser='Other';if(/edg\//.test(u))browser='Edge';else if(/opr\//.test(u))browser='Opera';else if(/firefox\//.test(u))browser='Firefox';else if(/chrome\//.test(u))browser='Chrome';else if(/safari\//.test(u))browser='Safari';let os='Other';if(/windows/.test(u))os='Windows';else if(/android/.test(u))os='Android';else if(/iphone|ipad|ipod/.test(u))os='iOS';else if(/mac os/.test(u))os='macOS';else if(/linux/.test(u))os='Linux';return {device,browser,os};}
function isBot(ua){return /bot|crawler|spider|preview|facebookexternalhit|slurp|bingpreview|whatsapp|telegrambot|discordbot/i.test(ua);}
function safeReferrer(v){if(!v)return'';try{const u=new URL(String(v));return `${u.protocol}//${u.host}`.slice(0,180);}catch{return'';}}
function visitorHash(req,secret){const ip=clientIp(req);const ua=String(req.headers['user-agent']||'').slice(0,500);return crypto.createHmac('sha256',secret).update(`${ip}\n${ua}`).digest('hex').slice(0,24);}
function clientIp(req){return String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim().slice(0,100);}

function validatePublicSlug(slug,label='Public link'){if(!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug))throw httpError(400,`${label} must be 3–40 characters using lowercase letters, numbers and hyphens.`);if(slug.includes('--'))throw httpError(400,`${label} cannot contain repeated hyphens.`);if(RESERVED_SLUGS.has(slug))throw httpError(400,`That ${label.toLowerCase()} is reserved. Choose another.`);}function validateSlug(slug){return validatePublicSlug(slug,'Profile link');}
function cleanSlug(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,40);}
function cleanDocumentSlug(v){const s=String(v||'').trim().toLowerCase().replace(/\.pdf$/,'').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,60);if(!s)throw httpError(400,'Document link name is required.');return s;}
function cleanAction(v){const a=String(v||'').trim().toLowerCase();const allowed=new Set(['whatsapp','call','email','website','location','instagram','facebook','youtube','linkedin','x','telegram','custom-link','share-profile','copy-profile']);if(!allowed.has(a))throw httpError(400,'Unsupported profile action.');return a;}
function normalizeSocial(v){const keys=['instagram','facebook','youtube','linkedin','x','telegram'];const out={};for(const k of keys)out[k]=optionalHttpUrl(v?.[k]);return out;}
function normalizeCustomLinks(v){if(!Array.isArray(v))return[];return v.slice(0,8).map(x=>({label:cleanText(x?.label||'',60),url:optionalHttpUrl(x?.url)})).filter(x=>x.label&&x.url);}
function normalizeAppearance(v){const templates=new Set(['minimal','professional','business','portfolio','restaurant','creator']);const accents=new Set(['indigo','ocean','emerald','graphite','slate','rose','amber']);const template=cleanText(v?.template||'minimal',30).toLowerCase();const accent=cleanText(v?.accent||'indigo',30).toLowerCase();if(!templates.has(template))throw httpError(400,'Choose a supported profile template.');if(!accents.has(accent))throw httpError(400,'Choose a supported profile accent.');return {template,accent};}
function normalizeAppearanceSafe(v){try{return normalizeAppearance(v||{});}catch{return {template:'minimal',accent:'indigo'};}}
function optionalHttpUrl(v){const s=String(v||'').trim();return s?safeHttpUrl(s):'';}
function safeHttpUrl(v){const raw=String(v||'').trim();let u;try{u=new URL(raw);}catch{throw httpError(400,'Enter a complete URL beginning with http:// or https://.');}if(!['http:','https:'].includes(u.protocol))throw httpError(400,'Only http:// and https:// URLs are allowed.');if(u.username||u.password)throw httpError(400,'URLs with embedded usernames or passwords are not allowed.');if(raw.length>2048)throw httpError(400,'URL is too long.');return u.href;}
function optionalEmail(v){const s=String(v||'').trim().toLowerCase();if(!s)return'';if(s.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw httpError(400,'Enter a valid email address.');return s;}
function cleanText(v,max){return String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim().slice(0,max);}
function requiredText(v,label,max){const s=cleanText(v,max);if(!s)throw httpError(400,`${label} is required.`);return s;}
function asciiFilename(v){return cleanText(v,80).replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'document';}
function imageExtension(m){return ({'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'})[m]||'';}
function validImageSignature(b,m){if(m==='image/png')return b.length>=8&&b.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));if(m==='image/jpeg')return b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;if(m==='image/webp')return b.length>=12&&b.subarray(0,4).toString('ascii')==='RIFF'&&b.subarray(8,12).toString('ascii')==='WEBP';return false;}
function profileFiles(p){return [p.media?.logo?.fileName,p.media?.cover?.fileName,...(p.documents||[]).map(x=>x.fileName)].filter(Boolean);}
async function safeDeleteUpload(fileName){try{if(!/^[A-Za-z0-9_.-]+$/.test(fileName))return;await fs.unlink(path.join(uploadsDir,fileName));}catch{}}

function normalizeDbShape(value={}){
  const db=value&&typeof value==='object'?value:{};
  db.schema=4;
  db.meta=db.meta&&typeof db.meta==='object'?db.meta:{};
  if(!db.meta.installSecret)db.meta.installSecret=crypto.randomBytes(32).toString('hex');
  db.qrs=Array.isArray(db.qrs)?db.qrs:[];
  db.scans=Array.isArray(db.scans)?db.scans:[];
  db.profiles=Array.isArray(db.profiles)?db.profiles:[];
  db.profileEvents=Array.isArray(db.profileEvents)?db.profileEvents:[];
  for(const p of db.profiles){
    p.media=p.media||{logo:null,cover:null};
    p.documents=Array.isArray(p.documents)?p.documents:[];
    p.social=p.social||{};
    p.customLinks=Array.isArray(p.customLinks)?p.customLinks:[];
    p.appearance=normalizeAppearanceSafe(p.appearance||{});
  }
  return db;
}
async function ensureDatabase(){
  if(pgPool){
    await pgPool.query(`CREATE TABLE IF NOT EXISTS qr_ajn_state (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const initial=normalizeDbShape({});
    await pgPool.query(
      `INSERT INTO qr_ajn_state (id,data) VALUES (1,$1::jsonb) ON CONFLICT (id) DO NOTHING`,
      [JSON.stringify(initial)]
    );
    return;
  }
  await fs.mkdir(uploadsDir,{recursive:true});
  let db;
  try{db=JSON.parse(await fs.readFile(dbFile,'utf8'));}catch{db={};}
  await writeDb(normalizeDbShape(db));
}
async function readDb(){
  if(pgPool){
    const {rows}=await pgPool.query('SELECT data FROM qr_ajn_state WHERE id=1');
    return normalizeDbShape(rows[0]?.data||{});
  }
  return normalizeDbShape(JSON.parse(await fs.readFile(dbFile,'utf8')));
}
async function writeDb(db){
  db=normalizeDbShape(db);
  if(pgPool){
    await pgPool.query('UPDATE qr_ajn_state SET data=$1::jsonb, updated_at=NOW() WHERE id=1',[JSON.stringify(db)]);
    return;
  }
  const tmp=`${dbFile}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(tmp,JSON.stringify(db,null,2),'utf8');
  await fs.rename(tmp,dbFile);
}
async function mutateDb(fn){
  if(isVercel&&!pgPool)throw httpError(503,'Permanent storage is not configured. Connect a Postgres database before creating or changing QR AJN links.');
  if(pgPool){
    const client=await pgPool.connect();
    try{
      await client.query('BEGIN');
      const {rows}=await client.query('SELECT data FROM qr_ajn_state WHERE id=1 FOR UPDATE');
      const db=normalizeDbShape(rows[0]?.data||{});
      const result=await fn(db);
      await client.query('UPDATE qr_ajn_state SET data=$1::jsonb, updated_at=NOW() WHERE id=1',[JSON.stringify(normalizeDbShape(db))]);
      await client.query('COMMIT');
      return result;
    }catch(error){
      try{await client.query('ROLLBACK');}catch{}
      throw error;
    }finally{
      client.release();
    }
  }
  const task=mutationQueue.then(async()=>{const db=await readDb();const result=await fn(db);await writeDb(db);return result;});
  mutationQueue=task.catch(()=>{});
  return task;
}
function trimEvents(db){if(db.scans.length>MAX_EVENTS)db.scans=db.scans.slice(-MAX_EVENTS);if(db.profileEvents.length>MAX_EVENTS)db.profileEvents=db.profileEvents.slice(-MAX_EVENTS);}

async function readJson(req){const buf=await readBuffer(req,JSON_LIMIT);if(!buf.length)return{};try{return JSON.parse(buf.toString('utf8'));}catch{throw httpError(400,'Invalid JSON request.');}}
function readBuffer(req,limit){return new Promise((resolve,reject)=>{const chunks=[];let size=0;req.on('data',c=>{size+=c.length;if(size>limit){reject(httpError(413,'Upload or request is too large.'));req.destroy();return;}chunks.push(c);});req.on('end',()=>resolve(Buffer.concat(chunks)));req.on('error',reject);});}
function authorizeManage(req,record){const supplied=String(req.headers['x-manage-token']||'');if(!supplied||!safeEqual(sha256(supplied),record.tokenHash))throw httpError(403,'Invalid private management link.');}
function safeEqual(a,b){try{const x=Buffer.from(String(a));const y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);}catch{return false;}}
function enforceRate(req,key,max,windowMs){const bucketKey=`${key}:${clientIp(req)}`;const now=Date.now();let b=rateBuckets.get(bucketKey);if(!b||now-b.start>=windowMs)b={start:now,count:0};b.count++;rateBuckets.set(bucketKey,b);if(b.count>max)throw httpError(429,'Too many requests. Please wait and try again.');if(rateBuckets.size>5000)for(const [k,v] of rateBuckets)if(now-v.start>windowMs*2)rateBuckets.delete(k);}
function effectiveOrigin(req){if(publicOrigin)return publicOrigin;const proto=String(req.headers['x-forwarded-proto']||'http').split(',')[0].trim();const h=String(req.headers['x-forwarded-host']||req.headers.host||`${host}:${port}`).split(',')[0].trim();return `${proto}://${h}`.replace(/\/$/,'');}
function setHeaders(res,requestId){res.setHeader('x-request-id',requestId);res.setHeader('x-content-type-options','nosniff');res.setHeader('x-frame-options','DENY');res.setHeader('referrer-policy','strict-origin-when-cross-origin');res.setHeader('permissions-policy','camera=(), microphone=(), geolocation=()');res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");}
function json(res,status,obj){res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.writeHead(status);res.end(JSON.stringify(obj));}
function htmlMessage(res,status,title,message){res.setHeader('content-type','text/html; charset=utf-8');res.setHeader('cache-control','no-store');res.writeHead(status);res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)} · QR AJN</title><style>body{font-family:system-ui;margin:0;min-height:100vh;display:grid;place-items:center;background:#f2f6fc;color:#0f172a}.c{max-width:560px;margin:24px;padding:32px;background:white;border:1px solid #dbe6f6;border-radius:24px;box-shadow:0 20px 60px #2563be1f}a{color:#1d4ed8}</style><div class="c"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a href="/">Go to QR AJN</a></p></div></html>`);}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function escapeAttr(v){return escapeHtml(String(v)).replace(/`/g,'&#96;');}
function httpError(statusCode,message){const e=new Error(message);e.statusCode=statusCode;return e;}
function id(prefix){return `${prefix}_${crypto.randomBytes(10).toString('base64url')}`;}
function token(){return crypto.randomBytes(24).toString('base64url');}
function uniqueCode(n=9){return crypto.randomBytes(Math.ceil(n*0.8)).toString('base64url').slice(0,n);}
function sha256(v){return crypto.createHash('sha256').update(String(v)).digest('hex');}
function nowIso(){return new Date().toISOString();}
function localDateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function headerValue(req,name){return Array.isArray(req.headers[name])?req.headers[name][0]:String(req.headers[name]||'');}
