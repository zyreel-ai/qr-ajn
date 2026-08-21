import {context} from "../../server/v6/platform.js";
import {integrationCatalog} from "../../server/v6/integrations.js";
import {json,fail,method} from "../../server/v6/security.js";
export default async function handler(request,response){
  try{method(request,"GET");await context(request);return json(response,200,{ok:true,integrations:integrationCatalog()});}
  catch(e){return fail(e,response);}
}
