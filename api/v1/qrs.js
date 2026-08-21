import {context,requireWrite} from "../../server/v6/platform.js";
import {createQrServer,updateQrServer,softDeleteQrServer} from "../../server/v6/qr-service.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const m=method(request,"GET","POST","PATCH","DELETE"),ctx=await context(request);
    if(m==="GET"){const snap=await ctx.db.ref(`qrajn/users/${ctx.uid}/qrs`).get();return json(response,200,{ok:true,qrs:Object.values(snap.val()||{})});}
    requireWrite(ctx);const body=parseBody(request);
    if(m==="POST"){const qr=await createQrServer(ctx,body);return json(response,201,{ok:true,qr});}
    const id=clean(body.id||request.query?.id,100);if(!id)throw Object.assign(new Error("QR id is required."),{status:400,code:"QR_ID_REQUIRED"});
    if(m==="PATCH"){const qr=await updateQrServer(ctx,id,body);return json(response,200,{ok:true,qr});}
    await softDeleteQrServer(ctx,id);return json(response,200,{ok:true,recoverableDays:30});
  }catch(e){return fail(e,response);}
}
