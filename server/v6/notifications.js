function configuration(message){const e=new Error(message);e.status=503;e.code="CONFIGURATION_REQUIRED";throw e;}
export async function sendEmail({to,subject,text,html}){
  if(process.env.RESEND_API_KEY){const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{authorization:`Bearer ${process.env.RESEND_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({from:process.env.EMAIL_FROM||"QR AJN <notifications@qrajn.online>",to:[to],subject,text,html})}),j=await r.json();if(!r.ok)throw new Error(j?.message||"Email provider error.");return j;}
  if(process.env.EMAIL_WEBHOOK_URL){const r=await fetch(process.env.EMAIL_WEBHOOK_URL,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({to,subject,text,html})});if(!r.ok)throw new Error("Email webhook failed.");return {ok:true};}
  configuration("Email provider is not configured.");
}
export async function sendWhatsApp({to,template,language="en",components=[]}){
  const base=process.env.WHATSAPP_GRAPH_BASE_URL,token=process.env.WHATSAPP_ACCESS_TOKEN,phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID;if(!base||!token||!phoneId)configuration("WhatsApp Business API is not configured.");
  const r=await fetch(`${base.replace(/\/$/,"")}/${phoneId}/messages`,{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to,type:"template",template:{name:template,language:{code:language},components}})}),j=await r.json();if(!r.ok)throw new Error(j?.error?.message||"WhatsApp provider error.");return j;
}
export async function sendSms(payload){if(!process.env.SMS_WEBHOOK_URL)configuration("SMS provider is not configured.");const r=await fetch(process.env.SMS_WEBHOOK_URL,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});if(!r.ok)throw new Error("SMS provider error.");return {ok:true};}
