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
  // URL language is authoritative; old browser preferences never override it.
  function languageFromUrl() {
    try { return new URLSearchParams(location.search).get('lang') === 'zh' ? 'zh' : 'en'; }
    catch (error) { return 'en'; }
  }
  let lang = languageFromUrl();

  function setLang(value, updateUrl = false) {
    lang = value === 'en' ? 'en' : 'zh';
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    if (updateUrl) {
      try {
        const current = new URL(location.href);
        current.searchParams.set('lang', lang);
        history.replaceState(history.state, '', current.href);
      } catch (error) { /* Local file previews may restrict History API updates. */ }
    }
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
  if (languageButton) languageButton.addEventListener('click', () => setLang(lang === 'zh' ? 'en' : 'zh', true));
  window.addEventListener('popstate', () => setLang(languageFromUrl()));
  setLang(lang);

  // Start nearby figures before they enter the viewport, including deep links.
  // If a lightweight preview fails, the original figure remains available.
  const pageImages = $$('img[src]');
  pageImages.forEach(image => {
    const original = image.closest('[data-zoom]');
    function useOriginal() {
      if (!original || image.dataset.originalTried) return;
      const source = original.dataset.zoom;
      if (!source || new URL(source, location.href).href === image.src) return;
      image.dataset.originalTried = 'true';
      image.src = source;
    }
    image.addEventListener('error', useOriginal, { once: true });
    if (image.complete && !image.naturalWidth) useOriginal();
  });
  if (typeof IntersectionObserver === 'function') {
    const imageObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.loading = 'eager';
        imageObserver.unobserve(entry.target);
      }
    }), { rootMargin: '1800px 0px' });
    pageImages.filter(image => image.loading === 'lazy').forEach(image => imageObserver.observe(image));
    window.addEventListener('pagehide', () => imageObserver.disconnect());
    window.addEventListener('pageshow', () => pageImages.filter(image => !image.complete).forEach(image => imageObserver.observe(image)));
  }

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
    const imageTools = document.createElement('div');
    imageTools.className = 'lightbox-tools';
    const scaleButton = document.createElement('button');
    scaleButton.className = 'image-scale';
    scaleButton.type = 'button';
    scaleButton.setAttribute('aria-pressed', 'false');
    imageTools.appendChild(scaleButton);
    if (image) lightbox.insertBefore(imageTools, image);
    function updateScaleLabel() {
      const native = lightbox.classList.contains('native-size');
      scaleButton.textContent = native ? (lang === 'zh' ? '适应窗口' : 'Fit to window') : (lang === 'zh' ? '100% 查看细节' : 'Inspect at 100%');
      scaleButton.setAttribute('aria-pressed', String(native));
    }
    scaleButton.addEventListener('click', () => {
      lightbox.classList.toggle('native-size');
      updateScaleLabel();
      lightbox.scrollTop = 0;
      lightbox.scrollLeft = 0;
    });
    document.addEventListener('languagechange', updateScaleLabel);
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
      lightbox.classList.remove('native-size');
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
      lightbox.classList.remove('native-size');
      imageTools.hidden = /\.svg(?:[?#]|$)/i.test(source);
      updateScaleLabel();
      image.src = source; image.alt = thumbnail ? thumbnail.alt : '';
      const figure = trigger.closest('figure');
      const figureCaption = figure && $('figcaption', figure);
      if (caption) {
        caption.textContent = figureCaption ? figureCaption.innerText : '';
        const originalLink = document.createElement('a');
        originalLink.className = 'lightbox-original';
        originalLink.href = source;
        originalLink.target = '_blank';
        originalLink.rel = 'noopener';
        originalLink.textContent = lang === 'zh' ? '打开完整分辨率图片 ↗' : 'Open full-resolution image ↗';
        caption.appendChild(originalLink);
      }
      lightbox.hidden = false;
      fallback = typeof lightbox.showModal !== 'function';
      if (!fallback) {
        try { lightbox.showModal(); } catch (error) { fallback = true; }
      }
      if (fallback) {
        backdrop = document.createElement('div');
        backdrop.className = 'lightbox-fallback-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');
        Object.assign(backdrop.style, { position: 'fixed', inset: '0', background: 'rgba(235,237,242,.93)', zIndex: '9998' });
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

  // Restrained scientific-image overlay; the real photograph remains in HTML.
  // Corner marks, subtle grain, and one slow scan are decorative, not telemetry.
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
      let inView = true; let grain = [];
      const random = seed => () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      function draw(time) {
        if (!width || !height) return;
        context.clearRect(0, 0, width, height);
        const narrow = width <= 620;
        const left = width * (narrow ? 0.13 : 0.63);
        const top = height * (narrow ? 0.70 : 0.22);
        const right = width * 0.91;
        const bottom = height * (narrow ? 0.91 : 0.77);
        const corner = narrow ? 11 : 17;
        context.lineWidth = 0.7;
        context.strokeStyle = 'rgba(255,255,255,.17)';
        context.beginPath();
        context.moveTo(left, top + corner); context.lineTo(left, top); context.lineTo(left + corner, top);
        context.moveTo(right - corner, top); context.lineTo(right, top); context.lineTo(right, top + corner);
        context.moveTo(right, bottom - corner); context.lineTo(right, bottom); context.lineTo(right - corner, bottom);
        context.moveTo(left + corner, bottom); context.lineTo(left, bottom); context.lineTo(left, bottom - corner);
        context.stroke();
        grain.forEach(point => {
          const opacity = point.alpha * (0.85 + Math.sin(time * 0.16 + point.phase) * 0.15);
          context.fillStyle = 'rgba(255,255,255,' + opacity + ')';
          context.beginPath();
          context.arc(left + point.x * (right - left), top + point.y * (bottom - top), point.size, 0, Math.PI * 2);
          context.fill();
        });
        // Slow, continuous movement without a flashing or snapping loop.
        const scan = top + (bottom - top) * (0.5 + Math.sin(time * 0.09) * 0.38);
        context.strokeStyle = 'rgba(255,255,255,.075)';
        context.beginPath(); context.moveTo(left + 6, scan); context.lineTo(right - 6, scan); context.stroke();
        context.strokeStyle = 'rgba(255,255,255,.22)';
        context.beginPath();
        context.moveTo(left - 3, scan); context.lineTo(left + 3, scan);
        context.moveTo(right - 3, scan); context.lineTo(right + 3, scan);
        context.stroke();
      }
      function stop() {
        if (animation !== null) cancelFrame(animation);
        animation = null; lastTime = 0;
      }
      function tick(timestamp) {
        animation = null;
        if (document.hidden || reducedMotion || !inView) { stop(); return; }
        if (timestamp - lastPaint >= 1000 / 16) {
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
          const rng = random(50291); const number = Math.min(160, Math.max(35, Math.round(width * height / 9000)));
          grain = Array.from({ length: number }, () => ({ x: rng(), y: rng(), size: 0.25 + rng() * 0.4, alpha: 0.025 + rng() * 0.045, phase: rng() * Math.PI * 2 }));
          draw(elapsed);
        }
        checkVisibility();
      }
      viewportCallbacks.push(resizeCanvas);
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
