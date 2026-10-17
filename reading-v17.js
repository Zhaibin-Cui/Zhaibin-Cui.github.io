/* Native disclosure keeps the complete page readable without JavaScript. */
(() => {
  const compact = matchMedia('(max-width: 800px)');
  const responsive = [...document.querySelectorAll('[data-mobile-disclosure]')];
  const layouts = [...document.querySelectorAll('.project-layout')];
  const guides = [...document.querySelectorAll('.overview-capabilities')];
  const equations = [...document.querySelectorAll('.wm-equation')];
  const touched = new WeakSet();
  for (const detail of responsive) {
    const summary = detail.querySelector(':scope > summary');
    summary?.addEventListener('click', () => touched.add(detail));
  }
  function revealTarget(scroll = true) {
    if (!location.hash) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
    if (!target) return;
    let parent = target.parentElement;
    while (parent) {
      if (parent.tagName === 'DETAILS') { parent.open = true; touched.add(parent); }
      parent = parent.parentElement;
    }
    if (scroll) requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
  }
  function setDefaults() {
    for (const layout of layouts) layout.classList.toggle('reading-stack', layout.clientWidth < 900);
    for (const guide of guides) guide.classList.toggle('guide-compact', guide.clientWidth < 330);
    for (const equation of equations) equation.classList.toggle('compact-equation', equation.clientWidth < 300);
    for (const detail of responsive) if (!touched.has(detail)) {
      const layout = detail.closest('.project-layout');
      const shell = detail.closest('.project-hero') || document.querySelector('.overview-capabilities');
      const narrow = layout ? layout.clientWidth < 900 : compact.matches || (shell && shell.clientWidth < 800);
      if (detail.open === !!narrow) detail.open = !narrow;
    }
    revealTarget(false);
  }
  setDefaults();
  revealTarget();
  if (compact.addEventListener) compact.addEventListener('change', setDefaults);
  else compact.addListener(setDefaults);
  // CSS zoom may leave media queries at the original viewport width. Observe
  // the actual reading column, and batch mutations outside ResizeObserver.
  let measurePending = false;
  const scheduleLayout = () => {
    if (measurePending) return;
    measurePending = true;
    requestAnimationFrame(() => { measurePending = false; setDefaults(); });
  };
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleLayout);
    for (const element of [...layouts, ...equations, ...document.querySelectorAll('.project-hero,.overview-capabilities')]) observer.observe(element);
  }
  addEventListener('resize', scheduleLayout, {passive:true});
  addEventListener('hashchange', () => revealTarget());
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor && anchor.hash === location.hash) revealTarget();
  });
})();
