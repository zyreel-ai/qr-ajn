import {context,requireFeature} from "../../server/v6/platform.js";
import {json,fail,method} from "../../server/v6/security.js";
const BUILT_INS=[
  {id:"booking",name:"Booking",version:"1.0.0",blockType:"booking"},
  {id:"payment",name:"Payment Link",version:"1.0.0",blockType:"payment"},
  {id:"video",name:"Video Intro",version:"1.0.0",blockType:"video"},
  {id:"reviews",name:"Reviews & Testimonials",version:"1.0.0",blockType:"testimonials"},
  {id:"menu",name:"Menu / Price List",version:"1.0.0",blockType:"menu"}
];
export default async function handler(request,response){
  try{method(request,"GET");const ctx=await context(request);return json(response,200,{ok:true,sdkVersion:"1.0.0",plugins:BUILT_INS,thirdPartyEnabled:ctx.account.plan==="enterprise",policy:"Third-party manifests are data-only and cannot execute arbitrary code in the QR AJN origin."});}
  catch(e){return fail(e,response);}
}
