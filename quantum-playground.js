/* Quantum-lab tabs and illustrative repeated quantum measurement. */
(() => {
  'use strict';
  document.querySelectorAll('[data-quantum-playground]').forEach(root => {
    if (root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    const query = selector => root.querySelector(selector);
    const tabs = [...root.querySelectorAll('[data-qp-tab]')];
    const panels = [...root.querySelectorAll('[data-qp-panel]')];
    const panel = query('[data-qp-panel="measurement"]');
    const probability = query('#qp-probability');
    const measure = query('[data-qp-measure]');
    const resultTitle = query('[data-qp-result-title]');
    const resultCopy = query('[data-qp-result-copy]');
    const trials = query('[data-qp-trials]');
    const status = query('[data-qp-status]');
    const catArt = query('.qp-cat-art');
    let total = 0;
    let alive = 0;

    function setTab(name, focus) {
      tabs.forEach(tab => {
        const active = tab.dataset.qpTab === name;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active && focus) tab.focus();
      });
      panels.forEach(item => { item.hidden = item.dataset.qpPanel !== name; });
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => setTab(tab.dataset.qpTab, false));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const target = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        setTab(tabs[target].dataset.qpTab, true);
      });
    });
    function prepare() {
      panel.dataset.state = 'prepared';
      measure.disabled = false;
      measure.innerHTML = 'Open the box <span aria-hidden="true">↗</span>';
      resultTitle.textContent = 'Before you look.';
      resultCopy.textContent = 'The box is a familiar thought experiment. Here it represents a deliberately simplified two-outcome measurement.';
      status.textContent = 'STATE PREPARED';
      catArt.setAttribute('aria-disabled', 'false');
      catArt.setAttribute('aria-label', 'Measure the prepared state by opening the box');
      query('#qp-cat-desc').textContent = 'A cat and its enclosure formed from blue and violet particles. Open the box to sample an alive or dead outcome from the selected probability.';
    }
    probability.addEventListener('input', () => {
      query('#qp-probability-value').textContent = probability.value + '%';
      total = 0;
      alive = 0;
      trials.textContent = 'New preparation · no measurements yet.';
      prepare();
    });
    measure.addEventListener('click', () => {
      if (panel.dataset.state !== 'prepared') return;
      const p = Number(probability.value) / 100;
      const sample = new Uint32Array(1);
      let random;
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(sample);
        random = sample[0] / 4294967296;
      } else random = Math.random();
      const isAlive = random < p;
      total += 1;
      if (isAlive) alive += 1;
      panel.dataset.state = isAlive ? 'alive' : 'dead';
      catArt.setAttribute('aria-disabled', 'true');
      catArt.setAttribute('aria-label', `Measurement complete. Outcome: ${isAlive ? 'alive' : 'dead'}. The reprepare control starts a new trial.`);
      status.textContent = 'ONE OUTCOME OBSERVED';
      resultTitle.textContent = isAlive ? 'Alive, in this trial.' : 'Dead, in this trial.';
      resultCopy.textContent = 'This is one sampled outcome. Prepare the same state again to obtain another independent trial; the selected probability describes an ensemble, not a certainty for one measurement.';
      measure.disabled = true;
      measure.textContent = 'Box opened';
      trials.textContent = `${total} ${total === 1 ? 'trial' : 'trials'} · ${alive} alive · ${total - alive} dead`;
      query('#qp-cat-desc').textContent = isAlive
        ? 'The open box reveals an upright cat: alive in this simulated trial.'
        : 'The open box reveals a still, curled silhouette: dead in this simulated trial. No graphic depiction.';
    });
    query('[data-qp-reset]').addEventListener('click', prepare);
    let catPointer = null;
    let catMoved = false;
    catArt.addEventListener('pointerdown', event => {
      catPointer = {x:event.clientX,y:event.clientY};
      catMoved = false;
    });
    catArt.addEventListener('pointermove', event => {
      if (catPointer && Math.hypot(event.clientX-catPointer.x,event.clientY-catPointer.y)>8) catMoved=true;
    });
    catArt.addEventListener('pointercancel', () => { catMoved=true;catPointer=null; });
    catArt.addEventListener('pointerup', () => { catPointer=null; });
    catArt.addEventListener('click', event => {
      if (event.detail === 0 || !catMoved) measure.click();
    });
    catArt.addEventListener('keydown', event => {
      if (event.key==='Enter' || event.key===' ') {
        event.preventDefault();
        measure.click();
      }
    });

  });
})();
