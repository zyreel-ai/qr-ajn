import {qrSvg} from "./qr-engine.js";
import {validateQrContrast,writeNfc} from "./v6-media.js";
import {startTotpEnrollment,finishTotpEnrollment,listMfa,removeMfa} from "./v6-mfa.js";

const V6_PATHS=[
  "/dashboard","/analytics","/leads","/campaigns","/templates","/media","/team","/billing","/integrations",
  "/api-webhooks","/audit","/ai","/bulk-qr","/security","/pricing","/nfc","/discovery","/agency","/notifications"
];

const icons={
  home:"⌂",profiles:"▣",qr:"▦",chart:"⌁",leads:"◎",templates:"◇",media:"▧",team:"♙",
  billing:"₹",integrations:"⌘",api:"</>",settings:"⚙",audit:"≣",ai:"✦",bulk:"▤",security:"⌾",
  campaign:"◉",nfc:"⌁",agency:"⊞",bell:"◌"
};

let runtime={session:null,state:null,esc:s=>String(s),toast:()=>{},route:()=>{}};
let meCache=null;

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const fmt=n=>new Intl.NumberFormat("en-IN",{notation:Number(n)>=100000?"compact":"standard",maximumFractionDigits:1}).format(Number(n||0));
const pct=n=>`${Math.max(0,Math.min(100,Number(n||0))).toFixed(0)}%`;
const date=v=>{const d=new Date(Number(v||v));return Number.isNaN(d.valueOf())?"—":new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(d)};
const timeAgo=v=>{const d=new Date(Number(v||v));if(Number.isNaN(d.valueOf()))return "—";const s=Math.max(0,Math.round((Date.now()-d)/1000));if(s<60)return `${s}s ago`;if(s<3600)return `${Math.floor(s/60)}m ago`;if(s<86400)return `${Math.floor(s/3600)}h ago`;return `${Math.floor(s/86400)}d ago`;};

export function v6ProtectedPath(path=location.pathname){
  return V6_PATHS.includes(path)||/^\/builder\/[^/]+$/.test(path)||/^\/qr-design\/[^/]+$/.test(path);
}

function navLink(path,label,icon){
  const active=location.pathname===path||(path==="/analytics"&&location.pathname.startsWith("/analytics"));
  return `<a class="v6-nav-item ${active?"active":""}" href="${path}" data-route><span>${icons[icon]||"•"}</span><b>${label}</b></a>`;
}

export function v6Shell(content,{session,state}={}){
  const user=session?.user,who=esc(user?.displayName||user?.email||"Workspace"),initial=who.trim().charAt(0).toUpperCase()||"U";
  return `<div class="v6-app">
    <aside class="v6-sidebar">
      <a class="v6-logo" href="/dashboard" data-route><img src="/assets/qr-ajn-logo.svg" alt=""><div><strong>QR <em>AJN</em></strong><small>V6 Platform</small></div></a>
      <div class="v6-user"><span>${initial}</span><div><b>${who}</b><small id="v6-plan-label">Workspace owner</small></div></div>
      <nav class="v6-nav">
        ${navLink("/dashboard","Dashboard","home")}
        ${navLink("/business-profiles","My Profiles","profiles")}
        ${navLink("/qr-codes","QR Codes","qr")}
        ${navLink("/analytics","Analytics","chart")}
        ${navLink("/leads","Leads / CRM","leads")}
        ${navLink("/campaigns","Campaigns","campaign")}
        ${navLink("/templates","Templates","templates")}
        ${navLink("/media","Media Library","media")}
        ${navLink("/team","Team Members","team")}
        ${navLink("/billing","Billing & Plans","billing")}
        ${navLink("/integrations","Integrations","integrations")}
        ${navLink("/api-webhooks","API & Webhooks","api")}
        ${navLink("/security","Security","security")}
        ${navLink("/audit","Audit Logs","audit")}
        ${navLink("/ai","AI Assistant","ai")}
      </nav>
      <div class="v6-sidebar-bottom">
        ${navLink("/agency","Agency / Clients","agency")}
        ${navLink("/notifications","Notifications","bell")}
        <button class="v6-theme-toggle" onclick="v6ToggleTheme()">◐ <span>Theme</span></button>
      </div>
    </aside>
    <section class="v6-main">
      <header class="v6-topbar">
        <div class="v6-search-wrap"><span>⌕</span><input id="v6-global-search" placeholder="Search QR codes, profiles, leads…" autocomplete="off"></div>
        <div class="v6-top-actions"><span class="v6-live-pill"><i></i> Live</span><button title="Notifications" onclick="route('/notifications')">◌</button><button title="Settings" onclick="route('/settings')">⚙</button><button class="v6-create" onclick="route('/create')">＋ Create New</button></div>
      </header>
      <div class="v6-page">${content}</div>
    </section>
    <nav class="v6-mobile-nav">
      ${navLink("/dashboard","Home","home")}${navLink("/qr-codes","QRs","qr")}
      <a class="v6-mobile-create" href="/create" data-route>＋</a>
      ${navLink("/leads","Leads","leads")}${navLink("/analytics","Analytics","chart")}
    </nav>
  </div>`;
}

function sparkline(values,width=640,height=190){
  const arr=values.length?values:[0,0],max=Math.max(1,...arr),min=Math.min(...arr),range=Math.max(1,max-min);
  const pts=arr.map((v,i)=>`${(i/(Math.max(1,arr.length-1))*width).toFixed(1)},${(height-((v-min)/range)*(height-30)-15).toFixed(1)}`).join(" ");
  const area=`0,${height} ${pts} ${width},${height}`;
  return `<svg class="v6-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Scan trend"><defs><linearGradient id="ajnArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><polyline points="${area}" fill="url(#ajnArea)" stroke="none"/><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`;
}
function countryMap(events){
  const map={};for(const e of events||[]){const k=e.country||"Unknown";map[k]=(map[k]||0)+1;}
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6);
}
function topProfiles(state){
  return (state.profiles||[]).map(p=>({p,views:(state.businessEvents||[]).filter(e=>e.profileId===p.id&&e.eventType==="view").length})).sort((a,b)=>b.views-a.views).slice(0,5);
}
function dashboardPage(state={}){
  const scans=(state.events||[]).filter(e=>!e.isBot&&!e.isDuplicate),leads=[...(state.leads||[]),...(state.qrLeads||[])],views=(state.businessEvents||[]).filter(e=>e.eventType==="view").length;
  const days=Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(29-i));return d.toISOString().slice(0,10)});
  const byDay=Object.fromEntries(days.map(d=>[d,0]));for(const e of scans){const d=new Date(e.when||e.timestamp||0).toISOString().slice(0,10);if(d in byDay)byDay[d]++;}
  const unique=new Set(scans.map(e=>e.visitorHash||e.scannerUid||e.id).filter(Boolean)).size,countries=countryMap(scans),top=topProfiles(state),converted=leads.filter(l=>l.status==="converted").length;
  return `<main class="v6-dashboard">
    <section class="v6-welcome"><div><span class="v6-kicker">REAL-TIME BUSINESS COMMAND CENTER</span><h1>Welcome back${runtime.session?.user?.displayName?`, ${esc(runtime.session.user.displayName.split(" ")[0])}`:""}.</h1><p>Here’s what is happening across your QR codes, profiles, leads and campaigns.</p></div><div class="v6-welcome-actions"><button class="v6-btn secondary" onclick="route('/business/new')">New profile</button><button class="v6-btn primary" onclick="route('/create')">Generate QR</button></div></section>
    <section class="v6-metrics">
      <article><span>Total scans</span><strong>${fmt(scans.length)}</strong><small>Live campaign activity</small></article>
      <article><span>Total leads</span><strong>${fmt(leads.length)}</strong><small>${converted} converted</small></article>
      <article><span>Total profiles</span><strong>${fmt((state.profiles||[]).length)}</strong><small>Business + professional</small></article>
      <article><span>Unique visitors</span><strong>${fmt(unique)}</strong><small>Privacy-safe identities</small></article>
    </section>
    <section class="v6-grid-main">
      <article class="v6-card v6-live-feed"><div class="v6-card-head"><div><h2>Live Scan Feed</h2><p>Updates automatically from Firebase.</p></div><a href="/analytics" data-route>View all</a></div>
        <div>${scans.slice(0,7).map(e=>`<div class="v6-feed-row"><span class="pulse-dot"></span><div><b>${esc(e.city||e.region||e.country||"Location unavailable")}</b><small>${esc(e.deviceName||e.device||"Device")} · ${esc(e.browser||"Browser")} ${esc(e.os||"")}</small></div><time>${timeAgo(e.when||e.timestamp)}</time></div>`).join("")||`<div class="v6-empty">Scan a dynamic QR from another device to see live activity.</div>`}</div>
      </article>
      <article class="v6-card v6-scan-chart"><div class="v6-card-head"><div><h2>Scan Analytics</h2><p>Last 30 days</p></div><button class="v6-chip" onclick="route('/analytics')">Full report</button></div>${sparkline(Object.values(byDay))}<div class="v6-chart-axis"><span>${days[0].slice(5)}</span><span>${days[14].slice(5)}</span><span>${days.at(-1).slice(5)}</span></div></article>
      <article class="v6-card"><div class="v6-card-head"><div><h2>Top Performing Profiles</h2><p>Ranked by public views</p></div></div><div class="v6-rank-list">${top.map((x,i)=>`<div><span>${i+1}</span><div><b>${esc(x.p.name)}</b><small>${esc(x.p.type||"Profile")}</small></div><strong>${fmt(x.views)}</strong></div>`).join("")||`<div class="v6-empty">No profile views yet.</div>`}</div></article>
      <article class="v6-card"><div class="v6-card-head"><div><h2>Leads Overview</h2><p>CRM pipeline</p></div><a href="/leads" data-route>Open CRM</a></div><div class="v6-donut-wrap"><div class="v6-donut" style="--p:${leads.length?Math.round(converted/leads.length*100):0}"><b>${fmt(leads.length)}</b><span>Total leads</span></div><div class="v6-legend"><span><i class="new"></i>New</span><span><i class="contacted"></i>Contacted</span><span><i class="converted"></i>Converted</span><span><i class="lost"></i>Lost</span></div></div></article>
      <article class="v6-card"><div class="v6-card-head"><div><h2>Top Countries</h2><p>City-level privacy-conscious geo</p></div></div><div class="v6-bars">${countries.map(([c,n])=>`<div><label><span>${esc(c)}</span><b>${fmt(n)}</b></label><i><u style="width:${Math.max(6,Math.round(n/Math.max(1,countries[0]?.[1]||1)*100))}%"></u></i></div>`).join("")||`<div class="v6-empty">Country analytics will appear after scans.</div>`}</div></article>
      <article class="v6-card v6-quick"><div class="v6-card-head"><div><h2>Quick Actions</h2><p>Build, publish and grow</p></div></div><div class="v6-quick-grid"><button onclick="route('/business/new')">▣<span>Create Profile</span></button><button onclick="route('/create')">▦<span>Generate QR</span></button><button onclick="route('/leads')">◎<span>Open CRM</span></button><button onclick="route('/team')">♙<span>Add Team</span></button><button onclick="route('/billing')">₹<span>Upgrade Plan</span></button><button onclick="route('/bulk-qr')">▤<span>Bulk QR</span></button></div></article>
    </section>
    <section class="v6-ai-banner"><div><span>✦</span><div><b>AI Assistant</b><small>Use your own QR AJN metrics to improve conversion, profile copy and lead replies.</small></div></div><button onclick="route('/ai')">Ask AI</button></section>
    <section class="v6-bottom-grid">
      <article class="v6-card" id="v6-usage-card"><div class="v6-card-head"><div><h2>Plan Usage</h2><p>Server-enforced limits</p></div><span class="v6-plan-badge">Loading…</span></div><div class="v6-skeleton-lines"><i></i><i></i><i></i></div></article>
      <article class="v6-card"><div class="v6-card-head"><div><h2>Recent Activity</h2><p>Realtime workspace changes</p></div></div>${[...(state.businessEvents||[]),...(state.events||[])].sort((a,b)=>new Date(b.when||b.timestamp)-new Date(a.when||a.timestamp)).slice(0,5).map(e=>`<div class="v6-activity"><span>•</span><div><b>${esc(e.eventType||"QR scan")}</b><small>${esc(e.profileSlug||e.shortId||e.deviceName||"Workspace activity")}</small></div><time>${timeAgo(e.when||e.timestamp)}</time></div>`).join("")||`<div class="v6-empty">No activity yet.</div>`}</article>
    </section>
  </main>`;
}

function analyticsPage(state={}){
  const scans=(state.events||[]).filter(e=>!e.isBot&&!e.isDuplicate),countries=countryMap(scans),devices={};
  for(const e of scans){const k=e.deviceName||e.device||"Unknown";devices[k]=(devices[k]||0)+1;}
  const dev=Object.entries(devices).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const unique=new Set(scans.map(e=>e.visitorHash||e.scannerUid||e.id).filter(Boolean)).size;
  const returning=[...new Set(scans.filter(e=>{const k=e.visitorHash||e.scannerUid;return k&&scans.filter(x=>(x.visitorHash||x.scannerUid)===k).length>1}).map(e=>e.visitorHash||e.scannerUid))].length;
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">ANALYTICS</span><h1>Realtime scan intelligence</h1><p>Privacy-safe visitor, device, browser, location and conversion analytics.</p></div><div><button class="v6-btn secondary" onclick="v6DownloadExport('scans','xls')">Excel</button><button class="v6-btn primary" onclick="v6DownloadExport('scans','csv')">CSV</button></div></section>
  <section class="v6-metrics compact"><article><span>Total scans</span><strong>${fmt(scans.length)}</strong></article><article><span>Unique visitors</span><strong>${fmt(unique)}</strong></article><article><span>Returning</span><strong>${fmt(returning)}</strong></article><article><span>Leads</span><strong>${fmt((state.leads||[]).length+(state.qrLeads||[]).length)}</strong></article></section>
  <section class="v6-analytics-grid">
    <article class="v6-card wide" id="v6-server-chart"><div class="v6-card-head"><div><h2>Server analytics</h2><p>Forecast and anomaly detection included.</p></div><select id="v6-days" onchange="v6LoadServerAnalytics()"><option>30</option><option>90</option><option>180</option><option>365</option></select></div><div class="v6-loading">Loading aggregated analytics…</div></article>
    <article class="v6-card"><h2>Devices</h2><div class="v6-bars">${dev.map(([n,v])=>`<div><label><span>${esc(n)}</span><b>${fmt(v)}</b></label><i><u style="width:${Math.max(5,Math.round(v/Math.max(1,dev[0]?.[1]||1)*100))}%"></u></i></div>`).join("")||`<div class="v6-empty">No data.</div>`}</div></article>
    <article class="v6-card"><h2>Countries</h2><div class="v6-bars">${countries.map(([n,v])=>`<div><label><span>${esc(n)}</span><b>${fmt(v)}</b></label><i><u style="width:${Math.max(5,Math.round(v/Math.max(1,countries[0]?.[1]||1)*100))}%"></u></i></div>`).join("")||`<div class="v6-empty">No data.</div>`}</div></article>
    <article class="v6-card wide"><div class="v6-card-head"><div><h2>Live scan stream</h2><p>Bot and duplicate signals are visible but excluded from primary totals.</p></div></div><div class="v6-table-wrap"><table class="v6-table"><thead><tr><th>When</th><th>Location</th><th>Device</th><th>Browser / OS</th><th>Visitor</th><th>Signal</th></tr></thead><tbody>${scans.slice(0,100).map(e=>`<tr><td>${timeAgo(e.when||e.timestamp)}</td><td>${esc([e.city,e.region,e.country].filter(Boolean).join(", ")||"Unavailable")}</td><td>${esc(e.deviceName||e.device||"Unknown")}</td><td>${esc(e.browser||"")} ${esc(e.browserVersion||"")} / ${esc(e.os||"")} ${esc(e.osVersion||"")}</td><td><code>${esc((e.visitorHash||e.scannerUid||"").slice(0,12))}</code></td><td>${e.isBot?"Bot":e.isDuplicate?"Duplicate":"Human"}</td></tr>`).join("")||`<tr><td colspan="6">No scans yet.</td></tr>`}</tbody></table></div></article>
  </section></main>`;
}

function leadsPage(state={}){
  const local=[...(state.leads||[]).map(x=>({...x,source:"profile"})),...(state.qrLeads||[]).map(x=>({...x,source:"qr"}))].sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">LEADS / MINI CRM</span><h1>Turn scans into customers</h1><p>Deduplicated contact pipeline with statuses, notes and exports.</p></div><div><button class="v6-btn secondary" onclick="v6DownloadExport('leads','xls')">Excel</button><button class="v6-btn primary" onclick="v6DownloadExport('leads','csv')">CSV</button></div></section>
  <section class="v6-crm-summary"><article><b>${fmt(local.length)}</b><span>All leads</span></article><article><b id="v6-crm-new">—</b><span>New</span></article><article><b id="v6-crm-contacted">—</b><span>Contacted</span></article><article><b id="v6-crm-converted">—</b><span>Converted</span></article></section>
  <article class="v6-card"><div class="v6-card-head"><div><h2>Lead inbox</h2><p>Search by name, phone, email or source.</p></div><input class="v6-mini-search" id="v6-lead-search" placeholder="Search leads…" oninput="v6FilterLeads()"></div><div id="v6-lead-table" class="v6-loading">Syncing CRM state…</div></article></main>`;
}

function campaignsPage(){
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">ADVERTISING SYSTEM</span><h1>Sponsored profile campaigns</h1><p>Self-serve boosts with budget controls, geo/category targeting, frequency caps and A/B creative variants.</p></div><button class="v6-btn primary" onclick="v6OpenCampaignForm()">＋ New campaign</button></section>
  <section class="v6-ad-stats"><article><span>Impressions</span><strong id="v6-ad-impressions">—</strong></article><article><span>Clicks</span><strong id="v6-ad-clicks">—</strong></article><article><span>Conversions</span><strong id="v6-ad-conversions">—</strong></article><article><span>Spend</span><strong id="v6-ad-spend">—</strong></article></section>
  <article class="v6-card"><div class="v6-card-head"><div><h2>Campaigns</h2><p>Public placements are always clearly labeled Sponsored.</p></div><a href="/ad-policy.html" target="_blank">Ad policy</a></div><div id="v6-campaign-list" class="v6-loading">Loading campaigns…</div></article>
  <dialog id="v6-campaign-dialog" class="v6-dialog"><form method="dialog" onsubmit="event.preventDefault();v6CreateCampaign()"><div class="v6-dialog-head"><h2>Create sponsored campaign</h2><button value="cancel">×</button></div><div class="v6-form-grid"><label>Name<input id="v6-ad-name" required placeholder="Weekend promotion"></label><label>Profile ID<input id="v6-ad-profile" placeholder="bp_..."></label><label>Total budget ₹<input id="v6-ad-budget" type="number" min="0" value="1000"></label><label>Daily budget ₹<input id="v6-ad-daily" type="number" min="0" value="200"></label><label>Countries<input id="v6-ad-countries" placeholder="IN, US"></label><label>Categories<input id="v6-ad-categories" placeholder="Restaurant, Clinic"></label></div><label>Sponsored title<input id="v6-ad-title" required placeholder="Discover our latest offer"></label><label>Description<textarea id="v6-ad-desc" rows="3"></textarea></label><div class="v6-dialog-actions"><button class="v6-btn secondary" value="cancel">Cancel</button><button class="v6-btn primary" type="submit">Create campaign</button></div></form></dialog></main>`;
}

const TEMPLATE_CATEGORIES=[
"Retail / Store","Restaurant / Café","Salon / Spa","Clinic / Doctor","Dental Clinic","Veterinary","Gym / Fitness","Real Estate","Builder / Project","Hotel / Resort","Events / Wedding","Photographer / Videographer","Legal / Law Firm","CA / Financial Advisor","Insurance","Consulting","Marketing / Design","Freelancer","Coworking","Institute / Coaching","Tutor","Student / Resume","Job Seeker","Personal Professional","Daycare","Automotive","Rental","Logistics","Home Services","Pet Services","Bakery / Home Chef","Tattoo / Piercing","Community","NGO","Museum / Gallery","Travel","SaaS","Government / Public Office","Artist / Musician / Author","Wedding Venue","B2B Manufacturing","Digital Creator","Product Catalogue"
];
function templatesPage(){
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">PROFILE PRESETS</span><h1>Choose a professional starting point</h1><p>Category templates provide smart defaults; your edits remain yours.</p></div></section><section class="v6-template-grid">${TEMPLATE_CATEGORIES.map((x,i)=>`<button onclick="route('/business/new?template=${encodeURIComponent(x)}')"><span>${["▣","◇","◎","✦","⌂"][i%5]}</span><b>${esc(x)}</b><small>Smart blocks + CTA defaults</small></button>`).join("")}</section></main>`;
}

function mediaPage(){
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">MEDIA LIBRARY</span><h1>Fast, optimized profile media</h1><p>Uploads are resized and converted to WebP in the browser before Firebase Storage upload.</p></div><button class="v6-btn primary" onclick="document.querySelector('#v6-media-file').click()">Upload media</button></section>
  <input id="v6-media-file" type="file" accept="image/*" multiple hidden onchange="v6PreviewMedia(this.files)"><section id="v6-media-grid" class="v6-media-grid"><div class="v6-empty-card"><b>No new media selected</b><p>Existing V5 profile images remain in Firebase Storage. New uploads use the optimized V6 pipeline automatically.</p></div></section></main>`;
}

function teamPage(){
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">TEAM & PERMISSIONS</span><h1>Collaborate without sharing passwords</h1><p>Owner, editor and viewer roles with server-side workspace isolation.</p></div><button class="v6-btn primary" onclick="v6InviteMember()">Invite member</button></section><article class="v6-card"><div id="v6-team-list" class="v6-loading">Loading team…</div></article></main>`;
}

function billingPage(){
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">PREMIUM / MONETIZATION</span><h1>Plans built for growth</h1><p>Five tiers, annual savings, trials, add-ons, grace periods and no silent data deletion on downgrade.</p></div><div class="v6-billing-toggle"><button class="active" onclick="v6BillingCycle('monthly',this)">Monthly</button><button onclick="v6BillingCycle('annual',this)">Annual · save 18%</button></div></section><section id="v6-plan-grid" class="v6-plan-grid"><div class="v6-loading">Loading plans…</div></section><section class="v6-billing-grid"><article class="v6-card" id="v6-current-billing"><div class="v6-loading">Loading subscription…</div></article><article class="v6-card"><h2>Billing principles</h2><ul class="v6-check-list"><li>Proration handled by the configured billing provider</li><li>7-day grace status for failed payments</li><li>Resources lock on downgrade; they are never silently deleted</li><li>Invoice history stays visible in your account</li><li>Enterprise uses a contact-sales quote flow</li></ul></article></section></main>`;
}

function integrationsPage(){
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">INTEGRATIONS</span><h1>Connect the tools your business already uses</h1><p>Provider cards show real configuration state. Missing credentials never produce fake success.</p></div></section><section id="v6-integration-grid" class="v6-integration-grid"><div class="v6-loading">Checking integrations…</div></section></main>`;
}

function apiPage(){
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">DEVELOPER PLATFORM</span><h1>API keys & signed webhooks</h1><p>Business/Enterprise API access with scoped keys, usage quotas and retryable webhooks.</p></div><a class="v6-btn secondary" href="/api-docs.html" target="_blank">API docs</a></section><section class="v6-two-col"><article class="v6-card"><div class="v6-card-head"><div><h2>API keys</h2><p>Keys are hashed at rest and shown only once.</p></div><button class="v6-btn primary small" onclick="v6CreateApiKey()">Create key</button></div><div id="v6-api-key-list" class="v6-loading">Loading…</div></article><article class="v6-card"><div class="v6-card-head"><div><h2>Webhooks</h2><p>HMAC-signed delivery with exponential backoff.</p></div><button class="v6-btn primary small" onclick="v6CreateWebhook()">Add webhook</button></div><div id="v6-webhook-list" class="v6-loading">Loading…</div></article></section></main>`;
}

function auditPage(){return `<main><section class="v6-page-head"><div><span class="v6-kicker">AUDIT LOG</span><h1>Sensitive actions, clearly recorded</h1><p>Plan changes, team changes, API keys, profile configuration and security events.</p></div></section><article class="v6-card"><div id="v6-audit-list" class="v6-loading">Loading audit events…</div></article></main>`;}

function aiPage(){
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">AI ASSISTANT</span><h1>Smarter business decisions, grounded in your data</h1><p>Profile writing, layout suggestions, lead replies, translation and performance advice.</p></div></section><section class="v6-ai-layout"><article class="v6-card"><label>Task<select id="v6-ai-task"><option value="performance_advice">Analyze performance</option><option value="profile_content">Write profile content</option><option value="lead_reply">Draft lead reply</option><option value="layout">Suggest profile layout</option><option value="translate">Translate content</option></select></label><label>Context<textarea id="v6-ai-input" rows="10" placeholder="Paste profile details, lead message or business context."></textarea></label><button class="v6-btn primary full" onclick="v6AskAI()">Ask AI</button></article><article class="v6-card v6-ai-result"><div class="v6-card-head"><h2>Assistant response</h2><span>Provider-backed</span></div><pre id="v6-ai-output">Your result will appear here. If no AI provider is configured, QR AJN will tell you exactly what configuration is missing.</pre></article></section></main>`;
}

function bulkPage(){
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">BULK QR</span><h1>Create many dynamic QR codes safely</h1><p>Paste CSV rows using columns: name,destination,category,labels. Server-side plan limits still apply.</p></div></section><section class="v6-two-col"><article class="v6-card"><label>CSV data<textarea id="v6-bulk-csv" rows="18" placeholder="name,destination,category,labels&#10;Store 1,https://example.com/store1,Retail,branch"></textarea></label><button class="v6-btn primary full" onclick="v6BulkCreate()">Create dynamic QRs</button></article><article class="v6-card"><h2>Bulk result</h2><div id="v6-bulk-result" class="v6-empty">Created QR links will appear here. Export them as CSV after creation.</div></article></section></main>`;
}

function securityPage(){
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">SECURITY & COMPLIANCE</span><h1>Protect accounts, data and customers</h1><p>TOTP MFA, role controls, privacy export/delete, audit logs, HSTS/CSP and server-side limits.</p></div></section><section class="v6-security-grid">
  <article class="v6-card"><h2>Authenticator app (TOTP)</h2><p>Enroll a standards-based authenticator through Firebase Multi-Factor Authentication.</p><div id="v6-mfa-state" class="v6-loading">Checking MFA…</div><button class="v6-btn primary" onclick="v6StartMfa()">Set up authenticator</button></article>
  <article class="v6-card"><h2>Privacy controls</h2><p>Export your QR AJN account data or schedule recoverable account deletion.</p><div class="v6-stack"><button class="v6-btn secondary" onclick="v6PrivacyExport()">Export my data</button><button class="v6-btn danger" onclick="v6ScheduleDelete()">Schedule account deletion</button></div></article>
  <article class="v6-card"><h2>Workspace policy</h2><label class="v6-switch"><input id="v6-require-mfa" type="checkbox"><span>Require MFA for this workspace</span></label><label>Session policy<select id="v6-session-policy"><option value="standard">Standard</option><option value="strict">Strict</option></select></label><button class="v6-btn primary" onclick="v6SaveSecurity()">Save policy</button></article>
  <article class="v6-card"><h2>Published policies</h2><div class="v6-policy-links"><a href="/privacy.html" target="_blank">Privacy Policy</a><a href="/terms.html" target="_blank">Terms of Service</a><a href="/refund.html" target="_blank">Refund Policy</a><a href="/ad-policy.html" target="_blank">Advertising Policy</a></div></article>
  </section></main>`;
}

function nfcPage(){
  const first=runtime.state?.profiles?.[0],url=first?`${location.origin}/b/${first.slug}`:location.origin;
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">NFC + QR</span><h1>Pair a tap-to-view tag with your profile</h1><p>Web NFC works on supported Android browsers; other devices can copy the exact URL into an NFC writer app.</p></div></section><article class="v6-card v6-nfc-card"><div class="v6-nfc-icon">⌁</div><label>URL<input id="v6-nfc-url" value="${esc(url)}"></label><div><button class="v6-btn primary" onclick="v6WriteNfc()">Write NFC tag</button><button class="v6-btn secondary" onclick="navigator.clipboard.writeText(document.querySelector('#v6-nfc-url').value)">Copy URL</button></div></article></main>`;
}

function discoveryPage(){
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">PUBLIC DISCOVERY</span><h1>Business directory & sponsored placements</h1><p>Featured cards are always labeled Sponsored. Organic results remain separate.</p></div><button class="v6-btn primary" onclick="route('/campaigns')">Boost a profile</button></section><div class="v6-discovery-filter"><input id="v6-discovery-category" placeholder="Category, e.g. Restaurant"><input id="v6-discovery-city" placeholder="City"><button onclick="v6LoadDiscovery()">Search</button></div><section id="v6-discovery-results" class="v6-loading">Loading discovery…</section></main>`;
}

function agencyPage(){return `<main><section class="v6-page-head"><div><span class="v6-kicker">AGENCY / RESELLER</span><h1>Manage client workspaces</h1><p>Business and Enterprise plans can maintain client records and future delegated workspaces without sharing credentials.</p></div><button class="v6-btn primary" onclick="v6AddAgencyClient()">Add client</button></section><article class="v6-card"><div id="v6-agency-list" class="v6-loading">Loading clients…</div></article></main>`;}

function notificationsPage(){return `<main><section class="v6-page-head"><div><span class="v6-kicker">NOTIFICATIONS</span><h1>Stay on top of leads and scan milestones</h1><p>Email and WhatsApp channels activate only when their provider credentials are configured.</p></div></section><article class="v6-card v6-notification-card"><label class="v6-switch"><input id="v6-notify-email" type="checkbox"><span>Email notifications</span></label><label class="v6-switch"><input id="v6-notify-whatsapp" type="checkbox"><span>WhatsApp notifications</span></label><label class="v6-switch"><input id="v6-notify-leads" type="checkbox"><span>New-lead notifications</span></label><label>Scan milestones<input id="v6-notify-milestones" placeholder="100, 1000, 10000"></label><button class="v6-btn primary" onclick="v6SaveNotifications()">Save notification settings</button></article></main>`;}

function pricingPage(){return billingPage();}

function builderPage(id,state={}){
  const p=(state.profiles||[]).find(x=>x.id===id);
  if(!p)return `<main><div class="v6-empty-card"><h2>Profile not found</h2><button class="v6-btn" onclick="route('/business-profiles')">Back to profiles</button></div></main>`;
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">BLOCK BUILDER</span><h1>${esc(p.name)}</h1><p>Drag blocks to reorder. Hidden blocks remain editable but are not rendered publicly.</p></div><div><button class="v6-btn secondary" onclick="window.open('/b/${encodeURIComponent(p.slug)}','_blank')">Public preview</button><button class="v6-btn primary" onclick="v6SaveBlocks('${esc(id)}')">Save blocks</button></div></section><section class="v6-builder"><aside class="v6-card v6-block-palette"><h2>Add block</h2>${["hero","about","hours","menu","gallery","booking","priceList","form","map","social","video","testimonials","faq","team","portfolio","products","services","offers","payment","custom"].map(t=>`<button onclick="v6AddBlock('${t}')">＋ ${t}</button>`).join("")}</aside><article class="v6-card"><div id="v6-block-list" data-profile-id="${esc(id)}" class="v6-loading">Loading blocks…</div></article><aside class="v6-phone-preview"><div><div class="v6-phone-notch"></div><iframe src="/b/${encodeURIComponent(p.slug)}" title="Live profile preview"></iframe></div></aside></section></main>`;
}

function qrDesignPage(id,state={}){
  const q=(state.qrs||[]).find(x=>x.id===id);if(!q)return `<main><div class="v6-empty-card"><h2>QR not found</h2></div></main>`;
  const url=q.is_dynamic===false?q.content:`${location.origin}/r/${q.short_id}`,fg=q.design?.foreground||"#0f172a",bg=q.design?.background||"#ffffff",contrast=validateQrContrast(fg,bg);
  return `<main><section class="v6-page-head"><div><span class="v6-kicker">QR DESIGN CENTER</span><h1>${esc(q.name)}</h1><p>Brand colors, frame CTA, print presets and scan-contrast validation.</p></div></section><section class="v6-design-grid"><article class="v6-card"><label>Foreground<input type="color" id="v6-design-fg" value="${fg}" oninput="v6RefreshDesign('${esc(id)}')"></label><label>Background<input type="color" id="v6-design-bg" value="${bg}" oninput="v6RefreshDesign('${esc(id)}')"></label><label>Frame text<input id="v6-design-cta" value="SCAN ME" oninput="v6RefreshDesign('${esc(id)}')"></label><label>Print preset<select id="v6-print-preset"><option value="sticker">Sticker</option><option value="table">Table tent</option><option value="poster">Poster</option></select></label><div id="v6-contrast" class="${contrast.ok?"ok":"bad"}">${contrast.message} · ratio ${contrast.ratio}:1</div><button class="v6-btn primary" onclick="v6PrintQr('${esc(id)}')">Print-ready export</button></article><article class="v6-card v6-design-preview" id="v6-design-preview"><div class="v6-frame"><div id="v6-design-svg">${qrSvg(url,{size:280,fg,bg,ec:"H",margin:4})}</div><b>SCAN ME</b></div></article></section></main>`;
}

export function renderV6Page(path,ctx={}){
  runtime={...runtime,...ctx};
  if(path==="/dashboard")return dashboardPage(ctx.state||{});
  if(path==="/analytics")return analyticsPage(ctx.state||{});
  if(path==="/leads")return leadsPage(ctx.state||{});
  if(path==="/campaigns")return campaignsPage();
  if(path==="/templates")return templatesPage();
  if(path==="/media")return mediaPage();
  if(path==="/team")return teamPage();
  if(path==="/billing")return billingPage();
  if(path==="/integrations")return integrationsPage();
  if(path==="/api-webhooks")return apiPage();
  if(path==="/audit")return auditPage();
  if(path==="/ai")return aiPage();
  if(path==="/bulk-qr")return bulkPage();
  if(path==="/security")return securityPage();
  if(path==="/pricing")return pricingPage();
  if(path==="/nfc")return nfcPage();
  if(path==="/discovery")return discoveryPage();
  if(path==="/agency")return agencyPage();
  if(path==="/notifications")return notificationsPage();
  const builder=path.match(/^\/builder\/([^/]+)$/);if(builder)return builderPage(decodeURIComponent(builder[1]),ctx.state||{});
  const design=path.match(/^\/qr-design\/([^/]+)$/);if(design)return qrDesignPage(decodeURIComponent(design[1]),ctx.state||{});
  return null;
}

async function token(){if(!runtime.session?.user)throw new Error("Sign in first.");return runtime.session.user.getIdToken();}
async function api(path,options={}){
  const headers={"content-type":"application/json",...(options.headers||{})};
  if(runtime.session?.user)headers.authorization=`Bearer ${await token()}`;
  const r=await fetch(path,{...options,headers}),body=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(body.error||`Request failed (${r.status})`);e.code=body.code;e.details=body.details;throw e;}
  return body;
}
function notify(msg,kind="default"){try{runtime.toast(msg,kind);}catch{console.log(msg);}}
function setHtml(id,html){const el=document.querySelector(id);if(el)el.innerHTML=html;}
function money(n){return n==null?"Custom":`₹${new Intl.NumberFormat("en-IN").format(Number(n))}`;}

async function hydrateMe(){
  try{
    meCache=await api("/api/v1/me");
    const label=document.querySelector("#v6-plan-label");if(label)label.textContent=`${meCache.entitlements.name} plan · ${meCache.account.email||"workspace"}`;
    const card=document.querySelector("#v6-usage-card");
    if(card){
      const u=meCache.usage,l=meCache.entitlements.limits,bar=(name,value,max)=>`<div class="v6-usage-line"><label><span>${name}</span><b>${fmt(value)} / ${max===-1?"∞":fmt(max)}</b></label><i><u style="width:${max===-1?15:Math.min(100,Math.round(value/Math.max(1,max)*100))}%"></u></i></div>`;
      card.innerHTML=`<div class="v6-card-head"><div><h2>Plan Usage</h2><p>${esc(meCache.entitlements.name)} · server enforced</p></div><span class="v6-plan-badge">${esc(meCache.entitlements.name)}</span></div>${bar("Profiles",u.profiles,l.profiles)}${bar("QR codes",u.qrs,l.qrs)}${bar("Monthly scans",u.scans,l.monthlyScans)}${bar("Team seats",u.seats,l.seats)}<a class="v6-inline-link" href="/billing" data-route>Manage subscription →</a>`;
    }
  }catch(e){console.warn("V6 account hydrate",e);}
}

export async function initV6Page(path,ctx={}){
  runtime={...runtime,...ctx};
  document.documentElement.dataset.theme=localStorage.getItem("qrajn-theme")||"light";
  hydrateMe();
  if(path==="/analytics")v6LoadServerAnalytics();
  if(path==="/leads")v6LoadLeads();
  if(path==="/campaigns")v6LoadCampaigns();
  if(path==="/team")v6LoadTeam();
  if(path==="/billing"||path==="/pricing")v6LoadBilling();
  if(path==="/integrations")v6LoadIntegrations();
  if(path==="/api-webhooks")v6LoadDeveloper();
  if(path==="/audit")v6LoadAudit();
  if(path==="/security")v6LoadSecurity();
  if(path==="/discovery")v6LoadDiscovery();
  if(path==="/agency")v6LoadAgency();
  if(path==="/notifications")v6LoadNotifications();
  const builder=path.match(/^\/builder\/([^/]+)$/);if(builder)v6LoadBlocks(decodeURIComponent(builder[1]));
  installGlobalSearch();
  requestAnimationFrame(()=>document.querySelector(".v6-page")?.classList.add("ready"));
}

export async function initV6PublicProfile(path){
  const m=path.match(/^\/b\/([^/]+)$/);if(!m)return;
  const slug=decodeURIComponent(m[1]);
  try{
    const r=await fetch(`/api/v1/public-profile?slug=${encodeURIComponent(slug)}`),data=await r.json();
    if(!r.ok||!data.blocks?.length){installCookieBanner();return;}
    const target=document.querySelector(".public-profile")||document.querySelector("main")||document.querySelector("#app");
    if(!target)return;
    const wrap=document.createElement("section");wrap.className="v6-public-blocks";
    wrap.innerHTML=data.blocks.map(renderPublicBlock).join("");
    target.appendChild(wrap);
    installCookieBanner();
  }catch{installCookieBanner();}
}

function renderPublicBlock(b){
  const title=b.title?`<h2>${esc(b.title)}</h2>`:"",content=typeof b.content==="string"?esc(b.content).replace(/\n/g,"<br>"):"";
  if(b.type==="video"&&b.url)return `<article class="v6-public-block">${title}<div class="v6-video"><video controls preload="metadata" src="${esc(b.url)}"></video></div></article>`;
  if(b.type==="map"&&b.url)return `<article class="v6-public-block">${title}<a class="v6-public-cta" href="${esc(b.url)}" target="_blank" rel="noopener">Open map</a></article>`;
  if(b.type==="payment"&&b.url)return `<article class="v6-public-block">${title}<p>${content}</p><a class="v6-public-cta" href="${esc(b.url)}" target="_blank" rel="noopener">Pay securely</a></article>`;
  if(b.type==="booking"&&b.url)return `<article class="v6-public-block">${title}<p>${content}</p><a class="v6-public-cta" href="${esc(b.url)}" target="_blank" rel="noopener">Book now</a></article>`;
  return `<article class="v6-public-block">${title}<p>${content}</p>${b.url?`<a class="v6-public-cta" href="${esc(b.url)}" target="_blank" rel="noopener">Open</a>`:""}</article>`;
}

function installCookieBanner(){
  if(localStorage.getItem("qrajn-cookie-choice")||document.querySelector(".v6-cookie"))return;
  const el=document.createElement("div");el.className="v6-cookie";el.innerHTML=`<div><b>Privacy choices</b><p>QR AJN uses necessary storage for core functionality. Optional analytics/advertising scripts run only after consent.</p></div><div><button onclick="v6CookieChoice('necessary')">Necessary only</button><button class="primary" onclick="v6CookieChoice('all')">Allow optional</button></div>`;document.body.appendChild(el);
}
window.v6CookieChoice=choice=>{localStorage.setItem("qrajn-cookie-choice",choice);document.querySelector(".v6-cookie")?.remove();window.dispatchEvent(new CustomEvent("qrajn-consent",{detail:{choice}}));};

window.v6ToggleTheme=()=>{const next=(document.documentElement.dataset.theme||"light")==="dark"?"light":"dark";document.documentElement.dataset.theme=next;localStorage.setItem("qrajn-theme",next);};

function installGlobalSearch(){
  const input=document.querySelector("#v6-global-search");if(!input||input.dataset.ready)return;input.dataset.ready="1";
  input.addEventListener("keydown",e=>{
    if(e.key!=="Enter")return;const q=input.value.trim().toLowerCase();if(!q)return;
    const qr=(runtime.state?.qrs||[]).find(x=>String(x.name||"").toLowerCase().includes(q));if(qr)return runtime.route(`/qr/${qr.id}`);
    const p=(runtime.state?.profiles||[]).find(x=>String(x.name||"").toLowerCase().includes(q));if(p)return runtime.route(`/business/${p.id}`);
    runtime.route("/leads");
  });
}

window.v6DownloadExport=async(type,format)=>{
  try{
    const t=await token(),r=await fetch(`/api/v1/export?type=${encodeURIComponent(type)}&format=${encodeURIComponent(format)}`,{headers:{authorization:`Bearer ${t}`}});if(!r.ok)throw new Error("Export failed.");
    const blob=await r.blob(),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`qrajn-${type}.${format==="xls"?"xls":"csv"}`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  }catch(e){notify(e.message,"error");}
};

window.v6LoadServerAnalytics=async()=>{
  const el=document.querySelector("#v6-server-chart");if(!el)return;const days=Number(document.querySelector("#v6-days")?.value||30);
  try{
    const d=await api(`/api/v1/analytics?days=${days}`),series=d.series||[],values=series.map(x=>x.value),f=d.forecast||[],an=d.anomaly||{};
    el.innerHTML=`<div class="v6-card-head"><div><h2>Server analytics</h2><p>${days} days · bot/duplicate filtered</p></div><span class="${an.detected?"v6-anomaly on":"v6-anomaly"}">${an.detected?`${an.direction} detected · z ${an.z}`:"Normal activity"}</span></div>${sparkline(values,900,240)}<div class="v6-server-metrics"><div><b>${fmt(d.totals.scans)}</b><span>Scans</span></div><div><b>${fmt(d.totals.uniqueVisitors)}</b><span>Unique</span></div><div><b>${fmt(d.totals.actions)}</b><span>Actions</span></div><div><b>${fmt(d.totals.leads)}</b><span>Leads</span></div></div><p class="v6-muted">14-day forecast total: ${fmt(f.reduce((a,x)=>a+x.value,0))}</p>`;
  }catch(e){el.innerHTML=`<div class="v6-error">${esc(e.message)}</div>`;}
};

window.v6LoadLeads=async()=>{
  const el=document.querySelector("#v6-lead-table");if(!el)return;
  try{
    const d=await api("/api/v1/leads"),leads=d.leads||[];
    const counts=Object.fromEntries(d.statuses.map(s=>[s,leads.filter(l=>l.status===s).length]));
    for(const s of ["new","contacted","converted"]){const x=document.querySelector(`#v6-crm-${s}`);if(x)x.textContent=counts[s]||0;}
    el.innerHTML=`<div class="v6-table-wrap"><table class="v6-table"><thead><tr><th>Lead</th><th>Contact</th><th>Source</th><th>Status</th><th>Received</th><th>Notes</th></tr></thead><tbody>${leads.map(l=>`<tr data-search="${esc(`${l.name||""} ${l.phone||""} ${l.email||""} ${l.source||""}`.toLowerCase())}"><td><b>${esc(l.name||"Unnamed")}</b><small>${esc(l.message||"")}</small></td><td>${esc(l.phone||"")}<small>${esc(l.email||"")}</small></td><td>${esc(l.source||"")}</td><td><select onchange="v6LeadStatus('${esc(l.id)}',this.value,'${esc((l.notes||"").replaceAll("'",""))}')">${d.statuses.map(s=>`<option ${l.status===s?"selected":""}>${s}</option>`).join("")}</select></td><td>${date(l.createdAt)}</td><td><button class="v6-link-btn" onclick="v6LeadNote('${esc(l.id)}','${esc((l.notes||"").replaceAll("'",""))}','${esc(l.status||"new")}')">${l.notes?"Edit":"Add note"}</button></td></tr>`).join("")||`<tr><td colspan="6">No leads yet.</td></tr>`}</tbody></table></div>`;
  }catch(e){el.innerHTML=`<div class="v6-error">${esc(e.message)}</div>`;}
};
window.v6FilterLeads=()=>{const q=(document.querySelector("#v6-lead-search")?.value||"").toLowerCase();document.querySelectorAll("#v6-lead-table tbody tr").forEach(r=>r.hidden=q&&!r.dataset.search?.includes(q));};
window.v6LeadStatus=async(id,status,notes="")=>{try{await api("/api/v1/leads",{method:"PATCH",body:JSON.stringify({id,status,notes})});notify("Lead status updated.","success");}catch(e){notify(e.message,"error");}};
window.v6LeadNote=async(id,current,status)=>{const notes=prompt("Lead notes",current||"");if(notes===null)return;try{await api("/api/v1/leads",{method:"PATCH",body:JSON.stringify({id,status,notes})});notify("Lead notes saved.","success");v6LoadLeads();}catch(e){notify(e.message,"error");}};

window.v6LoadCampaigns=async()=>{
  const el=document.querySelector("#v6-campaign-list");if(!el)return;
  try{
    const d=await api("/api/v1/ads"),rows=d.campaigns||[],sum=k=>rows.reduce((a,x)=>a+Number(x.metrics?.[k]||0),0);
    const set=(id,v)=>{const e=document.querySelector(id);if(e)e.textContent=v;};set("#v6-ad-impressions",fmt(sum("impressions")));set("#v6-ad-clicks",fmt(sum("clicks")));set("#v6-ad-conversions",fmt(sum("conversions")));set("#v6-ad-spend",money(rows.reduce((a,x)=>a+Number(x.budget?.spent||0),0)));
    el.innerHTML=rows.map(c=>`<div class="v6-campaign-row"><div class="v6-sponsored-preview"><span>Sponsored</span><b>${esc(c.creative?.title||c.name)}</b><small>${esc(c.creative?.description||"")}</small></div><div><b>${esc(c.name)}</b><small>${esc(c.status)} · ${esc((c.targeting?.countries||[]).join(", ")||"All countries")}</small></div><div><strong>${fmt(c.metrics?.impressions)}</strong><small>impressions</small></div><div><strong>${fmt(c.metrics?.clicks)}</strong><small>clicks</small></div><div><strong>${money(c.budget?.total)}</strong><small>budget</small></div><select onchange="v6CampaignStatus('${esc(c.id)}',this.value)">${["draft","active","paused","ended"].map(s=>`<option ${c.status===s?"selected":""}>${s}</option>`).join("")}</select></div>`).join("")||`<div class="v6-empty">No sponsored campaigns yet.</div>`;
  }catch(e){el.innerHTML=`<div class="v6-error">${esc(e.message)}</div>`;}
};
window.v6OpenCampaignForm=()=>document.querySelector("#v6-campaign-dialog")?.showModal();
window.v6CreateCampaign=async()=>{
  try{
    const body={name:document.querySelector("#v6-ad-name").value,profileId:document.querySelector("#v6-ad-profile").value,status:"draft",creative:{title:document.querySelector("#v6-ad-title").value,description:document.querySelector("#v6-ad-desc").value},budget:{total:Number(document.querySelector("#v6-ad-budget").value||0),daily:Number(document.querySelector("#v6-ad-daily").value||0)},targeting:{countries:document.querySelector("#v6-ad-countries").value.split(",").map(x=>x.trim()).filter(Boolean),categories:document.querySelector("#v6-ad-categories").value.split(",").map(x=>x.trim()).filter(Boolean)},frequencyCap:3};
    await api("/api/v1/ads",{method:"POST",body:JSON.stringify(body)});document.querySelector("#v6-campaign-dialog")?.close();notify("Campaign created as draft.","success");v6LoadCampaigns();
  }catch(e){notify(e.message,"error");}
};
window.v6CampaignStatus=async(id,status)=>{try{await api("/api/v1/ads",{method:"PATCH",body:JSON.stringify({id,status})});notify(`Campaign ${status}.`,"success");v6LoadCampaigns();}catch(e){notify(e.message,"error");}};

window.v6LoadTeam=async()=>{
  const el=document.querySelector("#v6-team-list");if(!el)return;
  try{const d=await api("/api/v1/team"),rows=d.members||[];el.innerHTML=`<div class="v6-table-wrap"><table class="v6-table"><thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Added</th></tr></thead><tbody>${rows.map(m=>`<tr><td>${esc(m.email)}</td><td><select onchange="v6TeamRole('${esc(m.id)}',this.value)">${["editor","viewer"].map(r=>`<option ${m.role===r?"selected":""}>${r}</option>`).join("")}</select></td><td>${esc(m.status)}</td><td>${date(m.createdAt)}</td></tr>`).join("")||`<tr><td colspan="4">No teammates yet.</td></tr>`}</tbody></table></div>`;}catch(e){el.innerHTML=`<div class="v6-error">${esc(e.message)}</div>`;}
};
window.v6InviteMember=async()=>{const email=prompt("Teammate email");if(!email)return;const role=prompt("Role: editor or viewer","viewer")||"viewer";try{const d=await api("/api/v1/team",{method:"POST",body:JSON.stringify({email,role})});prompt("Invite created. Send this one-time invite token to the teammate:",d.inviteToken||"");v6LoadTeam();}catch(e){notify(e.message,"error");}};
window.v6TeamRole=async(id,role)=>{try{await api("/api/v1/team",{method:"PATCH",body:JSON.stringify({id,role})});notify("Role updated.","success");}catch(e){notify(e.message,"error");}};

let billingCycle="monthly";
window.v6BillingCycle=(cycle,button)=>{billingCycle=cycle;button.parentElement.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===button));v6LoadBilling();};
window.v6LoadBilling=async()=>{
  const grid=document.querySelector("#v6-plan-grid"),current=document.querySelector("#v6-current-billing");if(!grid)return;
  try{
    const d=await api("/api/v1/billing"),active=d.billing?.plan||"free";
    grid.innerHTML=d.plans.map(p=>`<article class="v6-plan ${p.id===active?"current":""} ${p.id==="growth"?"popular":""}">${p.id==="growth"?`<span class="popular-label">MOST POPULAR</span>`:""}<h3>${esc(p.name)}</h3><strong>${p.monthlyInr==null?"Custom":money(billingCycle==="annual"?Math.round(p.annualInr/12):p.monthlyInr)}<small>/month</small></strong>${billingCycle==="annual"&&p.annualDiscount?`<em>Save ${p.annualDiscount}% annually</em>`:""}<ul><li>${p.limits.profiles===-1?"Unlimited":p.limits.profiles} profiles</li><li>${p.limits.qrs===-1?"Unlimited":fmt(p.limits.qrs)} QR codes</li><li>${p.limits.monthlyScans===-1?"Unlimited":fmt(p.limits.monthlyScans)} scans/month</li><li>${p.limits.seats===-1?"Unlimited":p.limits.seats} team seats</li><li>${p.features.customDomain?"Custom domains":"qrajn.online links"}</li><li>${p.features.api?"API access":"Dashboard access"}</li></ul>${p.id===active?`<button disabled>Current plan</button>`:p.id==="enterprise"?`<button onclick="v6ContactSales()">Contact sales</button>`:p.id==="free"?`<button disabled>Free</button>`:`<button onclick="v6Checkout('${p.id}')">Choose ${esc(p.name)}</button>`}${["starter","growth","business"].includes(p.id)&&active==="free"?`<button class="trial" onclick="v6StartTrial('${p.id}')">Start 14-day trial</button>`:""}</article>`).join("");
    if(current)current.innerHTML=`<div class="v6-card-head"><div><h2>Current subscription</h2><p>Billing status is sourced from the configured provider.</p></div><span class="v6-plan-badge">${esc(d.billing.planName)}</span></div><dl class="v6-billing-dl"><div><dt>Status</dt><dd>${esc(d.billing.status)}</dd></div><div><dt>Cycle</dt><dd>${esc(d.billing.cycle)}</dd></div><div><dt>Provider</dt><dd>${esc(d.billing.provider||"Not connected")}</dd></div><div><dt>Renewal</dt><dd>${d.billing.renewalAt?date(d.billing.renewalAt):"—"}</dd></div></dl><h3>Invoice history</h3>${(d.history||[]).slice(0,8).map(x=>`<div class="v6-invoice"><span>${date(x.createdAt)}</span><b>${money(x.amount||0)}</b><small>${esc(x.provider||"")}</small></div>`).join("")||`<div class="v6-empty">No invoices recorded yet.</div>`}`;
  }catch(e){grid.innerHTML=`<div class="v6-error">${esc(e.message)}</div>`;}
};
window.v6Checkout=async plan=>{try{const d=await api("/api/v1/billing",{method:"POST",body:JSON.stringify({plan,cycle:billingCycle})});if(!d.checkout?.url)throw new Error("Billing provider did not return a checkout URL.");location.href=d.checkout.url;}catch(e){notify(e.message,"error");}};
window.v6StartTrial=async plan=>{try{await api("/api/v1/trial",{method:"POST",body:JSON.stringify({plan})});notify("14-day trial started.","success");v6LoadBilling();}catch(e){notify(e.message,"error");}};
window.v6ContactSales=async()=>{const email=prompt("Work email");if(!email)return;const company=prompt("Company / organization");try{await fetch("/api/v1/enterprise-contact",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,company,message:"Enterprise plan enquiry from QR AJN pricing."})});notify("Sales request submitted.","success");}catch(e){notify(e.message,"error");}};

window.v6LoadIntegrations=async()=>{
  const el=document.querySelector("#v6-integration-grid");if(!el)return;
  try{const d=await api("/api/v1/integrations");el.innerHTML=d.integrations.map(x=>`<article class="v6-integration-card"><span class="v6-integration-icon">${({payments:"₹",messaging:"✉",google:"G",ai:"✦",infrastructure:"⌘",automation:"↯",crm:"◎"})[x.category]||"•"}</span><div><b>${esc(x.name)}</b><small>${esc(x.category)}</small></div><em class="${x.configured?"on":"off"}">${x.configured?"Configured":"Configuration required"}</em>${x.id==="calendar"?`<button onclick="v6ConnectGoogle()">Connect</button>`:""}</article>`).join("");}catch(e){el.innerHTML=`<div class="v6-error">${esc(e.message)}</div>`;}
};
window.v6ConnectGoogle=async()=>{try{const d=await api("/api/v1/google-oauth-start");location.href=d.url;}catch(e){notify(e.message,"error");}};

window.v6LoadDeveloper=async()=>{
  const keys=document.querySelector("#v6-api-key-list"),hooks=document.querySelector("#v6-webhook-list");if(!keys||!hooks)return;
  try{
    const [k,h]=await Promise.all([api("/api/v1/api-keys"),api("/api/v1/webhooks")]);
    keys.innerHTML=(k.keys||[]).map(x=>`<div class="v6-dev-row"><div><b>${esc(x.name)}</b><small>${esc(x.prefix)}… · ${(x.scopes||[]).join(", ")}</small></div><button onclick="v6RevokeApiKey('${esc(x.id)}')">Revoke</button></div>`).join("")||`<div class="v6-empty">No API keys.</div>`;
    hooks.innerHTML=(h.hooks||[]).map(x=>`<div class="v6-dev-row"><div><b>${esc(x.url)}</b><small>${(x.events||[]).join(", ")||"No events selected"}</small></div><button onclick="v6DeleteWebhook('${esc(x.id)}')">Delete</button></div>`).join("")||`<div class="v6-empty">No webhooks.</div>`;
  }catch(e){keys.innerHTML=hooks.innerHTML=`<div class="v6-error">${esc(e.message)}</div>`;}
};
window.v6CreateApiKey=async()=>{const name=prompt("API key name","Production integration");if(!name)return;try{const d=await api("/api/v1/api-keys",{method:"POST",body:JSON.stringify({name,scopes:["profiles:read","qrs:read","analytics:read"]})});prompt("Copy this API key now. It will not be shown again:",d.key);v6LoadDeveloper();}catch(e){notify(e.message,"error");}};
window.v6RevokeApiKey=async id=>{if(!confirm("Revoke this API key?"))return;try{await api("/api/v1/api-keys",{method:"DELETE",body:JSON.stringify({id})});v6LoadDeveloper();}catch(e){notify(e.message,"error");}};
window.v6CreateWebhook=async()=>{const url=prompt("HTTPS webhook URL");if(!url)return;const events=(prompt("Events, comma separated","new-lead,new-scan,plan-change")||"").split(",").map(x=>x.trim()).filter(Boolean);try{const d=await api("/api/v1/webhooks",{method:"POST",body:JSON.stringify({url,events})});prompt("Copy this webhook signing secret now:",d.signingSecret);v6LoadDeveloper();}catch(e){notify(e.message,"error");}};
window.v6DeleteWebhook=async id=>{if(!confirm("Delete webhook?"))return;try{await api("/api/v1/webhooks",{method:"DELETE",body:JSON.stringify({id})});v6LoadDeveloper();}catch(e){notify(e.message,"error");}};

window.v6LoadAudit=async()=>{const el=document.querySelector("#v6-audit-list");if(!el)return;try{const d=await api("/api/v1/audit?limit=150");el.innerHTML=(d.events||[]).map(x=>`<div class="v6-audit-row"><span>≣</span><div><b>${esc(x.action)}</b><small>${esc(x.summary||x.entityType||"")}</small></div><code>${esc(x.entityId||"")}</code><time>${date(x.at)} · ${timeAgo(x.at)}</time></div>`).join("")||`<div class="v6-empty">No audit events yet.</div>`;}catch(e){el.innerHTML=`<div class="v6-error">${esc(e.message)}</div>`;}};

window.v6AskAI=async()=>{
  const out=document.querySelector("#v6-ai-output");if(!out)return;out.textContent="Thinking…";
  try{const task=document.querySelector("#v6-ai-task").value,input=document.querySelector("#v6-ai-input").value,d=await api("/api/v1/ai",{method:"POST",body:JSON.stringify({task,input:{text:input,metrics:task==="performance_advice"?runtime.state:null}})});out.textContent=d.text||"No text returned.";}catch(e){out.textContent=e.message;}
};

function parseCsv(text){
  const lines=String(text).trim().split(/\r?\n/);if(lines.length<2)return [];
  const split=line=>{const out=[];let s="",q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'){s+='"';i++;}else if(c==='"')q=!q;else if(c===","&&!q){out.push(s);s="";}else s+=c;}out.push(s);return out;};
  const head=split(lines[0]).map(x=>x.trim());return lines.slice(1).map(line=>Object.fromEntries(split(line).map((v,i)=>[head[i],v.trim()])));
}
window.v6BulkCreate=async()=>{const el=document.querySelector("#v6-bulk-result");try{const rows=parseCsv(document.querySelector("#v6-bulk-csv").value);if(!rows.length)throw new Error("Add a CSV header and at least one data row.");const d=await api("/api/v1/bulk-qr",{method:"POST",body:JSON.stringify({rows})});el.innerHTML=`<b>${d.count} QR codes created</b><textarea rows="12">${d.qrs.map(q=>`${q.name},${q.url}`).join("\n")}</textarea>`;notify("Bulk QR creation complete.","success");}catch(e){el.innerHTML=`<div class="v6-error">${esc(e.message)}</div>`;}};

window.v6PreviewMedia=async files=>{
  const grid=document.querySelector("#v6-media-grid");if(!grid)return;grid.innerHTML="";
  for(const file of [...files]){
    const url=URL.createObjectURL(file),card=document.createElement("article");card.innerHTML=`<img src="${url}" alt=""><b>${esc(file.name)}</b><small>${(file.size/1024/1024).toFixed(2)} MB · will optimize on profile upload</small>`;grid.appendChild(card);
  }
};

window.v6LoadSecurity=async()=>{
  const state=document.querySelector("#v6-mfa-state");if(!state)return;
  try{
    const [factors,settings]=await Promise.all([listMfa(runtime.session.user),api("/api/v1/security-settings")]);
    state.innerHTML=factors.length?factors.map(f=>`<div class="v6-mfa-factor"><div><b>${esc(f.displayName||"Authenticator")}</b><small>${esc(f.factorId)} · ${esc(f.enrollmentTime||"")}</small></div><button onclick="v6RemoveMfa('${esc(f.uid)}')">Remove</button></div>`).join(""):`<div class="v6-empty">No authenticator enrolled.</div>`;
    const req=document.querySelector("#v6-require-mfa"),pol=document.querySelector("#v6-session-policy");if(req)req.checked=!!settings.settings?.requireMfa;if(pol)pol.value=settings.settings?.sessionPolicy||"standard";
  }catch(e){state.innerHTML=`<div class="v6-error">${esc(e.message)}</div>`;}
};
window.v6StartMfa=async()=>{
  try{
    const s=await startTotpEnrollment(runtime.session.user);
    const dialog=document.createElement("dialog");dialog.className="v6-dialog";dialog.innerHTML=`<form method="dialog" onsubmit="event.preventDefault();"><div class="v6-dialog-head"><h2>Authenticator setup</h2><button onclick="this.closest('dialog').close()">×</button></div><p>Scan this QR code in your authenticator app or enter the secret manually.</p><div class="v6-mfa-qr">${qrSvg(s.qrUrl,{size:220,margin:4,ec:"M"})}</div><code class="v6-secret">${esc(s.secretKey)}</code><label>6-digit code<input id="v6-mfa-code" inputmode="numeric" autocomplete="one-time-code"></label><button class="v6-btn primary full" onclick="v6FinishMfa()">Verify & enable</button></form>`;document.body.appendChild(dialog);dialog.addEventListener("close",()=>dialog.remove());dialog.showModal();
  }catch(e){notify(e.message,"error");}
};
window.v6FinishMfa=async()=>{try{await finishTotpEnrollment(document.querySelector("#v6-mfa-code").value,"QR AJN Authenticator");document.querySelector(".v6-dialog")?.close();notify("Authenticator MFA enabled.","success");v6LoadSecurity();}catch(e){notify(e.message,"error");}};
window.v6RemoveMfa=async uid=>{if(!confirm("Remove this MFA factor?"))return;try{await removeMfa(runtime.session.user,uid);notify("MFA factor removed.","success");v6LoadSecurity();}catch(e){notify(e.message,"error");}};
window.v6SaveSecurity=async()=>{try{const body={requireMfa:document.querySelector("#v6-require-mfa").checked,sessionPolicy:document.querySelector("#v6-session-policy").value};await api("/api/v1/security-settings",{method:"PUT",body:JSON.stringify(body)});notify("Security policy saved.","success");}catch(e){notify(e.message,"error");}};
window.v6PrivacyExport=async()=>{try{const d=await api("/api/v1/privacy"),blob=new Blob([JSON.stringify(d,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`qrajn-data-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}catch(e){notify(e.message,"error");}};
window.v6ScheduleDelete=async()=>{const confirmText=prompt('Type exactly: DELETE MY QR AJN ACCOUNT');if(confirmText!=="DELETE MY QR AJN ACCOUNT")return;try{const d=await api("/api/v1/privacy",{method:"POST",body:JSON.stringify({confirm:confirmText})});alert(`Account deletion scheduled for ${new Date(d.scheduledAt).toLocaleDateString()}. You can cancel during the 30-day recovery period.`);}catch(e){notify(e.message,"error");}};

window.v6WriteNfc=async()=>{try{await writeNfc(document.querySelector("#v6-nfc-url").value);notify("NFC tag written successfully.","success");}catch(e){notify(e.message,"error");}};

window.v6LoadDiscovery=async()=>{
  const el=document.querySelector("#v6-discovery-results");if(!el)return;
  const category=document.querySelector("#v6-discovery-category")?.value||"",city=document.querySelector("#v6-discovery-city")?.value||"";
  try{
    const r=await fetch(`/api/v1/discovery?category=${encodeURIComponent(category)}&city=${encodeURIComponent(city)}`),d=await r.json();
    const sponsored=(d.sponsored||[]).map(x=>`<article class="v6-discovery-card sponsored"><span>Sponsored</span><h3>${esc(x.creative?.title||"Featured profile")}</h3><p>${esc(x.creative?.description||"")}</p><button onclick="route('/campaigns')">Sponsored placement</button></article>`).join("");
    const organic=(d.profiles||[]).map(x=>`<article class="v6-discovery-card"><div class="v6-discovery-logo">${x.logo?`<img src="${esc(x.logo)}" alt="">`:"▣"}</div><h3>${esc(x.name)}</h3><small>${esc(x.type||"")}</small><p>${esc(x.tagline||x.address||"")}</p><a href="/b/${encodeURIComponent(x.slug)}" target="_blank">View profile</a></article>`).join("");
    el.innerHTML=`<div class="v6-discovery-grid">${sponsored}${organic||`<div class="v6-empty">No profiles found.</div>`}</div>`;
  }catch(e){el.innerHTML=`<div class="v6-error">${esc(e.message)}</div>`;}
};

window.v6LoadAgency=async()=>{const el=document.querySelector("#v6-agency-list");if(!el)return;try{const d=await api("/api/v1/agency");el.innerHTML=(d.clients||[]).map(c=>`<div class="v6-dev-row"><div><b>${esc(c.name)}</b><small>${esc(c.contactEmail||"")} · ${esc(c.status)}</small></div><button onclick="v6DeleteAgencyClient('${esc(c.id)}')">Remove</button></div>`).join("")||`<div class="v6-empty">No agency clients yet.</div>`;}catch(e){el.innerHTML=`<div class="v6-error">${esc(e.message)}</div>`;}};
window.v6AddAgencyClient=async()=>{const name=prompt("Client name");if(!name)return;const contactEmail=prompt("Client contact email")||"";try{await api("/api/v1/agency",{method:"POST",body:JSON.stringify({name,contactEmail})});v6LoadAgency();}catch(e){notify(e.message,"error");}};
window.v6DeleteAgencyClient=async id=>{if(!confirm("Remove client record?"))return;try{await api("/api/v1/agency",{method:"DELETE",body:JSON.stringify({id})});v6LoadAgency();}catch(e){notify(e.message,"error");}};

window.v6LoadNotifications=async()=>{try{const d=await api("/api/v1/notifications"),p=d.preferences||{};document.querySelector("#v6-notify-email").checked=p.email!==false;document.querySelector("#v6-notify-whatsapp").checked=!!p.whatsapp;document.querySelector("#v6-notify-leads").checked=p.newLead!==false;document.querySelector("#v6-notify-milestones").value=(p.scanMilestones||[]).join(", ");}catch(e){notify(e.message,"error");}};
window.v6SaveNotifications=async()=>{try{const body={email:document.querySelector("#v6-notify-email").checked,whatsapp:document.querySelector("#v6-notify-whatsapp").checked,newLead:document.querySelector("#v6-notify-leads").checked,scanMilestones:document.querySelector("#v6-notify-milestones").value.split(",").map(Number).filter(Boolean)};await api("/api/v1/notifications",{method:"PUT",body:JSON.stringify(body)});notify("Notification settings saved.","success");}catch(e){notify(e.message,"error");}};

let blockState=[];
window.v6LoadBlocks=async profileId=>{
  const el=document.querySelector("#v6-block-list");if(!el)return;
  try{
    const d=await api(`/api/v1/profile-blocks?profileId=${encodeURIComponent(profileId)}`);blockState=d.blocks||[];
    if(!blockState.length)blockState=[{id:"hero",type:"hero",title:"Welcome",content:"",visible:true},{id:"about",type:"about",title:"About",content:"",visible:true},{id:"contact",type:"contact",title:"Contact",content:"",visible:true}];
    renderBlocks();enableBlockDrag();
  }catch(e){el.innerHTML=`<div class="v6-error">${esc(e.message)}</div>`;}
};
function renderBlocks(){
  const el=document.querySelector("#v6-block-list");if(!el)return;
  el.innerHTML=blockState.map((b,i)=>`<article class="v6-block-row" draggable="true" data-i="${i}"><span class="v6-drag">⋮⋮</span><div><b>${esc(b.type)}</b><input value="${esc(b.title||"")}" placeholder="Block title" oninput="v6BlockUpdate(${i},'title',this.value)"><textarea rows="3" placeholder="Content" oninput="v6BlockUpdate(${i},'content',this.value)">${esc(typeof b.content==="string"?b.content:"")}</textarea><input value="${esc(b.url||"")}" placeholder="Optional URL" oninput="v6BlockUpdate(${i},'url',this.value)"></div><label class="v6-switch small"><input type="checkbox" ${b.visible!==false?"checked":""} onchange="v6BlockUpdate(${i},'visible',this.checked)"><span>Visible</span></label><button onclick="v6RemoveBlock(${i})">×</button></article>`).join("");
}
function enableBlockDrag(){
  const el=document.querySelector("#v6-block-list");if(!el)return;let from=-1;
  el.querySelectorAll(".v6-block-row").forEach(row=>{
    row.addEventListener("dragstart",()=>{from=Number(row.dataset.i);row.classList.add("dragging")});
    row.addEventListener("dragend",()=>row.classList.remove("dragging"));
    row.addEventListener("dragover",e=>e.preventDefault());
    row.addEventListener("drop",e=>{e.preventDefault();const to=Number(row.dataset.i);if(from<0||to<0||from===to)return;const [item]=blockState.splice(from,1);blockState.splice(to,0,item);renderBlocks();enableBlockDrag();});
  });
}
window.v6BlockUpdate=(i,k,v)=>{blockState[i][k]=v;};
window.v6AddBlock=type=>{blockState.push({id:`block_${Date.now()}`,type,title:type[0].toUpperCase()+type.slice(1),content:"",url:"",visible:true});renderBlocks();enableBlockDrag();};
window.v6RemoveBlock=i=>{blockState.splice(i,1);renderBlocks();enableBlockDrag();};
window.v6SaveBlocks=async profileId=>{try{await api(`/api/v1/profile-blocks?profileId=${encodeURIComponent(profileId)}`,{method:"PUT",body:JSON.stringify({profileId,blocks:blockState})});notify("Profile blocks saved.","success");document.querySelector(".v6-phone-preview iframe")?.contentWindow?.location.reload();}catch(e){notify(e.message,"error");}};

window.v6RefreshDesign=id=>{
  const q=(runtime.state?.qrs||[]).find(x=>x.id===id);if(!q)return;
  const fg=document.querySelector("#v6-design-fg").value,bg=document.querySelector("#v6-design-bg").value,cta=document.querySelector("#v6-design-cta").value||"SCAN ME",url=q.is_dynamic===false?q.content:`${location.origin}/r/${q.short_id}`,c=validateQrContrast(fg,bg);
  setHtml("#v6-design-svg",qrSvg(url,{size:280,fg,bg,ec:"H",margin:4}));const frame=document.querySelector("#v6-design-preview .v6-frame b");if(frame)frame.textContent=cta;const x=document.querySelector("#v6-contrast");if(x){x.className=c.ok?"ok":"bad";x.textContent=`${c.message} · ratio ${c.ratio}:1`;}
};
window.v6PrintQr=id=>{
  const q=(runtime.state?.qrs||[]).find(x=>x.id===id);if(!q)return;const fg=document.querySelector("#v6-design-fg").value,bg=document.querySelector("#v6-design-bg").value,cta=document.querySelector("#v6-design-cta").value||"SCAN ME",preset=document.querySelector("#v6-print-preset").value,url=q.is_dynamic===false?q.content:`${location.origin}/r/${q.short_id}`,size=preset==="poster"?700:preset==="table"?500:320,svg=qrSvg(url,{size,fg,bg,ec:"H",margin:4}),win=open("","_blank");win.document.write(`<title>${esc(q.name)} QR</title><style>body{font-family:Arial;text-align:center;padding:40px}.frame{display:inline-block;border:8px solid ${fg};padding:24px;border-radius:24px}.frame b{display:block;background:${fg};color:${bg};padding:14px;font-size:28px;margin-top:16px}@media print{button{display:none}}</style><div class="frame">${svg}<b>${esc(cta)}</b></div><p>${esc(url)}</p><button onclick="print()">Print / Save PDF</button>`);win.document.close();
};
