import {getAdmin,adminReady} from "../_admin.js";
import {json} from "../../server/v6/security.js";
import {configuredIntegrations} from "../../server/v6/platform.js";
export default async function handler(request,response){
  const started=Date.now();
  const out={ok:true,service:"QR AJN V6",version:"6.0.0",time:new Date().toISOString(),firebaseAdmin:adminReady(),integrations:configuredIntegrations()};
  if(adminReady()){try{const {db}=getAdmin();await db.ref("qrajn").limitToFirst(1).get();out.database=true;}catch{out.database=false;out.ok=false;}}
  out.latencyMs=Date.now()-started;
  return json(response,out.ok?200:503,out);
}
