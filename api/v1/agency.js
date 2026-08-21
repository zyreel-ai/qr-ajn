import {context,audit,requireFeature,randomToken} from "../../server/v6/platform.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const m=method(request,"GET","POST","DELETE"),ctx=await context(request);requireFeature(ctx,"agency","Agency workspaces require Business or Enterprise.");
    const base=`qrajn/v6/agencies/${ctx.uid}/clients`;
    if(m==="GET")return json(response,200,{ok:true,clients:Object.values((await ctx.db.ref(base).get()).val()||{})});
    const body=parseBody(request);
    if(m==="POST"){const id=`client_${randomToken(8)}`,client={id,name:clean(body.name||"Client",120),contactEmail:clean(body.contactEmail,200),status:"active",createdAt:Date.now(),updatedAt:Date.now()};await ctx.db.ref(`${base}/${id}`).set(client);await audit(ctx.db,ctx.uid,"agency.client.created",{entityType:"agencyClient",entityId:id,summary:client.name});return json(response,201,{ok:true,client});}
    const id=clean(body.id,100);await ctx.db.ref(`${base}/${id}`).remove();await audit(ctx.db,ctx.uid,"agency.client.deleted",{entityType:"agencyClient",entityId:id});return json(response,200,{ok:true});
  }catch(e){return fail(e,response);}
}
