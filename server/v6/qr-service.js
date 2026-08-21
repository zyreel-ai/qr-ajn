import crypto from "node:crypto";
import {clean,safeUrl} from "./security.js";
import {audit,usageSnapshot,requireLimit} from "./platform.js";

const alphabet="abcdefghjkmnpqrstuvwxyz23456789";
function id(prefix="qr"){return `${prefix}_${crypto.randomUUID().replaceAll("-","").slice(0,18)}`;}
function randomShort(){const b=crypto.randomBytes(9);return Array.from(b,x=>alphabet[x%alphabet.length]).join("");}
async function allocateShort(db){for(let i=0;i<12;i++){const s=randomShort();if(!(await db.ref(`qrajn/publicLinks/${s}`).get()).exists())return s;}throw new Error("Could not allocate a unique QR short link.");}
function list(value,max=20){return Array.isArray(value)?value.slice(0,max):[];}
function normalizeAdvanced(input={}){
  const expiry=input.expiry||{},schedule=input.schedule||{},lead=input.leadCapture||{},target=input.smartTargeting||{},utm=input.utm||{},domain=input.customDomain||{};
  return {
    labels:String(input.labels||"").split(",").concat(Array.isArray(input.labels)?input.labels:[]).map(x=>clean(x,40)).filter(Boolean).slice(0,20),
    expiry:{enabled:!!expiry.enabled,at:clean(expiry.at,40),maxScans:Math.max(0,Number(expiry.maxScans||0)),expiredDestination:safeUrl(expiry.expiredDestination)},
    schedule:{enabled:!!schedule.enabled,startAt:clean(schedule.startAt,40),endAt:clean(schedule.endAt,40),timezone:clean(schedule.timezone||"Asia/Kolkata",80),outsideDestination:safeUrl(schedule.outsideDestination)},
    passwordProtected:!!input.passwordProtected,
    leadCapture:{enabled:!!lead.enabled,title:clean(lead.title||"Send an enquiry",120),description:clean(lead.description,500),fields:list(lead.fields,10).map(x=>clean(x,20)),consentText:clean(lead.consentText||"I agree to share these details with this business.",300)},
    smartTargeting:{enabled:!!target.enabled,fallbackDestination:safeUrl(target.fallbackDestination),rules:list(target.rules,30).map(r=>({field:clean(r?.field,30),operator:clean(r?.operator||"equals",20),value:clean(r?.value,120),destination:safeUrl(r?.destination)})).filter(r=>r.field&&r.destination)},
    utm:{enabled:!!utm.enabled,source:clean(utm.source,120),medium:clean(utm.medium,120),campaign:clean(utm.campaign,120),term:clean(utm.term,120),content:clean(utm.content,120)},
    customDomain:{host:clean(domain.host,200).toLowerCase().replace(/^https?:\/\//,"").replace(/\/$/,""),verificationToken:clean(domain.verificationToken,100),verified:!!domain.verified}
  };
}
function normalizeQr(input,current={}){
  const dynamic=input.is_dynamic!==undefined?input.is_dynamic===true:current.is_dynamic!==false,advanced=normalizeAdvanced({...current,...input});
  const content=String(input.content??current.content??"").slice(0,10000),destination=dynamic?safeUrl(input.destination_url??input.destination??current.destination_url??content):"";
  if(dynamic&&!destination)throw Object.assign(new Error("Enter a valid http:// or https:// destination URL."),{status:400,code:"INVALID_DESTINATION"});
  return {...current,id:current.id||id(),name:clean(input.name??current.name??"Untitled QR",100),type:clean(input.type??current.type??"url",24),content,destination_url:destination,is_dynamic:dynamic,is_active:input.is_active!==undefined?input.is_active!==false:current.is_active!==false,archived:!!(input.archived??current.archived),category:clean(input.category??current.category,80),design:typeof (input.design??current.design)==="object"?(input.design??current.design):{},...advanced,updated_at:new Date().toISOString(),created_at:current.created_at||new Date().toISOString()};
}
function publicLink(qr,uid){
  return {shortId:qr.short_id,ownerId:uid,qrId:qr.id,destination:qr.destination_url,active:qr.is_active!==false,branding:qr.design||{},labels:qr.labels||[],expiry:qr.expiry||{},schedule:qr.schedule||{},passwordProtected:!!qr.passwordProtected,leadCapture:qr.leadCapture||{},smartTargeting:qr.smartTargeting||{},utm:qr.utm||{},customDomain:qr.customDomain||{},v6Routing:qr.v6Routing||{},scanCount:Number(qr.scanCount||0),createdAt:Date.parse(qr.created_at)||Date.now(),updatedAt:Date.now()};
}
export async function createQrServer(ctx,input){
  const usage=await usageSnapshot(ctx.db,ctx.uid);requireLimit(ctx,"qrs",usage.qrs,1);
  const qr=normalizeQr(input,{});if(qr.is_dynamic)qr.short_id=await allocateShort(ctx.db);else qr.short_id="";
  const updates={[`qrajn/users/${ctx.uid}/qrs/${qr.id}`]:qr};if(qr.is_dynamic)updates[`qrajn/publicLinks/${qr.short_id}`]=publicLink(qr,ctx.uid);
  await ctx.db.ref().update(updates);await audit(ctx.db,ctx.uid,"qr.created",{entityType:"qr",entityId:qr.id,summary:qr.name});return qr;
}
export async function updateQrServer(ctx,qrId,patch){
  const ref=ctx.db.ref(`qrajn/users/${ctx.uid}/qrs/${qrId}`),snap=await ref.get();if(!snap.exists())throw Object.assign(new Error("QR code not found."),{status:404,code:"NOT_FOUND"});
  const current=snap.val(),next=normalizeQr(patch,current);next.id=qrId;next.short_id=current.short_id||next.short_id;
  const updates={[`qrajn/users/${ctx.uid}/qrs/${qrId}`]:next};if(next.is_dynamic&&next.short_id)updates[`qrajn/publicLinks/${next.short_id}`]=publicLink(next,ctx.uid);
  await ctx.db.ref().update(updates);await audit(ctx.db,ctx.uid,"qr.updated",{entityType:"qr",entityId:qrId,summary:next.name});return next;
}
export async function softDeleteQrServer(ctx,qrId){
  const ref=ctx.db.ref(`qrajn/users/${ctx.uid}/qrs/${qrId}`),snap=await ref.get();if(!snap.exists())return false;
  const qr=snap.val(),events=(await ctx.db.ref(`qrajn/scanEvents/${ctx.uid}`).get()).val()||{},related=Object.fromEntries(Object.entries(events).filter(([,e])=>e?.qrId===qrId));
  const trash={kind:"qr",id:qrId,data:qr,relatedEvents:related,deletedAt:Date.now(),purgeAt:Date.now()+30*86400000};
  const updates={[`qrajn/v6/trash/${ctx.uid}/qrs/${qrId}`]:trash,[`qrajn/users/${ctx.uid}/qrs/${qrId}`]:null};if(qr.short_id)updates[`qrajn/publicLinks/${qr.short_id}`]=null;
  await ctx.db.ref().update(updates);await audit(ctx.db,ctx.uid,"qr.soft-deleted",{entityType:"qr",entityId:qrId,summary:"Recoverable for 30 days"});return true;
}
export {publicLink,normalizeQr};
