import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

export function adminReady(){
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_DATABASE_URL);
}
export function getAdmin(){
  if(!adminReady()) throw Object.assign(new Error("Server environment is not configured."),{code:"SERVER_NOT_CONFIGURED"});
  const app=getApps()[0]||initializeApp({credential:cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g,"\n")}),databaseURL:process.env.FIREBASE_DATABASE_URL});
  return {app,auth:getAuth(app),db:getDatabase(app)};
}
export async function verifyOwnerRequest(request){
  const header=String(request.headers.authorization||request.headers.Authorization||"");
  if(!header.startsWith("Bearer ")) throw Object.assign(new Error("Sign in is required."),{status:401});
  const token=header.slice(7).trim();
  const {auth}=getAdmin();
  return auth.verifyIdToken(token);
}
export function json(response,status,body){response.status(status).setHeader("content-type","application/json; charset=utf-8").setHeader("cache-control","no-store").send(JSON.stringify(body));}
