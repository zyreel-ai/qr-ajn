import {context,audit,requireLimit,randomToken} from "../../server/v6/platform.js";
import {normalizeCampaign} from "../../server/v6/ads.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const m=method(request,"GET","POST","PATCH","DELETE"),ctx=await context(request),base=`qrajn/v6/ads/${ctx.uid}`;
    if(m==="GET"){const snap=await ctx.db.ref(base).get();return json(response,200,{ok:true,campaigns:Object.values(snap.val()||{}).sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0))});}
    const body=parseBody(request);
    if(m==="POST"){
      const snap=await ctx.db.ref(base).get();requireLimit(ctx,"adCampaigns",snap.numChildren(),1);
      const id=`ad_${randomToken(8)}`,campaign=normalizeCampaign(body,id,ctx.uid);await ctx.db.ref(`${base}/${id}`).set(campaign);await audit(ctx.db,ctx.uid,"ad.created",{entityType:"adCampaign",entityId:id,summary:campaign.name});return json(response,201,{ok:true,campaign});
    }
    const id=clean(body.id,100),snap=await ctx.db.ref(`${base}/${id}`).get();if(!snap.exists())return json(response,404,{ok:false,error:"Campaign not found.",code:"NOT_FOUND"});
    if(m==="PATCH"){const campaign=normalizeCampaign({...snap.val(),...body},id,ctx.uid);await ctx.db.ref(`${base}/${id}`).set(campaign);await audit(ctx.db,ctx.uid,"ad.updated",{entityType:"adCampaign",entityId:id,summary:campaign.status});return json(response,200,{ok:true,campaign});}
    await ctx.db.ref(`${base}/${id}`).remove();await audit(ctx.db,ctx.uid,"ad.deleted",{entityType:"adCampaign",entityId:id});return json(response,200,{ok:true});
  }catch(e){return fail(e,response);}
}
