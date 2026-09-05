import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../seo-pages.mjs';

function request(url){
  return new Promise((resolve,reject)=>{
    const headers={};
    const res={
      statusCode:200,
      setHeader(k,v){headers[k.toLowerCase()]=v},
      end(body=''){resolve({status:this.statusCode,headers,body:String(body)})}
    };
    Promise.resolve(handler({url,method:'GET'},res)).catch(reject);
  });
}

test('dedicated SEO feature pages render indexable metadata',async()=>{
  for(const slug of ['qr-code-generator','short-links','analytics','digital-profiles','pdf-sharing','campaigns']){
    const r=await request(`/${slug}`);
    assert.equal(r.status,200,slug);
    assert.equal(r.body.includes(`<link rel="canonical" href="https://qrajn.online/${slug}">`),true,`canonical ${slug}`);
    assert.equal(r.body.includes('"@type":"FAQPage"'),true,`FAQ schema ${slug}`);
    assert.equal(r.body.includes('"@type":"BreadcrumbList"'),true,`breadcrumb schema ${slug}`);
    assert.equal(r.body.includes('meta name="robots" content="index,follow'),true,`robots ${slug}`);
  }
});

test('sitemap index and robots connect discovery paths',async()=>{
  let r=await request('/sitemap.xml');
  assert.equal(r.status,200);
  assert.equal(r.body.includes('https://qrajn.online/sitemap-static.xml'),true);
  assert.equal(r.body.includes('https://qrajn.online/sitemap-public.xml'),true);

  r=await request('/sitemap-static.xml');
  assert.equal(r.status,200);
  assert.equal(r.body.includes('https://qrajn.online/short-links'),true);
  assert.equal(r.body.includes('https://qrajn.online/qr-code-generator'),true);

  r=await request('/robots.txt');
  assert.equal(r.status,200);
  assert.equal(r.body.includes('Sitemap: https://qrajn.online/sitemap.xml'),true);
});
