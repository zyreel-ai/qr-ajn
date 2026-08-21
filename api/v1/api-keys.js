import {context,audit,requireFeature,usageSnapshot,requireLimit} from "../../server/v6/platform.js";
import {issueApiKey} from "../../server/v6/api-keys.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const m=method(request,"GET","POST","DELETE"),ctx=await context(request);requireFeature(ctx,"api","API keys require Business or Enterprise.");
    const base=`qrajn/v6/apiKeys/${ctx.uid}`;
    if(m==="GET"){const snap=await ctx.db.ref(base).get();const keys=Object.values(snap.val()||{}).map(({hash,...safe})=>safe);return json(response,200,{ok:true,keys});}
    const body=parseBody(request);
    if(m==="POST"){
      const {raw,record}=issueApiKey(body.name,body.scopes||["profiles:read","qrs:read","analytics:read"]);
      await ctx.db.ref(`${base}/${record.id}`).set(record);await ctx.db.ref(`qrajn/v6/apiKeyIndex/${record.hash}`).set({ownerId:ctx.uid,keyId:record.id});
      await audit(ctx.db,ctx.uid,"api-key.created",{entityType:"apiKey",entityId:record.id,summary:record.name});
      const {hash,...safe}=record;return json(response,201,{ok:true,key:raw,record:safe,warning:"This key is shown only once."});
    }
    const id=clean(body.id,100),snap=await ctx.db.ref(`${base}/${id}`).get();if(!snap.exists())return json(response,404,{ok:false,error:"API key not found.",code:"NOT_FOUND"});
    const rec=snap.val();await ctx.db.ref(`${base}/${id}`).remove();if(rec.hash)await ctx.db.ref(`qrajn/v6/apiKeyIndex/${rec.hash}`).remove();await audit(ctx.db,ctx.uid,"api-key.revoked",{entityType:"apiKey",entityId:id});return json(response,200,{ok:true});
  }catch(e){return fail(e,response);}
}
