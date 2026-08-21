import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s.replace(/\r\n/g,"\n"),"utf8");
const exists=p=>fs.existsSync(path.join(root,p));
function must(cond,msg){if(!cond)throw new Error(msg);}

must(exists("public/app.js"),"public/app.js missing");
must(exists("public/firebase-backend.js"),"public/firebase-backend.js missing");
must(exists("api/redirect.js"),"api/redirect.js missing");
must(exists("public/index.html"),"public/index.html missing");
must(exists("package.json"),"package.json missing");

// App shell + V6 pages.
let app=read("public/app.js");
const v6Import='import {v6ProtectedPath,v6Shell,renderV6Page,initV6Page,initV6PublicProfile} from "./v6-platform.js";\n';
if(!app.includes(v6Import.trim())){
  const anchor='import { qrSvg } from "./qr-engine.js";\n';
  must(app.includes(anchor),"app.js QR engine import anchor missing");
  app=app.replace(anchor,anchor+v6Import);
}
app=app.replace(
  'function shell(content){return `<div class="app-shell">${appNav()}${content}</div>`;}',
  'function shell(content){return v6Shell(content,{session,state});}'
);
const protectedOld='function protectedPath(p=location.pathname){return ["/dashboard","/qr-codes","/branding","/create","/settings","/business-profiles","/business/new"].includes(p)||/^\\/qr\\/[^/]+$/.test(p)||/^\\/business\\/[^/]+$/.test(p);}';
const protectedNew='function protectedPath(p=location.pathname){return v6ProtectedPath(p)||["/dashboard","/qr-codes","/branding","/create","/settings","/business-profiles","/business/new"].includes(p)||/^\\/qr\\/[^/]+$/.test(p)||/^\\/business\\/[^/]+$/.test(p);}';
if(app.includes(protectedOld)) app=app.replace(protectedOld,protectedNew);
else if(!app.includes("v6ProtectedPath(p)")) throw new Error("protectedPath patch anchor not found");

const renderAnchor='function render(){const p=location.pathname;if(/^\\/b\\/[^/]+$/.test(p)){publicBusinessPage(decodeURIComponent(p.split("/")[2]));return;}if(protectedPath(p)&&!session){history.replaceState({},"","/auth");app.innerHTML=authPage();return;}';
const renderReplacement='function render(){const p=location.pathname;if(/^\\/b\\/[^/]+$/.test(p)){publicBusinessPage(decodeURIComponent(p.split("/")[2]));setTimeout(()=>initV6PublicProfile(p),0);return;}if(protectedPath(p)&&!session){history.replaceState({},"","/auth");app.innerHTML=authPage();return;}const v6=renderV6Page(p,{session,state,esc,toast,route});if(v6){app.innerHTML=v6Shell(v6,{session,state});setTimeout(()=>initV6Page(p,{session,state,esc,toast,route}),0);return;}';
if(app.includes(renderAnchor)) app=app.replace(renderAnchor,renderReplacement);
else if(!app.includes("const v6=renderV6Page")) throw new Error("render() V6 injection anchor not found");

app=app.replace(
  `<button class="btn small" onclick="route('/qr/\${q.id}')">Manage</button><button class="btn small ghost" onclick="copyText('\${attr(shortLink(q))}')">Copy link</button>`,
  `<button class="btn small" onclick="route('/qr/\${q.id}')">Manage</button><button class="btn small ghost" onclick="route('/qr-design/\${q.id}')">Design</button><button class="btn small ghost" onclick="copyText('\${attr(shortLink(q))}')">Copy link</button>`
);
app=app.replace(
  `<button class="btn small" onclick="editBusiness('\${p.id}')">Edit</button>`,
  `<button class="btn small" onclick="editBusiness('\${p.id}')">Edit</button><button class="btn small ghost" onclick="route('/builder/\${p.id}')">Block Builder</button>`
);
write("public/app.js",app);

// Server-side plan enforcement for QR/profile mutations.
let fb=read("public/firebase-backend.js");
const renames=[
  ["export async function createQr(user,input){","async function createQrClientLegacy(user,input){"],
  ["export async function updateQr(user,id,patch){","async function updateQrClientLegacy(user,id,patch){"],
  ["export async function deleteQr(user,id){","async function deleteQrClientLegacy(user,id){"],
  ['export async function saveBusinessProfile(user,input,id=""){','async function saveBusinessProfileClientLegacy(user,input,id=""){'],
  ["export async function deleteBusinessProfile(user,id){","async function deleteBusinessProfileClientLegacy(user,id){"]
];
const v6WrappersAlreadyInstalled=fb.includes("// QR AJN V6 SERVER ENFORCEMENT WRAPPERS");
if(!v6WrappersAlreadyInstalled){
  for(const [a,b] of renames){
    if(fb.includes(a)) fb=fb.replace(a,b);
    else if(!fb.includes(b)) throw new Error(`firebase-backend patch anchor missing: ${a.slice(0,45)}`);
  }
}
const wrappersMarker="// QR AJN V6 SERVER ENFORCEMENT WRAPPERS";
if(!fb.includes(wrappersMarker)){
  fb += `

${wrappersMarker}
async function v6Server(user,path,options={}){
  user=requiredUser(user);
  const token=await user.getIdToken();
  const response=await fetch(path,{...options,headers:{"content-type":"application/json","authorization":\`Bearer \${token}\`,...(options.headers||{})}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(body.error||\`Server request failed (\${response.status})\`);error.code=body.code||"";error.details=body.details;throw error;}
  return body;
}
export async function createQr(user,input){return (await v6Server(user,"/api/v1/qrs",{method:"POST",body:JSON.stringify(input)})).qr;}
export async function updateQr(user,id,patch){return (await v6Server(user,"/api/v1/qrs",{method:"PATCH",body:JSON.stringify({id,...patch})})).qr;}
export async function deleteQr(user,id){return (await v6Server(user,"/api/v1/qrs",{method:"DELETE",body:JSON.stringify({id})})).ok;}
export async function saveBusinessProfile(user,input,id=""){
  const method=id?"PUT":"POST",body=id?{id,...input}:input;
  return (await v6Server(user,"/api/v1/profiles",{method,body:JSON.stringify(body)})).profile;
}
export async function deleteBusinessProfile(user,id){return (await v6Server(user,"/api/v1/profiles",{method:"DELETE",body:JSON.stringify({id})})).ok;}
`;
}
write("public/firebase-backend.js",fb);

// Advanced V6 scan runtime.
let redirect=read("api/redirect.js");
const runtimeImport='import {v6PreflightScan,v6SelectDestination,v6AfterScan} from "../server/v6/qr-runtime.js";\n';
if(!redirect.includes(runtimeImport.trim())){
  const a='import { safeUrl,classifyDevice,evaluateAvailability,selectDestination } from "./_redirect-logic.js";\n';
  must(redirect.includes(a),"redirect import anchor missing");
  redirect=redirect.replace(a,a+runtimeImport);
}
const destOld='const context=contextFromRequest(request),destination=selectDestination(link,context);';
const destNew='const context=contextFromRequest(request),preflight=await v6PreflightScan(db,link,shortId,request,context),destination=await v6SelectDestination(link,context,()=>selectDestination(link,context));';
if(redirect.includes(destOld))redirect=redirect.replace(destOld,destNew);
else if(!redirect.includes("preflight=await v6PreflightScan"))throw new Error("redirect destination anchor missing");
const scanOld='await recordScan(db,shortId,link,context,request);return response.redirect(302,destination);';
const scanNew='if(preflight.recordAnalytics)await recordScan(db,shortId,link,context,request);await v6AfterScan(db,link,preflight,{country:context.country,city:context.city,device:context.device});return response.redirect(302,destination);';
if(redirect.includes(scanOld))redirect=redirect.replace(scanOld,scanNew);
else if(!redirect.includes("v6AfterScan"))throw new Error("redirect scan anchor missing");
write("api/redirect.js",redirect);


// HTML / PWA / V6 CSS.
let html=read("public/index.html");
if(!html.includes("/v6-platform.css")) html=html.replace('<link rel="stylesheet" href="/styles.css" />','<link rel="stylesheet" href="/styles.css" />\n  <link rel="stylesheet" href="/v6-platform.css" />');
if(!html.includes('rel="manifest"')) html=html.replace('<link rel="icon" href="/assets/qr-ajn-logo.svg" type="image/svg+xml" />','<link rel="icon" href="/assets/qr-ajn-logo.svg" type="image/svg+xml" />\n  <link rel="manifest" href="/manifest.webmanifest" />');
if(!html.includes('name="google-adsense-account"')) html=html.replace('<meta name="robots" content="index,follow" />','<meta name="robots" content="index,follow" />\n  <meta name="google-adsense-account" content="ca-pub-4495802176396975" />');
if(!html.includes("navigator.serviceWorker.register")) html=html.replace('</body>','  <script>if("serviceWorker" in navigator){addEventListener("load",()=>navigator.serviceWorker.register("/service-worker.js").catch(()=>{}));}</script>\n</body>');
write("public/index.html",html);

// Package version and V6 verification.
const pkg=JSON.parse(read("package.json"));
pkg.version="6.0.0";
pkg.description="QR AJN V6 realtime dynamic QR, universal profiles, CRM, analytics, monetization and integration platform.";
pkg.engines={...(pkg.engines||{}),node:"22.x"};
pkg.scripts={...(pkg.scripts||{})};
if(pkg.scripts.test)pkg.scripts.test=pkg.scripts.test.replace(/\s*&&\s*node scripts\/v5-project-check\.mjs/g,"");
pkg.scripts["v6:check"]="node scripts/v6-project-check.mjs";
pkg.scripts["v6:acceptance"]="node scripts/v6-acceptance.mjs";
let baseVerify=pkg.scripts.verify||"npm run check && npm test";
baseVerify=baseVerify.replace(/\s*&&\s*npm run v6:check/g,"").replace(/\s*&&\s*npm run v6:acceptance/g,"");
pkg.scripts.verify=`${baseVerify} && npm run v6:check && npm run v6:acceptance`;
pkg.overrides={...(pkg.overrides||{}),"jwks-rsa":{"jose":"5.10.0"}};
write("package.json",JSON.stringify(pkg,null,2)+"\n");

// Vercel routes and security headers.
const routes=[
  {source:"/r/:shortId",destination:"/api/redirect?shortId=:shortId"},
  {source:"/b/:slug",destination:"/api/profile-page?slug=:slug"},
  {source:"/b/:path*",destination:"/index.html"},
  {source:"/sitemap.xml",destination:"/api/sitemap"},
  ...["/auth","/dashboard","/qr-codes","/branding","/create","/settings","/business-profiles","/business/new",
      "/analytics","/leads","/campaigns","/templates","/media","/team","/billing","/integrations","/api-webhooks",
      "/audit","/ai","/bulk-qr","/security","/pricing","/nfc","/discovery","/agency","/notifications"].map(source=>({source,destination:"/index.html"})),
  {source:"/qr/:path*",destination:"/index.html"},
  {source:"/business/:path*",destination:"/index.html"},
  {source:"/builder/:path*",destination:"/index.html"},
  {source:"/qr-design/:path*",destination:"/index.html"}
];
const vercel={
  "$schema":"https://openapi.vercel.sh/vercel.json",
  "rewrites":routes,
  "headers":[
    {source:"/(.*)",headers:[
      {key:"Strict-Transport-Security",value:"max-age=63072000; includeSubDomains; preload"},
      {key:"X-Content-Type-Options",value:"nosniff"},
      {key:"X-Frame-Options",value:"SAMEORIGIN"},
      {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
      {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
      {key:"Cross-Origin-Opener-Policy",value:"same-origin-allow-popups"},
      {key:"Content-Security-Policy",value:"default-src 'self'; script-src 'self' https://www.gstatic.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://www.gstatic.com https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasedatabase.app; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests"}
    ]},
    {source:"/ads.txt",headers:[{key:"Content-Type",value:"text/plain; charset=utf-8"},{key:"Cache-Control",value:"public, max-age=3600"}]},
    {source:"/service-worker.js",headers:[{key:"Cache-Control",value:"no-cache"}]}
  ],
  "framework":null,
  "outputDirectory":"public"
};
write("vercel.json",JSON.stringify(vercel,null,2)+"\n");

console.log("QR AJN V6 source patch: PASS");
