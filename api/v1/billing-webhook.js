import crypto from "node:crypto";
import {getAdmin} from "../_admin.js";
import {applyPlanChange} from "../../server/v6/subscriptions.js";
import {json,fail} from "../../server/v6/security.js";

function rawBody(request){return typeof request.body==="string"?request.body:JSON.stringify(request.body||{});}
function verifyRazorpay(raw,signature){
  if(!process.env.RAZORPAY_WEBHOOK_SECRET)return false;
  const expected=crypto.createHmac("sha256",process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest("hex");
  try{const a=Buffer.from(expected),b=Buffer.from(String(signature||""));return a.length===b.length&&crypto.timingSafeEqual(a,b);}catch{return false;}
}
export default async function handler(request,response){
  try{
    if(request.method!=="POST")return response.status(405).end();
    const raw=rawBody(request),provider=String(request.query?.provider||process.env.BILLING_PROVIDER||"razorpay").toLowerCase(),{db}=getAdmin();
    if(provider==="razorpay"){
      if(!verifyRazorpay(raw,request.headers["x-razorpay-signature"]))throw Object.assign(new Error("Invalid billing webhook signature."),{status:401,code:"INVALID_SIGNATURE"});
      const body=typeof request.body==="object"?request.body:JSON.parse(raw),sub=body.payload?.subscription?.entity||{},notes=sub.notes||{},uid=notes.qrajn_uid,plan=notes.qrajn_plan;
      if(uid&&plan&&["subscription.activated","subscription.charged","subscription.completed","subscription.paused","subscription.cancelled","subscription.halted"].includes(body.event)){
        const active=["subscription.activated","subscription.charged","subscription.completed"].includes(body.event),status=active?"active":body.event.includes("cancel")?"cancelled":"past_due",graceUntil=status==="past_due"?Date.now()+7*86400000:0;
        await applyPlanChange(db,uid,active?plan:"free",{provider:"razorpay",subscriptionId:sub.id||"",status,renewalAt:Number(sub.current_end||0)*1000,cycle:notes.qrajn_cycle||"monthly",graceUntil});
        const inv=db.ref(`qrajn/v6/invoices/${uid}`).push();await inv.set({id:inv.key,provider:"razorpay",event:body.event,amount:Number(body.payload?.payment?.entity?.amount||0)/100,currency:body.payload?.payment?.entity?.currency||"INR",createdAt:Date.now()});
      }
      return json(response,200,{ok:true});
    }
    if(provider==="stripe"){
      if(!process.env.STRIPE_WEBHOOK_SECRET)throw Object.assign(new Error("Stripe webhook secret is not configured."),{status:503,code:"CONFIGURATION_REQUIRED"});
      const sig=String(request.headers["stripe-signature"]||"");
      // Signature parsing is intentionally delegated to a secure gateway unless STRIPE_WEBHOOK_VERIFIER_URL is configured.
      if(!process.env.STRIPE_WEBHOOK_VERIFIER_URL)throw Object.assign(new Error("Stripe webhook verifier endpoint is required for production signature verification."),{status:503,code:"CONFIGURATION_REQUIRED"});
      const vr=await fetch(process.env.STRIPE_WEBHOOK_VERIFIER_URL,{method:"POST",headers:{"content-type":"application/json","x-stripe-signature":sig},body:raw});
      if(!vr.ok)throw Object.assign(new Error("Invalid Stripe webhook signature."),{status:401,code:"INVALID_SIGNATURE"});
      const body=typeof request.body==="object"?request.body:JSON.parse(raw),obj=body.data?.object||{},uid=obj.metadata?.qrajn_uid,plan=obj.metadata?.qrajn_plan;
      if(uid&&plan&&["checkout.session.completed","customer.subscription.updated","customer.subscription.deleted","invoice.payment_failed"].includes(body.type)){
        const active=!["customer.subscription.deleted","invoice.payment_failed"].includes(body.type),status=active?"active":body.type==="invoice.payment_failed"?"past_due":"cancelled",graceUntil=status==="past_due"?Date.now()+7*86400000:0;
        await applyPlanChange(db,uid,active?plan:"free",{provider:"stripe",subscriptionId:obj.subscription||obj.id||"",status,cycle:"monthly",graceUntil});
      }
      return json(response,200,{ok:true});
    }
    throw Object.assign(new Error("Unsupported billing webhook provider."),{status:400,code:"UNSUPPORTED_PROVIDER"});
  }catch(e){return fail(e,response);}
}
