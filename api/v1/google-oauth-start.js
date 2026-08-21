import {context} from "../../server/v6/platform.js";
import {json,fail,method,hmac,randomToken} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    method(request,"GET");const ctx=await context(request);
    if(!process.env.GOOGLE_CALENDAR_CLIENT_ID||!process.env.GOOGLE_CALENDAR_CLIENT_SECRET)throw Object.assign(new Error("Google Calendar OAuth is not configured."),{status:503,code:"CONFIGURATION_REQUIRED"});
    const nonce=randomToken(16),payload=Buffer.from(JSON.stringify({uid:ctx.uid,actorUid:ctx.actorUid,nonce,exp:Date.now()+10*60000})).toString("base64url"),state=`${payload}.${hmac(payload)}`;
    await ctx.db.ref(`qrajn/v6/oauthState/${ctx.actorUid}/${nonce}`).set({uid:ctx.uid,exp:Date.now()+10*60000});
    const redirectUri=process.env.GOOGLE_CALENDAR_REDIRECT_URI||"https://www.qrajn.online/api/v1/google-oauth-callback";
    const u=new URL("https://accounts.google.com/o/oauth2/v2/auth");u.searchParams.set("client_id",process.env.GOOGLE_CALENDAR_CLIENT_ID);u.searchParams.set("redirect_uri",redirectUri);u.searchParams.set("response_type","code");u.searchParams.set("access_type","offline");u.searchParams.set("prompt","consent");u.searchParams.set("scope","https://www.googleapis.com/auth/calendar.events");u.searchParams.set("state",state);
    return json(response,200,{ok:true,url:u.toString()});
  }catch(e){return fail(e,response);}
}
