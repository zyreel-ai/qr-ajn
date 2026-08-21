import {context,audit} from "../../server/v6/platform.js";
import {enqueue} from "../../server/v6/jobs.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const m=method(request,"GET","PUT","POST"),ctx=await context(request),base=`qrajn/v6/notificationPrefs/${ctx.uid}`;
    if(m==="GET")return json(response,200,{ok:true,preferences:(await ctx.db.ref(base).get()).val()||{email:true,whatsapp:false,scanMilestones:[100,1000,10000],newLead:true}});
    const body=parseBody(request);
    if(m==="PUT"){
      const prefs={email:body.email!==false,whatsapp:!!body.whatsapp,newLead:body.newLead!==false,scanMilestones:(body.scanMilestones||[100,1000,10000]).map(Number).filter(x=>x>0).slice(0,10),updatedAt:Date.now()};
      await ctx.db.ref(base).set(prefs);await audit(ctx.db,ctx.uid,"notifications.updated",{entityType:"settings"});return json(response,200,{ok:true,preferences:prefs});
    }
    await enqueue(ctx.db,ctx.uid,"notification.test",{channel:clean(body.channel||"email",20)},Date.now());
    return json(response,202,{ok:true,queued:true});
  }catch(e){return fail(e,response);}
}
