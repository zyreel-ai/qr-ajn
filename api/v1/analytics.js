import {context} from "../../server/v6/platform.js";
import {aggregateAnalytics} from "../../server/v6/analytics.js";
import {json,fail,method} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    method(request,"GET");const ctx=await context(request),days=Math.max(7,Math.min(365,Number(request.query?.days||30)));
    const [events,businessEvents,businessLeads,qrLeads]=await Promise.all([
      ctx.db.ref(`qrajn/scanEvents/${ctx.uid}`).get(),
      ctx.db.ref(`qrajn/businessEvents/${ctx.uid}`).get(),
      ctx.db.ref(`qrajn/businessLeads/${ctx.uid}`).get(),
      ctx.db.ref(`qrajn/qrLeads/${ctx.uid}`).get()
    ]);
    return json(response,200,{ok:true,days,...aggregateAnalytics({events:events.val(),businessEvents:businessEvents.val(),businessLeads:businessLeads.val(),qrLeads:qrLeads.val()},days)});
  }catch(e){return fail(e,response);}
}
