import {clean,safeEmail,safePhone} from "./security.js";
export const LEAD_STATUSES=["new","contacted","qualified","converted","lost"];
export function normalizeLead(input,id,source="manual"){return {id,name:clean(input.name,100),phone:safePhone(input.phone),email:safeEmail(input.email),message:clean(input.message,1500),status:LEAD_STATUSES.includes(input.status)?input.status:"new",notes:clean(input.notes,4000),source:clean(source,60),profileId:clean(input.profileId,100),qrId:clean(input.qrId,100),createdAt:Number(input.createdAt||Date.now()),updatedAt:Date.now()};}
export function dedupeKey(lead){return String(lead.phone||lead.email||"").replace(/\s/g,"").toLowerCase();}
