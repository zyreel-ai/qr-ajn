import { initializeApp } from "firebase/app";
import {
  getAuth, browserLocalPersistence, setPersistence, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut,
  sendPasswordResetEmail, sendEmailVerification, updateProfile,
  GoogleAuthProvider, signInWithPopup, signInAnonymously
} from "firebase/auth";
import {
  getDatabase, ref, get, set, update, remove, onValue, push, serverTimestamp
} from "firebase/database";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject
} from "firebase/storage";
import { firebaseConfig, QRAJN } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getDatabase(firebaseApp);
export const storage = getStorage(firebaseApp);
const ROOT = QRAJN.namespace;

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Firebase auth persistence could not be initialized:", error);
});

export const DEFAULT_BRANDING = Object.freeze({
  title: "Thanks for scanning!",
  theme: "ocean",
  background: "#eef6ff",
  accent: "#4f46e5",
  logo: ""
});
export const DEFAULT_SETTINGS = Object.freeze({
  downloadFormat: "PNG, SVG, JPG & WebP",
  timezone: "Asia/Kolkata",
  emailNotifications: true,
  plan: "Free"
});

function requiredUser(user = auth.currentUser) {
  if (!user || user.isAnonymous) throw new Error("Sign in to access your QR workspace.");
  return user;
}
function nowIso(){ return new Date().toISOString(); }
function clean(value, max=500){ return String(value ?? "").trim().slice(0,max); }
function objectValues(value){
  return Object.entries(value || {}).map(([key, item]) => ({...(item || {}), id: item?.id || key}));
}
function normalizeEvents(value){
  return Object.entries(value || {}).map(([key, item]) => {
    const timestamp = Number(item?.timestamp || 0);
    return {
      ...(item || {}),
      id: item?.id || key,
      qr_id: item?.qrId || item?.qr_id || "",
      when: timestamp ? new Date(timestamp).toISOString() : (item?.when || nowIso()),
      location: item?.location || "Not collected"
    };
  }).sort((a,b)=>new Date(b.when)-new Date(a.when));
}
function randomToken(length=10){
  const alphabet="abcdefghjkmnpqrstuvwxyz23456789";
  const bytes=new Uint8Array(length); crypto.getRandomValues(bytes);
  return Array.from(bytes,b=>alphabet[b%alphabet.length]).join("");
}
function safeHttpUrl(value){
  try { const u=new URL(String(value)); return ["http:","https:"].includes(u.protocol) ? u.toString() : null; }
  catch { return null; }
}
function pathForUser(uid, child=""){ return `${ROOT}/users/${uid}${child?`/${child}`:""}`; }

export async function waitForAuthReady(){
  await new Promise(resolve=>{
    let done=false;
    const off=onAuthStateChanged(auth,()=>{ if(done)return; done=true; off(); resolve(); });
    setTimeout(()=>{ if(!done){done=true;off();resolve();}},5000);
  });
}
export function onAccountChanged(callback){
  return onAuthStateChanged(auth, user => callback(user && !user.isAnonymous ? user : null));
}
export async function signUpEmail(email,password,displayName=""){
  const cred=await createUserWithEmailAndPassword(auth,email,password);
  if(displayName.trim()) await updateProfile(cred.user,{displayName:displayName.trim().slice(0,80)});
  await set(ref(db,pathForUser(cred.user.uid,"profile")),{
    uid:cred.user.uid,email:cred.user.email||email,displayName:displayName.trim().slice(0,80),
    createdAt:serverTimestamp(),updatedAt:serverTimestamp()
  });
  sendEmailVerification(cred.user,{url:`${QRAJN.productionOrigin}/auth`}).catch(()=>{});
  return cred.user;
}
export async function signInEmail(email,password){
  return (await signInWithEmailAndPassword(auth,email,password)).user;
}
export async function signInGoogle(){
  const provider=new GoogleAuthProvider(); provider.setCustomParameters({prompt:"select_account"});
  const user=(await signInWithPopup(auth,provider)).user;
  await update(ref(db),{
    [`${pathForUser(user.uid,"profile")}/uid`]:user.uid,
    [`${pathForUser(user.uid,"profile")}/email`]:user.email||"",
    [`${pathForUser(user.uid,"profile")}/displayName`]:user.displayName||"",
    [`${pathForUser(user.uid,"profile")}/updatedAt`]:serverTimestamp()
  });
  return user;
}
export async function resetPassword(email){
  await sendPasswordResetEmail(auth,email,{url:`${QRAJN.productionOrigin}/auth`});
}
export async function signOutAccount(){ await firebaseSignOut(auth); }

export async function getWorkspaceState(user=auth.currentUser){
  user=requiredUser(user);
  const [qrsSnap,eventsSnap,brandingSnap,settingsSnap]=await Promise.all([
    get(ref(db,pathForUser(user.uid,"qrs"))),
    get(ref(db,`${ROOT}/scanEvents/${user.uid}`)),
    get(ref(db,pathForUser(user.uid,"branding"))),
    get(ref(db,pathForUser(user.uid,"settings")))
  ]);
  return {
    qrs: objectValues(qrsSnap.val()).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)),
    events: normalizeEvents(eventsSnap.val()),
    branding: {...DEFAULT_BRANDING,...(brandingSnap.val()||{})},
    settings: {...DEFAULT_SETTINGS,...(settingsSnap.val()||{})}
  };
}

export function subscribeWorkspace(user, callback){
  user=requiredUser(user);
  const state={qrs:{},events:{},branding:null,settings:null};
  const loaded=new Set();
  const emit=()=>{
    if(loaded.size<4)return;
    callback({
      qrs:objectValues(state.qrs).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)),
      events:normalizeEvents(state.events),
      branding:{...DEFAULT_BRANDING,...(state.branding||{})},
      settings:{...DEFAULT_SETTINGS,...(state.settings||{})}
    });
  };
  const unsubs=[
    onValue(ref(db,pathForUser(user.uid,"qrs")),s=>{state.qrs=s.val()||{};loaded.add("q");emit()}),
    onValue(ref(db,`${ROOT}/scanEvents/${user.uid}`),s=>{state.events=s.val()||{};loaded.add("e");emit()}),
    onValue(ref(db,pathForUser(user.uid,"branding")),s=>{state.branding=s.val()||{};loaded.add("b");emit()}),
    onValue(ref(db,pathForUser(user.uid,"settings")),s=>{state.settings=s.val()||{};loaded.add("s");emit()})
  ];
  return ()=>unsubs.forEach(fn=>{try{fn()}catch{}});
}

export async function createQr(user,input){
  user=requiredUser(user);
  const id=`qr_${crypto.randomUUID().replaceAll("-","").slice(0,18)}`;
  const isDynamic=input.is_dynamic===true;
  let shortId="";
  if(isDynamic){
    for(let i=0;i<8;i++){
      const candidate=randomToken(9);
      if(!(await get(ref(db,`${ROOT}/publicLinks/${candidate}`))).exists()){shortId=candidate;break}
    }
    if(!shortId)throw new Error("Could not allocate a unique short QR link.");
  }
  const created=nowIso();
  const qr={
    id,name:clean(input.name||"Untitled QR",100),type:clean(input.type||"url",24),
    content:String(input.content||"").slice(0,4000),
    destination_url:isDynamic?(safeHttpUrl(input.destination_url||input.content)||""):"",
    short_id:shortId,is_dynamic:isDynamic,is_active:true,category:clean(input.category||"",80),
    design:input.design||{},created_at:created,updated_at:created
  };
  if(isDynamic && !qr.destination_url)throw new Error("Enter a valid http:// or https:// destination URL.");
  const updates={};
  updates[`${pathForUser(user.uid,"qrs")}/${id}`]=qr;
  if(isDynamic){
    updates[`${ROOT}/publicLinks/${shortId}`]={
      shortId,ownerId:user.uid,qrId:id,destination:qr.destination_url,active:true,
      createdAt:Date.now(),updatedAt:Date.now()
    };
  }
  await update(ref(db),updates);
  return qr;
}
export async function updateQr(user,id,patch){
  user=requiredUser(user);
  const qrRef=ref(db,`${pathForUser(user.uid,"qrs")}/${id}`);
  const snap=await get(qrRef); if(!snap.exists())throw new Error("QR code not found.");
  const current=snap.val();
  const next={...current,...patch,id,updated_at:nowIso()};
  const updates={[`${pathForUser(user.uid,"qrs")}/${id}`]:next};
  if(current.is_dynamic && current.short_id){
    const destination=safeHttpUrl(next.destination_url);
    if(!destination)throw new Error("Enter a valid http:// or https:// destination URL.");
    next.destination_url=destination;
    updates[`${pathForUser(user.uid,"qrs")}/${id}`]=next;
    updates[`${ROOT}/publicLinks/${current.short_id}/destination`]=destination;
    updates[`${ROOT}/publicLinks/${current.short_id}/active`]=next.is_active!==false;
    updates[`${ROOT}/publicLinks/${current.short_id}/updatedAt`]=Date.now();
  }
  await update(ref(db),updates); return next;
}
export async function deleteQr(user,id){
  user=requiredUser(user);
  const qrRef=ref(db,`${pathForUser(user.uid,"qrs")}/${id}`);
  const snap=await get(qrRef); if(!snap.exists())return false;
  const qr=snap.val(), events=(await get(ref(db,`${ROOT}/scanEvents/${user.uid}`))).val()||{};
  const updates={[`${pathForUser(user.uid,"qrs")}/${id}`]:null};
  if(qr.short_id)updates[`${ROOT}/publicLinks/${qr.short_id}`]=null;
  for(const [eventId,event] of Object.entries(events))if(event?.qrId===id)updates[`${ROOT}/scanEvents/${user.uid}/${eventId}`]=null;
  await update(ref(db),updates); return true;
}
export async function saveBranding(user,value){
  user=requiredUser(user);
  const branding={...DEFAULT_BRANDING,...value,updatedAt:Date.now()};
  await update(ref(db),{
    [pathForUser(user.uid,"branding")]:branding,
    [`${ROOT}/publicBranding/${user.uid}`]:branding
  });
  return branding;
}
export async function saveSettings(user,value){
  user=requiredUser(user);
  const settings={...DEFAULT_SETTINGS,...value,updatedAt:Date.now()};
  await set(ref(db,pathForUser(user.uid,"settings")),settings); return settings;
}
export async function uploadBrandLogo(user,file){
  user=requiredUser(user);
  if(!file) return "";
  if(file.size>1024*1024)throw new Error("Logo must be 1 MB or smaller.");
  if(!["image/png","image/jpeg","image/webp"].includes(file.type))throw new Error("Use a PNG, JPG or WebP logo.");
  const target=storageRef(storage,`${ROOT}/branding/${user.uid}/logo`);
  await uploadBytes(target,file,{contentType:file.type,cacheControl:"public,max-age=3600"});
  return getDownloadURL(target);
}
export async function resetWorkspace(user){
  user=requiredUser(user);
  const state=await getWorkspaceState(user), updates={};
  updates[pathForUser(user.uid,"qrs")]=null;
  updates[pathForUser(user.uid,"branding")]=null;
  updates[pathForUser(user.uid,"settings")]=null;
  updates[`${ROOT}/scanEvents/${user.uid}`]=null;
  updates[`${ROOT}/publicBranding/${user.uid}`]=null;
  for(const q of state.qrs)if(q.short_id)updates[`${ROOT}/publicLinks/${q.short_id}`]=null;
  await update(ref(db),updates);
  try{await deleteObject(storageRef(storage,`${ROOT}/branding/${user.uid}/logo`))}catch{}
}
export async function resolvePublicLink(shortId){
  const snap=await get(ref(db,`${ROOT}/publicLinks/${shortId}`));
  if(!snap.exists())return null;
  const link=snap.val();
  if(link.active===false || !safeHttpUrl(link.destination))return null;
  const brandSnap=await get(ref(db,`${ROOT}/publicBranding/${link.ownerId}`));
  return {link,branding:{...DEFAULT_BRANDING,...(brandSnap.val()||{})}};
}
function clientInfo(){
  const ua=navigator.userAgent||"";
  const mobile=/Android|iPhone|iPad|Mobile/i.test(ua);
  const browser=/Edg/i.test(ua)?"Edge":/Chrome/i.test(ua)?"Chrome":/Firefox/i.test(ua)?"Firefox":/Safari/i.test(ua)?"Safari":"Other";
  const os=/Android/i.test(ua)?"Android":/iPhone|iPad/i.test(ua)?"iOS":/Windows/i.test(ua)?"Windows":/Mac OS/i.test(ua)?"macOS":/Linux/i.test(ua)?"Linux":"Other";
  return {
    device:mobile?"Mobile":"Desktop",browser,os,
    language:String(navigator.language||"Unknown").slice(0,30),
    timezone:String(Intl.DateTimeFormat().resolvedOptions().timeZone||"Unknown").slice(0,80),
    referrer:String(document.referrer||"").slice(0,500),
    screen:`${screen.width||0}x${screen.height||0}`.slice(0,40)
  };
}
export async function trackPublicScan(shortId,link){
  await waitForAuthReady();
  let scanner=auth.currentUser;
  if(!scanner)scanner=(await signInAnonymously(auth)).user;
  const eventRef=push(ref(db,`${ROOT}/scanEvents/${link.ownerId}`));
  const id=eventRef.key;
  const info=clientInfo();
  await set(eventRef,{
    id,qrId:link.qrId,shortId,scannerUid:scanner.uid,timestamp:serverTimestamp(),
    ...info,location:"Not collected"
  });
  return id;
}

export { QRAJN };
