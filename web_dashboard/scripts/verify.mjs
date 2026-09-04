import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const required=['index.html','styles.css','app.js','server.mjs','qr-encoder.js','privacy.html','terms.html','contact.html','about.html','404.html','robots.txt','sitemap.xml','ads.txt','data/local-db.json'];
for(const file of required){if(!fs.existsSync(path.join(root,file)))fail(`missing ${file}`);}
for(const js of ['server.mjs','app.js','qr-encoder.js']) execFileSync(process.execPath,['--check',path.join(root,js)],{stdio:'inherit'});

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const server=fs.readFileSync(path.join(root,'server.mjs'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

if(pkg.version!=='8.4.0')fail(`package version must be 8.4.0, got ${pkg.version}`);

for(const text of [
  'Create Profile','qrajn.online/','PDF SHARING','Profile views','QR scans','PRIVATE PROFILE MANAGEMENT',
  'QR templates','SCAN QUALITY','✓ Published','profileTemplateGrid','profileBrowserBreakdown','profileUnsavedBadge','frameStyle','frameText','qrRange30','profileRange30','trackSlug','qrajn.online/'
]) if(!html.includes(text)) fail(`V8.4 UI contract missing: ${text}`);

for(const text of [
  'radial-gradient(ellipse 90% 70% at 85% 10%','rgba(37,99,190,.45)',
  'radial-gradient(ellipse 80% 60% at 10% 90%','linear-gradient(160deg,#f2f6fc 0%,#fff 35%,#e7eef9 70%,#dbe6f6 100%)',
  'font-family:Manrope','--primary:oklch(.457 .24 277.023)','@media(prefers-reduced-motion:reduce)'
]) if(!css.includes(text)) fail(`design contract missing: ${text}`);

for(const text of [
  '/api/profiles','profileManageMatch','document_view','document_share','profile_view','qr_scan',
  'x-manage-token','normalizeAppearance','mutationQueue','brandSlug','publicLinkAvailabilityMatch','validatePublicSlug','FIREBASE_PROJECT_ID','firebase-admin/app','cloud-firestore','collectionGroup(\'scans\')','publicLinks','Firebase Storage','version:\'8.4.0\''
]) if(!server.includes(text)) fail(`server contract missing: ${text}`);

for(const text of [
  'applyQrTemplate','updateScanQuality','loadQrLogo','profileDraft','renderLineChart','startSmartRefresh',
  'profileChartMode','shareCurrentQr','createExportCanvas','setAnalyticsRange','cleanFrameText','sanitizeTrackSlugInput','checkTrackSlugAvailability'
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
console.log('PASS: Cloud Firestore + Firebase Storage adapter + local JSON fallback + serialized mutation contract');

function fail(message){console.error('FAIL:',message);process.exit(1);}
