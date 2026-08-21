import {context,audit,usageSnapshot,requireFeature,requireLimit,randomToken} from "../../server/v6/platform.js";
import {json,fail,method,parseBody,clean,safeEmail} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const m=method(request,"GET","POST","PATCH","DELETE"),ctx=await context(request);
    requireFeature(ctx,"team","Team members require Growth or higher.");
    const base=`qrajn/v6/team/${ctx.uid}`;
    if(m==="GET"){const snap=await ctx.db.ref(`${base}/members`).get();return json(response,200,{ok:true,members:Object.values(snap.val()||{}),roles:["owner","editor","viewer"]});}
    const body=parseBody(request);
    if(m==="POST"){
      const usage=await usageSnapshot(ctx.db,ctx.uid);requireLimit(ctx,"seats",usage.seats,1);
      const email=safeEmail(body.email);if(!email)throw Object.assign(new Error("Enter a valid email."),{status:400,code:"INVALID_EMAIL"});
      const id=`member_${randomToken(8)}`,role=["editor","viewer"].includes(body.role)?body.role:"viewer",inviteToken=randomToken(24);
      const member={id,email,role,status:"invited",inviteHash:(await import("../../server/v6/security.js")).sha256(inviteToken),createdAt:Date.now(),updatedAt:Date.now()};
      await ctx.db.ref(`${base}/members/${id}`).set(member);await audit(ctx.db,ctx.uid,"team.invited",{entityType:"member",entityId:id,summary:`Invited ${email} as ${role}`});
      return json(response,201,{ok:true,member:{...member,inviteHash:undefined},inviteToken,warning:"Invite token is shown once; send it to the invited teammate."});
    }
    const id=clean(body.id,100);if(!id)throw Object.assign(new Error("Member id required."),{status:400,code:"MEMBER_ID_REQUIRED"});
    if(m==="PATCH"){
      const role=["editor","viewer"].includes(body.role)?body.role:"viewer";await ctx.db.ref(`${base}/members/${id}`).update({role,updatedAt:Date.now()});
      await audit(ctx.db,ctx.uid,"team.role.changed",{entityType:"member",entityId:id,summary:`Role changed to ${role}`});return json(response,200,{ok:true,id,role});
    }
    await ctx.db.ref(`${base}/members/${id}`).remove();await audit(ctx.db,ctx.uid,"team.removed",{entityType:"member",entityId:id});return json(response,200,{ok:true});
  }catch(e){return fail(e,response);}
}
