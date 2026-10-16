/* Original light point fields: layered representations and correlated waves.
 * Canvas 2D, no remote assets or dependencies. Illustrative, not measured data.
 * Each stage owns its controls; a static SVG remains the no-JS fallback.
 */
(() => {
  'use strict';
  const canvases = ['research-field', 'quantum-field'].map(id => document.getElementById(id)).filter(Boolean);
  if (!canvases.length) return;
  const TAU = Math.PI * 2;
  const paper = '#f6f5f1';
  const colors = ['93,119,162', '119,119,162', '132,117,163', '87,115,153'];
  const canAnimate = typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function';
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reduced = Boolean(media && media.matches);
  let pageHidden = false;
  let scrollTimer = 0;
  let resizeTimer = 0;
  const stages = [];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function makeStage(canvas) {
    const container = canvas.closest('.research-field, .quantum-field-stage') || canvas.parentElement;
    const mode = canvas.id === 'quantum-field' || container.dataset.fieldMode === 'quantum' ? 'quantum' : 'ai';
    const button = container.querySelector('[data-field-toggle]');
    let ctx;
    try { ctx = canvas.getContext('2d', { alpha: false }); } catch (_) { /* SVG fallback. */ }
    if (!ctx) { canvas.hidden = true; if (button) button.hidden = true; return null; }

    let width = 0, height = 0, dpr = 1, mobile = false;
    let points = [], rows = 0, cols = 0;
    let phase = 0, scrollView = 0.45, targetView = 0.45;
    let running = false, userPaused = false, inView = false;
    let frame = 0, previous = 0;
    let geometry = null;
    let background = null;
    let readingVeil = null;
    let edgeVeil = null;

    function camera() {
      const view = reduced ? 0.45 : scrollView;
      const yaw = (mode === 'ai' ? -0.28 : -0.11) + (view - 0.5) * 0.22;
      const tilt = (mode === 'ai' ? 0.60 : 0.72) + (view - 0.5) * 0.13;
      geometry = {
        cx: width * (mode === 'ai' ? (mobile ? 0.64 : 0.73) : 0.52),
        cy: height * (mode === 'ai' ? 0.58 : 0.53),
        size: Math.min(width * (mobile ? 0.61 : mode === 'ai' ? 0.43 : 0.35), height * (mode === 'ai' ? 0.69 : 0.77)),
        cyaw: Math.cos(yaw), syaw: Math.sin(yaw), ct: Math.cos(tilt), st: Math.sin(tilt),
        morph: (view - 0.5) * 0.06
      };
    }

    function elevation(x, z, layer, time) {
      if (mode === 'quantum') {
        const a = Math.sqrt((x + 0.47) ** 2 + z * z);
        const b = Math.sqrt((x - 0.47) ** 2 + z * z);
        return 0.115 * (Math.sin(a * 7.4 - time * 0.43) / Math.sqrt(0.5 + a)
          + Math.sin(b * 7.4 - time * 0.43 + 0.48) / Math.sqrt(0.5 + b))
          + geometry.morph * Math.sin(x * 2.3 - z * 1.2);
      }
      return -0.41 + layer * 0.27
        + 0.085 * Math.sin(x * 2.3 + z * 1.9 + layer * 0.55 - time * 0.14)
        + 0.035 * Math.cos(x * 4.2 - z * 2.6 + layer * 0.7 + time * 0.10)
        + geometry.morph * Math.sin(x * 2 + z * 1.5);
    }

    function project(x, y, z) {
      const g = geometry;
      const xx = x * g.cyaw + z * g.syaw;
      const zz = z * g.cyaw - x * g.syaw;
      const yy = y * g.ct + zz * g.st;
      const depth = zz * g.ct - y * g.st;
      const scale = 1 / (1 + depth * 0.17);
      return { x: g.cx + xx * g.size * scale, y: g.cy + yy * g.size * scale, scale: scale };
    }

    function position(x, z, layer, time) {
      return project(x, elevation(x, z, layer, time), z);
    }

    function prepare() {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const small = w < 700;
      const ratio = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
      if (w === width && h === height && ratio === dpr) return;
      width = w; height = h; dpr = ratio; mobile = small;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.width = '100%'; canvas.style.height = '100%';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      camera();
      rows = mode === 'ai' ? (mobile ? 17 : 26) : (mobile ? 27 : 43);
      cols = mode === 'ai' ? (mobile ? 37 : 62) : (mobile ? 53 : 90);
      const layers = mode === 'ai' ? 4 : 1;
      points = [];
      for (let layer = 0; layer < layers; layer++) {
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const u = col / (cols - 1), v = row / (rows - 1);
            points.push({ x: (u - 0.5) * (mode === 'ai' ? 2.16 : 2.8), z: (v - 0.5) * 1.44,
              layer: layer, band: Math.min(2, Math.floor(v * 3)),
              radius: (mobile ? 0.78 : 0.95) + v * (mobile ? 0.45 : 0.65),
              px: 0, py: 0, r: 0 });
          }
        }
      }
      background = ctx.createRadialGradient(width * 0.78, height * 0.42, 0, width * 0.72, height * 0.5, Math.max(width, height) * 0.6);
      background.addColorStop(0, 'rgba(219,227,241,0.48)');
      background.addColorStop(0.45, 'rgba(230,223,239,0.24)');
      background.addColorStop(1, 'rgba(246,245,241,0)');
      readingVeil = ctx.createLinearGradient(0, 0, width, 0);
      readingVeil.addColorStop(0, 'rgba(246,245,241,0.99)');
      readingVeil.addColorStop(mobile ? 0.12 : 0.29, 'rgba(246,245,241,0.94)');
      readingVeil.addColorStop(mobile ? 0.60 : 0.56, 'rgba(246,245,241,0.08)');
      readingVeil.addColorStop(1, 'rgba(246,245,241,0)');
      edgeVeil = ctx.createLinearGradient(0, 0, 0, height);
      edgeVeil.addColorStop(0, 'rgba(246,245,241,0.42)');
      edgeVeil.addColorStop(0.20, 'rgba(246,245,241,0)');
      edgeVeil.addColorStop(0.81, 'rgba(246,245,241,0)');
      edgeVeil.addColorStop(1, 'rgba(246,245,241,0.76)');
      draw(reduced ? 0 : phase);
      container.dataset.fieldReady = 'true';
    }

    function strokeRow(z, layer, time, alpha) {
      ctx.beginPath();
      const samples = mobile ? 40 : 64;
      const extent = mode === 'ai' ? 2.16 : 2.8;
      for (let i = 0; i <= samples; i++) {
        const p = position((i / samples - 0.5) * extent, z, layer, time);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(' + colors[layer % 4] + ',' + alpha + ')';
      ctx.lineWidth = 0.55; ctx.stroke();
    }

    function draw(time) {
      if (!geometry || width < 2 || height < 2) return;
      camera();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = paper; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);

      // One sampled surface family; lines and points share the same geometry.
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const view = position(p.x, p.z, p.layer, time);
        p.px = view.x; p.py = view.y; p.r = p.radius * view.scale;
      }
      const layers = mode === 'ai' ? 4 : 1;
      for (let layer = 0; layer < layers; layer++) {
        for (let row = 2; row < rows; row += mode === 'ai' ? 7 : 6) {
          strokeRow((row / (rows - 1) - 0.5) * 1.44, layer, time, mode === 'ai' ? 0.16 : 0.18);
        }
        for (let band = 0; band < 3; band++) {
          ctx.beginPath();
          for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.layer !== layer || p.band !== band) continue;
            ctx.moveTo(p.px + p.r, p.py); ctx.arc(p.px, p.py, p.r, 0, TAU);
          }
          ctx.fillStyle = 'rgba(' + colors[mode === 'quantum' ? (band === 1 ? 2 : 0) : layer] + ',' + (0.35 + band * 0.18) + ')';
          ctx.fill();
        }
      }
      if (mode === 'ai') drawInformation(time); else drawCorrelation(time);
      if (mode === 'ai') { ctx.fillStyle = readingVeil; ctx.fillRect(0, 0, width, height); }
      ctx.fillStyle = edgeVeil; ctx.fillRect(0, 0, width, height);
    }

    function drawInformation(time) {
      // Sparse cross-layer trajectories indicate transformation, not a network diagram.
      const count = mobile ? 4 : 7;
      for (let i = 0; i < count; i++) {
        const x = -0.82 + i * 1.64 / (count - 1);
        const z = Math.sin(i * 2.17) * 0.49;
        const first = position(x, z, 0, time);
        ctx.beginPath(); ctx.moveTo(first.x, first.y);
        for (let layer = 1; layer < 4; layer++) {
          const p = position(x, z, layer, time); ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(118,139,178,0.15)'; ctx.lineWidth = 0.65; ctx.stroke();
        const at = ((time * 0.13 + i * 0.63) % 3);
        const lower = Math.floor(at), mix = at - lower;
        const y = elevation(x, z, lower, time) * (1 - mix) + elevation(x, z, lower + 1, time) * mix;
        const p = project(x, y, z);
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.0 * p.scale, 0, TAU);
        ctx.fillStyle = 'rgba(107,137,182,0.62)'; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, 4.8 * p.scale, 0, TAU);
        ctx.strokeStyle = 'rgba(124,149,191,0.17)'; ctx.lineWidth = 0.8; ctx.stroke();
      }
    }

    function drawCorrelation(time) {
      // Two phase-related sources shape the same wave field, without orbit graphics.
      const sourceA = position(-0.47, 0, 0, time);
      const sourceB = position(0.47, 0, 0, time);
      ctx.beginPath(); ctx.moveTo(sourceA.x, sourceA.y); ctx.lineTo(sourceB.x, sourceB.y);
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([2, 6]);
      ctx.strokeStyle = 'rgba(131,139,181,0.24)'; ctx.lineWidth = 0.7; ctx.stroke();
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
      for (const p of [sourceA, sourceB]) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.4 * p.scale, 0, TAU);
        ctx.fillStyle = 'rgba(128,130,177,0.65)'; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, (6.3 + Math.sin(time * 0.43) * 0.7) * p.scale, 0, TAU);
        ctx.strokeStyle = 'rgba(128,145,185,0.23)'; ctx.lineWidth = 0.9; ctx.stroke();
      }
    }

    function updateButton() {
      if (!button) return;
      const labels = reduced || !canAnimate ? { en: 'Static view', zh: '静态视图' }
        : running ? { en: 'Pause motion', zh: '暂停动画' } : { en: 'Play motion', zh: '播放动画' };
      const zh = (document.documentElement.lang || '').toLowerCase().startsWith('zh');
      button.setAttribute('aria-pressed', running ? 'true' : 'false');
      button.setAttribute('aria-label', labels[zh ? 'zh' : 'en']);
      button.setAttribute('aria-controls', canvas.id);
      button.title = labels[zh ? 'zh' : 'en'];
      button.disabled = reduced || !canAnimate;
      const enText = button.querySelector('.en'), zhText = button.querySelector('.zh');
      if (enText && zhText) { enText.textContent = labels.en; zhText.textContent = labels.zh; }
      else button.textContent = labels[zh ? 'zh' : 'en'];
    }

    function tick(now) {
      if (!running) return;
      const interval = 1000 / (mobile ? 24 : 30);
      if (!previous) previous = now;
      if (now - previous >= interval) {
        const delta = Math.min(0.12, (now - previous) / 1000);
        phase += delta; scrollView += (targetView - scrollView) * (1 - Math.exp(-delta * 2.4));
        previous = now; draw(phase);
      }
      frame = requestAnimationFrame(tick);
    }

    function reconcile() {
      const next = canAnimate && !reduced && !userPaused && inView && !document.hidden && !pageHidden;
      if (running !== next) {
        running = next;
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        previous = 0;
        if (running) frame = requestAnimationFrame(tick);
      }
      updateButton();
    }

    function measure() {
      const rect = container.getBoundingClientRect();
      inView = rect.bottom > 0 && rect.top < window.innerHeight;
      targetView = clamp((window.innerHeight - rect.top) / (window.innerHeight + Math.max(1, rect.height)), 0, 1);
      reconcile();
    }

    function onReducedMotion() {
      if (reduced) draw(0);
      reconcile();
    }
    if (button) button.addEventListener('click', () => { userPaused = !userPaused; reconcile(); });
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => { prepare(); measure(); });
      observer.observe(container);
    }
    if (typeof IntersectionObserver === 'function') {
      const observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; reconcile(); }, { threshold: 0 });
      observer.observe(container);
    }
    prepare(); measure();
    return { prepare: prepare, measure: measure, reconcile: reconcile, updateButton: updateButton, onReducedMotion: onReducedMotion };
  }

  canvases.forEach(canvas => { const stage = makeStage(canvas); if (stage) stages.push(stage); });
  // Shared passive listeners avoid duplicate scroll work as the page gains stages.
  window.addEventListener('scroll', () => {
    if (scrollTimer) return;
    scrollTimer = setTimeout(() => { scrollTimer = 0; stages.forEach(stage => stage.measure()); }, 80);
  }, { passive: true });
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => stages.forEach(stage => { stage.prepare(); stage.measure(); }), 110);
  }, { passive: true });
  document.addEventListener('languagechange', () => stages.forEach(stage => stage.updateButton()));
  document.addEventListener('visibilitychange', () => stages.forEach(stage => stage.reconcile()));
  window.addEventListener('pagehide', () => { pageHidden = true; stages.forEach(stage => stage.reconcile()); });
  window.addEventListener('pageshow', () => { pageHidden = false; stages.forEach(stage => stage.measure()); });
  if (media) {
    const changed = event => { reduced = event.matches; stages.forEach(stage => stage.onReducedMotion()); };
    if (typeof media.addEventListener === 'function') media.addEventListener('change', changed);
    else if (typeof media.addListener === 'function') media.addListener(changed);
  }
})();
