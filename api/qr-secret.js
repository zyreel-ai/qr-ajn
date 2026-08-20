import crypto from "node:crypto";
import { getAdmin, verifyOwnerRequest, json } from "./_admin.js";

function readBody(request){return typeof request.body==="string"?JSON.parse(request.body||"{}"):request.body||{};}
function hashPassword(password,salt=crypto.randomBytes(16).toString("hex")){const hash=crypto.scryptSync(String(password),salt,64).toString("hex");return {salt,hash};}
export default async function handler(request,response){
  try{
    if(!["POST","DELETE"].includes(request.method))return json(response,405,{error:"Method not allowed"});
    const user=await verifyOwnerRequest(request),{db}=getAdmin(),body=readBody(request),qrId=String(body.qrId||"").slice(0,100);
    if(!qrId)return json(response,400,{error:"QR ID is required."});
    const qrSnap=await db.ref(`qrajn/users/${user.uid}/qrs/${qrId}`).get();if(!qrSnap.exists())return json(response,404,{error:"QR code not found."});
    const secretRef=db.ref(`qrajn/qrSecrets/${qrId}`);
    if(request.method==="DELETE"){await secretRef.remove();return json(response,200,{ok:true});}
    const password=String(body.password||"");if(password.length<6||password.length>128)return json(response,400,{error:"Password must be 6 to 128 characters."});
    const secret=hashPassword(password);await secretRef.set({ownerId:user.uid,...secret,updatedAt:Date.now()});return json(response,200,{ok:true});
  }catch(error){return json(response,(error.status || (error.code==="SERVER_NOT_CONFIGURED"?503:500)),{error:error.message||"Unable to update password."});}
}
