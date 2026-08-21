import {clean,safeUrl} from "./security.js";
export const BLOCK_TYPES=["hero","about","hours","menu","gallery","booking","priceList","form","map","social","video","testimonials","faq","team","portfolio","products","services","offers","contact","payment","custom"];
export function normalizeBlocks(blocks=[]){
  return blocks.slice(0,80).map((b,i)=>({
    id:clean(b.id||`block_${i+1}`,60),type:BLOCK_TYPES.includes(b.type)?b.type:"custom",title:clean(b.title,120),
    visible:b.visible!==false,order:i,content:typeof b.content==="string"?clean(b.content,12000):b.content,
    url:safeUrl(b.url),settings:typeof b.settings==="object"&&b.settings?b.settings:{}
  }));
}
