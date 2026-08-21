function configuration(){const e=new Error("AI provider is not configured. Set AI_PROVIDER_URL, AI_PROVIDER_API_KEY and AI_PROVIDER_MODEL.");e.status=503;e.code="CONFIGURATION_REQUIRED";throw e;}
const TASKS={
  profile_content:"Write concise, trustworthy business profile copy. Do not invent claims, ratings, prices or certifications.",
  lead_reply:"Draft a professional response to this customer lead. Do not promise unavailable products or services.",
  performance_advice:"Analyze the supplied QR/profile metrics and suggest concrete conversion improvements.",
  translate:"Translate the supplied profile content while preserving business facts and formatting.",
  layout:"Suggest an ordered profile block layout based only on the supplied category and available content."
};
export async function runAi(task,input){
  if(!process.env.AI_PROVIDER_URL||!process.env.AI_PROVIDER_API_KEY||!process.env.AI_PROVIDER_MODEL)configuration();
  if(!TASKS[task])throw Object.assign(new Error("Unsupported AI task."),{status:400,code:"INVALID_AI_TASK"});
  const prompt=`${TASKS[task]}\n\nINPUT:\n${JSON.stringify(input).slice(0,25000)}`;
  const r=await fetch(process.env.AI_PROVIDER_URL,{method:"POST",headers:{authorization:`Bearer ${process.env.AI_PROVIDER_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({model:process.env.AI_PROVIDER_MODEL,input:prompt})});
  const j=await r.json();if(!r.ok)throw Object.assign(new Error(j?.error?.message||"AI provider request failed."),{status:502,code:"AI_PROVIDER_ERROR"});
  const text=j.output_text||j.text||j.choices?.[0]?.message?.content||"";
  return {text:String(text).slice(0,20000),provider:"configured"};
}
