import { qrSvg } from "./qr-engine.js";
import {
  auth, QRAJN, DEFAULT_BRANDING, DEFAULT_SETTINGS,
  waitForAuthReady, onAccountChanged, signUpEmail, signInEmail, signInGoogle,
  resetPassword, signOutAccount, getWorkspaceState, subscribeWorkspace,
  createQr, updateQr, deleteQr as firebaseDeleteQr, saveBranding as firebaseSaveBranding,
  saveSettings as firebaseSaveSettings, uploadBrandLogo, resetWorkspace,
  resolvePublicLink, trackPublicScan
} from "./firebase-backend.js";

const app = document.querySelector("#app");
const toastRoot = document.querySelector("#toast-root");
let state = { qrs: [], events: [], branding: {...DEFAULT_BRANDING}, settings: {...DEFAULT_SETTINGS} };
const appConfig = {
  authMode: "firebase",
  firebaseConfigured: true,
  dataProvider: "realtime-database",
  publicBaseUrl: QRAJN.productionOrigin,
  firebaseProjectId: QRAJN.firebaseProjectId
};
let session = null;
let liveUnsubscribe = null;
let authUnsubscribe = null;

const icons = {
  qr:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zm4 4h3v3h-3m0-7h3v3m-7 4h3"/></svg>`,
  chart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/></svg>`,
  plus:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>`,
  palette:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h2a7 7 0 0 0-2-10Z"/><circle cx="7.5" cy="10" r=".5" fill="currentColor"/><circle cx="9" cy="6.5" r=".5" fill="currentColor"/></svg>`,
  gear:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>`,
  blog:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`,
  link:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></svg>`,
  wifi:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.5a10 10 0 0 1 14 0M8 16a6 6 0 0 1 8 0M11 19.5a2 2 0 0 1 2 0"/></svg>`,
  mail:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>`,
  phone:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h4l2 5-3 2a16 16 0 0 0 5 5l2-3 5 2v4c0 1-1 2-2 2C10 21 3 14 3 6c0-1 1-2 2-2Z"/></svg>`,
  pin:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></svg>`
};
function brandMark(){ return `<span class="brandmark">${icons.qr}</span>`; }
function toast(msg, kind="default"){
  const el=document.createElement("div");el.className=`toast ${kind}`;el.setAttribute("role","status");el.setAttribute("aria-live","polite");el.textContent=msg;toastRoot.appendChild(el);setTimeout(()=>el.remove(),3200);
}
function friendlyFirebaseError(error){
  const code=String(error?.code||"");
  const map={
    "auth/email-already-in-use":"An account already exists with this email.",
    "auth/invalid-email":"Enter a valid email address.",
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/wrong-password":"Email or password is incorrect.",
    "auth/weak-password":"Use a stronger password with at least 6 characters.",
    "auth/too-many-requests":"Too many attempts. Try again later.",
    "auth/popup-closed-by-user":"Google sign-in was closed.",
    "auth/operation-not-allowed":"This Firebase sign-in provider is not enabled yet.",
    "auth/unauthorized-domain":"Add this domain to Firebase Authentication → Authorized domains.",
    "auth/network-request-failed":"Network error. Check your internet connection."
  };
  return map[code]||error?.message||"Something went wrong.";
}
async function api(url, options={}) {
  if(!session?.user)throw Object.assign(new Error("Authentication required."),{status:401});
  const method=String(options.method||"GET").toUpperCase();
  const payload=options.body?JSON.parse(options.body):{};
  if(url==="/api/state"&&method==="GET")return getWorkspaceState(session.user);
  if(url==="/api/qrs"&&method==="POST")return createQr(session.user,payload);
  const qrMatch=url.match(/^\/api\/qrs\/([^/]+)$/);
  if(qrMatch&&method==="PUT")return updateQr(session.user,decodeURIComponent(qrMatch[1]),payload);
  if(qrMatch&&method==="DELETE")return firebaseDeleteQr(session.user,decodeURIComponent(qrMatch[1]));
  if(url==="/api/branding"&&method==="POST")return firebaseSaveBranding(session.user,payload);
  if(url==="/api/settings"&&method==="POST")return firebaseSaveSettings(session.user,payload);
  if(url==="/api/reset"&&method==="POST"){await resetWorkspace(session.user);return {ok:true}}
  throw new Error(`Unsupported local Firebase operation: ${method} ${url}`);
}
async function loadState(){ if(!session?.user)return; state=await getWorkspaceState(session.user); }
function protectedPath(p=location.pathname){return p==="/dashboard"||p==="/qr-codes"||p==="/branding"||p==="/create"||p==="/settings"||/^\/qr\/[^/]+$/.test(p)}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function fmtDate(v){return new Intl.DateTimeFormat("en",{month:"short",day:"2-digit",year:"numeric"}).format(new Date(v))}
function ago(v){let s=Math.max(0,Math.round((Date.now()-new Date(v))/1000));if(s<60)return `${s}s ago`;if(s<3600)return `${Math.floor(s/60)}m ago`;if(s<86400)return `${Math.floor(s/3600)}h ago`;return `${Math.floor(s/86400)}d ago`}
function route(path){if(protectedPath(path)&&!session)path="/auth";history.pushState({}, "", path);render();}
window.addEventListener("popstate",render);
document.addEventListener("click",e=>{const a=e.target.closest("a[data-route]");if(a){e.preventDefault();route(a.getAttribute("href"))}});
function current(path){return location.pathname===path?"active":""}

function userInitial(){return (session?.user?.displayName||session?.user?.email||"U").trim().charAt(0).toUpperCase()||"U"}
function appNav(){
  const who=esc(session?.user?.displayName||session?.user?.email||"Workspace");
  return `<nav class="topnav">
    <a class="brand" href="/dashboard" data-route>${brandMark()}<span>QRForge</span></a>
    <div class="navlinks">
      <a class="${current("/dashboard")}" href="/dashboard" data-route>▦&nbsp; Dashboard</a>
      <a class="${location.pathname.startsWith("/qr")?"active":""}" href="/qr-codes" data-route>⌘&nbsp; QR Codes</a>
      <a class="${current("/branding")}" href="/branding" data-route>◉&nbsp; Branding</a>
      <a class="${current("/create")}" href="/create" data-route>⊕&nbsp; New</a>
      <a class="${current("/settings")}" href="/settings" data-route>⚙&nbsp; Settings</a>
      <a class="${current("/blog")}" href="/blog" data-route>▤&nbsp; Blog</a>
    </div>
    <div class="nav-actions"><span class="workspace-user" title="${who}">${who}</span><button class="btn primary small" onclick="route('/create')">⊕ Create</button><button class="avatar" aria-label="Sign out" title="Sign out" onclick="signOut()">${userInitial()}</button></div>
  </nav><nav class="mobile-bottom-nav" aria-label="Mobile workspace navigation">
    <a class="${current("/dashboard")}" href="/dashboard" data-route><span>▦</span><b>Home</b></a>
    <a class="${location.pathname.startsWith("/qr")?"active":""}" href="/qr-codes" data-route><span>⌘</span><b>QRs</b></a>
    <a class="mobile-create" href="/create" data-route><span>＋</span><b>Create</b></a>
    <a class="${current("/branding")}" href="/branding" data-route><span>◉</span><b>Brand</b></a>
    <a class="${current("/settings")}" href="/settings" data-route><span>⚙</span><b>Settings</b></a>
  </nav>`;
}
function landingNav(){
 return `<nav class="topnav landing-nav"><a class="brand" href="/" data-route>${brandMark()}<span>QRForge</span></a>
 <div class="navlinks"><a href="#features">Features</a><a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="/blog" data-route>Blog</a></div>
 <div class="nav-actions"><button class="btn sign-in" onclick="route('${session?"/dashboard":"/auth"}')">${session?"Dashboard":"Sign in"}</button><button class="btn primary" onclick="route('${session?"/create":"/auth"}')">Create a QR Code</button></div></nav>`;
}

function authPage(){
 return `<div class="auth-shell"><div class="auth-orb orb-one"></div><div class="auth-orb orb-two"></div><a class="brand auth-brand" href="/" data-route>${brandMark()}<span>QRForge</span></a>
 <main class="auth-card card"><div class="auth-badge">FIREBASE SECURE AUTH</div><h1 id="auth-heading">Welcome back</h1><p class="subtitle" id="auth-subtitle">Sign in to manage live QR campaigns and scan analytics.</p>
 <div class="auth-tabs"><button class="auth-tab active" onclick="setAuthMode('signin',this)">Sign in</button><button class="auth-tab" onclick="setAuthMode('signup',this)">Create account</button></div>
 <form id="auth-form" onsubmit="submitAuth(event)"><div class="field auth-name" hidden><label>Full name</label><input id="auth-name" autocomplete="name" placeholder="Your name"></div><div class="field"><label>Email</label><input id="auth-email" type="email" autocomplete="email" placeholder="you@example.com" required></div><div class="field auth-password"><label>Password</label><input id="auth-password" type="password" autocomplete="current-password" minlength="6" placeholder="At least 6 characters" required></div><button class="btn primary full auth-submit" type="submit">Sign in securely</button></form>
 <button class="auth-forgot" onclick="setAuthMode('reset')">Forgot password?</button>
 <div class="auth-divider"><span>or continue with</span></div><button class="btn full google-btn" onclick="googleSignIn()">G&nbsp; Google</button>
 <div class="auth-note"><b>Live Firebase workspace</b><span>Email/password, Google sign-in, Realtime Database and Storage are connected to project <code>${esc(appConfig.firebaseProjectId)}</code>. For scan tracking, enable Anonymous Authentication too.</span></div>
 <p class="auth-terms">Your dashboard data is isolated by Firebase UID. Public QR scans store technical analytics only; precise location is not collected.</p></main></div>`;
}
let authMode="signin";
window.setAuthMode=(mode,el)=>{authMode=mode;document.querySelectorAll('.auth-tab').forEach(x=>x.classList.remove('active'));if(el)el.classList.add('active');const name=document.querySelector('.auth-name'),pass=document.querySelector('.auth-password'),heading=document.querySelector('#auth-heading'),sub=document.querySelector('#auth-subtitle'),btn=document.querySelector('.auth-submit'),forgot=document.querySelector('.auth-forgot');if(!heading)return;if(mode==='signup'){name.hidden=false;pass.hidden=false;heading.textContent='Create your workspace';sub.textContent='Create a secure Firebase account for your QR campaigns.';btn.textContent='Create account';forgot.hidden=false}else if(mode==='reset'){name.hidden=true;pass.hidden=true;heading.textContent='Reset your password';sub.textContent='Firebase will send a secure password reset email.';btn.textContent='Send reset email';forgot.hidden=true}else{name.hidden=true;pass.hidden=false;heading.textContent='Welcome back';sub.textContent='Sign in to manage live QR campaigns and scan analytics.';btn.textContent='Sign in securely';forgot.hidden=false}}
window.submitAuth=async(e)=>{e.preventDefault();const email=document.querySelector('#auth-email').value.trim(),password=document.querySelector('#auth-password')?.value||'',displayName=document.querySelector('#auth-name')?.value||'';const btn=document.querySelector('.auth-submit');btn.disabled=true;btn.textContent='Please wait…';try{if(authMode==='reset'){await resetPassword(email);toast('Password reset email sent','success');setAuthMode('signin');return}const user=authMode==='signup'?await signUpEmail(email,password,displayName):await signInEmail(email,password);session={user};await loadState();connectLiveStream();toast(authMode==='signup'?'Account created — verification email sent':'Signed in','success');route('/dashboard')}catch(err){toast(friendlyFirebaseError(err),'error')}finally{btn.disabled=false;btn.textContent=authMode==='signup'?'Create account':authMode==='reset'?'Send reset email':'Sign in securely'}}
window.googleSignIn=async()=>{try{const user=await signInGoogle();session={user};await loadState();connectLiveStream();toast('Signed in with Google','success');route('/dashboard')}catch(err){toast(friendlyFirebaseError(err),'error')}}
window.signOut=async()=>{try{if(liveUnsubscribe){liveUnsubscribe();liveUnsubscribe=null}await signOutAccount();session=null;state={qrs:[],events:[],branding:{...DEFAULT_BRANDING},settings:{...DEFAULT_SETTINGS}};toast('Signed out');route('/')}catch(err){toast(friendlyFirebaseError(err),'error')}}
function connectLiveStream(){if(!session?.user)return;if(liveUnsubscribe){liveUnsubscribe();liveUnsubscribe=null}liveUnsubscribe=subscribeWorkspace(session.user,next=>{state=next;if(protectedPath()&&location.pathname!=="/create")render()})}

function getCounts(){
 const total=state.qrs.length, scans=state.events.length, dynamic=state.qrs.filter(q=>q.is_dynamic).length, active=state.qrs.filter(q=>q.is_active).length;
 return {total,scans,dynamic,active};
}
function lineChart(events=state.events){
 const now=new Date(); const days=[]; for(let i=29;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);const key=d.toISOString().slice(0,10);days.push({key,label:d.toLocaleDateString("en",{month:"short",day:"numeric"}),count:0})}
 for(const e of events){const x=days.find(d=>d.key===String(e.when).slice(0,10));if(x)x.count++}
 const max=Math.max(4,...days.map(d=>d.count)); const pts=days.map((d,i)=>`${20+i*(660/29)},${190-(d.count/max)*150}`).join(" ");
 const area=`20,190 ${pts} 680,190`;
 return `<svg class="line-chart" viewBox="0 0 700 215" preserveAspectRatio="none">
 <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8b5cf6" stop-opacity=".16"/><stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/></linearGradient></defs>
 ${[40,80,120,160,190].map(y=>`<line x1="20" y1="${y}" x2="680" y2="${y}" stroke="#f3f1f5"/>`).join("")}
 <polygon class="chart-fill" points="${area}"/><polyline class="chart-line" points="${pts}"/>
 <text x="20" y="210" class="axis-label">${days[0].label}</text><text x="325" y="210" class="axis-label">${days[14].label}</text><text x="635" y="210" class="axis-label">${days[29].label}</text></svg>`;
}
function deviceData(events=state.events){let mobile=0,desktop=0;for(const e of events){e.device==="Mobile"?mobile++:desktop++}return{mobile,desktop,total:Math.max(1,mobile+desktop)}}
function shell(content){return `<div class="app-shell">${appNav()}${content}</div>`}

function landing(){
 const faq = [
  ["What is a QR code?","A QR (Quick Response) code is a two-dimensional barcode that stores information such as URLs and text. A phone camera can scan it and instantly open the encoded destination."],
  ["What makes QRForge QR codes different?","QRForge combines editable dynamic destinations, clean custom designs and scan analytics in one workspace."],
  ["What analytics and insights do you provide?","Track scan totals, time trends, device type, browser, operating system and recent scan activity."],
  ["Can I customize the appearance of my QR codes?","Yes. Choose foreground and background colors, presets, error-correction level and quiet-zone margin."],
  ["Is there a limit to how many QR codes I can create?","This reconstructed local edition does not impose a software limit on QR creation."],
  ["What's the difference between Free and Pro?","The UI mirrors the Free and Pro positioning from the recording. This standalone rebuild keeps the core functionality available locally."],
  ["Can I see who has scanned my QR codes?","QRForge records technical scan metadata such as device and browser. It does not identify a person unless you deliberately build a consent-based lead-capture flow."],
  ["What file formats can I download?","SVG, PNG and JPG downloads are implemented in this build."]
 ];
 return `<div class="app-shell">${landingNav()}
 <main>
  <section class="hero">
   <div class="eyebrow">✦ Free QR Code Generator with Analytics & Tracking</div>
   <h1>Create, customize & track <span class="gradient-text">dynamic QR codes</span> in seconds</h1>
   <p>Professional QR codes for URLs, WiFi, vCards and more. Create dynamic links, customize the design and see scan analytics from one clean workspace.</p>
   <div class="hero-actions"><button class="btn primary" onclick="route('/create')">Create a QR Code →</button><button class="btn" onclick="route('/dashboard')">View Dashboard</button></div>
   <div class="trust"><span>Real-time Analytics</span><span>Custom Designs</span><span>Deep Insights</span><span>Mobile Friendly</span><span>Fast Redirects</span></div>
   <div class="numbers"><div class="number"><strong>10+</strong><span>QR code types</span></div><div class="number"><strong>∞</strong><span>Dynamic edits</span></div><div class="number"><strong>24/7</strong><span>Live tracking</span></div><div class="number"><strong>4</strong><span>Export formats</span></div></div>
  </section>
  <section class="landing-section" id="features"><div class="center-title"><div class="kicker">FEATURES</div><h2>Everything you need for smarter QR campaigns</h2></div>
   <div class="feature-cards">
    ${[
      ["⌁","Real-time Analytics","Watch scan trends, devices and recent activity update as people use your dynamic QR links."],
      ["✦","Custom QR Designs","Choose color presets, custom colors, quiet-zone margin and error correction."],
      ["↗","Dynamic Redirects","Change a destination later while keeping the same printed QR code."],
      ["▣","Enterprise-Grade Structure","A clear full-stack architecture with server-side redirect tracking and persisted data."],
      ["◫","Universal Compatibility","Responsive interface for desktop, tablet and mobile scanners."],
      ["✎","Dynamic & Editable","Edit destinations and metadata without rebuilding your campaign."]
    ].map(x=>`<div class="card feature-card"><div class="fi">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}</p></div>`).join("")}
   </div>
  </section>
  <section class="landing-section" id="how"><div class="center-title"><div class="kicker">HOW IT WORKS</div><h2>Create professional QR codes in minutes</h2></div>
   <div class="how-grid">${[
    ["1","Choose Your QR Code Type","Select URL, WiFi, vCard, SMS, email, location, text, phone and more."],
    ["2","Customize & Brand","Add colors, presets, quiet-zone spacing and error correction."],
    ["3","Generate & Download","Create a scannable QR and download SVG, PNG or JPG."],
    ["4","Track Performance","Use the dynamic redirect to record scan time and device metadata."]
   ].map(x=>`<div class="card how-card"><div class="how-num">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}</p></div>`).join("")}</div>
  </section>
  <section class="landing-section"><div class="center-title"><div class="kicker">QR CODE TYPES</div><h2>Create any type of QR code</h2></div>
   <div class="types-grid">${[
    ["Website Links","Drive traffic to landing pages",icons.link],["Email Contact","Open pre-composed emails",icons.mail],["SMS Messages","Compose text messages",icons.phone],["WiFi Access","Share network credentials",icons.wifi],
    ["Phone Numbers","Dial phone numbers instantly",icons.phone],["Digital Business Cards","Share professional contacts",icons.qr],["Location Sharing","Open map locations",icons.pin],["Custom Text","Share instructions or details",icons.blog]
   ].map(x=>`<div class="card qr-type"><div class="type-icon">${x[2]}</div><div><h4>${x[0]}</h4><p>${x[1]}</p></div></div>`).join("")}</div>
  </section>
  <section class="landing-section" id="pricing"><div class="center-title"><div class="kicker">PRICING</div><h2>Simple pricing. No tiers, no upsells.</h2></div>
   <div class="pricing-grid">
    <div class="card price-card"><b>Free</b><p class="muted">Everything you actually need — no scan limits.</p><div class="price">$0<small>/forever</small></div><button class="btn full" onclick="route('/dashboard')">Go to dashboard</button><ul class="features-list"><li>Unlimited QR codes</li><li>Unlimited scans</li><li>All QR code types</li><li>Dynamic editable QR codes</li><li>Custom colors and gradients</li><li>Real-time scan analytics</li><li>SVG, PNG and JPG downloads</li></ul></div>
    <div class="card price-card pro"><b>Pro <span class="pill">PRO</span></b><p class="muted">Power features for serious campaigns and teams.</p><div class="price">$14<small>/month</small></div><button class="btn primary full" disabled aria-disabled="true">Pro billing coming soon</button><ul class="features-list"><li>Everything in Free</li><li>Custom branded domain</li><li>Branded scan pages</li><li>Smart targeting rules</li><li>Bulk creation</li><li>Lead capture forms</li><li>CSV export</li><li>Team workspace</li></ul></div>
   </div>
  </section>
  <section class="landing-section"><div class="center-title"><div class="kicker">FAQ</div><h2>Frequently asked questions</h2></div>
   <div class="faq">${faq.map((x,i)=>`<div class="faq-item ${i===0?"open":""}"><div class="faq-q" onclick="this.parentElement.classList.toggle('open')"><span>${x[0]}</span><span>⌄</span></div><div class="faq-a">${x[1]}</div></div>`).join("")}</div>
  </section>
 </main><footer class="footer">QRForge · Dynamic QR management and analytics</footer></div>`;
}

function dashboard(){
 const c=getCounts(), dev=deviceData();
 const top=state.qrs.map(q=>({...q,scans:state.events.filter(e=>e.qr_id===q.id).length})).sort((a,b)=>b.scans-a.scans).slice(0,4);
 const recent=state.events.slice().sort((a,b)=>new Date(b.when)-new Date(a.when)).slice(0,7);
 return shell(`<main class="container"><div class="section-head"><div><h1 class="page-title">Analytics Dashboard</h1><p class="subtitle">Track real dynamic-link scans, devices, browsers and engagement across your QR campaigns in real time.</p></div><button class="btn primary" onclick="route('/create')">⊕ New QR Code</button></div>
 <div class="grid4">
  <div class="card metric"><div class="metric-icon">${icons.qr}</div><strong>${c.total}</strong><span>Total QR Codes</span></div>
  <div class="card metric"><div class="metric-icon">${icons.chart}</div><strong>${c.scans}</strong><span>Total Scans</span></div>
  <div class="card metric"><div class="metric-icon">⚡</div><strong>${c.dynamic}</strong><span>Dynamic QRs</span></div>
  <div class="card metric"><div class="metric-icon">▥</div><strong>${c.active}</strong><span>Active Campaigns</span></div>
 </div>
 <div class="analytics-grid"><div class="card chart-card"><div class="chart-title">Scans over time <span class="chart-sub">· Last 30 days</span></div>${lineChart()}</div>
 <div class="card chart-card"><div class="chart-title">Device breakdown</div><div class="donut-wrap"><div class="donut"></div><div><div><span class="legend-dot"></span> Mobile &nbsp; <b>${Math.round(dev.mobile/dev.total*100)}%</b></div>${dev.desktop?`<div class="muted" style="margin-top:8px">Desktop ${Math.round(dev.desktop/dev.total*100)}%</div>`:""}</div></div></div></div>
 <div class="lower-grid"><div class="card simple-list"><div class="chart-title">Top performing QR codes</div>${top.length?top.map((q,i)=>`<div class="list-row"><span>${i+1}. <b>${esc(q.name)}</b><br><span class="muted">${q.type.toUpperCase()} · ${q.is_dynamic?"Dynamic":"Static"}</span></span><b>${q.scans}</b></div>`).join(""):`<div class="empty">No QR codes yet.</div>`}</div>
 <div class="card simple-list"><div class="chart-title">Scanner time zones</div><div class="list-row"><span><b>Timezone captured per scan</b><div class="progress"><span style="width:100%"></span></div></span><b>${c.scans}</b></div></div></div>
 <div class="card activity"><div class="chart-title">Recent scan activity</div>${recent.length?recent.map(e=>{const q=state.qrs.find(q=>q.id===e.qr_id);return `<div class="activity-row"><div class="tiny-icon">${icons.qr}</div><div><b>${esc(q?.name||"QR")}</b><div class="muted">${esc(e.device)} · ${esc(e.browser)} · ${esc(e.location)}</div></div><span class="muted">${ago(e.when)}</span></div>`}).join(""):`<div class="empty">No scans yet. Open a dynamic redirect to generate one.</div>`}</div>
 </main>`);
}

function qrList(){
 const rows=state.qrs.map(q=>{const ev=state.events.filter(e=>e.qr_id===q.id).sort((a,b)=>new Date(b.when)-new Date(a.when));return {...q,scans:ev.length,last:ev[0]?.when}})
 return shell(`<main class="container"><div class="section-head"><div><h1 class="page-title">QR Codes</h1><p class="subtitle">All your QR codes — ${rows.length} total.</p></div><div><button class="btn small">⇩ Bulk Create <span class="pill">PRO</span></button> <button class="btn primary" onclick="route('/create')">⊕ Create QR Code</button></div></div>
 <div class="table-tools"><input class="search" id="qr-search" placeholder="Search QR codes..." oninput="filterQRs(this.value)"><span class="pill">Labels PRO</span><select class="select"><option>Status: All</option><option>Active</option></select></div>
 <div class="card table-card"><table class="table"><thead><tr><th>QR CODE</th><th>TOTAL SCANS</th><th>LAST SCAN</th><th>CREATED AT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody id="qr-tbody">
 ${rows.map(q=>`<tr data-name="${esc(q.name.toLowerCase())}"><td><div class="qr-name"><div class="qr-mini">${qrSvg(shortLink(q),{size:42,margin:1,fg:q.design?.foreground||"#17102f",bg:"#fff",ec:q.design?.errorCorrection||"M"})}</div><div><b>${esc(q.name)}</b><div class="muted">${q.type.toUpperCase()} · ${q.is_dynamic?"Dynamic":"Static"}</div></div></div></td><td>${q.scans}</td><td>${q.last?ago(q.last):"—"}</td><td>${fmtDate(q.created_at)}</td><td><span class="status">● Active</span></td><td><button class="btn small" onclick="route('/qr/${q.id}')">View</button></td></tr>`).join("")}
 </tbody></table>${!rows.length?`<div class="empty">No QR codes yet. Create your first QR code.</div>`:""}</div></main>`);
}
window.filterQRs=(value)=>{document.querySelectorAll("#qr-tbody tr").forEach(tr=>tr.style.display=tr.dataset.name.includes(value.toLowerCase())?"":"none")};

function qrDetail(id){
 const q=state.qrs.find(q=>q.id===id); if(!q)return shell(`<main class="container"><div class="empty">QR code not found.</div></main>`);
 const events=state.events.filter(e=>e.qr_id===id).sort((a,b)=>new Date(b.when)-new Date(a.when));const dev=deviceData(events), encoded=shortLink(q), dynamic=q.is_dynamic!==false;
 const settingsRows=dynamic?
  [["Short URL",encoded,"Copy"],["Domain","Default (QRForge app)","PRO"],["Branding","QRForge default","PRO"],["Expiry","Set expiry","PRO"],["Schedule","Set schedule","PRO"],["Password","Set password","PRO"],["Lead Capture","Set up lead capture","PRO"],["Smart Targeting","Add targeting rules","PRO"],["UTM Parameters","Add UTM parameters","PRO"],["Labels","Add labels","PRO"]]:
  [["QR type",q.type.toUpperCase(),""],["Error correction",q.design?.errorCorrection||"M",""],["Quiet zone",String(q.design?.quietZone||4),""],["Payload size",`${new TextEncoder().encode(q.content||"").length} bytes`,""]];
 const analytics=dynamic?`<div class="card settings-card scan-table"><div class="section-head" style="margin-bottom:8px"><h3 style="margin:0">Scan Log · ${events.length} scans</h3><button class="btn small" onclick="downloadCsv('${q.id}')">⇩ Export CSV</button></div>
   <table class="table"><thead><tr><th>WHEN</th><th>LOCATION</th><th>DEVICE</th></tr></thead><tbody>${events.map(e=>`<tr><td>${ago(e.when)}</td><td>${esc(e.location)}</td><td>${esc(e.device)} · ${esc(e.browser)}<div class="muted">${esc(e.os)}</div></td></tr>`).join("")}</tbody></table>${!events.length?`<div class="empty">No scans yet. Open the dynamic short link to generate the first analytics event.</div>`:""}
  </div>
  <div class="card analytics-panel"><div class="section-head"><div><h3 style="margin:0">Analytics</h3><p class="muted">1 Month · ${events.length} scans in range</p></div><div><button class="btn small">1 Day</button> <button class="btn small">1 Week</button> <button class="btn primary small">1 Month</button></div></div>
   <div class="split-charts"><div><div class="chart-title">Daily Scans</div>${lineChart(events)}</div><div><div class="chart-title">Device Distribution</div><div class="donut-wrap"><div class="donut"></div><div><span class="legend-dot"></span> Mobile &nbsp;<b>${Math.round(dev.mobile/dev.total*100)}%</b></div></div></div></div>
   <div class="split-charts"><div><div class="chart-title">Scanner context</div><div class="muted">Timezone, language and device are captured. Precise GPS is not requested.</div><div class="bar" style="width:${events.length?"80":"0"}%;margin-top:9px"></div></div><div><div class="chart-title">Time of Day Analysis</div><div style="display:flex;height:100px;align-items:flex-end;gap:3px">${Array.from({length:24},(_,h)=>`<span style="display:block;width:4%;height:${Math.max(2,events.filter(e=>new Date(e.when).getHours()===h).length*25)}px;background:#a78bfa;border-radius:2px"></span>`).join("")}</div></div></div>
  </div>`:`<div class="card static-info"><div class="static-info-icon">${icons.qr}</div><div><h3>Direct static QR</h3><p>This QR stores its ${esc(q.type)} payload directly. That makes it work without an internet redirect, but real scan analytics are not technically available because the scanner never contacts QRForge.</p><p class="muted">Use a Website QR when you need editable destinations and live analytics.</p></div></div>`;
 return shell(`<main class="container"><div style="margin-bottom:16px"><a href="/qr-codes" data-route class="muted">← Back to QR codes</a></div>
 <div class="detail-grid"><aside class="card qr-card"><div class="qr-box" id="detail-qr">${qrSvg(encoded,{size:220,margin:q.design?.quietZone||4,fg:q.design?.foreground||"#17102f",bg:q.design?.background||"#fff",ec:q.design?.errorCorrection||"M"})}</div><div class="qr-title">${esc(q.name)}</div><div class="muted">${dynamic?`${events.length} tracked scans`:`${q.type.toUpperCase()} · Static`}</div><div class="stat-pair"><div><strong>${dynamic?events.length:"—"}</strong><span class="muted">${dynamic?"Total Scans":"Analytics"}</span></div><div><strong>${dynamic&&events[0]?ago(events[0].when):"—"}</strong><span class="muted">Last Scan</span></div></div>
 <div class="download-grid"><button class="btn small" onclick="downloadQR('${q.id}','png')">⇩ PNG</button><button class="btn small" onclick="downloadQR('${q.id}','svg')">⇩ SVG</button><button class="btn small" onclick="downloadQR('${q.id}','jpg')">⇩ JPG</button><button class="btn small" onclick="downloadQR('${q.id}','webp')">⇩ WebP</button></div><button class="btn danger small full" style="margin-top:8px" onclick="deleteQR('${q.id}')">Delete</button></aside>
 <section>
  <div class="card settings-card"><div class="section-head" style="margin-bottom:8px"><div><span class="pill">${dynamic?"TRACKABLE · DYNAMIC":"DIRECT · STATIC"}</span> <span class="status">● Active</span></div></div>${dynamic?`<h3>Redirect destination</h3><div style="display:flex;gap:9px"><input class="search" id="dest-${q.id}" value="${esc(q.destination_url)}"><button class="btn" onclick="updateDestination('${q.id}')">✎ Save</button></div><p class="muted">Change where this QR opens without changing the QR image itself.</p>`:`<h3>${q.type.toUpperCase()} payload</h3><div class="payload-box">${esc(q.content)}</div><p class="muted">This content is embedded directly in the QR code and does not pass through a tracking redirect.</p>`}</div>
  <div class="card settings-card"><h3>Settings</h3>
   ${settingsRows.map(x=>`<div class="setting-row"><span class="label">${x[0]}</span><span class="value">${esc(x[1])}</span><span class="pro-action">${x[2]==="Copy"?`<button class="btn small" onclick="navigator.clipboard.writeText('${encoded.replaceAll("'","\\'")}');toast('Short URL copied','success')">Copy</button>`:x[2]?`<span class="pill">PRO</span> ${x[2]}`:""}</span></div>`).join("")}
  </div>
  ${analytics}
 </section></div></main>`);
}

function brandingPage(){
 const b=state.branding;
 const swatches=[["Violet","#7c3aed","#f5f3ff"],["Dark","#18181b","#f4f4f5"],["Sunset","#f97316","#fff7ed"],["Mint","#10b981","#ecfdf5"],["Sky","#3b82f6","#eff6ff"],["Amber","#d97706","#fffbeb"]];
 return shell(`<main class="container"><div class="section-head"><div><h1 class="page-title">Branding</h1><p class="subtitle">Put your brand on the page people see after they scan. Your colour, your logo, and no mention of QRForge.</p></div></div>
 <div class="brand-grid"><div class="card form-card">
 <div class="field"><label>Page title</label><input id="brand-title" value="${esc(b.title||"Thanks for scanning!")}"></div>
 <div class="field"><label>Colour theme</label><div class="swatches">${swatches.map(x=>`<button class="swatch ${String(b.theme).toLowerCase()===x[0].toLowerCase()?"active":""}" onclick="applyTheme('${x[0].toLowerCase()}','${x[1]}','${x[2]}',this)"><b style="background:${x[1]}"></b></button>`).join("")}</div></div>
 <div class="color-row"><div class="field"><label>Background</label><input type="color" id="brand-bg" value="${b.background||"#ecfdf5"}" oninput="previewBrand()"></div><div class="field"><label>Accent</label><input type="color" id="brand-accent" value="${b.accent||"#12a56b"}" oninput="previewBrand()"></div></div>
 <div class="field"><label>Logo</label><input id="brand-logo-file" type="file" accept="image/png,image/jpeg,image/webp" hidden onchange="handleBrandLogo(this)"><button class="btn full" onclick="document.querySelector('#brand-logo-file').click()">⇧ Upload PNG, JPG or WebP</button><p class="muted">Up to 250 KB. Stored with your workspace branding.</p></div>
 <button class="btn primary full" onclick="saveBranding()">♕ Save branding <span class="pill">PRO</span></button></div>
 <div><div class="chart-title">Live preview</div><div class="card live-preview"><div class="interstitial" id="brand-preview" style="background:${b.background||"#ecfdf5"}"><div class="preview-logo" id="brand-preview-logo" style="background:${b.accent||"#12a56b"}">${b.logo?`<img src="${b.logo}" alt="Brand logo">`:"B"}</div><h3 id="brand-preview-title">${esc(b.title||"Thanks for scanning!")}</h3><p class="muted">Redirecting you to your destination…</p><div class="preview-line" style="background:${b.accent||"#12a56b"}"></div></div></div><p class="muted">This is the interstitial page scanners see before being redirected.</p></div></div></main>`);
}

let createModel={type:"url",preset:"midnight",fg:"#17102f",bg:"#ffffff",ec:"M",margin:4};
function createPage(){
 const types=[["url","Website",icons.link],["wifi","WiFi",icons.wifi],["vcard","vCard",icons.qr],["email","Email",icons.mail],["sms","SMS",icons.phone],["phone","Phone",icons.phone],["location","Location",icons.pin],["text","Text",icons.blog]];
 return shell(`<main class="container"><div class="section-head"><div><h1 class="page-title">Create a QR Code</h1><p class="subtitle">Choose a type, add your content, customize the design and save a trackable QR code.</p></div></div>
 <div class="steps"><span class="step active">1 Content</span><span class="step active">2 Design</span><span class="step">3 Save</span></div>
 <div class="creator-layout"><section>
  <div class="card form-card"><h3>QR code type</h3><div class="type-grid">${types.map(x=>`<button class="type-card ${createModel.type===x[0]?"active":""}" onclick="selectType('${x[0]}')"><div style="width:25px;margin:0 auto 6px;color:#7c3aed">${x[2]}</div><b>${x[1]}</b></button>`).join("")}</div></div>
  <div class="card form-card" style="margin-top:14px"><h3>Content</h3><div class="field"><label>QR name</label><input id="qr-name" value="My QR Code" oninput="updateCreatePreview()"></div><div id="type-fields">${typeFields(createModel.type)}</div><p class="muted">Website QRs are dynamic and editable. Contact, WiFi, message and location QRs encode their payload directly for maximum compatibility.</p></div>
  <div class="card form-card" style="margin-top:14px"><h3>Design customization</h3>
   <div class="field"><label>Color presets</label><div class="swatches">${[["midnight","#17102f"],["violet","#7c3aed"],["ocean","#0ea5e9"],["inverse","#111827"],["sunset","#dc2626"],["forest","#059669"]].map(x=>`<button class="swatch ${createModel.preset===x[0]?"active":""}" onclick="setPreset('${x[0]}','${x[1]}',this)"><b style="background:${x[1]}"></b></button>`).join("")}</div></div>
   <div class="color-row"><div class="field"><label>Foreground</label><input type="color" id="qr-fg" value="${createModel.fg}" oninput="createModel.fg=this.value;updateCreatePreview()"></div><div class="field"><label>Background</label><input type="color" id="qr-bg" value="${createModel.bg}" oninput="createModel.bg=this.value;updateCreatePreview()"></div></div>
   <div class="field"><label>Error correction</label><div class="swatches">${["L","M","Q","H"].map(x=>`<button class="btn small ${createModel.ec===x?"primary":""}" onclick="createModel.ec='${x}';render()">${x}</button>`).join("")}</div><p class="muted">L fits more data; H adds the most recovery. All four levels are encoded natively.</p></div>
   <div class="field"><label>Quiet zone (margin)</label><input class="slider" type="range" min="1" max="8" value="${createModel.margin}" oninput="createModel.margin=Number(this.value);updateCreatePreview()"></div>
   <button class="btn full" onclick="toast('Logo overlay is intentionally disabled to preserve QR scannability in this dependency-free build')">⇧ Upload logo</button>
  </div>
 </section>
 <aside class="card creator-preview"><div class="chart-title">QR preview</div><div id="create-qr-preview">${qrSvg(previewCreateValue(),{size:260,margin:createModel.margin,fg:createModel.fg,bg:createModel.bg,ec:createModel.ec})}</div><p class="muted" id="preview-caption">${createModel.type==="url"?"Dynamic · destination can be changed later":"Static · payload is encoded directly in the QR"}</p><button class="btn primary full" onclick="saveQRCode()">▣ Save QR Code</button><p class="muted">Give your QR a name to save it.</p></aside>
 </div></main>`);
}
function typeFields(type){
 const map={
 url:`<div class="field"><label>Destination URL</label><input id="qr-content" value="https://example.com" oninput="updateCreatePreview()"></div>`,
 wifi:`<div class="field"><label>Network name (SSID)</label><input id="qr-content" placeholder="My WiFi" oninput="updateCreatePreview()"></div><div class="field"><label>Password</label><input id="wifi-pass" placeholder="Password" oninput="updateCreatePreview()"></div>`,
 vcard:`<div class="field"><label>Name</label><input id="qr-content" placeholder="Anjan Kumar" oninput="updateCreatePreview()"></div><div class="field"><label>Phone</label><input id="vcard-phone" placeholder="+91..." oninput="updateCreatePreview()"></div><div class="field"><label>Email</label><input id="vcard-email" placeholder="name@example.com" oninput="updateCreatePreview()"></div>`,
 email:`<div class="field"><label>Email address</label><input id="qr-content" placeholder="hello@example.com" oninput="updateCreatePreview()"></div><div class="field"><label>Subject</label><input id="email-subject" placeholder="Hello" oninput="updateCreatePreview()"></div>`,
 sms:`<div class="field"><label>Phone number</label><input id="qr-content" placeholder="+91..." oninput="updateCreatePreview()"></div><div class="field"><label>Message</label><textarea id="sms-body" oninput="updateCreatePreview()"></textarea></div>`,
 phone:`<div class="field"><label>Phone number</label><input id="qr-content" placeholder="+91..." oninput="updateCreatePreview()"></div>`,
 location:`<div class="field"><label>Latitude, Longitude</label><input id="qr-content" placeholder="17.3850, 78.4867" oninput="updateCreatePreview()"></div>`,
 text:`<div class="field"><label>Text</label><textarea id="qr-content" placeholder="Your message" oninput="updateCreatePreview()"></textarea></div>`
 }; return map[type]||map.url;
}
function previewCreateValue(){
 if(createModel.type==="url")return `${(appConfig.publicBaseUrl||location.origin).replace(/\/$/,"")}/r/preview`;
 try{return contentForType()||"QRForge"}catch{return "QRForge"}
}
window.selectType=(t)=>{createModel.type=t;render()}
window.setPreset=(name,color)=>{createModel.preset=name;createModel.fg=color;render()}
window.updateCreatePreview=()=>{const box=document.querySelector("#create-qr-preview");if(!box)return;try{box.innerHTML=qrSvg(previewCreateValue(),{size:260,margin:createModel.margin,fg:createModel.fg,bg:createModel.bg,ec:createModel.ec});const c=document.querySelector("#preview-caption");if(c)c.textContent=createModel.type==="url"?"Dynamic · destination can be changed later":"Static · payload is encoded directly in the QR"}catch(e){box.innerHTML=`<div class="qr-preview-error">${esc(e.message)}</div>`}}
function contentForType(){
 const type=createModel.type, value=document.querySelector("#qr-content")?.value||"";
 if(type==="wifi") return `WIFI:T:WPA;S:${value};P:${document.querySelector("#wifi-pass")?.value||""};;`;
 if(type==="vcard") return `BEGIN:VCARD\nVERSION:3.0\nFN:${value}\nTEL:${document.querySelector("#vcard-phone")?.value||""}\nEMAIL:${document.querySelector("#vcard-email")?.value||""}\nEND:VCARD`;
 if(type==="email") return `mailto:${value}?subject=${encodeURIComponent(document.querySelector("#email-subject")?.value||"")}`;
 if(type==="sms") return `sms:${value}?body=${encodeURIComponent(document.querySelector("#sms-body")?.value||"")}`;
 if(type==="phone") return `tel:${value}`;
 if(type==="location"){const [a,b]=value.split(",");return `geo:${(a||"").trim()},${(b||"").trim()}`}
 return value;
}

function settingsPage(){
 const s=state.settings,user=session?.user||{};
 return shell(`<main class="container"><div class="section-head"><div><h1 class="page-title">Settings</h1><p class="subtitle">Manage account, workspace preferences and production infrastructure.</p></div></div>
 <div class="settings-stack">
 <div class="card settings-card"><h3>Account</h3><div class="setting-row"><span class="label">Signed in as</span><span class="value"><b>${esc(user.displayName||user.email||"User")}</b><br><span class="muted">${esc(user.email||"")}</span></span><button class="btn small" onclick="signOut()">Sign out</button></div><div class="setting-row"><span class="label">Authentication</span><span class="value">Firebase Authentication</span><span class="data-mode">FIREBASE</span></div><div class="setting-row"><span class="label">Data storage</span><span class="value">Firebase Realtime Database</span><span class="data-mode">REALTIME</span></div></div>
 <div class="card settings-card"><div class="section-head" style="margin-bottom:8px"><div><h3 style="margin:0">Preferences</h3><p class="muted">Saved per workspace.</p></div><button class="btn primary small" onclick="saveSettings()">Save preferences</button></div>
  <div class="setting-row"><span class="label">Download format</span><span class="value"><select class="select" id="setting-format"><option ${String(s.downloadFormat).startsWith("PNG")?"selected":""}>PNG, SVG, JPG & WebP</option><option ${s.downloadFormat==="SVG preferred"?"selected":""}>SVG preferred</option><option ${s.downloadFormat==="PNG preferred"?"selected":""}>PNG preferred</option></select></span><span></span></div>
  <div class="setting-row"><span class="label">Time zone</span><span class="value"><select class="select" id="setting-timezone">${["Asia/Kolkata","UTC","Asia/Dubai","Europe/London","America/New_York"].map(z=>`<option ${s.timezone===z?"selected":""}>${z}</option>`).join("")}</select></span><span></span></div>
  <div class="setting-row"><span class="label">Email notifications</span><span class="value"><label class="toggle-line"><input type="checkbox" id="setting-email" ${s.emailNotifications?"checked":""}> <span>Send important workspace notifications</span></label></span><span></span></div>
 </div>
 <div class="card settings-card billing"><h3>Billing</h3><div class="setting-row"><span class="label">Current plan<br><span class="muted">Unlimited QR codes & scans in this rebuild</span></span><span class="value"><b>${esc(s.plan||"Free")}</b></span><span><button class="btn primary small" disabled aria-disabled="true">Billing coming soon</button></span></div><div class="feature-cards" style="grid-template-columns:repeat(3,1fr);margin-top:10px"><div class="muted">✓ Dynamic QR codes</div><div class="muted">✓ Real-time analytics</div><div class="muted">✓ Custom branding</div></div></div>
 <div class="card settings-card danger-zone"><h3>⚠ Danger Zone</h3><div class="setting-row"><span class="label">Delete all QR codes & scan data<br><span class="muted">This permanently removes this authenticated workspace's QR data.</span></span><span></span><button class="btn danger small" onclick="resetAll()">Delete workspace data</button></div></div>
 </div></main>`);
}
window.saveSettings=async()=>{try{const payload={downloadFormat:document.querySelector('#setting-format').value,timezone:document.querySelector('#setting-timezone').value,emailNotifications:document.querySelector('#setting-email').checked};state.settings=await firebaseSaveSettings(session.user,payload);toast('Preferences saved to Firebase','success')}catch(e){toast(friendlyFirebaseError(e),'error')}}

const articles=[
 ["Featured","How to Put GPS Coordinates in a QR Code","Embed latitude and longitude into a QR so scanners get instant directions in their maps app.","August 18, 2026 · 4 min read"],
 ["Guides","Embed Latitude and Longitude into QR Codes","A practical guide to location QR codes and map-friendly geo links.","August 17, 2026 · 5 min read"],
 ["Tutorials","How to Track QR Code Scans for Free (Set Up in Two Minutes)","A no-cost way to turn any QR into a trackable dynamic link and start collecting scan analytics.","August 14, 2026 · 8 min read"],
 ["Analytics","Can a QR Code Track Your Location? How QR Geolocation Actually Works","Demystifying what data a QR scan can and cannot capture.","August 13, 2026 · 5 min read"],
 ["Pro","Custom Domains: Serve Your QR Codes From Your Own Branded URL","Why a custom short domain improves trust and click-through.","August 12, 2026 · 6 min read"],
 ["Product","Introducing QRForge Pro: Power Features for Serious Campaigns and Teams","Smart targeting, lead capture, bulk creation and more.","May 24, 2026 · 4 min read"],
 ["Guides","How to Scan a QR Code on iPhone: Complete Step-by-Step Guide (2026)","The complete guide to scanning QR codes on iOS.","August 04, 2026 · 3 min read"],
 ["Analytics","Complete Guide to QR Code Analytics & Performance Tracking","Everything you can measure about a QR campaign and how to turn scan data into insight.","August 04, 2026 · 8 min read"],
 ["Basics","What Are QR Codes? A Comprehensive Guide","The history, structure and modern uses of Quick Response codes.","August 03, 2026 · 7 min read"]
];
function blogPage(){
 const f=articles[0];
 return shell(`<main class="container"><div class="section-head"><div><h1 class="page-title">Blog</h1><p class="subtitle">Guides, tutorials and product updates from the QRForge team.</p></div></div>
 <div class="card blog-feature"><div class="feature-purple"><span class="pill" style="background:#ffffff22;color:white">Featured</span><p style="opacity:.75;font-size:11px;margin-top:32px">${f[3]}</p><h2>${f[1]}</h2></div><div class="feature-copy"><span class="pill">Guides</span><p>${f[2]}</p><a class="readmore" href="#">Read article →</a></div></div>
 <div class="blog-grid">${articles.slice(2).map(a=>`<article class="card blog-card"><div class="blog-thumb"><span class="pill" style="position:relative;top:12px;left:12px">${a[0]}</span></div><div class="blog-body"><div class="muted">${a[3]}</div><h3>${a[1]}</h3><p>${a[2]}</p><a class="readmore" href="#">Read more →</a></div></article>`).join("")}</div></main>`);
}

window.applyTheme=(name,accent,bg,el)=>{document.querySelectorAll(".swatch").forEach(x=>x.classList.remove("active"));el.classList.add("active");document.querySelector("#brand-bg").value=bg;document.querySelector("#brand-accent").value=accent;el.dataset.theme=name;previewBrand();window.__theme=name}
window.previewBrand=()=>{const p=document.querySelector("#brand-preview"),t=document.querySelector("#brand-preview-title"),bg=document.querySelector("#brand-bg"),ac=document.querySelector("#brand-accent");if(!p)return;p.style.background=bg.value;p.querySelector(".preview-logo").style.background=ac.value;p.querySelector(".preview-line").style.background=ac.value;t.textContent=document.querySelector("#brand-title").value}
window.handleBrandLogo=(input)=>{const file=input.files?.[0];if(!file)return;if(file.size>1024*1024){input.value="";return toast("Logo must be 1 MB or smaller.","error")}if(!["image/png","image/jpeg","image/webp"].includes(file.type)){input.value="";return toast("Use a PNG, JPG or WebP logo.","error")}window.__brandLogoFile=file;const reader=new FileReader();reader.onload=()=>{const box=document.querySelector("#brand-preview-logo");if(box)box.innerHTML=`<img src="${reader.result}" alt="Brand logo">`;toast("Logo ready to upload","success")};reader.readAsDataURL(file)}
window.saveBranding=async()=>{try{let logo=state.branding.logo||"";if(window.__brandLogoFile){logo=await uploadBrandLogo(session.user,window.__brandLogoFile)}const payload={title:document.querySelector("#brand-title").value.trim()||"Thanks for scanning!",theme:window.__theme||state.branding.theme,background:document.querySelector("#brand-bg").value,accent:document.querySelector("#brand-accent").value,logo};state.branding=await firebaseSaveBranding(session.user,payload);window.__brandLogoFile=undefined;toast("Branding saved to Firebase","success")}catch(e){toast(friendlyFirebaseError(e),"error")}}
window.saveQRCode=async()=>{
 try{
  const name=document.querySelector("#qr-name").value.trim()||"Untitled QR", raw=contentForType();
  if(!raw.trim())return toast("Add QR content first","error");
  const isUrl=createModel.type==="url"; const limits={L:134,M:106,Q:74,H:58}; if(!isUrl&&new TextEncoder().encode(raw).length>limits[createModel.ec])return toast(`This payload is too long for ${createModel.ec} error correction. Shorten it or choose a lower level.`,"error");
  const q=await createQr(session.user,{name,type:createModel.type,content:raw,destination_url:isUrl?raw:"",is_dynamic:isUrl,design:{preset:createModel.preset,foreground:createModel.fg,background:createModel.bg,errorCorrection:createModel.ec,quietZone:createModel.margin}});
  await loadState();toast("QR code saved to Firebase","success");route(`/qr/${q.id}`);
 }catch(e){toast(friendlyFirebaseError(e),"error")}
}
window.updateDestination=async(id)=>{try{const val=document.querySelector(`#dest-${CSS.escape(id)}`).value;if(!/^https?:\/\//i.test(val))return toast("Enter a full http:// or https:// URL","error");await updateQr(session.user,id,{destination_url:val});toast("Destination updated in real time","success")}catch(e){toast(friendlyFirebaseError(e),"error")}}
window.deleteQR=async(id)=>{if(!confirm("Delete this QR code and its real scan history?"))return;try{await firebaseDeleteQr(session.user,id);toast("QR code deleted","success");route("/qr-codes")}catch(e){toast(friendlyFirebaseError(e),"error")}}
window.resetAll=async()=>{if(!confirm("Delete every QR code, scan event, branding and preference in this QR AJN workspace?"))return;try{await resetWorkspace(session.user);toast("QR workspace data deleted","success");route("/dashboard")}catch(e){toast(friendlyFirebaseError(e),"error")}}
function shortLink(q){if(q?.is_dynamic===false)return q.content||"";return `${QRAJN.productionOrigin.replace(/\/$/,"")}/r/${q.short_id}`}

window.downloadCsv=(id)=>{try{const rows=state.events.filter(e=>e.qr_id===id);const csv=["when,device,browser,os,language,timezone,referrer,screen",...rows.map(e=>[e.when,e.device,e.browser,e.os,e.language||"",e.timezone||"",e.referrer||"",e.screen||""].map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(","))].join("\n");downloadBlob(new Blob([csv],{type:"text/csv;charset=utf-8"}),"QRForge-real-scans.csv")}catch(e){toast(e.message,"error")}}

// Dependency-free QR encoder: Byte mode, versions 1–3, error correction M.
// This covers short dynamic URLs such as QRForge's /r/:shortId links.
window.downloadQR=(id,format)=>{
 const q=state.qrs.find(x=>x.id===id);if(!q)return;const svg=qrSvg(shortLink(q),{size:800,margin:q.design?.quietZone||4,fg:q.design?.foreground||"#17102f",bg:q.design?.background||"#fff",ec:q.design?.errorCorrection||"M"});
 if(format==="svg"){downloadBlob(new Blob([svg],{type:"image/svg+xml"}),`${safeName(q.name)}.svg`);return}
 const img=new Image(),blob=new Blob([svg],{type:"image/svg+xml"}),url=URL.createObjectURL(blob);img.onload=()=>{const c=document.createElement("canvas");c.width=c.height=800;const ctx=c.getContext("2d");ctx.fillStyle=q.design?.background||"#fff";ctx.fillRect(0,0,800,800);ctx.drawImage(img,0,0);URL.revokeObjectURL(url);const mime=format==="jpg"?"image/jpeg":format==="webp"?"image/webp":"image/png",ext=format==="jpg"?"jpg":format==="webp"?"webp":"png";c.toBlob(b=>downloadBlob(b,`${safeName(q.name)}.${ext}`),mime,.95)};img.src=url
}
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function safeName(s){return String(s).replace(/[^a-z0-9_-]+/gi,"_")||"QRForge"}

function render(){
 const p=location.pathname;
 if(protectedPath(p)&&!session){history.replaceState({},"","/auth");app.innerHTML=authPage();return}
 if(p==="/")app.innerHTML=landing();
 else if(p==="/auth")app.innerHTML=session?dashboard():authPage();
 else if(p==="/dashboard")app.innerHTML=dashboard();
 else if(p==="/qr-codes")app.innerHTML=qrList();
 else if(/^\/qr\/[^/]+$/.test(p))app.innerHTML=qrDetail(decodeURIComponent(p.split("/")[2]));
 else if(p==="/branding")app.innerHTML=brandingPage();
 else if(p==="/create")app.innerHTML=createPage();
 else if(p==="/settings")app.innerHTML=settingsPage();
 else if(p==="/blog")app.innerHTML=blogPage();
 else app.innerHTML=shell(`<main class="container"><div class="empty"><h2>Page not found</h2><button class="btn" onclick="route('${session?"/dashboard":"/"}')">Go back</button></div></main>`);
 window.scrollTo({top:0,behavior:"instant"});
}
window.route=route;

async function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function redirectShell(branding,status="Preparing secure redirect…"){
  const bg=branding?.background||DEFAULT_BRANDING.background, accent=branding?.accent||DEFAULT_BRANDING.accent, title=esc(branding?.title||DEFAULT_BRANDING.title), logo=branding?.logo?`<img src="${esc(branding.logo)}" alt="Brand logo">`:"Q";
  return `<div class="redirect-shell" style="--redirect-bg:${bg};--redirect-accent:${accent}"><div class="redirect-card"><div class="redirect-logo">${logo}</div><span class="redirect-badge">SECURE DYNAMIC QR</span><h1>${title}</h1><p id="redirect-status">${esc(status)}</p><div class="redirect-progress"><span></span></div><p class="redirect-privacy">A real scan event is recorded with device/browser metadata. Precise location is not requested.</p></div></div>`;
}
async function runPublicRedirect(){
  const shortId=decodeURIComponent(location.pathname.split("/")[2]||"").trim();
  app.innerHTML=redirectShell(DEFAULT_BRANDING,"Finding QR destination…");
  try{
    const resolved=await resolvePublicLink(shortId);
    if(!resolved){app.innerHTML=redirectShell(DEFAULT_BRANDING,"This QR code is inactive or no longer exists.");return}
    app.innerHTML=redirectShell(resolved.branding,"Recording scan securely…");
    try{
      await Promise.race([trackPublicScan(shortId,resolved.link),sleep(2500).then(()=>{throw new Error("tracking timeout")})]);
      const status=document.querySelector("#redirect-status");if(status)status.textContent="Scan recorded. Redirecting…";
    }catch(error){
      console.warn("Scan tracking was not completed:",error);
      const status=document.querySelector("#redirect-status");if(status)status.textContent="Redirecting…";
    }
    await sleep(450);
    location.replace(resolved.link.destination);
  }catch(error){
    console.error(error);
    app.innerHTML=redirectShell(DEFAULT_BRANDING,"Unable to open this QR code right now.");
  }
}

(async function init(){
 try{
  if(/^\/r\/[^/]+$/.test(location.pathname)){await runPublicRedirect();return}
  await waitForAuthReady();
  authUnsubscribe=onAccountChanged(async user=>{
    session=user?{user}:null;
    if(user){
      try{await loadState();connectLiveStream()}catch(error){toast(friendlyFirebaseError(error),"error")}
    }else{
      if(liveUnsubscribe){liveUnsubscribe();liveUnsubscribe=null}
      state={qrs:[],events:[],branding:{...DEFAULT_BRANDING},settings:{...DEFAULT_SETTINGS}};
    }
    if(protectedPath()&&!session)history.replaceState({},'', '/auth');
    render();
  });
  if(protectedPath()&&!auth.currentUser?.isAnonymous&&!session)history.replaceState({},'', '/auth');
  render();
 }catch(e){app.innerHTML=`<div class="boot"><div class="startup-error"><h2>QRForge could not start</h2><p>${esc(friendlyFirebaseError(e))}</p><p class="muted">Check Firebase Authentication, Authorized Domains, Realtime Database rules and your internet connection.</p></div></div>`}
})();
