/* Original 3D particle sculptures. Canvas 2D; no dependencies or remote assets.
 * Stable particles morph between a continuous wave field and a disciplinary form.
 * Decorative, conceptual geometry only: no experimental or company data.
 */
(() => {
  'use strict';
  const canvases = Array.from(new Set(Array.from(document.querySelectorAll(
    'canvas[data-research-field], .research-field > canvas, .quantum-field-stage > canvas, #research-field, #quantum-field'
  ))));
  if (!canvases.length) return;
  const TAU = Math.PI * 2, paper = '#f6f5f1';
  const colors = ['86,119,166', '119,126,173', '139,119,171', '61,91,140'];
  const modes = ['ai', 'training', 'agents', 'vision', 'quantum'];
  const shapes = { ai: 'neural-chip', training: 'gpu-ladder', agents: 'agent-constellation', vision: 'vision-eye', quantum: 'bloch-sphere' };
  const canAnimate = typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function';
  // This visual is intentionally continuous. Only viewport/page visibility suspends it.
  let pageHidden = false, scrollTimer = 0, resizeTimer = 0;
  const stages = [];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const mix = (a, b, t) => a + (b - a) * t;

  // Sample surfaces, volumes and connectors into one consistent point vocabulary.
  function sculpture(mode, small) {
    const points = [], density = small ? 0.56 : 1;
    const add = (x, y, z, color = 0, size = 1, weight = 1, flow = -1) => points.push({ x, y, z, color, size, weight, flow });
    function line(a, b, count = 50, color = 0, size = 1, weight = 1, flow = false) {
      count = Math.max(12, Math.round(count * density));
      for (let i = 0; i <= count; i++) { const t = i / count; add(mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t), color, size, weight, flow ? t : -1); }
    }
    function ring(x, y, z, rx, ry, count = 140, color = 0, plane = 'xy', size = 1, weight = 1) {
      count = Math.round(count * density);
      for (let i = 0; i < count; i++) { const a = i / count * TAU, c = Math.cos(a), s = Math.sin(a);
        if (plane === 'xz') add(x + rx * c, y, z + ry * s, color, size, weight);
        else if (plane === 'yz') add(x, y + rx * c, z + ry * s, color, size, weight);
        else add(x + rx * c, y + ry * s, z, color, size, weight);
      }
    }
    function sphere(x, y, z, r, count, color, weight = 1) {
      count = Math.round(count * density);
      for (let i = 0; i < count; i++) { const yy = 1 - (i + 0.5) * 2 / count, rr = Math.sqrt(1 - yy * yy), a = i * 2.3999632297;
        add(x + Math.cos(a) * rr * r, y + yy * r, z + Math.sin(a) * rr * r, color, 1.02, weight);
      }
    }
    function box(cx, cy, cz, sx, sy, sz, color = 0, surfaces = true, step = 0.065) {
      const corners = [];
      for (const z of [-1, 1]) for (const y of [-1, 1]) for (const x of [-1, 1]) corners.push([cx + x * sx / 2, cy + y * sy / 2, cz + z * sz / 2]);
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if ((i ^ j) === 1 || (i ^ j) === 2 || (i ^ j) === 4) line(corners[i], corners[j], 40, color, 1.12);
      if (!surfaces) return;
      const nx = Math.max(3, Math.round(sx / step * Math.sqrt(density))), ny = Math.max(3, Math.round(sy / step * Math.sqrt(density)));
      for (const side of [-1, 1]) for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) add(cx + sx * (ix / nx - .5), cy + sy * (iy / ny - .5), cz + side * sz / 2, color, .85, .55);
    }

    if (mode === 'ai') {
      box(0, 0, 0, 1.36, 1.08, .16, 1, true);
      box(0, 0, -.14, .80, .64, .10, 0, false);
      for (let i = 0; i < 11; i++) {
        const x = -.56 + i * .112, y = -.44 + i * .088;
        for (const side of [-1, 1]) {
          line([side * .70, y, 0], [side * .95, y, 0], 13, 0, 1.2);
          line([x, side * .56, 0], [x, side * .78, 0], 13, 0, 1.2);
        }
      }
      const rows = [-.23, 0, .23], columns = [-.28, 0, .28];
      for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) sphere(columns[c], rows[r], -.23, .043, 70, c % 3, 1.05);
      for (let c = 0; c < 2; c++) for (let r = 0; r < 3; r++) {
        line([columns[c], rows[r], -.23], [columns[c + 1], rows[r], -.23], 34, 0, .85, .7, true);
        if (r < 2) line([columns[c], rows[r], -.23], [columns[c + 1], rows[r + 1], -.23], 36, 2, .75, .55, true);
      }
    } else if (mode === 'training') {
      for (let level = 0; level < 3; level++) {
        const x = -.73 + level * .73, y = .30 - level * .30, z = .12 - level * .12;
        box(x, y, z, .56, .85, .15, level, false);
        // A sampled PCB, dual fan apertures and edge contacts make each compute card legible.
        const nx = small ? 9 : 15, ny = small ? 15 : 24;
        for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) {
          const xx = (ix / nx - .5) * .52, yy = (iy / ny - .5) * .80;
          if (Math.min(Math.hypot(xx, yy - .19), Math.hypot(xx, yy + .19)) > .17) add(x + xx, y + yy, z - .09, level, .85, .75);
        }
        for (const fanY of [-.19, .19]) {
          for (const r of [.055, .13, .165]) ring(x, y + fanY, z - .105, r, r, 95, level, 'xy', .92, .95);
          for (let blade = 0; blade < 7; blade++) {
            const a = blade / 7 * TAU;
            line([x + Math.cos(a) * .057, y + fanY + Math.sin(a) * .057, z - .11], [x + Math.cos(a + .42) * .135, y + fanY + Math.sin(a + .42) * .135, z - .11], 10, level, .8, .75);
          }
        }
        for (let pin = 0; pin < 8; pin++) line([x - .18 + pin * .05, y + .44, z], [x - .18 + pin * .05, y + .51, z], 7, 3, .9);
        if (level < 2) line([x + .30, y, z], [x + .42, y - .30, z - .12], 30, 0, 1.0, .55, true);
      }
    } else if (mode === 'agents') {
      sphere(0, 0, -.09, .245, 1050, 0);
      for (let n = 0; n < 6; n++) {
        const a = -Math.PI / 2 + n * TAU / 6, x = Math.cos(a) * .97, y = Math.sin(a) * .70, z = Math.sin(a * 2) * .19;
        sphere(x, y, z, .145 + (n % 2) * .018, 370, n % 3 + 1, .95);
        const count = small ? 42 : 82;
        for (let i = 0; i <= count; i++) { const t = i / count; add(x * t, y * t + Math.sin(t * Math.PI) * .035, mix(-.09, z, t), n % 3, .85, .55, t + n * .13); }
      }
    } else if (mode === 'vision') {
      // An almond silhouette, radial iris and a deep pupil; a quiet feature plane sits behind it.
      const count = small ? 170 : 290;
      for (let band = 0; band < 8; band++) for (let i = 0; i < count; i++) {
        const a = i / count * TAU, x = Math.cos(a), y = Math.sin(a) * .46 * (.72 + .28 * Math.abs(Math.sin(a)));
        const b = 1 - band * .014; add(x * b, y * b, -.04 - Math.sin(a) ** 2 * .09 + band * .008, band % 3, .95, .85);
      }
      for (let ray = 0; ray < (small ? 42 : 76); ray++) {
        const a = ray / (small ? 42 : 76) * TAU;
        for (let r = .105; r <= .285; r += small ? .026 : .018) add(Math.cos(a) * r, Math.sin(a) * r, -.20 - .045 * (1 - r / .285), ray % 3, .98, 1);
      }
      ring(0, 0, -.20, .29, .29, 210, 0, 'xy', 1.2);
      const pupil = small ? 90 : 190;
      for (let i = 0; i < pupil; i++) { const a = i * 2.3999632297, r = .094 * Math.sqrt((i + .5) / pupil); add(Math.cos(a) * r, Math.sin(a) * r, -.27, 3, 1.08, 1.15); }
      const nx = small ? 24 : 38, ny = small ? 13 : 21;
      for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) add((ix / nx - .5) * 1.60, (iy / ny - .5) * .90, .47, 1, .72, .30);
      for (const sign of [-1, 1]) line([sign * .9, 0, 0], [sign * .8, 0, .47], 35, 1, .7, .30, true);
    } else {
      sphere(0, 0, 0, .84, 2000, 1, .62);
      for (let latitude = -2; latitude <= 2; latitude++) {
        const y = latitude * .26, r = Math.sqrt(.84 * .84 - y * y);
        ring(0, y, 0, r, r, 180, 0, 'xz', .90, .90);
      }
      ring(0, 0, 0, .84, .84, 250, 2, 'xy', 1.02);
      ring(0, 0, 0, .84, .84, 250, 0, 'yz', 1.02);
      line([-1.02, 0, 0], [1.02, 0, 0], 130, 1, .75, .65);
      line([0, -1.02, 0], [0, 1.02, 0], 130, 1, .75, .65);
      line([0, 0, -1.02], [0, 0, 1.02], 130, 1, .75, .65);
      const end = [.43, -.62, -.37];
      line([0, 0, 0], end, 110, 3, 1.65, 1.3, true);
      sphere(...end, .047, 105, 3, 1.2);
      line(end, [.29, -.50, -.35], 25, 3, 1.25);
      line(end, [.45, -.45, -.31], 25, 3, 1.25);
    }
    const columns = Math.max(20, Math.round(Math.sqrt(points.length * 1.7))), rows = Math.ceil(points.length / columns);
    points.forEach((p, i) => { p.u = ((i % columns) / (columns - 1) - .5) * 3.25; p.v = (Math.floor(i / columns) / Math.max(1, rows - 1) - .5) * 1.8; p.seed = i * .61803398875; });
    return points;
  }

  function makeStage(canvas) {
    const container = canvas.closest('.research-field, .quantum-field-stage') || canvas.parentElement;
    const requested = canvas.dataset.fieldMode || container.dataset.fieldMode || (canvas.id === 'quantum-field' ? 'quantum' : 'ai');
    const mode = modes.includes(requested) ? requested : 'ai';
    const fullArtwork = container.dataset.fieldLayout === 'full';
    let ctx; try { ctx = canvas.getContext('2d', { alpha: false }); } catch (_) { /* Fallback remains visible. */ }
    if (!ctx) { canvas.hidden = true; return null; }
    let width = 0, height = 0, dpr = 1, mobile = false, narrow = false;
    let points = [], phase = mode === 'quantum' ? 1 : 2.75, scrollView = .45, targetView = .45;
    let running = false, inView = false, frame = 0, previous = 0, lastDraw = 0, observerTimer = 0;
    let geometry = null, background = null, readingVeil = null, edgeVeil = null;
    const buckets = Array.from({ length: 20 }, () => []);
    container.dataset.fieldShape = shapes[mode];

    function aggregation(time) {
      if (mode === 'quantum') {
        const t = time % 40;
        if (t < 12) return 0;
        if (t < 16) return smooth((t - 12) / 4);
        if (t < 36) return 1;
        return 1 - smooth((t - 36) / 4);
      }
      const t = time % 34;
      if (t < 3) return mix(.22, 1, smooth(t / 3));
      if (t < 28) return 1;
      if (t < 31) return mix(1, .22, smooth((t - 28) / 3));
      return .22;
    }
    function camera(time, amount) {
      const view = scrollView;
      const baseYaw = { ai: -.32, training: -.34, agents: -.10, vision: -.18, quantum: -.25 }[mode];
      const baseTilt = { ai: -.17, training: -.11, agents: .10, vision: -.05, quantum: mix(.72, .10, amount) }[mode];
      const yaw = baseYaw + (view - .5) * .15 + Math.sin(time * .065) * .055;
      const tilt = baseTilt + (view - .5) * .07;
      const footer = container.classList && container.classList.contains('landing-moon') ? 72 : 50;
      const artHeight = narrow && !fullArtwork ? Math.min(280, height - 100) : height;
      geometry = { cx: width * (narrow || fullArtwork ? .51 : .74),
        cy: narrow && !fullArtwork ? height - footer - artHeight / 2 : height * .51,
        size: narrow && !fullArtwork ? Math.min(width * .43, artHeight * .48) : Math.min(width * (fullArtwork ? .37 : .255), height * .50),
        cyaw: Math.cos(yaw), syaw: Math.sin(yaw), ct: Math.cos(tilt), st: Math.sin(tilt),
        artTop: narrow && !fullArtwork ? height - footer - artHeight : 0 };
    }
    function project(x, y, z) {
      const g = geometry, xx = x * g.cyaw + z * g.syaw, zz = z * g.cyaw - x * g.syaw;
      const yy = y * g.ct + zz * g.st, depth = zz * g.ct - y * g.st, scale = 1 / (1 + depth * .15);
      return { x: g.cx + xx * g.size * scale, y: g.cy + yy * g.size * scale, scale, depth };
    }
    function wave(x, z, time) {
      const a = Math.hypot(x + .48, z), b = Math.hypot(x - .48, z);
      return .17 * (Math.sin(a * 7.4 - time * .42) / Math.sqrt(.5 + a) + Math.sin(b * 7.4 - time * .42 + .48) / Math.sqrt(.5 + b));
    }
    function prepare() {
      const rect = container.getBoundingClientRect(), w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
      const small = w < 700, ratio = Math.min(window.devicePixelRatio || 1, w <= 1000 ? 1.5 : 2);
      if (w === width && h === height && ratio === dpr) return;
      width = w; height = h; mobile = small; narrow = w <= 1000; dpr = ratio;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = '100%'; canvas.style.height = '100%'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // A height-only change should not allocate thousands of new 3D sample points.
      if (!points.length || canvas.dataset.fieldDensity !== String(small)) {
        points = sculpture(mode, small);
        canvas.dataset.fieldDensity = String(small);
      }
      camera(phase, aggregation(phase));
      background = ctx.createRadialGradient(width * .80, height * .48, 0, width * .72, height * .51, width * .43);
      background.addColorStop(0, 'rgba(226,232,242,.38)'); background.addColorStop(.66, 'rgba(233,227,240,.20)'); background.addColorStop(1, 'rgba(246,245,241,0)');
      readingVeil = ctx.createLinearGradient(0, 0, narrow ? 0 : width, narrow ? height : 0);
      readingVeil.addColorStop(0, 'rgba(246,245,241,1)');
      if (narrow) {
        const top = clamp(geometry.artTop / height, 0, .90);
        readingVeil.addColorStop(top, 'rgba(246,245,241,1)'); readingVeil.addColorStop(Math.min(.97, top + .035), 'rgba(246,245,241,0)');
      } else { readingVeil.addColorStop(.46, 'rgba(246,245,241,1)'); readingVeil.addColorStop(.52, 'rgba(246,245,241,.70)'); readingVeil.addColorStop(.60, 'rgba(246,245,241,0)'); }
      readingVeil.addColorStop(1, 'rgba(246,245,241,0)');
      edgeVeil = ctx.createLinearGradient(0, 0, 0, height);
      edgeVeil.addColorStop(0, 'rgba(246,245,241,.28)'); edgeVeil.addColorStop(.12, 'rgba(246,245,241,0)'); edgeVeil.addColorStop(.94, 'rgba(246,245,241,0)'); edgeVeil.addColorStop(1, 'rgba(246,245,241,.5)');
      draw(phase); container.dataset.fieldReady = 'true';
      container.dataset.fieldPoints = String(points.length);
    }
    function draw(time) {
      if (!geometry || width < 2 || height < 2) return;
      const envelope = aggregation(time), scrollGather = .80 + .20 * smooth(Math.min(scrollView, 1 - scrollView) / .22);
      const amount = envelope * scrollGather;
      camera(time, amount);
      ctx.fillStyle = paper; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
      for (const bucket of buckets) bucket.length = 0;
      // Fixed particle identities provide an actual geometric morph, not a texture crossfade.
      for (let i = 0; i < points.length; i++) {
        const p = points[i], swell = wave(p.u, p.v, time);
        const breath = 1 + Math.sin(time * .18 + p.seed) * .004 * amount;
        const x = mix(p.u, p.x * breath, amount), y = mix(swell, p.y * breath, amount), z = mix(p.v, p.z * breath, amount);
        // Flat buckets avoid one object and one tuple allocation per particle per frame.
        const g = geometry, xx = x * g.cyaw + z * g.syaw, zz = z * g.cyaw - x * g.syaw;
        const yy = y * g.ct + zz * g.st, depth = zz * g.ct - y * g.st, scale = 1 / (1 + depth * .15);
        const px = g.cx + xx * g.size * scale, py = g.cy + yy * g.size * scale;
        const front = clamp((1.3 - depth) / 2.6, 0, 1);
        const pulse = p.flow < 0 ? 0 : Math.pow(Math.max(0, Math.cos((p.flow - time * .13) * TAU)), 16) * .32 * amount;
        const alpha = clamp((.25 + front * .52) * p.weight + pulse, .12, .92);
        const band = clamp(Math.floor((alpha - .10) / .19), 0, 4);
        const radius = p.size * (mobile ? .91 : 1.08) * scale * (.83 + front * .35) + pulse * .6;
        if (px + radius < 0 || px - radius > width || py + radius < 0 || py - radius > height) continue;
        buckets[p.color * 5 + band].push(px, py, radius);
      }
      if (mode === 'quantum' && amount < .80) {
        for (let row = 0; row < 9; row++) {
          ctx.beginPath(); const z = -.75 + row * .1875;
          for (let step = 0; step <= 90; step++) { const x = -1.65 + step / 90 * 3.3, p = project(x, wave(x, z, time), z); if (!step) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
          ctx.strokeStyle = `rgba(103,124,167,${(.13 * (1 - amount)).toFixed(3)})`; ctx.lineWidth = .55; ctx.stroke();
        }
      }
      for (let i = 0; i < buckets.length; i++) {
        if (!buckets[i].length) continue; ctx.beginPath();
        const bucket = buckets[i];
        for (let n = 0; n < bucket.length; n += 3) { ctx.moveTo(bucket[n] + bucket[n + 2], bucket[n + 1]); ctx.arc(bucket[n], bucket[n + 1], bucket[n + 2], 0, TAU); }
        ctx.fillStyle = `rgba(${colors[Math.floor(i / 5)]},${(.16 + (i % 5) * .18).toFixed(2)})`; ctx.fill();
      }
      if (!fullArtwork) { ctx.fillStyle = readingVeil; ctx.fillRect(0, 0, width, height); }
      ctx.fillStyle = edgeVeil; ctx.fillRect(0, 0, width, height);
      const state = amount > .88 ? 'assembled' : amount < .12 ? 'wave' : 'morphing';
      if (container.dataset.fieldMorph !== state) container.dataset.fieldMorph = state;
      const progress = amount.toFixed(2); if (container.dataset.fieldAggregation !== progress) container.dataset.fieldAggregation = progress;
    }

    function tick(now) {
      if (!running) return;
      const interval = 1000 / (narrow ? 24 : 30);
      if (!previous) { previous = now; lastDraw = now; }
      const elapsed = now - previous;
      if (elapsed >= interval) {
        const delta = Math.min(0.12, (now - lastDraw) / 1000);
        phase += delta; scrollView += (targetView - scrollView) * (1 - Math.exp(-delta * 2.4));
        previous = now - elapsed % interval; lastDraw = now; draw(phase);
      }
      frame = requestAnimationFrame(tick);
    }

    function reconcile() {
      const next = canAnimate && inView && !document.hidden && !pageHidden;
      if (running !== next) {
        running = next;
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        previous = 0; lastDraw = 0;
        if (running) frame = requestAnimationFrame(tick);
      }
      container.dataset.fieldRunning = running ? 'true' : 'false';
    }

    function measure() {
      const rect = container.getBoundingClientRect();
      inView = rect.bottom > 0 && rect.top < window.innerHeight;
      targetView = clamp((window.innerHeight - rect.top) / (window.innerHeight + Math.max(1, rect.height)), 0, 1);
      reconcile();
    }

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
    return { prepare: prepare, measure: measure, reconcile: reconcile };
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
  document.addEventListener('visibilitychange', () => stages.forEach(stage => stage.reconcile()));
  window.addEventListener('pagehide', () => { pageHidden = true; stages.forEach(stage => stage.reconcile()); });
  window.addEventListener('pageshow', () => { pageHidden = false; stages.forEach(stage => stage.measure()); });
})();
