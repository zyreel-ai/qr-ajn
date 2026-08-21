import {getAdmin} from "../_admin.js";
import {json,fail,method,parseBody,clean,safeEmail,safePhone} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{
    method(request,"POST");const body=parseBody(request),email=safeEmail(body.email);if(!email)throw Object.assign(new Error("Valid email is required."),{status:400,code:"INVALID_EMAIL"});
    const {db}=getAdmin(),ref=db.ref("qrajn/v6/salesLeads").push();await ref.set({id:ref.key,name:clean(body.name,100),company:clean(body.company,160),email,phone:safePhone(body.phone),message:clean(body.message,2000),createdAt:Date.now(),status:"new"});
    return json(response,201,{ok:true,id:ref.key});
  }catch(e){return fail(e,response);}
}
