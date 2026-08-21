export const PLAN_ORDER = Object.freeze(["free","starter","growth","business","enterprise"]);

export const PLANS = Object.freeze({
  free: {
    id:"free", name:"Free", monthlyInr:0, annualInr:0, annualDiscount:0,
    limits:{profiles:1,qrs:10,monthlyScans:1000,seats:1,apiRequests:0,webhooks:0,adCampaigns:0,bulkRows:25},
    features:{dynamicQr:true,analytics:"basic",smartRouting:"basic",customDomain:false,whiteLabel:false,team:false,api:false,webhooks:false,adsFree:false,abTesting:false,bulk:false,sso:false,ai:false,agency:false,prioritySupport:false,profileThemes:1,historyDays:30}
  },
  starter: {
    id:"starter", name:"Starter", monthlyInr:299, annualInr:2942, annualDiscount:18,
    limits:{profiles:3,qrs:100,monthlyScans:10000,seats:1,apiRequests:0,webhooks:0,adCampaigns:1,bulkRows:100},
    features:{dynamicQr:true,analytics:"standard",smartRouting:"standard",customDomain:false,whiteLabel:false,team:false,api:false,webhooks:false,adsFree:false,abTesting:false,bulk:true,sso:false,ai:"limited",agency:false,prioritySupport:false,profileThemes:3,historyDays:180}
  },
  growth: {
    id:"growth", name:"Growth", monthlyInr:799, annualInr:7862, annualDiscount:18,
    limits:{profiles:10,qrs:1000,monthlyScans:100000,seats:3,apiRequests:0,webhooks:3,adCampaigns:10,bulkRows:1000},
    features:{dynamicQr:true,analytics:"advanced",smartRouting:"advanced",customDomain:true,whiteLabel:false,team:true,api:false,webhooks:true,adsFree:false,abTesting:true,bulk:true,sso:false,ai:"standard",agency:false,prioritySupport:true,profileThemes:5,historyDays:730}
  },
  business: {
    id:"business", name:"Business", monthlyInr:1999, annualInr:19670, annualDiscount:18,
    limits:{profiles:-1,qrs:-1,monthlyScans:1000000,seats:10,apiRequests:100000,webhooks:25,adCampaigns:100,bulkRows:10000},
    features:{dynamicQr:true,analytics:"advanced",smartRouting:"advanced",customDomain:true,whiteLabel:true,team:true,api:true,webhooks:true,adsFree:true,abTesting:true,bulk:true,sso:false,ai:"advanced",agency:true,prioritySupport:true,profileThemes:5,historyDays:-1}
  },
  enterprise: {
    id:"enterprise", name:"Enterprise", monthlyInr:null, annualInr:null, annualDiscount:null,
    limits:{profiles:-1,qrs:-1,monthlyScans:-1,seats:-1,apiRequests:-1,webhooks:-1,adCampaigns:-1,bulkRows:-1},
    features:{dynamicQr:true,analytics:"enterprise",smartRouting:"enterprise",customDomain:true,whiteLabel:true,team:true,api:true,webhooks:true,adsFree:true,abTesting:true,bulk:true,sso:true,ai:"enterprise",agency:true,prioritySupport:true,profileThemes:5,historyDays:-1}
  }
});

export const ADDONS = Object.freeze({
  scans10k:{id:"scans10k",name:"10,000 extra scans",units:10000,monthlyInr:149},
  scans100k:{id:"scans100k",name:"100,000 extra scans",units:100000,monthlyInr:799},
  profile5:{id:"profile5",name:"5 extra profiles",units:5,monthlyInr:199},
  seat1:{id:"seat1",name:"1 extra team seat",units:1,monthlyInr:149}
});

export function normalizePlan(plan){const p=String(plan||"free").toLowerCase();return PLANS[p]?p:"free";}
export function planConfig(plan){return PLANS[normalizePlan(plan)];}
export function planRank(plan){return PLAN_ORDER.indexOf(normalizePlan(plan));}
export function atLeast(plan,minimum){return planRank(plan)>=planRank(minimum);}
export function feature(plan,name){const value=planConfig(plan).features[name];return value===undefined?false:value;}
export function limit(plan,name){const n=Number(planConfig(plan).limits[name]);return Number.isFinite(n)?n:0;}
export function assertFeature(plan,name,message="This feature is not included in your current plan."){
  if(!feature(plan,name)){const e=new Error(message);e.code="PLAN_FEATURE_REQUIRED";e.status=402;e.feature=name;throw e;}
}
export function assertWithinLimit(plan,name,current,incoming=1){
  const max=limit(plan,name);
  if(max!==-1&&Number(current||0)+Number(incoming||0)>max){const e=new Error(`Your ${planConfig(plan).name} plan limit for ${name} is ${max}.`);e.code="PLAN_LIMIT_REACHED";e.status=402;e.limit=max;e.metric=name;throw e;}
  return true;
}
export function publicPlans(){return PLAN_ORDER.map(id=>{const p=PLANS[id];return {id:p.id,name:p.name,monthlyInr:p.monthlyInr,annualInr:p.annualInr,annualDiscount:p.annualDiscount,limits:p.limits,features:p.features};});}
