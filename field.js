/* v20. Original three-dimensional point studies.
 * The MoE decoder schematic combines causal multi-head attention from Vaswani
 * et al., https://arxiv.org/abs/1706.03762, and sparse FFN routing from Shazeer
 * et al., https://arxiv.org/abs/1701.06538. Selected-logit normalization follows
 * the top-K formulation in https://arxiv.org/abs/2401.04088, section 2.1. Sixteen
 * experts and top-2 / top-4 are illustrative, NOT Mixtral's configuration. The three
 * attention planes are parallel heads within ONE decoder block, not layers.
 * Router logits and attention highlights are synthetic explanatory values;
 * normalization/embedding operations, capacity limits and dropped tokens are omitted. This is neither MiniMax's
 * architecture nor a visualization of measured model or experimental results.
 */
(() => {
  'use strict';
  const TAU=Math.PI*2, PAPER='#f6f5f1';
  const palette=['#567ba6','#8c79a9','#3f648e','#a2b2c9','#779aaf','#aa8c9e'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
  const scenes=[],heroCanvases=[...document.querySelectorAll('canvas[data-research-field],#research-field,#quantum-field')];
  const topics=[...document.querySelectorAll('[data-topic-field]')];
  if(!heroCanvases.length&&!topics.length)return;
  const fract=v=>v-Math.floor(v),ease=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
  let hidden=false,raf=0,then=0,lastPaint=0;
  function make(canvas,host,mode,hero=false){
    let ctx;try{ctx=canvas.getContext('2d',{alpha:false});}catch(_){return;}if(!ctx)return;
    canvas.dataset.fieldRenderer='v20';host.dataset.fieldRenderer='v20';
    host.dataset.fieldShape=mode==='transformer'?'causal-moe-transformer':mode;host.dataset.fieldMode=mode;
    const isLanding=host.classList.contains('landing-moon');
    const descriptions={transformer:['Sparse MoE decoder','Select a token · trace attention and experts','Trace token'],training:['Training trajectories','Drag the landscape · compare trajectories','Trace paths'],vision:['Spatial token representation','Touch to perturb · drag to rotate','Send a ripple'],agents:['Agent coordination graph','Drag a node · route a task','Dispatch task'],world:['Action-conditioned futures','Drag to inspect · compare possible futures','Compare paths'],control:['Synchronized control channels','Drag to inspect · follow the event clock','Run sequence'],quantum:['Distributed quantum field','Drag to rotate · shift optical phase','Shift phase']};
    const description=descriptions[mode]||descriptions.transformer;
    let surface=host;
    let w=0,h=0,dpr=1,small=false,visible=false,t=0,px=0,py=0,tx=0,ty=0,pulse=-20,selected=4,step=-1,interactions=0,renderCount=0,tokenHoldUntil=9;
    let moeTopK=4,moeBatch=true,moeFeedbackKey='',moePhaseKey='',moeClockStart=0,moeCycle=0;
    const moeExpertCount=16;
    let g={left:0,top:0,width:1,height:1,scale:1,cx:0,cy:0},points=[],paths=[],labels=[],screenPoints=[],pickWorld=[];
    let pane=null,bar=null,status=null,pressed=false,moved=false,start=null,phaseOffset=0,dragNode=-1;
    const ripples=[],nodeOffsets=Array.from({length:7},()=>({x:0,y:0}));
    const stages=['Tokens','Q / K / V','Causal attention','Output projection','Top-k routing','MoE','Weighted combination','Residual output'];
    function routeToken(token){
      const scores=Array.from({length:moeExpertCount},(_,expert)=>({expert,score:Math.cos((token+1)*(expert+1)*.73)+.35*Math.sin(expert*.83+token)})).sort((a,b)=>b.score-a.score).slice(0,moeTopK);
      const norm=scores.reduce((sum,v)=>sum+Math.exp(v.score),0);
      return scores.map(v=>({expert:v.expert,weight:Math.exp(v.score)/norm}));
    }
    function record(type){interactions++;host.dataset.fieldInteractions=String(interactions);host.dataset.fieldInteractionType=type;}
    function activate(token,x=0,z=0){if(Number.isInteger(token))selected=clamp(token,0,mode==='agents'?6:7);pulse=t;tokenHoldUntil=t+12;moeClockStart=t;moeCycle=0;phaseOffset+=Math.PI/3;ripples.push({x,z,t});if(ripples.length>5)ripples.shift();record(mode==='transformer'?'attention-flow':'activate');host.dataset.fieldSelectedToken=String(selected+1);host.dataset.fieldPhase=String(phaseOffset);if(status){const gate=routeToken(selected);status.textContent=mode==='transformer'?`Token ${selected+1} can attend to positions 1 through ${selected+1}. The illustrative router selects ${moeTopK} of ${moeExpertCount} experts: ${gate.map(v=>v.expert+1).join(', ')}. Their normalized weights are ${gate.map(v=>Math.round(v.weight*100)+' percent').join(', ')}. Expert outputs combine separately for each token, then join that token's residual stream.`:`${description[0]} updated.`;}}
    if(hero){
      host.classList.add('field-interactive','scientific-field');if(mode==='transformer')host.classList.add('transformer-field');
      surface=document.createElement('div');surface.className='scientific-field-stage';
      const copy=isLanding?host.querySelector('.landing-content'):host.querySelector('.field-stage-copy,.field-copy,.quantum-field-copy');
      if(isLanding&&copy){const column=document.createElement('div');column.className='scientific-field-copy';while(copy.firstChild)column.append(copy.firstChild);copy.append(column,surface);copy.classList.add('scientific-field-layout');}
      else if(copy){const layout=document.createElement('div');layout.className='scientific-field-layout';copy.before(layout);layout.append(copy,surface);copy.classList.add('scientific-field-copy');}
      else host.append(surface);
      surface.append(canvas);
      if(isLanding){const coordinate=host.querySelector('.landing-coordinate');if(coordinate)surface.append(coordinate);}
      pane=document.createElement('div');pane.className='field-interaction transformer-interaction';pane.tabIndex=0;pane.setAttribute('role','group');pane.setAttribute('aria-label',`Explore ${description[0].toLowerCase()}`);
      const help=document.createElement('span');help.className='field-sr-only';help.id='transformer-help-'+scenes.length;help.textContent=mode==='transformer'?'A conceptual sparse mixture-of-experts decoder block. Three parallel attention heads share a causal mask: faint upper-triangle positions are unavailable. A router chooses two or four of sixteen feed-forward experts independently for each token, with weights normalized over that token’s selected experts. Four-token batch view shows simultaneous routes; each token retains its own weighted output and residual. Heads are not stacked layers. Select a token, switch top-K or focus the view. Drag to change perspective. Arrow keys select tokens; Enter traces; B toggles batch; K changes top-K; R resets. Normalization, capacity limits and token dropping are omitted. Synthetic explanatory routing, not MiniMax architecture.':`${description[0]}. ${description[1]}. Arrow keys select a state, Enter activates it, and R resets the view. This is a conceptual study, not measured experimental data.`;pane.setAttribute('aria-describedby',help.id);
      bar=document.createElement('div');bar.className='field-playbar transformer-playbar';bar.innerHTML=`<span class="field-play-hint">${description[1]}</span><button class="field-play-action" type="button">${description[2]}</button><button class="field-play-reset" type="button">Reset</button>`;
      if(mode==='transformer'){
        bar.classList.add('moe-playbar');bar.innerHTML=`<span class="moe-concept">Conceptual decoder · attention & MoE</span><div class="moe-controls"><label class="moe-select-wrap"><span>Token</span><select class="moe-select" aria-label="Select token">${Array.from({length:8},(_,i)=>`<option value="${i}"${i===selected?' selected':''}>${i+1} / 8</option>`).join('')}</select></label><div class="moe-segment" role="group" aria-label="Experts per token"><button type="button" data-top-k="2" aria-pressed="false">Top 2</button><button type="button" data-top-k="4" aria-pressed="true">Top 4</button></div><button class="moe-batch" type="button" aria-pressed="true" aria-label="Show four tokens together">Batch ×4</button><button class="field-play-action" type="button">Trace</button><button class="field-play-reset" type="button">Reset</button></div><div class="moe-feedback"><strong class="moe-token-feedback">Token 5</strong><span class="moe-weights"></span></div><div class="moe-flow"><span data-phase="0">Attention</span><i>→</i><span data-phase="1">Dispatch</span><i>→</i><span data-phase="2">Compute</span><i>→</i><span data-phase="3">Combine</span></div><span class="moe-hint">Select a token to follow its routes · drag to rotate</span>`;
        const actionPair=document.createElement('span');actionPair.className='moe-action-pair';actionPair.append(bar.querySelector('.field-play-action'),bar.querySelector('.field-play-reset'));bar.querySelector('.moe-controls').append(actionPair);
        bar.querySelector('.moe-select').addEventListener('change',e=>activate(Number(e.target.value)));
        bar.querySelectorAll('[data-top-k]').forEach(button=>button.addEventListener('click',()=>{moeTopK=Number(button.dataset.topK);moeFeedbackKey='';activate();record('top-k-change');}));
        bar.querySelector('.moe-batch').addEventListener('click',()=>{moeBatch=!moeBatch;moeFeedbackKey='';activate();record('batch-toggle');});
      }
      status=document.createElement('span');status.className='field-sr-only';status.setAttribute('role','status');status.setAttribute('aria-live','polite');surface.append(pane,bar,help,status);
      bar.querySelector('.field-play-action').addEventListener('click',()=>activate());
      bar.querySelector('.field-play-reset').addEventListener('click',()=>{tx=ty=0;selected=4;pulse=-20;tokenHoldUntil=t+9;moeTopK=4;moeBatch=true;moeClockStart=t;moeCycle=0;moeFeedbackKey='';phaseOffset=0;ripples.length=0;nodeOffsets.forEach(n=>{n.x=n.y=0;});record('reset');status.textContent='Perspective reset. Token 5 selected.';});
      const location=e=>{const r=surface.getBoundingClientRect();return{x:(e.clientX-r.left)*w/r.width,y:(e.clientY-r.top)*h/r.height};};
      pane.addEventListener('pointerdown',e=>{if(e.button!==0)return;pressed=true;moved=false;start={...location(e),tx,ty,id:e.pointerId};dragNode=mode==='agents'?screenPoints.findIndex(n=>Math.hypot(n.x-start.x,n.y-start.y)<25):-1;if(dragNode>=0){start.nx=nodeOffsets[dragNode].x;start.ny=nodeOffsets[dragNode].y;}try{pane.setPointerCapture(e.pointerId);}catch(_){};pane.classList.add('is-dragging');});
      pane.addEventListener('pointermove',e=>{const p=location(e);if(pressed){const dx=p.x-start.x,dy=p.y-start.y;moved=moved||Math.hypot(dx,dy)>5;if(dragNode>=0){nodeOffsets[dragNode].x=clamp(start.nx+dx/g.scale,-.4,.4);nodeOffsets[dragNode].y=clamp(start.ny+dy/g.scale,-.4,.4);}else{tx=clamp(start.tx+dx*.0028,-.32,.32);ty=clamp(start.ty+dy*.0012,-.15,.15);}}else{pane.classList.toggle('is-node-hover',screenPoints.some(n=>Math.hypot(n.x-p.x,n.y-p.y)<18));}});
      const end=(e,cancel)=>{if(!pressed)return;pressed=false;pane.classList.remove('is-dragging');if(!cancel){if(moved){record(dragNode>=0?'node-drag':'view-drag');if(dragNode>=0)host.dataset.fieldNodeOffset=String(Math.hypot(nodeOffsets[dragNode].x,nodeOffsets[dragNode].y));}else{const p=location(e);let n=selected,d=Infinity;screenPoints.forEach((q,i)=>{const dd=Math.hypot(p.x-q.x,p.y-q.y);if(dd<d){d=dd;n=i;}});activate(d<80?n:undefined,(p.x-g.cx)/g.scale,(p.y-g.cy)/g.scale);}}dragNode=-1;};
      pane.addEventListener('pointerup',e=>end(e,false));pane.addEventListener('pointercancel',e=>end(e,true));
      pane.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const count=mode==='agents'?7:8;selected=(selected+(['ArrowLeft','ArrowUp'].includes(e.key)?count-1:1))%count;activate(selected);}else if(['Enter',' '].includes(e.key)){e.preventDefault();activate();}else if(e.key.toLowerCase()==='r')bar.querySelector('.field-play-reset').click();else if(mode==='transformer'&&e.key.toLowerCase()==='b'){e.preventDefault();bar.querySelector('.moe-batch').click();}else if(mode==='transformer'&&e.key.toLowerCase()==='k'){e.preventDefault();bar.querySelector(`[data-top-k="${moeTopK===4?2:4}"]`).click();}});
    }else{
      host.setAttribute('aria-hidden','true');
      // Card art never captures a click, touch or wheel event. Hover is observed on
      // the card itself, retaining the user's ordinary link navigation semantics.
      const card=host.closest('article,.wm-teaser,.overview-industry')||host;
      card.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=card.getBoundingClientRect();tx=clamp((e.clientX-r.left)/r.width-.5,-.5,.5)*.18;ty=clamp((e.clientY-r.top)/r.height-.5,-.5,.5)*.1;},{passive:true});
      card.addEventListener('pointerleave',()=>{tx=ty=0;},{passive:true});
    }
    function measure(){
      if(hero){const layout=surface.parentElement,ls=getComputedStyle(layout),available=layout.clientWidth-(parseFloat(ls.paddingLeft)||0)-(parseFloat(ls.paddingRight)||0),stacked=isLanding||available<1100;host.dataset.fieldLayout=stacked?'stacked':'split';if(isLanding&&mode==='transformer'){host.dataset.fieldPresentation=available>=900?'panoramic':'portrait';host.style.setProperty('--moe-stage-height',`${available>=900?clamp(available*.43,570,690):clamp(available*1.45+460,850,1150)}px`);}const localWidth=host.clientWidth;host.style.setProperty('--field-title-size',`${localWidth<620?clamp(localWidth*.108,36,62):clamp(localWidth*.078,48,76)}px`);}
      const r=surface.getBoundingClientRect(),style=getComputedStyle(surface),borderX=(parseFloat(style.borderLeftWidth)||0)+(parseFloat(style.borderRightWidth)||0),borderY=(parseFloat(style.borderTopWidth)||0)+(parseFloat(style.borderBottomWidth)||0);
      // Fractional CSS sizes matter under browser / embedded-view CSS zoom;
      // integer clientHeight can undersize a tall backing surface in WebKit.
      w=Math.max(1,(parseFloat(style.width)||surface.clientWidth)-(style.boxSizing==='border-box'?borderX:0));h=Math.max(1,(parseFloat(style.height)||surface.clientHeight)-(style.boxSizing==='border-box'?borderY:0));small=hero?host.clientWidth<700:w<700;dpr=Math.min((devicePixelRatio||1)*Math.max(1,r.width/(w+borderX))*(window.visualViewport?.scale||1),hero?3:2.5);
      canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(h*dpr);ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);
      if(hero){
        bar.style.cssText=`left:14px;width:${w-28}px;bottom:7px`;
        const controls=mode==='transformer'?Math.max(160,bar.getBoundingClientRect().height/(r.width/(w+borderX))+28):(small?96:82);
        g={left:6,top:16,width:w-12,height:h-controls};
        pane.style.cssText=`left:${g.left}px;top:${g.top}px;width:${g.width}px;height:${g.height}px`;
        bar.style.cssText=`left:${g.left+8}px;width:${g.width-16}px;bottom:7px`;
      }else g={left:10,top:8,width:w-20,height:h-16};
      const spanY={transformer:2.42,training:1.75,vision:2.02,agents:1.9,world:2.8,control:1.64,quantum:1.65}[mode]||2.42;
      g.scale=Math.min(g.width/(mode==='transformer'?3.65:3.25),g.height/spanY);g.cx=g.left+g.width*.5;g.cy=g.top+g.height*(mode==='world'?.54:mode==='training'?.46:.50);
      g.baseScale=g.scale;g.baseCx=g.cx;g.baseCy=g.cy;
      host.dataset.fieldArtTop=String(Math.round(g.top));host.dataset.fieldArtLeft=String(Math.round(g.left));
      visible=r.bottom>0&&r.top<innerHeight;host.dataset.fieldReady='true';render();wake();
    }
    function project(x,y,z){
      const portrait=mode==='transformer'&&hero&&w<900;
      const yaw=(mode==='control'?-.22:portrait?-.16:-.26)+px*(portrait?.65:1),tilt=(mode==='transformer'?.31:mode==='agents'?.34:mode==='training'&&!hero?.40:.56)+py*(portrait?.55:1);
      const X=x*Math.cos(yaw)+z*Math.sin(yaw),Z=z*Math.cos(yaw)-x*Math.sin(yaw),Y=y*Math.cos(tilt)-Z*Math.sin(tilt),D=y*Math.sin(tilt)+Z*Math.cos(tilt),depth=portrait?Z:D,pers=1/(1+depth*(portrait?.08:.13));
      // A long portrait flow uses depth perspective without making its lower
      // expert stage recede solely because it appears further down the page.
      return{x:g.cx+X*g.scale*pers,y:g.cy+Y*g.scale*pers,d:depth,s:pers};
    }
    function point(x,y,z,c=0,a=.6,r=1){points.push({x,y,z,c,a,r});}
    function path(coords,c=0,a=.25,width=.65,flow=0){paths.push({coords,c,a,width,flow});}
    function text(s,x,y,z=0,c=2){if(hero)labels.push({s,x,y,z,c});}
    function slab(x,y,z,sx,sy,sz,c,group,mask=false){
      const nx=mask?15:10,ny=mask?15:12,nz=3;
      for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
        if(mask&&i>j)continue;
        const v=fract(i*.618+j*.137+k*.46),hot=step>=group&&step<group+1;
        const selectedRow=Math.floor(j*8/ny)===selected;
        point(x+(i/(nx-1)-.5)*sx,y+(j/(ny-1)-.5)*sy,z+(k/(nz-1)-.5)*sz,c,(k===0?.70:.36)+(selectedRow?.16:0)+(hot?.16:0),mask&&i===j?1.14:.84+v*.27);
      }
    }
    function trace(coords,c=0,phaseOffset=0){
      path(coords,c,.3,.75);const speed=hero?.20:.14,progress=fract((t-pulse>0&&t-pulse<6?(t-pulse)*speed:t*speed*.65)+phaseOffset),j=progress*(coords.length-1),a=coords[Math.floor(j)],b=coords[Math.min(coords.length-1,Math.floor(j)+1)];
      point(mix(a[0],b[0],fract(j)),mix(a[1],b[1],fract(j)),mix(a[2],b[2],fract(j)),c,.95,1.9);
    }
    function arc(a,b,lift=.12,depth=0){const out=[];for(let i=0;i<=32;i++){const u=i/32;out.push([mix(a[0],b[0],u),mix(a[1],b[1],u)-Math.sin(u*Math.PI)*lift,mix(a[2],b[2],u)+Math.sin(u*Math.PI)*depth]);}return out;}
    function transformer(){
      const cycle=Math.floor((t-moeClockStart)*.145);
      if(cycle!==moeCycle){moeCycle=cycle;if(t>tokenHoldUntil&&t-pulse>9)selected=(selected+1)%8;}
      const vertical=hero&&w<900,narrow=vertical&&w<650, batchClock=fract((t-moeClockStart)*.145);
      const batch=(moeBatch?[selected,(selected+2)%8,(selected+4)%8,(selected+6)%8]:[selected]).map((token,j)=>({token,j,gate:routeToken(token),clock:clamp((batchClock-j*.05)/(1-j*.05),0,.999999),color:[0,1,4,5][j]}));
      const gate=batch[0].gate,active=gate.map(v=>v.expert),clock=batch[0].clock;
      const phase=clock<.38?0:clock<.59?1:clock<.74?2:3;
      const batchActive=[...new Set(batch.flatMap(b=>b.gate.map(v=>v.expert)))];
      const selectedPackets={attention:0,dispatch:0,compute:0,combine:0,output:0};
      const audit={selectedToken:selected+1,batch:batch.map(b=>({token:b.token+1,color:b.color,experts:b.gate.map(v=>v.expert+1),weights:b.gate.map(v=>v.weight),clock:b.clock})),routes:[],particles:[],expertChains:[],frontRows:[]};
      host.__fieldRouting=audit;
      host.dataset.fieldFlowStage=['Attention','Dispatch','Compute','Combine'][phase];
      host.dataset.fieldArchitecture='sparse-moe';host.dataset.fieldDecoderBlocks='1';host.dataset.fieldAttentionHeads='3';host.dataset.fieldCoreNodes='8';
      host.dataset.fieldSelectedToken=String(selected+1);host.dataset.fieldActiveExperts=active.map(i=>i+1).join(',');host.dataset.fieldExpertWeights=gate.map(v=>v.weight.toFixed(6)).join(',');host.dataset.fieldTopK=String(moeTopK);host.dataset.fieldExpertCount=String(moeExpertCount);host.dataset.fieldComposition=vertical?'portrait-flow':hero?'panoramic':'horizontal';
      host.dataset.fieldBatchSize=String(batch.length);host.dataset.fieldBatchActiveExperts=batchActive.map(i=>i+1).join(',');host.dataset.fieldBatchRoutes=JSON.stringify(audit.batch);host.dataset.fieldRouteCount=String(batch.length*moeTopK*2);host.dataset.fieldSeparateTokenOutputs='true';host.dataset.fieldClock=clock.toFixed(4);
      host.dataset.fieldCausalPositions=Array.from({length:selected+1},(_,i)=>i+1).join(',');host.dataset.fieldMaskedCells='84';host.dataset.fieldMaskAlpha='.14';host.dataset.fieldAllowedAlpha='.52';
      if(bar){
        const key=`${selected}/${moeTopK}/${moeBatch}`;
        if(key!==moeFeedbackKey){moeFeedbackKey=key;bar.querySelector('.moe-select').value=String(selected);bar.querySelectorAll('[data-top-k]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.topK)===moeTopK)));const button=bar.querySelector('.moe-batch');button.setAttribute('aria-pressed',String(moeBatch));button.textContent=moeBatch?'Batch ×4':'Focus ×1';bar.querySelector('.moe-token-feedback').textContent=`Token ${selected+1} →`;bar.querySelector('.moe-weights').textContent=gate.map(v=>`E${v.expert+1}\u00a0${(v.weight*100).toFixed(0)}%`).join('  ·  ');}
        if(phase!==moePhaseKey){moePhaseKey=phase;bar.querySelectorAll('[data-phase]').forEach(el=>el.dataset.active=String(Number(el.dataset.phase)===phase));}
      }
      // The desktop decoder spans the full page. On a phone, its input,
      // attention and expert computation follow a purpose-built vertical path.
      const token=vertical?(narrow?[-.90,-2.95,0]:[-2.80,-2.10,0]):[-5.15,0,0],qkv=vertical?(narrow?[.85,-2.95,0]:[-1.85,-2.10,0]):[-4.20,0,0];
      const attention=vertical?(narrow?[-.04,-.80,0]:[.10,-2.10,0]):[-2.10,-.08,0],projection=vertical?(narrow?[1.25,.90,0]:[2.05,-1.80,0]):[.02,.04,0];
      const add=vertical?(narrow?[1.25,1.50,0]:[2.05,-.65,0]):[.45,.08,0],router=vertical?(narrow?[0,1.90,0]:[0,.10,0]):[1.04,.08,0];
      const attSize=vertical?(narrow?2.45:2.25):2.60,tokenHeight=vertical?(narrow?.85:1.65):1.80,qkvHeight=vertical?(narrow?.85:1.50):1.65,projectionHeight=vertical?(narrow?.65:1.20):1.55;
      const headDepth=vertical?.34:.48;
      const sideRail=vertical?(narrow?1.70:2.50):0;
      const rowAt=(center,height,index,dx=0,z=0)=>[center[0]+dx,center[1]+(index/7-.5)*height,z];
      const at=(coords,u)=>{const p=clamp(u,0,1)*(coords.length-1),i=Math.floor(p),a=coords[i],b=coords[Math.min(coords.length-1,i+1)];return[mix(a[0],b[0],fract(p)),mix(a[1],b[1],fract(p)),mix(a[2],b[2],fract(p))];};
      // Each packet is sampled from the exact polyline that draws its own wire.
      // The same per-token clock spans attention, dispatch, computation and return.
      function flow(coords,b,start,end,stage,id,expert=null,weight=.25){
        const foreground=b.j===0,c=b.color;
        path(coords,c,foreground?.72:.28,foreground?1.02+weight:.72);
        const route={id,token:b.token+1,expert,stage,color:c,start,end,coords};audit.routes.push(route);
        if(b.clock>=start&&b.clock<end){
          if(foreground)selectedPackets[stage]++;
          const u=(b.clock-start)/(end-start);
          for(let n=0;n<4;n++){const v=u-n*.025;if(v<0)continue;const p=at(coords,v);point(...p,c,(foreground?1:.76)*(1-n*.18),foreground?(n?1.25:2.65):(n?.8:1.65));if(n===0)audit.particles.push({route:id,token:b.token+1,expert,stage,color:c,position:p});}
        }
      }
      function tokenPanel(c,sx,sy,color=0){for(let row=0;row<8;row++)for(let col=0;col<5;col++)for(let depth=0;depth<2;depth++)point(c[0]+(col/4-.5)*sx,c[1]+(row/7-.5)*sy,c[2]+(depth-.5)*.06,color,row===selected?.94:batch.some(b=>b.token===row)?.56:.30,row===selected?1.15:.82);}
      tokenPanel(token,.24,tokenHeight);pickWorld=[];
      for(let row=0;row<8;row++){const p=rowAt(token,tokenHeight,row,-.20);pickWorld.push(p);point(...p,row===selected?2:0,row===selected?.98:.48,row===selected?2.7:1.3);}
      for(let component=0;component<3;component++)tokenPanel([qkv[0],qkv[1],(component-1)*headDepth],.16,qkvHeight,component%2);
      const heads=[];
      for(let head=0;head<3;head++){
        const z=(head-1)*headDepth,c=head%2,x=attention[0]+head*.045,y=attention[1]-head*.04;heads.push({x,y,z,c});
        for(let row=0;row<8;row++)for(let col=0;col<8;col++){
          const masked=col>row,chosen=!masked&&row===selected,companion=!masked&&batch.some(b=>b.j>0&&b.token===row);
          for(let sy=0;sy<3;sy++)for(let sx=0;sx<3;sx++){const dx=(col/7-.5)*attSize+(sx-1)*attSize*.022,dy=(row/7-.5)*attSize+(sy-1)*attSize*.022;point(x+dx,y+dy,z,masked?3:c,masked?.12:chosen?.88:companion?.55:.40,masked?.58:chosen?1.06:.74);}
        }
        path([[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5],[-.5,-.5]].map(v=>[x+v[0]*attSize,y+v[1]*attSize,z]),3,.22,.6);
      }
      tokenPanel(projection,.16,projectionHeight,1);
      for(const b of [...batch].reverse()){
        const input=rowAt(token,tokenHeight,b.token,.12),projected=rowAt(projection,projectionHeight,b.token),residual=[add[0],add[1]+(b.token/7-.5)*.12,b.j*.018];
        const port=[router[0]+(vertical?(b.j-1.5)*.045:0),router[1]+(vertical?0:(b.j-1.5)*.045),b.j*.018];b.residual=residual;b.port=port;
        audit.frontRows.push({token:b.token+1,input,query:rowAt(qkv,qkvHeight,b.token,0,-headDepth),projected});
        for(let component=0;component<3;component++){
          const q=rowAt(qkv,qkvHeight,b.token,0,(component-1)*headDepth);
          flow(arc(input,q,.045),b,0,.07,'attention',`T${b.token+1}:projection:${component}`);
          for(let h=0;h<3;h++){
            const head=heads[h],entry=[head.x-attSize*.5,head.y+(b.token/7-.5)*attSize,head.z];
            // Q is the animated query path. K/V remain available context for
            // all allowed positions of that row, not just the token itself.
            if(component===0)flow(arc(q,entry,.04),b,.07,.14,'attention',`T${b.token+1}:query:${h}`);
            else path(arc(q,entry,.035),b.color,b.j===0?.16:.055,.5);
          }
        }
        for(let h=0;h<3;h++){
          const head=heads[h],y=head.y+(b.token/7-.5)*attSize;
          const entry=[head.x-attSize*.5,y,head.z],lastAllowed=[head.x+(b.token/7-.5)*attSize,y,head.z];
          flow([entry,lastAllowed],b,.14,.24,'attention',`T${b.token+1}:causal-context:${h}`);
          flow(arc(lastAllowed,projected,-.10),b,.24,.31,'attention',`T${b.token+1}:head-output:${h}`);
        }
        flow(arc(projected,residual,0),b,.31,.34,'attention',`T${b.token+1}:attention-add`);
        flow(arc(residual,port,vertical?-.07:0),b,.34,.38,'attention',`T${b.token+1}:router-input`);
        point(...residual,b.color,b.j===0?.88:.36,b.j===0?1.9:1.2);
      }
      const attentionSkip=vertical?[[token[0],token[1]-tokenHeight*.53,0],[token[0],(narrow?-3.72:-3.65),0],[sideRail,(narrow?-3.72:-3.65),0],[sideRail,add[1],0],add]:[[token[0],-.95,0],[token[0],-1.80,0],[add[0],-1.80,0],add];path(attentionSkip,0,.16,.65);
      globe(router,.068,94,2,.72);ring(router,.10,.07,1,.35,.2);
      const experts=Array.from({length:moeExpertCount},(_,expert)=>{
        const row=Math.floor(expert/4),col=expert%4,x=vertical?(col-1.5)*(narrow?.78:1.10):2.02+col*.68,y=vertical?(narrow?2.55+row*.50:.80+row*.60):-1.0+row*.67,z=(row-1.5)*.055+(col%2-.5)*.05;
        const sx=vertical?(narrow?.29:.40):.34,sy=vertical?.24:.27;
        // The portrait composition also rotates the FFN's layer axis. Its entry,
        // internal computation and exit consequently remain one continuous path.
        const axis=vertical?[0,1,0]:[1,0,0],length=vertical?.25:.37;
        const node=u=>[x+axis[0]*u*length,y+axis[1]*u*length,z];
        return{expert,x,y,z,sx,sy,axis,length,node,incoming:node(-.65),outgoing:node(.65)};
      });
      const outputs=batch.map(b=>{const offset=batch.length===1?0:(b.j-1.5)*.45;return{...b,combine:vertical?[offset,narrow?4.70:3.32,0]:[5.00,offset,0],finalAdd:vertical?[offset,narrow?4.99:3.65,0]:[5.38,offset,0],output:vertical?[offset,narrow?5.23:3.95,0]:[5.70,offset,0]};});
      for(const b of [...outputs].reverse()){
        for(const v of b.gate){
          const e=experts[v.expert],depth=(Math.floor(e.expert/4)-1.5)*.07+b.j*.028;
          const routeIn=arc(b.port,e.incoming,vertical?.045:(Math.floor(e.expert/4)-1.5)*.035,depth);
          const internal=[e.incoming,e.node(-.43),e.node(0),e.node(.43),e.outgoing];
          const routeOut=arc(e.outgoing,b.combine,vertical?-.035:(e.expert%4-1.5)*.035,-depth*.6);
          const id=`T${b.token+1}:E${e.expert+1}`;
          flow(routeIn,b,.38,.59,'dispatch',id+':dispatch',e.expert+1,v.weight);
          flow(internal,b,.59,.74,'compute',id+':compute',e.expert+1,v.weight);
          flow(routeOut,b,.74,.94,'combine',id+':combine',e.expert+1,v.weight);
          audit.expertChains.push({token:b.token+1,expert:e.expert+1,dispatch:routeIn,compute:internal,combine:routeOut,output:b.combine});
        }
        ring(b.combine,b.j===0?.062:.043,b.j===0?.062:.043,b.color,b.j===0?.68:.38,Math.PI/2);
        flow(arc(b.combine,b.finalAdd,0),b,.94,.97,'output',`T${b.token+1}:combine-output`);
        flow([b.finalAdd,b.output],b,.97,1,'output',`T${b.token+1}:output`);
        point(...b.finalAdd,b.color,b.j===0?.92:.55,b.j===0?1.7:1.2);globe(b.output,b.j===0?.034:.025,b.j===0?28:16,b.color,b.j===0?.88:.55);
        const skip=vertical?[b.residual,[sideRail+b.j*.025,add[1],b.j*.02],[sideRail+b.j*.025,b.finalAdd[1],b.j*.02],b.finalAdd]:[b.residual,[add[0],1.92+b.j*.025,b.j*.02],[b.finalAdd[0],1.92+b.j*.025,b.j*.02],b.finalAdd];path(skip,b.color,b.j===0?.17:.055,b.j===0?.7:.45);
        if(hero)text(`T${b.token+1}`,b.output[0]+(vertical?0:.21),b.output[1]+(vertical?.22:.055),0,b.color);
      }
      for(const e of experts){
        const chosen=active.includes(e.expert),companion=batch.some(b=>b.j>0&&b.gate.some(v=>v.expert===e.expert));
        const computing=batch.some(b=>b.gate.some(v=>v.expert===e.expert)&&b.clock>=.59&&b.clock<.74),color=chosen?0:companion?4:3;
        for(let layer=0;layer<3;layer++)for(let j=0;j<9;j++)for(let k=0;k<3;k++){
          const center=e.node((layer-1)*.43),span=(vertical?e.sx:e.sy)*(layer===1?1:.55),cross=(j/8-.5)*span;
          point(center[0]+(vertical?cross:0),center[1]+(vertical?0:cross),center[2]+(k-1)*.045,color,(chosen?.62:companion?.34:.13)+(computing?.14:0),chosen?1.00:companion?.78:.62);
        }
        if(hero&&(w>=180||chosen))text(`E${e.expert+1}`,e.x,e.y+(vertical?.24:.25),e.z,chosen?0:3);
      }
      if(hero){
        if(vertical){
          text('Tokens',token[0],narrow?-3.55:-.92);text(w<180?'QKV':'Q / K / V',qkv[0],narrow?-3.55:-.92);
          text(w<180?'Attention':'Causal attention',attention[0],narrow?-2.36:-3.63);
          if(w>=180)text(w<350?'3 heads':'3 parallel heads',attention[0]-.15,narrow?.66:-.61,0,1);
          text(w<180?'Proj.':'Projection',projection[0],narrow?1.38:-.90);
          text(w<180?'Router':`Router · top ${moeTopK}`,0,narrow?1.65:-.18);
          text('MoE',0,narrow?2.25:.48,0,1);text(w<300?'Weighted sum':'Weighted combination',0,narrow?4.49:3.10);
          if(w>=180)text('Residual',sideRail,narrow?1.20:.18,0,3);
        }else{
          text('Tokens',-5.15,1.23);text('Q / K / V',-4.20,1.23);
          text('Causal attention',-2.10,-1.78);text('3 parallel heads',-2.10,1.58,0,1);
          text('Projection',.02,1.23);text(`Router · top ${moeTopK}`,1.05,-.42);
          text('MoE',3.05,-1.48,0,1);text('Weighted combination',5.02,-1.05);
          text('Residual stream',1.0,2.21,0,3);
        }
      }
      host.dataset.fieldFlowPackets=JSON.stringify(selectedPackets);host.dataset.fieldLabels=labels.map(l=>l.s).join(' | ');host.dataset.fieldPoints=String(points.length);
    }

    function globe(c,r,count,color=0,alpha=.6){
      for(let i=0;i<count;i++){const y=1-2*(i+.5)/count,a=i*2.399963,rr=Math.sqrt(1-y*y);point(c[0]+Math.cos(a)*rr*r,c[1]+y*r,c[2]+Math.sin(a)*rr*r,color,alpha*(.8+.2*rr),.88);}
    }
    function ring(c,rx,rz,color=0,alpha=.34,tilt=0){const line=[];for(let i=0;i<=100;i++){const a=i*TAU/100,x=Math.cos(a)*rx,z=Math.sin(a)*rz;line.push([c[0]+x,c[1]+z*Math.sin(tilt),c[2]+z*Math.cos(tilt)]);if(i%2===0)point(...line[i],color,alpha,.7);}path(line,color,alpha*.65,.65);}
    function training(){
      // A nonconvex objective, its contour field and alternative optimization
      // trajectories. Generic geometric study, not a measured training curve.
      const n=hero?60:48,m=hero?34:24;
      const loss=(x,z)=>.27*Math.sin(x*2.5+z)+.21*Math.cos(z*2.7)-.43*Math.exp(-((x-.42)**2+(z+.08)**2)*3)+.15*x*x;
      for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){const x=(i/n-.5)*3.10,z=(j/m-.5)*2.10,y=loss(x,z);point(x,y,z,j%5?0:1,.32+(j/m)*.27,.84);}
      for(let j=0;j<8;j++){const z=(j/7-.5)*2.1,coords=[];for(let i=0;i<70;i++){const x=(i/69-.5)*3.1;coords.push([x,loss(x,z),z]);}path(coords,j%2,.17,.65);}
      // A sparse reference plane clarifies depth without turning compact cards
      // into a dense, low-contrast cloud or shrinking the primary surface.
      if(hero||h>210)for(let j=0;j<8;j++)for(let i=0;i<21;i++)point((i/20-.5)*3.1,.78,(j/7-.5)*1.75,3,.15,.56);
      for(let k=0;k<3;k++){const coords=[];for(let i=0;i<=100;i++){const u=i/100,x=-1.48+u*1.95,z=(k-1)*.74*(1-u)+.16*Math.sin(u*9+k)*(1-u);coords.push([x,loss(x,z)-.025,z]);}trace(coords,k%2,k*.23+phaseOffset*.1);globe(coords[0],.045,32,k%2,.75);}
      const minimum=[.47,loss(.47,0),0];globe(minimum,.055,56,2,.88);ring([.47,loss(.47,0)-.008,0],.16,.12,1,.5);
      for(let n=1;n<=3;n++){const contour=[];for(let i=0;i<=84;i++){const a=i*TAU/84,x=.47+Math.cos(a)*(.14+n*.095),z=Math.sin(a)*(.09+n*.065);contour.push([x,loss(x,z)-.011,z]);}path(contour,n%2,n===1?.31:.16,.65);}
      text('OPTIMIZATION LANDSCAPE',-.10,-.93,0,0);text('TRAJECTORY COMPARISON',.10,1.12,0,1);
    }
    function vision(){
      // Image patches retain spatial position before being fused into a shared
      // representation. The lifted manifold stands for learned latent features.
      const ripple=(x,z)=>ripples.reduce((sum,r)=>{const age=t-r.t,d=Math.hypot(x-r.x,z-r.z);return age>0&&age<4?sum+.17*Math.sin(d*8-age*6)*Math.exp(-((d-age*.50)**2)*7-age*.6):sum;},0);
      for(let patch=0;patch<16;patch++){
        const row=Math.floor(patch/4),col=patch%4,cx=-1.08+col*.255,cz=(row-1.5)*.265;
        for(let j=0;j<5;j++)for(let i=0;i<5;i++){const x=cx+(i/4-.5)*.205,z=cz+(j/4-.5)*.205,y=.32+.06*Math.sin(col+row*.7)+ripple(x,z);point(x,y,z,patch%5?0:1,.65,.9);}
      }
      const center=[.08,-.20,0];globe(center,.16,240,1,.60);
      for(let j=0;j<4;j++)trace(arc([-1.08+j*.255,.30,(j-1.5)*.265],center,.30,(j%2?1:-1)*.17),j%2,j*.16);
      // Two depth layers make the representation surface visibly volumetric.
      for(let layer=0;layer<2;layer++)for(let j=0;j<25;j++)for(let i=0;i<24;i++){
        const u=i/23,v=j/24,x=.62+u*.78,z=(v-.5)*1.25,y=-.22+.26*Math.sin(u*3.1+v*2.4)+layer*.11+ripple(x,z);
        point(x,y,z,layer?1:0,layer?.34:.62,.85);
      }
      for(let j=0;j<5;j++)trace(arc(center,[.65,-.14,(j/4-.5)*1.25],.1),j%2,j*.12+.3);
      ring(center,.22,.22,1,.34,.35);
      text('SPATIAL PATCH TOKENS',-.75,.97,0,0);text('SHARED REPRESENTATION',1.02,.95,0,1);
    }
    function agents(){
      // An orchestrator, six specialized agents, local workers, and a shared
      // context plane: a hierarchy with explicit paths, not an all-to-all graph.
      const hubs=[[0,-.08,0]];for(let j=0;j<6;j++){const a=j*TAU/6;hubs.push([1.05*Math.cos(a),.67*Math.sin(a),.38*Math.sin(a*2)]);}
      hubs.forEach((c,j)=>{c[0]+=nodeOffsets[j].x;c[1]+=nodeOffsets[j].y;});pickWorld=hubs;
      const active=1+Math.floor(t*.36+phaseOffset)%6;
      hubs.forEach((c,j)=>{globe(c,j?.135:.24,j?116:270,j%2,j?.64:.78);if(j){trace(arc(hubs[0],c,.10,(j%2?1:-1)*.22),j%2,j*.13+phaseOffset*.06);if(j===active)ring(c,.19,.16,2,.52,.25);for(let k=0;k<3;k++){const a=(j-1)*TAU/6+(k-1)*.25,q=[c[0]+Math.cos(a)*.29,c[1]+Math.sin(a)*.22,c[2]+.09*(k-1)];globe(q,.035,25,j%2,.52);path([c,q],j%2,.22,.6);}}});
      for(let j=1;j<hubs.length;j++)path(arc(hubs[j],hubs[j===6?1:j+1],.08,.1),0,.14,.6);
      ring([0,.03,.23],.65,.43,1,.22,.5);
      for(let j=0;j<8;j++)for(let i=0;i<20;i++)point((i/19-.5)*1.45,.95,(j/7-.5)*.48,3,.28,.7);
      for(let j=0;j<3;j++)trace(arc([0,.95,0],hubs[1+j*2],.1),1,j*.22);
      text('COORDINATED EXECUTION',0,-1.11,0,0);text('SHARED CONTEXT',0,1.20,0,1);
    }
    function world(){
      // A common latent history branches under different candidate actions;
      // uncertainty expands with prediction horizon. No deterministic forecast.
      const branchCount=5,chosen=Math.floor(t*.22+phaseOffset)%branchCount;
      for(let frame=0;frame<3;frame++){
        const x=-1.5+frame*.18;for(let j=0;j<13;j++)for(let k=0;k<7;k++)point(x,(j/12-.5)*.52,(k/6-.5)*.44,frame%2,.35+frame*.13,.78);
      }
      for(let branch=0;branch<branchCount;branch++){
        const angle=(branch-2)*.36,coords=[],active=branch===chosen,color=active?2:branch%2;
        for(let i=0;i<=85;i++){const u=i/85,x=-1.04+u*2.50,y=Math.sin(angle)*u*u*1.34+.035*Math.sin(u*5+t*.18+branch)*u,z=(branch-2)*.22*u+Math.sin(u*Math.PI)*.20*Math.cos(branch);coords.push([x,y,z]);for(let n=0;n<4;n++){const a=n*TAU/4+u*5+t*.10;point(x,y+Math.sin(a)*(.02+.065*u),z+Math.cos(a)*(.02+.065*u),color,(active?.40:.22)+.23*u,active?.88:.74);}}
        trace(coords,color,branch*.11);globe(coords[85],active?.065:.045,active?72:40,color,active?.85:.56);
      }
      for(const x of [-.40,.30,1.0]){const u=(x+1.04)/2.5;ring([x,0,0],.025,.30+u*.55,3,.22,Math.PI/2);}
      text('LATENT HISTORY',-1.23,.91,0,0);text('ACTION-CONDITIONED FUTURES',.60,-1.15,0,1);
    }
    function control(){
      // Stacked RF / digital channels share an event timeline; pulses terminate
      // at a multi-channel output lattice, representing an executable sequence.
      const event=fract(t*.105+phaseOffset*.08);
      const wave=(u,lane)=>lane%2===0?Math.sin(u*6*TAU)*Math.exp(-(((u-.54)*3.8)**2))*.10:((u>.2&&u<.34)||(u>.57&&u<.78)?-.12:.025);
      for(let lane=0;lane<6;lane++){
        const y=(lane-2.5)*.245,z=(lane-2.5)*.10,coords=[];
        for(let i=0;i<=150;i++){const u=i/150,x=-1.43+u*2.48,v=wave(u,lane);coords.push([x,y+v,z]);point(x,y+v,z,lane%2,.65,.9);}
        path(coords,lane%2,.26,.6);point(-1.43+event*2.48,y+wave(event,lane),z,lane%2,.98,1.8);
        path([[-1.43,y,z],[1.05,y,z]],3,.16,.55);
      }
      for(let layer=0;layer<3;layer++)for(let j=0;j<10;j++)for(let i=0;i<4;i++)point(1.28+(i/3-.5)*.17,(j/9-.5)*1.43,layer*.13,layer%2,.48,.9);
      for(const x of [-.9,-.05,.64]){const coords=[];for(let j=0;j<22;j++)coords.push([x,(j/21-.5)*1.60,(j/21-.5)*.60]);path(coords,2,.25,.7);}
      path([[-1.43+event*2.48,-.86,-.34],[-1.43+event*2.48,.86,.34]],2,.40,.95);
      for(let j=0;j<6;j++)trace([[1.05,(j-2.5)*.245,(j-2.5)*.10],[1.28,(j-2.5)*.245,0]],j%2,j*.11);
      text('SYNCHRONIZED CONTROL',-.25,-1.08,0,0);text('EXECUTABLE WAVEFORMS',-.30,1.11,0,1);
    }
    function quantum(){
      // Remote trapped matter nodes, optical modes and a heralding station.
      // The bowls are schematic confinement potentials, never Bloch spheres.
      for(const side of [-1,1]){
        const cx=side*1.08,c=side<0?0:1;
        for(let row=0;row<24;row++)for(let col=0;col<24;col++){const x=(col/23-.5)*.90,z=(row/23-.5)*.80,y=.56-(x*x+z*z)*1.60;point(cx+x,y,z,c,.38+.23*(1-Math.abs(x)),.88);}
        for(let k=0;k<5;k++){const coords=[],z=(k/4-.5)*.8;for(let j=0;j<50;j++){const x=(j/49-.5)*.9;coords.push([cx+x,.56-(x*x+z*z)*1.6,z]);}path(coords,c,.18,.6);}
        for(const off of[-.13,0,.13])globe([cx+off,.08,0],off?.047:.068,off?72:120,c,.80);
        path([[cx-.23,.08,0],[cx+.23,.08,0]],c,.28,.7);
        for(let n=0;n<80;n++){const u=n/79;point(cx,.08+u*.47,0,c,.34,.68);}
      }
      for(let k=0;k<2;k++){const coords=[];for(let i=0;i<=160;i++){const u=i/160,a=u*TAU*1.6+t*.40+k*Math.PI+phaseOffset;coords.push([-1.08+u*2.16,.17*Math.sin(a)*Math.sin(u*Math.PI),.17*Math.cos(a)*Math.sin(u*Math.PI)]);if(i%2===0)point(...coords[i],k,.58,.84);}trace(coords,k,k*.5);}
      const herald=[0,-.62,0],arrival=fract(t*.20+phaseOffset*.08);
      globe(herald,.09,140,2,.69);
      for(const side of[-1,1]){const route=arc([side*1.08,0,0],herald,.18,side*.28);path(route,side<0?0:1,.29,.75);const q=arrival*(route.length-1),a=route[Math.floor(q)],b=route[Math.min(route.length-1,Math.floor(q)+1)];globe([mix(a[0],b[0],fract(q)),mix(a[1],b[1],fract(q)),mix(a[2],b[2],fract(q))],.024,14,side<0?0:1,.94);}
      if(arrival>.82)ring(herald,.11+(arrival-.82)*.55,.10+(arrival-.82)*.48,2,(1-arrival)*3,.50);
      text('ALICE',-1.08,1.03,0,0);text('BOB',1.08,1.03,0,1);text('HERALDED OPTICAL LINK',0,-1.00,0,1);
    }
    const draw={transformer,training,vision,agents,world,control,quantum};
    function render(){
      if(w<2||h<2)return;g.scale=g.baseScale;g.cx=g.baseCx;g.cy=g.baseCy;points=[];paths=[];labels=[];pickWorld=[];ctx.fillStyle=PAPER;ctx.fillRect(0,0,w,h);
      const glow=ctx.createRadialGradient(g.cx,g.cy,0,g.cx,g.cy,g.width*.6);glow.addColorStop(0,'rgba(219,226,238,.52)');glow.addColorStop(.55,'rgba(230,225,238,.17)');glow.addColorStop(1,'rgba(246,245,241,0)');ctx.fillStyle=glow;ctx.fillRect(g.left,g.top,g.width,g.height);
      (draw[mode]||draw.transformer)();
      if(points.length){
        // Fit the projected object, not just a theoretical bounding sphere.
        // Wide and narrow cards keep the complete surface and trajectory tips.
        for(let fitting=0;fitting<(mode==='transformer'&&hero?3:1);fitting++){
        let loX=Infinity,loY=Infinity,hiX=-Infinity,hiY=-Infinity;
        for(const v of points){const q=project(v.x,v.y,v.z);loX=Math.min(loX,q.x);hiX=Math.max(hiX,q.x);loY=Math.min(loY,q.y);hiY=Math.max(hiY,q.y);}
        for(const p of paths)for(const v of p.coords){const q=project(...v);loX=Math.min(loX,q.x);hiX=Math.max(hiX,q.x);loY=Math.min(loY,q.y);hiY=Math.max(hiY,q.y);}
        for(const v of labels){const q=project(v.x,v.y,v.z);ctx.font=`500 ${mode==='transformer'?(w<180?9:small?10:11):(small?9:10)}px "Space Grotesk",sans-serif`;const half=mode==='transformer'?ctx.measureText(v.s).width*.5+4:v.s.length*(small?2.7:3.0);loX=Math.min(loX,q.x-half);hiX=Math.max(hiX,q.x+half);loY=Math.min(loY,q.y-12);hiY=Math.max(hiY,q.y+5);}
        const inset=hero?18:8;
        const factor=Math.min(2.1,(g.width-inset)/Math.max(1,hiX-loX),(g.height-inset)/Math.max(1,hiY-loY));
        const priorCx=g.cx,priorCy=g.cy;g.scale*=factor;g.cx=g.left+g.width*.5-((loX+hiX)*.5-priorCx)*factor;g.cy=g.top+g.height*.5-((loY+hiY)*.5-priorCy)*factor;
        host.dataset.fieldArtWidth=String(Math.round((hiX-loX)*factor));host.dataset.fieldArtHeight=String(Math.round((hiY-loY)*factor));
        }
      }
      screenPoints=pickWorld.map(v=>project(...v));
      ctx.save();ctx.beginPath();ctx.rect(g.left,g.top,g.width,g.height);ctx.clip();
      for(const p of paths){ctx.beginPath();p.coords.forEach((v,i)=>{const q=project(...v);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.strokeStyle=palette[p.c];ctx.globalAlpha=p.a;ctx.lineWidth=p.width;ctx.stroke();}
      // Depth-bucketed paths preserve the near/far hierarchy while replacing
      // thousands of individual fills with a small set of shared paint calls.
      // Geometry and particle count stay intact on slower mobile renderers.
      const batches=new Map();
      for(const v of points){const p=project(v.x,v.y,v.z),depth=Math.round(p.d*4),a=Math.round(clamp(v.a*(1-p.d*.13),.1,1)*12)/12,r=Math.max(.5,Math.round(v.r*(hero?(small?.95:1.1):h<180?.82:.97)*p.s*4)/4),key=`${depth}/${v.c}/${a}/${r}`;let b=batches.get(key);if(!b){b={depth,c:v.c,a,r,xy:[]};batches.set(key,b);}b.xy.push(p.x,p.y);}
      for(const b of [...batches.values()].sort((a,b)=>b.depth-a.depth)){ctx.globalAlpha=b.a;ctx.fillStyle=palette[b.c];ctx.beginPath();for(let i=0;i<b.xy.length;i+=2){ctx.moveTo(b.xy[i]+b.r,b.xy[i+1]);ctx.arc(b.xy[i],b.xy[i+1],b.r,0,TAU);}ctx.fill();}
      ctx.globalAlpha=1;
      ctx.font=`500 ${mode==='transformer'?(w<180?9:small?10:11):(small?9:10)}px "Space Grotesk",sans-serif`;
      const placed=[];
      const displayLabels=labels.map(l=>({...l,anchor:project(l.x,l.y,l.z)}));
      // A label belongs to its 3D object, but its text occupies screen space.
      // Reserve expert/token captions first; keep other captions close to their
      // anchors while avoiding collisions at narrow widths and oblique views.
      if(mode==='transformer')displayLabels.sort((a,b)=>Number(!/^[ET]\d+$/.test(a.s))-Number(!/^[ET]\d+$/.test(b.s))||a.anchor.y-b.anchor.y);
      let adjusted=0;
      for(const l of displayLabels){
        const a=l.anchor;
        if(mode!=='transformer'){ctx.textAlign='center';ctx.fillStyle=palette[l.c];ctx.fillText(l.s,a.x,a.y);continue;}
        const m=ctx.measureText(l.s),half=m.width*.5,ascent=m.actualBoundingBoxAscent||9,descent=m.actualBoundingBoxDescent||2;
        const safeX=clamp(a.x,g.left+half+3,g.left+g.width-half-3),safeY=clamp(a.y,g.top+ascent+3,g.top+g.height-descent-3);
        let best={x:safeX,y:safeY,score:Infinity};
        const offsets=mode==='transformer'?[0,14,-14,28,-28,42,-42,56,-56]:[0];
        for(const dy of offsets)for(const dx of (mode==='transformer'?[0,8,-8,16,-16]:[0])){
          const x=clamp(safeX+dx,g.left+half+3,g.left+g.width-half-3),y=clamp(safeY+dy,g.top+ascent+3,g.top+g.height-descent-3);
          const box={left:x-half-3,right:x+half+3,top:y-ascent-3,bottom:y+descent+3};
          const overlap=placed.reduce((sum,b)=>sum+Math.max(0,Math.min(box.right,b.right)-Math.max(box.left,b.left))*Math.max(0,Math.min(box.bottom,b.bottom)-Math.max(box.top,b.top)),0);
          const score=overlap*1000+Math.abs(x-a.x)*1.5+Math.abs(y-a.y);
          if(score<best.score)best={x,y,score,box};
        }
        placed.push(best.box);
        if(mode==='transformer'&&Math.hypot(best.x-a.x,best.y-a.y)>9){
          adjusted++;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(best.x,best.y-ascent*.45);ctx.strokeStyle=palette[l.c];ctx.globalAlpha=.22;ctx.lineWidth=.55;ctx.stroke();ctx.globalAlpha=1;
        }
        ctx.textAlign='center';if(mode==='transformer'){ctx.lineWidth=3.5;ctx.lineJoin='round';ctx.strokeStyle='rgba(246,245,241,.86)';ctx.strokeText(l.s,best.x,best.y);}ctx.fillStyle=palette[l.c];ctx.fillText(l.s,best.x,best.y);
      }
      if(mode==='transformer')host.dataset.fieldAdjustedLabels=String(adjusted);
      ctx.restore();host.dataset.fieldPoints=String(points.length);host.dataset.fieldFrame=String(Math.round(t*30));host.dataset.fieldRenders=String(++renderCount);
    }
    const scene={tick(delta){t+=delta;const e=1-Math.exp(-delta*4);px+=(tx-px)*e;py+=(ty-py)*e;render();},get visible(){return visible;},setVisible(v){visible=v;host.dataset.fieldRunning=String(v&&!hidden&&!document.hidden);wake();},measure};scenes.push(scene);
    // Measuring also updates responsive title/layout styles. Defer those writes
    // until the next frame so they cannot re-enter ResizeObserver delivery.
    let measureFrame=0;
    const queueMeasure=()=>{if(!measureFrame)measureFrame=requestAnimationFrame(()=>{measureFrame=0;measure();});};
    if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(queueMeasure);observer.observe(surface);if(mode==='transformer'&&bar)observer.observe(bar);}
    if(typeof IntersectionObserver==='function')new IntersectionObserver(es=>scene.setVisible(es[0].isIntersecting),{rootMargin:'30px',threshold:0}).observe(surface);
    measure();
  }
  function tick(now){raf=0;if(hidden||document.hidden)return;const interval=1000/28,elapsed=now-then;if(elapsed>=interval){const delta=Math.min(.08,(now-lastPaint)/1000);then=now-elapsed%interval;lastPaint=now;for(const s of scenes)if(s.visible)s.tick(delta);}if(scenes.some(s=>s.visible))raf=requestAnimationFrame(tick);}
  function wake(){if(!raf&&!hidden&&!document.hidden&&scenes.some(s=>s.visible)){then=lastPaint=performance.now();raf=requestAnimationFrame(tick);}}
  heroCanvases.forEach(c=>{const host=c.closest('.research-field')||c.parentElement;const requested=c.dataset.fieldMode||host.dataset.fieldMode||'ai';make(c,host,requested==='ai'?'transformer':requested,true);});
  topics.forEach(host=>{let c=host.matches('canvas')?host:host.querySelector('canvas');if(!c){c=document.createElement('canvas');host.append(c);}make(c,host,host.dataset.topicField);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}scenes.forEach(s=>s.setVisible(s.visible));wake();});
  window.addEventListener('pagehide',()=>{hidden=true;if(raf)cancelAnimationFrame(raf);raf=0;});window.addEventListener('pageshow',()=>{hidden=false;wake();});
  let resizeTimer=0;const resize=()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>scenes.forEach(s=>s.measure()),80);};window.addEventListener('resize',resize,{passive:true});window.visualViewport?.addEventListener('resize',resize,{passive:true});
})();


