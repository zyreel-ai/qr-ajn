import {context,entitlementView,usageSnapshot,configuredIntegrations} from "../../server/v6/platform.js";
import {publicPlans,ADDONS} from "../../server/v6/plans.js";
import {json,fail,method} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    method(request,"GET");
    const ctx=await context(request),usage=await usageSnapshot(ctx.db,ctx.uid);
    return json(response,200,{ok:true,account:{uid:ctx.uid,email:ctx.account.email,displayName:ctx.account.displayName,preferences:ctx.account.preferences,referral:ctx.account.referral},entitlements:entitlementView(ctx.account),usage,plans:publicPlans(),addOns:ADDONS,integrations:configuredIntegrations()});
  }catch(e){return fail(e,response);}
}
