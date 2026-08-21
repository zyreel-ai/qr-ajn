import {context,audit} from "../../server/v6/platform.js";
import {json,fail,method,parseBody} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const m=method(request,"GET","POST","DELETE"),ctx=await context(request);
    if(m==="GET"){
      const [user,v6,events,leads]=await Promise.all([ctx.db.ref(`qrajn/users/${ctx.uid}`).get(),ctx.db.ref(`qrajn/v6/accounts/${ctx.uid}`).get(),ctx.db.ref(`qrajn/scanEvents/${ctx.uid}`).get(),ctx.db.ref(`qrajn/businessLeads/${ctx.uid}`).get()]);
      return json(response,200,{ok:true,exportedAt:new Date().toISOString(),account:v6.val()||{},workspace:user.val()||{},scanEvents:events.val()||{},businessLeads:leads.val()||{}});
    }
    const body=parseBody(request);
    if(m==="POST"){
      if(body.action==="cancel-delete"){await ctx.db.ref(`qrajn/v6/deletionRequests/${ctx.uid}`).remove();await ctx.db.ref(`qrajn/v6/accounts/${ctx.uid}`).update({deletionRequestedAt:null,deletionScheduledAt:null});return json(response,200,{ok:true,cancelled:true});}
      if(body.confirm!=="DELETE MY QR AJN ACCOUNT")throw Object.assign(new Error('Type "DELETE MY QR AJN ACCOUNT" to schedule deletion.'),{status:400,code:"CONFIRMATION_REQUIRED"});
      const scheduledAt=Date.now()+30*86400000;await ctx.db.ref(`qrajn/v6/deletionRequests/${ctx.uid}`).set({uid:ctx.uid,requestedAt:Date.now(),scheduledAt,status:"scheduled"});await ctx.db.ref(`qrajn/v6/accounts/${ctx.uid}`).update({deletionRequestedAt:Date.now(),deletionScheduledAt:scheduledAt});
      await audit(ctx.db,ctx.uid,"account.deletion.scheduled",{entityType:"account",summary:"30-day recoverable deletion scheduled"});return json(response,200,{ok:true,scheduledAt});
    }
    throw Object.assign(new Error("Direct hard deletion is intentionally disabled; use the recoverable 30-day deletion flow."),{status:409,code:"SOFT_DELETE_REQUIRED"});
  }catch(e){return fail(e,response);}
}
