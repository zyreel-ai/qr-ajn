import crypto from "node:crypto";
import {clean,safeUrl,safeEmail,safePhone,normalizeSlug} from "./security.js";
import {audit,usageSnapshot,requireLimit} from "./platform.js";
function list(v,n=30){return Array.isArray(v)?v.slice(0,n):[];}
function id(){return `bp_${crypto.randomUUID().replaceAll("-","").slice(0,16)}`;}
function sanitizeProfile(input,current={},ownerId){
  const pid=current.id||input.id||id(),slug=normalizeSlug(input.slug??current.slug??input.name??current.name??pid),socials=input.socials??current.socials??{},branding=input.branding??current.branding??{},lead=input.leadCapture??current.leadCapture??{},blocks=input.blocks??current.blocks??{};
  if(!slug)throw Object.assign(new Error("Enter a valid profile name or URL."),{status:400,code:"INVALID_SLUG"});
  return {
    ...current,id:pid,ownerId,slug,name:clean(input.name??current.name??"Profile",120),type:clean(input.type??current.type??"Professional",80),tagline:clean(input.tagline??current.tagline,180),about:clean(input.about??current.about,4000),published:input.published!==undefined?input.published!==false:current.published!==false,
    phone:safePhone(input.phone??current.phone),whatsapp:safePhone(input.whatsapp??current.whatsapp),email:safeEmail(input.email??current.email),website:safeUrl(input.website??current.website),address:clean(input.address??current.address,600),mapsUrl:safeUrl(input.mapsUrl??current.mapsUrl),hours:clean(input.hours??current.hours,500),
    logo:clean(input.logo??current.logo,2500),cover:clean(input.cover??current.cover,2500),brochure:safeUrl(input.brochure??current.brochure),googleReview:safeUrl(input.googleReview??current.googleReview),upi:clean(input.upi??current.upi,120),whatsappMessage:clean(input.whatsappMessage??current.whatsappMessage??"Hi, I found your profile through QR AJN.",500),
    socials:{instagram:safeUrl(socials.instagram),facebook:safeUrl(socials.facebook),youtube:safeUrl(socials.youtube),linkedin:safeUrl(socials.linkedin),x:safeUrl(socials.x),github:safeUrl(socials.github)},
    products:list(input.products??current.products,40).map((p,i)=>({id:clean(p?.id||`p${i+1}`,50),name:clean(p?.name,120),price:clean(p?.price,60),description:clean(p?.description,700),image:clean(p?.image,2500),available:p?.available!==false})).filter(x=>x.name),
    services:list(input.services??current.services,40).map((p,i)=>({id:clean(p?.id||`s${i+1}`,50),name:clean(p?.name,120),price:clean(p?.price,60),description:clean(p?.description,700),image:clean(p?.image,2500)})).filter(x=>x.name),
    offers:list(input.offers??current.offers,30).map((o,i)=>({id:clean(o?.id||`o${i+1}`,50),title:clean(o?.title,140),description:clean(o?.description,700),expiresAt:clean(o?.expiresAt,50),active:o?.active!==false})).filter(x=>x.title),
    blocks:{skills:clean(blocks.skills,4000),education:clean(blocks.education,7000),experience:clean(blocks.experience,7000),projects:clean(blocks.projects,7000),certifications:clean(blocks.certifications,5000),team:clean(blocks.team,5000),testimonials:clean(blocks.testimonials,5000),faq:clean(blocks.faq,5000),gallery:list(blocks.gallery,50).map(safeUrl).filter(Boolean)},
    branding:{enabled:!!branding.enabled,accent:clean(branding.accent||"#0f766e",20),background:clean(branding.background||"#ffffff",20),buttonStyle:clean(branding.buttonStyle||"soft",30),layout:clean(branding.layout||"modern",30),theme:clean(branding.theme||"teal",30),whiteLabel:!!branding.whiteLabel},
    leadCapture:{enabled:lead.enabled!==false,title:clean(lead.title||"Send an enquiry",120),askEmail:!!lead.askEmail,askMessage:lead.askMessage!==false},
    createdAt:Number(current.createdAt||input.createdAt||Date.now()),updatedAt:Date.now()
  };
}
export async function saveProfileServer(ctx,input,pid=""){
  const current=pid?(await ctx.db.ref(`qrajn/users/${ctx.uid}/businessProfiles/${pid}`).get()).val()||{}:{};
  if(!pid){const usage=await usageSnapshot(ctx.db,ctx.uid);requireLimit(ctx,"profiles",usage.profiles,1);}
  const profile=sanitizeProfile(input,current,ctx.uid);pid=profile.id;
  const occupied=await ctx.db.ref(`qrajn/publicBusinessProfiles/${profile.slug}`).get();if(occupied.exists()&&occupied.val()?.id!==pid)throw Object.assign(new Error("That public profile URL is already in use."),{status:409,code:"SLUG_TAKEN"});
  const updates={[`qrajn/users/${ctx.uid}/businessProfiles/${pid}`]:profile};
  if(current.slug&&current.slug!==profile.slug)updates[`qrajn/publicBusinessProfiles/${current.slug}`]=null;
  updates[`qrajn/publicBusinessProfiles/${profile.slug}`]=profile.published?profile:null;
  await ctx.db.ref().update(updates);await audit(ctx.db,ctx.uid,pid&&current.id?"profile.updated":"profile.created",{entityType:"profile",entityId:pid,summary:profile.name});return profile;
}
export async function softDeleteProfileServer(ctx,pid){
  const snap=await ctx.db.ref(`qrajn/users/${ctx.uid}/businessProfiles/${pid}`).get();if(!snap.exists())return false;const profile=snap.val();
  const trash={kind:"profile",id:pid,data:profile,deletedAt:Date.now(),purgeAt:Date.now()+30*86400000};
  await ctx.db.ref().update({[`qrajn/v6/trash/${ctx.uid}/profiles/${pid}`]:trash,[`qrajn/users/${ctx.uid}/businessProfiles/${pid}`]:null,[`qrajn/publicBusinessProfiles/${profile.slug}`]:null});
  await audit(ctx.db,ctx.uid,"profile.soft-deleted",{entityType:"profile",entityId:pid,summary:"Recoverable for 30 days"});return true;
}
export {sanitizeProfile};
