/* Human and machine: a local, original 3D particle sculpture.
 * Geometry is made from swept anatomical surfaces and articulated mechanisms.
 * This is conceptual artwork, not a robot or learned-model demonstration.
 */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const add = (a,b) => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  const sub = (a,b) => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const mul = (a,s) => [a[0]*s,a[1]*s,a[2]*s];
  const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit = a => mul(a,1/(Math.hypot(...a)||1));
  const fract = x => x-Math.floor(x);
  const HUMAN = [112,93,123], ROBOT = [49,91,137];
  const BG = '#f6f5f1';
  function curve(points,t) {
    const f=clamp(t,0,.999999)*(points.length-1),i=Math.floor(f),u=f-i;
    const a=points[Math.max(0,i-1)],b=points[i],c=points[Math.min(points.length-1,i+1)],d=points[Math.min(points.length-1,i+2)];
    return b.map((v,j)=>.5*((2*v)+(-a[j]+c[j])*u+(2*a[j]-5*v+4*c[j]-d[j])*u*u+(-a[j]+3*v-3*c[j]+d[j])*u*u*u));
  }
  function sculpture() {
    const points=[];let serial=0;
    function point(p,n,kind,detail=0,r=1) {
      const id=serial++;points.push({p,n,kind,detail,r,seed:fract(id*.61803398875),phase:fract(id*.754877666)*TAU});
    }
    function ellipsoid(center,radii,angle,kind,lat=29,lon=65,detail=0) {
      const ca=Math.cos(angle),sa=Math.sin(angle);
      for(let i=1;i<lat;i++) for(let j=0;j<lon;j++) {
        const jitter=kind==='human'?.22:0;
        const u=(i+(fract(i*j*.17)-.5)*jitter)/lat*Math.PI,v=(j+(i%2)*.5+(fract(i*7+j*.63)-.5)*jitter)/lon*TAU;
        const q=[Math.sin(u)*Math.cos(v),Math.cos(u),Math.sin(u)*Math.sin(v)];
        const p=[q[0]*radii[0],q[1]*radii[1],q[2]*radii[2]],n=unit(q.map((x,k)=>x/radii[k]));
        point([center[0]+p[0]*ca-p[1]*sa,center[1]+p[0]*sa+p[1]*ca,center[2]+p[2]], [n[0]*ca-n[1]*sa,n[0]*sa+n[1]*ca,n[2]],kind,detail);
      }
    }
    // A swept section has true circular/elliptic depth, not silhouette extrusion.
    function tube(path,radii,kind,steps=43,sides=28,options={}) {
      const robot=kind==='robot';
      for(let i=0;i<=steps;i++) {
        const t=i/steps,c=curve(path,t),dir=unit(sub(curve(path,Math.min(1,t+.003)),curve(path,Math.max(0,t-.003))));
        const u=unit(cross(dir,Math.abs(dir[2])>.9?[0,1,0]:[0,0,1])),v=unit(cross(dir,u));
        const rr=typeof radii==='function'?radii(t):mix(radii[0],radii[1],t);
        const cap=options.cap?Math.max(.06,Math.sqrt(Math.max(0,1-Math.pow(Math.max(0,(t-.85)/.15),2)))):1;
        const depth=options.depth||1;
        for(let j=0;j<sides;j++) {
          let a=(j+(robot?0:(i%2)*.5))/sides*TAU;
          if(!robot)a+=(fract(i*j*.031)-.5)*.022;
          let cA=Math.cos(a),sA=Math.sin(a);
          // Machined fingers have planar facets, in contrast to the organic hand.
          if(options.facets){const sector=TAU/options.facets;const f=Math.cos(sector/2)/Math.cos((a+sector/2)%sector-sector/2);cA*=f;sA*=f;}
          const radial=add(mul(u,cA*rr*cap),mul(v,sA*rr*cap*depth));
          const n=unit(add(mul(u,cA),mul(v,sA/depth)));
          const band=options.bands&&options.bands.some(b=>Math.abs(t-b)<.023);
          point(add(c,radial),n,kind,band?2:options.detail||0,band?1.04:1);
        }
      }
    }
    function line(path,kind,spacing=2.5,r=.8) {
      const length=path.slice(1).reduce((s,p,i)=>s+Math.hypot(...sub(p,path[i])),0),count=Math.max(8,Math.ceil(length/spacing));
      for(let i=0;i<=count;i++)point(curve(path,i/count),[0,0,1],kind,3,r);
    }
    function ring(center,axis,radius,kind,width=1) {
      const n=unit(axis),u=unit(cross(n,Math.abs(n[2])>.9?[0,1,0]:[0,0,1])),v=cross(n,u);
      for(let k=0;k<width;k++)for(let j=0;j<60;j++){const a=j/60*TAU,rr=radius-k*2.3;point(add(center,add(mul(u,Math.cos(a)*rr),mul(v,Math.sin(a)*rr))),unit(add(mul(u,Math.cos(a)),mul(v,Math.sin(a)))) ,kind,3,.94);}
    }
    // Human forearm, heel and palm: tapered, asymmetrical, softly curved.
    tube([[-410,112,-6],[-330,64,-2],[-247,18,2],[-180,-5,5]],[47,35],'human',59,37,{depth:.78});
    ellipsoid([-139,-3,8],[109,68,39],.36,'human',33,77);
    ellipsoid([-145,-37,27],[47,37,27],-.22,'human',22,45);
    // Four curled fingers rest over the far hand. Their staggered tips preserve anatomy.
    const fingers=[
      {p:[[-73,-32,35],[-11,-4,48],[39,27,53],[48,46,45],[32,56,30]],r:[14.7,11.7]},
      {p:[[-77,2,37],[-11,36,52],[44,70,55],[49,88,44],[29,98,26]],r:[15.7,12.2]},
      {p:[[-91,37,30],[-28,74,43],[19,106,46],[20,124,34],[2,131,21]],r:[14.5,11.3]},
      {p:[[-111,67,18],[-61,100,31],[-20,130,37],[-21,145,26],[-38,147,15]],r:[12.3,9.3]}
    ];
    fingers.forEach(f=>tube(f.p,f.r,'human',43,25,{cap:true,depth:.94}));
    // Human thumb curves around the shoulder of the robotic palm.
    tube([[-152,-48,38],[-122,-80,47],[-84,-86,57],[-41,-63,71],[-5,-37,73],[9,-20,63]],[24,17],'human',47,27,{cap:true,depth:.92});
    // Skin folds and tendon ridges are restrained, curved particle contours.
    line([[-249,5,36],[-223,9,42],[-207,18,42]],'human',3.3,.6);
    line([[-237,27,34],[-215,29,41],[-197,39,39]],'human',3.3,.6);
    line([[-172,10,48],[-138,25,49],[-108,48,42]],'human',3.6,.55);
    fingers.forEach((f,i)=>{const q=f.p[2];line([[q[0]-10,q[1]-6,q[2]+12],[q[0]-4,q[1],q[2]+15],[q[0]+2,q[1]+5,q[2]+12]],'human',2.8,.62);});
    // Robot arm: an orthogonal longitudinal lattice and inset armour panels.
    tube([[408,-102,-18],[328,-73,-15],[252,-44,-13],[185,-21,-11]],[45,38],'robot',65,40,{depth:.82,facets:8,bands:[.08,.82,.89]});
    tube([[194,-23,-11],[168,-16,-10]],[40,40],'robot',9,42,{depth:.87,facets:12,bands:[.08,.85],detail:1});
    ellipsoid([105,-2,-16],[93,61,28],-.35,'robot',28,62);
    // Front carapace: geometric plate boundary with bolt heads and recessed ribs.
    line([[183,-43,18],[121,-57,17],[61,-28,16],[63,19,18],[116,38,18],[167,12,20],[183,-43,18]],'robot',2.7,1);
    line([[159,-30,21],[120,-39,20],[83,-18,21],[84,10,22],[116,23,22],[151,7,22],[159,-30,21]],'robot',3,.65);
    for(let k=0;k<3;k++)line([[240+k*6,-58+k*14,15],[338+k*6,-89+k*14,17]],'robot',4,.7);
    // Fingers curl behind the organic palm; only distal knuckles emerge.
    for(let i=0;i<4;i++) {
      const y=7+i*24;
      tube([[132,y-32,-30],[90,y+14,-42],[33,y+34,-43],[-28,y+30,-26],[-52,y+11,-4]],[14.4-i*.7,10.9-i*.5],'robot',35,18,{cap:true,facets:8,bands:[.30,.57,.78],depth:.85});
    }
    // Articulated opposing thumb: three rigid links with visible rotary joints.
    const thumb=[[109,-45,22],[60,-93,42],[15,-98,64],[-27,-67,84],[-62,-26,87]];
    for(let i=0;i<thumb.length-1;i++) {
      const a=thumb[i],b=thumb[i+1],d=sub(b,a);
      tube([add(a,mul(d,.10)),add(a,mul(d,.88))],[i===0?20:17, i===3?12:16],'robot',15,22,{cap:i===3,facets:8,depth:.83,bands:[.08,.85]});
    }
    for(let i=1;i<4;i++){
      const p=thumb[i];ellipsoid(p,[17,17,13],0,'robot',15,30,1);ring([p[0],p[1],p[2]+13],[0,0,1],11,'robot',2);
    }
    // Recessed palm fasteners are deliberately much smaller than thumb actuators.
    [[151,-30,24],[120,20,25],[76,-17,22]].forEach(p=>ring(p,[0,0,1],4,'robot'));
    return points;
  }
  const geometry=sculpture();
  document.querySelectorAll('canvas[data-handshake-field]').forEach((canvas,index)=>{
    if(canvas.dataset.handshakeInitialized)return;
    let ctx;try{ctx=canvas.getContext('2d',{alpha:false});}catch(_){return;}
    if(!ctx)return;
    const host=canvas.closest('.handshake-stage')||canvas.parentElement;
    canvas.dataset.handshakeInitialized='true';canvas.tabIndex=0;canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label','Interactive three-dimensional particle sculpture: an organic human hand clasps a segmented robotic hand. Drag horizontally to rotate, or tap to send a pulse.');
    const help=document.createElement('span');help.className='handshake-sr-only';help.id=`handshake-help-${index}`;help.textContent='Drag horizontally to rotate the sculpture. Vertical touch gestures scroll the page. Arrow keys change the view; Enter sends a contact pulse; R resets. Conceptual artwork, not a robot simulation.';host.append(help);canvas.setAttribute('aria-describedby',help.id);
    const key=document.createElement('div');key.className='handshake-key';key.setAttribute('aria-hidden','true');key.innerHTML='<span class="handshake-human">HUMAN</span><span class="handshake-hint">Drag to rotate · Tap to connect</span><span class="handshake-robot">ROBOT</span>';host.append(key);
    let w=0,h=0,dpr=1,compact=false,handle=0,last=0,clock=0,frame=0,inView=true,interactions=0;
    let yaw=.08,pitch=-.13,roll=-.035,targetYaw=.08,targetPitch=-.13,pulse=-20,reconnect=-20;
    let drag=null,hover={x:-9999,y:-9999,strength:0,target:0},depthBuffer=new Float32Array(1),zw=1,zh=1;
    const state=(k,v)=>{host.dataset[k]=String(v);canvas.dataset[k]=String(v);};
    const allowed=()=>inView&&!document.hidden&&w>0&&h>0;
    const mark=type=>{state('handshakeInteraction',type);state('handshakeInteractions',++interactions);};
    function rotated(p,ca,sa,cb,sb,cc,sc){const x=p[0]*ca+p[2]*sa,z=p[2]*ca-p[0]*sa,y=p[1]*cb-z*sb,zz=p[1]*sb+z*cb;return[x*cc-y*sc,x*sc+y*cc,zz];}
    function draw(){
      ctx.fillStyle=BG;ctx.fillRect(0,0,w,h);
      const halo=ctx.createRadialGradient(w*.49,h*.49,0,w*.49,h*.49,Math.max(w*.43,h*.45));halo.addColorStop(0,'rgba(222,227,234,.38)');halo.addColorStop(.65,'rgba(232,229,235,.16)');halo.addColorStop(1,'rgba(246,245,241,0)');ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
      const ca=Math.cos(yaw),sa=Math.sin(yaw),cb=Math.cos(pitch),sb=Math.sin(pitch),cc=Math.cos(roll+(compact?-.11:0)),sc=Math.sin(roll+(compact?-.11:0));
      // A closer mobile framing favours the grasp; all fingers and both wrists remain visible.
      const scale=Math.min(w/(compact?660:925),(h-65)/(compact?430:360)),cy=h*.45;
      const age=clock-reconnect,gather=age>=0&&age<2.4?Math.sin(Math.PI*age/2.4)*.055:0;
      const cloud=[],light=unit([-.4,-.55,1]);depthBuffer.fill(-1e6);
      for(let i=0;i<geometry.length;i++){
        const p=geometry[i],breath=Math.sin(clock*.32+p.phase)*.28;
        let xyz=[p.p[0],p.p[1]+breath,p.p[2]];
        if(gather){xyz[0]+=Math.sin(p.phase)*gather*76;xyz[1]+=Math.cos(p.phase)*gather*54;xyz[2]+=Math.sin(p.phase*1.3)*gather*75;}
        const q=rotated(xyz,ca,sa,cb,sb,cc,sc),n=rotated(p.n,ca,sa,cb,sb,cc,sc);
        if(n[2]<-.16&&p.detail<3)continue;
        const perspective=950/(950-q[2]),x=w*.5+q[0]*scale*perspective,y=cy+q[1]*scale*perspective;
        const sx=Math.floor(x/3),sy=Math.floor(y/3),z=q[2];
        if(sx<0||sx>=zw||sy<0||sy>=zh)continue;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const ix=sx+dx,iy=sy+dy;if(ix>=0&&ix<zw&&iy>=0&&iy<zh){const cell=iy*zw+ix;if(z>depthBuffer[cell])depthBuffer[cell]=z;}}
        cloud.push({p,q,n,x,y,sx,sy,perspective,lum:clamp(dot(n,light),0,1)});
      }
      const buckets=Array.from({length:40},()=>[]);
      const pulseAge=clock-pulse;
      for(let i=0;i<cloud.length;i++){
        const a=cloud[i],{p,q,n}=a;
        if(q[2]<depthBuffer[a.sy*zw+a.sx]-13&&p.detail<3)continue;
        if(compact&&p.detail===0&&p.seed>.82)continue;
        const traveling=pulseAge>=0&&pulseAge<2.7?Math.exp(-Math.pow((Math.abs(p.p[0]+18)/430)-pulseAge*.55,2)*75):0;
        const edge=1-Math.abs(n[2]),alpha=clamp((.18+a.lum*.51+edge*.14)*(.78+clamp(q[2]/120,0,.22))+(p.detail===3?.15:p.detail===2?.13:0)+traveling*.3,.13,.94);
        const radius=clamp((compact?.64:.76)*p.r*a.perspective+(p.detail===2?.12:0)+traveling*.18,.43,1.35);
        let x=a.x,y=a.y;
        if(!drag&&hover.strength>.01){const dx=x-hover.x,dy=y-hover.y,d=Math.hypot(dx,dy);if(d>1&&d<72){const f=(1-d/72)**2*hover.strength*2;x+=dx/d*f;y+=dy/d*f;}}
        const bin=Math.min(19,Math.round(alpha*20));buckets[(p.kind==='human'?0:20)+bin].push([x,y,radius]);
      }
      // Depth-tested points can be batched into a few paths instead of thousands of draw calls.
      for(let b=0;b<buckets.length;b++){if(!buckets[b].length)continue;const col=b<20?HUMAN:ROBOT;ctx.fillStyle='rgba('+col.join(',')+','+((b%20)/20)+')';ctx.beginPath();for(const [x,y,r] of buckets[b]){ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,TAU);}ctx.fill();}
      // Keep the quiet interaction legend readable even at the steepest view.
      const footer=ctx.createLinearGradient(0,h-78,0,h-34);footer.addColorStop(0,'rgba(246,245,241,0)');footer.addColorStop(1,BG);ctx.fillStyle=footer;ctx.fillRect(0,h-78,w,78);
      frame++;state('handshakeReady',true);state('handshakeFrame',frame);state('handshakePoints',geometry.length);state('handshakeAggregation',1-gather);state('handshakeMorph',gather>.005?'reconnecting':'clasped');state('handshakeYaw',yaw.toFixed(3));state('handshakePitch',pitch.toFixed(3));
    }
    function tick(now){handle=0;if(!allowed()){state('handshakeRunning',false);return;}if(!last)last=now;const delta=(now-last)/1000;if(delta>1/(compact?25:30)){last=now;const dt=Math.min(delta,.08);clock+=dt;const ease=1-Math.exp(-dt*5);yaw+=(targetYaw+Math.sin(clock*.16)*.035-yaw)*ease;pitch+=(targetPitch+Math.sin(clock*.13)*.016-pitch)*ease;hover.strength+=(hover.target-hover.strength)*ease;draw();}state('handshakeRunning',true);handle=requestAnimationFrame(tick);}
    function stop(){if(handle)cancelAnimationFrame(handle);handle=0;last=0;state('handshakeRunning',false);}
    function resume(){if(allowed()&&!handle){last=0;handle=requestAnimationFrame(tick);}state('handshakeRunning',allowed());}
    function resize(){const r=canvas.getBoundingClientRect();const nw=Math.round(r.width),nh=Math.round(r.height),nd=Math.min(devicePixelRatio||1,2);if(!nw||!nh){w=nw;h=nh;stop();return;}if(w===nw&&h===nh&&dpr===nd)return;w=nw;h=nh;dpr=nd;compact=w<700;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);zw=Math.ceil(w/3);zh=Math.ceil(h/3);depthBuffer=new Float32Array(zw*zh);draw();resume();}
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=canvas.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:targetYaw,pitch:targetPitch,moved:false,touch:e.pointerType==='touch'};hover.x=e.clientX-r.left;hover.y=e.clientY-r.top;canvas.classList.add('is-dragging');if(e.pointerType!=='touch')canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();hover.x=e.clientX-r.left;hover.y=e.clientY-r.top;hover.target=1;if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)>4||Math.abs(dy)>4)drag.moved=true;targetYaw=clamp(drag.yaw+dx/Math.max(260,w)*1.35,-.62,.62);if(!drag.touch)targetPitch=clamp(drag.pitch-dy/Math.max(260,h)*.65,-.38,.34);mark('rotate');},{passive:true});
    function release(e){if(!drag||drag.id!==e.pointerId)return;if(!drag.moved&&e.type==='pointerup'){pulse=clock;reconnect=clock;mark('pulse');}drag=null;canvas.classList.remove('is-dragging');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
    canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',()=>{drag=null;canvas.classList.remove('is-dragging');});canvas.addEventListener('pointerleave',()=>{hover.target=0;});
    canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();targetYaw=clamp(targetYaw+(e.key==='ArrowLeft'?-.08:e.key==='ArrowRight'?.08:0),-.62,.62);targetPitch=clamp(targetPitch+(e.key==='ArrowUp'?-.06:e.key==='ArrowDown'?.06:0),-.38,.34);mark('keyboard');}else if(e.key==='Enter'||e.key===' '){e.preventDefault();pulse=clock;reconnect=clock;mark('pulse');}else if(e.key.toLowerCase()==='r'){e.preventDefault();targetYaw=.08;targetPitch=-.13;hover.target=0;mark('reset');}});
    if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;inView?resume():stop();},{rootMargin:'80px'}).observe(canvas);
    let timer;if(typeof ResizeObserver==='function')new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(resize,50);}).observe(host);
    window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(resize,70);},{passive:true});document.addEventListener('visibilitychange',()=>document.hidden?stop():resume());window.addEventListener('pagehide',stop);window.addEventListener('pageshow',resume);resize();
  });
})();


