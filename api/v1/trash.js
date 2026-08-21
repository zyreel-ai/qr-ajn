import {context,requireWrite,audit} from "../../server/v6/platform.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const m=method(request,"GET","POST","DELETE"),ctx=await context(request),base=`qrajn/v6/trash/${ctx.uid}`;
    if(m==="GET"){
      const [q,p]=await Promise.all([ctx.db.ref(`${base}/qrs`).get(),ctx.db.ref(`${base}/profiles`).get()]);
      return json(response,200,{ok:true,qrs:Object.values(q.val()||{}),profiles:Object.values(p.val()||{})});
    }
    requireWrite(ctx);const body=parseBody(request),kind=body.kind==="profiles"?"profiles":"qrs",id=clean(body.id,100);
    const snap=await ctx.db.ref(`${base}/${kind}/${id}`).get();if(!snap.exists())return json(response,404,{ok:false,error:"Deleted resource not found.",code:"NOT_FOUND"});
    const item=snap.val();
    if(m==="POST"){
      if(Date.now()>Number(item.purgeAt||0))throw Object.assign(new Error("Recovery period has expired."),{status:410,code:"RECOVERY_EXPIRED"});
      const updates={[`${base}/${kind}/${id}`]:null};
      if(kind==="qrs"){
        updates[`qrajn/users/${ctx.uid}/qrs/${id}`]=item.data;
        if(item.data?.short_id)updates[`qrajn/publicLinks/${item.data.short_id}`]={shortId:item.data.short_id,ownerId:ctx.uid,qrId:id,destination:item.data.destination_url,active:item.data.is_active!==false,branding:item.data.design||{},labels:item.data.labels||[],expiry:item.data.expiry||{},schedule:item.data.schedule||{},passwordProtected:!!item.data.passwordProtected,leadCapture:item.data.leadCapture||{},smartTargeting:item.data.smartTargeting||{},utm:item.data.utm||{},customDomain:item.data.customDomain||{},v6Routing:item.data.v6Routing||{},scanCount:0,createdAt:Date.now(),updatedAt:Date.now()};
      }else{
        updates[`qrajn/users/${ctx.uid}/businessProfiles/${id}`]=item.data;
        if(item.data?.published!==false&&item.data?.slug)updates[`qrajn/publicBusinessProfiles/${item.data.slug}`]=item.data;
      }
      await ctx.db.ref().update(updates);await audit(ctx.db,ctx.uid,"trash.restored",{entityType:kind==="qrs"?"qr":"profile",entityId:id});return json(response,200,{ok:true});
    }
    await ctx.db.ref(`${base}/${kind}/${id}`).remove();await audit(ctx.db,ctx.uid,"trash.purged",{entityType:kind==="qrs"?"qr":"profile",entityId:id});return json(response,200,{ok:true,purged:true});
  }catch(e){return fail(e,response);}
}
