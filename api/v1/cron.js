import {getAdmin} from "../_admin.js";
import {claimDueJobs,retryDelay} from "../../server/v6/jobs.js";
import {deliverWebhook} from "../../server/v6/webhooks.js";
import {json,fail} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const auth=String(request.headers.authorization||"").replace(/^Bearer\s+/i,"");
    if(!process.env.CRON_SECRET||auth!==process.env.CRON_SECRET)throw Object.assign(new Error("Unauthorized."),{status:401,code:"AUTH_REQUIRED"});
    const {db}=getAdmin(),jobs=await claimDueJobs(db,25),results=[];
    for(const job of jobs){
      try{
        if(job.type==="webhook.retry"){
          const hook=(await db.ref(`qrajn/v6/webhooks/${job.ownerId}/${job.payload.hookId}`).get()).val();
          if(hook?.active)await deliverWebhook(db,hook,job.payload.event,job.payload.payload,Number(job.attempt||0));
        }
        await db.ref(`qrajn/v6/jobs/${job.id}`).update({status:"done",updatedAt:Date.now()});results.push({id:job.id,ok:true});
      }catch(error){
        const attempt=Number(job.attempt||0)+1,status=attempt>=7?"failed":"retry";
        await db.ref(`qrajn/v6/jobs/${job.id}`).update({status,attempt,runAt:Date.now()+retryDelay(attempt),lastError:String(error?.message||error).slice(0,500),updatedAt:Date.now()});
        results.push({id:job.id,ok:false});
      }
    }
    return json(response,200,{ok:true,processed:results.length,results});
  }catch(e){return fail(e,response);}
}
