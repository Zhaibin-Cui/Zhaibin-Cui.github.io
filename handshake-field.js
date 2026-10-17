/* Original human–robot handshake, drawn entirely with particles.
 * A conceptual illustration of interaction, not a learned model or robot demo.
 * No external images, libraries, device telemetry or remote dependencies.
 */
(() => {
  'use strict';
  const TAU=Math.PI*2,BLUE=[53,91,141],VIOLET=[108,82,148];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const fract=x=>x-Math.floor(x);
  const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${clamp(a,0,1).toFixed(3)})`;
  const ROBOT='M925 177 L754 226 C726 208 700 196 676 202 L619 218 L563 187 C544 177 525 181 509 195 L440 256 C425 270 425 289 439 300 C454 311 472 306 486 294 L524 262 L557 284 L621 329 C640 342 659 349 682 345 L728 335 L967 280 Z';
  const HUMAN='M75 405 L260 232 C292 211 321 207 349 217 L393 239 C421 229 445 219 467 227 L551 279 C566 288 577 302 570 316 C566 326 552 333 541 327 L501 304 L570 346 C584 355 590 369 581 380 C573 391 559 391 548 384 L489 344 L551 389 C563 399 565 413 555 424 C546 433 533 434 522 426 L467 386 L508 421 C518 431 517 446 507 455 C496 464 483 461 472 453 L395 398 C364 377 340 358 317 342 C300 330 285 328 269 335 L153 490 Z';
  const THUMB='M619 218 L563 187 C544 177 525 181 509 195 L440 256 C425 270 425 289 439 300 C454 311 472 306 486 294 L524 262 L557 284 L593 262 Z';
  const DETAILS=[
    {d:'M319 242 C345 252 357 276 358 307 M269 335 L281 285 M417 290 L480 332 M410 337 L467 386',kind:'human',layer:1},
    {d:'M285 239 C305 258 311 284 306 310 M360 347 C382 354 405 370 424 386',kind:'human',layer:1,soft:true},
    {d:'M754 226 L728 335 M790 215 L767 347 M802 232 L904 202 L924 260 L783 302 Z',kind:'robot',layer:0},
    {d:'M618 238 L675 220 L718 242 L700 310 L656 324 L603 290 Z M634 246 L679 234 L702 248 L686 297 L657 307 L620 282 Z',kind:'robot',layer:0},
    {d:'M815 244 L898 220 M808 263 L905 235 M802 282 L912 251',kind:'robot',layer:0,soft:true},
    {d:'M586 210 L548 245 M476 251 L497 274 M566 209 L535 239 M459 265 L481 287',kind:'robot',layer:2},
    {d:'M508 208 L529 230 M491 224 L514 246',kind:'robot',layer:2,soft:true}
  ];
  function makeGeometry(compact){
    const scratch=document.createElement('canvas'),ctx=scratch.getContext('2d');
    if(!ctx||typeof Path2D==='undefined')return [];
    const shapes=[{d:ROBOT,kind:'robot',z:-6},{d:HUMAN,kind:'human',z:3},{d:THUMB,kind:'robot',z:19}];
    shapes.forEach(s=>{s.path=new Path2D(s.d);});
    const points=[];let serial=0;
    const blocked=(x,y,layer)=>shapes.some((s,j)=>j>layer&&ctx.isPointInPath(s.path,x,y));
    const add=(x,y,z,kind,alpha,r=1,layer=0)=>{
      const id=serial++;points.push({x:x-505,y:y-327,z,kind,alpha,r,phase:fract(id*.61803398875)*TAU,
        scatterX:(x-505)*1.04+Math.sin(id*.75487)*27,scatterY:Math.sin((x-505)*.011+id*.019)*58+Math.cos(id*.4142)*48,
        scatterZ:Math.sin(id*.56984)*59,layer});
    };
    // Curved surface depth rather than a uniformly filled silhouette.
    const fingers=[{a:[480,285],b:[554,310],r:20},{a:[477,325],b:[565,365],r:20},{a:[462,364],b:[540,406],r:20},{a:[443,397],b:[494,440],r:18}];
    function cylinder(x,y,a,b,r){
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),along=((x-a[0])*dx+(y-a[1])*dy)/(length*length);
      if(along<-.05||along>1.12)return 0;
      const dist=Math.abs((x-a[0])*dy-(y-a[1])*dx)/length;
      return Math.sqrt(Math.max(0,1-(dist/r)**2));
    }
    function surface(x,y,kind,layer){
      if(kind==='human'){
        const palm=Math.sqrt(Math.max(0,1-((x-376)/116)**2-((y-296)/103)**2));
        const arm=cylinder(x,y,[121,449],[280,289],64);
        const finger=Math.max(...fingers.map(f=>cylinder(x,y,f.a,f.b,f.r)));
        return 5+Math.max(palm*52,arm*28,finger*33);
      }
      if(layer===2)return 23+24*cylinder(x,y,[453,282],[550,211],27);
      return 8+(y<257?17:7)+Math.sin(x*.012)*3;
    }
    const spacing=compact?11.4:9.0;
    shapes.forEach((s,layer)=>{
      for(let gy=179;gy<492;gy+=spacing)for(let gx=74;gx<969;gx+=spacing){
        const jitter=s.kind==='human'?.72:.26;
        const x=gx+(fract(gx*gy*.017)-.5)*spacing*jitter,y=gy+(fract(gx*1.97+gy*.63)-.5)*spacing*jitter;
        if(!ctx.isPointInPath(s.path,x,y)||blocked(x,y,layer))continue;
        const z=surface(x,y,s.kind,layer),front=clamp((z-6)/51,0,1);
        add(x,y,z,s.kind,(s.kind==='human'?.34:.33)+front*.25,.70+fract(x*.31+y*.77)*.22+front*.18,layer);
      }
      const contour=document.createElementNS('http://www.w3.org/2000/svg','path');contour.setAttribute('d',s.d);
      const length=contour.getTotalLength(),step=compact?5.5:4.4;
      for(let d=0;d<length;d+=step){const p=contour.getPointAtLength(d);if(blocked(p.x,p.y,layer))continue;add(p.x,p.y,s.z+10,s.kind,.84,1.02,layer);
        if(Math.floor(d/step)%3===0)add(p.x-.7,p.y+2.1,s.z-12,s.kind,.20,.65,layer);
      }
    });
    DETAILS.forEach(detail=>{
      const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',detail.d);
      const length=p.getTotalLength();for(let d=0;d<length;d+=compact?5.2:3.7){const q=p.getPointAtLength(d);if(blocked(q.x,q.y,detail.layer))continue;add(q.x,q.y,detail.layer===2?31:24,detail.kind,detail.soft?.33:.69,.83,detail.layer);}
    });
    // Cross-sectional particles bend over flesh and articulated metal, giving the
    // contact a readable volume without wireframe strokes or opaque surfaces.
    const section=(a,b,r,count,kind,layer,opacity)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
      for(let k=0;k<count;k++){
        const along=(k+.6)/(count+.2),cx=mix(a[0],b[0],along),cy=mix(a[1],b[1],along),n=compact?9:13;
        for(let j=0;j<n;j++){
          const t=-.94+j/(n-1)*1.88,bend=Math.sqrt(Math.max(0,1-t*t));
          const x=cx-uy*r*t+ux*bend*6,y=cy+ux*r*t+uy*bend*6;
          if(!ctx.isPointInPath(shapes[layer].path,x,y)||blocked(x,y,layer))continue;
          add(x,y,surface(x,y,kind,layer)+2,kind,opacity+(.13*bend),.67+(.24*bend),layer);
        }
      }
    };
    section([143,427],[271,295],57,compact?6:9,'human',1,.21);
    fingers.forEach(f=>section(f.a,f.b,f.r*.91,compact?3:4,'human',1,.27));
    section([450,283],[547,211],24,compact?5:7,'robot',2,.39);
    section([788,272],[918,231],37,compact?5:7,'robot',0,.26);
    for(const d of [
      'M312 253 C337 248 366 263 384 291',
      'M320 277 C354 271 385 291 409 322',
      'M341 304 C375 300 409 320 435 349',
      'M364 331 C394 327 425 347 454 372'
    ]){
      const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);
      for(let t=0;t<p.getTotalLength();t+=compact?7:5.8){const q=p.getPointAtLength(t);if(blocked(q.x,q.y,1))continue;add(q.x,q.y,surface(q.x,q.y,'human',1)+3,'human',.28,.78,1);}
    }
    // Recessed fasteners and a thumb hinge distinguish the articulated hand.
    for(const [x,y,r,layer] of [[680,235,5,0],[692,291,5,0],[632,275,5,0],[550,216,10,2],[487,267,8,2],[771,270,9,0]]){
      for(let i=0;i<(compact?14:22);i++){const a=i/(compact?14:22)*TAU,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(!blocked(px,py,layer))add(px,py,layer===2?33:25,'robot',.78,.88,layer);}
      if(!blocked(x,y,layer))add(x,y,layer===2?33:25,'robot',.56,1,layer);
    }
    return points;
  }
  document.querySelectorAll('canvas[data-handshake-field]').forEach((canvas,index)=>{
    if(canvas.dataset.handshakeInitialized)return;
    const host=canvas.closest('.handshake-stage')||canvas.parentElement;
    let ctx;try{ctx=canvas.getContext('2d',{alpha:false});}catch(_){return;}
    if(!ctx)return;
    canvas.dataset.handshakeInitialized='true';canvas.tabIndex=0;canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label','A human hand and an articulated robotic hand clasp, formed from blue and violet particles. Conceptual artwork.');
    const help=document.createElement('span');help.className='handshake-sr-only';help.id=`handshake-help-${index}`;
    help.textContent='Move over the illustration to change the view and displace nearby particles. Arrow keys adjust the view; Enter sends a light pulse; R resets. The artwork does not simulate a robot or a world model.';
    host.append(help);canvas.setAttribute('aria-describedby',help.id);
    let width=0,height=0,dpr=1,compact=false,particles=[],frame=0,handle=0,time=0,last=0,lastDraw=0,inView=true;
    let yaw=.10,pitch=-.14,targetYaw=0,targetPitch=0,pulse=-10,interactions=0;
    let pointer={x:-9999,y:-9999,power:0,target:0},resizeTimer;
    const status=value=>{host.dataset.handshakeRunning=String(value);canvas.dataset.handshakeRunning=String(value);};
    const allowed=()=>inView&&!document.hidden&&width>0&&height>0;
    function project(x,y,z){
      const ca=Math.cos(yaw),sa=Math.sin(yaw),ct=Math.cos(pitch),st=Math.sin(pitch);
      const xx=x*ca+z*sa,zz=z*ca-x*sa,yy=y*ct-zz*st,depth=y*st+zz*ct;
      const scale=Math.min(width/(compact?680:1000),height/410),perspective=1/(1+depth*.0008);
      return {x:width*.50+xx*scale*perspective,y:height*.51+yy*scale*perspective,depth,scale};
    }
    function render(){
      ctx.fillStyle='#f6f5f1';ctx.fillRect(0,0,width,height);
      const glow=ctx.createRadialGradient(width*.5,height*.51,0,width*.5,height*.51,width*.48);
      glow.addColorStop(0,'rgba(216,223,237,.24)');glow.addColorStop(.65,'rgba(226,220,235,.10)');glow.addColorStop(1,'rgba(246,245,241,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
      const cycle=time%32,gathered=cycle<26?1:cycle<29?mix(1,.68,smooth((cycle-26)/3)):mix(.68,1,smooth((cycle-29)/3));
      const pulseAge=time-pulse,cloud=[];
      for(const p of particles){
        const breathe=Math.sin(time*.4+p.phase)*.65,swirl=time*.16+p.phase;
        const x=mix(p.scatterX+Math.sin(swirl)*10,p.x,gathered);
        const y=mix(p.scatterY+Math.cos(swirl)*13,p.y+breathe,gathered);
        const z=mix(p.scatterZ,p.z+Math.sin(time*.23+p.phase)*1.8,gathered),q=project(x,y,z);
        const dx=q.x-pointer.x,dy=q.y-pointer.y,d=Math.hypot(dx,dy),reach=compact?58:95;
        if(d<reach&&d>1){const strength=Math.pow(1-d/reach,2)*9*pointer.power;q.x+=dx/d*strength;q.y+=dy/d*strength;}
        const wave=pulseAge>=0&&pulseAge<3?Math.exp(-Math.pow((p.x/470+1)/2-pulseAge*.5,2)*60):0;
        cloud.push({q,p,a:clamp(p.alpha*(.6+.4*gathered)*(1+q.depth*.002)+wave*.28,.05,.92),r:(compact?.7:.82)*p.r+wave*.18});
      }
      cloud.sort((a,b)=>a.p.layer-b.p.layer||a.q.depth-b.q.depth);
      for(const {q,p,a,r} of cloud){ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.45,r),0,TAU);ctx.fillStyle=rgba(p.kind==='human'?BLUE:VIOLET,a);ctx.fill();}
      frame++;host.dataset.handshakeReady='true';host.dataset.handshakeFrame=String(frame);host.dataset.handshakePoints=String(particles.length);host.dataset.handshakeAggregation=gathered.toFixed(3);host.dataset.handshakeMorph=gathered>.98?'clasped':'gathering';
      canvas.dataset.handshakeReady='true';canvas.dataset.handshakeFrame=String(frame);
    }
    function tick(now){
      handle=0;if(!allowed()){status(false);return;}
      if(!last){last=now;lastDraw=now;}
      const interval=1000/(compact?28:32),elapsed=now-last;
      if(elapsed>=interval){const delta=Math.min((now-lastDraw)/1000,.10);time+=delta;last=now-elapsed%interval;lastDraw=now;
        const ease=1-Math.exp(-delta*4);yaw+=(targetYaw+.10+Math.sin(time*.13)*.035-yaw)*ease;pitch+=(targetPitch-.14+Math.cos(time*.11)*.026-pitch)*ease;pointer.power+=(pointer.target-pointer.power)*ease;render();}
      status(true);handle=requestAnimationFrame(tick);
    }
    function resume(){if(allowed()&&!handle){last=0;lastDraw=0;handle=requestAnimationFrame(tick);}status(allowed());}
    function stop(){if(handle)cancelAnimationFrame(handle);handle=0;last=0;lastDraw=0;status(false);}
    function prepare(){
      const rect=canvas.getBoundingClientRect(),w=Math.round(rect.width),h=Math.round(rect.height),ratio=Math.min(window.devicePixelRatio||1,2),next=w<700;
      if(!w||!h){width=w;height=h;stop();return;}
      if(w===width&&h===height&&ratio===dpr)return;
      if(!particles.length||next!==compact)particles=makeGeometry(next);
      width=w;height=h;compact=next;dpr=ratio;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);render();resume();
    }
    function interact(type){interactions++;host.dataset.handshakeInteractions=String(interactions);host.dataset.handshakeInteraction=type;}
    canvas.addEventListener('pointermove',event=>{
      const r=canvas.getBoundingClientRect();pointer.x=event.clientX-r.left;pointer.y=event.clientY-r.top;pointer.target=1;
      targetYaw=(pointer.x/width-.5)*.20;targetPitch=-(pointer.y/height-.5)*.13;interact('pointer');
    },{passive:true});
    canvas.addEventListener('pointerleave',()=>{pointer.target=0;targetYaw=0;targetPitch=0;},{passive:true});
    canvas.addEventListener('pointercancel',()=>{pointer.target=0;targetYaw=0;targetPitch=0;},{passive:true});
    canvas.addEventListener('keydown',event=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();targetYaw=clamp(targetYaw+(event.key==='ArrowLeft'?-.045:event.key==='ArrowRight'?.045:0),-.25,.25);targetPitch=clamp(targetPitch+(event.key==='ArrowUp'?-.035:event.key==='ArrowDown'?.035:0),-.18,.18);interact('keyboard');}
      else if(event.key==='Enter'||event.key===' '){event.preventDefault();pulse=time;interact('pulse');}
      else if(event.key.toLowerCase()==='r'){event.preventDefault();targetYaw=0;targetPitch=0;pointer.target=0;pulse=-10;interact('reset');}
    });
    if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)resume();else stop();},{rootMargin:'60px'}).observe(canvas);
    if(typeof ResizeObserver==='function')new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(prepare,60);}).observe(host);
    window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(prepare,80);},{passive:true});
    document.addEventListener('visibilitychange',()=>document.hidden?stop():resume());
    window.addEventListener('pagehide',stop);window.addEventListener('pageshow',resume);
    prepare();
  });
})();

