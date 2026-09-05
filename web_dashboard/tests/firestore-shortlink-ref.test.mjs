import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=49300+Math.floor(Math.random()*400);
const base=`http://127.0.0.1:${port}`;
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'qrajn-ref-'));
const extra=path.join(temp,'extra.json');
let child;

before(async()=>{
  child=spawn(process.execPath,['server.mjs'],{
    cwd:root,
    env:{...process.env,PORT:String(port),HOST:'127.0.0.1',PUBLIC_ORIGIN:base,QR_AJN_DATA_FILE:path.join(temp,'legacy.json'),QR_AJN_V9_DATA_FILE:extra,QR_AJN_V9_UPLOAD_DIR:path.join(temp,'uploads'),VERCEL:'',FIREBASE_PROJECT_ID:'',FIREBASE_CLIENT_EMAIL:'',FIREBASE_PRIVATE_KEY:'',FIREBASE_SERVICE_ACCOUNT_JSON:'',FIREBASE_STORAGE_BUCKET:''},
    stdio:['ignore','pipe','pipe']
  });
  let err='';child.stderr.on('data',d=>err+=d);
  for(let i=0;i<100;i++){try{const r=await fetch(`${base}/api/v9/health`);if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,50))}
  throw new Error(err);
});
after(async()=>{if(child&&!child.killed)child.kill();await fs.rm(temp,{recursive:true,force:true})});

test('Firestore resourceId resolves short link',async()=>{
  let r=await fetch(`${base}/api/v9/links`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Ref',slug:'firestore-ref-test',destination:'https://example.com/firestore-ok'})});
  assert.equal(r.status,201);
  const db=JSON.parse(await fs.readFile(extra,'utf8'));
  const ref=db.publicLinks['firestore-ref-test'];
  ref.resourceId=ref.id;delete ref.id;
  await fs.writeFile(extra,JSON.stringify(db,null,2));
  r=await fetch(`${base}/firestore-ref-test`,{redirect:'manual'});
  assert.equal(r.status,302);
  assert.equal(r.headers.get('location'),'https://example.com/firestore-ok');
});