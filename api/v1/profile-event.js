import {getAdmin} from "../_admin.js";
import {json,fail,method,parseBody,clean,privacyVisitorHash} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    method(request,"POST");const body=parseBody(request),slug=clean(body.slug,80),eventType=clean(body.eventType,30);
    if(!slug||!["view","call","whatsapp","directions","website","booking","payment","social","product","service"].includes(eventType))throw Object.assign(new Error("Invalid profile event."),{status:400,code:"INVALID_EVENT"});
    const {db}=getAdmin(),profile=(await db.ref(`qrajn/publicBusinessProfiles/${slug}`).get()).val();if(!profile||profile.published===false)return json(response,404,{ok:false,error:"Profile not found."});
    const ref=db.ref(`qrajn/businessEvents/${profile.ownerId}`).push();
    const country=String(request.headers["x-vercel-ip-country"]||"").toUpperCase(),region=String(request.headers["x-vercel-ip-country-region"]||""),city=decodeURIComponent(String(request.headers["x-vercel-ip-city"]||""));
    await ref.set({id:ref.key,profileId:profile.id,profileSlug:profile.slug,eventType,scannerUid:"server-v6",visitorHash:privacyVisitorHash(request),timestamp:Date.now(),device:"Web",browser:"Public profile",os:"",language:String(request.headers["accept-language"]||"").split(",")[0].slice(0,30),timezone:"",referrer:String(request.headers.referer||"").slice(0,500),location:city||region||country||"Not collected",country,region,city,meta:{source:clean(body.source,80),productId:clean(body.productId,60)}});
    return json(response,200,{ok:true});
  }catch(e){return fail(e,response);}
}
