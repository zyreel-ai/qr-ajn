import {getAdmin} from "../_admin.js";
import {normalizeSlug,json,fail,method} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    method(request,"GET");const slug=normalizeSlug(request.query?.slug||"");if(!slug)return json(response,400,{ok:false,error:"slug required"});
    const {db}=getAdmin(),profileSnap=await db.ref(`qrajn/publicBusinessProfiles/${slug}`).get();if(!profileSnap.exists())return json(response,404,{ok:false,error:"Profile not found.",code:"NOT_FOUND"});
    const profile=profileSnap.val();if(profile.published===false)return json(response,404,{ok:false,error:"Profile not found.",code:"NOT_FOUND"});
    const blocks=(await db.ref(`qrajn/v6/profileBlocks/${profile.ownerId}/${profile.id}`).get()).val()||[];
    return json(response,200,{ok:true,profile:{id:profile.id,slug:profile.slug,name:profile.name,type:profile.type,branding:profile.branding},blocks:blocks.filter(b=>b.visible!==false)});
  }catch(e){return fail(e,response);}
}
