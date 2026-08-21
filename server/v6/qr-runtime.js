import crypto from "node:crypto";
import {ensureAccount,incrementUsage,rateLimit} from "./platform.js";
import {planConfig,limit} from "./plans.js";
import {requestIp,hmac} from "./security.js";

function privacyKey(request){return hmac(`${requestIp(request)}|${String(request.headers["user-agent"]||"").slice(0,200)}|${new Date().toISOString().slice(0,10)}`).slice(0,32);}
function localParts(timeZone){
  try{const f=new Intl.DateTimeFormat("en-GB",{timeZone,weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});const parts=Object.fromEntries(f.formatToParts(new Date()).map(p=>[p.type,p.value]));return {weekday:parts.weekday,hour:Number(parts.hour||0),minute:Number(parts.minute||0)};}
  catch{return {weekday:"",hour:new Date().getUTCHours(),minute:new Date().getUTCMinutes()};}
}
function matchRule(rule,ctx,link){
  const field=String(rule.field||""),op=String(rule.operator||"equals"),value=String(rule.value??"");let actual="";
  if(field==="country")actual=ctx.country||"";
  else if(field==="region")actual=ctx.region||"";
  else if(field==="city")actual=ctx.city||"";
  else if(field==="language")actual=(ctx.language||"").split("-")[0];
  else if(field==="device")actual=String(ctx.device||"").toLowerCase();
  else if(field==="browser")actual=ctx.browser||"";
  else if(field==="referrer")actual=ctx.referrer||"";
  else if(field==="day"){const p=localParts(link.v6Routing?.timezone||link.schedule?.timezone||"UTC");actual=p.weekday;}
  else if(field==="time"){
    const p=localParts(link.v6Routing?.timezone||link.schedule?.timezone||"UTC");actual=p.hour*60+p.minute;
    const [a,b]=value.split("-").map(s=>{const [h,m]=s.trim().split(":").map(Number);return h*60+(m||0)});
    return Number.isFinite(a)&&Number.isFinite(b)&&(a<=b?(actual>=a&&actual<=b):(actual>=a||actual<=b));
  }else return false;
  const A=String(actual).toLowerCase(),V=value.toLowerCase();
  if(op==="equals")return A===V;if(op==="contains")return A.includes(V);if(op==="startsWith")return A.startsWith(V);if(op==="in")return V.split(",").map(x=>x.trim()).includes(A);if(op==="notEquals")return A!==V;return false;
}
function chooseWeighted(rules,seed){
  const weighted=rules.filter(r=>Number(r.weight||0)>0&&r.destination);if(!weighted.length)return "";
  const total=weighted.reduce((a,r)=>a+Number(r.weight||0),0),h=crypto.createHash("sha256").update(seed).digest().readUInt32BE(0)%total;
  let x=h;for(const r of weighted){x-=Number(r.weight);if(x<0)return r.destination;}return weighted.at(-1).destination;
}
async function reachable(url){
  if(!url)return false;const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),900);
  try{const r=await fetch(url,{method:"HEAD",redirect:"manual",signal:ac.signal});return r.status>0&&r.status<500;}catch{return false;}finally{clearTimeout(timer);}
}
export async function v6PreflightScan(db,link,shortId,request,context){
  const account=await ensureAccount(db,link.ownerId,{}),plan=planConfig(account.plan),visitor=privacyKey(request);let velocity=0;
  try{const r=await rateLimit(db,`scan:${link.ownerId}:${visitor}`,{limit:90,windowMs:60000});velocity=r.count;}catch{return {recordAnalytics:false,allowRedirect:true,reason:"velocity-limit",fraudSignal:true,account,plan,visitor};}
  const month=new Date().toISOString().slice(0,7),usage=Number((await db.ref(`qrajn/v6/usage/${link.ownerId}/${month}/scans`).get()).val()||0),base=limit(account.plan,"monthlyScans"),extra=Number(account.addOns?.extraScans||0),max=base===-1?-1:base+extra,soft=max!==-1&&usage>=Math.floor(max*.9),hard=max!==-1&&usage>=Math.floor(max*1.2);
  return {recordAnalytics:!hard&&!context.isBot,allowRedirect:true,softLimit:soft,hardLimit:hard,fraudSignal:velocity>45,account,plan,visitor};
}
export async function v6SelectDestination(link,context,fallback){
  const cfg=link.v6Routing||{};let destination="";
  if(cfg.enabled&&Array.isArray(cfg.rules)){
    const ordered=[...cfg.rules].filter(r=>r&&r.enabled!==false).sort((a,b)=>Number(a.priority||100)-Number(b.priority||100));
    for(const r of ordered){if(r.destination&&matchRule(r,context,link)){destination=r.destination;break;}}
    if(!destination&&cfg.abEnabled)destination=chooseWeighted(ordered,`${context.country}|${context.device}|${new Date().toISOString().slice(0,10)}`);
  }
  destination=destination||fallback();
  if(cfg.healthCheck===true&&cfg.offlineDestination&&!(await reachable(destination)))destination=cfg.offlineDestination;
  return destination;
}
export async function v6AfterScan(db,link,preflight,meta={}){
  if(preflight.recordAnalytics)await incrementUsage(db,link.ownerId,"scans",1);
  if(preflight.softLimit)await db.ref(`qrajn/v6/alerts/${link.ownerId}/scanQuota`).set({type:"quota",level:preflight.hardLimit?"critical":"warning",at:Date.now(),message:"Monthly scan usage is near or above the included plan allowance."});
  if(preflight.fraudSignal){const ref=db.ref(`qrajn/v6/fraudSignals/${link.ownerId}`).push();await ref.set({id:ref.key,qrId:link.qrId,shortId:link.shortId||"",at:Date.now(),kind:"scan-velocity",visitor:preflight.visitor||"",meta});}
}
