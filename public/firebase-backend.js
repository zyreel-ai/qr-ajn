import { initializeApp } from "firebase/app";
import {
  getAuth, browserLocalPersistence, setPersistence, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut,
  sendPasswordResetEmail, sendEmailVerification, updateProfile,
  GoogleAuthProvider, signInWithPopup, signInAnonymously
} from "firebase/auth";
import { getDatabase, ref, get, set, update, onValue, push, serverTimestamp } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { firebaseConfig, QRAJN } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getDatabase(firebaseApp);
export const storage = getStorage(firebaseApp);
const ROOT = QRAJN.namespace;

setPersistence(auth, browserLocalPersistence).catch(() => {});

export const DEFAULT_BRANDING = Object.freeze({
  enabled: true,
  title: "Thanks for scanning",
  theme: "mint",
  background: "#f0fdfa",
  accent: "#0f766e",
  logo: ""
});
export const DEFAULT_SETTINGS = Object.freeze({
  downloadFormat: "PNG, SVG, JPG & WebP",
  timezone: "Asia/Kolkata",
  emailNotifications: true
});
export const DEFAULT_PROFILE_BRANDING = Object.freeze({
  enabled: false,
  accent: "#0f766e",
  background: "#ffffff",
  buttonStyle: "soft",
  layout: "modern"
});

function requiredUser(user = auth.currentUser) {
  if (!user || user.isAnonymous) throw new Error("Sign in to access your workspace.");
  return user;
}
function nowIso(){ return new Date().toISOString(); }
function clean(value, max=500){ return String(value ?? "").trim().slice(0,max); }
function safeHttpUrl(value){
  if(!value) return "";
  try { const u=new URL(String(value)); return ["http:","https:"].includes(u.protocol) ? u.toString() : ""; }
  catch { return ""; }
}
function safeTel(value){ return clean(value,32).replace(/[^+\d\s()-]/g,""); }
function objectValues(value){ return Object.entries(value || {}).map(([key,item]) => ({...(item || {}), id:item?.id || key})); }
function pathForUser(uid, child=""){ return `${ROOT}/users/${uid}${child?`/${child}`:""}`; }
function normalizeEvents(value){
  return Object.entries(value || {}).map(([key,item])=>{
    const timestamp=Number(item?.timestamp||0);
    return {...(item||{}),id:item?.id||key,qr_id:item?.qrId||item?.qr_id||"",when:timestamp?new Date(timestamp).toISOString():(item?.when||nowIso()),location:item?.location||"Not collected"};
  }).sort((a,b)=>new Date(b.when)-new Date(a.when));
}
function normalizeBusinessEvents(value){
  return Object.entries(value || {}).map(([key,item])=>{
    const timestamp=Number(item?.timestamp||0);
    return {...(item||{}),id:item?.id||key,when:timestamp?new Date(timestamp).toISOString():(item?.when||nowIso())};
  }).sort((a,b)=>new Date(b.when)-new Date(a.when));
}
function randomToken(length=10){
  const alphabet="abcdefghjkmnpqrstuvwxyz23456789";
  const bytes=new Uint8Array(length); crypto.getRandomValues(bytes);
  return Array.from(bytes,b=>alphabet[b%alphabet.length]).join("");
}
export function normalizeSlug(value){
  return clean(value,72).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60);
}
function sanitizeList(value, max=20){ return Array.isArray(value) ? value.slice(0,max) : []; }

export async function waitForAuthReady(){
  await new Promise(resolve=>{let done=false;const off=onAuthStateChanged(auth,()=>{if(done)return;done=true;off();resolve();});setTimeout(()=>{if(!done){done=true;off();resolve();}},5000);});
}
export function onAccountChanged(callback){ return onAuthStateChanged(auth,user=>callback(user&&!user.isAnonymous?user:null)); }
export async function signUpEmail(email,password,displayName=""){
  const cred=await createUserWithEmailAndPassword(auth,email,password);
  const name=clean(displayName,80);
  if(name) await updateProfile(cred.user,{displayName:name});
  await set(ref(db,pathForUser(cred.user.uid,"profile")),{uid:cred.user.uid,email:cred.user.email||email,displayName:name,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  sendEmailVerification(cred.user,{url:`${QRAJN.productionOrigin}/auth`}).catch(()=>{});
  return cred.user;
}
export async function signInEmail(email,password){ return (await signInWithEmailAndPassword(auth,email,password)).user; }
export async function signInGoogle(){
  const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:"select_account"});
  const user=(await signInWithPopup(auth,provider)).user;
  await update(ref(db),{
    [`${pathForUser(user.uid,"profile")}/uid`]:user.uid,
    [`${pathForUser(user.uid,"profile")}/email`]:user.email||"",
    [`${pathForUser(user.uid,"profile")}/displayName`]:user.displayName||"",
    [`${pathForUser(user.uid,"profile")}/updatedAt`]:serverTimestamp()
  });
  return user;
}
export async function resetPassword(email){ await sendPasswordResetEmail(auth,email,{url:`${QRAJN.productionOrigin}/auth`}); }
export async function signOutAccount(){ await firebaseSignOut(auth); }

export async function getWorkspaceState(user=auth.currentUser){
  user=requiredUser(user);
  const [qrsSnap,eventsSnap,brandingSnap,settingsSnap,profilesSnap,businessEventsSnap,leadsSnap,qrLeadsSnap]=await Promise.all([
    get(ref(db,pathForUser(user.uid,"qrs"))),
    get(ref(db,`${ROOT}/scanEvents/${user.uid}`)),
    get(ref(db,pathForUser(user.uid,"branding"))),
    get(ref(db,pathForUser(user.uid,"settings"))),
    get(ref(db,pathForUser(user.uid,"businessProfiles"))),
    get(ref(db,`${ROOT}/businessEvents/${user.uid}`)),
    get(ref(db,`${ROOT}/businessLeads/${user.uid}`)),
    get(ref(db,`${ROOT}/qrLeads/${user.uid}`))
  ]);
  return {
    qrs:objectValues(qrsSnap.val()).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)),
    events:normalizeEvents(eventsSnap.val()),
    branding:{...DEFAULT_BRANDING,...(brandingSnap.val()||{})},
    settings:{...DEFAULT_SETTINGS,...(settingsSnap.val()||{})},
    profiles:objectValues(profilesSnap.val()).sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0)),
    businessEvents:normalizeBusinessEvents(businessEventsSnap.val()),
    leads:objectValues(leadsSnap.val()).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)),
    qrLeads:objectValues(qrLeadsSnap.val()).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0))
  };
}

export function subscribeWorkspace(user, callback){
  user=requiredUser(user);
  const s={qrs:{},events:{},branding:null,settings:null,profiles:{},businessEvents:{},leads:{},qrLeads:{}};
  const loaded=new Set();
  const emit=()=>{if(loaded.size<8)return;callback({
    qrs:objectValues(s.qrs).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)),
    events:normalizeEvents(s.events),branding:{...DEFAULT_BRANDING,...(s.branding||{})},settings:{...DEFAULT_SETTINGS,...(s.settings||{})},
    profiles:objectValues(s.profiles).sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0)),businessEvents:normalizeBusinessEvents(s.businessEvents),leads:objectValues(s.leads).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)),qrLeads:objectValues(s.qrLeads).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0))
  });};
  const unsubs=[
    onValue(ref(db,pathForUser(user.uid,"qrs")),x=>{s.qrs=x.val()||{};loaded.add("q");emit()}),
    onValue(ref(db,`${ROOT}/scanEvents/${user.uid}`),x=>{s.events=x.val()||{};loaded.add("e");emit()}),
    onValue(ref(db,pathForUser(user.uid,"branding")),x=>{s.branding=x.val()||{};loaded.add("b");emit()}),
    onValue(ref(db,pathForUser(user.uid,"settings")),x=>{s.settings=x.val()||{};loaded.add("s");emit()}),
    onValue(ref(db,pathForUser(user.uid,"businessProfiles")),x=>{s.profiles=x.val()||{};loaded.add("p");emit()}),
    onValue(ref(db,`${ROOT}/businessEvents/${user.uid}`),x=>{s.businessEvents=x.val()||{};loaded.add("be");emit()}),
    onValue(ref(db,`${ROOT}/businessLeads/${user.uid}`),x=>{s.leads=x.val()||{};loaded.add("l");emit()}),
    onValue(ref(db,`${ROOT}/qrLeads/${user.uid}`),x=>{s.qrLeads=x.val()||{};loaded.add("ql");emit()})
  ];
  return ()=>unsubs.forEach(fn=>{try{fn()}catch{}});
}

function normalizeAdvanced(input={}){
  const labels=String(input.labels||"").split(",").map(x=>clean(x,40)).filter(Boolean).slice(0,20);
  const expiry=input.expiry||{};
  const schedule=input.schedule||{};
  const leadCapture=input.leadCapture||{};
  const smartTargeting=input.smartTargeting||{};
  const utm=input.utm||{};
  const customDomain=input.customDomain||{};
  return {
    labels,
    expiry:{enabled:!!expiry.enabled,at:clean(expiry.at,40),maxScans:Math.max(0,Number(expiry.maxScans||0)),expiredDestination:safeHttpUrl(expiry.expiredDestination)},
    schedule:{enabled:!!schedule.enabled,startAt:clean(schedule.startAt,40),endAt:clean(schedule.endAt,40),timezone:clean(schedule.timezone||"Asia/Kolkata",80),outsideDestination:safeHttpUrl(schedule.outsideDestination)},
    passwordProtected:!!input.passwordProtected,
    leadCapture:{enabled:!!leadCapture.enabled,title:clean(leadCapture.title||"Send an enquiry",120),description:clean(leadCapture.description,500),fields:sanitizeList(leadCapture.fields,10).map(x=>clean(x,20)),consentText:clean(leadCapture.consentText||"I agree to share these details with this business.",300)},
    smartTargeting:{enabled:!!smartTargeting.enabled,fallbackDestination:safeHttpUrl(smartTargeting.fallbackDestination),rules:sanitizeList(smartTargeting.rules,20).map(r=>({field:clean(r?.field,20),operator:clean(r?.operator||"equals",20),value:clean(r?.value,100),destination:safeHttpUrl(r?.destination)})).filter(r=>r.field&&r.destination)},
    utm:{enabled:!!utm.enabled,source:clean(utm.source,120),medium:clean(utm.medium,120),campaign:clean(utm.campaign,120),term:clean(utm.term,120),content:clean(utm.content,120)},
    customDomain:{host:clean(customDomain.host,200).toLowerCase().replace(/^https?:\/\//,"").replace(/\/$/,""),verificationToken:clean(customDomain.verificationToken,80),verified:!!customDomain.verified}
  };
}

export async function createQr(user,input){
  user=requiredUser(user);
  const id=`qr_${crypto.randomUUID().replaceAll("-","").slice(0,18)}`;
  const isDynamic=input.is_dynamic===true;
  let shortId="";
  if(isDynamic){for(let i=0;i<8;i++){const candidate=randomToken(9);if(!(await get(ref(db,`${ROOT}/publicLinks/${candidate}`))).exists()){shortId=candidate;break}}if(!shortId)throw new Error("Could not allocate a unique short QR link.");}
  const created=nowIso();
  const advanced=normalizeAdvanced(input);
  const qr={id,name:clean(input.name||"Untitled QR",100),type:clean(input.type||"url",24),content:String(input.content||"").slice(0,10000),destination_url:isDynamic?safeHttpUrl(input.destination_url||input.content):"",short_id:shortId,is_dynamic:isDynamic,is_active:true,archived:false,category:clean(input.category||"",80),design:input.design||{},...advanced,created_at:created,updated_at:created};
  if(isDynamic&&!qr.destination_url)throw new Error("Enter a valid http:// or https:// destination URL.");
  const updates={[`${pathForUser(user.uid,"qrs")}/${id}`]:qr};
  if(isDynamic) updates[`${ROOT}/publicLinks/${shortId}`]={shortId,ownerId:user.uid,qrId:id,destination:qr.destination_url,active:true,branding:qr.design||{},...advanced,scanCount:0,createdAt:Date.now(),updatedAt:Date.now()};
  await update(ref(db),updates);return qr;
}
export async function updateQr(user,id,patch){
  user=requiredUser(user);
  const qrRef=ref(db,`${pathForUser(user.uid,"qrs")}/${id}`);const snap=await get(qrRef);if(!snap.exists())throw new Error("QR code not found.");
  const current=snap.val();const advanced=normalizeAdvanced({...current,...patch});const next={...current,...patch,...advanced,id,updated_at:nowIso()};
  const updates={[`${pathForUser(user.uid,"qrs")}/${id}`]:next};
  if(current.is_dynamic&&current.short_id){
    const destination=safeHttpUrl(next.destination_url);if(!destination)throw new Error("Enter a valid http:// or https:// destination URL.");next.destination_url=destination;updates[`${pathForUser(user.uid,"qrs")}/${id}`]=next;
    const publicBase=`${ROOT}/publicLinks/${current.short_id}`;
    updates[`${publicBase}/destination`]=destination;
    updates[`${publicBase}/active`]=next.is_active!==false;
    updates[`${publicBase}/branding`]=next.design||{};
    updates[`${publicBase}/labels`]=advanced.labels;
    updates[`${publicBase}/expiry`]=advanced.expiry;
    updates[`${publicBase}/schedule`]=advanced.schedule;
    updates[`${publicBase}/passwordProtected`]=advanced.passwordProtected;
    updates[`${publicBase}/leadCapture`]=advanced.leadCapture;
    updates[`${publicBase}/smartTargeting`]=advanced.smartTargeting;
    updates[`${publicBase}/utm`]=advanced.utm;
    updates[`${publicBase}/customDomain`]=advanced.customDomain;
    updates[`${publicBase}/updatedAt`]=Date.now();
  }
  await update(ref(db),updates);return next;
}
export async function deleteQr(user,id){
  user=requiredUser(user);const qrRef=ref(db,`${pathForUser(user.uid,"qrs")}/${id}`);const snap=await get(qrRef);if(!snap.exists())return false;
  const qr=snap.val(),events=(await get(ref(db,`${ROOT}/scanEvents/${user.uid}`))).val()||{};const updates={[`${pathForUser(user.uid,"qrs")}/${id}`]:null};
  if(qr.short_id)updates[`${ROOT}/publicLinks/${qr.short_id}`]=null;for(const [eventId,event] of Object.entries(events))if(event?.qrId===id)updates[`${ROOT}/scanEvents/${user.uid}/${eventId}`]=null;await update(ref(db),updates);return true;
}
export async function saveBranding(user,value){user=requiredUser(user);const branding={...DEFAULT_BRANDING,...value,updatedAt:Date.now()};await update(ref(db),{[pathForUser(user.uid,"branding")]:branding,[`${ROOT}/publicBranding/${user.uid}`]:branding});return branding;}
export async function saveSettings(user,value){user=requiredUser(user);const settings={...DEFAULT_SETTINGS,...value,updatedAt:Date.now()};await set(ref(db,pathForUser(user.uid,"settings")),settings);return settings;}
export async function uploadBrandLogo(user,file){user=requiredUser(user);return uploadImage(user,file,`${ROOT}/branding/${user.uid}/logo`,1);}
async function uploadImage(user,file,path,maxMb=3){
  user=requiredUser(user);if(!file)return "";if(file.size>maxMb*1024*1024)throw new Error(`Image must be ${maxMb} MB or smaller.`);if(!["image/png","image/jpeg","image/webp"].includes(file.type))throw new Error("Use a PNG, JPG or WebP image.");
  const target=storageRef(storage,path);await uploadBytes(target,file,{contentType:file.type,cacheControl:"public,max-age=86400"});return getDownloadURL(target);
}

function normalizeProfile(input,id,ownerId){
  const slug=normalizeSlug(input.slug||input.name||id);
  return {
    id,ownerId,slug,name:clean(input.name||"Business",120),type:clean(input.type||"Shop",60),tagline:clean(input.tagline,180),about:clean(input.about,2500),published:input.published!==false,
    phone:safeTel(input.phone),whatsapp:safeTel(input.whatsapp),email:clean(input.email,160),website:safeHttpUrl(input.website),address:clean(input.address,500),mapsUrl:safeHttpUrl(input.mapsUrl),hours:clean(input.hours,300),
    logo:clean(input.logo,2000),cover:clean(input.cover,2000),brochure:safeHttpUrl(input.brochure),googleReview:safeHttpUrl(input.googleReview),upi:clean(input.upi,120),whatsappMessage:clean(input.whatsappMessage||"Hi, I found your business through QR AJN.",500),
    socials:{instagram:safeHttpUrl(input.socials?.instagram),facebook:safeHttpUrl(input.socials?.facebook),youtube:safeHttpUrl(input.socials?.youtube),linkedin:safeHttpUrl(input.socials?.linkedin),x:safeHttpUrl(input.socials?.x)},
    products:sanitizeList(input.products,30).map((p,i)=>({id:clean(p?.id||`p${i+1}`,40),name:clean(p?.name,100),price:clean(p?.price,50),description:clean(p?.description,500),image:clean(p?.image,2000),available:p?.available!==false})).filter(x=>x.name),
    services:sanitizeList(input.services,30).map((p,i)=>({id:clean(p?.id||`s${i+1}`,40),name:clean(p?.name,100),price:clean(p?.price,50),description:clean(p?.description,500)})).filter(x=>x.name),
    offers:sanitizeList(input.offers,20).map((o,i)=>({id:clean(o?.id||`o${i+1}`,40),title:clean(o?.title,120),description:clean(o?.description,500),expiresAt:clean(o?.expiresAt,40),active:o?.active!==false})).filter(x=>x.title),
    branding:{...DEFAULT_PROFILE_BRANDING,...(input.branding||{})},leadCapture:{enabled:input.leadCapture?.enabled!==false,title:clean(input.leadCapture?.title||"Send an enquiry",120),askEmail:!!input.leadCapture?.askEmail,askMessage:input.leadCapture?.askMessage!==false},
    updatedAt:Date.now(),createdAt:Number(input.createdAt||Date.now())
  };
}
export async function saveBusinessProfile(user,input,id=""){
  user=requiredUser(user);id=id||`bp_${crypto.randomUUID().replaceAll("-","").slice(0,16)}`;const existing=(await get(ref(db,`${pathForUser(user.uid,"businessProfiles")}/${id}`))).val()||{};const profile=normalizeProfile({...existing,...input},id,user.uid);
  if(!profile.slug)throw new Error("Enter a valid business name or profile URL.");
  const occupied=await get(ref(db,`${ROOT}/publicBusinessProfiles/${profile.slug}`));if(occupied.exists()&&occupied.val()?.id!==id)throw new Error("That public profile URL is already in use.");
  const updates={[`${pathForUser(user.uid,"businessProfiles")}/${id}`]:profile,[`${ROOT}/publicBusinessProfiles/${profile.slug}`]:profile};
  if(existing.slug&&existing.slug!==profile.slug)updates[`${ROOT}/publicBusinessProfiles/${existing.slug}`]=null;
  await update(ref(db),updates);return profile;
}
export async function deleteBusinessProfile(user,id){
  user=requiredUser(user);const snap=await get(ref(db,`${pathForUser(user.uid,"businessProfiles")}/${id}`));if(!snap.exists())return false;const profile=snap.val();await update(ref(db),{[`${pathForUser(user.uid,"businessProfiles")}/${id}`]:null,[`${ROOT}/publicBusinessProfiles/${profile.slug}`]:null});return true;
}
export async function uploadBusinessAsset(user,profileId,slot,file){user=requiredUser(user);const safeSlot=clean(slot,30).replace(/[^a-z0-9_-]/gi,"")||"image";return uploadImage(user,file,`${ROOT}/business/${user.uid}/${profileId}/${safeSlot}`,3);}
export async function resolveBusinessProfile(slug){const snap=await get(ref(db,`${ROOT}/publicBusinessProfiles/${normalizeSlug(slug)}`));return snap.exists()?snap.val():null;}
async function ensureScanner(){await waitForAuthReady();let scanner=auth.currentUser;if(!scanner)scanner=(await signInAnonymously(auth)).user;return scanner;}
function clientInfo(){const ua=navigator.userAgent||"";const mobile=/Android|iPhone|iPad|Mobile/i.test(ua);const browser=/Edg/i.test(ua)?"Edge":/Chrome/i.test(ua)?"Chrome":/Firefox/i.test(ua)?"Firefox":/Safari/i.test(ua)?"Safari":"Other";const os=/Android/i.test(ua)?"Android":/iPhone|iPad/i.test(ua)?"iOS":/Windows/i.test(ua)?"Windows":/Mac OS/i.test(ua)?"macOS":/Linux/i.test(ua)?"Linux":"Other";return {device:mobile?"Mobile":"Desktop",browser,os,language:String(navigator.language||"Unknown").slice(0,30),timezone:String(Intl.DateTimeFormat().resolvedOptions().timeZone||"Unknown").slice(0,80),referrer:String(document.referrer||"").slice(0,500),screen:`${screen.width||0}x${screen.height||0}`.slice(0,40)};}
export async function trackBusinessEvent(profile,eventType,meta={}){const scanner=await ensureScanner();const eventRef=push(ref(db,`${ROOT}/businessEvents/${profile.ownerId}`));const info=clientInfo();await set(eventRef,{id:eventRef.key,profileId:profile.id,profileSlug:profile.slug,eventType:clean(eventType,30),scannerUid:scanner.uid,timestamp:serverTimestamp(),...info,meta:{productId:clean(meta.productId,40),source:clean(meta.source,80)}});return eventRef.key;}
export async function submitBusinessLead(profile,input){const scanner=await ensureScanner();const eventRef=push(ref(db,`${ROOT}/businessLeads/${profile.ownerId}`));const lead={id:eventRef.key,profileId:profile.id,profileSlug:profile.slug,scannerUid:scanner.uid,name:clean(input.name,100),phone:safeTel(input.phone),email:clean(input.email,160),message:clean(input.message,1000),productId:clean(input.productId,40),consent:input.consent===true,createdAt:serverTimestamp()};if(!lead.name||!lead.phone||!lead.consent)throw new Error("Name, phone and consent are required.");await set(eventRef,lead);await trackBusinessEvent(profile,"lead",{productId:lead.productId});return lead;}

export async function resetWorkspace(user){
  user=requiredUser(user);const state=await getWorkspaceState(user),updates={};updates[pathForUser(user.uid,"qrs")]=null;updates[pathForUser(user.uid,"branding")]=null;updates[pathForUser(user.uid,"settings")]=null;updates[pathForUser(user.uid,"businessProfiles")]=null;updates[`${ROOT}/scanEvents/${user.uid}`]=null;updates[`${ROOT}/publicBranding/${user.uid}`]=null;updates[`${ROOT}/businessEvents/${user.uid}`]=null;updates[`${ROOT}/businessLeads/${user.uid}`]=null;updates[`${ROOT}/qrLeads/${user.uid}`]=null;for(const q of state.qrs)if(q.short_id)updates[`${ROOT}/publicLinks/${q.short_id}`]=null;for(const p of state.profiles)if(p.slug)updates[`${ROOT}/publicBusinessProfiles/${p.slug}`]=null;await update(ref(db),updates);try{await deleteObject(storageRef(storage,`${ROOT}/branding/${user.uid}/logo`))}catch{}
}
export async function resolvePublicLink(shortId){const snap=await get(ref(db,`${ROOT}/publicLinks/${shortId}`));if(!snap.exists())return null;const link=snap.val();if(link.active===false||!safeHttpUrl(link.destination))return null;const brandSnap=await get(ref(db,`${ROOT}/publicBranding/${link.ownerId}`));return {link,branding:{...DEFAULT_BRANDING,...(brandSnap.val()||{})}};}
export async function trackPublicScan(shortId,link){const scanner=await ensureScanner();const eventRef=push(ref(db,`${ROOT}/scanEvents/${link.ownerId}`));const id=eventRef.key;const info=clientInfo();await set(eventRef,{id,qrId:link.qrId,shortId,scannerUid:scanner.uid,timestamp:serverTimestamp(),...info,location:"Not collected"});return id;}
export { QRAJN };
