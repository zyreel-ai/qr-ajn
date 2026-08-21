import {context} from "../../server/v6/platform.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    method(request,"POST");const ctx=await context(request),body=parseBody(request),provider=clean(body.provider,40),lead=body.lead||{};
    if(provider==="hubspot"){
      if(!process.env.HUBSPOT_ACCESS_TOKEN)throw Object.assign(new Error("HubSpot is not configured."),{status:503,code:"CONFIGURATION_REQUIRED"});
      const properties={email:lead.email||"",phone:lead.phone||"",firstname:lead.name||"",message:lead.message||""};
      const r=await fetch("https://api.hubapi.com/crm/v3/objects/contacts",{method:"POST",headers:{authorization:`Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,"content-type":"application/json"},body:JSON.stringify({properties})}),j=await r.json();if(!r.ok)throw new Error(j?.message||"HubSpot sync failed.");return json(response,200,{ok:true,provider,id:j.id});
    }
    if(provider==="zoho"||provider==="salesforce")throw Object.assign(new Error(`${provider} adapter is installed but requires an account-specific OAuth token before live sync.`),{status:503,code:"CONFIGURATION_REQUIRED"});
    throw Object.assign(new Error("Unsupported CRM provider."),{status:400,code:"UNSUPPORTED_PROVIDER"});
  }catch(e){return fail(e,response);}
}
