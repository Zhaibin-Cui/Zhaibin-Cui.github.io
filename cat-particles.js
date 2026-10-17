/* Original three-dimensional point sculpture for Schrödinger's thought experiment.
 * Silhouette study: The Met, seated cat, object 44.4.9 (public-domain sculpture).
 * https://www.metmuseum.org/art/collection/search/546218
 * Physics context: https://www.nobelprize.org/prizes/physics/2012/popular-information/
 * The classical outcome sampler lives in quantum-playground.js. This artwork
 * illustrates its labels; it does not model a cat, coherence or decoherence.
 */
(() => {
  'use strict';
  const TAU=Math.PI*2, BG='#f6f5f1';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>mul(a,1/(Math.hypot(...a)||1)),fract=x=>x-Math.floor(x);
  function curve(p,t){const f=clamp(t,0,.999999)*(p.length-1),i=Math.floor(f),u=f-i,a=p[Math.max(0,i-1)],b=p[i],c=p[Math.min(p.length-1,i+1)],d=p[Math.min(p.length-1,i+2)];return b.map((v,k)=>.5*((2*v)+(-a[k]+c[k])*u+(2*a[k]-5*v+4*c[k]-d[k])*u*u+(-a[k]+3*v-3*c[k]+d[k])*u*u*u));}
  function sculpture(rest=false){
    const pts=[],solids=[];let serial=0;
    const point=(p,n=[0,0,1],kind='skin',r=1)=>pts.push({p,n,kind,r,id:serial++,phase:fract(serial*.754877666)*TAU});
    function ellipsoid(c,r,rows=35,cols=75,kind='skin',rz=0){
      const cr=Math.cos(rz),sr=Math.sin(rz);
      solids.push({c,r,cr,sr});
      const count=Math.round(rows*cols*.65);
      for(let i=0;i<count;i++){
        const u=Math.acos(1-2*(i+.5)/count),v=i*2.399963229728653;
        const q=[Math.sin(u)*Math.cos(v),Math.cos(u),Math.sin(u)*Math.sin(v)],p=q.map((x,k)=>x*r[k]),n=unit(q.map((x,k)=>x/r[k]));
        if(kind==='head')p[2]+=Math.pow(Math.max(0,q[2]),5)*8*Math.exp(-((p[0]/18)**2)-((p[1]+10)/14)**2);
        point([c[0]+p[0]*cr-p[1]*sr,c[1]+p[0]*sr+p[1]*cr,c[2]+p[2]],[n[0]*cr-n[1]*sr,n[0]*sr+n[1]*cr,n[2]],kind==='head'?'skin':kind);
      }
    }
    function tube(path,radius,rows=65,sides=22,kind='skin'){
      for(let i=0;i<=rows;i++){
        const t=i/rows,c=curve(path,t),d=unit(sub(curve(path,Math.min(1,t+.002)),curve(path,Math.max(0,t-.002)))),u=unit(cross(d,Math.abs(d[2])>.9?[0,1,0]:[0,0,1])),v=cross(d,u),rr=typeof radius==='function'?radius(t):radius;
        for(let j=0;j<sides;j++){const a=(j+(i%2)*.5)/sides*TAU,n=add(mul(u,Math.cos(a)),mul(v,Math.sin(a)));point(add(c,mul(n,rr)),n,kind);}
      }
    }
    function line(path,kind='detail',r=.78,spacing=2.2){const length=path.slice(1).reduce((s,p,i)=>s+Math.hypot(...sub(p,path[i])),0),count=Math.ceil(length/spacing);for(let i=0;i<=count;i++)point(curve(path,i/count),[0,0,1],kind,r);}
    function ear(a,b,c,depth=7){
      // Two softly convex triangular surfaces, rather than cone-shaped horns.
      const n0=unit(cross(sub(b,a),sub(c,a))),n=n0[2]<0?mul(n0,-1):n0,rows=22;
      for(let face=0;face<2;face++)for(let i=0;i<=rows;i++)for(let j=0;j<=rows-i;j++){
        const u=i/rows,v=j/rows,w=1-u-v;
        const p=a.map((x,k)=>x*w+b[k]*u+c[k]*v+(k===2?(face?-depth:Math.sin(Math.PI*u)*Math.sin(Math.PI*v)*depth):0));
        point(p,face?mul(n,-1):n,face?'skin':'ear',.86);
      }
      line([a,b,c], 'ear-edge',.82,2.4);
    }
    function face(c,scale=1,closed=false){
      const tr=p=>[c[0]+p[0]*scale,c[1]+p[1]*scale,c[2]+p[2]*scale];
      for(const side of [-1,1]){
        const cx=side*16;
        const upper=[[cx-side*8,5,1],[cx-side*2,10,3],[cx+side*5,11,3],[cx+side*10,9,1]].map(tr);
        const lower=[[cx-side*8,5,1],[cx-side*2,3,3],[cx+side*5,4,3],[cx+side*10,9,1]].map(tr);
        line(closed?[[cx-8,6,2],[cx,2,4],[cx+8,6,2]].map(tr):upper,'eye',.95,1.7);
        if(!closed){line(lower,'eye',.82,1.8);line([[cx,3,4],[cx+.5,8,4]].map(tr),'eye',1.14,1);}
      }
      line([[-4,-7,9],[0,-10,11],[4,-7,9],[-4,-7,9]].map(tr),'nose',1,1.1);
      line([[0,-10,11],[0,-15,11],[-5,-17,9],[-9,-14,6]].map(tr),'muzzle',.73,1.8);
      line([[0,-15,11],[5,-17,9],[9,-14,6]].map(tr),'muzzle',.73,1.8);
      for(const side of [-1,1])for(let k=0;k<3;k++)line([[side*11,-10-k*3,8],[side*27,-9-k*5,8],[side*(49-k*3),-7-k*8,4]].map(tr),'whisker',.67,2.6);
    }
    if(!rest){
      // A narrow neck and straight forelegs make the seated silhouette feline.
      ellipsoid([0,-17,-12],[47,77,39],49,88);
      ellipsoid([0,52,2],[27,62,29],41,68);
      ellipsoid([-30,-57,4],[27,38,31],31,56);
      ellipsoid([30,-57,4],[27,38,31],31,56);
      tube([[-17,31,20],[-18,-15,29],[-17,-55,36],[-18,-87,42]],t=>mix(10,7.2,t),46,22);
      tube([[17,31,20],[18,-15,29],[17,-55,36],[18,-87,42]],t=>mix(10,7.2,t),46,22);
      ellipsoid([-18,-88,47],[12,8,18],16,37);
      ellipsoid([18,-88,47],[12,8,18],16,37);
      // The round haunch and sweeping tail are visible outside the two front legs.
      tube([[40,-63,-8],[66,-77,10],[78,-88,43],[44,-95,68],[-6,-96,73],[-48,-91,61],[-58,-79,48]],t=>8*(1-.70*t)+1.4,101,21,'tail');
      ellipsoid([0,109,11],[36,35,29],51,99,'head');
      ear([-34,117,18],[-38,159,7],[-9,137,25],8);
      ear([9,137,25],[38,159,7],[34,117,18],8);
      face([0,111,35]);
      // Small paw divisions and cheek tufts replace decorative fur noise.
      for(const x of [-22,-14,14,22])line([[x,-88,61],[x,-84,61],[x,-81,57]],'crease',.62,2.1);
      for(const side of [-1,1]){
        line([[side*28,94,25],[side*34,89,20],[side*27,86,26]],'crease',.65,2.2);
        line([[side*15,72,28],[side*19,50,29],[side*13,31,30]],'crease',.58,3);
      }
    }else{
      // The dead outcome is a still curled symbol, deliberately non-graphic.
      ellipsoid([-10,-56,-5],[75,39,45],39,100);
      ellipsoid([-45,-62,25],[34,28,33],28,56);
      tube([[52,-61,-15],[73,-74,15],[61,-89,53],[12,-98,69],[-38,-96,59],[-63,-84,42]],t=>mix(10,3,t),105,24,'tail');
      ellipsoid([48,-57,35],[30,27,25],33,67,'skin',-.20);
      ellipsoid([39,-69,57],[14,9,11],18,35);
      ear([27,-45,44],[26,-16,34],[47,-32,51],6);
      ear([51,-32,51],[72,-18,29],[72,-50,39],6);
      face([48,-56,58],.73,true);
      ellipsoid([26,-88,45],[24,8,16],18,42);
    }
    // Interior samples of overlapping anatomical volumes are discarded. This
    // keeps the surface continuous instead of showing a stack of wire spheres.
    return pts.filter(p=>!['skin','tail'].includes(p.kind)||!solids.some(s=>{
      const d=sub(p.p,s.c),x=d[0]*s.cr+d[1]*s.sr,y=-d[0]*s.sr+d[1]*s.cr;
      return (x/s.r[0])**2+(y/s.r[1])**2+(d[2]/s.r[2])**2<.965;
    }));
  }
  const seated=sculpture(),curled=sculpture(true);
  document.querySelectorAll('.qp-cat-art').forEach(host=>{
    const canvas=host.querySelector('.qp-cat-canvas'),panel=host.closest('[data-qp-panel="measurement"]');
    if(!canvas||!panel||host.dataset.catInitialized)return;
    let ctx;try{ctx=canvas.getContext('2d');}catch(e){return;}if(!ctx)return;
    host.dataset.catInitialized='true';host.dataset.catParticleCount=String(seated.length+curled.length);
    const pointer={x:0,y:0,active:0};
    let visible=true,handle=0,last=0,time=0,frame=0,opening=0,rest=0,yaw=-.40,pitch=.17,width=0,height=0;
    let state='prepared',transitionStart=0;
    function allowed(){return visible&&!document.hidden&&!panel.hidden&&host.getBoundingClientRect().width>0;}
    function resume(){if(allowed()&&!handle){last=0;handle=requestAnimationFrame(draw);}host.dataset.catRunning=String(allowed());}
    function stop(){if(handle)cancelAnimationFrame(handle);handle=0;last=0;host.dataset.catRunning='false';}
    function draw(now){
      handle=0;if(!allowed()){stop();return;}
      const dt=last?Math.min((now-last)/1000,.06):1/60;last=now;time+=dt;
      const next=panel.dataset.state||'prepared';if(next!==state){state=next;transitionStart=time;}
      const targetOpen=state==='prepared'?0:1,targetRest=state==='dead'?1:0;
      opening+=(targetOpen-opening)*(1-Math.exp(-dt*3.3));rest+=(targetRest-rest)*(1-Math.exp(-dt*4.2));
      pointer.active*=Math.exp(-dt*.8);
      yaw+=(-.40+pointer.x*.13*pointer.active+Math.sin(time*.18)*.035-yaw)*(1-Math.exp(-dt*3));
      pitch+=(.17+pointer.y*.055*pointer.active-pitch)*(1-Math.exp(-dt*3));
      const rect=host.getBoundingClientRect();width=rect.width;height=rect.height||width*.72;
      const dpr=Math.min(window.devicePixelRatio||1,2.5),cw=Math.round(width*dpr),ch=Math.round(height*dpr);
      if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
      const scale=Math.min(width/370,height/435),ox=width*.5,oy=height*.70;
      function rotate(p){const x=p[0]*cy+p[2]*sy,z=-p[0]*sy+p[2]*cy;return[x,p[1]*cp-z*sp,p[1]*sp+z*cp];}
      function project(p){const v=rotate(p),f=940/(940-v[2]);return[ox+v[0]*scale*f,oy-v[1]*scale*f,v[2],f];}
      const shadow=project([0,-104,15]);
      const gradient=ctx.createRadialGradient(shadow[0],shadow[1],0,shadow[0],shadow[1],100*scale);
      gradient.addColorStop(0,'rgba(88,109,139,.08)');gradient.addColorStop(1,'rgba(88,109,139,0)');
      ctx.save();ctx.translate(shadow[0],shadow[1]);ctx.scale(1,.24);ctx.fillStyle=gradient;ctx.translate(-shadow[0],-shadow[1]);ctx.beginPath();ctx.arc(shadow[0],shadow[1],100*scale,0,TAU);ctx.fill();ctx.restore();
      function edge(a,b,alpha=.36,spacing=4.7,colour='102,124,152'){
        const n=Math.ceil(Math.hypot(...sub(b,a))/spacing);
        for(let i=0;i<=n;i++){const p=project(a.map((v,k)=>mix(v,b[k],i/n)));ctx.fillStyle=`rgba(${colour},${alpha})`;ctx.beginPath();ctx.arc(p[0],p[1],Math.max(.48,.75*scale*p[3]),0,TAU);ctx.fill();}
      }
      // Architectural, transparent enclosure: the opening is a real hinged rotation.
      const bx=132,bz=58,top=165,bottom=-106;
      const corners=[[-bx,top,-bz],[bx,top,-bz],[bx,top,bz],[-bx,top,bz]];
      const base=corners.map(p=>[p[0],bottom,p[2]]);
      for(let i=0;i<4;i++){
        const rear=i<2;edge(base[i],base[(i+1)%4],rear?.16:.35);
        edge(base[i],corners[i],rear?.15:.26);
        if(i!==2)edge(corners[i],corners[(i+1)%4],.14);
      }
      const boxes=[];
      const alphaPrepared=.38+.62*opening;
      function collect(points,visibility,isRest){
        if(visibility<.012)return;
        for(const p of points){
          const pp=p.p.slice();
          if(!isRest){
            const breath=Math.sin(time*1.7)*.55*opening;
            pp[1]+=breath*smooth((pp[1]+80)/150);
            if(p.kind==='tail')pp[0]+=Math.sin(time*.85+p.p[0]*.018)*1.2*opening;
          }
          const n=rotate(p.n),detail=['eye','nose','muzzle','whisker','crease','ear-edge'].includes(p.kind);
          if(n[2]<-.05&&!detail)continue;
          const q=project(pp),light=clamp(.62+n[0]*-.18+n[1]*.16+n[2]*.14,.2,1);
          let a=(detail?.8:.20+.46*light)*visibility*alphaPrepared;
          if(p.kind==='ear')a*=.72;
          if(p.kind==='whisker')a*=.67;
          const radius=clamp((detail?.95:.87)*p.r*scale*q[3],.47,1.65);
          boxes.push({x:q[0],y:q[1],z:q[2],a,r:radius,kind:p.kind,detail});
        }
      }
      collect(seated,1-rest,false);collect(curled,rest,true);
      // Depth cells remove hidden surfaces without turning the drawing into a mesh.
      const cell=Math.max(2,2.8*scale),cols=Math.ceil(width/cell)+2,zbuf=new Float32Array(cols*(Math.ceil(height/cell)+2));zbuf.fill(-1e5);
      for(const p of boxes){const ix=Math.floor(p.x/cell),iy=Math.floor(p.y/cell);if(ix<0||iy<0||ix>=cols||iy>=zbuf.length/cols)continue;const k=iy*cols+ix;if(p.z>zbuf[k])zbuf[k]=p.z;}
      boxes.sort((a,b)=>a.z-b.z);
      for(const p of boxes){const ix=Math.floor(p.x/cell),iy=Math.floor(p.y/cell),k=iy*cols+ix;if(ix<0||iy<0||ix>=cols||k>=zbuf.length)continue;if(p.z<zbuf[k]-(p.detail?17:9))continue;
        const rgb=p.kind==='eye'||p.kind==='nose'?'46,68,95':p.kind==='ear'||p.kind==='ear-edge'?'126,111,143':p.kind==='tail'?'110,108,143':'79,109,145';
        ctx.fillStyle=`rgba(${rgb},${p.a})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill();
      }
      // A short easing delay lets the cover reveal the outcome before it settles.
      const angle=smooth(opening)*1.37;
      const lid=corners.map(p=>{const z=p[2]+bz;return[p[0],top+Math.sin(angle)*z,-bz+Math.cos(angle)*z];});
      const lp=lid.map(project);ctx.beginPath();lp.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=`rgba(222,229,239,${.12-.065*opening})`;ctx.fill();
      for(let i=0;i<4;i++){edge(lid[i],lid[(i+1)%4],.40,3.9);edge(add(lid[i],[0,-3,0]),add(lid[(i+1)%4],[0,-3,0]),.14,5.8);}
      // Minimal handle, attached to the lid and following its hinge.
      const handleZ=16,handleY=top+5;
      function lidPoint(x,z,y=handleY){const d=z+bz;return[x,top+(y-top)*Math.cos(angle)+Math.sin(angle)*d,-bz-(y-top)*Math.sin(angle)+Math.cos(angle)*d];}
      edge(lidPoint(-14,handleZ),lidPoint(14,handleZ),.4,3.1);
      edge(lidPoint(-14,handleZ,top),lidPoint(-14,handleZ),.32,2.5);
      edge(lidPoint(14,handleZ,top),lidPoint(14,handleZ),.32,2.5);
      frame++;host.dataset.catReady='true';host.dataset.catState=state;host.dataset.catFrame=String(frame);host.dataset.catRunning='true';
      host.dataset.catOpening=opening.toFixed(3);host.dataset.catRest=rest.toFixed(3);host.dataset.catPose=state==='dead'?'curled-symbol':state==='alive'?'seated':'unobserved';host.dataset.catAge=(time-transitionStart).toFixed(2);
      handle=requestAnimationFrame(draw);
    }
    host.addEventListener('pointermove',event=>{const r=host.getBoundingClientRect();pointer.x=clamp((event.clientX-r.left)/r.width*2-1,-1,1);pointer.y=clamp((event.clientY-r.top)/r.height*2-1,-1,1);pointer.active=1;},{passive:true});
    host.addEventListener('pointerleave',()=>{pointer.active=.4;},{passive:true});
    if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)resume();else stop();},{rootMargin:'65px'}).observe(host);
    if(typeof ResizeObserver==='function')new ResizeObserver(resume).observe(host);
    if(typeof MutationObserver==='function')new MutationObserver(()=>{if(allowed())resume();else stop();}).observe(panel,{attributes:true,attributeFilter:['data-state','hidden']});
    document.addEventListener('visibilitychange',()=>document.hidden?stop():resume());
    window.addEventListener('resize',resume,{passive:true});resume();
  });
})();
