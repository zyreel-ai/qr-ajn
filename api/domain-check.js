import crypto from "node:crypto";
import dns from "node:dns/promises";
import { getAdmin, verifyOwnerRequest, json } from "./_admin.js";
function cleanHost(value){return String(value||"").toLowerCase().trim().replace(/^https?:\/\//,"").replace(/\/$/,"").replace(/:\d+$/g,"");}
export default async function handler(request,response){
  try{
    if(request.method!=="POST")return json(response,405,{error:"Method not allowed"});
    const user=await verifyOwnerRequest(request),{db}=getAdmin(),body=typeof request.body==="string"?JSON.parse(request.body||"{}"):request.body||{},qrId=String(body.qrId||"").slice(0,100),host=cleanHost(body.host);
    if(!qrId||!host||!host.includes("."))return json(response,400,{error:"A valid QR ID and domain are required."});
    const qrRef=db.ref(`qrajn/users/${user.uid}/qrs/${qrId}`),snap=await qrRef.get();if(!snap.exists())return json(response,404,{error:"QR code not found."});
    const current=snap.val()?.customDomain||{};const token=current.verificationToken||crypto.randomBytes(16).toString("hex");const expected=`qrajn-verification=${token}`;let verified=false;
    try{const records=await dns.resolveTxt(`_qrajn.${host}`);verified=records.some(parts=>parts.join("")===expected);}catch{}
    await qrRef.child("customDomain").set({host,verificationToken:token,verified});if(snap.val()?.short_id)await db.ref(`qrajn/publicLinks/${snap.val().short_id}/customDomain`).set({host,verificationToken:token,verified});
    return json(response,200,{verified,token,record:`_qrajn.${host} TXT ${expected}`});
  }catch(error){return json(response,(error.status || (error.code==="SERVER_NOT_CONFIGURED"?503:500)),{error:error.message||"Domain verification failed."});}
}
