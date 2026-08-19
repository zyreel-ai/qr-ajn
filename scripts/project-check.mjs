import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const required=["public/index.html","public/app.js","public/firebase-backend.js","public/firebase-config.js","public/qr-engine.js","vercel.json","firebase/database.rules.qrajn-snippet.json"];
for(const f of required)if(!fs.existsSync(path.join(root,f)))throw new Error(`Missing required file: ${f}`);

const config=read("public/firebase-config.js");
for(const token of ["unna-space-prod-226ff4","default-rtdb.asia-southeast1.firebasedatabase.app","https://qrajn.online"]) {
  if(!config.includes(token))throw new Error(`Firebase/domain configuration missing: ${token}`);
}
const app=read("public/app.js");
for(const banned of ["Record test scan","Open local demo workspace","qrforge-local-demo"]) {
  if(app.includes(banned))throw new Error(`Demo/test behavior still present: ${banned}`);
}
if(!app.includes("trackPublicScan"))throw new Error("Real scan tracking flow is missing.");
const rules=JSON.parse(read("firebase/database.rules.qrajn-snippet.json"));
if(!rules.qrajn?.users || !rules.qrajn?.scanEvents || !rules.qrajn?.publicLinks)throw new Error("QR AJN rules namespace is incomplete.");
if(rules.qrajn.publicLinks[".read"] === true)throw new Error("Public links must not allow a bulk parent read.");
if(rules.qrajn.publicLinks?.["$shortId"]?.[".read"] !== true)throw new Error("Per-shortId public read rule is missing.");
const vercel=JSON.parse(read("vercel.json"));
if(!vercel.rewrites?.some(x=>x.source==="/r/:path*"))throw new Error("Vercel dynamic redirect rewrite is missing.");
if(vercel.outputDirectory!=="public")throw new Error("Vercel outputDirectory must be public.");
console.log("QR AJN production project check: PASS");
console.log("- Firebase project configured");
console.log("- qrajn namespace rules present");
console.log("- demo/test scan behavior removed");
console.log("- real public scan tracking present");
console.log("- qrajn.online dynamic route configured");
