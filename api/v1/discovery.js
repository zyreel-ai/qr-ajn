import {getAdmin} from "../_admin.js";
import {campaignEligible} from "../../server/v6/ads.js";
import {json,fail,method,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    method(request,"GET");const {db}=getAdmin(),category=clean(request.query?.category,80),country=clean(request.query?.country,8).toUpperCase(),city=clean(request.query?.city,100);
    const profiles=Object.values((await db.ref("qrajn/publicBusinessProfiles").limitToFirst(300).get()).val()||{}).filter(p=>p?.published!==false&&(!category||String(p.type||"").toLowerCase().includes(category.toLowerCase()))).slice(0,100);
    const adsRoot=(await db.ref("qrajn/v6/ads").get()).val()||{},ads=[];
    for(const owner of Object.values(adsRoot))for(const c of Object.values(owner||{}))if(campaignEligible(c,{category,country,city}))ads.push({...c,sponsored:true});
    return json(response,200,{ok:true,profiles:profiles.map(p=>({id:p.id,slug:p.slug,name:p.name,type:p.type,tagline:p.tagline,logo:p.logo,address:p.address})),sponsored:ads.slice(0,8).map(c=>({id:c.id,profileId:c.profileId,creative:c.creative,label:"Sponsored"}))});
  }catch(e){return fail(e,response);}
}
