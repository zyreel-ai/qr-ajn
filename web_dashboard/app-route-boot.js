(()=>{
  const VERSION='QR_AJN_COMPLETE_UI_V10';
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
    'smart-tools':['smartTools','smartCreate','v9PdfEditor','v9Items'],
    'open-analytics':['v9Analytics']
  };
  const HOME_CARD_ROUTES=['/create-qr','/short-link','/create-profile','/open-analytics'];
  const path=()=>{const p=String(location.pathname||'/').replace(/\/+$/,'');return p||'/'};
  const current=()=>ROUTES[path()]||'home';
  const el=id=>document.getElementById(id);
  const directChildren=node=>node?[...node.children]:[];

  // UI-only analytics capture. The existing API/data model remains untouched.
  // We clone successful real analytics responses so the V10 UI can draw richer charts
  // without inventing demo values or changing backend event collection.
  if(!window.__qrajnFetchCaptured){
    window.__qrajnFetchCaptured=true;
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async(...args)=>{
      const response=await nativeFetch(...args);
      try{
        const source=typeof args[0]==='string'?args[0]:String(args[0]?.url||'');
        if(/\/api\/v9\/analytics(?:\?|$)/.test(source)&&response.ok){
          response.clone().json().then(data=>{
            if(data&&data.ok)window.dispatchEvent(new CustomEvent('qrajn:analytics-data',{detail:data}));
          }).catch(()=>{});
        }
      }catch{}
      return response;
    };
  }

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
              <div class="mini-brand"><img class="mini-brand-logo-v12" src="/qr-ajn-logo-v12.png" alt="" width="24" height="24"><b>QR AJN</b></div>
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
                <div class="analytics-preview-head"><div><span>Analytics</span><small>Real activity only</small></div><b>LIVE</b></div>
                <div class="hero-chart-empty"><span>${icon.chart}</span><strong>No activity yet</strong><small>Your charts appear after real scans and clicks.</small></div>
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
        <a class="footer-brand" href="/"><img class="footer-brand-logo-v12" src="/qr-ajn-logo-v12.png" alt="" width="42" height="42"><span><strong>QR AJN</strong><small>QR · Profiles · Analytics</small></span></a>
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


  function typeGlyph(type){
    const map={
      url:'<svg viewBox="0 0 24 24"><path d="M10.6 13.4a4 4 0 0 0 5.7 0l2.1-2.1a4 4 0 1 0-5.7-5.7l-1.2 1.2"/><path d="M13.4 10.6a4 4 0 0 0-5.7 0l-2.1 2.1a4 4 0 1 0 5.7 5.7l1.2-1.2"/></svg>',
      text:'<svg viewBox="0 0 24 24"><path d="M5 5h14M12 5v14M8 19h8"/></svg>',
      wifi:'<svg viewBox="0 0 24 24"><path d="M3 9a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0M9 15a4 4 0 0 1 6 0"/><circle cx="12" cy="19" r="1"/></svg>',
      whatsapp:'<svg viewBox="0 0 24 24"><path d="M20 11.5a8 8 0 0 1-11.7 7.1L4 20l1.4-4.1A8 8 0 1 1 20 11.5Z"/><path d="M9 8.5c.5 2 2.5 4 4.5 4.5"/></svg>',
      vcard:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M6 16c.7-2 5.3-2 6 0M15 9h3M15 13h3"/></svg>',
      email:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
      phone:'<svg viewBox="0 0 24 24"><path d="M7 3h3l1 4-2 1a13 13 0 0 0 7 7l1-2 4 1v3c0 2-2 4-4 4A16 16 0 0 1 3 7c0-2 2-4 4-4Z"/></svg>',
      sms:'<svg viewBox="0 0 24 24"><path d="M4 5h16v12H9l-5 4z"/><path d="M8 10h8M8 13h5"/></svg>',
      location:'<svg viewBox="0 0 24 24"><path d="M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/></svg>'
    };
    return map[type]||icon.qr;
  }

  function setWorkspaceHeading(section,eyebrow,title,copy){
    const heading=section?.querySelector(':scope>.section-heading');
    if(!heading)return;
    heading.classList.add('v10-screen-heading');
    heading.innerHTML=`<span class="qrajn-eyebrow">${eyebrow}</span><h2>${title}</h2><p>${copy}</p>`;
  }

  function stepper(items,active=0){
    return `<div class="v10-stepper" aria-label="Workflow steps">${items.map((x,i)=>`<span class="${i===active?'active':''}"><b>${i+1}</b><small>${x}</small></span>`).join('')}</div>`;
  }

  function addOnce(id,parent,position,html){
    if(el(id)||!parent)return el(id);
    parent.insertAdjacentHTML(position,html);
    return el(id);
  }

  function decorateQrWorkspace(){
    const section=el('create');
    if(!section||section.dataset.v10==='1')return;
    section.dataset.v10='1';
    section.classList.add('v10-workspace','v10-create-qr');
    setWorkspaceHeading(section,'CREATE. CUSTOMIZE. SHARE.','Create QR Code','Build static or trackable QR codes in seconds. Turn a link, text, Wi-Fi network, contact detail or location into a professional QR code.');
    const heading=section.querySelector(':scope>.section-heading');
    addOnce('qrV10Stepper',heading,'afterend',`<div id="qrV10Stepper">${stepper(['Content','Design','Preview','Download'],0)}</div>`);

    const qrType=el('qrType');
    if(qrType&&!el('qrContentTypeCards')){
      const label=qrType.closest('label');
      const cards=document.createElement('div');
      cards.id='qrContentTypeCards';
      cards.className='v10-type-card-wrap';
      cards.innerHTML=`<div class="v10-control-title"><span>1</span><div><strong>Choose Content Type</strong><small>Select what your QR code will contain.</small></div></div><div class="v10-type-card-grid"></div>`;
      label?.parentElement?.insertBefore(cards,label);
      const grid=cards.querySelector('.v10-type-card-grid');
      [...qrType.options].forEach(option=>{
        const button=document.createElement('button');
        button.type='button';
        button.dataset.type=option.value;
        button.innerHTML=`<span>${typeGlyph(option.value)}</span><small>${option.textContent}</small>`;
        button.addEventListener('click',()=>{
          qrType.value=option.value;
          qrType.dispatchEvent(new Event('change',{bubbles:true}));
          refreshTypeCards();
        });
        grid.append(button);
      });
      const refreshTypeCards=()=>grid.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.type===qrType.value));
      qrType.addEventListener('change',refreshTypeCards);
      refreshTypeCards();
    }

    const grid=section.querySelector('.creator-grid');
    if(grid)grid.classList.add('v10-creator-grid');
    addOnce('qrV10Benefits',grid||section,'afterend',`<div id="qrV10Benefits" class="v10-benefit-row">
      <article><span>${icon.qr}</span><div><strong>Reliable QR generation</strong><small>Built for clear scanning across common devices.</small></div></article>
      <article><span>${icon.grid}</span><div><strong>High contrast guidance</strong><small>Professional colors, eyes, modules and quiet zones.</small></div></article>
      <article><span>${icon.send}</span><div><strong>PNG & SVG exports</strong><small>Clean files for digital use and print workflows.</small></div></article>
      <article><span>${icon.link}</span><div><strong>Trackable destinations</strong><small>Use private management links when tracking is enabled.</small></div></article>
    </div>`);
  }

  function decorateShortLinkWorkspace(){
    const section=el('shorten');
    if(!section||section.dataset.v10==='1')return;
    section.dataset.v10='1';
    section.classList.add('v10-workspace','v10-short-link');
    setWorkspaceHeading(section,'SHORTER LINKS. CLEARER SHARING.','Create Short Link','Turn long URLs into clean, memorable qrajn.online links. Start simple and open advanced settings only when you need them.');

    const form=el('v9QuickShortForm');
    const result=el('v9QuickResult');
    if(form&&!el('shortLinkWorkspaceGrid')){
      const grid=document.createElement('div');
      grid.id='shortLinkWorkspaceGrid';
      grid.className='v10-shortlink-grid';
      form.parentNode.insertBefore(grid,form);
      grid.append(form);
      form.classList.add('v10-shortlink-form');

      const details=document.createElement('details');
      details.className='v10-advanced-options';
      details.innerHTML=`<summary><span>${icon.gear}</span><div><strong>Advanced Options</strong><small>UTM tracking, timing and device routing are available in Smart Link.</small></div><b>+</b></summary><div><p>Keep quick shortening focused here. Open the advanced Smart Link workflow only when you need campaign parameters, schedules or device-specific destinations.</p><a class="qrajn-btn qrajn-btn-secondary" href="/smart-tools">Open Smart Link settings →</a></div>`;
      const msg=el('v9QuickMessage');
      if(msg)form.insertBefore(details,msg);else form.append(details);

      const aside=document.createElement('aside');
      aside.className='v10-short-result panel';
      aside.innerHTML=`<div id="shortLinkEmptyState" class="v10-result-empty"><span class="v10-empty-icon">${icon.link}</span><h3>Your short link will appear here.</h3><p>Create a short link to get its public URL, QR sharing options and private management link.</p><ul><li>Custom public name</li><li>Private management</li><li>Real click analytics</li><li>QR-ready sharing</li></ul></div>`;
      grid.append(aside);
      if(result){
        aside.append(result);
        result.classList.add('v10-short-result-live');
        const sync=()=>el('shortLinkEmptyState')?.classList.toggle('hidden',!result.classList.contains('hidden'));
        new MutationObserver(sync).observe(result,{attributes:true,attributeFilter:['class']});
        sync();
      }
    }

    addOnce('shortLinkV10Benefits',el('shortLinkWorkspaceGrid')||section,'afterend',`<div id="shortLinkV10Benefits" class="v10-benefit-row">
      <article><span>${icon.link}</span><div><strong>Clean public links</strong><small>Compact qrajn.online URLs designed for sharing.</small></div></article>
      <article><span>${icon.grid}</span><div><strong>Custom slugs</strong><small>Choose a memorable public name when available.</small></div></article>
      <article><span>${icon.lock}</span><div><strong>Private management</strong><small>Keep the management link safe for later edits.</small></div></article>
      <article><span>${icon.chart}</span><div><strong>Real analytics</strong><small>Clicks and device information begin at zero.</small></div></article>
    </div>`);
  }

  function decorateProfileWorkspace(){
    const section=el('profileCreate');
    if(!section||section.dataset.v10==='1')return;
    section.dataset.v10='1';
    section.classList.add('v10-workspace','v10-create-profile');
    setWorkspaceHeading(section,'YOUR DIGITAL IDENTITY. YOUR WAY.','Create Profile','Build a professional digital profile with your most important links, contact actions, visual identity and shareable QR code.');
    const heading=section.querySelector(':scope>.section-heading');
    addOnce('profileV10Stepper',heading,'afterend',`<div id="profileV10Stepper">${stepper(['Identity','Links','Appearance','Publish'],0)}</div>`);
    section.querySelector('.profile-grid')?.classList.add('v10-profile-grid');
    section.querySelector('.profile-form')?.classList.add('v10-profile-form');
    section.querySelector('.profile-preview')?.classList.add('v10-profile-preview');
    const created=el('profileCreatedCard');
    addOnce('profileV10Benefits',created||section,'afterend',`<div id="profileV10Benefits" class="v10-benefit-row">
      <article><span>${icon.user}</span><div><strong>Digital visiting card</strong><small>A professional public identity without an account.</small></div></article>
      <article><span>${icon.link}</span><div><strong>All your links</strong><small>Website, contact actions, social links and custom URLs.</small></div></article>
      <article><span>${icon.gear}</span><div><strong>Easy updates</strong><small>Use the private management link for supported edits.</small></div></article>
      <article><span>${icon.chart}</span><div><strong>Profile analytics</strong><small>Views and actions begin with real activity.</small></div></article>
    </div>`);
  }

  function barsHtml(obj,empty='No data yet.'){
    const entries=Object.entries(obj||{}).filter(([,v])=>Number(v)>0).sort((a,b)=>b[1]-a[1]);
    const max=Math.max(1,...entries.map(([,v])=>Number(v)||0));
    return entries.length?entries.map(([label,value])=>`<div class="v10-rank-row"><span>${escText(label||'Other')}</span><i><b style="width:${Math.max(2,(Number(value)||0)/max*100)}%"></b></i><strong>${Number(value)||0}</strong></div>`).join(''):`<div class="v10-empty-inline">${empty}</div>`;
  }

  function escText(value=''){
    return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function donutHtml(obj,centerLabel='Total'){
    const entries=Object.entries(obj||{}).filter(([,v])=>Number(v)>0).sort((a,b)=>b[1]-a[1]);
    const total=entries.reduce((s,[,v])=>s+Number(v||0),0);
    if(!total)return `<div class="v10-empty-inline">No data yet.</div>`;
    const palette=['#3b82f6','#6c4cf5','#10b981','#f97316','#14b8a6','#94a3b8'];
    let cursor=0;
    const stops=entries.map(([,v],i)=>{
      const start=cursor;
      cursor+=Number(v)/total*100;
      return `${palette[i%palette.length]} ${start}% ${cursor}%`;
    }).join(',');
    return `<div class="v10-donut-layout"><div class="v10-donut" style="background:conic-gradient(${stops})"><span><strong>${total}</strong><small>${centerLabel}</small></span></div><div class="v10-donut-legend">${entries.map(([k,v],i)=>`<div><i style="background:${palette[i%palette.length]}"></i><span>${escText(k)}</span><b>${v}</b></div>`).join('')}</div></div>`;
  }

  function lineChartHtml(byDay,cumulative=false){
    const entries=Object.entries(byDay||{}).sort(([a],[b])=>a.localeCompare(b));
    if(!entries.length||!entries.some(([,v])=>Number(v)>0))return `<div class="v10-chart-empty">${icon.chart}<strong>No activity yet</strong><small>Charts appear after real events are recorded.</small></div>`;
    let running=0;
    const values=entries.map(([,v])=>cumulative?(running+=Number(v||0)):Number(v||0));
    const max=Math.max(1,...values);
    const w=720,h=220,pad=18;
    const points=values.map((v,i)=>{
      const x=pad+(entries.length===1?0:i/(entries.length-1))*(w-pad*2);
      const y=h-pad-(v/max)*(h-pad*2);
      return [x,y];
    });
    const path=points.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
    const area=`${path} L ${points.at(-1)[0].toFixed(1)} ${h-pad} L ${points[0][0].toFixed(1)} ${h-pad} Z`;
    const labels=entries.filter((_,i)=>i===0||i===entries.length-1||i===Math.floor(entries.length/2)).map(([d],idx,arr)=>{
      const sourceIndex=idx===0?0:idx===arr.length-1?entries.length-1:Math.floor(entries.length/2);
      const x=pad+(entries.length===1?0:sourceIndex/(entries.length-1))*(w-pad*2);
      return `<text x="${x}" y="${h-2}" text-anchor="${idx===0?'start':idx===arr.length-1?'end':'middle'}">${escText(d.slice(5))}</text>`;
    }).join('');
    return `<svg class="v10-line-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${cumulative?'Cumulative activity':'Activity over time'}"><defs><linearGradient id="${cumulative?'cumFill':'actFill'}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6" stop-opacity=".24"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#${cumulative?'cumFill':'actFill'})"/><path class="v10-draw-path" d="${path}" fill="none" stroke="${cumulative?'#3b82f6':'#5b6ff5'}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" pathLength="100"/><g class="v10-chart-labels">${labels}</g></svg>`;
  }

  function activityBuckets(events,mode){
    const out={};
    if(mode==='hour'){
      for(let h=0;h<24;h++)out[String(h).padStart(2,'0')+':00']=0;
      for(const event of events||[]){const d=new Date(event.createdAt);if(!Number.isNaN(d.getTime()))out[String(d.getHours()).padStart(2,'0')+':00']++}
    }else{
      const labels=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      labels.forEach(x=>out[x]=0);
      for(const event of events||[]){const d=new Date(event.createdAt);if(!Number.isNaN(d.getTime()))out[labels[d.getDay()]]++}
    }
    return out;
  }

  function recentResources(events){
    const map={};
    for(const e of events||[]){
      const key=`${e.resourceType||'resource'}:${e.resourceId||'unknown'}`;
      map[key]=(map[key]||0)+1;
    }
    return map;
  }

  function setupAnalyticsFilters(){
    const toolbar=document.querySelector('#v9Analytics .v9-analytics-toolbar');
    if(!toolbar||el('v10EventFilter'))return;
    const eventLabel=document.createElement('label');
    eventLabel.className='v10-filter';
    eventLabel.innerHTML=`Event<select id="v10EventFilter"><option value="">All events</option><option value="qr_scan">QR scans</option><option value="link_click">Link clicks</option><option value="profile_view">Profile views</option><option value="action">Profile actions</option><option value="document_view">Document views</option><option value="document_share">Document shares</option></select>`;
    const resourceLabel=document.createElement('label');
    resourceLabel.className='v10-filter';
    resourceLabel.innerHTML=`Resource<select id="v10ResourceFilter"><option value="">All real activity</option></select>`;
    toolbar.prepend(resourceLabel,eventLabel);

    try{
      const items=JSON.parse(localStorage.getItem('qrajn-private-items-v9')||'[]');
      const select=resourceLabel.querySelector('select');
      for(const item of items.slice(0,40)){
        if(!item.manageUrl)continue;
        const option=document.createElement('option');
        option.value=item.manageUrl;
        option.textContent=item.name||item.kind||'Saved item';
        select.append(option);
      }
      select.addEventListener('change',()=>{if(select.value)location.href=select.value});
    }catch{}
    eventLabel.querySelector('select').addEventListener('change',()=>window.__qrajnAnalyticsV10Data&&renderAnalyticsV10(window.__qrajnAnalyticsV10Data));
  }

  function decorateAnalyticsWorkspace(){
    const section=el('v9Analytics');
    if(!section||section.dataset.v10==='1')return;
    section.dataset.v10='1';
    section.classList.add('v10-workspace','v10-analytics');
    setWorkspaceHeading(section,'DATA INTO CLEAR INSIGHTS.','Open Analytics','Understand scans, clicks, profile activity and document events from supported QR AJN resources. Every visible number starts with real activity.');
    const privateCard=section.querySelector('.route-private-analytics-card');
    if(privateCard)privateCard.innerHTML=`<div><small>OPEN PRIVATE ANALYTICS</small><strong>Have a private management link?</strong><p>Open the analytics for a QR code, link or profile you created earlier. No login is required.</p></div><button id="routeOpenPrivateAnalytics" class="button primary" type="button">Open private analytics</button>`;
    setupAnalyticsFilters();

    const metrics=section.querySelector('.v9-metric-grid');
    if(metrics&&!el('v10StatActions')){
      metrics.insertAdjacentHTML('beforeend',`<article><small>Profile actions</small><strong id="v10StatActions">0</strong><span>Supported public actions</span></article><article><small>Document shares</small><strong id="v10StatShares">0</strong><span>Tracked PDF shares</span></article>`);
    }

    if(!el('analyticsV10Empty')){
      const toolbar=section.querySelector('.v9-analytics-toolbar');
      toolbar?.insertAdjacentHTML('afterend',`<section id="analyticsV10Empty" class="panel v10-analytics-empty"><span>${icon.chart}</span><div><strong>Your analytics will appear here.</strong><p>Create a trackable QR, short link or profile, or open a private management link. QR AJN never fills this screen with fake activity.</p><div><a class="qrajn-btn qrajn-btn-primary" href="/create-qr">Create Trackable QR</a><a class="qrajn-btn qrajn-btn-secondary" href="/short-link">Create Short Link</a></div></div></section>`);
    }

    const baseGrid=section.querySelector('.analytics-grid');
    if(baseGrid)baseGrid.classList.add('v10-base-analytics-grid');

    if(!el('analyticsV10Modules')){
      const recentPanel=el('v9RecentActivity')?.closest('.panel');
      const modules=document.createElement('div');
      modules.id='analyticsV10Modules';
      modules.className='v10-analytics-modules';
      modules.innerHTML=`
        <div class="v10-analytics-primary">
          <section class="panel v10-chart-card v10-span-8"><div class="panel-head"><div><small>TREND</small><h3>Activity Over Time</h3><p>Real supported events across the selected date range.</p></div></div><div id="v10ActivityLine"></div></section>
          <section class="panel v10-chart-card v10-span-4"><div class="panel-head"><div><small>MIX</small><h3>Event Mix</h3><p>How real activity is distributed.</p></div></div><div id="v10EventMix"></div></section>
        </div>
        <div class="v10-analytics-secondary">
          <section class="panel v10-chart-card"><div class="panel-head compact"><div><small>SYSTEMS</small><h3>Operating Systems</h3></div></div><div id="v10Systems"></div></section>
          <section class="panel v10-chart-card"><div class="panel-head compact"><div><small>SOURCES</small><h3>Traffic Sources</h3></div></div><div id="v10Referrers"></div></section>
          <section class="panel v10-chart-card"><div class="panel-head compact"><div><small>RECENT SAMPLE</small><h3>Activity by Hour</h3><p>Based only on the real recent events returned by the API.</p></div></div><div id="v10Hours"></div></section>
          <section class="panel v10-chart-card"><div class="panel-head compact"><div><small>RECENT SAMPLE</small><h3>Activity by Day</h3><p>Based only on the real recent events returned by the API.</p></div></div><div id="v10Weekdays"></div></section>
          <section class="panel v10-chart-card"><div class="panel-head compact"><div><small>CHANNELS</small><h3>QR vs Link Activity</h3></div></div><div id="v10QrVsLink"></div></section>
          <section class="panel v10-chart-card"><div class="panel-head compact"><div><small>GROWTH</small><h3>Cumulative Activity</h3></div></div><div id="v10Cumulative"></div></section>
          <section id="v10ProfileEngagementCard" class="panel v10-chart-card"><div class="panel-head compact"><div><small>PROFILE</small><h3>Profile Engagement</h3></div></div><div id="v10ProfileEngagement"></div></section>
          <section id="v10DocumentCard" class="panel v10-chart-card"><div class="panel-head compact"><div><small>DOCUMENTS</small><h3>Recent Document Activity</h3></div></div><div id="v10Documents"></div></section>
          <section id="v10GeoCard" class="panel v10-chart-card"><div class="panel-head compact"><div><small>LOCATION</small><h3>Approximate Locations</h3><p>Only shown when the analytics API supplies location fields.</p></div></div><div id="v10Geo"></div></section>
          <section class="panel v10-chart-card"><div class="panel-head compact"><div><small>RESOURCES</small><h3>Recent Resource Activity</h3><p>Counts from the real recent-event window returned by the API.</p></div></div><div id="v10Resources"></div></section>
        </div>`;
      if(recentPanel)recentPanel.parentNode.insertBefore(modules,recentPanel);
      else section.append(modules);
    }

    if(!el('v10AnalyticsNotes')){
      section.insertAdjacentHTML('beforeend',`<aside id="v10AnalyticsNotes" class="v10-analytics-notes"><strong>About these metrics</strong><span>Unique visitors are approximate.</span><span>Device and browser values come from supported request metadata.</span><span>Location cards stay hidden unless location data is actually supplied.</span><span>Analytics begin at zero and populate only from real events.</span><span>QR scans, link clicks, profile views, actions and document activity remain separate event types.</span></aside>`);
    }
  }

  function renderAnalyticsV10(data){
    if(!data||!data.ok)return;
    window.__qrajnAnalyticsV10Data=data;
    const total=Number(data.total||0);
    if(el('v10StatActions'))el('v10StatActions').textContent=Number(data.counts?.action||0);
    if(el('v10StatShares'))el('v10StatShares').textContent=Number(data.counts?.document_share||0);
    const empty=el('analyticsV10Empty');
    const modules=el('analyticsV10Modules');
    if(empty)empty.classList.toggle('hidden',total>0);
    if(modules)modules.classList.toggle('hidden',total===0);
    if(total===0)return;

    if(el('v10ActivityLine'))el('v10ActivityLine').innerHTML=lineChartHtml(data.byDay,false);
    if(el('v10EventMix'))el('v10EventMix').innerHTML=donutHtml({
      'QR Scans':data.counts?.qr_scan||0,
      'Link Clicks':data.counts?.link_click||0,
      'Profile Views':data.counts?.profile_view||0,
      'Profile Actions':data.counts?.action||0,
      'Document Events':Number(data.counts?.document_view||0)+Number(data.counts?.document_share||0)
    },'Events');
    if(el('v10Systems'))el('v10Systems').innerHTML=barsHtml(data.systems);
    if(el('v10Referrers'))el('v10Referrers').innerHTML=barsHtml(data.referrers);
    if(el('v10Hours'))el('v10Hours').innerHTML=barsHtml(activityBuckets(data.recent,'hour'));
    if(el('v10Weekdays'))el('v10Weekdays').innerHTML=barsHtml(activityBuckets(data.recent,'weekday'));
    if(el('v10QrVsLink'))el('v10QrVsLink').innerHTML=barsHtml({'QR Scans':data.counts?.qr_scan||0,'Link Clicks':data.counts?.link_click||0});
    if(el('v10Cumulative'))el('v10Cumulative').innerHTML=lineChartHtml(data.byDay,true);

    const profileObj={'Profile Views':data.counts?.profile_view||0,'Profile Actions':data.counts?.action||0};
    const profileTotal=Object.values(profileObj).reduce((a,b)=>a+Number(b||0),0);
    el('v10ProfileEngagementCard')?.classList.toggle('hidden',profileTotal===0);
    if(profileTotal&&el('v10ProfileEngagement'))el('v10ProfileEngagement').innerHTML=barsHtml(profileObj);

    const docs={};
    for(const e of data.recent||[])if(e.resourceType==='documents'){
      const key=e.resourceId||'Document';
      docs[key]=(docs[key]||0)+1;
    }
    el('v10DocumentCard')?.classList.toggle('hidden',!Object.keys(docs).length);
    if(Object.keys(docs).length&&el('v10Documents'))el('v10Documents').innerHTML=barsHtml(docs);

    const geo={};
    for(const e of data.recent||[]){
      const label=e.city||e.country||e.location||'';
      if(label)geo[label]=(geo[label]||0)+1;
    }
    el('v10GeoCard')?.classList.toggle('hidden',!Object.keys(geo).length);
    if(Object.keys(geo).length&&el('v10Geo'))el('v10Geo').innerHTML=barsHtml(geo);

    if(el('v10Resources'))el('v10Resources').innerHTML=barsHtml(recentResources(data.recent));

    const filter=el('v10EventFilter')?.value||'';
    const recent=el('v9RecentActivity');
    if(recent&&filter){
      const events=(data.recent||[]).filter(e=>e.type===filter);
      recent.innerHTML=events.length?events.slice(0,24).map(e=>`<div class="recent-row"><span class="recent-icon">${escText((e.type||'event').slice(0,3).toUpperCase())}</span><div><strong>${escText((e.type||'event').replaceAll('_',' '))}</strong><small>${escText(e.device||'Other')} · ${escText(e.browser||'Other')}</small></div><time>${escText(new Date(e.createdAt).toLocaleString())}</time></div>`).join(''):'<div class="empty-mini">No matching real activity in this range.</div>';
    }
  }

  function decorateSmartTools(){
    const section=el('smartTools');
    if(!section||section.dataset.v10==='1')return;
    section.dataset.v10='1';
    section.classList.add('v10-workspace','v10-smart-tools');
    setWorkspaceHeading(section,'ADVANCED WORKFLOWS','Smart Tools','Advanced tools for smart links, campaigns, document sharing and related workflows. These stay secondary to QR AJN’s four main actions.');

    const heading=section.querySelector(':scope>.section-heading');
    addOnce('smartToolsLaunchpad',heading,'afterend',`<div id="smartToolsLaunchpad" class="v10-smart-launchpad">
      <button type="button" data-v10-smart="link"><span>${icon.link}</span><div><strong>Smart Links</strong><small>Create managed links with routing, timing and UTM controls.</small></div><b>Open →</b></button>
      <button type="button" data-v10-smart="campaign"><span>${icon.send}</span><div><strong>Campaigns</strong><small>Organize campaign records and reusable UTM values.</small></div><b>Open →</b></button>
      <button type="button" data-v10-smart="document"><span>${icon.pdf}</span><div><strong>PDF Sharing</strong><small>Publish supported PDFs through clean public links.</small></div><b>Open →</b></button>
      <button type="button" data-v10-smart="items"><span>${icon.grid}</span><div><strong>Documents & Items</strong><small>Review private management links saved on this device.</small></div><b>Open →</b></button>
    </div>`);

    el('smartToolsLaunchpad')?.querySelectorAll('[data-v10-smart]').forEach(button=>button.addEventListener('click',()=>{
      const target=button.dataset.v10Smart;
      if(target==='link'||target==='campaign'||target==='document'){
        document.querySelector(`[data-v9-tool="${target}"]`)?.click();
        section.scrollIntoView({behavior:'smooth',block:'start'});
      }else if(target==='items')el('v9Items')?.scrollIntoView({behavior:'smooth',block:'start'});
    }));

    addOnce('smartToolsEcosystem',section,'beforeend',`<section id="smartToolsEcosystem" class="v10-smart-ecosystem"><div><span class="qrajn-eyebrow">EXPLORE MORE FROM AJN</span><h3>Focused tools for the rest of your workflow.</h3></div><a href="https://ajn.buzz" target="_blank" rel="noopener noreferrer"><span>${icon.image}</span><div><strong>AJN BUZZ</strong><small>Image Tools</small></div><b>↗</b></a><a href="https://ajnpdf.com" target="_blank" rel="noopener noreferrer"><span>${icon.pdf}</span><div><strong>AJN PDF</strong><small>PDF Tools</small></div><b>↗</b></a></section>`);
    el('smartCreate')?.classList.add('v10-secondary-tool-section');
    el('v9PdfEditor')?.classList.add('v10-secondary-tool-section');
    el('v9Items')?.classList.add('v10-secondary-tool-section');
  }

  function decorateWorkspace(page){
    if(page==='create-qr')decorateQrWorkspace();
    else if(page==='short-link')decorateShortLinkWorkspace();
    else if(page==='create-profile')decorateProfileWorkspace();
    else if(page==='open-analytics')decorateAnalyticsWorkspace();
    else if(page==='smart-tools')decorateSmartTools();
    setupRevealAnimations();
  }

  window.addEventListener('qrajn:analytics-data',event=>renderAnalyticsV10(event.detail));

  function workspaceBar(page){
    const content={
      'create-qr':['CREATE. CUSTOMIZE. SHARE.','Create QR Code','Build static or trackable QR codes in seconds.','Free to use','No account required','Static or trackable'],
      'short-link':['SHORTER LINKS. CLEARER SHARING.','Create Short Link','Turn long URLs into clean, memorable qrajn.online links.','Custom public names','Private management','Real click analytics'],
      'create-profile':['YOUR DIGITAL IDENTITY. YOUR WAY.','Create Profile','Build a beautiful digital profile with your most important links.','No account required','Live preview','Shareable profile QR'],
      'smart-tools':['ADVANCED WORKFLOWS','Smart Tools','Smart links, campaigns and document workflows without cluttering the main QR AJN experience.','Secondary tools','Private management','AJN ecosystem'],
      'open-analytics':['DATA INTO CLEAR INSIGHTS.','Open Analytics','Understand scans, clicks, profile activity and document events from real supported activity.','Real events only','Live refresh','Approx. unique visitors']
    };
    const [eyebrow,title,sub,...trust]=content[page]||['QR AJN','QR AJN','','','',''];
    const bar=document.createElement('section');
    bar.id='routeWorkspaceBar';
    bar.className=`route-workspace-bar shell v10-workspace-hero hero-${page}`;
    bar.innerHTML=`<a href="/" class="route-back">← Home</a><div class="v10-workspace-hero-grid"><div><span class="qrajn-eyebrow">${eyebrow}</span><h1>${title}</h1><p>${sub}</p></div><div class="v10-workspace-trust">${trust.filter(Boolean).map(x=>`<span><i>✓</i>${x}</span>`).join('')}</div></div>`;
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

    decorateWorkspace(page);
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