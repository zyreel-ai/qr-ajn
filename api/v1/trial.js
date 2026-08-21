import {context,audit} from "../../server/v6/platform.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
import {planRank} from "../../server/v6/plans.js";
export default async function handler(request,response){
  try{
    method(request,"POST");const ctx=await context(request),body=parseBody(request),plan=clean(body.plan||"growth",30);
    if(!["starter","growth","business"].includes(plan))throw Object.assign(new Error("Invalid trial plan."),{status:400,code:"INVALID_PLAN"});
    if(ctx.account.trial?.startedAt)throw Object.assign(new Error("A free trial has already been used on this account."),{status:409,code:"TRIAL_ALREADY_USED"});
    const startedAt=Date.now(),endsAt=startedAt+14*86400000;
    await ctx.db.ref(`qrajn/v6/accounts/${ctx.uid}`).update({plan,trial:{plan,startedAt,endsAt,originalPlan:ctx.account.plan||"free"},updatedAt:Date.now()});
    await audit(ctx.db,ctx.uid,"trial.started",{entityType:"subscription",summary:`14-day ${plan} trial`});
    return json(response,200,{ok:true,trial:{plan,startedAt,endsAt}});
  }catch(e){return fail(e,response);}
}
