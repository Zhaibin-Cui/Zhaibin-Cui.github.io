/* Open the requested category before navigating to a figure in its disclosure. */
(() => {
  function reveal(hash, scroll) {
    let id;
    try { id = decodeURIComponent(hash.replace(/^#/, '')); } catch (_) { return; }
    const target = document.getElementById(id);
    if (!target || !target.closest('.defense-gallery')) return;
    let node = target;
    while (node) {
      if (node.tagName === 'DETAILS') node.open = true;
      node = node.parentElement;
    }
    if (scroll) requestAnimationFrame(() => target.scrollIntoView({block: 'start'}));
  }
  document.querySelectorAll('.dg-index a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => reveal(link.hash, true));
  });
  window.addEventListener('hashchange', () => reveal(location.hash, true));
  reveal(location.hash, Boolean(location.hash));
})();
