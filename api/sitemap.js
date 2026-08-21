import {getAdmin} from "./_admin.js";
const esc=s=>String(s).replace(/[<>&'"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]));
export default async function handler(request,response){
  try{
    const {db}=getAdmin(),profiles=Object.values((await db.ref("qrajn/publicBusinessProfiles").get()).val()||{}).filter(p=>p?.published!==false&&p.slug),base="https://www.qrajn.online",staticUrls=["/","/pricing","/discovery","/privacy.html","/terms.html"];
    const urls=[...staticUrls.map(path=>({loc:base+path,lastmod:new Date().toISOString().slice(0,10)})),...profiles.map(p=>({loc:`${base}/b/${encodeURIComponent(p.slug)}`,lastmod:new Date(Number(p.updatedAt||Date.now())).toISOString().slice(0,10)}))];
    const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(x=>`<url><loc>${esc(x.loc)}</loc><lastmod>${x.lastmod}</lastmod></url>`).join("")}</urlset>`;
    response.status(200).setHeader("content-type","application/xml; charset=utf-8").setHeader("cache-control","public, s-maxage=3600").send(xml);
  }catch{response.status(500).send("Sitemap unavailable");}
}
