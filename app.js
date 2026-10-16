/* Progressive enhancements for current Chromium, Firefox, and Safari families.
 * Missing IntersectionObserver, Canvas 2D, dialog, or animation APIs fall back
 * gracefully. These are compatibility targets, not a cross-browser test claim.
 * Essential content remains in HTML; animations are enabled only after checks.
 */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const hasRAF = typeof window.requestAnimationFrame === 'function' && typeof window.cancelAnimationFrame === 'function';
  const frame = hasRAF ? window.requestAnimationFrame.bind(window) : callback => window.setTimeout(() => callback(Date.now()), 32);
  const cancelFrame = hasRAF ? window.cancelAnimationFrame.bind(window) : window.clearTimeout.bind(window);
  const motionQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reducedMotion = Boolean(motionQuery && motionQuery.matches);

  function watchMedia(query, callback) {
    if (!query) return;
    if (typeof query.addEventListener === 'function') query.addEventListener('change', callback);
    else if (typeof query.addListener === 'function') query.addListener(callback);
  }
  function emitLanguageChange(value) {
    let event;
    if (typeof window.CustomEvent === 'function') event = new CustomEvent('languagechange', { detail: value });
    else {
      event = document.createEvent('CustomEvent');
      event.initCustomEvent('languagechange', false, false, value);
    }
    document.dispatchEvent(event);
  }
  let lang = 'zh';
  try {
    const queryLanguage = new URLSearchParams(location.search).get('lang');
    const storedLanguage = localStorage.getItem('zc-language');
    lang = ['zh', 'en'].includes(queryLanguage) ? queryLanguage : storedLanguage;
  } catch (error) {
    try { lang = new URLSearchParams(location.search).get('lang'); } catch (ignored) { /* Default language. */ }
  }
  if (!['zh', 'en'].includes(lang)) lang = 'zh';

  function setLang(value) {
    lang = value === 'en' ? 'en' : 'zh';
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    try { localStorage.setItem('zc-language', lang); } catch (error) { /* Persistence is optional. */ }
    $$('[data-zh][data-en]').forEach(node => { node.textContent = node.dataset[lang]; });
    $$('[data-placeholder-zh]').forEach(node => { node.placeholder = node.dataset[lang === 'zh' ? 'placeholderZh' : 'placeholderEn'] || ''; });
    $$('[data-lang-label]').forEach(node => { node.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换到中文'); });
    const button = $('.lang-toggle');
    if (button) button.textContent = lang === 'zh' ? 'EN ↗' : '中文 ↗';
    document.title = document.body.dataset[lang === 'zh' ? 'titleZh' : 'titleEn'] || document.title;
    $$('a[data-local]').forEach(anchor => {
      try {
        const url = new URL(anchor.getAttribute('href'), location.href);
        if (url.origin !== location.origin) return;
        url.searchParams.set('lang', lang);
        anchor.href = url.pathname + url.search + url.hash;
      } catch (error) { /* Keep the original link. */ }
    });
    emitLanguageChange(lang);
  }
  const languageButton = $('.lang-toggle');
  if (languageButton) languageButton.addEventListener('click', () => setLang(lang === 'zh' ? 'en' : 'zh'));
  setLang(lang);

  // Shared, frame-throttled scroll/resize updates; nothing is queued while hidden.
  const viewportCallbacks = [];
  let viewportFrame = null;
  function queueViewportUpdate() {
    if (viewportFrame !== null || document.hidden) return;
    viewportFrame = frame(() => {
      viewportFrame = null;
      viewportCallbacks.forEach(callback => callback());
    });
  }
  window.addEventListener('scroll', queueViewportUpdate, { passive: true });
  window.addEventListener('resize', queueViewportUpdate, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && viewportFrame !== null) {
      cancelFrame(viewportFrame); viewportFrame = null;
    } else if (!document.hidden) queueViewportUpdate();
  });
  const progressBar = $('.reading-progress');
  if (progressBar) {
    const updateProgress = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const value = height > 0 ? Math.max(0, Math.min(100, window.scrollY / height * 100)) : 0;
      progressBar.style.width = value + '%';
    };
    viewportCallbacks.push(updateProgress); updateProgress();
  }

  // Mobile navigation: disclosure semantics, Escape, outside-click dismissal.
  const menu = $('.menu-toggle');
  const navigation = $('.main-nav');
  if (menu && navigation) {
    // Keep disclosure semantics aligned with visual.css's navigation breakpoint.
    const mobileQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 620px)') : null;
    const isMobile = () => mobileQuery ? mobileQuery.matches : window.innerWidth <= 620;
    if (!navigation.id) navigation.id = 'main-navigation';
    menu.setAttribute('aria-controls', navigation.id);
    document.documentElement.classList.add('js-navigation');
    function updateMenuAria() {
      const open = navigation.classList.contains('open');
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', lang === 'zh' ? (open ? '关闭导航' : '打开导航') : (open ? 'Close navigation' : 'Open navigation'));
      if (isMobile()) navigation.setAttribute('aria-hidden', String(!open));
      else navigation.removeAttribute('aria-hidden');
    }
    function closeMenu(returnFocus) {
      const wasOpen = navigation.classList.contains('open');
      navigation.classList.remove('open'); updateMenuAria();
      if (wasOpen && returnFocus) menu.focus();
    }
    menu.addEventListener('click', () => { navigation.classList.toggle('open'); updateMenuAria(); });
    $$('a', navigation).forEach(anchor => anchor.addEventListener('click', () => closeMenu(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && navigation.classList.contains('open')) {
        event.preventDefault(); closeMenu(true);
      }
    });
    document.addEventListener('click', event => {
      if (navigation.classList.contains('open') && !navigation.contains(event.target) && !menu.contains(event.target)) closeMenu(false);
    });
    watchMedia(mobileQuery, () => closeMenu(false));
    if (!mobileQuery) viewportCallbacks.push(updateMenuAria);
    document.addEventListener('languagechange', updateMenuAria);
    updateMenuAria();
  }

  // No observer, no JS, or reduced motion: content stays fully visible.
  let revealObserver = null;
  const revealNodes = $$('.reveal');
  function revealEverything() {
    document.documentElement.classList.remove('js-motion');
    revealNodes.forEach(node => node.classList.add('visible'));
    if (revealObserver) revealObserver.disconnect();
  }
  if (!reducedMotion && typeof window.IntersectionObserver === 'function') {
    try {
      revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible'); revealObserver.unobserve(entry.target);
        }
      }), { threshold: 0.06 });
      revealNodes.forEach(node => revealObserver.observe(node));
      document.documentElement.classList.add('js-motion');
    } catch (error) { revealEverything(); }
  } else revealEverything();

  // Native dialog with an accessible overlay fallback and focus restoration.
  const lightbox = $('.lightbox');
  if (lightbox) {
    const image = $('img', lightbox);
    const caption = $('.caption', lightbox);
    const closeButton = $('.close', lightbox);
    let previousFocus = null;
    let open = false;
    let fallback = false;
    let backdrop = null;
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('tabindex', '-1');
    lightbox.hidden = true;
    function cleanup() {
      if (!open) return;
      open = false;
      lightbox.classList.remove('is-open');
      lightbox.removeAttribute('aria-modal'); lightbox.removeAttribute('open');
      lightbox.hidden = true;
      if (fallback) ['display', 'position', 'left', 'top', 'transform', 'margin', 'zIndex'].forEach(key => { lightbox.style[key] = ''; });
      if (backdrop) { backdrop.remove(); backdrop = null; }
      document.body.classList.remove('modal-open');
      if (previousFocus && document.documentElement.contains(previousFocus)) previousFocus.focus();
      previousFocus = null;
    }
    function closeLightbox() {
      if (!open) return;
      if (!fallback && typeof lightbox.close === 'function') lightbox.close();
      cleanup();
    }
    function openLightbox(trigger) {
      if (!image) return;
      const thumbnail = $('img', trigger);
      const source = trigger.dataset.zoom || (thumbnail && thumbnail.src);
      if (!source) return;
      previousFocus = document.activeElement;
      image.src = source; image.alt = thumbnail ? thumbnail.alt : '';
      const figure = trigger.closest('figure');
      const figureCaption = figure && $('figcaption', figure);
      if (caption) caption.textContent = figureCaption ? figureCaption.innerText : '';
      lightbox.hidden = false;
      fallback = typeof lightbox.showModal !== 'function';
      if (!fallback) {
        try { lightbox.showModal(); } catch (error) { fallback = true; }
      }
      if (fallback) {
        backdrop = document.createElement('div');
        backdrop.className = 'lightbox-fallback-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');
        Object.assign(backdrop.style, { position: 'fixed', inset: '0', background: 'rgba(0,0,0,.88)', zIndex: '9998' });
        backdrop.addEventListener('click', closeLightbox);
        document.body.appendChild(backdrop);
        lightbox.classList.add('is-open'); lightbox.setAttribute('open', '');
        Object.assign(lightbox.style, { display: 'block', position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', margin: '0', zIndex: '9999' });
      }
      open = true;
      lightbox.setAttribute('aria-modal', 'true');
      document.body.classList.add('modal-open');
      (closeButton || lightbox).focus();
    }
    $$('[data-zoom]').forEach(trigger => trigger.addEventListener('click', () => openLightbox(trigger)));
    if (closeButton) closeButton.addEventListener('click', closeLightbox);
    lightbox.addEventListener('close', cleanup);
    lightbox.addEventListener('cancel', event => { event.preventDefault(); closeLightbox(); });
    lightbox.addEventListener('click', event => {
      if (event.target !== lightbox) return;
      const box = lightbox.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeLightbox();
    });
    document.addEventListener('keydown', event => {
      if (!open) return;
      if (event.key === 'Escape') { event.preventDefault(); closeLightbox(); return; }
      if (event.key !== 'Tab') return;
      const focusable = $$('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])', lightbox)
        .filter(node => !node.disabled && node.getClientRects().length);
      if (!focusable.length) { event.preventDefault(); lightbox.focus(); return; }
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !lightbox.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !lightbox.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    });
  }

  let publicationFilter = 'all';
  function filterPublications() {
    const search = $('.pub-search');
    const query = (search ? search.value : '').trim().toLowerCase();
    let count = 0;
    $$('.pub-row').forEach(row => {
      const visible = (publicationFilter === 'all' || row.dataset.category === publicationFilter) && row.textContent.toLowerCase().includes(query);
      row.hidden = !visible;
      if (visible) count += 1;
    });
    const empty = $('.empty-state');
    if (empty) empty.hidden = count > 0;
  }
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    publicationFilter = button.dataset.filter;
    $$('[data-filter]').forEach(other => {
      other.classList.toggle('active', other === button);
      other.setAttribute('aria-pressed', String(other === button));
    });
    filterPublications();
  }));
  const publicationSearch = $('.pub-search');
  if (publicationSearch) publicationSearch.addEventListener('input', filterPublications);
  document.addEventListener('languagechange', filterPublications);

  // Transparent, smoothly rendered lunar field. Fine surface grain is cached;
  // only the restrained orbital motion and star opacity change per frame.
  const canvas = $('#mission-canvas') || $('#field-canvas');
  let synchronizeCanvas = () => {};
  if (canvas) {
    canvas.setAttribute('aria-hidden', 'true'); canvas.removeAttribute('aria-label');
    canvas.style.pointerEvents = 'none';
    let context = null;
    try { context = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null; } catch (error) { /* CSS background stays. */ }
    if (!context) {
      canvas.hidden = true; document.documentElement.classList.add('canvas-unavailable');
    } else {
      let width = 0; let height = 0; let pixelRatio = 1;
      let animation = null; let lastPaint = 0; let lastTime = 0; let elapsed = 0;
      let inView = true; let stars = []; let moon = null;
      const random = seed => () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      function ellipse(ctx, x, y, rx, ry, rotation) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(rx, ry);
        ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.restore();
      }
      function makeMoon() {
        const surface = document.createElement('canvas');
        surface.width = 1200; surface.height = 1200;
        const ctx = surface.getContext('2d');
        if (!ctx) return null;
        const size = 1200; const radius = size * 0.47; const center = size / 2;
        const rng = random(80951);
        ctx.save(); ctx.beginPath(); ctx.arc(center, center, radius, 0, Math.PI * 2); ctx.clip();
        const shade = ctx.createRadialGradient(size * 0.31, size * 0.29, 0, center, center, radius * 1.24);
        shade.addColorStop(0, '#f2f1ec'); shade.addColorStop(0.42, '#e5e4df');
        shade.addColorStop(0.75, '#c7c8c6'); shade.addColorStop(1, '#989da0');
        ctx.fillStyle = shade; ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 72; i += 1) {
          const angle = rng() * Math.PI * 2; const distance = Math.sqrt(rng()) * radius * 0.88;
          const x = center + Math.cos(angle) * distance; const y = center + Math.sin(angle) * distance;
          const r = 7 + Math.pow(rng(), 2) * 80;
          const crater = ctx.createRadialGradient(x + r * 0.1, y + r * 0.15, r * 0.12, x, y, r);
          crater.addColorStop(0, 'rgba(53,60,66,.11)'); crater.addColorStop(0.72, 'rgba(70,77,83,.075)'); crater.addColorStop(1, 'rgba(70,77,83,0)');
          ctx.fillStyle = crater; ctx.fillRect(x - r, y - r, r * 2, r * 2);
          ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.arc(x, y, r * 0.77, Math.PI * 0.83, Math.PI * 1.73); ctx.stroke();
        }
        // Subpixel circular grain, deliberately avoiding pixel art or a visible grid.
        for (let i = 0; i < 8500; i += 1) {
          const angle = rng() * Math.PI * 2; const distance = Math.sqrt(rng()) * radius;
          const x = center + Math.cos(angle) * distance; const y = center + Math.sin(angle) * distance;
          ctx.fillStyle = 'rgba(42,50,57,' + (0.018 + rng() * 0.045) + ')';
          ctx.beginPath(); ctx.arc(x, y, 0.35 + rng() * 0.65, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore(); return surface;
      }
      function draw(time) {
        if (!width || !height) return;
        context.clearRect(0, 0, width, height);
        const small = width < 720;
        const radius = Math.min(width * (small ? 0.43 : 0.215), height * (small ? 0.25 : 0.36));
        const x = width * (small ? 0.74 : 0.79);
        const y = height * (small ? 0.76 : 0.51) + Math.sin(time * 0.11) * 1.5;
        stars.forEach(star => {
          context.fillStyle = 'rgba(47,54,63,' + star.alpha * (0.9 + Math.sin(time * 0.28 + star.phase) * 0.1) + ')';
          context.beginPath(); context.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2); context.fill();
        });
        context.lineWidth = 0.65; context.strokeStyle = 'rgba(54,63,74,.16)';
        ellipse(context, x, y, radius * 1.55, radius * 0.43, -0.27); context.stroke();
        context.strokeStyle = 'rgba(54,63,74,.07)';
        ellipse(context, x, y, radius * 1.8, radius * 0.58, -0.27); context.stroke();
        if (moon) {
          context.globalAlpha = small ? 0.76 : 0.9;
          context.drawImage(moon, x - radius * 1.064, y - radius * 1.064, radius * 2.128, radius * 2.128);
          context.globalAlpha = 1;
        }
        const angle = time * 0.035 + 0.9;
        const orbitX = Math.cos(angle) * radius * 1.55; const orbitY = Math.sin(angle) * radius * 0.43;
        const px = x + orbitX * Math.cos(-0.27) - orbitY * Math.sin(-0.27);
        const py = y + orbitX * Math.sin(-0.27) + orbitY * Math.cos(-0.27);
        context.fillStyle = 'rgba(45,53,64,.5)';
        context.beginPath(); context.arc(px, py, 1.8, 0, Math.PI * 2); context.fill();
        context.strokeStyle = 'rgba(45,53,64,.16)';
        context.beginPath(); context.moveTo(px - 7, py); context.lineTo(px + 7, py); context.moveTo(px, py - 7); context.lineTo(px, py + 7); context.stroke();
        // Alpha fade keeps the copy area quiet on any background color.
        const fade = context.createLinearGradient(0, 0, width, 0);
        fade.addColorStop(0, 'rgba(0,0,0,.015)'); fade.addColorStop(0.34, 'rgba(0,0,0,.1)');
        fade.addColorStop(0.57, 'rgba(0,0,0,.65)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
        context.globalCompositeOperation = 'destination-in';
        context.fillStyle = fade; context.fillRect(0, 0, width, height);
        context.globalCompositeOperation = 'source-over';
      }
      function stop() {
        if (animation !== null) cancelFrame(animation);
        animation = null; lastTime = 0;
      }
      function tick(timestamp) {
        animation = null;
        if (document.hidden || reducedMotion || !inView) { stop(); return; }
        if (timestamp - lastPaint >= 1000 / 24) {
          elapsed += lastTime ? Math.min(100, timestamp - lastTime) / 1000 : 0;
          lastTime = timestamp; lastPaint = timestamp; draw(elapsed);
        }
        animation = frame(tick);
      }
      synchronizeCanvas = () => {
        if (document.hidden || reducedMotion || !inView || !hasRAF) {
          stop();
          if (!document.hidden && inView) draw(elapsed);
        } else if (animation === null && width && height) animation = frame(tick);
      };
      function checkVisibility() {
        const rect = canvas.getBoundingClientRect();
        inView = rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
        synchronizeCanvas();
      }
      function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const newWidth = Math.max(0, Math.round(rect.width)); const newHeight = Math.max(0, Math.round(rect.height));
        const newRatio = Math.min(window.devicePixelRatio || 1, 2);
        if (newWidth !== width || newHeight !== height || newRatio !== pixelRatio) {
          width = newWidth; height = newHeight; pixelRatio = newRatio;
          canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
          const rng = random(50291); const number = Math.min(145, Math.max(45, Math.round(width * height / 8500)));
          stars = Array.from({ length: number }, () => ({ x: rng(), y: rng(), size: 0.35 + rng() * 0.65, alpha: 0.1 + rng() * 0.2, phase: rng() * Math.PI * 2 }));
          draw(elapsed);
        }
        checkVisibility();
      }
      moon = makeMoon(); viewportCallbacks.push(resizeCanvas);
      if (typeof window.ResizeObserver === 'function') {
        const sizeObserver = new ResizeObserver(() => queueViewportUpdate()); sizeObserver.observe(canvas);
      }
      if (typeof window.IntersectionObserver === 'function') {
        try {
          const observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; synchronizeCanvas(); });
          observer.observe(canvas);
        } catch (error) { /* Bounding-rectangle checks already provide a fallback. */ }
      }
      document.addEventListener('visibilitychange', synchronizeCanvas);
      window.addEventListener('pagehide', stop); window.addEventListener('pageshow', resizeCanvas);
      resizeCanvas();
    }
  }
  watchMedia(motionQuery, event => {
    reducedMotion = Boolean(event.matches);
    if (reducedMotion) revealEverything();
    synchronizeCanvas();
  });

  // Fictional local demo; it makes no network requests and executes no commands.
  const shell = $('.demo-shell');
  if (shell) {
    const main = $('.demo-main', shell); const tabs = $$('.demo-tab', shell);
    const state = { view: 'agents', model: 'OpenAI-compatible', step: 0 };
    const views = { agents: { zh: '多 Agent 协作', en: 'Agent orchestration' }, sessions: { zh: '会话与上下文交接', en: 'Session handoff' }, workspace: { zh: 'Linux 工作区', en: 'Linux workspace' }, training: { zh: '训练与实验追踪', en: 'Training & experiments' } };
    if (main && tabs.length) {
      const tablist = $('[role="tablist"]', shell);
      const horizontalTabs = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 620px)') : null;
      const updateTabOrientation = () => {
        if (tablist) tablist.setAttribute('aria-orientation', (horizontalTabs ? horizontalTabs.matches : window.innerWidth <= 620) ? 'horizontal' : 'vertical');
      };
      watchMedia(horizontalTabs, updateTabOrientation);
      if (!horizontalTabs) viewportCallbacks.push(updateTabOrientation);
      updateTabOrientation();
      if (!main.id) main.id = 'demo-workspace-panel';
      main.setAttribute('role', 'tabpanel'); main.setAttribute('tabindex', '0');
      tabs.forEach((tab, index) => {
        if (!tab.id) tab.id = 'demo-workspace-tab-' + index;
        tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', main.id);
      });
      function renderDemo(focusSelector) {
        const view = state.view; let body = '';
        if (view === 'agents') {
          body = `<div class="agent-node"><strong>Research coordinator</strong><span>Task graph · context · artifacts</span></div><div class="agent-tree"><div class="agent-node"><strong>Research agent</strong><span>Paper → hypothesis</span></div><div class="agent-node"><strong>Builder agent</strong><span>Implement → test</span></div><div class="agent-node"><strong>Reviewer agent</strong><span>Evidence → report</span></div></div><div class="demo-log" role="status">[demo] session restored · provider: <span class="event">${state.model}</span><br>[demo] MCP tools discovered · skills composed<br>[demo] <span class="event">${state.step % 2 ? 'Task graph dispatched · artifacts ready' : 'Ready for the next research question'}</span></div><div class="demo-toolbar"><button data-demo-action="run">${lang === 'zh' ? '演示任务编排' : 'Simulate workflow'} ↗</button></div>`;
        } else if (view === 'sessions') {
          body = `<div class="agent-node"><strong>experiment / public-demo</strong><span>branch A → checkpoint → branch B</span></div><div class="demo-toolbar"><button data-demo-action="handoff">${lang === 'zh' ? '演示会话交接' : 'Simulate handoff'} ↗</button></div><div class="demo-log" role="status"><span class="event">${state.step % 2 ? 'Handoff completed → reviewer session' : 'Draft + history + task context'}</span><br>Desktop ↔ Mobile · state synchronized<br>Context manifest · tool results · artifacts</div>`;
        } else if (view === 'workspace') {
          body = `<div class="terminal"><em>$</em> pwd<br>/workspace/public-demo<br><em>$</em> git status --short<br> M experiment.py<br> A research-notes.md<br><em>$</em> docker ps<br>demo-runner &nbsp; running<br><em>$</em> python experiment.py --dry-run<br>Configuration validated. Ready.</div><p class="demo-note">${lang === 'zh' ? '虚构演示环境；不执行任何命令或连接真实机器。' : 'Fictional demo environment. No commands execute and no machines are connected.'}</p>`;
        } else {
          body = `<div class="demo-job"><span>public-demo / baseline</span><span class="demo-pill">Complete</span></div><div class="demo-job"><span>public-demo / ablation</span><span class="demo-pill">Running</span></div><svg class="inline-diagram" viewBox="0 0 600 180" role="img" aria-label="Illustrative loss curve"><path d="M30 15V150H580" fill="none" stroke="#747b80"/><path d="M35 30C80 35 70 80 125 86S160 103 225 112S340 132 570 136" fill="none" stroke="currentColor" stroke-width="2"/><path d="M35 35C80 45 90 91 135 95S175 115 240 122S380 138 570 142" fill="none" stroke="#b18c69" stroke-width="2" stroke-dasharray="5 4"/><text x="35" y="174" fill="currentColor" font-size="10">ILLUSTRATIVE · NOT EXPERIMENTAL DATA</text></svg><div class="demo-log">Run metadata · metrics · artifacts · W&amp;B integration</div>`;
        }
        main.innerHTML = `<header><h3>${views[view][lang]}</h3><select aria-label="${lang === 'zh' ? '演示模型提供商' : 'Demo model provider'}"><option>OpenAI-compatible</option><option>Anthropic-compatible</option><option>Custom provider</option></select></header>${body}`;
        const provider = $('select', main); provider.value = state.model;
        provider.addEventListener('change', event => { state.model = event.target.value; renderDemo('select'); });
        $$('[data-demo-action]', main).forEach(button => button.addEventListener('click', () => {
          const action = button.dataset.demoAction; state.step += 1;
          renderDemo('[data-demo-action="' + action + '"]');
        }));
        tabs.forEach(tab => {
          const selected = tab.dataset.view === view;
          tab.classList.toggle('active', selected); tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
          if (selected) main.setAttribute('aria-labelledby', tab.id);
        });
        if (focusSelector) { const target = $(focusSelector, main); if (target) target.focus(); }
      }
      function activateTab(tab, focus) {
        if (!views[tab.dataset.view]) return;
        state.view = tab.dataset.view; state.step = 0; renderDemo();
        if (focus) tab.focus();
      }
      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activateTab(tab, false));
        tab.addEventListener('keydown', event => {
          let next = index;
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + tabs.length - 1) % tabs.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = tabs.length - 1;
          else return;
          event.preventDefault(); activateTab(tabs[next], true);
        });
      });
      document.addEventListener('languagechange', () => renderDemo());
      renderDemo();
    }
  }
})();
