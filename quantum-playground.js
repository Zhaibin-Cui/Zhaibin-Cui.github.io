/* Illustrative quantum measurement and a pure-state Bloch sphere. No dependencies. */
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
    let redraw = () => {};

    function setTab(name, focus) {
      tabs.forEach(tab => {
        const active = tab.dataset.qpTab === name;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active && focus) tab.focus();
      });
      panels.forEach(item => { item.hidden = item.dataset.qpPanel !== name; });
      if (name === 'qubit') redraw();
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
      query('#qp-cat-desc').textContent = 'An architectural box with a closed lid. Open the box to sample an alive or dead outcome from the probability you select.';
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

    const canvas = query('.qp-bloch-canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const thetaInput = query('#qp-theta');
    const phiInput = query('#qp-phi');
    let theta = Math.PI / 3;
    let phi = Math.PI / 4;
    let basis = 'z';
    let yaw = -.6;
    let pitch = .21;
    let width = 0;
    let height = 0;
    let pending = false;
    let drag = null;
    const tau = 2 * Math.PI;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function project(point, radius, cx, cy) {
      const x = point[0] * Math.cos(yaw) + point[1] * Math.sin(yaw);
      const depth = -point[0] * Math.sin(yaw) + point[1] * Math.cos(yaw);
      const y = point[2] * Math.cos(pitch) - depth * Math.sin(pitch);
      const z = point[2] * Math.sin(pitch) + depth * Math.cos(pitch);
      return {x:cx+x*radius, y:cy-y*radius, z};
    }
    function draw() {
      pending = false;
      if (canvas.closest('[hidden]')) return;
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width*dpr) || canvas.height !== Math.round(height*dpr)) {
        canvas.width = Math.round(width*dpr);
        canvas.height = Math.round(height*dpr);
      }
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,width,height);
      const radius = Math.min(width*.34,height*.36);
      const cx = width*.5;
      const cy = height*.5;
      const P = point => project(point,radius,cx,cy);
      const glow = ctx.createRadialGradient(cx-radius*.3,cy-radius*.3,0,cx,cy,radius*1.24);
      glow.addColorStop(0,'rgba(235,240,246,.08)');
      glow.addColorStop(.78,'rgba(122,151,184,.035)');
      glow.addColorStop(1,'rgba(122,151,184,0)');
      ctx.fillStyle=glow; ctx.beginPath();ctx.arc(cx,cy,radius*1.24,0,tau);ctx.fill();
      function line(points,front,color,alpha,lw=1) {
        ctx.lineWidth=lw;ctx.strokeStyle=`rgba(${color},${alpha})`;ctx.beginPath();let started=false;
        points.forEach(pt=>{const q=P(pt);const visible=front?q.z>=0:q.z<0;if(!visible){started=false;return;}if(!started){ctx.moveTo(q.x,q.y);started=true;}else ctx.lineTo(q.x,q.y);});ctx.stroke();
      }
      const rings=[];
      for(let lat=-60;lat<=60;lat+=30){const a=lat*Math.PI/180;const pts=[];for(let k=0;k<=180;k++){const b=k/180*tau;pts.push([Math.cos(a)*Math.cos(b),Math.cos(a)*Math.sin(b),Math.sin(a)]);}rings.push({pts,equator:lat===0});}
      for(let longitude=0;longitude<180;longitude+=30){const a=longitude*Math.PI/180;const pts=[];for(let k=0;k<=180;k++){const b=k/180*tau;pts.push([Math.cos(b)*Math.cos(a),Math.cos(b)*Math.sin(a),Math.sin(b)]);}rings.push({pts,equator:false});}
      rings.forEach(r=>line(r.pts,false,'102,128,160',r.equator?.2:.12,r.equator?1.1:.65));
      // Sparse latitude samples retain a mathematical surface without visual noise.
      const dots=[];
      for(let lat=-75;lat<=75;lat+=15){const a=lat*Math.PI/180;for(let k=0;k<36;k++){const b=k/36*tau;dots.push(P([Math.cos(a)*Math.cos(b),Math.cos(a)*Math.sin(b),Math.sin(a)]));}}
      dots.sort((a,b)=>a.z-b.z).forEach(q=>{ctx.beginPath();ctx.arc(q.x,q.y,q.z>0?1.05:.65,0,tau);ctx.fillStyle=q.z>0?'rgba(96,126,164,.42)':'rgba(96,126,164,.12)';ctx.fill();});
      const selectedAxis=basis==='x'?[1.12,0,0]:basis==='y'?[0,1.12,0]:[0,0,1.12];
      const aPos=P(selectedAxis),aNeg=P(selectedAxis.map(value=>-value));
      ctx.setLineDash([2,5]);ctx.strokeStyle='rgba(138,122,171,.5)';ctx.lineWidth=1.15;ctx.beginPath();ctx.moveTo(aNeg.x,aNeg.y);ctx.lineTo(aPos.x,aPos.y);ctx.stroke();ctx.setLineDash([]);
      const axes=[{v:[1.13,0,0],label:'x',key:'x'},{v:[0,1.13,0],label:'y',key:'y'},{v:[0,0,1.17],label:'|0⟩',key:'z'},{v:[0,0,-1.17],label:'|1⟩',key:'z'}];
      ctx.font=`${width<350?12:14}px Georgia, serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      axes.forEach(axis=>{const q=P(axis.v);ctx.strokeStyle='rgba(112,134,159,.38)';ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.fillStyle=axis.key===basis?'#85729f':'#5d7390';const dx=q.x-cx,dy=q.y-cy;const len=Math.hypot(dx,dy)||1;ctx.fillText(axis.label,q.x+dx/len*16,q.y+dy/len*16);});
      const state=[Math.sin(theta)*Math.cos(phi),Math.sin(theta)*Math.sin(phi),Math.cos(theta)];
      const q=P(state);
      // Dashed projection exposes azimuth and population without changing the state.
      const base=P([state[0],state[1],0]);
      ctx.setLineDash([3,5]);ctx.strokeStyle='rgba(134,117,167,.45)';ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(base.x,base.y);ctx.lineTo(cx,cy);ctx.stroke();ctx.setLineDash([]);
      rings.forEach(r=>line(r.pts,true,'102,128,160',r.equator?.45:.24,r.equator?1.1:.65));
      ctx.strokeStyle='#577ca7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(q.x,q.y);ctx.stroke();
      const angle=Math.atan2(q.y-cy,q.x-cx);ctx.fillStyle='#577ca7';ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x-10*Math.cos(angle-.35),q.y-10*Math.sin(angle-.35));ctx.lineTo(q.x-10*Math.cos(angle+.35),q.y-10*Math.sin(angle+.35));ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.arc(q.x,q.y,10,0,tau);ctx.fillStyle='rgba(98,131,171,.09)';ctx.fill();ctx.beginPath();ctx.arc(q.x,q.y,4.4,0,tau);ctx.fillStyle='#577ca7';ctx.fill();ctx.strokeStyle='#f6f5f1';ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,2.8,0,tau);ctx.fillStyle='#7f739b';ctx.fill();
      ctx.font='italic 17px Georgia, serif';ctx.fillStyle='#3e5e84';ctx.fillText('|ψ⟩',q.x+(q.x>=cx?21:-21),q.y-14);
      canvas.dataset.theta=String(Math.round(theta*180/Math.PI));
      canvas.dataset.phi=String(Math.round(phi*180/Math.PI));
      canvas.dataset.view=`${yaw.toFixed(3)},${pitch.toFixed(3)}`;
    }
    redraw = () => { if(!pending){pending=true;requestAnimationFrame(draw);} };
    function updateState() {
      theta = Number(thetaInput.value)*Math.PI/180;
      phi = Number(phiInput.value)*Math.PI/180;
      query('#qp-theta-value').textContent=thetaInput.value+'°';
      query('#qp-phi-value').textContent=phiInput.value+'°';
      const axisComponent = basis === 'x' ? Math.sin(theta)*Math.cos(phi)
        : basis === 'y' ? Math.sin(theta)*Math.sin(phi) : Math.cos(theta);
      const p0=clamp((1+axisComponent)/2,0,1);
      query('[data-qp-p0]').textContent=(p0*100).toFixed(1)+'%';
      query('[data-qp-p1]').textContent=((1-p0)*100).toFixed(1)+'%';
      query('[data-qp-probability-fill]').style.width=(p0*100)+'%';
      query('[data-qp-label0]').textContent=basis==='z'?'P(0)':'P(+)';
      query('[data-qp-label1]').textContent=basis==='z'?'P(1)':'P(−)';
      query('[data-qp-panel="qubit"]').dataset.basis=basis;
      query('[data-qp-basis-note]').textContent=basis==='z'
        ? 'Ideal pure qubit, measured along Z. Changing φ leaves P(0) and P(1) unchanged; choose X or Y to observe phase-dependent probabilities.'
        : `Ideal pure qubit, measured along ${basis.toUpperCase()}. The relative phase φ affects the probabilities of the + and − eigenstates. Rotating the view does not change the state.`;
      redraw();
    }
    root.querySelectorAll('[data-qp-basis]').forEach(button => button.addEventListener('click',()=>{
      basis=button.dataset.qpBasis;
      root.querySelectorAll('[data-qp-basis]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
      updateState();
    }));
    thetaInput.addEventListener('input',updateState);
    phiInput.addEventListener('input',updateState);
    canvas.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'&&event.button!==0)return;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw,pitch};
      if(event.pointerType==='mouse')canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      yaw=drag.yaw+dx*.009;
      pitch=clamp(drag.pitch-dy*.006,-1.15,1.15);
      redraw();
    });
    function release(){drag=null;}
    canvas.addEventListener('pointerup',release);
    canvas.addEventListener('pointercancel',release);
    canvas.addEventListener('lostpointercapture',release);
    canvas.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
      event.preventDefault();
      if(event.key==='ArrowLeft')yaw-=.14;
      if(event.key==='ArrowRight')yaw+=.14;
      if(event.key==='ArrowUp')pitch=clamp(pitch+.1,-1.15,1.15);
      if(event.key==='ArrowDown')pitch=clamp(pitch-.1,-1.15,1.15);
      if(event.key==='Home'){yaw=-.6;pitch=.21;}
      redraw();
    });
    if(typeof ResizeObserver==='function')new ResizeObserver(redraw).observe(canvas);
    else window.addEventListener('resize',redraw,{passive:true});
    updateState();
  });
})();
