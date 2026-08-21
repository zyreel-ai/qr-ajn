import {getAdmin} from "../_admin.js";
import {privacyVisitorHash,json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    method(request,"POST");const {db}=getAdmin(),body=parseBody(request),ownerId=clean(body.ownerId,128),campaignId=clean(body.campaignId,100),type=["impression","click","conversion"].includes(body.type)?body.type:"impression";
    if(!ownerId||!campaignId)throw Object.assign(new Error("Campaign identifiers required."),{status:400,code:"INVALID_CAMPAIGN"});
    const cRef=db.ref(`qrajn/v6/ads/${ownerId}/${campaignId}`),snap=await cRef.get();if(!snap.exists())return json(response,404,{ok:false,error:"Campaign not found."});
    const visitor=privacyVisitorHash(request,"day"),freqRef=db.ref(`qrajn/v6/adFrequency/${campaignId}/${visitor}`),freq=Number((await freqRef.get()).val()||0);
    if(type==="impression"&&freq>=Number(snap.val().frequencyCap||3))return json(response,200,{ok:true,capped:true});
    if(type==="impression")await freqRef.transaction(v=>Number(v||0)+1);
    await cRef.child(`metrics/${type==="impression"?"impressions":type==="click"?"clicks":"conversions"}`).transaction(v=>Number(v||0)+1);
    return json(response,200,{ok:true});
  }catch(e){return fail(e,response);}
}
