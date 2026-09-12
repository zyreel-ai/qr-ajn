
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import seoHandler from '../seo-pages.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

async function text(rel){return fs.readFile(path.join(root,rel),'utf8')}
async function png(rel){
  const b=await fs.readFile(path.join(root,rel));
  assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`${rel} PNG signature`);
  assert.ok(b.length>1000,`${rel} should not be empty`);
  return b;
}

test('V12 transparent QR AJN brand assets and metadata are wired',async()=>{
  await png('qr-ajn-logo-v12.png');
  await png('qr-ajn-logo-512-v12.png');
  await png('qr-ajn-logo-192-v12.png');
  await png('qr-ajn-logo-180-v12.png');
  await png('qr-ajn-logo-64-v12.png');

  const index=await text('index.html');
  assert.equal(index.includes('class="brand-logo-v12"'),true);
  assert.equal(index.includes('https://qrajn.online/qr-ajn-logo-v12.png'),true);
  assert.equal(index.includes('/qr-ajn-logo-64-v12.png'),true);
  assert.equal(index.includes('/qr-ajn-logo-180-v12.png'),true);

  const manifest=JSON.parse(await text('manifest.webmanifest'));
  assert.equal(manifest.icons.some(x=>x.src==='/qr-ajn-logo-192-v12.png'&&x.sizes==='192x192'),true);
  assert.equal(manifest.icons.some(x=>x.src==='/qr-ajn-logo-512-v12.png'&&x.sizes==='512x512'),true);

  const boot=await text('app-route-boot.js');
  assert.equal(boot.includes('mini-brand-logo-v12'),true);
  assert.equal(boot.includes('footer-brand-logo-v12'),true);

  for(const rel of ['about.html','privacy.html','terms.html','contact.html']){
    const html=await text(rel);
    assert.equal(html.includes('legal-brand-logo-v12'),true,rel);
  }

  const vercel=JSON.parse(await text('vercel.json'));
  const build=vercel.builds.find(x=>x.src==='server.mjs');
  for(const rel of ['qr-ajn-logo-v12.png','qr-ajn-logo-512-v12.png','qr-ajn-logo-192-v12.png','qr-ajn-logo-180-v12.png','qr-ajn-logo-64-v12.png']){
    assert.equal(build.config.includeFiles.includes(rel),true,rel);
  }
});

test('V12 SEO pages use the new QR AJN brand logo',async()=>{
  const result=await new Promise((resolve,reject)=>{
    const headers={};
    const res={
      statusCode:200,
      setHeader(k,v){headers[String(k).toLowerCase()]=v},
      end(body=''){resolve({status:this.statusCode,headers,body:String(body)})}
    };
    Promise.resolve(seoHandler({url:'/qr-code-generator',method:'GET'},res)).catch(reject);
  });
  assert.equal(result.status,200);
  assert.equal(result.body.includes('seo-brand-v12'),true);
  assert.equal(result.body.includes('/qr-ajn-logo-v12.png'),true);
});
