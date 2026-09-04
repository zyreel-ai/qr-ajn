import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=48500+Math.floor(Math.random()*700);const base=`http://127.0.0.1:${port}`;
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'qrajn-v9-extra-'));const legacy=path.join(temp,'legacy.json');const extra=path.join(temp,'extra.json');const uploads=path.join(temp,'uploads');let child;
const ua={'user-agent':'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/149 Mobile Safari/537.36'};

before(async()=>{child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',PUBLIC_ORIGIN:base,QR_AJN_DATA_FILE:legacy,QR_AJN_V9_DATA_FILE:extra,QR_AJN_V9_UPLOAD_DIR:uploads},stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',d=>stderr+=d);for(let i=0;i<100;i++){try{const r=await fetch(`${base}/api/v9/health`);if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,40))}throw new Error(`server did not start: ${stderr}`)});
after(async()=>{if(child&&!child.killed)child.kill();await fs.rm(temp,{recursive:true,force:true})});
async function j(url,opts={}){const r=await fetch(base+url,opts);let data={};try{data=await r.json()}catch{}return{r,data}}

test('smart create intent prepares supported tools',async()=>{let x=await j('/api/v9/smart/parse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:'Create a smart link for https://example.com'})});assert.equal(x.r.status,200);assert.equal(x.data.action,'link');assert.equal(x.data.fields.destination,'https://example.com')});

test('smart link supports clean public route, click analytics and private management',async()=>{let x=await j('/api/v9/links',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Offer',slug:'offer-test',destination:'https://example.com/base',utm:{source:'test',medium:'qr'}})});assert.equal(x.r.status,201);assert.match(x.data.item.publicUrl,/\/offer-test$/);const manage=x.data.manageUrl,token=x.data.token,id=x.data.item.id;let r=await fetch(`${base}/offer-test`,{headers:ua,redirect:'manual'});assert.equal(r.status,302);assert.match(r.headers.get('location'),/utm_source=test/);x=await j('/api/v9/analytics?days=30');assert.equal(x.r.status,200);assert.equal(x.data.counts.link_click,1);x=await j(`/api/v9/manage/links/${id}?token=${encodeURIComponent(token)}`);assert.equal(x.r.status,200);assert.equal(x.data.item.name,'Offer');assert.match(manage,/\/manage\/v9\/links\//)});

test('quick short link auto-generates a compact back-half and exposes private live analytics',async()=>{let x=await j('/api/v9/links',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Quick',slug:'',destination:'https://example.org/path'})});assert.equal(x.r.status,201);assert.equal(x.data.autoSlug,true);assert.match(x.data.item.slug,/^[a-z0-9]{6}$/);assert.match(x.data.item.publicUrl,new RegExp(`/${x.data.item.slug}$`));const{id}=x.data.item,token=x.data.token;let r=await fetch(`${base}/${x.data.item.slug}`,{headers:ua,redirect:'manual'});assert.equal(r.status,302);x=await j(`/api/v9/manage/links/${id}/analytics?days=30&token=${encodeURIComponent(token)}`);assert.equal(x.r.status,200);assert.equal(x.data.counts.link_click,1);assert.equal(x.data.total,1);assert.equal(x.data.unique,1)});

test('campaign management token is required',async()=>{let x=await j('/api/v9/campaigns',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Diwali',description:'Test campaign'})});assert.equal(x.r.status,201);const id=x.data.item.id,token=x.data.token;let bad=await j(`/api/v9/manage/campaigns/${id}?token=wrong`);assert.equal(bad.r.status,403);let good=await j(`/api/v9/manage/campaigns/${id}?token=${encodeURIComponent(token)}`);assert.equal(good.r.status,200);assert.equal(good.data.item.name,'Diwali')});

test('standalone PDF publishes a stable public page',async()=>{const pdf=Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');let r=await fetch(`${base}/api/v9/files?name=${encodeURIComponent('resume.pdf')}`,{method:'POST',headers:{'content-type':'application/pdf'},body:pdf});assert.equal(r.status,201);const up=await r.json();let x=await j('/api/v9/documents',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({fileId:up.file.id,title:'Resume',slug:'resume-test',description:'Test resume'})});assert.equal(x.r.status,201);r=await fetch(`${base}/resume-test`,{headers:ua});assert.equal(r.status,200);const page=await r.text();assert.match(page,/Resume · QR AJN/);x=await j('/api/v9/analytics?days=30');assert.ok(x.data.counts.document_view>=1)});
