import {context,audit,requireFeature,requireLimit,randomToken} from "../../server/v6/platform.js";
import {normalizeWebhook} from "../../server/v6/webhooks.js";
import {json,fail,method,parseBody,clean} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const m=method(request,"GET","POST","DELETE"),ctx=await context(request);requireFeature(ctx,"webhooks","Webhooks require Growth or higher.");
    const base=`qrajn/v6/webhooks/${ctx.uid}`;
    if(m==="GET"){const snap=await ctx.db.ref(base).get();const hooks=Object.values(snap.val()||{}).map(({secret,...safe})=>safe);return json(response,200,{ok:true,hooks});}
    const body=parseBody(request);
    if(m==="POST"){
      const snap=await ctx.db.ref(base).get();requireLimit(ctx,"webhooks",snap.numChildren(),1);
      const id=`hook_${randomToken(8)}`,hook=normalizeWebhook({...body,secret:randomToken(32)},id,ctx.uid);await ctx.db.ref(`${base}/${id}`).set(hook);
      await audit(ctx.db,ctx.uid,"webhook.created",{entityType:"webhook",entityId:id,summary:hook.url});const {secret,...safe}=hook;return json(response,201,{ok:true,hook:safe,signingSecret:hook.secret,warning:"The signing secret is shown only once."});
    }
    const id=clean(body.id,100);await ctx.db.ref(`${base}/${id}`).remove();await audit(ctx.db,ctx.uid,"webhook.deleted",{entityType:"webhook",entityId:id});return json(response,200,{ok:true});
  }catch(e){return fail(e,response);}
}
