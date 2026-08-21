const local=new Map();
const configured=()=>Boolean(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN);
function localGet(key){const x=local.get(key);if(!x)return null;if(x.exp<Date.now()){local.delete(key);return null;}return x.value;}
export async function cacheGet(key){
  if(configured()){try{const r=await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`,{headers:{authorization:`Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`}}),j=await r.json();if(j?.result)return JSON.parse(j.result);}catch{}}
  return localGet(key);
}
export async function cacheSet(key,value,ttl=60){
  local.set(key,{value,exp:Date.now()+ttl*1000});
  if(configured()){try{await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}/ex/${ttl}`,{headers:{authorization:`Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`}});}catch{}}
}
export async function cacheDel(key){local.delete(key);}
