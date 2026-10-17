/* UI for the independent, exact statevector engine. */
(() => {
 'use strict';
 const engine=window.QuantumCircuitEngine;
 if(!engine)return;
 document.querySelectorAll('[data-circuit-lab]').forEach(root=>{
  const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)];
  let preset='qpe',phase=6/16,gates=[],step=0,state=null,timer=null,selected=7;
  const circuit=$('[data-qc-circuit]'),bars=$('[data-qc-bars]'),slider=$('#qc-step');
  const ket=i=>'|'+i.toString(2).padStart(4,'0')+'⟩';
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  const fraction=(n,d)=>{const g=gcd(n,d);return n===0?'0':`${n/g}/${d/g}`;};
  const fmt=n=>Math.abs(n)<1e-10?'0.0000':n.toFixed(4);
  const angle=a=>`${Math.abs(a/Math.PI)<1e-9?'0':(a/Math.PI).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}π`;
  const phaseColor=a=>`hsl(${245+a/Math.PI*35} 31% 56%)`;
  function title(g){return g.type==='CP'?`Controlled phase ${angle(g.angle)} · q${g.control} → q${g.q}`:g.type==='CX'?`CNOT · q${g.control} → q${g.q}`:g.type==='SWAP'?`SWAP · q${g.q} ↔ q${g.other}`:`${g.type} · q${g.q}`;}
  function gateSvg(g){
   const y=q=>38+q*52,x=32;
   let out=[0,1,2,3].map(q=>`<line x1="0" x2="64" y1="${y(q)}" y2="${y(q)}" class="qc-wire"/>`).join('');
   if(g.control!==undefined)out+=`<line x1="32" x2="32" y1="${y(g.control)}" y2="${y(g.q)}" class="qc-connector"/><circle cx="32" cy="${y(g.control)}" r="4" class="qc-control"/>`;
   if(g.type==='SWAP'){
    out+=`<line x1="32" x2="32" y1="${y(g.q)}" y2="${y(g.other)}" class="qc-connector"/>`;
    for(const q of [g.q,g.other])out+=`<path d="M26 ${y(q)-6}l12 12m-12 0l12-12" class="qc-swap"/>`;
   }else if(g.type==='CX')out+=`<circle cx="32" cy="${y(g.q)}" r="13" class="qc-gate-bg"/><path d="M24 ${y(g.q)}h16M32 ${y(g.q)-8}v16" class="qc-swap"/>`;
   else out+=`<rect x="15" y="${y(g.q)-17}" width="34" height="34" rx="4" class="qc-gate-bg"/><text x="32" y="${y(g.q)+5}" class="qc-symbol">${g.type==='CP'?'P':g.type}</text>${g.type==='CP'?`<text x="32" y="${y(g.q)+31}" class="qc-angle">${angle(g.angle)}</text>`:''}`;
   return `<svg viewBox="0 0 64 238" aria-hidden="true">${out}</svg>`;
  }
  function stop(){if(timer!==null)clearInterval(timer);timer=null;$('[data-qc-run]').disabled=false;$('[data-qc-run]').textContent=step===gates.length?'Replay circuit ↗':'Run circuit ↗';root.dataset.qcRunning='false';}
  function inspect(i){
   const clean=n=>Math.abs(n)<1e-10?0:n;
   selected=i;const p=state.probabilities[i],re=clean(state.re[i]),im=clean(state.im[i]),arg=p>1e-16?clean(Math.atan2(im,re)):null;
   $('[data-qc-amplitude]').textContent=`${ket(i)}   a = ${fmt(re)} ${im<0?'−':'+'} ${fmt(Math.abs(im))}i   ·   P = ${(p*100).toFixed(2)}%   ·   arg(a) = ${arg===null?'undefined':(arg/Math.PI).toFixed(3)+'π'}`;
   $$('[data-qc-basis]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.qcBasis)===i)));
  }
  function render(follow=false){
   state=engine.simulate(gates,step);slider.value=step;
   root.dataset.qcPreset=preset;root.dataset.qcStep=step;root.dataset.qcGates=gates.length;root.dataset.qcPhase=phase;root.dataset.qcState=JSON.stringify(state);
   $$('[data-qc-gate]').forEach((b,i)=>{b.classList.toggle('is-applied',i<step);b.classList.toggle('is-current',i===step-1);b.setAttribute('aria-pressed',String(i===step-1));});
   $('[data-qc-progress]').textContent=`${step.toString().padStart(2,'0')} / ${gates.length} operations`;
   $('[data-qc-next]').disabled=step>=gates.length;
   $('[data-qc-operation]').textContent=step===0?'Prepared in |0000⟩.':title(gates[step-1]);
   const descriptions={
    qpe:'The first three qubits accumulate eigenphase through controlled powers of U. The inverse QFT converts that phase pattern into a binary estimate; q₃ holds the |1⟩ eigenstate.',
    qft:'The input |0101⟩ is transformed into equal probabilities with different complex phases. Probability alone cannot reveal the Fourier structure: inspect the phase of each amplitude.',
    ghz:'Hadamard creates a superposition; the CNOT chain correlates all four qubits. The final state has two outcomes, |0000⟩ and |1111⟩, with equal probability.'};
   $('[data-qc-explanation]').textContent=descriptions[preset];
   $('[data-qc-norm]').textContent=state.norm.toFixed(6);$('[data-qc-entropy]').textContent=state.entropy.toFixed(3)+' bits';
   const marginal=Array.from({length:8},(_,i)=>state.probabilities[i*2]+state.probabilities[i*2+1]);
   const best=marginal.indexOf(Math.max(...marginal));
   $('[data-qc-register]').textContent=preset==='qpe'?`Leading register outcome: |${best.toString(2).padStart(3,'0')}⟩ → ${best}/8 (${(marginal[best]*100).toFixed(2)}%).${step<gates.length?' Intermediate state; continue to complete phase estimation.':''}`:'';
   $$('[data-qc-basis]').forEach((b,i)=>{const p=state.probabilities[i],arg=Math.atan2(state.im[i],state.re[i]);b.style.setProperty('--qc-prob',p);b.style.setProperty('--qc-phase',phaseColor(arg));b.title=`${ket(i)} · ${(p*100).toFixed(3)}%`;b.querySelector('.qc-bar-value').textContent=p>.00005?(p*100).toFixed(p>.1?0:1)+'%':'';});
   inspect(selected);
   if(follow&&step){const b=$(`[data-qc-gate="${step-1}"]`),scroll=$('.qc-circuit-scroll');if(b.offsetLeft>scroll.scrollLeft+scroll.clientWidth-90||b.offsetLeft<scroll.scrollLeft)scroll.scrollTo({left:Math.max(0,b.offsetLeft-scroll.clientWidth*.5),behavior:'smooth'});}
   if(!timer)$('[data-qc-run]').textContent=step===gates.length?'Replay circuit ↗':'Run circuit ↗';
  }
  function load(){
   stop();gates=engine.sequence(preset,phase);step=gates.length;slider.max=gates.length;
   circuit.innerHTML=gates.map((g,i)=>`<button class="qc-gate-column" type="button" data-qc-gate="${i}" aria-label="Operation ${i+1}: ${title(g)}" aria-pressed="false"><span class="qc-gate-number">${String(i+1).padStart(2,'0')}</span>${gateSvg(g)}</button>`).join('');
   $$('[data-qc-gate]').forEach(b=>b.addEventListener('click',()=>{stop();step=Number(b.dataset.qcGate)+1;render();}));
   $('.qc-phase-control').hidden=preset!=='qpe';
   $('[data-qc-description]').textContent=preset==='qpe'?'Estimate an eigenphase with three counting qubits and one eigenstate qubit. Change ϕ to compare exactly representable phases with finite-register resolution.':preset==='qft'?'Apply a four-qubit QFT to the integer 5. Controlled phase rotations encode the Fourier phase; final SWAPs restore the output bit order.':'Prepare a four-qubit GHZ state and follow the growth of entanglement across the register.';
   selected=preset==='qpe'?Math.round(phase*8)%8*2+1:0;
   render();$('.qc-circuit-scroll').scrollLeft=0;
  }
  bars.innerHTML=Array.from({length:16},(_,i)=>`<button type="button" class="qc-basis" data-qc-basis="${i}" aria-label="Inspect amplitude ${ket(i)}" aria-pressed="false"><span class="qc-bar-value"></span><span class="qc-bar-track"><i></i></span><span class="qc-basis-label">${i.toString(2).padStart(4,'0')}</span></button>`).join('');
  $$('[data-qc-basis]').forEach(b=>b.addEventListener('click',()=>inspect(Number(b.dataset.qcBasis))));
  $$('[data-qc-preset]').forEach(b=>b.addEventListener('click',()=>{preset=b.dataset.qcPreset;$$('[data-qc-preset]').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));load();}));
  $('#qc-phase').addEventListener('input',e=>{phase=Number(e.target.value)/16;$('[data-qc-phase-value]').textContent=fraction(Number(e.target.value),16);load();});
  slider.addEventListener('input',()=>{stop();step=Number(slider.value);render(true);});
  $('[data-qc-reset]').addEventListener('click',()=>{stop();step=0;render();$('.qc-circuit-scroll').scrollLeft=0;});
  $('[data-qc-next]').addEventListener('click',()=>{stop();step=Math.min(gates.length,step+1);render(true);});
  $('[data-qc-run]').addEventListener('click',()=>{stop();if(step===gates.length)step=0;render();$('[data-qc-run]').disabled=true;$('[data-qc-run]').textContent='Running…';root.dataset.qcRunning='true';timer=setInterval(()=>{step++;render(true);if(step===gates.length)stop();},550);});
  new MutationObserver(()=>{if(root.closest('[hidden]'))stop();}).observe(root.closest('[data-qp-panel]'),{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  load();root.dataset.qcReady='true';
 });
})();
