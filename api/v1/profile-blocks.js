import {context,audit} from "../../server/v6/platform.js";
import {normalizeBlocks,BLOCK_TYPES} from "../../server/v6/blocks.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const m=method(request,"GET","PUT"),ctx=await context(request),profileId=clean(request.query?.profileId||parseBody(request).profileId,100);
    if(!profileId)throw Object.assign(new Error("profileId is required."),{status:400,code:"PROFILE_ID_REQUIRED"});
    const profile=await ctx.db.ref(`qrajn/users/${ctx.uid}/businessProfiles/${profileId}`).get();if(!profile.exists())return json(response,404,{ok:false,error:"Profile not found.",code:"NOT_FOUND"});
    const base=`qrajn/v6/profileBlocks/${ctx.uid}/${profileId}`;
    if(m==="GET"){const snap=await ctx.db.ref(base).get();return json(response,200,{ok:true,blocks:snap.val()||[],types:BLOCK_TYPES});}
    const body=parseBody(request),blocks=normalizeBlocks(body.blocks||[]);await ctx.db.ref(base).set(blocks);
    await audit(ctx.db,ctx.uid,"profile.blocks.updated",{entityType:"profile",entityId:profileId,summary:`${blocks.length} blocks saved`});
    return json(response,200,{ok:true,blocks});
  }catch(e){return fail(e,response);}
}
