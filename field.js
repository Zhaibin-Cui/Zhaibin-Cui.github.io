/* v13. Original three-dimensional point studies. Transformer geometry follows the
 * token / QKV / causal multi-head attention / projection / residual / FFN structure
 * of Vaswani et al., https://arxiv.org/abs/1706.03762. This is a conceptual decoder
 * block, not a claim about a particular model, measured attention, or experiment.
 */
(() => {
  'use strict';
  const TAU=Math.PI*2, PAPER='#f6f5f1';
  const palette=['#567ba6','#8c79a9','#3f648e','#a2b2c9','#779aaf'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
  const scenes=[],heroCanvases=[...document.querySelectorAll('canvas[data-research-field],#research-field')].filter(c=>{
    const mode=c.dataset.fieldMode||c.parentElement.dataset.fieldMode||'ai';
    return mode==='transformer'||(mode==='ai'&&!!c.closest('.landing-moon'));
  });
  const topics=[...document.querySelectorAll('[data-topic-field]')];
  if(!heroCanvases.length&&!topics.length)return;
  const fract=v=>v-Math.floor(v),ease=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
  let hidden=false,raf=0,then=0,lastPaint=0;
  function make(canvas,host,mode,hero=false){
    let ctx;try{ctx=canvas.getContext('2d',{alpha:false});}catch(_){return;}if(!ctx)return;
    canvas.dataset.fieldRenderer='v13';host.dataset.fieldRenderer='v13';
    host.dataset.fieldShape=hero?'causal-transformer':mode;host.dataset.fieldMode=hero?'transformer':mode;
    let w=0,h=0,dpr=1,small=false,visible=false,t=0,px=0,py=0,tx=0,ty=0,pulse=-20,selected=4,step=-1,interactions=0;
    let g={left:0,top:0,width:1,height:1,scale:1,cx:0,cy:0},points=[],paths=[],labels=[],screenPoints=[];
    let pane=null,bar=null,status=null,pressed=false,moved=false,start=null;
    const triplets=[[-.72,.31,-.32],[-.72,.31,0],[-.72,.31,.32]];
    const stages=['Tokens','Q / K / V','Causal attention','Projection','Residual + FFN'];
    function record(type){interactions++;host.dataset.fieldInteractions=String(interactions);host.dataset.fieldInteractionType=type;}
    function activate(token){if(Number.isInteger(token))selected=clamp(token,0,7);pulse=t;record('attention-flow');host.dataset.fieldSelectedToken=String(selected+1);if(status)status.textContent=`Following token ${selected+1} through Q, K and V, causal attention, output projection, and residual feed-forward paths.`;}
    if(hero){
      host.classList.add('field-interactive','transformer-field');
      pane=document.createElement('div');pane.className='field-interaction transformer-interaction';pane.tabIndex=0;pane.setAttribute('role','group');pane.setAttribute('aria-label','Explore a Transformer block');
      const help=document.createElement('span');help.className='field-sr-only';help.id='transformer-help-'+scenes.length;help.textContent='A conceptual decoder Transformer. Select a token to follow its causal attention through three heads, then projection, residual addition and the feed-forward layer. Drag horizontally to change perspective. Arrow keys select a token; Enter runs its path; R resets the view.';pane.setAttribute('aria-describedby',help.id);
      bar=document.createElement('div');bar.className='field-playbar transformer-playbar';bar.innerHTML='<span class="field-play-hint">Select a token · follow its attention</span><button class="field-play-action" type="button">Trace token</button><button class="field-play-reset" type="button">Reset</button>';
      status=document.createElement('span');status.className='field-sr-only';status.setAttribute('role','status');status.setAttribute('aria-live','polite');host.append(pane,bar,help,status);
      bar.querySelector('.field-play-action').addEventListener('click',()=>activate());
      bar.querySelector('.field-play-reset').addEventListener('click',()=>{tx=ty=0;selected=4;pulse=-20;record('reset');status.textContent='Perspective and token selection reset.';});
      const location=e=>{const r=host.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
      pane.addEventListener('pointerdown',e=>{if(e.button!==0)return;pressed=true;moved=false;start={...location(e),tx,ty,id:e.pointerId};try{pane.setPointerCapture(e.pointerId);}catch(_){};pane.classList.add('is-dragging');});
      pane.addEventListener('pointermove',e=>{const p=location(e);if(pressed){const dx=p.x-start.x,dy=p.y-start.y;moved=moved||Math.hypot(dx,dy)>5;tx=clamp(start.tx+dx*.0028,-.24,.24);ty=clamp(start.ty+dy*.0012,-.12,.12);}else{pane.classList.toggle('is-node-hover',screenPoints.some(n=>Math.hypot(n.x-p.x,n.y-p.y)<18));}});
      const end=(e,cancel)=>{if(!pressed)return;pressed=false;pane.classList.remove('is-dragging');if(!cancel){if(moved)record('view-drag');else{const p=location(e);let n=selected,d=Infinity;screenPoints.forEach((q,i)=>{const dd=Math.hypot(p.x-q.x,p.y-q.y);if(dd<d){d=dd;n=i;}});activate(d<80?n:undefined);}}};
      pane.addEventListener('pointerup',e=>end(e,false));pane.addEventListener('pointercancel',e=>end(e,true));
      pane.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();selected=(selected+(['ArrowLeft','ArrowUp'].includes(e.key)?7:1))%8;activate(selected);}else if(['Enter',' '].includes(e.key)){e.preventDefault();activate();}else if(e.key.toLowerCase()==='r'){tx=ty=0;record('reset');}});
    }else{
      host.setAttribute('aria-hidden','true');
      // Card art never captures a click, touch or wheel event. Hover is observed on
      // the card itself, retaining the user's ordinary link navigation semantics.
      const card=host.closest('article,.wm-teaser,.overview-industry')||host;
      card.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=card.getBoundingClientRect();tx=clamp((e.clientX-r.left)/r.width-.5,-.5,.5)*.18;ty=clamp((e.clientY-r.top)/r.height-.5,-.5,.5)*.1;},{passive:true});
      card.addEventListener('pointerleave',()=>{tx=ty=0;},{passive:true});
    }
    function measure(){
      const r=host.getBoundingClientRect();w=Math.max(1,Math.round(r.width));h=Math.max(1,Math.round(r.height));small=w<700;dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      if(hero){
        const mobile=innerWidth<=1000,foot=mobile?70:83;
        if(mobile){const artHeight=small?318:390;g={left:small?8:32,top:h-foot-78-artHeight,width:w-(small?16:64),height:artHeight};}
        else g={left:w*.505,top:98,width:w*.475-16,height:h-98-foot-80};
        pane.style.cssText=`left:${g.left}px;top:${g.top}px;width:${g.width}px;height:${g.height}px`;
        bar.style.cssText=`left:${g.left+8}px;width:${g.width-16}px;bottom:${foot+7}px`;
      }else g={left:12,top:10,width:w-24,height:h-20};
      const spanY={transformer:2.42,training:1.75,vision:2.02,agents:1.9,world:2.8,control:1.64,quantum:1.65}[mode]||2.42;
      g.scale=Math.min(g.width/(mode==='transformer'?3.65:3.25),g.height/spanY);g.cx=g.left+g.width*.5;g.cy=g.top+g.height*(mode==='world'?.54:mode==='training'?.46:.50);
      g.baseScale=g.scale;g.baseCx=g.cx;g.baseCy=g.cy;
      host.dataset.fieldArtTop=String(Math.round(g.top));host.dataset.fieldArtLeft=String(Math.round(g.left));
      visible=r.bottom>0&&r.top<innerHeight;host.dataset.fieldReady='true';render();wake();
    }
    function project(x,y,z){
      const yaw=(mode==='transformer'?-.13:-.24)+px,tilt=(mode==='transformer'?.25:.56)+py;
      const X=x*Math.cos(yaw)+z*Math.sin(yaw),Z=z*Math.cos(yaw)-x*Math.sin(yaw),Y=y*Math.cos(tilt)-Z*Math.sin(tilt),D=y*Math.sin(tilt)+Z*Math.cos(tilt),pers=1/(1+D*.13);
      return{x:g.cx+X*g.scale*pers,y:g.cy+Y*g.scale*pers,d:D,s:pers};
    }
    function point(x,y,z,c=0,a=.6,r=1){points.push({x,y,z,c,a,r});}
    function path(coords,c=0,a=.25,width=.65,flow=0){paths.push({coords,c,a,width,flow});}
    function text(s,x,y,z=0,c=2){if(hero)labels.push({s,x,y,z,c});}
    function slab(x,y,z,sx,sy,sz,c,group,mask=false){
      const nx=mask?11:8,ny=mask?11:8,nz=3;
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
      if(!hero){
        // Compact cards show the characteristic attention planes rather than
        // squeezing every full-block label and component into a thumbnail.
        for(let head=0;head<3;head++){
          const z=(head-1)*.46,x=(head-1)*.10,y=-.03-head*.025;
          slab(x,y,z,1.18,1.18,.08,head%2,2,true);
          trace(arc([-1.23,.26,0],[x-.6,y+.3,z],.2),head%2,head*.16);
          trace(arc([x+.60,y+.52,z],[1.21,.28,0],-.14),head%2,head*.16+.4);
        }
        for(let j=0;j<8;j++)for(let i=0;i<3;i++){point(-1.25+i*.055,(j/7-.5)*.91+.25,0,0,.59,.82);point(1.2+i*.055,(j/7-.5)*.91+.25,0,1,.59,.82);}
        return;
      }
      if(t-pulse>9)selected=Math.floor(t*.24)%8;
      step=(t-pulse)*.8;host.dataset.fieldFlowStage=step>=0&&step<5?stages[Math.floor(step)]:'overview';
      slab(-1.38,.22,0,.33,1.13,.12,0,0);screenPoints=[];
      for(let n=0;n<8;n++){const y=.22+(n/7-.5)*1.13,p=project(-1.62,y,0);screenPoints.push(p);point(-1.62,y,0,n===selected?2:0,n===selected?.98:.45,n===selected?2:1.1);}
      triplets.forEach((v,i)=>{slab(...v,.26,.85,.06,i===1?1:0,1);trace(arc([-1.2,.22,0],[v[0]-.15,.22,v[2]],.03),i===1?1:0,i*.18);});
      for(let head=0;head<3;head++){
        const z=(head-1)*.40,x=.03+head*.035,y=-.20-head*.04;
        slab(x,y,z,.72,.72,.055,head%2,2,true);
        const frame=[[-.36,-.36],[.36,-.36],[.36,.36],[-.36,.36],[-.36,-.36]].map(q=>[x+q[0],y+q[1],z]);path(frame,head%2,.15,.6);
        trace(arc([-.55,.24,triplets[head][2]],[x-.38,y,z],.15),head%2,head*.13);
        trace(arc([x+.37,y+.30,z],[.69,.36,0],-.12),head%2,head*.13+.3);
        // The selected row can attend only to its own and preceding positions.
        const yRow=y+(selected/7-.5)*.72;
        for(let n=0;n<=selected;n++){
          const u=n/7,weight=.28+.55*Math.pow(Math.cos((selected-n)*.7+head),2);
          point(x+(u-.5)*.72,yRow,z-.055,head%2,.9,1.15+weight*.6);
        }
      }
      slab(.79,.36,0,.24,.83,.13,1,3);
      const add=[1.02,.36,0];point(...add,2,.92,2.1);
      path([[-1.38,-.40,0],[-1.38,-.91,0],[1.02,-.91,0],add],0,.28,.72);
      trace(arc([.92,.36,0],add,0),1,.6);
      // Token-wise expansion / contraction in the feed-forward sublayer.
      for(let layer=0;layer<3;layer++){
        const x=1.19+layer*.16,span=layer===1?1.02:.62;
        slab(x,.36,0,.065,span,.13,layer===1?1:0,4);
        if(layer)for(let row=0;row<8;row+=2)path([[x-.16,.36+(row/7-.5)*(layer===1?.62:1.02),0],[x,.36+(row/7-.5)*span,0]],1,.14,.5);
      }
      trace([add,[1.19,.36,0],[1.35,.36,0],[1.51,.36,0]],1,.72);
      path([[1.02,.36,0],[1.02,1.0,0],[1.59,1.0,0],[1.59,.36,0]],1,.20,.6);point(1.59,.36,0,2,.85,1.8);
      text('TOKENS',-1.39,1.02);text('Q  K  V',-.73,1.02);text('CAUSAL ATTENTION',.05,-.85);text('PROJECTION',.79,1.02);text('FFN',1.36,-.39);
      if(hero){text('RESIDUAL',-.4,-1.04,0,0);text('× 3 HEADS',.02,.54,0,1);}
      host.dataset.fieldPoints=String(points.length);host.dataset.fieldCoreNodes='8';
    }
    function training(){
      const n=small?40:58,m=small?20:28;
      const loss=(x,z)=>.20*Math.sin(x*2.7+z)+.18*Math.cos(z*2.2)-.23*Math.exp(-((x-.30)**2+(z+.1)**2)*3)+.15*x*x;
      for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){const x=(i/n-.5)*2.9,z=(j/m-.5)*1.7;point(x,loss(x,z),z,j%3?0:1,.30+(j/m)*.25,.78);}
      for(let line=0;line<3;line++){const coords=[];for(let i=0;i<=80;i++){const u=i/80,x=-1.38+u*2.55,z=(line-1)*.43+.23*Math.sin(u*5+line)*Math.exp(-u*1.6);coords.push([x,loss(x,z)-.03,z]);}trace(coords,line%2,line*.22);}
    }
    function vision(){
      for(let j=0;j<29;j++)for(let i=0;i<45;i++){
        const x=(i/44-.5)*2.65,z=(j/28-.5)*1.75,r=Math.hypot(x+.2,z),y=.14*Math.sin(x*2+z*2+t*.28)+.24*Math.exp(-((r-.7)**2)*6);
        point(x,y,z,(i+j)%7?0:1,.33+.24*(1-Math.abs(x)/1.5),.8);
      }
      // Spatial tokens gather into a shared representation above the patch plane.
      for(let i=0;i<560;i++){const a=i*2.39996,r=.35*Math.sqrt((i+.5)/560),x=.25+Math.cos(a)*r,z=Math.sin(a)*r;point(x,-.54+.07*Math.sin(a+t*.5),z,1,.58,.82);}
      for(let i=0;i<5;i++){const a=i*TAU/5;trace(arc([Math.cos(a)*1.05,.12,Math.sin(a)*.64],[.25,-.54,0],.22),i%2,i*.12);}
    }
    function agents(){
      const hubs=[[0,0,0]];for(let j=0;j<6;j++){const a=j*TAU/6;hubs.push([1.12*Math.cos(a),.62*Math.sin(a),.20*Math.sin(a*2)]);}
      hubs.forEach((c,j)=>{const count=j?150:300,r=j?.145:.25;for(let i=0;i<count;i++){const y=1-2*(i+.5)/count,a=i*2.39996+t*.04,rr=Math.sqrt(1-y*y);point(c[0]+Math.cos(a)*rr*r,c[1]+y*r,c[2]+Math.sin(a)*rr*r,j%2,.51+(y+1)*.12,.85);}if(j)trace(arc([0,0,0],c,.05,(j%2?1:-1)*.14),j%2,j*.13);});
      for(let j=1;j<hubs.length;j++)path(arc(hubs[j],hubs[j===6?1:j+1],.07),0,.13,.5);
    }
    function world(){
      // A latent state gives rise to alternative action-conditioned trajectories.
      const branchCount=7;
      for(let branch=0;branch<branchCount;branch++){
        const angle=(branch-3)*.20,coords=[];
        for(let i=0;i<=85;i++){const u=i/85,x=-1.34+u*2.65,y=Math.sin(angle)*u*u*1.75+.09*Math.sin(u*5+t*.25+branch)*u,z=Math.cos(angle*2)*.42*u+(branch%2?1:-1)*.16*Math.sin(u*Math.PI);coords.push([x,y,z]);for(let n=0;n<5;n++){const a=n*TAU/5+u*5+t*.1;point(x,y+Math.sin(a)*(.025+.045*u),z+Math.cos(a)*(.025+.045*u),branch%2,.28+.23*u,.75);}}
        trace(coords,branch%2,branch*.11);
        const end=coords[85];for(let j=0;j<80;j++){const a=j*2.39996,r=.085*Math.sqrt(j/80);point(end[0]+Math.cos(a)*r,end[1]+Math.sin(a)*r,end[2],branch%2,.55,.85);}
      }
      for(let n=0;n<300;n++){const a=n*2.39996,y=1-2*(n+.5)/300,r=.19*Math.sqrt(1-y*y);point(-1.32+Math.cos(a)*r,y*.19,Math.sin(a)*r,2,.65,.9);}
    }
    function control(){
      // Waveform lanes, timed events, and a physical output: a control system,
      // rather than another generic network or a decorative PCB silhouette.
      for(let lane=0;lane<5;lane++){
        const y=(lane-2)*.25,z=(lane-2)*.06,coords=[];
        for(let i=0;i<=160;i++){const u=i/160,x=-1.42+u*2.6;let v;
          if(lane%2===0)v=Math.sin((u*5-t*.11)*TAU)*Math.exp(-Math.pow((u-.56)*3.6,2))*.095;
          else v=((u>.2&&u<.34)||(u>.57&&u<.78)?-.11:.04);
          coords.push([x,y+v,z]);point(x,y+v,z,lane%2,.55, .83);
        }
        path(coords,lane%2,.22,.55);const u=fract(t*.09+lane*.13);point(-1.42+u*2.6,y,z,lane%2,.9,1.8);
      }
      for(let j=0;j<5;j++)for(let i=0;i<10;i++)point(1.34+(i/9-.5)*.23,(j/4-.5)*1.05,0,1,.45,.95);
      for(const x of [-.9,.1,.7]){const coords=[];for(let j=0;j<18;j++)coords.push([x,(j/17-.5)*1.35,0]);path(coords,2,.18,.6);}
    }
    function quantum(){
      // Two distributed network nodes and interfering optical paths; not Bloch
      // spheres and not a claimed simulation of a particular experimental state.
      for(const side of [-1,1]){
        const cx=side*.97;
        for(let n=0;n<650;n++){const a=n*2.39996,b=TAU*fract(n*.61803),r=.32+.065*Math.cos(b);point(cx+Math.cos(a)*r,Math.sin(a)*r,Math.sin(b)*.065,side<0?0:1,.36+.22*Math.sin(b)**2,.83);}
        for(let n=0;n<140;n++){const a=n*2.39996,y=1-2*(n+.5)/140,r=.115*Math.sqrt(1-y*y);point(cx+Math.cos(a)*r,y*.115,Math.sin(a)*r,side<0?0:1,.72,.91);}
      }
      for(let k=0;k<2;k++){const coords=[];for(let i=0;i<=140;i++){const u=i/140,a=u*TAU*1.5+t*.42+k*Math.PI;coords.push([- .97+u*1.94,.10*Math.sin(a)*Math.sin(u*Math.PI),.10*Math.cos(a)*Math.sin(u*Math.PI)]);if(i%2===0)point(...coords[coords.length-1],k,.35,.65);}trace(coords,k,k*.5);}
    }
    const draw={transformer,training,vision,agents,world,control,quantum};
    function render(){
      if(w<2||h<2)return;g.scale=g.baseScale;g.cx=g.baseCx;g.cy=g.baseCy;points=[];paths=[];labels=[];ctx.fillStyle=PAPER;ctx.fillRect(0,0,w,h);
      const glow=ctx.createRadialGradient(g.cx,g.cy,0,g.cx,g.cy,g.width*.6);glow.addColorStop(0,'rgba(219,226,238,.52)');glow.addColorStop(.55,'rgba(230,225,238,.17)');glow.addColorStop(1,'rgba(246,245,241,0)');ctx.fillStyle=glow;ctx.fillRect(g.left,g.top,g.width,g.height);
      (draw[mode]||draw.transformer)();
      if(!hero&&points.length){
        // Fit the projected object, not just a theoretical bounding sphere.
        // Wide and narrow cards keep the complete surface and trajectory tips.
        let loX=Infinity,loY=Infinity,hiX=-Infinity,hiY=-Infinity;
        for(const v of points){const q=project(v.x,v.y,v.z);loX=Math.min(loX,q.x);hiX=Math.max(hiX,q.x);loY=Math.min(loY,q.y);hiY=Math.max(hiY,q.y);}
        const factor=Math.min(1.25,(g.width-14)/Math.max(1,hiX-loX),(g.height-14)/Math.max(1,hiY-loY));
        g.scale*=factor;g.cx=g.left+g.width*.5-((loX+hiX)*.5-g.baseCx)*factor;g.cy=g.top+g.height*.5-((loY+hiY)*.5-g.baseCy)*factor;
      }
      ctx.save();ctx.beginPath();ctx.rect(g.left,g.top,g.width,g.height);ctx.clip();
      for(const p of paths){ctx.beginPath();p.coords.forEach((v,i)=>{const q=project(...v);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.strokeStyle=palette[p.c];ctx.globalAlpha=p.a;ctx.lineWidth=p.width;ctx.stroke();}
      const projected=points.map(v=>({...v,...project(v.x,v.y,v.z)}));projected.sort((a,b)=>b.d-a.d);
      for(const p of projected){ctx.globalAlpha=clamp(p.a*(1-p.d*.13),.1,1);ctx.fillStyle=palette[p.c];ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.45,p.r*(hero?(small?.95:1.1):.90)*p.s),0,TAU);ctx.fill();}
      ctx.globalAlpha=1;
      for(const l of labels){const p=project(l.x,l.y,l.z);ctx.font=`500 ${small?9:10}px "Space Grotesk",sans-serif`;ctx.textAlign='center';ctx.fillStyle=palette[l.c];ctx.fillText(l.s,p.x,p.y);}
      ctx.restore();host.dataset.fieldPoints=String(points.length);host.dataset.fieldFrame=String(Math.round(t*30));
    }
    const scene={tick(delta){t+=delta;const e=1-Math.exp(-delta*4);px+=(tx-px)*e;py+=(ty-py)*e;render();},get visible(){return visible;},setVisible(v){visible=v;host.dataset.fieldRunning=String(v&&!hidden&&!document.hidden);wake();},measure};scenes.push(scene);
    if(typeof ResizeObserver==='function')new ResizeObserver(measure).observe(host);
    if(typeof IntersectionObserver==='function')new IntersectionObserver(es=>scene.setVisible(es[0].isIntersecting),{rootMargin:'30px',threshold:0}).observe(host);
    measure();
  }
  function tick(now){raf=0;if(hidden||document.hidden)return;const interval=1000/28,elapsed=now-then;if(elapsed>=interval){const delta=Math.min(.08,(now-lastPaint)/1000);then=now-elapsed%interval;lastPaint=now;for(const s of scenes)if(s.visible)s.tick(delta);}if(scenes.some(s=>s.visible))raf=requestAnimationFrame(tick);}
  function wake(){if(!raf&&!hidden&&!document.hidden&&scenes.some(s=>s.visible)){then=lastPaint=performance.now();raf=requestAnimationFrame(tick);}}
  heroCanvases.forEach(c=>make(c,c.closest('.research-field')||c.parentElement,'transformer',true));
  topics.forEach(host=>{let c=host.matches('canvas')?host:host.querySelector('canvas');if(!c){c=document.createElement('canvas');host.append(c);}make(c,host,host.dataset.topicField);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}scenes.forEach(s=>s.setVisible(s.visible));wake();});
  window.addEventListener('pagehide',()=>{hidden=true;if(raf)cancelAnimationFrame(raf);raf=0;});window.addEventListener('pageshow',()=>{hidden=false;wake();});
})();

/* Interactive research studies. Original Canvas 2D geometry; no remote dependencies.
 * Conceptual illustrations, not experimental results or measured model internals.
 * Pointer and keyboard input share one state; offscreen scenes suspend rendering.
 */
(() => {
  'use strict';
  const canvases = [...new Set(document.querySelectorAll('canvas[data-research-field], .research-field > canvas, .quantum-field-stage > canvas, #research-field, #quantum-field'))].filter(c=>c.dataset.fieldRenderer!=='v13');
  if (!canvases.length) return;
  const TAU=Math.PI*2,PAPER='#f6f5f1';
  const INK=[47,76,119],BLUE=[71,105,165],PLUM=[116,88,142],PALE=[130,153,186];
  const MODES=['ai','training','agents','vision','quantum'];
  const SHAPES={ai:'neural-network',training:'optimization-landscape',agents:'agent-network',vision:'feature-manifold',quantum:'entangled-node-fields'};
  const COPY={
    ai:{name:'Neural signal study',hint:'Drag a neuron · send a signal',action:'Send signal',detail:'A conceptual layered network within a flowing particle field, not measured model activations. Drag a node horizontally, or focus this canvas and use arrow keys to move a selected node. Enter sends a signal; R resets the positions.'},
    training:{name:'Optimization landscape',hint:'Explore a training trajectory',action:'Trace a path',detail:'An illustrative optimization surface and three model-scale trajectories, not measured training curves. Drag horizontally to change the view; Enter traces a path; R resets the view.'},
    agents:{name:'Coordinated agents',hint:'Move a node · dispatch a task',action:'Dispatch task',detail:'A conceptual collaboration graph. Drag a node horizontally, or use arrow keys when this canvas is focused. Enter dispatches a task; R resets the positions.'},
    vision:{name:'Spatial representation',hint:'Touch the field to perturb it',action:'Create ripple',detail:'A conceptual spatial-feature manifold. Click or tap to perturb the surface. Arrow keys move the focus point; Enter creates a ripple; R resets the view.'},
    quantum:{name:'Interference and linked quantum nodes',hint:'Drag to rotate · shift the phase',action:'Shift phase',detail:'A conceptual particle field morphs into two linked quantum-network nodes, labeled Alice and Bob. The surrounding rings and optical channel are artistic motifs, not a statevector or an experimental simulation. Drag horizontally to rotate it. Arrow keys rotate the view; Enter shifts the phase; R resets the view.'}
  };
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${clamp(a,0,1).toFixed(3)})`;
  const stages=[];
  let pageHidden=false,scrollTimer=0,resizeTimer=0;

  function createStage(canvas,index) {
    const host=canvas.closest('.research-field, .quantum-field-stage')||canvas.parentElement;
    const requested=canvas.dataset.fieldMode||host.dataset.fieldMode||(canvas.id==='quantum-field'?'quantum':'ai');
    const mode=MODES.includes(requested)?requested:'ai',copy=COPY[mode];
    const full=host.dataset.fieldLayout==='full',hero=host.classList.contains('landing-moon');
    let ctx;try{ctx=canvas.getContext('2d',{alpha:false});}catch(_){return null;}
    if(!ctx){canvas.hidden=true;return null;}
    const pane=document.createElement('div');
    pane.className='field-interaction';pane.tabIndex=0;pane.setAttribute('role','group');
    pane.setAttribute('aria-label',copy.name);pane.setAttribute('aria-describedby',`field-help-${index}`);
    const help=document.createElement('span');help.id=`field-help-${index}`;help.className='field-sr-only';help.textContent=copy.detail;
    const controls=document.createElement('div');controls.className='field-playbar';
    const hint=document.createElement('span');hint.className='field-play-hint';hint.textContent=copy.hint;
    const action=document.createElement('button');action.className='field-play-action';action.type='button';action.textContent=copy.action;
    const reset=document.createElement('button');reset.className='field-play-reset';reset.type='button';reset.textContent='Reset';reset.setAttribute('aria-label',`Reset ${copy.name.toLowerCase()}`);
    const status=document.createElement('span');status.className='field-sr-only';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    controls.append(hint,action,reset);host.append(pane,controls,help,status);
    host.classList.add('field-interactive');host.dataset.fieldMode=mode;host.dataset.fieldShape=SHAPES[mode];host.dataset.fieldInteractions='0';
    let width=0,height=0,dpr=1,narrow=false,small=false,frame=0,running=false,inView=false;
    let phase=0,lastTick=0,lastDraw=0,resizeDelay=0,geometry=null,gradient=null;
    let yaw=0,targetYaw=0,pitch=0,targetPitch=0,scrollView=.5,targetScroll=.5;
    let pressed=false,dragId=null,dragStart=null,dragIndex=-1,hoverIndex=-1,selected=0,moved=false;
    let signal=-10,interactions=0,phaseShift=0,focusX=0,focusZ=0;
    const ripples=[],nodes=[],edges=[],positions=[];
    let neuralSamples=[],quantumSamples=[],sampleSize='';
    const fract=n=>n-Math.floor(n);
    function prepareParticles(){
      const key=small?'small':'large';if(sampleSize===key)return;sampleSize=key;
      if(mode==='ai'){
        const strands=small?30:44,steps=small?66:94;
        neuralSamples=[];
        for(let j=0;j<strands;j++)for(let i=0;i<steps;i++){
          const u=(i+fract(j*.6180339)*.7)/(steps-1),v=(j+.5)/strands;
          neuralSamples.push({u,v,angle:j*.6180339*TAU,weight:.62+fract(i*.754877+j*.56984)*.38});
        }
      }else if(mode==='quantum'){
        const rows=small?30:42,cols=small?64:88;
        quantumSamples=[];
        for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
          const index=j*(cols+1)+i,group=(index*7)%20;
          quantumSamples.push({x:(i/cols-.5)*2.75,z:(j/rows-.5)*2,group,
            a:fract(index*.61803398875)*TAU,b:fract(index*.7548776662)*TAU,
            t:fract(index*.569840291),shade:fract(index*.41421356),row:j,col:i});
        }
      }
    }

    if(mode==='ai') {
      const counts=[5,9,14,18,22,18,14,9,5],layers=[];
      for(let l=0;l<counts.length;l++) {
        const layer=[];
        for(let n=0;n<counts[l];n++) {
          const t=n/(counts[l]-1),j=nodes.length;
          const envelope=.80+1.18*Math.sin(l*Math.PI/8);
          nodes.push({x:-1.3+l*2.6/8+Math.sin(t*TAU)*.075,y:(t-.5)*envelope,z:Math.sin(t*TAU+l*.38)*(.12+.16*Math.sin(l*Math.PI/8)),l,n,dx:0,dy:0});layer.push(j);
        }
        layers.push(layer);
      }
      layers.slice(0,-1).forEach((layer,l)=>layer.forEach((a,i)=>{
        layers[l+1].forEach((b,j)=>{
          const separation=Math.abs(i/(layer.length-1)-j/(layers[l+1].length-1));
          if(separation<.21||(i*7+j*3+l)%23===0)edges.push({a,b,l,weight:1-separation*.65});
        });
      }));
      selected=layers[4][10];
    } else if(mode==='agents') {
      nodes.push({x:0,y:0,z:-.08,l:0,dx:0,dy:0});
      for(let i=0;i<8;i++){const a=-Math.PI/2+i*TAU/8;nodes.push({x:1.09*Math.cos(a),y:.70*Math.sin(a),z:Math.sin(a*2)*.21,l:1,dx:0,dy:0});edges.push({a:0,b:i+1,l:i,weight:1});}
      for(let i=1;i<=8;i++){edges.push({a:i,b:i===8?1:i+1,l:i+2,weight:.45});if(i%2===0)edges.push({a:i,b:(i+3)%8+1,l:i+1,weight:.20});}
      selected=1;
    }

    function notify(message){interactions++;host.dataset.fieldInteractions=String(interactions);status.textContent=message;}
    function activate(x=focusX,z=focusZ){
      signal=phase;focusX=clamp(x,-1.35,1.35);focusZ=clamp(z,-1,1);
      if(mode==='vision'||mode==='quantum'){ripples.push({x:focusX,z:focusZ,t:phase});if(ripples.length>5)ripples.shift();}
      if(mode==='quantum')phaseShift+=Math.PI/3;
      host.dataset.fieldInteractionType='activate';host.dataset.fieldPhase=phaseShift.toFixed(3);
      notify({ai:'Signal propagating through the network.',training:'Tracing the illustrative optimization paths.',agents:'Task dispatched through the collaboration graph.',vision:'Perturbation propagating across the feature manifold.',quantum:'Relative phase shifted by sixty degrees.'}[mode]);draw(phase);
    }
    function resetScene(){nodes.forEach(n=>{n.dx=0;n.dy=0;});targetYaw=0;targetPitch=0;phaseShift=0;focusX=0;focusZ=0;ripples.length=0;signal=-10;host.dataset.fieldInteractionType='reset';host.dataset.fieldNodeOffset='0';host.dataset.fieldPhase='0';notify('View reset.');draw(phase);}
    action.addEventListener('click',()=>activate());reset.addEventListener('click',resetScene);

    function sceneGeometry(){
      const footer=hero?(narrow?63:80):12;
      let left,right,top,bottom;
      if(narrow&&!full){const band=small?310:370;left=small?12:35;right=width-left;bottom=height-footer-71;top=Math.max(0,bottom-band);}
      else{left=full?25:width*(hero?.515:.48);right=width-22;top=hero?95:30;bottom=height-footer-75;}
      const aw=Math.max(1,right-left),ah=Math.max(1,bottom-top),scale=Math.min(aw/2.94,ah/(mode==='quantum'?2.3:2.12));
      const baseYaw={ai:-.26,training:-.34,agents:-.10,vision:-.19,quantum:-.20}[mode];
      const basePitch={ai:.02,training:.77,agents:.15,vision:.79,quantum:.67}[mode];
      const angle=baseYaw+yaw+Math.sin(phase*.08)*.045+(scrollView-.5)*.05,tilt=basePitch+pitch;
      geometry={cx:(left+right)/2,cy:(top+bottom)/2,scale,left,right,top,bottom,aw,ah,ca:Math.cos(angle),sa:Math.sin(angle),ct:Math.cos(tilt),st:Math.sin(tilt)};
      pane.style.left=`${left}px`;pane.style.top=`${top}px`;pane.style.width=`${aw}px`;pane.style.height=`${ah}px`;
      controls.style.left=`${left}px`;controls.style.width=`${aw}px`;controls.style.bottom=`${footer+12}px`;
      host.dataset.fieldArtTop=String(Math.round(top));host.dataset.fieldArtLeft=String(Math.round(left));
    }
    function project(x,y,z=0){const g=geometry,xx=x*g.ca+z*g.sa,zz=z*g.ca-x*g.sa,yy=y*g.ct+zz*g.st,depth=zz*g.ct-y*g.st,perspective=1/(1+depth*.14);return{x:g.cx+xx*g.scale*perspective,y:g.cy+yy*g.scale*perspective,depth,scale:perspective};}
    function line(points,color=BLUE,alpha=.2,widthPx=.7){if(!points.length)return;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.strokeStyle=rgba(color,alpha);ctx.lineWidth=widthPx;ctx.stroke();}
    function dot(p,r,color=BLUE,alpha=.75){ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fillStyle=rgba(color,alpha);ctx.fill();}
    function ring(p,r,color=BLUE,alpha=.3,weight=.75){ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.strokeStyle=rgba(color,alpha);ctx.lineWidth=weight;ctx.stroke();}
    function label(text,p,color=INK,alpha=.64){ctx.font=`${small?10:11}px "Space Grotesk", sans-serif`;ctx.textAlign='center';ctx.fillStyle=rgba(color,alpha);ctx.fillText(text,p.x,p.y);}
    function bezier(a,b,t,bend=0){const u=1-t,c1={x:mix(a.x,b.x,.43),y:a.y+bend},c2={x:mix(a.x,b.x,.57),y:b.y-bend};return{x:u*u*u*a.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*b.y};}
    function traceEdge(a,b,color,alpha,weight,bend=0){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(mix(a.x,b.x,.43),a.y+bend,mix(a.x,b.x,.57),b.y-bend,b.x,b.y);ctx.strokeStyle=rgba(color,alpha);ctx.lineWidth=weight;ctx.stroke();}
    function bloom(p,r,color,alpha){const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);glow.addColorStop(0,rgba(color,alpha));glow.addColorStop(1,rgba(color,0));ctx.fillStyle=glow;ctx.fillRect(p.x-r,p.y-r,r*2,r*2);}

    function neural(time){
      const auto=(time*.43)%9.7,manual=(time-signal)*2.0;
      const propagation=manual>=0&&manual<9.5?manual:auto;
      // Fine filaments give the network a continuous volume. The larger nodes
      // below retain the original, draggable topology and signal interaction.
      for(const s of neuralSamples){
        const u=fract(s.u+time*.012),envelope=.24+.77*Math.sin(u*Math.PI);
        const curl=Math.sin(s.angle+u*TAU*.56+time*.095);
        const x=-1.37+u*2.74;
        const y=(s.v-.5)*envelope*1.84+.043*curl*Math.sin(u*Math.PI);
        const z=Math.cos(s.angle+u*3.8+time*.075)*(.08+.16*Math.sin(u*Math.PI));
        const p=project(x,y,z),crest=Math.exp(-Math.pow((u*8-propagation)*2.5,2));
        const breath=.86+.14*Math.sin(time*.3+s.angle),depth=clamp(1-p.depth*.28,.65,1.2);
        dot(p,(small?.56:.72)*p.scale,s.v>.52?PLUM:BLUE,(.16+.21*crest)*s.weight*depth*breath);
      }
      positions.length=0;
      nodes.forEach(n=>positions.push(project(n.x+n.dx,n.y+n.dy+Math.sin(time*.42+n.l*.5+n.n*.15)*.018,n.z+Math.sin(time*.23+n.l)*.04)));
      for(const edge of edges){
        const a=positions[edge.a],b=positions[edge.b],hot=manual>=edge.l&&manual<=edge.l+1.1;
        // A few structural connections anchor the particle field; low-contrast
        // secondary links avoid turning the image into a dense wire mesh.
        if(hot||(edge.a+edge.b)%3===0)traceEdge(a,b,edge.l%2?PLUM:BLUE,(hot?.28:.10)*edge.weight,hot?.85:.48);
        const t=(hot?manual:auto)-edge.l;
        if(t>=0&&t<=1&&(hot||(edge.a+edge.b)%4===0)){
          const p=bezier(a,b,t);dot(p,hot?1.8:1.15,edge.l%2?PLUM:BLUE,hot?.82:.5);
          for(let tail=1;tail<=3;tail++){const tt=t-tail*.023;if(tt>=0)dot(bezier(a,b,tt),.55,edge.l%2?PLUM:BLUE,(hot?.24:.13)*(1-tail*.2));}
        }
      }
      nodes.forEach((n,i)=>{
        const p=positions[i],wave=Math.max(0,1-Math.abs(propagation-n.l)/.8),active=i===dragIndex||i===hoverIndex;
        const r=(small?1.7:2.25)*(1+wave*.36)*p.scale;
        for(let j=0;j<7;j++){
          const a=j*2.39996+i*.7+time*.025,spread=(small?3.4:4.7)*Math.sqrt((j+1)/7);
          dot({x:p.x+Math.cos(a)*spread,y:p.y+Math.sin(a)*spread},small?.38:.48,n.l%2?PLUM:BLUE,.15+wave*.1);
        }
        if(active||wave>.7){bloom(p,active?20:11,BLUE,active?.20:.08);ring(p,r+(active?7:4),BLUE,active?.66:.25);}
        dot(p,r,n.l%2?PLUM:INK,.65+wave*.30);if(active)dot(p,1.05,[255,255,255],1);
      });
      [-1.3,0,1.3].forEach((x,i)=>{label(['INPUT','REPRESENTATION','OUTPUT'][i],project(x,i===1?1.12:.67,.05),BLUE,.79);});
      host.dataset.fieldMorph='connected';host.dataset.fieldAggregation='1';host.dataset.fieldPoints=String(neuralSamples.length+nodes.length*8);host.dataset.fieldCoreNodes=String(nodes.length);
    }
    function loss(x,z,time){return -.45+.62*Math.exp(-((x+.95)**2*1.4+z*z*.48))+.13*(x+.4)**2+.11*z*z+.045*Math.sin(x*3.1+z*2.3+time*.13);}
    function training(time){
      const rows=small?20:28,columns=small?42:58,grid=[];
      for(let j=0;j<=rows;j++){const z=-.88+j*1.76/rows,row=[];for(let i=0;i<=columns;i++){const x=-1.35+i*2.7/columns;row.push(project(x,loss(x,z,time),z));}grid.push(row);line(row,j%3===0?BLUE:PALE,j%3===0?.29:.17,j%3===0?.72:.5);}
      for(let i=0;i<=columns;i+=3)line(grid.map(row=>row[i]),PLUM,.13,.55);
      const colors=[BLUE,PLUM,INK];
      for(let j=0;j<3;j++){
        const pts=[];
        for(let n=0;n<=100;n++){const t=n/100,x=-1.30+t*2.53,z=(j-1)*.48+.1*Math.sin(t*5+j)*Math.exp(-t*2),y=loss(x,z,time)-.035;pts.push(project(x,y,z));}
        line(pts,colors[j],.83,small?1.5:1.9);
        const progress=signal>0&&time-signal<4?(time-signal)/4:(time*.075+j*.24)%1,p=pts[clamp(Math.round(progress*100),0,100)];
        bloom(p,17,colors[j],.13);dot(p,small?3.1:4,colors[j],.95);ring(p,7,colors[j],.35);
        label(['1B','3B','10B'][j],{x:pts[0].x-13,y:pts[0].y-10},colors[j],.9);
      }
      label('ILLUSTRATIVE TRAJECTORIES',project(.15,.60,.96),BLUE,.57);host.dataset.fieldMorph='landscape';
    }
    function agents(time){
      positions.length=0;nodes.forEach((n,i)=>positions.push(project(n.x+n.dx,n.y+n.dy+Math.sin(time*.3+i)*.012,n.z)));
      const dispatch=(time-signal)*1.5;
      for(const edge of edges){
        const a=positions[edge.a],b=positions[edge.b],bend=(edge.a?1:-1)*geometry.scale*.04;
        traceEdge(a,b,edge.l%2?PLUM:BLUE,.25*edge.weight,.9,bend);
        const t=edge.a===0?dispatch-edge.l*.10:(time*.18+edge.l*.17)%1;
        if(t>=0&&t<=1){const p=bezier(a,b,t,bend);bloom(p,11,BLUE,.10);dot(p,edge.a===0?3:1.5,BLUE,.9);}
      }
      nodes.forEach((n,i)=>{
        const p=positions[i],r=i?12:22,color=i%2?PLUM:BLUE,active=i===dragIndex||i===hoverIndex;
        bloom(p,r*2.6,color,active?.17:.08);ring(p,r,color,.40,1);ring(p,r+5,color,.13,.7);dot(p,i?3.4:5,INK,.87);
        for(let j=0;j<(i?11:21);j++){const a=j*2.39996+time*.045,d=r*(.38+.5*Math.sqrt((j+1)/(i?11:21)));dot({x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d},.8,color,.5);}
      });
      const labels=['CONTEXT','PLAN','RESEARCH','BUILD','CHECK','REVIEW','TOOLS','CODE','DATA'];positions.forEach((p,i)=>{if(!small||i===0||i%2)label(labels[i],{x:p.x,y:p.y+(i?30:40)},INK,.65);});host.dataset.fieldMorph='connected';
    }
    function displacement(x,z,time){let value=0;for(const r of ripples){const age=time-r.t,d=Math.hypot(x-r.x,z-r.z),wave=d-age*.65;value+=Math.sin(wave*13)*Math.exp(-wave*wave*7)*Math.exp(-age*.6)*.19;}return value;}
    function vision(time){
      const rows=small?20:30,cols=small?38:55,grid=[];
      for(let j=0;j<=rows;j++){
        const z=-.9+j*1.8/rows,row=[];
        for(let i=0;i<=cols;i++){const x=-1.35+i*2.7/cols,y=.16*Math.sin(x*2.5+time*.22)+.12*Math.cos(z*3-x+time*.13)+displacement(x,z,time);row.push(project(x,y,z));}
        grid.push(row);line(row,j%4===0?PLUM:BLUE,j%4===0?.35:.16,j%4===0?.85:.55);
      }
      for(let i=0;i<=cols;i+=3)line(grid.map(row=>row[i]),BLUE,i%9===0?.27:.11,.6);
      for(let j=0;j<=rows;j+=2)for(let i=0;i<=cols;i+=2){const p=grid[j][i];dot(p,small?.85:1.1,(i+j)%6?BLUE:PLUM,.50);}
      for(const r of ripples){const age=time-r.t;if(age>4)continue;const pts=[],radius=age*.65;for(let j=0;j<=100;j++){const a=j/100*TAU,x=r.x+Math.cos(a)*radius,z=r.z+Math.sin(a)*radius;if(Math.abs(x)>1.4||Math.abs(z)>1)continue;pts.push(project(x,.16*Math.sin(x*2.5+time*.22)+.12*Math.cos(z*3-x+time*.13)+displacement(x,z,time)-.02,z));}line(pts,PLUM,.66*Math.exp(-age*.7),1.3);}
      const p=project(focusX,.16*Math.sin(focusX*2.5+time*.22)+.12*Math.cos(focusZ*3-focusX+time*.13),focusZ);ring(p,12+Math.sin(time)*1.5,INK,.34);dot(p,2,INK,.7);
      label('POSITION × REPRESENTATION',project(.1,.55,1),BLUE,.62);host.dataset.fieldMorph='manifold';
    }
    function quantum(time){
      const cycle=time%30,gathered=cycle<5?0:cycle<11?smooth((cycle-5)/6):cycle<23?1:1-smooth((cycle-23)/7);
      const projected=[],waveRows=[];
      for(const s of quantumSamples){
        const a=Math.hypot(s.x+.46,s.z),b=Math.hypot(s.x-.46,s.z);
        const wave=.22*(Math.sin(a*8-time*.95)/Math.sqrt(a+.5)+Math.sin(b*8-time*.95+phaseShift)/Math.sqrt(b+.5))+displacement(s.x,s.z,time);
        let tx,ty,tz;
        if(s.group<16){
          const side=s.group<8?-1:1,azimuth=s.a+time*.055*side;
          const minor=.073+.024*Math.sin(s.a*3+phaseShift+time*.12);
          const radius=.36+minor*Math.cos(s.b),localX=radius*Math.cos(azimuth);
          // Paired toroidal field motifs surround the two atom-like cores.
          // They are not Bloch spheres or a simulation of an atomic orbital.
          tx=side*.83+localX;
          ty=radius*Math.sin(azimuth)*1.08;
          tz=minor*Math.sin(s.b)+localX*side*.23;
        }else{
          const t=s.t,envelope=Math.sin(t*Math.PI),angle=s.b+time*.8+phaseShift;
          tx=mix(-.83,.83,t);
          ty=Math.sin(t*TAU+phaseShift)*.085+Math.cos(angle)*.055*envelope;
          tz=Math.cos(t*TAU+phaseShift)*.065+Math.sin(angle)*.055*envelope;
        }
        const p=project(mix(s.x,tx,gathered),mix(wave,ty,gathered),mix(s.z,tz,gathered));
        const color=s.group<8?BLUE:s.group<16?PLUM:BLUE;
        projected.push({p,color,alpha:(.29+.22*s.shade)*clamp(1-p.depth*.22,.7,1.2),radius:(small?.64:.81)*(s.group<16?1:1.05)*p.scale});
        if(s.row%5===0){if(!waveRows[s.row])waveRows[s.row]=[];waveRows[s.row].push(p);}
      }
      if(gathered<.92)waveRows.forEach(row=>{if(row)line(row,BLUE,.16*(1-gathered),.5);});
      projected.sort((a,b)=>b.p.depth-a.p.depth).forEach(item=>dot(item.p,item.radius,item.color,item.alpha));
      if(gathered>.12){
        for(const side of [-1,1]){
          const core=project(side*.83,0,0),color=side<0?BLUE:PLUM;
          bloom(core,small?17:27,color,.14*gathered);dot(core,small?2.6:3.5,color,.9*gathered);ring(core,small?6:9,color,.32*gathered);
          for(let n=0;n<44;n++){
            const a=n*2.39996+time*.08,r=.088*Math.sqrt((n+.5)/44);
            const p=project(side*.83+Math.cos(a)*r,Math.sin(a)*r,Math.sin(n*1.7)*.055);
            dot(p,small?.58:.77,color,.35*gathered);
          }
          label(side<0?'ALICE':'BOB',project(side*.83,.66,.03),color,.74*gathered);
        }
        for(let branch=0;branch<2;branch++){
          const path=[];for(let i=0;i<=80;i++){const t=i/80,angle=t*TAU+phaseShift+branch*Math.PI;path.push(project(mix(-.83,.83,t),Math.sin(angle)*.085,Math.cos(angle)*.065));}
          line(path,branch?PLUM:BLUE,.32*gathered,.65);
          const travel=fract(time*.13+branch*.5),p=path[Math.floor(travel*80)];bloom(p,12,branch?PLUM:BLUE,.09*gathered);dot(p,small?1.5:2,branch?PLUM:BLUE,.85*gathered);
        }
      }
      if(gathered<.8)[-.46,.46].forEach((x,i)=>{const p=project(x,0,0);bloom(p,20,i?PLUM:BLUE,.13*(1-gathered));ring(p,7,i?PLUM:BLUE,.55*(1-gathered));dot(p,2,i?PLUM:BLUE,.8*(1-gathered));});
      label(gathered>.5?'LINKED NODES / CONCEPTUAL FIELD':'SUPERPOSITION / INTERFERENCE',project(.05,.98,.05),BLUE,.62);
      host.dataset.fieldMorph=gathered>.88?'assembled':gathered<.12?'wave':'morphing';host.dataset.fieldAggregation=gathered.toFixed(2);host.dataset.fieldPoints=String(quantumSamples.length+88);
    }
    const renderers={ai:neural,training,agents,vision,quantum};
    function draw(time){if(!geometry||width<2||height<2)return;sceneGeometry();ctx.fillStyle=PAPER;ctx.fillRect(0,0,width,height);ctx.fillStyle=gradient;ctx.fillRect(geometry.left-30,geometry.top-35,geometry.aw+60,geometry.ah+70);ctx.save();ctx.beginPath();ctx.rect(geometry.left-3,geometry.top-12,geometry.aw+6,geometry.ah+22);ctx.clip();renderers[mode](time);ctx.restore();host.dataset.fieldFrame=String(Math.round(time*30));}
    function nearest(x,y){let best=-1,distance=small?30:22;positions.forEach((p,i)=>{const d=Math.hypot(p.x-x,p.y-y);if(d<distance){best=i;distance=d;}});return best;}
    function coordinates(event){const r=canvas.getBoundingClientRect();return{x:event.clientX-r.left,y:event.clientY-r.top};}
    pane.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;const p=coordinates(event);pressed=true;moved=false;dragId=event.pointerId;dragStart={...p,yaw:targetYaw,pitch:targetPitch};dragIndex=nearest(p.x,p.y);
      if(dragIndex>=0){selected=dragIndex;dragStart.dx=nodes[dragIndex].dx;dragStart.dy=nodes[dragIndex].dy;}pane.classList.add('is-dragging');try{pane.setPointerCapture(event.pointerId);}catch(_){}
    });
    pane.addEventListener('pointermove',event=>{
      const p=coordinates(event);if(!pressed){hoverIndex=nearest(p.x,p.y);pane.classList.toggle('is-node-hover',hoverIndex>=0);return;}if(event.pointerId!==dragId)return;
      const dx=p.x-dragStart.x,dy=p.y-dragStart.y;if(Math.hypot(dx,dy)>4)moved=true;
      if(dragIndex>=0){nodes[dragIndex].dx=clamp(dragStart.dx+dx/geometry.scale,-.32,.32);nodes[dragIndex].dy=clamp(dragStart.dy+dy/geometry.scale,-.32,.32);}
      else if(mode!=='vision'){targetYaw=clamp(dragStart.yaw+dx*.0045,-.75,.75);targetPitch=clamp(dragStart.pitch+dy*.002,-.3,.3);}draw(phase);
    });
    function endPointer(event,cancelled=false){
      if(!pressed||event.pointerId!==dragId)return;const p=coordinates(event);pressed=false;pane.classList.remove('is-dragging');try{pane.releasePointerCapture(event.pointerId);}catch(_){}
      if(cancelled&&dragIndex>=0){nodes[dragIndex].dx=dragStart.dx;nodes[dragIndex].dy=dragStart.dy;}
      if(!cancelled){if(!moved)activate((p.x-geometry.cx)/geometry.scale,(p.y-geometry.cy)/geometry.scale);else{signal=phase;host.dataset.fieldInteractionType=dragIndex>=0?'node-drag':'view-drag';if(dragIndex>=0)host.dataset.fieldNodeOffset=Math.hypot(nodes[dragIndex].dx,nodes[dragIndex].dy).toFixed(3);notify(dragIndex>=0?'Node moved; connectivity preserved.':'View adjusted.');}}
      dragIndex=-1;dragId=null;
    }
    pane.addEventListener('pointerup',event=>endPointer(event));pane.addEventListener('pointercancel',event=>endPointer(event,true));
    pane.addEventListener('pointerleave',()=>{if(!pressed){hoverIndex=-1;pane.classList.remove('is-node-hover');}});
    pane.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();return;}
      if(event.key.toLowerCase()==='r'){event.preventDefault();resetScene();return;}
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();const dx=event.key==='ArrowLeft'?-.06:event.key==='ArrowRight'?.06:0,dy=event.key==='ArrowUp'?-.06:event.key==='ArrowDown'?.06:0;
      if(nodes.length){const n=nodes[selected];n.dx=clamp(n.dx+dx,-.32,.32);n.dy=clamp(n.dy+dy,-.32,.32);hoverIndex=selected;}
      else if(mode==='vision'){focusX=clamp(focusX+dx,-1.2,1.2);focusZ=clamp(focusZ+dy,-.8,.8);}
      else{targetYaw=clamp(targetYaw+dx,-.75,.75);targetPitch=clamp(targetPitch+dy,-.3,.3);}
      host.dataset.fieldInteractionType='keyboard';if(nodes.length)host.dataset.fieldNodeOffset=Math.hypot(nodes[selected].dx,nodes[selected].dy).toFixed(3);notify(nodes.length?'Selected node moved.':'View adjusted.');draw(phase);
    });
    function prepare(){
      const r=host.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height)),isNarrow=window.innerWidth<=1000,ratio=Math.min(window.devicePixelRatio||1,2);
      if(w===width&&h===height&&dpr===ratio&&narrow===isNarrow)return;width=w;height=h;dpr=ratio;narrow=isNarrow;small=w<700;
      prepareParticles();
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width='100%';canvas.style.height='100%';ctx.setTransform(dpr,0,0,dpr,0,0);
      sceneGeometry();gradient=ctx.createRadialGradient(geometry.cx,geometry.cy,0,geometry.cx,geometry.cy,geometry.aw*.58);gradient.addColorStop(0,'rgba(213,223,238,.38)');gradient.addColorStop(.52,'rgba(225,220,235,.23)');gradient.addColorStop(1,'rgba(246,245,241,0)');
      draw(phase);host.dataset.fieldReady='true';if(mode!=='ai'&&mode!=='quantum')host.dataset.fieldPoints=String(nodes.length||((small?28:39)*(small?51:73)));
    }
    function tick(now){
      if(!running)return;const interval=1000/(small?28:32);if(!lastTick){lastTick=now;lastDraw=now;}const elapsed=now-lastTick;
      if(elapsed>=interval){const delta=Math.min(.10,(now-lastDraw)/1000);phase+=delta;lastTick=now-elapsed%interval;lastDraw=now;const ease=1-Math.exp(-delta*6);yaw+=(targetYaw-yaw)*ease;pitch+=(targetPitch-pitch)*ease;scrollView+=(targetScroll-scrollView)*ease;while(ripples.length&&phase-ripples[0].t>7)ripples.shift();draw(phase);}frame=requestAnimationFrame(tick);
    }
    function reconcile(){const next=typeof requestAnimationFrame==='function'&&inView&&!document.hidden&&!pageHidden;if(next!==running){running=next;if(frame)cancelAnimationFrame(frame);frame=0;lastTick=0;lastDraw=0;if(running)frame=requestAnimationFrame(tick);}host.dataset.fieldRunning=String(running);}
    function measure(){const r=host.getBoundingClientRect();inView=r.bottom>0&&r.top<window.innerHeight;targetScroll=clamp((window.innerHeight-r.top)/(window.innerHeight+r.height),0,1);reconcile();}
    if(typeof ResizeObserver==='function')new ResizeObserver(()=>{clearTimeout(resizeDelay);resizeDelay=setTimeout(()=>{prepare();measure();},70);}).observe(host);
    if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;reconcile();},{threshold:0}).observe(host);
    prepare();measure();return{prepare,measure,reconcile};
  }
  canvases.forEach((canvas,index)=>{const stage=createStage(canvas,index);if(stage)stages.push(stage);});
  window.addEventListener('scroll',()=>{if(scrollTimer)return;scrollTimer=setTimeout(()=>{scrollTimer=0;stages.forEach(s=>s.measure());},70);},{passive:true});
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>stages.forEach(s=>{s.prepare();s.measure();}),90);},{passive:true});
  document.addEventListener('visibilitychange',()=>stages.forEach(s=>s.reconcile()));
  window.addEventListener('pagehide',()=>{pageHidden=true;stages.forEach(s=>s.reconcile());});
  window.addEventListener('pageshow',()=>{pageHidden=false;stages.forEach(s=>s.measure());});
})();
