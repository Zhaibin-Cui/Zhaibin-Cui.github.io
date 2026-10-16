/* Original light point fields: representations, training, agents, vision, waves.
 * Canvas 2D, no remote assets or dependencies. Illustrative, not measured data.
 * Each stage owns its controls; a static SVG remains the no-JS fallback.
 */
(() => {
  'use strict';
  const canvases = Array.from(new Set(Array.from(document.querySelectorAll(
    'canvas[data-research-field], .research-field > canvas, .quantum-field-stage > canvas, #research-field, #quantum-field'
  ))));
  if (!canvases.length) return;
  const TAU = Math.PI * 2;
  const paper = '#f6f5f1';
  const colors = ['93,119,162', '119,119,162', '132,117,163', '87,115,153'];
  const modes = ['ai', 'training', 'agents', 'vision', 'quantum'];
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
    const requestedMode = canvas.dataset.fieldMode || container.dataset.fieldMode || (canvas.id === 'quantum-field' ? 'quantum' : 'ai');
    const mode = modes.includes(requestedMode) ? requestedMode : 'ai';
    const fullArtwork = container.dataset.fieldLayout === 'full';
    const button = container.querySelector('[data-field-toggle]');
    let ctx;
    try { ctx = canvas.getContext('2d', { alpha: false }); } catch (_) { /* SVG fallback. */ }
    if (!ctx) { canvas.hidden = true; if (button) button.hidden = true; return null; }

    let width = 0, height = 0, dpr = 1, mobile = false, narrow = false;
    let points = [], rows = 0, cols = 0, layerCount = 1;
    let buckets = [], nodes = [];
    let observerTimer = 0;
    let phase = 0, scrollView = 0.45, targetView = 0.45;
    let running = false, userPaused = false, inView = false;
    let frame = 0, previous = 0;
    let geometry = null;
    let background = null;
    let readingVeil = null;
    let edgeVeil = null;

    function camera() {
      const view = reduced ? 0.45 : scrollView;
      const baseYaw = { ai: -0.28, training: -0.22, agents: -0.12, vision: -0.42, quantum: -0.11 }[mode];
      const baseTilt = { ai: 0.60, training: 0.43, agents: 0.16, vision: 0.20, quantum: 0.72 }[mode];
      const yaw = baseYaw + (view - 0.5) * 0.27;
      const tilt = baseTilt + (view - 0.5) * 0.16;
      const structured = mode === 'agents' || mode === 'training' || mode === 'vision';
      const horizontalScale = fullArtwork ? 0.36 : structured ? (narrow ? 0.56 : 0.235) : (narrow ? 0.66 : 0.39);
      geometry = {
        cx: width * (fullArtwork ? 0.52 : narrow ? 0.59 : 0.74),
        cy: height * (!fullArtwork && narrow ? 0.83 : mode === 'ai' ? 0.58 : 0.53),
        size: Math.min(width * horizontalScale, height * (!fullArtwork && narrow ? 0.58 : mode === 'agents' || mode === 'vision' ? 0.55 : mode === 'ai' ? 0.66 : 0.70)),
        verticalScale: !fullArtwork && narrow ? 0.52 : 1,
        cyaw: Math.cos(yaw), syaw: Math.sin(yaw), ct: Math.cos(tilt), st: Math.sin(tilt),
        morph: (view - 0.5) * 0.11
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
      return { x: g.cx + xx * g.size * scale, y: g.cy + yy * g.size * scale * g.verticalScale, scale: scale };
    }

    function position(x, z, layer, time) {
      return project(x, elevation(x, z, layer, time), z);
    }

    function nodeAt(index, time) {
      const n = nodes[index];
      const motion = reduced ? 0 : Math.sin(time * 0.14 + index * 0.7) * 0.013;
      return { x: n.x + motion, y: n.y + motion * 0.6, z: n.z };
    }

    function sample(p, time) {
      if (mode === 'agents') {
        const n = nodeAt(p.node, time);
        const breathe = 1 + Math.sin(time * 0.22 + p.node) * 0.035;
        return project(n.x + p.x * breathe, n.y + p.y * breathe, n.z + p.z * breathe);
      }
      if (mode === 'training') {
        const step = p.layer;
        const x = -0.84 + step * 0.84 + p.x * 0.25;
        const y = 0.33 - step * 0.26 + p.y * (0.27 + step * 0.08)
          + Math.sin(p.x * 3 + time * 0.18 + step) * 0.015;
        return project(x, y, p.z * 0.63);
      }
      if (mode === 'vision') {
        const zoom = 1 - p.layer * 0.16 + geometry.morph * p.layer * 0.2;
        return project(p.x * zoom, p.y * zoom + Math.sin(p.x * 2 + time * 0.15) * 0.012,
          -0.72 + p.layer * 0.72 + geometry.morph * p.x);
      }
      return position(p.x, p.z, p.layer, time);
    }

    function createPoints() {
      points = []; buckets = Array.from({ length: 12 }, () => []);
      function add(p) {
        p.px = 0; p.py = 0; p.r = 0;
        p.color = p.color || 0; p.band = p.band || 0;
        points.push(p); buckets[p.color * 3 + p.band].push(p);
      }
      if (mode === 'agents') {
        layerCount = 1;
        nodes = [{ x: 0, y: 0, z: 0, radius: 0.21 }];
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + i * TAU / 6;
          nodes.push({ x: Math.cos(a) * 0.93, y: Math.sin(a) * 0.64, z: Math.sin(a * 2) * 0.17, radius: 0.13 });
        }
        for (let n = 0; n < nodes.length; n++) {
          const count = mobile ? (n === 0 ? 130 : 64) : (n === 0 ? 270 : 140);
          for (let i = 0; i < count; i++) {
            const yy = 1 - (i + 0.5) * 2 / count, ring = Math.sqrt(1 - yy * yy), a = i * 2.3999632297;
            const radius = nodes[n].radius;
            add({ x: Math.cos(a) * ring * radius, y: yy * radius, z: Math.sin(a) * ring * radius,
              node: n, color: n === 0 ? 0 : (n % 3) + 1, band: Math.min(2, Math.floor((yy + 1) * 1.5)), radius: n === 0 ? 1.15 : 0.95 });
          }
        }
        return;
      }
      if (mode === 'training') {
        layerCount = 3; rows = mobile ? 16 : 25; cols = mobile ? 14 : 22;
        for (let layer = 0; layer < 3; layer++) {
          for (let depth = 0; depth < 3; depth++) {
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                add({ x: col / (cols - 1) * 2 - 1, y: row / (rows - 1) * 2 - 1,
                  z: (depth - 1) * 0.32, layer: layer, color: layer, band: depth,
                  radius: mobile ? 0.95 : 1.15 });
              }
            }
          }
        }
        return;
      }
      if (mode === 'vision') {
        layerCount = 3; rows = mobile ? 20 : 31; cols = mobile ? 31 : 49;
        for (let layer = 0; layer < 3; layer++) {
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const x = (col / (cols - 1) - 0.5) * 1.8, y = (row / (rows - 1) - 0.5) * 1.22;
              const attention = Math.exp(-((x - 0.12) ** 2 * 4 + (y + 0.04) ** 2 * 7));
              add({ x: x, y: y, z: 0, layer: layer, color: layer,
                band: Math.min(2, Math.floor(attention * 3)), radius: (mobile ? 0.7 : 0.8) + attention * 0.8 });
            }
          }
        }
        return;
      }
      rows = mode === 'ai' ? (mobile ? 17 : 26) : (mobile ? 27 : 43);
      cols = mode === 'ai' ? (mobile ? 37 : 62) : (mobile ? 53 : 90);
      layerCount = mode === 'ai' ? 4 : 1;
      for (let layer = 0; layer < layerCount; layer++) {
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const u = col / (cols - 1), v = row / (rows - 1), band = Math.min(2, Math.floor(v * 3));
            add({ x: (u - 0.5) * (mode === 'ai' ? 2.16 : 2.8), z: (v - 0.5) * 1.44,
              layer: layer, color: mode === 'quantum' ? (band === 1 ? 2 : 0) : layer, band: band,
              radius: (mobile ? 0.78 : 0.95) + v * (mobile ? 0.45 : 0.65) });
          }
        }
      }
    }

    function prepare() {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const small = w < 700;
      const ratio = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
      if (w === width && h === height && ratio === dpr) return;
      width = w; height = h; dpr = ratio; mobile = small; narrow = w <= 1000;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.width = '100%'; canvas.style.height = '100%';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      camera();
      createPoints();
      background = ctx.createRadialGradient(width * 0.78, height * 0.42, 0, width * 0.72, height * 0.5, Math.max(width, height) * 0.6);
      background.addColorStop(0, 'rgba(219,227,241,0.48)');
      background.addColorStop(0.45, 'rgba(230,223,239,0.24)');
      background.addColorStop(1, 'rgba(246,245,241,0)');
      readingVeil = ctx.createLinearGradient(0, 0, narrow ? 0 : width, narrow ? height : 0);
      readingVeil.addColorStop(0, 'rgba(246,245,241,1)');
      if (narrow) {
        // Tablets and phones read vertically: keep the copy above the artwork.
        readingVeil.addColorStop(0.69, 'rgba(246,245,241,1)');
        readingVeil.addColorStop(0.74, 'rgba(246,245,241,0.98)');
        readingVeil.addColorStop(0.83, 'rgba(246,245,241,0.55)');
        readingVeil.addColorStop(0.92, 'rgba(246,245,241,0.03)');
      } else {
        readingVeil.addColorStop(0.46, 'rgba(246,245,241,1)');
        readingVeil.addColorStop(0.55, 'rgba(246,245,241,0.83)');
        readingVeil.addColorStop(0.65, 'rgba(246,245,241,0.04)');
      }
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
        const view = sample(p, time);
        p.px = view.x; p.py = view.y; p.r = p.radius * view.scale;
      }
      if (mode === 'ai' || mode === 'quantum') for (let layer = 0; layer < layerCount; layer++) {
        for (let row = 2; row < rows; row += mode === 'ai' ? 7 : 6) {
          strokeRow((row / (rows - 1) - 0.5) * 1.44, layer, time, mode === 'ai' ? 0.16 : 0.18);
        }
      }
      for (let b = 0; b < buckets.length; b++) {
        const bucket = buckets[b];
        if (!bucket.length) continue;
        ctx.beginPath();
        for (let i = 0; i < bucket.length; i++) {
          const p = bucket[i]; ctx.moveTo(p.px + p.r, p.py); ctx.arc(p.px, p.py, p.r, 0, TAU);
        }
        ctx.fillStyle = 'rgba(' + colors[Math.floor(b / 3)] + ',' + (0.35 + (b % 3) * 0.18) + ')';
        ctx.fill();
      }
      if (mode === 'ai') drawInformation(time);
      else if (mode === 'quantum') drawCorrelation(time);
      else if (mode === 'agents') drawAgents(time);
      else if (mode === 'vision') drawVision(time);
      else drawTraining(time);
      if (!fullArtwork) { ctx.fillStyle = readingVeil; ctx.fillRect(0, 0, width, height); }
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

    function packet(p, radius, alpha) {
      ctx.beginPath(); ctx.arc(p.x, p.y, radius * p.scale, 0, TAU);
      ctx.fillStyle = 'rgba(102,130,174,' + alpha + ')'; ctx.fill();
    }

    function drawAgents(time) {
      const origin = nodeAt(0, time);
      for (let i = 1; i < nodes.length; i++) {
        const target = nodeAt(i, time);
        function route(t) {
          const bend = Math.sin(t * Math.PI) * 0.07;
          return project(origin.x + (target.x - origin.x) * t,
            origin.y + (target.y - origin.y) * t + bend,
            origin.z + (target.z - origin.z) * t);
        }
        ctx.beginPath();
        for (let step = 0; step <= 28; step++) {
          const p = route(step / 28);
          if (!step) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(117,137,174,0.20)'; ctx.lineWidth = 0.65; ctx.stroke();
        const progress = (time * 0.12 + i * 0.157) % 1;
        packet(route(i % 2 ? progress : 1 - progress), 1.8, 0.62);
      }
    }

    function drawTraining(time) {
      function route(t, offset) {
        const smooth = t * t * (3 - 2 * t);
        return project(-1.22 + t * 2.44, 0.70 - smooth * 1.12 + offset,
          0.36 + Math.sin(t * Math.PI * 2 + time * 0.10) * 0.028);
      }
      for (let lane = 0; lane < 3; lane++) {
        ctx.beginPath();
        for (let step = 0; step <= 70; step++) {
          const p = route(step / 70, (lane - 1) * 0.028);
          if (!step) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(' + colors[lane] + ',0.22)'; ctx.lineWidth = 0.55; ctx.stroke();
      }
      for (let i = 0; i < (mobile ? 5 : 8); i++) {
        packet(route((time * 0.065 + i * 0.137) % 1, 0), 1.65, 0.58);
      }
    }

    function drawVision(time) {
      const corners = [[-0.9, -0.61], [0.9, -0.61], [0.9, 0.61], [-0.9, 0.61]];
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        for (let i = 0; i <= 4; i++) {
          const corner = corners[i % 4];
          const p = sample({ x: corner[0], y: corner[1], layer: layer }, time);
          if (!i) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(' + colors[layer] + ',0.18)'; ctx.lineWidth = 0.6; ctx.stroke();
      }
      // Corresponding locations stay aligned across the sampled feature planes.
      for (let corner = 0; corner < 4; corner += 2) {
        ctx.beginPath();
        for (let layer = 0; layer < 3; layer++) {
          const p = sample({ x: corners[corner][0], y: corners[corner][1], layer: layer }, time);
          if (!layer) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(124,140,178,0.16)'; ctx.lineWidth = 0.55; ctx.stroke();
      }
      const focusX = 0.12 + Math.sin(time * 0.13) * 0.10;
      const focusY = -0.04 + Math.cos(time * 0.11) * 0.06;
      for (let layer = 0; layer < 3; layer++) {
        const p = sample({ x: focusX, y: focusY, layer: layer }, time);
        packet(p, 1.7, 0.60);
        ctx.beginPath(); ctx.arc(p.x, p.y, (8 - layer * 1.4) * p.scale, 0, TAU);
        ctx.strokeStyle = 'rgba(' + colors[layer] + ',0.23)'; ctx.lineWidth = 0.75; ctx.stroke();
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
      const observer = new ResizeObserver(() => {
        clearTimeout(observerTimer);
        observerTimer = setTimeout(() => { prepare(); measure(); }, 90);
      });
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
