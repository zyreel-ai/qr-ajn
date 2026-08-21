import {getAdmin} from "../_admin.js";
import {createBackup} from "../../server/v6/backup.js";
import {json,fail} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    const auth=String(request.headers.authorization||"").replace(/^Bearer\s+/i,"");
    if(!process.env.CRON_SECRET||auth!==process.env.CRON_SECRET)throw Object.assign(new Error("Unauthorized."),{status:401,code:"AUTH_REQUIRED"});
    const admin=getAdmin(),result=await createBackup(admin);return json(response,200,{ok:true,...result});
  }catch(e){return fail(e,response);}
}
