import {context,requireFeature,audit} from "../../server/v6/platform.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    method(request,"POST");const ctx=await context(request);requireFeature(ctx,"customDomain","Custom domains require Growth or higher.");
    if(!process.env.VERCEL_TOKEN||!process.env.VERCEL_PROJECT_ID)throw Object.assign(new Error("Vercel custom-domain API is not configured."),{status:503,code:"CONFIGURATION_REQUIRED"});
    const host=clean(parseBody(request).host,200).toLowerCase().replace(/^https?:\/\//,"").replace(/\/$/,"");
    if(!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host))throw Object.assign(new Error("Enter a valid domain."),{status:400,code:"INVALID_DOMAIN"});
    const qs=process.env.VERCEL_TEAM_ID?`?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}`:"";
    const r=await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(process.env.VERCEL_PROJECT_ID)}/domains${qs}`,{method:"POST",headers:{authorization:`Bearer ${process.env.VERCEL_TOKEN}`,"content-type":"application/json"},body:JSON.stringify({name:host})}),j=await r.json();
    if(!r.ok)throw Object.assign(new Error(j?.error?.message||"Vercel domain attachment failed."),{status:r.status,code:"DOMAIN_PROVIDER_ERROR"});
    await audit(ctx.db,ctx.uid,"domain.attached",{entityType:"domain",entityId:host});return json(response,200,{ok:true,domain:j});
  }catch(e){return fail(e,response);}
}
