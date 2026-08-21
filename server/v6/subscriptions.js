import {planConfig,limit} from "./plans.js";
export async function applyPlanChange(db,uid,nextPlan,{provider="",subscriptionId="",status="active",renewalAt=0,cycle="monthly",graceUntil=0}={}){
  const accountRef=db.ref(`qrajn/v6/accounts/${uid}`),snap=await accountRef.get(),account=snap.val()||{uid,plan:"free"};
  const previous=account.plan||"free";
  await accountRef.update({plan:nextPlan,subscriptionStatus:status,billing:{...(account.billing||{}),provider,subscriptionId,cycle,renewalAt,graceUntil},updatedAt:Date.now()});
  const [qrs,profiles,team]=await Promise.all([
    db.ref(`qrajn/users/${uid}/qrs`).get(),
    db.ref(`qrajn/users/${uid}/businessProfiles`).get(),
    db.ref(`qrajn/v6/team/${uid}/members`).get()
  ]);
  const cfg=planConfig(nextPlan),locks={qrs:[],profiles:[],members:[]};
  function overflow(values,max){
    if(max===-1)return [];
    return Object.values(values||{}).sort((a,b)=>Number(b.updatedAt||b.createdAt||0)-Number(a.updatedAt||a.createdAt||0)).slice(max).map(x=>x.id);
  }
  locks.qrs=overflow(qrs.val(),limit(nextPlan,"qrs"));
  locks.profiles=overflow(profiles.val(),limit(nextPlan,"profiles"));
  locks.members=overflow(team.val(),Math.max(0,limit(nextPlan,"seats")-1));
  await db.ref(`qrajn/v6/resourceLocks/${uid}`).set({previousPlan:previous,nextPlan,locks,createdAt:Date.now(),policy:"Resources are locked, never silently deleted."});
  return {previous,next:nextPlan,locks};
}
