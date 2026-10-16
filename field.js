/* Original optical field: a perspective point surface carried by orbital fibers.
 * Canvas 2D only. No third-party code, measured data, or remote assets.
 * Progressive enhancement: the SVG behind the canvas is the no-JS fallback.
 */
(() => {
  'use strict';
  const canvas = document.getElementById('research-field');
  if (!canvas) return;
  const container = canvas.closest('.research-field') || canvas.parentElement;
  const button = document.querySelector('[data-field-toggle]');
  let ctx;
  try { ctx = canvas.getContext('2d', { alpha: false }); }
  catch (_) { canvas.hidden = true; if (button) button.hidden = true; return; }
  if (!ctx) { canvas.hidden = true; if (button) button.hidden = true; return; }

  const canAnimate = typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function';
  const motion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reduced = Boolean(motion && motion.matches);
  let userPaused = false;
  let inView = true;
  let pageHidden = false;
  let running = false;
  let raf = 0;
  let resizeTimer = 0;
  let scrollTimer = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let mobile = false;
  let phase = 0;
  let previous = 0;
  let mesh = [];
  let waveFloor = [];
  let trails = [];
  let geometry = null;
  const base = document.createElement('canvas');
  const baseCtx = base.getContext('2d', { alpha: false });
  if (!baseCtx) { canvas.hidden = true; if (button) button.hidden = true; return; }
  const TAU = Math.PI * 2;
  const palette = ['197,211,232', '132,172,226', '120,146,226', '158,145,227', '206,207,232'];

  function project(u, v) {
    const g = geometry;
    const radius = g.radius * (0.60 + 0.45 * v);
    const x = radius * Math.cos(u);
    const y = radius * Math.sin(u);
    const z = g.radius * (0.085 * Math.sin(2 * u + v * 2.8) + 0.035 * Math.sin(v * Math.PI));
    const yy = y * g.ct - z * g.st;
    const zz = y * g.st + z * g.ct;
    const perspective = (3.8 * g.radius) / (3.8 * g.radius + zz);
    return {
      x: g.cx + (x * g.cr - yy * g.sr) * perspective,
      y: g.cy + (x * g.sr + yy * g.cr) * perspective,
      depth: Math.max(0, Math.min(1, (zz / g.radius + 1.1) / 2.2)),
      scale: perspective,
      u: u,
      v: v
    };
  }

  function pathAt(target, v, start, end, steps) {
    target.beginPath();
    for (let i = 0; i <= steps; i++) {
      const p = project(start + (end - start) * i / steps, v);
      if (i === 0) target.moveTo(p.x, p.y);
      else target.lineTo(p.x, p.y);
    }
  }

  function createBase() {
    base.width = canvas.width;
    base.height = canvas.height;
    baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    baseCtx.fillStyle = '#080a0f';
    baseCtx.fillRect(0, 0, width, height);
    const halo = baseCtx.createRadialGradient(geometry.cx, geometry.cy, 0, geometry.cx, geometry.cy, geometry.radius * 1.3);
    halo.addColorStop(0, 'rgba(21,28,47,0.14)');
    halo.addColorStop(0.55, 'rgba(29,36,65,0.20)');
    halo.addColorStop(1, 'rgba(8,10,15,0)');
    baseCtx.fillStyle = halo;
    baseCtx.fillRect(0, 0, width, height);

    // A restrained measurement grid, subordinate to the continuous field.
    baseCtx.lineWidth = 0.5;
    baseCtx.strokeStyle = 'rgba(160,174,201,0.035)';
    const grid = mobile ? 72 : 100;
    baseCtx.beginPath();
    for (let x = width * 0.42; x < width; x += grid) {
      baseCtx.moveTo(x, height * 0.08); baseCtx.lineTo(x, height * 0.93);
    }
    for (let y = height * 0.08; y < height * 0.94; y += grid) {
      baseCtx.moveTo(width * 0.42, y); baseCtx.lineTo(width, y);
    }
    baseCtx.stroke();

    const lanes = mobile ? 38 : 64;
    const samples = mobile ? 104 : 160;
    baseCtx.globalCompositeOperation = 'screen';
    for (let j = 0; j < lanes; j++) {
      const v = j / (lanes - 1);
      const color = palette[Math.min(4, Math.floor(v * 5))];
      const alpha = 0.13 + 0.15 * Math.pow(Math.sin(Math.PI * v), 2);
      pathAt(baseCtx, v, 0, TAU, samples);
      baseCtx.strokeStyle = 'rgba(' + color + ',' + alpha + ')';
      baseCtx.lineWidth = j % 9 === 0 ? 0.9 : 0.45;
      baseCtx.stroke();
      if (j % 8 === 0) {
        baseCtx.strokeStyle = 'rgba(' + color + ',0.06)';
        baseCtx.lineWidth = 5;
        baseCtx.stroke();
      }
    }
    baseCtx.globalCompositeOperation = 'source-over';
  }

  function prepare() {
    const rect = container.getBoundingClientRect();
    const newWidth = Math.max(1, Math.round(rect.width));
    const newHeight = Math.max(1, Math.round(rect.height));
    const newMobile = newWidth < 700;
    const newDpr = Math.min(window.devicePixelRatio || 1, newMobile ? 1.5 : 2);
    if (width === newWidth && height === newHeight && dpr === newDpr) return;
    width = newWidth; height = newHeight; mobile = newMobile; dpr = newDpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = '100%'; canvas.style.height = '100%';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    geometry = {
      cx: width * (mobile ? 0.73 : 0.755), cy: height * (mobile ? 0.50 : 0.53),
      radius: Math.min(width * (mobile ? 0.88 : 0.43), height * (mobile ? 0.51 : 0.84)),
      ct: Math.cos(1.015), st: Math.sin(1.015), cr: Math.cos(-0.43), sr: Math.sin(-0.43)
    };
    const rows = mobile ? 20 : 30;
    const cols = mobile ? 92 : 144;
    mesh = [];
    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      for (let i = 0; i < cols; i++) {
        const p = project((i + (j % 2) * 0.5) / cols * TAU, v);
        p.color = Math.min(4, Math.floor(v * 5));
        p.radius = (0.48 + 0.37 * (1 - p.depth)) * p.scale;
        mesh.push(p);
      }
    }
    trails = [];
    waveFloor = [];
    const floorRows = mobile ? 17 : 25;
    const floorCols = mobile ? 42 : 74;
    for (let row = 0; row < floorRows; row++) {
      const depth = row / (floorRows - 1);
      for (let col = 0; col < floorCols; col++) {
        const across = col / (floorCols - 1);
        const spread = 0.62 + depth * 0.58;
        waveFloor.push({
          x: width * (0.76 + (across - 0.5) * spread),
          y: height * (0.68 + depth * 0.35),
          across: across, depth: depth,
          radius: 0.32 + depth * 0.58,
          amplitude: height * (0.012 + depth * 0.026)
        });
      }
    }
    const count = mobile ? 13 : 24;
    for (let i = 0; i < count; i++) {
      trails.push({ v: 0.06 + 0.90 * ((i * 0.61803398875) % 1), angle: i * 2.3999632297, speed: 0.045 + (i % 7) * 0.006 });
    }
    createBase();
    draw(phase);
    container.dataset.fieldReady = 'true';
  }

  function draw(time) {
    if (!geometry || width < 2 || height < 2) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(base, 0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';

    // The orbital field opens into one continuous, perspective wave surface.
    // Small distant samples become brighter, wider-spaced points in front.
    for (let band = 0; band < 3; band++) {
      ctx.beginPath();
      for (let i = 0; i < waveFloor.length; i++) {
        const p = waveFloor[i];
        if (Math.min(2, Math.floor(p.depth * 3)) !== band) continue;
        const wave = Math.sin(p.across * 11 + p.depth * 4 - time * 0.24) * 0.67
          + Math.sin(p.across * 19 - p.depth * 3 + time * 0.16) * 0.33;
        const y = p.y + wave * p.amplitude;
        ctx.moveTo(p.x + p.radius, y);
        ctx.arc(p.x, y, p.radius, 0, TAU);
      }
      ctx.fillStyle = 'rgba(153,177,211,' + (0.13 + band * 0.095) + ')';
      ctx.fill();
    }

    // Wave fronts modulate a single, coherent toroidal point surface.
    // Batched paths keep the point field inexpensive on mobile GPUs.
    for (let color = 0; color < palette.length; color++) {
      for (let band = 0; band < 3; band++) {
        ctx.beginPath();
        for (let i = 0; i < mesh.length; i++) {
          const p = mesh[i];
          if (p.color !== color) continue;
          const wave = 0.5 + 0.5 * Math.sin(p.u * 3 - p.v * 8 - time * 0.42);
          if (Math.min(2, Math.floor(wave * 3)) !== band) continue;
          const y = p.y + Math.sin(p.u * 3 - p.v * 7 - time * 0.42) * p.scale * (mobile ? 1.3 : 2.1);
          ctx.moveTo(p.x + p.radius, y);
          ctx.arc(p.x, y, p.radius, 0, TAU);
        }
        ctx.fillStyle = 'rgba(' + palette[color] + ',' + (0.26 + band * 0.20) + ')';
        ctx.fill();
      }
    }
    for (let i = 0; i < trails.length; i++) {
      const t = trails[i];
      const head = t.angle + time * t.speed;
      const p = project(head, t.v);
      const color = palette[Math.min(4, Math.floor(t.v * 5))];
      const brightness = 0.46 + (1 - p.depth) * 0.45;
      for (let part = 0; part < 3; part++) {
        const start = head - 0.16 + part * 0.05;
        pathAt(ctx, t.v, start, start + 0.057, 7);
        ctx.strokeStyle = 'rgba(' + color + ',' + brightness * (0.2 + part * 0.25) + ')';
        ctx.lineWidth = 1.1 * p.scale;
        ctx.stroke();
      }
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8 * p.scale);
      glow.addColorStop(0, 'rgba(' + color + ',' + brightness * 0.48 + ')');
      glow.addColorStop(1, 'rgba(' + color + ',0)');
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - 8 * p.scale, p.y - 8 * p.scale, 16 * p.scale, 16 * p.scale);
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.05 * p.scale, 0, TAU);
      ctx.fillStyle = 'rgba(230,237,250,' + brightness + ')'; ctx.fill();
    }

    // Protect the reading column without introducing a hard visual seam.
    ctx.globalCompositeOperation = 'source-over';
    const shade = ctx.createLinearGradient(0, 0, width, 0);
    shade.addColorStop(0, 'rgba(8,10,15,0.99)');
    shade.addColorStop(mobile ? 0.25 : 0.30, 'rgba(8,10,15,0.92)');
    shade.addColorStop(mobile ? 0.68 : 0.57, 'rgba(8,10,15,0.13)');
    shade.addColorStop(1, 'rgba(8,10,15,0)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
    const edge = ctx.createLinearGradient(0, 0, 0, height);
    edge.addColorStop(0, 'rgba(8,10,15,0.34)');
    edge.addColorStop(0.24, 'rgba(8,10,15,0)');
    edge.addColorStop(0.83, 'rgba(8,10,15,0)');
    edge.addColorStop(1, 'rgba(8,10,15,0.60)');
    ctx.fillStyle = edge; ctx.fillRect(0, 0, width, height);
  }

  function updateButton() {
    if (!button) return;
    const isZh = (document.documentElement.lang || '').toLowerCase().startsWith('zh');
    const labels = reduced || !canAnimate
      ? { en: 'Static view', zh: '静态视图' }
      : running ? { en: 'Pause motion', zh: '暂停动画' } : { en: 'Play motion', zh: '播放动画' };
    button.setAttribute('aria-pressed', running ? 'true' : 'false');
    button.setAttribute('aria-label', labels[isZh ? 'zh' : 'en']);
    button.title = labels[isZh ? 'zh' : 'en'];
    button.disabled = reduced || !canAnimate;
    const en = button.querySelector('.en');
    const zh = button.querySelector('.zh');
    if (en && zh) { en.textContent = labels.en; zh.textContent = labels.zh; }
    else button.textContent = labels[isZh ? 'zh' : 'en'];
  }

  function tick(now) {
    if (!running) return;
    const interval = 1000 / (mobile ? 24 : 30);
    if (!previous) previous = now;
    if (now - previous >= interval) {
      phase += Math.min(0.12, (now - previous) / 1000);
      previous = now;
      draw(phase);
    }
    raf = requestAnimationFrame(tick);
  }
  function reconcile() {
    const shouldRun = canAnimate && !reduced && !userPaused && inView && !document.hidden && !pageHidden;
    if (shouldRun !== running) {
      running = shouldRun;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      previous = 0;
      if (running) raf = requestAnimationFrame(tick);
    }
    updateButton();
  }
  function measureVisibility() {
    const rect = container.getBoundingClientRect();
    inView = rect.bottom > 0 && rect.top < window.innerHeight;
    reconcile();
  }
  function queueResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { prepare(); measureVisibility(); }, 110);
  }
  if (button) button.addEventListener('click', () => { userPaused = !userPaused; reconcile(); });
  document.addEventListener('languagechange', updateButton);
  document.addEventListener('visibilitychange', reconcile);
  window.addEventListener('pagehide', () => { pageHidden = true; reconcile(); });
  window.addEventListener('pageshow', () => { pageHidden = false; reconcile(); });
  window.addEventListener('resize', queueResize, { passive: true });
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(queueResize);
    observer.observe(container);
  }
  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; reconcile(); }, { threshold: 0 });
    observer.observe(container);
  } else {
    window.addEventListener('scroll', () => {
      if (scrollTimer) return;
      scrollTimer = setTimeout(() => { scrollTimer = 0; measureVisibility(); }, 160);
    }, { passive: true });
  }
  if (motion) {
    const onMotion = event => { reduced = event.matches; if (reduced) draw(phase); reconcile(); };
    if (typeof motion.addEventListener === 'function') motion.addEventListener('change', onMotion);
    else if (typeof motion.addListener === 'function') motion.addListener(onMotion);
  }
  prepare();
  measureVisibility();
})();
