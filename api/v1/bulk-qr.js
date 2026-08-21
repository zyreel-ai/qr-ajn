import crypto from "node:crypto";
import {context,audit,usageSnapshot,requireLimit,randomToken} from "../../server/v6/platform.js";
import {safeUrl,clean,json,fail,method,parseBody} from "../../server/v6/security.js";

const alphabet="abcdefghjkmnpqrstuvwxyz23456789";
function shortId(){const b=crypto.randomBytes(9);return Array.from(b,x=>alphabet[x%alphabet.length]).join("");}

export default async function handler(request,response){
  try{
    method(request,"POST");const ctx=await context(request),body=parseBody(request),rows=Array.isArray(body.rows)?body.rows:[];
    if(!rows.length)throw Object.assign(new Error("No QR rows supplied."),{status:400,code:"ROWS_REQUIRED"});
    const usage=await usageSnapshot(ctx.db,ctx.uid);requireLimit(ctx,"bulkRows",0,rows.length);requireLimit(ctx,"qrs",usage.qrs,rows.length);
    const updates={},created=[],now=new Date().toISOString();
    for(const row of rows){
      const destination=safeUrl(row.destination||row.url);if(!destination)continue;
      const id=`qr_${crypto.randomUUID().replaceAll("-","").slice(0,18)}`;let sid="";
      for(let i=0;i<10;i++){const s=shortId();if(!(await ctx.db.ref(`qrajn/publicLinks/${s}`).get()).exists()){sid=s;break;}}
      if(!sid)throw new Error("Could not allocate a short link.");
      const qr={id,name:clean(row.name||"Bulk QR",100),type:"url",content:destination,destination_url:destination,short_id:sid,is_dynamic:true,is_active:true,archived:false,category:clean(row.category,80),labels:String(row.labels||"").split(",").map(x=>clean(x,40)).filter(Boolean).slice(0,20),design:{},created_at:now,updated_at:now};
      updates[`qrajn/users/${ctx.uid}/qrs/${id}`]=qr;
      updates[`qrajn/publicLinks/${sid}`]={shortId:sid,ownerId:ctx.uid,qrId:id,destination,active:true,branding:{},scanCount:0,createdAt:Date.now(),updatedAt:Date.now()};
      created.push(qr);
    }
    if(!created.length)throw Object.assign(new Error("No valid destination URLs were found."),{status:400,code:"NO_VALID_ROWS"});
    await ctx.db.ref().update(updates);await audit(ctx.db,ctx.uid,"qr.bulk.created",{entityType:"qr",summary:`${created.length} dynamic QR codes created`});
    return json(response,201,{ok:true,count:created.length,qrs:created.map(q=>({id:q.id,name:q.name,shortId:q.short_id,url:`https://www.qrajn.online/r/${q.short_id}`}))});
  }catch(e){return fail(e,response);}
}
