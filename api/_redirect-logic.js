export function safeUrl(value){try{const u=new URL(String(value||""));return ["http:","https:"].includes(u.protocol)?u.toString():"";}catch{return "";}}
export function classifyDevice(ua=""){return /Android/i.test(ua)?"android":/iPhone|iPad|iPod/i.test(ua)?"ios":/Mobile/i.test(ua)?"mobile":"desktop";}
export function applyUtm(destination,utm={}){if(!utm?.enabled)return destination;const clean=safeUrl(destination);if(!clean)return "";const u=new URL(clean);for(const [key,value] of [["utm_source",utm.source],["utm_medium",utm.medium],["utm_campaign",utm.campaign],["utm_term",utm.term],["utm_content",utm.content]])if(value)u.searchParams.set(key,String(value).slice(0,120));return u.toString();}
export function evaluateAvailability(link,now=Date.now()){
  if(!link||link.active===false)return {ok:false,reason:"inactive",fallback:""};
  const expiry=link.expiry||{};
  if(expiry.enabled){if(expiry.at&&new Date(expiry.at).getTime()<=now)return {ok:false,reason:"expired",fallback:safeUrl(expiry.expiredDestination)};if(Number(expiry.maxScans||0)>0&&Number(link.scanCount||0)>=Number(expiry.maxScans))return {ok:false,reason:"scan-limit",fallback:safeUrl(expiry.expiredDestination)};}
  const schedule=link.schedule||{};
  if(schedule.enabled){const start=schedule.startAt?new Date(schedule.startAt).getTime():0,end=schedule.endAt?new Date(schedule.endAt).getTime():Infinity;if(now<start||now>end)return {ok:false,reason:"outside-schedule",fallback:safeUrl(schedule.outsideDestination)};}
  return {ok:true,reason:"ok",fallback:""};
}
export function selectDestination(link,context={}){
  let destination=safeUrl(link.destination);const targeting=link.smartTargeting||{};if(targeting.enabled){const device=String(context.device||"").toLowerCase(),country=String(context.country||"").toUpperCase(),language=String(context.language||"").toLowerCase();const rules=Array.isArray(targeting.rules)?targeting.rules:[];const matches=rules.find(r=>r.field===`device:${device}`)||rules.find(r=>r.field==="country"&&String(r.value||"").toUpperCase()===country)||rules.find(r=>r.field==="language"&&language.startsWith(String(r.value||"").toLowerCase()));if(matches?.destination)destination=safeUrl(matches.destination);else if(targeting.fallbackDestination)destination=safeUrl(targeting.fallbackDestination);}return applyUtm(destination,link.utm||{});
}
