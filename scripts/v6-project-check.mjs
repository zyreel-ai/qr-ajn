import fs from "node:fs";
import {spawnSync} from "node:child_process";
import path from "node:path";
function walk(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
}
const required=[
"public/v6-platform.js","public/v6-platform.css","public/v6-media.js","public/v6-mfa.js","public/v6-sso.js","public/v6-plugin-sdk.js",
"public/ads.txt","public/manifest.webmanifest","public/service-worker.js","public/privacy.html","public/terms.html","public/refund.html","public/ad-policy.html","public/api-docs.html",
"server/v6/plans.js","server/v6/platform.js","server/v6/security.js","server/v6/analytics.js","server/v6/qr-runtime.js","server/v6/qr-service.js","server/v6/profile-service.js",
"api/v1/health.js","api/v1/me.js","api/v1/qrs.js","api/v1/profiles.js","api/v1/analytics.js","api/v1/leads.js","api/v1/team.js","api/v1/api-keys.js","api/v1/webhooks.js","api/v1/billing.js","api/v1/ai.js",
"api/profile-page.js","api/sitemap.js","scripts/v6-acceptance.json"
];
const missing=required.filter(x=>!fs.existsSync(x));if(missing.length)throw new Error("Missing V6 files: "+missing.join(", "));
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="6.0.0")throw new Error("package.json version must be 6.0.0");
const ads=fs.readFileSync("public/ads.txt","utf8").trim();if(ads!=="google.com, pub-4495802176396975, DIRECT, f08c47fec0942fa0")throw new Error("ads.txt is not the configured publisher line.");
const app=fs.readFileSync("public/app.js","utf8");if(!app.includes("renderV6Page")||!app.includes("v6Shell"))throw new Error("V6 UI patch not installed in app.js");
const fb=fs.readFileSync("public/firebase-backend.js","utf8");if(!fb.includes("QR AJN V6 SERVER ENFORCEMENT WRAPPERS"))throw new Error("Server-side mutation wrappers missing");
const redirect=fs.readFileSync("api/redirect.js","utf8");if(!redirect.includes("v6PreflightScan")||!redirect.includes("v6AfterScan"))throw new Error("V6 redirect runtime not installed");
const vercel=JSON.parse(fs.readFileSync("vercel.json","utf8"));if(!vercel.rewrites?.some(x=>x.source==="/b/:slug"&&String(x.destination).includes("profile-page")))throw new Error("SSR profile rewrite missing");
if(!vercel.rewrites?.some(x=>x.source==="/b/:path*"))throw new Error("V5 business profile compatibility rewrite missing");
const syntaxFiles=[...walk("server/v6"),...walk("api/v1"),...walk("public")].filter(x=>/\.(m?js)$/.test(x));
for(const file of syntaxFiles){const r=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});if(r.status!==0)throw new Error(`Syntax error in ${file}: ${r.stderr||r.stdout}`);}
console.log(`QR AJN V6 syntax checked: ${syntaxFiles.length} files`);
console.log("QR AJN V6 production project check: PASS");
