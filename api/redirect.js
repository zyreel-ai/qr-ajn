import crypto from "node:crypto";
import { getAdmin } from "./_admin.js";
import { safeUrl,classifyDevice,evaluateAvailability,selectDestination } from "./_redirect-logic.js";

function htmlEsc(value){return String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function sendHtml(response,status,body){response.status(status).setHeader("content-type","text/html; charset=utf-8").setHeader("cache-control","no-store").setHeader("x-content-type-options","nosniff").setHeader("referrer-policy","no-referrer").send(body);}
function shell(title,content){return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0f766e"><title>${htmlEsc(title)} Â· QR AJN</title><style>*{box-sizing:border-box}body{margin:0;background:linear-gradient(135deg,#f0fdfa,#f8fafc);color:#172033;font:14px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;min-height:100vh;display:grid;place-items:center;padding:20px}.card{width:min(480px,100%);background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:28px;box-shadow:0 24px 70px #0f172a18}.brand{font-weight:900;color:#0f766e}.card h1{font-size:27px;margin:16px 0 7px;color:#0f172a}.card p{color:#64748b}.field{margin:14px 0}.field label{display:block;font-size:11px;font-weight:800;margin-bottom:6px}.field input,.field textarea{width:100%;border:1px solid #dbe3e0;border-radius:11px;padding:11px;outline:none}.field input:focus,.field textarea:focus{border-color:#5eead4;box-shadow:0 0 0 4px #2dd4bf1f}.btn{width:100%;border:0;border-radius:12px;padding:12px 15px;background:linear-gradient(135deg,#0f766e,#16a34a);color:#fff;font-weight:800;cursor:pointer}.consent{display:flex;gap:8px;align-items:flex-start;font-size:10px;color:#64748b;margin:14px 0}.note{padding:12px;border-radius:12px;background:#f8fafc;font-size:10px;color:#64748b}.error{padding:10px;border-radius:10px;background:#fff1f2;color:#9f1239;font-size:11px;margin:12px 0}</style></head><body><main class="card"><div class="brand">QR AJN</div>${content}</main></body></html>`;}
function parseBody(request){if(request.body&&typeof request.body==="object")return request.body;const raw=String(request.body||"");return Object.fromEntries(new URLSearchParams(raw));}
function verifyPassword(password,secret){if(!secret?.salt||!secret?.hash)return false;const hash=crypto.scryptSync(String(password||""),secret.salt,64);const expected=Buffer.from(secret.hash,"hex");return expected.length===hash.length&&crypto.timingSafeEqual(expected,hash);}
function uaDetails(ua){
 const pick=(r,i=1)=>(String(ua).match(r)||[])[i]||"";
 let browser="Other",browserVersion="";
 if(/Edg\//i.test(ua)){browser="Edge";browserVersion=pick(/Edg\/([\d.]+)/i);}
 else if(/Chrome\//i.test(ua)){browser="Chrome";browserVersion=pick(/Chrome\/([\d.]+)/i);}
 else if(/Firefox\//i.test(ua)){browser="Firefox";browserVersion=pick(/Firefox\/([\d.]+)/i);}
 else if(/Safari\//i.test(ua)){browser="Safari";browserVersion=pick(/Version\/([\d.]+)/i);}

 let os="Other",osVersion="";
 if(/Android/i.test(ua)){os="Android";osVersion=pick(/Android\s+([\d.]+)/i);}
 else if(/iPhone|iPad/i.test(ua)){os="iOS";osVersion=pick(/OS\s+([\d_]+)/i).replaceAll("_",".");}
 else if(/Windows NT/i.test(ua)){os="Windows";osVersion=pick(/Windows NT\s+([\d.]+)/i);}
 else if(/Mac OS X/i.test(ua)){os="macOS";osVersion=pick(/Mac OS X\s+([\d_]+)/i).replaceAll("_",".");}
 else if(/Linux/i.test(ua)){os="Linux";}

 const model=pick(/Android[^;]*;\s*([^;)]+?)(?:\s+Build\/|;|\))/i).trim();
 const deviceName=model||
  (/iPad/i.test(ua)?"iPad":
   /iPhone/i.test(ua)?"iPhone":
   /Windows/i.test(ua)?"Windows PC":
   /Macintosh/i.test(ua)?"Mac":
   /Linux/i.test(ua)?"Linux device":"Unknown device");

 return {
  browser,browserVersion,os,osVersion,deviceName,
  isBot:/bot|crawler|spider|preview|facebookexternalhit|WhatsApp/i.test(ua)
 };
}

function contextFromRequest(request){
 const ua=String(request.headers["user-agent"]||"");
 const language=String(request.headers["accept-language"]||"").split(",")[0]||"";
 const country=String(request.headers["x-vercel-ip-country"]||"").toUpperCase();
 const region=String(request.headers["x-vercel-ip-country-region"]||"");
 const city=decodeURIComponent(String(request.headers["x-vercel-ip-city"]||""));
 return {ua,device:classifyDevice(ua),language,country,region,city,...uaDetails(ua)};
}
function visitorHash(request){const ip=String(request.headers["x-forwarded-for"]||"").split(",")[0].trim(),pepper=String(process.env.QR_AJN_SCAN_PEPPER||"qrajn");return crypto.createHmac("sha256",pepper).update(`${ip}|${new Date().toISOString().slice(0,10)}`).digest("hex").slice(0,32);}
async function recordScan(db,shortId,link,context,request){
 const hash=visitorHash(request);
 const now=Date.now();

 const recent=await db.ref(`qrajn/scanEvents/${link.ownerId}`)
   .orderByChild("visitorHash")
   .equalTo(hash)
   .limitToLast(10)
   .get();

 const duplicate=Object.values(recent.val()||{}).some(
  e=>e.shortId===shortId && now-Number(e.timestamp||0)<10000
 );

 const ref=db.ref(`qrajn/scanEvents/${link.ownerId}`).push();

 await ref.set({
  id:ref.key,
  qrId:link.qrId,
  shortId,
  scannerUid:"server",
  timestamp:now,
  device:context.device,
  deviceName:String(context.deviceName||"Unknown device").slice(0,80),
  browser:String(context.browser||"Other").slice(0,80),
  browserVersion:String(context.browserVersion||"").slice(0,30),
  os:String(context.os||"Other").slice(0,80),
  osVersion:String(context.osVersion||"").slice(0,30),
  language:context.language.slice(0,30),
  timezone:"Server",
  referrer:String(request.headers.referer||"").slice(0,500),
  screen:"Unknown",
  location:context.city||context.region||context.country||"Not collected",
  country:context.country,
  region:context.region,
  city:context.city,
  visitorHash:hash,
  userAgent:context.ua.slice(0,500),
  isBot:!!context.isBot,
  isDuplicate:duplicate,
  scanSource:"server"
 });

 if(!duplicate&&!context.isBot){
  await db.ref(`qrajn/publicLinks/${shortId}/scanCount`)
    .transaction(v=>Number(v||0)+1);
 }
}
async function recordLead(db,link,shortId,body,request){const ref=db.ref(`qrajn/qrLeads/${link.ownerId}`).push();await ref.set({id:ref.key,qrId:link.qrId,shortId,visitorHash:visitorHash(request),name:String(body.name||"").slice(0,100),phone:String(body.phone||"").slice(0,40),email:String(body.email||"").slice(0,160),message:String(body.message||"").slice(0,1000),consent:true,createdAt:Date.now()});}
export default async function handler(request,response){
  try{
    const shortId=String(request.query?.shortId||"").trim().slice(0,100);if(!shortId)return sendHtml(response,400,shell("Invalid QR","<h1>Invalid QR link</h1><p>The QR link is missing its identifier.</p>"));
    const {db}=getAdmin(),snap=await db.ref(`qrajn/publicLinks/${shortId}`).get();if(!snap.exists())return sendHtml(response,404,shell("QR unavailable","<h1>QR unavailable</h1><p>This QR code does not exist or is no longer published.</p>"));
    const link=snap.val(),availability=evaluateAvailability(link);if(!availability.ok){if(availability.fallback)return response.redirect(302,availability.fallback);return sendHtml(response,410,shell("QR unavailable",`<h1>QR unavailable</h1><p>This QR is ${htmlEsc(availability.reason.replaceAll("-"," "))}.</p>`));}
    const context=contextFromRequest(request),destination=selectDestination(link,context);if(!safeUrl(destination))return sendHtml(response,400,shell("Destination unavailable","<h1>Destination unavailable</h1><p>This QR does not currently have a valid destination.</p>"));
    const needsPassword=link.passwordProtected===true,needsLead=link.leadCapture?.enabled===true;
    if(request.method==="GET"&&(needsPassword||needsLead)){
      const fields=Array.isArray(link.leadCapture?.fields)?link.leadCapture.fields:["name","phone"];const form=`<h1>${htmlEsc(link.leadCapture?.title || (needsPassword?"Continue securely":"Send an enquiry"))}</h1><p>${htmlEsc(link.leadCapture?.description||"Complete the required details to continue.")}</p><form method="post" action="/r/${encodeURIComponent(shortId)}">${needsPassword?`<div class="field"><label>Password</label><input type="password" name="password" minlength="6" required autocomplete="current-password"></div>`:""}${needsLead&&fields.includes("name")?`<div class="field"><label>Name</label><input name="name" maxlength="100" required></div>`:""}${needsLead&&fields.includes("phone")?`<div class="field"><label>Phone</label><input name="phone" maxlength="40" required></div>`:""}${needsLead&&fields.includes("email")?`<div class="field"><label>Email</label><input type="email" name="email" maxlength="160"></div>`:""}${needsLead&&fields.includes("message")?`<div class="field"><label>Message</label><textarea name="message" maxlength="1000"></textarea></div>`:""}${needsLead?`<label class="consent"><input type="checkbox" name="consent" value="yes" required> ${htmlEsc(link.leadCapture?.consentText||"I agree to share these details with this business.")}</label>`:""}<button class="btn" type="submit">Continue</button></form>`;return sendHtml(response,200,shell("Continue",form));
    }
    if(request.method==="POST"){
      const body=parseBody(request);
      if(needsPassword){const secret=(await db.ref(`qrajn/qrSecrets/${link.qrId}`).get()).val();if(!verifyPassword(body.password,secret))return sendHtml(response,401,shell("Password required",`<h1>Incorrect password</h1><div class="error">The password did not match.</div><a class="btn" href="/r/${encodeURIComponent(shortId)}" style="display:block;text-align:center;text-decoration:none">Try again</a>`));}
      if(needsLead){if(body.consent!=="yes"||!String(body.name||"").trim()||!String(body.phone||"").trim())return sendHtml(response,400,shell("Details required","<h1>Missing details</h1><p>Name, phone and consent are required.</p>"));await recordLead(db,link,shortId,body,request);}
    }else if(request.method!=="GET"&&request.method!=="HEAD")return response.status(405).end();
    await recordScan(db,shortId,link,context,request);return response.redirect(302,destination);
  }catch(error){const status=error.code==="SERVER_NOT_CONFIGURED"?503:500;return sendHtml(response,status,shell("Service unavailable",`<h1>QR service unavailable</h1><p>${htmlEsc(error.code==="SERVER_NOT_CONFIGURED"?"The secure redirect service has not been configured on this deployment yet.":"Please try again shortly.")}</p>`));}
}
