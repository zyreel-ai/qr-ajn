import {context} from "../../server/v6/platform.js";
import {json,fail,method,parseBody,clean,sha256} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    method(request,"POST");const ctx=await context(request),body=parseBody(request),ownerUid=clean(body.ownerUid,128),token=clean(body.inviteToken,200);
    if(!ownerUid||!token)throw Object.assign(new Error("Workspace and invite token are required."),{status:400,code:"INVITE_REQUIRED"});
    const snap=await ctx.db.ref(`qrajn/v6/team/${ownerUid}/members`).get(),members=snap.val()||{};
    const entry=Object.values(members).find(m=>m.status==="invited"&&m.inviteHash===sha256(token)&&String(m.email||"").toLowerCase()===String(ctx.token.email||"").toLowerCase());
    if(!entry)throw Object.assign(new Error("Invite is invalid or belongs to another email."),{status:403,code:"INVALID_INVITE"});
    await ctx.db.ref(`qrajn/v6/team/${ownerUid}/members/${entry.id}`).update({status:"active",userUid:ctx.actorUid,acceptedAt:Date.now(),inviteHash:null,updatedAt:Date.now()});
    await ctx.db.ref(`qrajn/v6/memberIndex/${ctx.actorUid}/${ownerUid}`).set({role:entry.role,memberId:entry.id,acceptedAt:Date.now()});
    return json(response,200,{ok:true,ownerUid,role:entry.role});
  }catch(e){return fail(e,response);}
}
