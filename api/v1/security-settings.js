import {context,audit,requireWrite} from "../../server/v6/platform.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const m=method(request,"GET","PUT"),ctx=await context(request),base=`qrajn/v6/security/${ctx.uid}`;
    if(m==="GET")return json(response,200,{ok:true,settings:(await ctx.db.ref(base).get()).val()||{requireMfa:false,sessionPolicy:"standard",allowedDomains:[]}});
    requireWrite(ctx);const body=parseBody(request),settings={requireMfa:!!body.requireMfa,sessionPolicy:["standard","strict"].includes(body.sessionPolicy)?body.sessionPolicy:"standard",allowedDomains:(body.allowedDomains||[]).slice(0,30).map(x=>clean(x,120).toLowerCase()),updatedAt:Date.now()};
    await ctx.db.ref(base).set(settings);await audit(ctx.db,ctx.uid,"security.settings.updated",{entityType:"security"});return json(response,200,{ok:true,settings});
  }catch(e){return fail(e,response);}
}
