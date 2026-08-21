import {planConfig,normalizePlan} from "./plans.js";
function configuration(message){const e=new Error(message);e.status=503;e.code="CONFIGURATION_REQUIRED";throw e;}
export async function createCheckout({plan,cycle="monthly",successUrl,cancelUrl,uid,email}){
  plan=normalizePlan(plan);if(plan==="free"||plan==="enterprise")configuration("This plan does not use self-service checkout.");
  const provider=String(process.env.BILLING_PROVIDER||"razorpay").toLowerCase();
  if(provider==="stripe"){
    if(!process.env.STRIPE_SECRET_KEY)configuration("Stripe is not configured.");
    const key=`STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}`,price=process.env[key];if(!price)configuration(`Missing ${key}.`);
    const form=new URLSearchParams();form.set("mode","subscription");form.set("success_url",successUrl);form.set("cancel_url",cancelUrl);form.set("client_reference_id",uid);if(email)form.set("customer_email",email);form.set("line_items[0][price]",price);form.set("line_items[0][quantity]","1");form.set("metadata[qrajn_uid]",uid);form.set("metadata[qrajn_plan]",plan);
    const r=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,"content-type":"application/x-www-form-urlencoded"},body:form}),j=await r.json();
    if(!r.ok)throw Object.assign(new Error(j?.error?.message||"Stripe checkout failed."),{status:502,code:"BILLING_PROVIDER_ERROR"});return {provider:"stripe",url:j.url,id:j.id};
  }
  if(provider==="razorpay"){
    if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)configuration("Razorpay is not configured.");
    const key=`RAZORPAY_PLAN_${plan.toUpperCase()}_${cycle.toUpperCase()}`,planId=process.env[key];if(!planId)configuration(`Missing ${key}.`);
    const auth=Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64"),body={plan_id:planId,total_count:cycle==="annual"?1:120,quantity:1,customer_notify:1,notes:{qrajn_uid:uid,qrajn_plan:plan,qrajn_cycle:cycle}};
    const r=await fetch("https://api.razorpay.com/v1/subscriptions",{method:"POST",headers:{authorization:`Basic ${auth}`,"content-type":"application/json"},body:JSON.stringify(body)}),j=await r.json();
    if(!r.ok)throw Object.assign(new Error(j?.error?.description||"Razorpay checkout failed."),{status:502,code:"BILLING_PROVIDER_ERROR"});return {provider:"razorpay",url:j.short_url||"",id:j.id};
  }
  configuration("Unsupported billing provider.");
}
export function billingSummary(account){const p=planConfig(account.plan);return {plan:p.id,planName:p.name,status:account.subscriptionStatus||"active",cycle:account.billing?.cycle||"monthly",renewalAt:account.billing?.renewalAt||0,provider:account.billing?.provider||"",monthlyInr:p.monthlyInr,annualInr:p.annualInr};}
