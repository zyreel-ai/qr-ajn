import {context} from "../../server/v6/platform.js";
import {json,fail,method} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{method(request,"GET");const ctx=await context(request),snap=await ctx.db.ref(`qrajn/v6/audit/${ctx.uid}`).limitToLast(Math.max(1,Math.min(500,Number(request.query?.limit||100)))).get();return json(response,200,{ok:true,events:Object.values(snap.val()||{}).sort((a,b)=>Number(b.at||0)-Number(a.at||0))});}
  catch(e){return fail(e,response);}
}
