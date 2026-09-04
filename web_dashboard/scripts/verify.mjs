import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const required=['index.html','styles.css','app.js','server.mjs','qr-encoder.js','v9-extra.js','v9-extra.mjs','privacy.html','terms.html','contact.html','about.html','404.html','robots.txt','sitemap.xml','ads.txt','data/local-db.json','data/v9-extra.json','scripts/v9-extra-smoke.mjs'];
for(const file of required){if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);}
for(const js of ['server.mjs','app.js','qr-encoder.js','v9-extra.js','v9-extra.mjs','scripts/v9-extra-smoke.mjs']) execFileSync(process.execPath,['--check',path.join(root,js)],{stdio:'inherit'});

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const server=fs.readFileSync(path.join(root,'server.mjs'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

if(pkg.version!=='8.4.0')fail(`package version must be 8.4.0, got ${pkg.version}`);

if(!pkg.dependencies?.['pdf-lib']) fail('pdf-lib dependency is required for the local PDF editor');
if(!pkg.dependencies?.['firebase-admin']) fail('firebase-admin dependency is required for durable production Firestore/Storage');

for(const text of [
  'id="shorten"','id="v9QuickShortForm"','id="smartCreate"','id="smartTools"','id="v9Analytics"','id="v9PdfEditor"','id="v9Items"','id="v9ManageView"',
  'SHORT LINKS · LIVE CLICKS','SMART CREATE','SMART CONNECTION TOOLS','UNIFIED ANALYTICS','LOCAL PDF EDITOR','MY ITEMS',
  '<script type="module" src="/app.js"></script>','<script type="module" src="/v9-extra.js"></script>'
]) if(!html.includes(text)) fail(`V9 live-UI extension missing: ${text}`);

const extraClient=fs.readFileSync(path.join(root,'v9-extra.js'),'utf8');
const extraServer=fs.readFileSync(path.join(root,'v9-extra.mjs'),'utf8');
for(const text of ['v9QuickShortForm','scheduleQuickAnalytics','scheduleManagedLinkAnalytics','/api/v9/smart/parse','/api/v9/links','/api/v9/campaigns','/api/v9/documents','/api/v9/analytics','PDFLib.PDFDocument','v9ExportRecovery']) if(!extraClient.includes(text)) fail(`V9 client contract missing: ${text}`);
for(const text of ['reserveLinkSlug','shortCode','/analytics','/api/v9/health','/api/v9/smart/parse','/api/v9/links','/api/v9/campaigns','/api/v9/files','/api/v9/documents','/api/v9/analytics','tokenHash:sha','link_click','document_view']) if(!extraServer.includes(text)) fail(`V9 server contract missing: ${text}`);


for(const text of ['Unlimited static QR codes','Free short links','No login','No signup','FREE QR CODES · FREE SHORT LINKS','FAQPage','WebApplication','isAccessibleForFree']) if(!html.includes(text)) fail(`SEO/free-access contract missing: ${text}`);
for(const text of ["database:firestore?'cloud-firestore'","storageBucket?'firebase-storage'","createV9Extra({root,dataDir,firestore,storageBucket,isVercel})","Cloud Firestore is not configured","Firebase Storage is not configured"]) if(!server.includes(text)) fail(`production persistence contract missing: ${text}`);
for(const text of ["database:firestore?'cloud-firestore'","storageBucket?'firebase-storage'","v9Events","publicLinks","Firebase Storage is not configured for production PDF publishing"]) if(!extraServer.includes(text)) fail(`V9 production contract missing: ${text}`);

const ads=fs.readFileSync(path.join(root,'ads.txt'),'utf8').trim();
if(ads!=='google.com, pub-4495802176396975, DIRECT, f08c47fec0942fa0') fail('ads.txt publisher line changed');
if(!html.includes('<link rel="canonical" href="https://qrajn.online/">')) fail('canonical qrajn.online home URL missing');

for(const text of [
  'Create Profile','qrajn.online/','PDF SHARING','Profile views','QR scans','PRIVATE PROFILE MANAGEMENT',
  'QR templates','SCAN QUALITY','✓ Published','profileTemplateGrid','profileBrowserBreakdown','profileUnsavedBadge','frameStyle','frameText','qrRange30','profileRange30'
]) if(!html.includes(text)) fail(`V8.4 UI contract missing: ${text}`);

for(const text of [
  'radial-gradient(ellipse 90% 70% at 85% 10%','rgba(37,99,190,.45)',
  'radial-gradient(ellipse 80% 60% at 10% 90%','linear-gradient(160deg,#f2f6fc 0%,#fff 35%,#e7eef9 70%,#dbe6f6 100%)',
  'font-family:Manrope','--primary:oklch(.457 .24 277.023)','@media(prefers-reduced-motion:reduce)'
]) if(!css.includes(text)) fail(`design contract missing: ${text}`);

for(const text of [
  '/api/profiles','profileManageMatch','document_view','document_share','profile_view','qr_scan',
  'x-manage-token','normalizeAppearance','mutationQueue','version:\'8.4.0\''
]) if(!server.includes(text)) fail(`server contract missing: ${text}`);

for(const text of [
  'applyQrTemplate','updateScanQuality','loadQrLogo','profileDraft','renderLineChart','startSmartRefresh',
  'profileChartMode','shareCurrentQr','createExportCanvas','setAnalyticsRange','cleanFrameText'
]) if(!app.includes(text)) fail(`client feature contract missing: ${text}`);

const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
const dup=[...new Set(ids.filter((v,i)=>ids.indexOf(v)!==i))];
if(dup.length)fail(`duplicate HTML ids: ${dup.join(', ')}`);
const literalRefs=[...app.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]).filter(x=>!x.startsWith('field-'));
const missingRefs=[...new Set(literalRefs.filter(x=>!ids.includes(x)))];
if(missingRefs.length)fail(`app references missing DOM ids: ${missingRefs.join(', ')}`);

for(const forbidden of ['/login','/signup','/workspace','/billing','/pricing','/premium']){
  if(new RegExp(`href=["']${forbidden.replace('/','\\/')}`).test(html))fail(`forbidden navigation present: ${forbidden}`);
}
for(const fake of ['Anjan Kumar','AJN Digital','1,284','1,761','934 visitors','428 actions']){
  if(html.includes(fake)||app.includes(fake))fail(`demo identity/fake metric remains in production UI: ${fake}`);
}

console.log('PASS: V8.4 source files and JavaScript syntax');
console.log('PASS: professional soft-blue + OKLCH + typography design contract');
console.log('PASS: QR templates, customization, frames, exact-size exports, scan quality and professional preview contract');
console.log('PASS: profile templates, Published status, documents and private management contract');
console.log('PASS: real-time analytics, graphs, browser/device/activity UI contract');
console.log('PASS: no auth/workspace/billing/premium navigation and no personal demo identity');
console.log('PASS: unique DOM ids and all app DOM references resolve');
console.log('PASS: serialized mutation backend and V8.4 appearance schema contract');
console.log('PASS: exact live V8.4 hero, atmospheric background and design tokens preserved');
console.log('PASS: Bitly-style quick short links, Smart Links, live per-link analytics, Campaigns, Documents, Unified Analytics and private management contract');
console.log('PASS: browser-local PDF editor wiring + pdf-lib smoke test contract');
console.log('PASS: canonical qrajn.online + exact AdSense ads.txt publisher line preserved');
console.log('PASS: SEO free-access banner + structured data contract');
console.log('PASS: production Firestore/Storage + V9 short-link persistence contract');

function fail(message){console.error('FAIL:',message);process.exit(1);}
