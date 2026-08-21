import {context} from "../../server/v6/platform.js";
import {decryptSecret,json,fail,method,parseBody,clean} from "../../server/v6/security.js";
async function accessToken(ctx,tokenRec){
  if(tokenRec.expiresAt>Date.now()+60000)return decryptSecret(tokenRec.accessToken);
  if(!tokenRec.refreshToken)throw Object.assign(new Error("Reconnect Google Calendar."),{status:401,code:"GOOGLE_RECONNECT_REQUIRED"});
  const form=new URLSearchParams({client_id:process.env.GOOGLE_CALENDAR_CLIENT_ID,client_secret:process.env.GOOGLE_CALENDAR_CLIENT_SECRET,refresh_token:decryptSecret(tokenRec.refreshToken),grant_type:"refresh_token"});
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form}),j=await r.json();if(!r.ok)throw new Error("Google token refresh failed.");
  const updated={...tokenRec,accessToken:(await import("../../server/v6/security.js")).encryptSecret(j.access_token),expiresAt:Date.now()+Number(j.expires_in||3600)*1000,updatedAt:Date.now()};await ctx.db.ref(`qrajn/v6/integrationTokens/${ctx.uid}/googleCalendar`).set(updated);return j.access_token;
}
export default async function handler(request,response){
  try{
    method(request,"POST");const ctx=await context(request),tokenRec=(await ctx.db.ref(`qrajn/v6/integrationTokens/${ctx.uid}/googleCalendar`).get()).val();if(!tokenRec)throw Object.assign(new Error("Connect Google Calendar first."),{status:503,code:"CONFIGURATION_REQUIRED"});
    const body=parseBody(request),token=await accessToken(ctx,tokenRec),event={summary:clean(body.summary||"QR AJN booking",200),description:clean(body.description,2000),start:{dateTime:String(body.start),timeZone:clean(body.timezone||"Asia/Kolkata",80)},end:{dateTime:String(body.end),timeZone:clean(body.timezone||"Asia/Kolkata",80)},attendees:body.email?[{email:clean(body.email,200)}]:[]};
    const r=await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify(event)}),j=await r.json();if(!r.ok)throw new Error(j?.error?.message||"Calendar event failed.");
    return json(response,201,{ok:true,event:{id:j.id,htmlLink:j.htmlLink}});
  }catch(e){return fail(e,response);}
}
