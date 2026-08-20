import fs from "node:fs";

const read = p => fs.readFileSync(p,"utf8");

const pkg = JSON.parse(read("package.json"));
const app = read("public/app.js");
const fb = read("public/firebase-backend.js");
const redirect = read("api/redirect.js");
const storage = read("firebase/storage.rules.qrajn-snippet.txt");

if(pkg.version !== "5.0.0")
  throw new Error("package version is not 5.0.0");

for(const oldText of [
  "Vemulawada",
  "Agriculture / Farmer",
  "Ridge Gourd",
  "Fresh farm vegetables"
]){
  if(app.includes(oldText))
    throw new Error("Old farming content remains: "+oldText);
}

for(const required of [
  "Student / Resume / Portfolio",
  "Professional / Student / Extended Profile",
  "Gallery image URLs",
  "scanVisitorKey",
  "scanReturning"
]){
  if(!app.includes(required))
    throw new Error("Missing V5 UI feature: "+required);
}

for(const required of [
  "deviceName",
  "browserVersion",
  "osVersion",
  "userAgent"
]){
  if(!fb.includes(required))
    throw new Error("Missing client metadata: "+required);
}

for(const required of [
  "visitorHash",
  "deviceName",
  "browserVersion",
  "osVersion",
  "isDuplicate",
  "isBot"
]){
  if(!redirect.includes(required))
    throw new Error("Missing server scan feature: "+required);
}

for(const required of [
  "/gallery/",
  "/documents/",
  "/qr-assets/"
]){
  if(!storage.includes(required))
    throw new Error("Missing Storage rule: "+required);
}

console.log("QR AJN V5 REALTIME MIGRATION: PASS");