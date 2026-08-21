import {context,audit} from "../../server/v6/platform.js";
import {LEAD_STATUSES,normalizeLead,dedupeKey} from "../../server/v6/crm.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";

function values(v,source){return Object.entries(v||{}).map(([id,x])=>({...(x||{}),id:x?.id||id,source}));}

export default async function handler(request,response){
  try{
    const m=method(request,"GET","POST","PATCH","DELETE"),ctx=await context(request);
    if(m==="GET"){
      const [business,qr,state]=await Promise.all([ctx.db.ref(`qrajn/businessLeads/${ctx.uid}`).get(),ctx.db.ref(`qrajn/qrLeads/${ctx.uid}`).get(),ctx.db.ref(`qrajn/v6/crm/${ctx.uid}/leadState`).get()]);
      const status=state.val()||{},rows=[...values(business.val(),"profile"),...values(qr.val(),"qr")].map(l=>({...l,status:status[l.id]?.status||"new",notes:status[l.id]?.notes||""})).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
      return json(response,200,{ok:true,statuses:LEAD_STATUSES,leads:rows});
    }
    const body=parseBody(request);
    if(m==="POST"){
      const id=`manual_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,lead=normalizeLead(body,id,"manual"),key=dedupeKey(lead);
      if(!key)throw Object.assign(new Error("Phone or email is required."),{status:400,code:"LEAD_CONTACT_REQUIRED"});
      const idx=await ctx.db.ref(`qrajn/v6/crm/${ctx.uid}/dedupe/${encodeURIComponent(key)}`).get();
      if(idx.exists())return json(response,200,{ok:true,deduplicated:true,id:idx.val()});
      await ctx.db.ref(`qrajn/v6/crm/${ctx.uid}/manual/${id}`).set(lead);await ctx.db.ref(`qrajn/v6/crm/${ctx.uid}/dedupe/${encodeURIComponent(key)}`).set(id);
      await audit(ctx.db,ctx.uid,"lead.created",{entityType:"lead",entityId:id,summary:"Manual CRM lead created"});return json(response,201,{ok:true,lead});
    }
    const id=clean(body.id,160);if(!id)throw Object.assign(new Error("Lead id is required."),{status:400,code:"LEAD_ID_REQUIRED"});
    if(m==="PATCH"){
      const status=LEAD_STATUSES.includes(body.status)?body.status:"new",notes=clean(body.notes,4000);
      await ctx.db.ref(`qrajn/v6/crm/${ctx.uid}/leadState/${id}`).update({status,notes,updatedAt:Date.now()});
      await audit(ctx.db,ctx.uid,"lead.updated",{entityType:"lead",entityId:id,summary:`Lead marked ${status}`});return json(response,200,{ok:true,id,status,notes});
    }
    await ctx.db.ref(`qrajn/v6/crm/${ctx.uid}/leadState/${id}`).remove();
    await audit(ctx.db,ctx.uid,"lead.state.cleared",{entityType:"lead",entityId:id});return json(response,200,{ok:true});
  }catch(e){return fail(e,response);}
}
