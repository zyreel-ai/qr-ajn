import {configuredIntegrations} from "./platform.js";
export function integrationCatalog(){
  const s=configuredIntegrations();
  return [
    {id:"razorpay",name:"Razorpay",category:"payments",configured:Boolean(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET)},
    {id:"stripe",name:"Stripe",category:"payments",configured:Boolean(process.env.STRIPE_SECRET_KEY)},
    {id:"whatsapp",name:"WhatsApp Business",category:"messaging",configured:s.whatsapp},
    {id:"email",name:"Transactional Email",category:"messaging",configured:s.email},
    {id:"sms",name:"SMS / OTP",category:"messaging",configured:s.sms},
    {id:"maps",name:"Google Maps",category:"google",configured:s.maps},
    {id:"calendar",name:"Google Calendar",category:"google",configured:s.calendar},
    {id:"ai",name:"AI Provider",category:"ai",configured:s.ai},
    {id:"redis",name:"Redis Cache",category:"infrastructure",configured:s.redis},
    {id:"errorTracking",name:"Error Tracking",category:"infrastructure",configured:s.sentry},
    {id:"vercelDomains",name:"Vercel Custom Domains",category:"infrastructure",configured:s.vercelDomains},
    {id:"zapier",name:"Zapier / Make",category:"automation",configured:true,note:"Use signed QR AJN webhooks."},
    {id:"hubspot",name:"HubSpot",category:"crm",configured:Boolean(process.env.HUBSPOT_ACCESS_TOKEN)},
    {id:"zoho",name:"Zoho CRM",category:"crm",configured:Boolean(process.env.ZOHO_ACCESS_TOKEN)},
    {id:"salesforce",name:"Salesforce",category:"crm",configured:Boolean(process.env.SALESFORCE_ACCESS_TOKEN)}
  ];
}
