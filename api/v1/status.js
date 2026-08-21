import {getAdmin} from "../_admin.js";
import {json} from "../../server/v6/security.js";
export default async function handler(request,response){
  const incidents=[];let database=false;
  try{const {db}=getAdmin();await db.ref("qrajn").limitToFirst(1).get();database=true;}catch{}
  return json(response,database?200:503,{ok:database,status:database?"operational":"degraded",components:[{name:"QR resolution",status:database?"operational":"degraded"},{name:"Dashboard",status:"operational"},{name:"Database",status:database?"operational":"degraded"}],incidents,updatedAt:new Date().toISOString()});
}
