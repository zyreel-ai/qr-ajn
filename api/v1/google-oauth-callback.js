import {getAdmin} from "../_admin.js";
import {hmac,timingSafeHex,encryptSecret} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const state=String(request.query?.state||""),code=String(request.query?.code||""),[payload,sig]=state.split(".");
    if(!payload||!sig||!timingSafeHex(hmac(payload),sig))throw new Error("Invalid OAuth state.");
    const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));if(Date.now()>Number(data.exp||0))throw new Error("OAuth state expired.");
    const {db}=getAdmin(),saved=(await db.ref(`qrajn/v6/oauthState/${data.actorUid}/${data.nonce}`).get()).val();if(!saved||saved.uid!==data.uid)throw new Error("OAuth state not found.");
    const redirectUri=process.env.GOOGLE_CALENDAR_REDIRECT_URI||"https://www.qrajn.online/api/v1/google-oauth-callback";
    const form=new URLSearchParams({code,client_id:process.env.GOOGLE_CALENDAR_CLIENT_ID,client_secret:process.env.GOOGLE_CALENDAR_CLIENT_SECRET,redirect_uri:redirectUri,grant_type:"authorization_code"});
    const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form}),j=await r.json();if(!r.ok)throw new Error(j?.error_description||"Google token exchange failed.");
    await db.ref(`qrajn/v6/integrationTokens/${data.uid}/googleCalendar`).set({accessToken:encryptSecret(j.access_token),refreshToken:j.refresh_token?encryptSecret(j.refresh_token):"",expiresAt:Date.now()+Number(j.expires_in||3600)*1000,scope:j.scope||"",updatedAt:Date.now()});
    await db.ref(`qrajn/v6/oauthState/${data.actorUid}/${data.nonce}`).remove();
    response.status(302).setHeader("location","/integrations?google=connected").end();
  }catch(error){response.status(302).setHeader("location",`/integrations?google=error`).end();}
}
