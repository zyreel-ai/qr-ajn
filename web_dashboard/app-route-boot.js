(()=>{
  const ROUTES={
    '/create':'create-qr',
    '/create-qr':'create-qr',
    '/short-link':'short-link',
    '/create-profile':'create-profile',
    '/smart-tools':'smart-tools',
    '/open-analytics':'open-analytics'
  };
  const WORKSPACES={
    'create-qr':['create'],
    'short-link':['shorten'],
    'create-profile':['profileCreate'],
    'smart-tools':['smartCreate','smartTools','v9PdfEditor','v9Items'],
    'open-analytics':['v9Analytics']
  };
  const HOME_CARD_ROUTES=['/create-qr','/short-link','/create-profile','/open-analytics'];
  const path=()=>{const p=String(location.pathname||'/').replace(/\/+$/,'');return p||'/'};
  const current=()=>ROUTES[path()]||'home';

  document.documentElement.dataset.appPage=current();

  const el=id=>document.getElementById(id);
  const directChildren=node=>node?[...node.children]:[];

  function setupNavigation(){
    const nav=document.querySelector('.topbar nav');
    if(!nav)return;
    nav.querySelector('a[href="/smart-tools"]')?.remove();
    const order=['/create-qr','/short-link','/create-profile','/open-analytics'];
    const labels={'/create-qr':'Create QR','/short-link':'Short Link','/create-profile':'Create Profile','/open-analytics':'Open Analytics'};
    for(const href of order){
      let link=nav.querySelector(`a[href="${href}"]`);
      if(!link){
        link=document.createElement('a');
        link.href=href;
        nav.append(link);
      }
      link.textContent=labels[href];
      link.classList.toggle('nav-button',href==='/open-analytics');
    }
  }

  function card(href,icon,title,text){
    return `<a class="quick-tool-card" href="${href}">
      <span class="quick-tool-icon" aria-hidden="true">${icon}</span>
      <span class="quick-tool-copy"><strong>${title}</strong><small>${text}</small></span>
      <b aria-hidden="true">→</b>
    </a>`;
  }

  function setupCards(){
    const hub=el('quickToolsHub');
    if(!hub)return;
    const heading=hub.querySelector('.quick-tools-heading');
    if(heading)heading.innerHTML=`<span class="eyebrow">START HERE</span>
      <h2 id="quickToolsTitle">Choose what you want to create.</h2>
      <p>Four focused tools. Each opens in its own workspace, with no login or signup required.</p>`;
    const grid=hub.querySelector('.quick-tools-grid');
    if(grid)grid.innerHTML=[
      card('/create-qr','▦','Create QR','Static or trackable QR codes with professional customization.'),
      card('/short-link','↗','Create Short Link','Clean qrajn.online links with optional live click analytics.'),
      card('/create-profile','◉','Create Profile','Publish a professional public profile with its own QR code.'),
      card('/open-analytics','⌁','Open Analytics','View real scans, clicks, profile activity and private analytics.')
    ].join('');
    hub.dataset.cardCount=String(HOME_CARD_ROUTES.length);
  }

  function buildLandingGuide(){
    let guide=el('landingFeatureGuide');
    if(guide)return guide;
    guide=document.createElement('div');
    guide.id='landingFeatureGuide';
    guide.className='landing-feature-guide';
    guide.innerHTML=`
      <section class="landing-section shell" aria-labelledby="featureOverviewTitle">
        <div class="landing-section-head">
          <span class="eyebrow">FEATURES & FUNCTIONS</span>
          <h2 id="featureOverviewTitle">Everything you need to create, share and measure.</h2>
          <p>QR AJN keeps the main experience simple while still giving you professional QR, link, profile and analytics tools.</p>
        </div>
        <div class="feature-overview-grid">
          <article class="feature-overview-card">
            <span class="feature-number">01</span><h3>QR codes</h3>
            <p>Create static QR codes in your browser or trackable QR codes when you need scan analytics and an editable destination.</p>
            <ul><li>URL, text, Wi-Fi, phone, SMS, email, WhatsApp, location and vCard</li><li>Templates, colors, module and eye styles, frames and center logo</li><li>Contrast, quiet-zone and scan-quality guidance</li><li>PNG and SVG export with multiple sizes</li></ul>
            <a href="/create-qr">Open QR creator →</a>
          </article>
          <article class="feature-overview-card">
            <span class="feature-number">02</span><h3>Short links</h3>
            <p>Turn long URLs into clean qrajn.online links without creating an account.</p>
            <ul><li>Automatic short codes or a custom back-half when available</li><li>Private management link for supported editable destinations</li><li>Real click counts and approximate unique visitors</li><li>Device, browser and operating-system insights</li></ul>
            <a href="/short-link">Create short link →</a>
          </article>
          <article class="feature-overview-card">
            <span class="feature-number">03</span><h3>Public profiles</h3>
            <p>Create a clean qrajn.online/yourname page for a person, business, portfolio or local service.</p>
            <ul><li>Contact, WhatsApp, email, website, maps and social links</li><li>Professional profile templates and accent styles</li><li>Stable public profile URL and downloadable profile QR</li><li>Private editing, profile analytics and supported document links</li></ul>
            <a href="/create-profile">Create profile →</a>
          </article>
          <article class="feature-overview-card">
            <span class="feature-number">04</span><h3>Live analytics</h3>
            <p>Understand what people actually do with your trackable QR codes, short links and profiles.</p>
            <ul><li>QR scans, link clicks, profile views and actions kept separate</li><li>Today, 7-day and 30-day views where supported</li><li>Approximate unique visitors with privacy-conscious visitor hashing</li><li>Device, browser, OS and recent-activity breakdowns</li></ul>
            <a href="/open-analytics">Open analytics →</a>
          </article>
        </div>
        <div class="secondary-capabilities">
          <div><strong>More tools are built in</strong><span>Smart links, campaigns, UTM tracking, local PDF editing, PDF merge, extraction, rotation, watermarking and metadata editing remain available without crowding the main navigation.</span></div>
          <a href="/smart-tools">Explore advanced tools →</a>
        </div>
      </section>

      <section class="landing-section shell" aria-labelledby="howWorksTitle">
        <div class="landing-section-head compact">
          <span class="eyebrow">HOW IT WORKS</span>
          <h2 id="howWorksTitle">Create → save → share → understand.</h2>
        </div>
        <div class="landing-how-grid">
          <article><b>1</b><h3>Create</h3><p>Choose QR, short link or profile and enter the content you want to share.</p></article>
          <article><b>2</b><h3>Save your private link</h3><p>Trackable items use a private management link instead of a traditional account. Keep it private.</p></article>
          <article><b>3</b><h3>Share</h3><p>Download the QR or copy your qrajn.online link and use it online, in print or on social media.</p></article>
          <article><b>4</b><h3>Analyze</h3><p>Open analytics to review real scans, clicks, profile views, devices and recent activity.</p></article>
        </div>
      </section>

      <section class="landing-section shell" aria-labelledby="trustTitle">
        <div class="landing-trust">
          <div class="landing-section-head compact">
            <span class="eyebrow">SIMPLE BY DESIGN</span>
            <h2 id="trustTitle">No account friction.</h2>
            <p>Use the main tools without login or signup. Static QR creation happens in the browser, while supported trackable features use private management links.</p>
          </div>
          <div class="landing-trust-points">
            <span>✓ No login or signup</span>
            <span>✓ Unlimited static QR creation</span>
            <span>✓ Real analytics — no demo traffic</span>
            <span>✓ Private management links</span>
            <span>✓ Local PDF editing tools</span>
            <span>✓ Responsive mobile and desktop UI</span>
          </div>
        </div>
      </section>

      <section id="landingLegal" class="landing-section shell" aria-labelledby="legalTitle">
        <div class="landing-section-head compact">
          <span class="eyebrow">INFORMATION & LEGAL</span>
          <h2 id="legalTitle">Clear policies and support.</h2>
          <p>Read how QR AJN works, how information is handled and how to contact us.</p>
        </div>
        <div class="landing-legal-grid">
          <a href="/about"><span>About</span><strong>What QR AJN is and how the product works.</strong><b>Read →</b></a>
          <a href="/privacy"><span>Privacy</span><strong>How QR AJN handles data and analytics.</strong><b>Read →</b></a>
          <a href="/terms"><span>Terms</span><strong>Rules and conditions for using QR AJN.</strong><b>Read →</b></a>
          <a href="/contact"><span>Contact</span><strong>Questions, feedback or support.</strong><b>Open →</b></a>
        </div>
      </section>`;
    return guide;
  }

  function setupFooter(){
    const footer=document.querySelector('footer');
    if(!footer)return;
    footer.innerHTML=`<div class="footer-shell shell">
      <div class="footer-brand-block"><a class="footer-brand" href="/">QR AJN</a><span>Create. Share. Measure.</span></div>
      <nav class="footer-links" aria-label="Footer navigation">
        <a href="/create-qr">Create QR</a><a href="/short-link">Short Link</a><a href="/create-profile">Create Profile</a><a href="/open-analytics">Analytics</a>
      </nav>
      <nav class="footer-links footer-legal" aria-label="Legal navigation">
        <a href="/about">About</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact</a>
      </nav>
      <small>© 2026 QR AJN</small>
    </div>`;
  }

  function setupLanding(){
    const home=el('homeView');
    if(!home)return;
    home.classList.remove('hidden');
    document.body.classList.remove('route-workspace');
    for(const child of directChildren(home))child.classList.remove('app-route-hidden','app-route-visible');
    for(const id of ['shorten','smartCreate','create','profileCreate','smartTools','v9Analytics','v9PdfEditor','v9Items']){
      el(id)?.classList.add('landing-workspace-hidden');
    }
    for(const selector of ['.value-strip','.seo-benefits','.seo-faq','#how'])home.querySelector(selector)?.classList.add('landing-copy-hidden');
    setupCards();
    const hero=home.querySelector('.hero');
    const hub=el('quickToolsHub');
    if(hero&&hub)hero.insertAdjacentElement('afterend',hub);
    const guide=buildLandingGuide();
    if(hub&&!guide.isConnected)hub.insertAdjacentElement('afterend',guide);
    setupFooter();
  }

  function workspaceBar(page){
    const titles={
      'create-qr':['Create QR','Build a static or trackable QR code.'],
      'short-link':['Create Short Link','Turn a long URL into a clean qrajn.online link.'],
      'create-profile':['Create Profile','Publish a professional public profile and profile QR.'],
      'smart-tools':['Advanced Tools','Smart links, campaigns and local PDF tools.'],
      'open-analytics':['Open Analytics','Review real QR, link, profile and document activity.']
    };
    const [title,sub]=titles[page]||['QR AJN',''];
    const bar=document.createElement('section');
    bar.id='routeWorkspaceBar';
    bar.className='route-workspace-bar shell';
    bar.innerHTML=`<a href="/" class="route-back">← Home</a><div><span class="eyebrow">QR AJN WORKSPACE</span><h1>${title}</h1><p>${sub}</p></div>`;
    return bar;
  }

  function setupWorkspace(page){
    const home=el('homeView');
    if(!home)return;
    home.classList.remove('hidden');
    document.body.classList.add('route-workspace');
    document.querySelector('footer')?.classList.add('route-footer');
    const ids=WORKSPACES[page]||[];
    const wanted=new Set(ids);
    for(const child of directChildren(home)){
      const keep=wanted.has(child.id);
      child.classList.toggle('app-route-hidden',!keep);
      child.classList.toggle('app-route-visible',keep);
      if(keep){
        child.classList.remove('hidden','landing-workspace-hidden','landing-copy-hidden');
        child.removeAttribute('hidden');
      }
    }
    el('routeWorkspaceBar')?.remove();
    const first=ids.map(el).find(Boolean);
    if(first){
      const bar=workspaceBar(page);
      home.insertBefore(bar,first);
      first.classList.remove('hidden');
      first.classList.add('app-route-visible');
    }else{
      const fallback=document.createElement('section');
      fallback.id='routeWorkspaceBar';
      fallback.className='route-workspace-bar shell route-error';
      fallback.innerHTML='<a href="/" class="route-back">← Home</a><h1>Workspace unavailable</h1><p>This tool could not be loaded. Return home and try again.</p>';
      home.prepend(fallback);
    }
    setupFooter();
    requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
  }

  function apply(){
    const page=current();
    document.documentElement.dataset.appPage=page;
    setupNavigation();
    if(page==='home')setupLanding();
    else setupWorkspace(page);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{apply();requestAnimationFrame(apply)},{once:true});
  else {apply();requestAnimationFrame(apply)}
  window.addEventListener('pageshow',apply);
  window.addEventListener('popstate',()=>setTimeout(apply,0));
})();