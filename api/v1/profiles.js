import {context,requireWrite} from "../../server/v6/platform.js";
import {saveProfileServer,softDeleteProfileServer} from "../../server/v6/profile-service.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const m=method(request,"GET","POST","PUT","DELETE"),ctx=await context(request);
    if(m==="GET"){const snap=await ctx.db.ref(`qrajn/users/${ctx.uid}/businessProfiles`).get();return json(response,200,{ok:true,profiles:Object.values(snap.val()||{})});}
    requireWrite(ctx);const body=parseBody(request),id=clean(body.id||request.query?.id,100);
    if(m==="POST"){const profile=await saveProfileServer(ctx,body,"");return json(response,201,{ok:true,profile});}
    if(!id)throw Object.assign(new Error("Profile id is required."),{status:400,code:"PROFILE_ID_REQUIRED"});
    if(m==="PUT"){const profile=await saveProfileServer(ctx,body,id);return json(response,200,{ok:true,profile});}
    await softDeleteProfileServer(ctx,id);return json(response,200,{ok:true,recoverableDays:30});
  }catch(e){return fail(e,response);}
}
