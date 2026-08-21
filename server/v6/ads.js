import {clean,safeUrl} from "./security.js";
export function normalizeCampaign(input,id,ownerId){
  const now=Date.now();
  return {id,ownerId,name:clean(input.name||"Campaign",120),status:["draft","active","paused","ended"].includes(input.status)?input.status:"draft",
    profileId:clean(input.profileId,100),creative:{title:clean(input.creative?.title,120),description:clean(input.creative?.description,300),image:safeUrl(input.creative?.image),cta:clean(input.creative?.cta||"View profile",40)},
    targeting:{countries:(input.targeting?.countries||[]).slice(0,30).map(x=>clean(x,8).toUpperCase()),categories:(input.targeting?.categories||[]).slice(0,30).map(x=>clean(x,80)),cities:(input.targeting?.cities||[]).slice(0,50).map(x=>clean(x,100))},
    budget:{daily:Math.max(0,Number(input.budget?.daily||0)),total:Math.max(0,Number(input.budget?.total||0)),spent:Math.max(0,Number(input.budget?.spent||0)),currency:"INR"},
    schedule:{startAt:Number(input.schedule?.startAt||now),endAt:Number(input.schedule?.endAt||0)},frequencyCap:Math.max(1,Math.min(20,Number(input.frequencyCap||3))),
    variants:(input.variants||[]).slice(0,4).map((v,i)=>({id:clean(v.id||`v${i+1}`,20),title:clean(v.title,120),description:clean(v.description,300),weight:Math.max(1,Number(v.weight||1))})),
    metrics:{impressions:Number(input.metrics?.impressions||0),clicks:Number(input.metrics?.clicks||0),conversions:Number(input.metrics?.conversions||0)},createdAt:Number(input.createdAt||now),updatedAt:now};
}
export function campaignEligible(c,viewer={}){
  if(c.status!=="active")return false;const now=Date.now();if(c.schedule?.startAt&&now<c.schedule.startAt)return false;if(c.schedule?.endAt&&now>c.schedule.endAt)return false;if(c.budget?.total>0&&c.budget.spent>=c.budget.total)return false;
  if(c.targeting?.countries?.length&&viewer.country&&!c.targeting.countries.includes(String(viewer.country).toUpperCase()))return false;
  if(c.targeting?.categories?.length&&viewer.category&&!c.targeting.categories.includes(viewer.category))return false;
  if(c.targeting?.cities?.length&&viewer.city&&!c.targeting.cities.map(x=>x.toLowerCase()).includes(String(viewer.city).toLowerCase()))return false;return true;
}
