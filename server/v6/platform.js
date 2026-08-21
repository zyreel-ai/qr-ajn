import {getAdmin} from "../../api/_admin.js";
import {planConfig,normalizePlan,assertFeature,assertWithinLimit,limit,feature} from "./plans.js";
import {clean,randomToken,sha256} from "./security.js";

const ROOT="qrajn";
const V6=`${ROOT}/v6`;

export async function verifyUser(request){
  const header=String(request.headers.authorization||request.headers.Authorization||"");
  if(!header.startsWith("Bearer ")){const e=new Error("Sign in is required.");e.status=401;e.code="AUTH_REQUIRED";throw e;}
  const {auth,db}=getAdmin();
  const token=await auth.verifyIdToken(header.slice(7).trim());
  return {token,uid:token.uid,db,auth};
}
export async function ensureAccount(db,uid,token={}){
  const ref=db.ref(`${V6}/accounts/${uid}`),snap=await ref.get();
  if(snap.exists()){const a=snap.val()||{};return {...a,uid,plan:normalizePlan(a.plan)};}
  const now=Date.now();
  const account={
    uid,plan:"free",subscriptionStatus:"active",trial:null,email:clean(token.email,200),displayName:clean(token.name,100),role:"owner",
    createdAt:now,updatedAt:now,billing:{provider:"",customerId:"",cycle:"monthly",renewalAt:0},
    preferences:{timezone:"Asia/Kolkata",currency:"INR",darkMode:false},
    referral:{code:`AJN-${uid.slice(0,8).toUpperCase()}`,credits:0},
    addOns:{extraScans:0,extraProfiles:0,extraSeats:0}
  };
  await ref.set(account);return account;
}
export async function context(request){
  const auth=await verifyUser(request);
  const requestedOwner=clean(request.headers["x-qrajn-account"]||auth.uid,128);
  let ownerUid=auth.uid,role="owner";
  if(requestedOwner&&requestedOwner!==auth.uid){
    const membership=(await auth.db.ref(`${V6}/memberIndex/${auth.uid}/${requestedOwner}`).get()).val();
    if(!membership||!["editor","viewer"].includes(membership.role)){
      const e=new Error("You do not have access to this workspace.");e.status=403;e.code="WORKSPACE_ACCESS_DENIED";throw e;
    }
    ownerUid=requestedOwner;role=membership.role;
  }
  const account=await ensureAccount(auth.db,ownerUid,ownerUid===auth.uid?auth.token:{});
  return {...auth,actorUid:auth.uid,uid:ownerUid,role,account,plan:planConfig(account.plan)};
}
export function requireWrite(ctx){
  if(ctx.role==="viewer"){const e=new Error("Viewer role cannot modify this workspace.");e.status=403;e.code="ROLE_FORBIDDEN";throw e;}
}
export async function audit(db,uid,action,meta={}){
  const ref=db.ref(`${V6}/audit/${uid}`).push();
  await ref.set({id:ref.key,action:clean(action,80),at:Date.now(),actorUid:uid,entityType:clean(meta.entityType,40),entityId:clean(meta.entityId,100),summary:clean(meta.summary,500),data:Object.fromEntries(Object.entries(meta.data||{}).slice(0,30).map(([k,v])=>[clean(k,60),typeof v==="string"?clean(v,500):v]))});
  return ref.key;
}
export async function usageSnapshot(db,uid){
  const month=new Date().toISOString().slice(0,7);
  const [u,q,p,t]=await Promise.all([
    db.ref(`${V6}/usage/${uid}/${month}`).get(),
    db.ref(`${ROOT}/users/${uid}/qrs`).get(),
    db.ref(`${ROOT}/users/${uid}/businessProfiles`).get(),
    db.ref(`${V6}/team/${uid}/members`).get()
  ]);
  const usage=u.val()||{};
  return {month,scans:Number(usage.scans||0),apiRequests:Number(usage.apiRequests||0),qrs:q.numChildren(),profiles:p.numChildren(),seats:Math.max(1,t.numChildren()+1)};
}
export async function incrementUsage(db,uid,metric,amount=1){
  const month=new Date().toISOString().slice(0,7);
  await db.ref(`${V6}/usage/${uid}/${month}/${metric}`).transaction(v=>Number(v||0)+Number(amount||1));
}
export async function rateLimit(db,key,{limit:maximum=60,windowMs=60000}={}){
  const bucket=Math.floor(Date.now()/windowMs),path=`${V6}/rateLimits/${sha256(key).slice(0,40)}/${bucket}`;
  const result=await db.ref(path).transaction(v=>Math.max(0,Number(v||0))+1),count=Number(result.snapshot.val()||0);
  if(count>maximum){const e=new Error("Too many requests. Try again shortly.");e.status=429;e.code="RATE_LIMITED";throw e;}
  return {count,remaining:Math.max(0,maximum-count),resetAt:(bucket+1)*windowMs};
}
export function requireFeature(ctx,name,message){assertFeature(ctx.account.plan,name,message);}
export function requireLimit(ctx,name,current,incoming=1){assertWithinLimit(ctx.account.plan,name,current,incoming);}
export function entitlementView(account){
  const p=planConfig(account.plan);
  return {plan:p.id,name:p.name,limits:p.limits,features:p.features,subscriptionStatus:account.subscriptionStatus||"active",trial:account.trial||null,addOns:account.addOns||{}};
}
export function configuredIntegrations(){
  return {
    billing:Boolean(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET)||Boolean(process.env.STRIPE_SECRET_KEY),
    email:Boolean(process.env.RESEND_API_KEY||process.env.EMAIL_WEBHOOK_URL),
    whatsapp:Boolean(process.env.WHATSAPP_ACCESS_TOKEN&&process.env.WHATSAPP_PHONE_NUMBER_ID&&process.env.WHATSAPP_GRAPH_BASE_URL),
    sms:Boolean(process.env.SMS_WEBHOOK_URL),maps:Boolean(process.env.GOOGLE_MAPS_API_KEY),
    calendar:Boolean(process.env.GOOGLE_CALENDAR_CLIENT_ID&&process.env.GOOGLE_CALENDAR_CLIENT_SECRET),
    ai:Boolean(process.env.AI_PROVIDER_API_KEY&&process.env.AI_PROVIDER_URL),
    redis:Boolean(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN),
    sentry:Boolean(process.env.ERROR_TRACKING_WEBHOOK_URL||process.env.SENTRY_DSN),
    vercelDomains:Boolean(process.env.VERCEL_TOKEN&&process.env.VERCEL_PROJECT_ID)
  };
}
export async function serverApiUsage(ctx){
  const current=await usageSnapshot(ctx.db,ctx.uid),max=limit(ctx.account.plan,"apiRequests");
  if(max===0){const e=new Error("Public API access requires Business or Enterprise.");e.status=402;e.code="PLAN_FEATURE_REQUIRED";throw e;}
  if(max!==-1&&current.apiRequests>=max){const e=new Error("Monthly API request quota reached.");e.status=429;e.code="API_QUOTA_REACHED";throw e;}
  await incrementUsage(ctx.db,ctx.uid,"apiRequests",1);
}
export {ROOT,V6,feature,limit,randomToken};
