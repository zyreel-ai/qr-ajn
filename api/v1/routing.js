import {context,audit} from "../../server/v6/platform.js";
import {json,fail,method,parseBody,clean,safeUrl} from "../../server/v6/security.js";
function normalize(input={}){
  return {
    enabled:input.enabled!==false,timezone:clean(input.timezone||"Asia/Kolkata",80),healthCheck:!!input.healthCheck,offlineDestination:safeUrl(input.offlineDestination),abEnabled:!!input.abEnabled,
    rules:(input.rules||[]).slice(0,50).map((r,i)=>({id:clean(r.id||`rule_${i+1}`,60),enabled:r.enabled!==false,priority:Math.max(1,Math.min(999,Number(r.priority||i+1))),field:clean(r.field,40),operator:clean(r.operator||"equals",30),value:clean(r.value,200),destination:safeUrl(r.destination),weight:Math.max(0,Math.min(100,Number(r.weight||0)))})).filter(r=>r.field&&r.destination)
  };
}
export default async function handler(request,response){
  try{
    const m=method(request,"GET","PUT"),ctx=await context(request),qrId=clean(request.query?.qrId||parseBody(request).qrId,100);
    if(!qrId)throw Object.assign(new Error("qrId is required."),{status:400,code:"QR_ID_REQUIRED"});
    const qr=await ctx.db.ref(`qrajn/users/${ctx.uid}/qrs/${qrId}`).get();if(!qr.exists())return json(response,404,{ok:false,error:"QR not found.",code:"NOT_FOUND"});
    const item=qr.val(),base=`qrajn/publicLinks/${item.short_id}`;
    if(m==="GET")return json(response,200,{ok:true,routing:(await ctx.db.ref(`${base}/v6Routing`).get()).val()||{}});
    const routing=normalize(parseBody(request));await ctx.db.ref(`${base}/v6Routing`).set(routing);await ctx.db.ref(`qrajn/users/${ctx.uid}/qrs/${qrId}/v6Routing`).set(routing);
    await audit(ctx.db,ctx.uid,"qr.routing.updated",{entityType:"qr",entityId:qrId,summary:`${routing.rules.length} rules`});return json(response,200,{ok:true,routing});
  }catch(e){return fail(e,response);}
}
