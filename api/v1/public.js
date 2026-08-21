import {getAdmin} from "../_admin.js";
import {verifyApiKey} from "../../server/v6/api-keys.js";
import {aggregateAnalytics} from "../../server/v6/analytics.js";
import {json,fail,method,clean} from "../../server/v6/security.js";
import {incrementUsage} from "../../server/v6/platform.js";
export default async function handler(request,response){
  try{
    method(request,"GET");const raw=String(request.headers.authorization||"").replace(/^Bearer\s+/i,""),{db}=getAdmin(),auth=await verifyApiKey(db,raw);
    if(!auth)throw Object.assign(new Error("Invalid API key."),{status:401,code:"INVALID_API_KEY"});
    const action=clean(request.query?.action||"qrs",40),scopeMap={qrs:"qrs:read",profiles:"profiles:read",analytics:"analytics:read"};
    if(scopeMap[action]&&!auth.key.scopes.includes(scopeMap[action]))throw Object.assign(new Error("API key scope does not allow this operation."),{status:403,code:"SCOPE_FORBIDDEN"});
    await incrementUsage(db,auth.ownerId,"apiRequests",1);
    if(action==="qrs"){const snap=await db.ref(`qrajn/users/${auth.ownerId}/qrs`).get();return json(response,200,{ok:true,data:Object.values(snap.val()||{})});}
    if(action==="profiles"){const snap=await db.ref(`qrajn/users/${auth.ownerId}/businessProfiles`).get();return json(response,200,{ok:true,data:Object.values(snap.val()||{})});}
    if(action==="analytics"){
      const [events,businessEvents,businessLeads,qrLeads]=await Promise.all([db.ref(`qrajn/scanEvents/${auth.ownerId}`).get(),db.ref(`qrajn/businessEvents/${auth.ownerId}`).get(),db.ref(`qrajn/businessLeads/${auth.ownerId}`).get(),db.ref(`qrajn/qrLeads/${auth.ownerId}`).get()]);
      return json(response,200,{ok:true,data:aggregateAnalytics({events:events.val(),businessEvents:businessEvents.val(),businessLeads:businessLeads.val(),qrLeads:qrLeads.val()},30)});
    }
    return json(response,400,{ok:false,error:"Unsupported API action.",code:"INVALID_ACTION"});
  }catch(e){return fail(e,response);}
}
