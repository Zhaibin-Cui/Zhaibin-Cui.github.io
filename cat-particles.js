/* A point-cloud illustration of the cat thought experiment, not a physical model. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function geometry() {
    const points = [];
    let seed = 18731;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const add = (x,y,group='cat',strength=1,size=1) => points.push({x,y,group,strength,size,phase:random()*TAU,speed:.55+random()*.65});
    function line(a,b,group='cat',strength=1,step=5) {
      const n=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/step));
      for(let i=0;i<=n;i++)add(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,group,strength);
    }
    function curve(a,b,c,d,group='cat',strength=1,n=34) {
      for(let i=0;i<=n;i++){const t=i/n,u=1-t;add(u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1],group,strength);}
    }
    function cloud(cx,cy,rx,ry,n,group='cat',strength=.48) {
      // Elliptical samples form a volume, while the stronger contours retain the silhouette.
      for(let k=0;k<n;k++){const r=Math.sqrt(random()),a=random()*TAU;add(cx+Math.cos(a)*r*rx,cy+Math.sin(a)*r*ry,group,strength*(.55+.45*random()),.65+random()*.5);}
    }
    const closed=[[205,205],[385,145],[549,229],[369,292]];
    const base=[[205,354],[385,294],[549,378],[369,441]];
    for(let i=0;i<4;i++){
      line(closed[i],closed[(i+1)%4],'lid',.6,5.2);
      line(base[i],base[(i+1)%4],'box',i===0||i===1?.24:.46,5.2);
      line(closed[i],base[i],'box',i===1?.2:.5,5.2);
    }
    // A second sparse line gives the floating lid a precise, architectural edge.
    for(let i=0;i<4;i++)line([closed[i][0],closed[i][1]+6],[closed[(i+1)%4][0],closed[(i+1)%4][1]+6],'lid',.25,8);
    // Upright cat: ears, forehead, cheeks and muzzle.
    curve([337,239],[326,219],[331,204],[337,195]);
    line([337,195],[338,159]);line([338,159],[366,188]);
    curve([366,188],[385,179],[404,182],[419,194]);
    line([419,194],[445,169]);line([445,169],[438,211]);
    curve([438,211],[455,231],[450,253],[431,265]);
    curve([431,265],[407,282],[363,279],[345,258]);
    curve([345,258],[341,251],[338,245],[337,239]);
    line([344,175],[345,199],'cat',.4,4);line([437,185],[431,208],'cat',.4,4);
    // Shoulders, chest, haunches and paws.
    curve([361,274],[341,292],[330,329],[331,370]);
    curve([331,370],[351,387],[408,390],[435,375]);
    curve([435,375],[448,350],[435,304],[419,274]);
    curve([373,289],[365,317],[368,351],[369,378],'cat',.62);
    curve([402,290],[413,321],[410,353],[405,382],'cat',.62);
    curve([360,381],[367,374],[376,374],[381,382],'cat',.55,13);
    curve([395,384],[401,377],[411,375],[420,381],'cat',.55,13);
    for(let j=0;j<4;j++)curve([337,365+j*2],[282,386+j],[241,355],[259+j*2,310],'cat',.6-j*.1,44);
    curve([259,310],[267,287],[282,284],[283,299],'cat',.75,23);
    // Facial landmarks remain legible at phone scale.
    curve([350,225],[357,219],[367,220],[374,226],'face',1,12);
    curve([403,227],[411,222],[421,223],[428,229],'face',1,12);
    cloud(363,225,2.2,3.3,8,'face',1);cloud(415,228,2.2,3.3,8,'face',1);
    line([385,238],[392,240],'face',.9,2);line([392,240],[388,245],'face',.9,2);line([388,245],[385,238],'face',.9,2);
    curve([388,245],[387,251],[381,254],[376,250],'face',.65,10);
    curve([388,245],[390,252],[397,254],[402,251],'face',.65,10);
    [[376,247,319,236],[375,253,315,252],[375,258,323,271],[403,249,461,242],[403,254,467,258],[402,260,458,278]].forEach(v=>line(v.slice(0,2),v.slice(2),'whisker',.65,5));
    cloud(388,232,48,40,200);cloud(385,337,46,45,210);cloud(365,300,20,28,65);
    // A curled silhouette is a non-graphic convention for the dead outcome.
    curve([294,368],[289,335],[318,306],[362,306],'rest',.85,42);
    curve([362,306],[395,303],[418,320],[430,344],'rest',.85,36);
    curve([430,344],[439,364],[418,382],[380,384],'rest',.85,26);
    curve([380,384],[335,389],[308,382],[294,368],'rest',.85,36);
    curve([334,378],[289,383],[272,356],[293,342],'rest',.7,38);
    line([404,329],[411,309],'rest',.85,4);line([411,309],[424,332],'rest',.85,4);
    curve([412,347],[418,351],[425,351],[430,345],'rest-face',1,14);
    cloud(358,346,59,34,270,'rest',.45);
    for(let i=0;i<90;i++){const a=random()*TAU,r=145+random()*70;add(376+Math.cos(a)*r,298+Math.sin(a)*r*.7,'ambient',.14,.7);}
    return points;
  }
  document.querySelectorAll('.qp-cat-art').forEach(host => {
    const canvas=host.querySelector('.qp-cat-canvas');
    if(!canvas||host.dataset.catInitialized)return;
    let ctx;
    try{ctx=canvas.getContext('2d');}catch(e){return;}
    if(!ctx)return;
    host.dataset.catInitialized='true';
    const panel=host.closest('[data-qp-panel="measurement"]');
    const all=geometry();
    const pointer={x:-9999,y:-9999,power:0};
    let visible=true,frame=0,handle=0,last=0,time=0,open=0,life=1,state='prepared';
    let width=0,height=0;
    host.dataset.catParticleCount=String(all.length);
    function allowed(){return visible&&!document.hidden&&!panel.hidden&&host.getBoundingClientRect().width>0;}
    function resume(){if(allowed()&&!handle){last=0;handle=requestAnimationFrame(draw);}host.dataset.catRunning=String(allowed());}
    function stop(){if(handle)cancelAnimationFrame(handle);handle=0;last=0;host.dataset.catRunning='false';}
    function draw(now){
      handle=0;if(!allowed()){stop();return;}
      const delta=last?Math.min((now-last)/1000,.05):.016;last=now;time+=delta;
      state=panel.dataset.state||'prepared';
      const targetOpen=state==='prepared'?0:1,targetLife=state==='dead'?0:1;
      open+=(targetOpen-open)*(1-Math.exp(-delta*4));life+=(targetLife-life)*(1-Math.exp(-delta*5));
      const rect=host.getBoundingClientRect();width=rect.width;height=rect.height||width*500/720;
      const dpr=Math.min(window.devicePixelRatio||1,2);
      if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      const scale=Math.min(width/620,height/455),ox=width/2-376*scale,oy=height/2-245*scale;
      pointer.power*=Math.exp(-delta*1.4);
      for(const p of all){
        let alpha=p.strength,dx=0,dy=0;
        if(p.group==='cat'||p.group==='face'||p.group==='whisker')alpha*=life*(.62+.38*open);
        if(p.group==='rest'||p.group==='rest-face')alpha*=1-life;
        if(p.group==='lid'){dy=-105*open;dx=-11*open;alpha*=1-.1*open;}
        if(p.group==='ambient'){alpha*=.48+.18*Math.sin(time*.5+p.phase);dy=Math.sin(time*.3+p.phase)*7;}
        if(alpha<.01)continue;
        const drift=p.group==='face'||p.group==='rest-face'?.13:p.group==='box'||p.group==='lid'?.2:.55;
        let x=p.x+dx+Math.sin(time*p.speed+p.phase)*drift;
        let y=p.y+dy+Math.cos(time*p.speed*.8+p.phase)*drift;
        // A shallow local displacement responds to the pointer without breaking the silhouette.
        const ddx=x-pointer.x,ddy=y-pointer.y,d=Math.hypot(ddx,ddy);
        if(d<100&&d>1){const strength=Math.pow(1-d/100,2)*7*pointer.power;x+=ddx/d*strength;y+=ddy/d*strength;}
        const isFace=p.group==='face'||p.group==='rest-face';
        const violet=p.group==='lid'||p.group==='rest'||p.group==='rest-face'||(p.phase>4.7&&!isFace);
        ctx.fillStyle=`rgba(${isFace?'46,67,99':violet?'128,111,158':'79,116,159'},${clamp(alpha*.88,0,.94)})`;
        const radius=Math.max(.52,p.size*(isFace?1.4:1.15)*scale);
        ctx.beginPath();ctx.arc(ox+x*scale,oy+y*scale,radius,0,TAU);ctx.fill();
      }
      frame++;host.dataset.catReady='true';host.dataset.catState=state;host.dataset.catFrame=String(frame);host.dataset.catRunning='true';
      handle=requestAnimationFrame(draw);
    }
    host.addEventListener('pointermove',event=>{
      const rect=host.getBoundingClientRect(),scale=Math.min(rect.width/620,rect.height/455);
      if(!scale)return;
      pointer.x=(event.clientX-rect.left-rect.width/2)/scale+376;
      pointer.y=(event.clientY-rect.top-rect.height/2)/scale+245;pointer.power=1;
    },{passive:true});
    host.addEventListener('pointerleave',()=>{pointer.power=.45;},{passive:true});
    if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)resume();else stop();},{rootMargin:'70px'}).observe(host);
    if(typeof MutationObserver==='function')new MutationObserver(resume).observe(panel,{attributes:true,attributeFilter:['data-state','hidden']});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else resume();});
    window.addEventListener('resize',resume,{passive:true});
    resume();
  });
})();
