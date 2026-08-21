import {randomToken,sha256,clean} from "./security.js";
export function issueApiKey(name,scopes=[]){
  const raw=`qrajn_${randomToken(32)}`;
  return {
    raw,
    record:{
      id:`key_${randomToken(10)}`,name:clean(name||"API key",80),
      prefix:raw.slice(0,14),hash:sha256(raw),
      scopes:scopes.slice(0,20).map(x=>clean(x,60)),
      active:true,createdAt:Date.now(),lastUsedAt:0
    }
  };
}
export async function verifyApiKey(db,raw){
  if(!raw||!raw.startsWith("qrajn_"))return null;
  const hash=sha256(raw),snap=await db.ref("qrajn/v6/apiKeyIndex/"+hash).get();
  if(!snap.exists())return null;
  const idx=snap.val(),keySnap=await db.ref(`qrajn/v6/apiKeys/${idx.ownerId}/${idx.keyId}`).get(),key=keySnap.val();
  if(!key?.active)return null;
  await db.ref(`qrajn/v6/apiKeys/${idx.ownerId}/${idx.keyId}/lastUsedAt`).set(Date.now());
  return {ownerId:idx.ownerId,key};
}
