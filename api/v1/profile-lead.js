import {getAdmin} from "../_admin.js";
import {json,fail,method,parseBody,clean,safeEmail,safePhone,privacyVisitorHash,sha256} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    method(request,"POST");const body=parseBody(request),slug=clean(body.slug,80),name=clean(body.name,100),phone=safePhone(body.phone),email=safeEmail(body.email),message=clean(body.message,1200);
    if(body.consent!==true||!slug||!name||!phone)throw Object.assign(new Error("Name, phone and consent are required."),{status:400,code:"LEAD_REQUIRED"});
    const {db}=getAdmin(),profile=(await db.ref(`qrajn/publicBusinessProfiles/${slug}`).get()).val();if(!profile||profile.published===false)return json(response,404,{ok:false,error:"Profile not found."});
    const key=sha256(`${phone.replace(/\s/g,"")}|${email}`).slice(0,40),idx=await db.ref(`qrajn/v6/crm/${profile.ownerId}/publicDedupe/${key}`).get();
    if(idx.exists())return json(response,200,{ok:true,deduplicated:true,id:idx.val()});
    const ref=db.ref(`qrajn/businessLeads/${profile.ownerId}`).push(),lead={id:ref.key,profileId:profile.id,profileSlug:profile.slug,scannerUid:"server-v6",visitorHash:privacyVisitorHash(request),name,phone,email,message,productId:clean(body.productId,60),consent:true,createdAt:Date.now()};
    await ref.set(lead);await db.ref(`qrajn/v6/crm/${profile.ownerId}/publicDedupe/${key}`).set(ref.key);
    return json(response,201,{ok:true,id:ref.key});
  }catch(e){return fail(e,response);}
}
