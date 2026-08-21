import {context,audit} from "../../server/v6/platform.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const m=method(request,"GET","POST"),ctx=await context(request);
    if(m==="GET")return json(response,200,{ok:true,referral:ctx.account.referral||{},ledger:Object.values((await ctx.db.ref(`qrajn/v6/referrals/${ctx.uid}`).get()).val()||{})});
    const code=clean(parseBody(request).code,40).toUpperCase();if(!code)throw Object.assign(new Error("Referral code is required."),{status:400,code:"CODE_REQUIRED"});
    const accounts=(await ctx.db.ref("qrajn/v6/accounts").orderByChild("referral/code").equalTo(code).limitToFirst(1).get()).val()||{},referrer=Object.values(accounts)[0];
    if(!referrer||referrer.uid===ctx.uid)throw Object.assign(new Error("Referral code is invalid."),{status:400,code:"INVALID_REFERRAL"});
    const used=await ctx.db.ref(`qrajn/v6/referralUsage/${ctx.uid}`).get();if(used.exists())throw Object.assign(new Error("A referral has already been applied."),{status:409,code:"REFERRAL_ALREADY_USED"});
    const entry={code,referrerUid:referrer.uid,referredUid:ctx.uid,creditMonths:1,status:"earned",createdAt:Date.now()};
    await ctx.db.ref(`qrajn/v6/referrals/${referrer.uid}`).push(entry);await ctx.db.ref(`qrajn/v6/referrals/${ctx.uid}`).push({...entry,kind:"welcome"});await ctx.db.ref(`qrajn/v6/referralUsage/${ctx.uid}`).set(entry);
    await ctx.db.ref(`qrajn/v6/accounts/${referrer.uid}/referral/credits`).transaction(v=>Number(v||0)+1);await ctx.db.ref(`qrajn/v6/accounts/${ctx.uid}/referral/credits`).transaction(v=>Number(v||0)+1);
    await audit(ctx.db,ctx.uid,"referral.applied",{entityType:"referral",summary:code});return json(response,200,{ok:true,creditMonths:1});
  }catch(e){return fail(e,response);}
}
