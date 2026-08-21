import crypto from "node:crypto";

export function clean(value,max=500){return String(value??"").replace(/\u0000/g,"").trim().slice(0,max);}
export function safeUrl(value){if(!value)return "";try{const u=new URL(String(value));return ["http:","https:"].includes(u.protocol)?u.toString():"";}catch{return "";}}
export function safeEmail(value){const s=clean(value,200).toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?s:"";}
export function safePhone(value){return clean(value,40).replace(/[^+\d\s().-]/g,"");}
export function normalizeSlug(value){return clean(value,90).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70);}
export function randomToken(bytes=32){return crypto.randomBytes(bytes).toString("base64url");}
export function sha256(value){return crypto.createHash("sha256").update(String(value)).digest("hex");}
export function hmac(value,secret=process.env.QR_AJN_SCAN_PEPPER||""){if(!secret)throw Object.assign(new Error("Server signing secret is not configured."),{code:"SERVER_NOT_CONFIGURED",status:503});return crypto.createHmac("sha256",secret).update(String(value)).digest("hex");}
export function timingSafeHex(a,b){try{const x=Buffer.from(String(a),"hex"),y=Buffer.from(String(b),"hex");return x.length===y.length&&crypto.timingSafeEqual(x,y);}catch{return false;}}
export function requestIp(request){return String(request.headers["x-forwarded-for"]||request.headers["x-real-ip"]||"").split(",")[0].trim();}
export function privacyVisitorHash(request,bucket="month"){const now=new Date();const period=bucket==="day"?now.toISOString().slice(0,10):now.toISOString().slice(0,7);return hmac(`${requestIp(request)}|${String(request.headers["user-agent"]||"").slice(0,300)}|${period}`).slice(0,40);}

export function encryptionKey(){
  const raw=String(process.env.QR_AJN_DATA_KEY||"");
  if(!raw)throw Object.assign(new Error("QR_AJN_DATA_KEY is required for encrypted integration credentials."),{status:503,code:"CONFIGURATION_REQUIRED"});
  try{const b=Buffer.from(raw,"base64");if(b.length===32)return b;}catch{}
  const b=crypto.createHash("sha256").update(raw).digest();return b;
}
export function encryptSecret(value){
  const key=encryptionKey(),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",key,iv),enc=Buffer.concat([cipher.update(String(value),"utf8"),cipher.final()]),tag=cipher.getAuthTag();
  return Buffer.concat([iv,tag,enc]).toString("base64url");
}
export function decryptSecret(value){
  const key=encryptionKey(),buf=Buffer.from(String(value),"base64url"),iv=buf.subarray(0,12),tag=buf.subarray(12,28),enc=buf.subarray(28),decipher=crypto.createDecipheriv("aes-256-gcm",key,iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(enc),decipher.final()]).toString("utf8");
}
export function redact(value){const s=String(value??"");if(s.length<8)return "***";return `${s.slice(0,3)}…${s.slice(-3)}`;}
export function json(response,status,body){response.status(status).setHeader("content-type","application/json; charset=utf-8").setHeader("cache-control","no-store").setHeader("x-content-type-options","nosniff").send(JSON.stringify(body));}
export function parseBody(request){if(request.body&&typeof request.body==="object")return request.body;const raw=String(request.body||"");try{return JSON.parse(raw||"{}");}catch{return Object.fromEntries(new URLSearchParams(raw));}}
export function method(request,...allowed){const m=String(request.method||"GET").toUpperCase();if(!allowed.includes(m)){const e=new Error("Method not allowed.");e.status=405;e.code="METHOD_NOT_ALLOWED";throw e;}return m;}
export function fail(error,response){const status=Number(error?.status||500),code=String(error?.code||"INTERNAL_ERROR"),expose=status<500||code==="SERVER_NOT_CONFIGURED"||code==="CONFIGURATION_REQUIRED";return json(response,status,{ok:false,error:expose?String(error?.message||"Request failed."):"Request failed.",code,details:error?.details||undefined});}
export function escapeCsv(value){const s=String(value??"");return /[",\r\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;}
