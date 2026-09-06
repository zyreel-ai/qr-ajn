(()=>{
  const VERSION='QR_AJN_PREMIUM_LANDING_V9';
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
  const el=id=>document.getElementById(id);
  const directChildren=node=>node?[...node.children]:[];

  document.documentElement.dataset.appPage=current();
  document.documentElement.classList.add('qrajn-v9-js');

  const icon={
    qr:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h2v2h-2zm4 0h2v5h-2zm-4 4h3v2h-3z"/></svg>`,
    link:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a4 4 0 0 0 5.7 0l2.1-2.1a4 4 0 1 0-5.7-5.7l-1.2 1.2"/><path d="M13.4 10.6a4 4 0 0 0-5.7 0l-2.1 2.1a4 4 0 1 0 5.7 5.7l1.2-1.2"/></svg>`,
    user:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>`,
    chart:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/></svg>`,
    bolt:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 5 14h7l-1 8 8-12h-7z"/></svg>`,
    lock:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
    send:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>`,
    gear:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V3h4v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.1v4H21a1.7 1.7 0 0 0-1.6 1z"/></svg>`,
    grid:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    image:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5L5 20"/></svg>`,
    pdf:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M8.5 16h7M8.5 12h5"/></svg>`
  };

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
      link.classList.add('qrajn-main-nav');
    }

    for(const old of nav.querySelectorAll('.ajn-product-pill'))old.remove();

    const pdf=document.createElement('a');
    pdf.className='ajn-product-pill ajn-pdf-pill';
    pdf.href='https://ajnpdf.com';
    pdf.target='_blank';
    pdf.rel='noopener noreferrer';
    pdf.innerHTML=`<span class="product-pill-icon">${icon.pdf}</span><span>AJN PDF</span>`;

    const buzz=document.createElement('a');
    buzz.className='ajn-product-pill ajn-buzz-pill';
    buzz.href='https://ajn.buzz';
    buzz.target='_blank';
    buzz.rel='noopener noreferrer';
    buzz.innerHTML=`<span class="product-pill-icon">${icon.image}</span><span>AJN BUZZ</span>`;

    nav.append(pdf,buzz);
  }

  function setupHero(){
    const hero=document.querySelector('#homeView>.hero');
    if(!hero)return;
    hero.classList.add('qrajn-premium-hero');
    hero.dataset.landingVersion=VERSION;
    hero.innerHTML=`
      <div class="qrajn-hero-copy">
        <span class="qrajn-eyebrow">SIMPLE TOOLS. BIGGER POSSIBILITIES.</span>
        <h1>QR Codes, Short Links,<br>Profiles and Analytics<br><span>All in One Place</span></h1>
        <p>Create, customize, and manage QR codes, short links and digital profiles with powerful analytics. Simple, fast and free — built by AJN for everyone.</p>
        <div class="qrajn-hero-actions">
          <a class="qrajn-btn qrajn-btn-primary" href="/create-qr">Get Started Free <span aria-hidden="true">→</span></a>
          <a class="qrajn-btn qrajn-btn-secondary" href="#qrajnFeatures">Explore Features</a>
        </div>
        <div class="qrajn-trust-points" aria-label="QR AJN highlights">
          <span><i>✓</i>No account required</span>
          <span><i>✓</i>Free to use</span>
          <span><i>✓</i>Powerful and easy</span>
        </div>
      </div>

      <div class="qrajn-hero-visual" aria-label="QR AJN product preview">
        <div class="hero-orb hero-orb-one"></div>
        <div class="hero-orb hero-orb-two"></div>

        <div class="floating-chip chip-qr"><span>${icon.qr}</span><b>QR Codes</b></div>
        <div class="floating-chip chip-link"><span>${icon.link}</span><b>Short Links</b></div>
        <div class="floating-chip chip-profile"><span>${icon.user}</span><b>Profiles</b></div>
        <div class="floating-chip chip-analytics"><span>${icon.chart}</span><b>Analytics</b></div>

        <div class="hero-dashboard">
          <div class="dashboard-window-bar"><i></i><i></i><i></i><span>qrajn.online</span></div>
          <div class="dashboard-body">
            <aside class="dashboard-sidebar">
              <div class="mini-brand"><span class="mini-brand-mark">▦</span><b>QR AJN</b></div>
              <a class="active">${icon.qr}<span>Create QR</span></a>
              <a>${icon.link}<span>Short Link</span></a>
              <a>${icon.user}<span>Create Profile</span></a>
              <a>${icon.chart}<span>Analytics</span></a>
            </aside>

            <div class="dashboard-main">
              <div class="qr-preview-card">
                <span class="preview-tag">Preview</span>
                <svg class="mock-qr" viewBox="0 0 124 124" role="img" aria-label="QR code preview">
                  <rect width="124" height="124" rx="10" fill="#fff"/>
                  <g fill="#0f172a">
                    <rect x="8" y="8" width="30" height="30" rx="2"/><rect x="13" y="13" width="20" height="20" fill="#fff"/><rect x="18" y="18" width="10" height="10"/>
                    <rect x="86" y="8" width="30" height="30" rx="2"/><rect x="91" y="13" width="20" height="20" fill="#fff"/><rect x="96" y="18" width="10" height="10"/>
                    <rect x="8" y="86" width="30" height="30" rx="2"/><rect x="13" y="91" width="20" height="20" fill="#fff"/><rect x="18" y="96" width="10" height="10"/>
                    <rect x="47" y="8" width="7" height="7"/><rect x="60" y="8" width="7" height="7"/><rect x="69" y="15" width="7" height="7"/>
                    <rect x="44" y="26" width="8" height="8"/><rect x="58" y="25" width="7" height="7"/><rect x="72" y="27" width="8" height="8"/>
                    <rect x="44" y="44" width="8" height="8"/><rect x="56" y="42" width="9" height="9"/><rect x="69" y="44" width="7" height="7"/><rect x="82" y="46" width="8" height="8"/><rect x="96" y="44" width="7" height="7"/>
                    <rect x="8" y="47" width="8" height="8"/><rect x="21" y="44" width="7" height="7"/><rect x="32" y="54" width="8" height="8"/><rect x="48" y="58" width="7" height="7"/>
                    <rect x="60" y="57" width="8" height="8"/><rect x="74" y="59" width="8" height="8"/><rect x="88" y="57" width="7" height="7"/><rect x="104" y="57" width="8" height="8"/>
                    <rect x="9" y="67" width="7" height="7"/><rect x="22" y="68" width="8" height="8"/><rect x="36" y="70" width="7" height="7"/><rect x="50" y="71" width="8" height="8"/>
                    <rect x="63" y="70" width="7" height="7"/><rect x="76" y="72" width="9" height="9"/><rect x="91" y="69" width="8" height="8"/><rect x="106" y="72" width="7" height="7"/>
                    <rect x="45" y="86" width="8" height="8"/><rect x="58" y="85" width="7" height="7"/><rect x="70" y="88" width="8" height="8"/><rect x="83" y="86" width="7" height="7"/>
                    <rect x="96" y="88" width="9" height="9"/><rect x="108" y="87" width="7" height="7"/><rect x="45" y="101" width="8" height="8"/><rect x="58" y="105" width="8" height="8"/>
                    <rect x="72" y="101" width="7" height="7"/><rect x="84" y="105" width="8" height="8"/><rect x="98" y="102" width="7" height="7"/><rect x="109" y="107" width="7" height="7"/>
                  </g>
                  <rect x="48" y="48" width="28" height="28" rx="8" fill="#6c4cf5"/>
                  <path d="M56 62h12M62 56v12" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
                </svg>
                <div class="dashboard-link-field"><span>https://qrajn.online/your-link</span><button type="button" aria-disabled="true">Copy</button></div>
              </div>

              <div class="analytics-preview-card">
                <div class="analytics-preview-head"><div><span>Analytics</span><small>Example preview</small></div><b>LIVE</b></div>
                <svg class="hero-chart" viewBox="0 0 250 120" aria-hidden="true">
                  <defs><linearGradient id="heroChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6" stop-opacity=".22"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/></linearGradient></defs>
                  <path d="M8 101 C35 92 43 63 68 68 S103 89 125 60 S163 35 181 45 S217 49 242 19 L242 112 L8 112Z" fill="url(#heroChartFill)"/>
                  <path class="hero-chart-line" pathLength="100" d="M8 101 C35 92 43 63 68 68 S103 89 125 60 S163 35 181 45 S217 49 242 19" fill="none" stroke="#3b82f6" stroke-width="4" stroke-linecap="round"/>
                </svg>
                <div class="analytics-total"><span>Total Scans</span><strong>0</strong><small>Starts with real activity</small></div>
              </div>
            </div>
          </div>
        </div>

        <div class="hand-note hand-note-left">Create. Share. Track. Grow.</div>
        <div class="hand-note hand-note-right">One link.<br>More possibilities.</div>
      </div>`;
  }

  function toolCard(href,tone,iconSvg,title,text){
    return `<a class="qrajn-tool-card ${tone}" href="${href}">
      <span class="qrajn-tool-icon">${iconSvg}</span>
      <span class="qrajn-tool-copy"><strong>${title}</strong><small>${text}</small></span>
      <span class="qrajn-tool-arrow" aria-hidden="true">→</span>
    </a>`;
  }

  function setupCards(){
    const hub=el('quickToolsHub');
    if(!hub)return;
    hub.classList.add('qrajn-primary-tools');
    const heading=hub.querySelector('.quick-tools-heading');
    if(heading)heading.innerHTML=`<span class="qrajn-eyebrow">START WITH QR AJN</span>
      <h2 id="quickToolsTitle">Everything important, one click away.</h2>
      <p>Four focused workspaces for creating, sharing and measuring.</p>`;
    const grid=hub.querySelector('.quick-tools-grid');
    if(grid)grid.innerHTML=[
      toolCard('/create-qr','tone-blue',icon.qr,'Create QR','Generate QR codes for links, text, locations, WiFi and more.'),
      toolCard('/short-link','tone-purple',icon.link,'Create Short Link','Turn long URLs into clean, custom short links.'),
      toolCard('/create-profile','tone-mint',icon.user,'Create Profile','Build a beautiful digital profile with all your links.'),
      toolCard('/open-analytics','tone-orange',icon.chart,'Open Analytics','Track performance and gain valuable insights.')
    ].join('');
    hub.dataset.cardCount=String(HOME_CARD_ROUTES.length);
  }

  function featureCard(tone,iconSvg,title,text){
    return `<article class="qrajn-feature-card ${tone}" data-reveal>
      <span class="qrajn-feature-icon">${iconSvg}</span>
      <div><h3>${title}</h3><p>${text}</p></div>
    </article>`;
  }

  function buildLandingGuide(){
    let guide=el('landingFeatureGuide');
    if(!guide){
      guide=document.createElement('div');
      guide.id='landingFeatureGuide';
      guide.className='landing-feature-guide';
    }
    guide.innerHTML=`
      <section id="qrajnFeatures" class="qrajn-mega-section shell" aria-labelledby="qrajnFeaturesTitle" data-reveal>
        <div class="qrajn-feature-intro">
          <span class="qrajn-eyebrow">WHY CHOOSE QR AJN</span>
          <h2 id="qrajnFeaturesTitle">Powerful Features<br>for Everyday Use</h2>
          <p>Everything you need to create, share and grow — in one simple platform.</p>
          <span class="qrajn-accent-line" aria-hidden="true"></span>
        </div>
        <div class="qrajn-feature-grid">
          ${featureCard('feature-blue',icon.bolt,'Dynamic QR Codes','Update content anytime, no need to reprint.')}
          ${featureCard('feature-purple',icon.link,'Custom Short Links','Create branded, memorable links for your brand.')}
          ${featureCard('feature-blue',icon.user,'Digital Profiles','Showcase all your important links in one page.')}
          ${featureCard('feature-teal',icon.chart,'Detailed Analytics','Track scans and supported activity in real time.')}
          ${featureCard('feature-purple',icon.lock,'No Login Required','Start using immediately without an account.')}
          ${featureCard('feature-green',icon.send,'Fast Sharing','Share anywhere with one click.')}
          ${featureCard('feature-purple',icon.gear,'Management Links','Get a private link to edit supported content anytime.')}
          ${featureCard('feature-purple',icon.grid,'Simple Workflows','Clean, intuitive and beginner-friendly.')}
        </div>
      </section>

      <section class="qrajn-products-section shell" aria-labelledby="qrajnProductsTitle" data-reveal>
        <div class="qrajn-product-intro">
          <span class="qrajn-eyebrow">MORE TOOLS. MORE POSSIBILITIES.</span>
          <h2 id="qrajnProductsTitle">Recommended AJN Products</h2>
          <p>Explore our other products to do more with your content.</p>
        </div>
        <div class="qrajn-product-grid">
          <a class="qrajn-product-card product-buzz" href="https://ajn.buzz" target="_blank" rel="noopener noreferrer">
            <span class="product-card-icon">${icon.image}</span>
            <div class="product-card-copy"><div class="product-title-row"><strong>AJN BUZZ</strong><small>Image Tools</small></div><p>A powerful collection of professional image tools for everyday use. Resize, convert, compress and more.</p><b>Explore AJN BUZZ →</b></div>
            <div class="buzz-illustration" aria-hidden="true"><span class="photo photo-one"><i></i></span><span class="photo photo-two"><i></i></span><em>Image<br>Tools</em></div>
          </a>

          <a class="qrajn-product-card product-pdf" href="https://ajnpdf.com" target="_blank" rel="noopener noreferrer">
            <span class="product-card-icon">${icon.pdf}</span>
            <div class="product-card-copy"><div class="product-title-row"><strong>AJN PDF</strong><small>PDF Tools</small></div><p>Edit, convert, compress and manage PDF documents with ease.</p><b>Explore AJN PDF →</b></div>
            <div class="pdf-illustration" aria-hidden="true"><span class="pdf-paper pdf-back"></span><span class="pdf-paper pdf-front"><b>PDF</b></span><em>PDF<br>Tools</em></div>
          </a>
        </div>
      </section>

      <section class="qrajn-how-section shell" aria-labelledby="qrajnHowTitle" data-reveal>
        <div class="qrajn-how-intro">
          <span class="qrajn-eyebrow">GET STARTED IN SECONDS</span>
          <h2 id="qrajnHowTitle">How It Works</h2>
          <p>Create, share and track in just a few simple steps.</p>
        </div>
        <div class="qrajn-steps">
          <article><span>1</span><div><strong>Choose a Tool</strong><p>Create a QR code, short link, profile or open analytics.</p></div></article>
          <i aria-hidden="true">→</i>
          <article><span>2</span><div><strong>Customize</strong><p>Add your content and personalize it.</p></div></article>
          <i aria-hidden="true">→</i>
          <article><span>3</span><div><strong>Share</strong><p>Use your QR code, link or profile anywhere.</p></div></article>
          <i aria-hidden="true">→</i>
          <article><span>4</span><div><strong>Track & Manage</strong><p>View analytics and update supported items anytime.</p></div></article>
        </div>
      </section>`;
    return guide;
  }

  function setupFooter(){
    const footer=document.querySelector('footer');
    if(!footer)return;
    footer.classList.add('qrajn-footer');
    footer.innerHTML=`<div class="qrajn-footer-wave" aria-hidden="true"></div><div class="footer-shell shell">
      <div class="footer-brand-block">
        <a class="footer-brand" href="/"><span class="footer-mini-logo">▦</span><span><strong>QR AJN</strong><small>QR · Profiles · Analytics</small></span></a>
        <p>Simple tools for a more connected world.<br>Built by AJN. Free for everyone.</p>
        <small>© 2026 QR AJN. All rights reserved.</small>
      </div>
      <nav class="footer-links footer-legal" aria-label="Footer navigation">
        <a href="/about">About</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact</a><a href="/sitemap.xml">Sitemap</a>
      </nav>
      <div class="footer-right">
        <div class="footer-socials" aria-label="Social icons">
          <span aria-hidden="true">𝕏</span><span aria-hidden="true">f</span><span aria-hidden="true">▶</span><span aria-hidden="true">in</span>
        </div>
        <a class="footer-domain" href="/">qrajn.online</a>
        <span class="made-by">Made with <b>♥</b> by AJN</span>
        <div class="footer-ecosystem"><a href="https://ajn.buzz" target="_blank" rel="noopener noreferrer">AJN BUZZ ↗</a><a href="https://ajnpdf.com" target="_blank" rel="noopener noreferrer">AJN PDF ↗</a></div>
      </div>
    </div>`;
  }

  function setupRevealAnimations(){
    const nodes=[...document.querySelectorAll('[data-reveal]')];
    if(!nodes.length)return;
    if(!('IntersectionObserver' in window)){
      nodes.forEach(node=>node.classList.add('is-visible'));
      return;
    }
    if(!window.__qrajnLandingObserver){
      window.__qrajnLandingObserver=new IntersectionObserver(entries=>{
        for(const entry of entries){
          if(!entry.isIntersecting)continue;
          entry.target.classList.add('is-visible');
          window.__qrajnLandingObserver.unobserve(entry.target);
        }
      },{threshold:.12,rootMargin:'0px 0px -4% 0px'});
    }
    for(const node of nodes){
      if(node.dataset.revealBound==='1')continue;
      node.dataset.revealBound='1';
      window.__qrajnLandingObserver.observe(node);
    }
  }

  function setupLanding(){
    const home=el('homeView');
    if(!home)return;
    home.classList.remove('hidden');
    document.body.classList.remove('route-workspace');
    document.querySelector('footer')?.classList.remove('route-footer');

    for(const child of directChildren(home))child.classList.remove('app-route-hidden','app-route-visible');
    for(const id of ['shorten','smartCreate','create','profileCreate','smartTools','v9Analytics','v9PdfEditor','v9Items']){
      el(id)?.classList.add('landing-workspace-hidden');
    }
    for(const selector of ['.value-strip','.seo-benefits','.seo-faq','#how'])home.querySelector(selector)?.classList.add('landing-copy-hidden');

    setupHero();
    setupCards();

    const hero=home.querySelector('.hero');
    const hub=el('quickToolsHub');
    if(hero&&hub)hero.insertAdjacentElement('afterend',hub);

    const guide=buildLandingGuide();
    if(hub&&!guide.isConnected)hub.insertAdjacentElement('afterend',guide);

    setupFooter();
    setupRevealAnimations();
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

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{apply();requestAnimationFrame(apply)},{once:true});
  }else{
    apply();
    requestAnimationFrame(apply);
  }
  window.addEventListener('pageshow',apply);
  window.addEventListener('popstate',()=>setTimeout(apply,0));
})();