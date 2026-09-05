import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=49700+Math.floor(Math.random()*150);
const base=`http://127.0.0.1:${port}`;
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'qrajn-app-pages-'));
let child;

before(async()=>{
  child=spawn(process.execPath,['server.mjs'],{
    cwd:root,
    env:{...process.env,PORT:String(port),HOST:'127.0.0.1',PUBLIC_ORIGIN:base,QR_AJN_DATA_FILE:path.join(temp,'legacy.json'),QR_AJN_V9_DATA_FILE:path.join(temp,'extra.json'),QR_AJN_V9_UPLOAD_DIR:path.join(temp,'uploads'),VERCEL:'',FIREBASE_PROJECT_ID:'',FIREBASE_CLIENT_EMAIL:'',FIREBASE_PRIVATE_KEY:'',FIREBASE_SERVICE_ACCOUNT_JSON:'',FIREBASE_STORAGE_BUCKET:''},
    stdio:['ignore','pipe','pipe']
  });
  let err='';child.stderr.on('data',d=>err+=d);
  for(let i=0;i<100;i++){try{const r=await fetch(`${base}/api/v1/health`);if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,40))}
  throw new Error(err);
});
after(async()=>{if(child&&!child.killed)child.kill();await fs.rm(temp,{recursive:true,force:true})});

test('home exposes the four primary product routes',async()=>{
  const r=await fetch(base+'/');assert.equal(r.status,200);
  const html=await r.text();
  assert.equal(html.includes('id="quickToolsHub"'),true);
  for(const route of ['/create-qr','/short-link','/create-profile','/open-analytics'])assert.equal(html.includes(`href="${route}"`),true,route);
  assert.equal(html.includes('/app-pages.css'),true);
  assert.equal(html.includes('/app-route-boot.js'),true);
});

test('dedicated application routes return a real non-empty workspace and are noindex',async()=>{
  const expected=new Map([
    ['/create-qr','id="create"'],
    ['/short-link','id="shorten"'],
    ['/create-profile','id="profileCreate"'],
    ['/smart-tools','id="smartTools"'],
    ['/open-analytics','id="v9Analytics"']
  ]);
  for(const [route,workspaceId] of expected){
    const r=await fetch(base+route);
    assert.equal(r.status,200,route);
    assert.equal(String(r.headers.get('x-robots-tag')||'').includes('noindex'),true,route);
    const html=await r.text();
    assert.equal(html.includes('id="homeView"'),true,route);
    assert.equal(html.includes(workspaceId),true,`${route} missing ${workspaceId}`);
  }
});

test('application route names stay reserved from public content',async()=>{
  let r=await fetch(base+'/api/profiles',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug:'smart-tools',name:'Blocked'})});
  assert.equal(r.status,400);
  r=await fetch(base+'/api/v9/links',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug:'short-link',destination:'https://example.com'})});
  assert.equal(r.status,400);
  const v9Body=await r.json();
  assert.equal(String(v9Body.error||'').includes('public name'),true);
});

test('landing and workspace assets contain the non-empty route contract',async()=>{
  let r=await fetch(base+'/app-pages.css');assert.equal(r.status,200);let text=await r.text();
  for(const contract of ['.quick-tools-grid{display:grid;grid-template-columns:repeat(4','.app-route-hidden{display:none!important}','landing-feature-guide','landing-legal-grid'])assert.equal(text.includes(contract),true,contract);
  assert.equal(text.includes('html[data-app-page="create-qr"] #homeView>*'),false,'old route-wide hide-all CSS must not return');

  r=await fetch(base+'/app-route-boot.js');assert.equal(r.status,200);text=await r.text();
  for(const contract of ["const HOME_CARD_ROUTES=['/create-qr','/short-link','/create-profile','/open-analytics']",'function setupLanding()','function setupWorkspace(page)','id="landingLegal"','Workspace unavailable'])assert.equal(text.includes(contract),true,contract);
  assert.equal(text.includes("card('/smart-tools'"),false);
});