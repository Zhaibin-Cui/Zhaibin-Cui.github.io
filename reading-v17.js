/* Native disclosure keeps the complete page readable without JavaScript. */
(() => {
  const compact = matchMedia('(max-width: 800px)');
  const responsive = [...document.querySelectorAll('[data-mobile-disclosure]')];
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
    for (const detail of responsive) if (!touched.has(detail)) detail.open = !compact.matches;
    revealTarget(false);
  }
  setDefaults();
  revealTarget();
  if (compact.addEventListener) compact.addEventListener('change', setDefaults);
  else compact.addListener(setDefaults);
  addEventListener('hashchange', () => revealTarget());
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor && anchor.hash === location.hash) revealTarget();
  });
})();
