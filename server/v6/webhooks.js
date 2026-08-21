import {hmac,clean,safeUrl} from "./security.js";
import {enqueue,retryDelay} from "./jobs.js";
export async function deliverWebhook(db,hook,event,payload,attempt=0){
  const body=JSON.stringify({id:`evt_${Date.now()}`,event,createdAt:Date.now(),data:payload}),signature=hmac(body,hook.secret);
  try{
    const ac=new AbortController(),t=setTimeout(()=>ac.abort(),8000);
    const r=await fetch(hook.url,{method:"POST",headers:{"content-type":"application/json","x-qrajn-event":event,"x-qrajn-signature":signature},body,signal:ac.signal});
    clearTimeout(t);if(!r.ok)throw new Error(`Webhook returned HTTP ${r.status}`);return {ok:true,status:r.status};
  }catch(error){
    if(attempt<6)await enqueue(db,hook.ownerId,"webhook.retry",{hookId:hook.id,event,payload},Date.now()+retryDelay(attempt+1),attempt+1);
    return {ok:false,error:String(error.message||error)};
  }
}
export function normalizeWebhook(input,id,ownerId){
  const url=safeUrl(input.url);if(!url)throw Object.assign(new Error("Enter a valid HTTPS webhook URL."),{status:400,code:"INVALID_URL"});
  return {id,ownerId,url,events:(input.events||[]).slice(0,20).map(x=>clean(x,60)),active:input.active!==false,secret:input.secret||"",createdAt:Number(input.createdAt||Date.now()),updatedAt:Date.now()};
}
