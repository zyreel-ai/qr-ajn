import {context,requireFeature,audit} from "../../server/v6/platform.js";
import {runAi} from "../../server/v6/ai.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    method(request,"POST");const ctx=await context(request);requireFeature(ctx,"ai","AI tools require a paid plan with AI access.");
    const body=parseBody(request),task=clean(body.task,60),result=await runAi(task,body.input||{});
    await audit(ctx.db,ctx.uid,"ai.used",{entityType:"ai",summary:task});return json(response,200,{ok:true,...result});
  }catch(e){return fail(e,response);}
}
