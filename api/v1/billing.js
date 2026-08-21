import {context,audit} from "../../server/v6/platform.js";
import {billingSummary,createCheckout} from "../../server/v6/billing.js";
import {publicPlans} from "../../server/v6/plans.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";

export default async function handler(request,response){
  try{
    const m=method(request,"GET","POST"),ctx=await context(request);
    if(m==="GET")return json(response,200,{ok:true,billing:billingSummary(ctx.account),plans:publicPlans(),history:Object.values((await ctx.db.ref(`qrajn/v6/invoices/${ctx.uid}`).get()).val()||{}).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0))});
    const body=parseBody(request),plan=clean(body.plan,30),cycle=body.cycle==="annual"?"annual":"monthly";
    const origin=String(request.headers.origin||"https://www.qrajn.online").replace(/\/$/,"");
    const checkout=await createCheckout({plan,cycle,successUrl:`${origin}/billing?checkout=success`,cancelUrl:`${origin}/billing?checkout=cancelled`,uid:ctx.uid,email:ctx.token.email||ctx.account.email});
    await audit(ctx.db,ctx.uid,"billing.checkout.created",{entityType:"subscription",summary:`${plan} ${cycle}`,data:{provider:checkout.provider}});
    return json(response,200,{ok:true,checkout});
  }catch(e){return fail(e,response);}
}
