/* Original articulated human/robot handshake, rendered as a 3D particle sculpture.
 * Finger hierarchy: metacarpal base, proximal, middle and distal phalanges;
 * the opposing thumbs use a metacarpal link and two phalanges.
 * Rigging references (geometry and animation are original):
 * https://docs.ultraleap.com/xr-and-tabletop/xr/unity/plugin/features/rigged-hand-support.html
 * https://shadow-robot-company-dexterous-hand.readthedocs-hosted.com/en/latest/user_guide/md_finger.html
 * Conceptual artwork, not a robot control or biomechanical simulation.
 */
(() => {
  'use strict';
  const TAU=Math.PI*2,CYCLE=19;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>mul(a,1/(Math.hypot(...a)||1)),fract=x=>x-Math.floor(x);
  const HUMAN=[112,93,123],ROBOT=[49,91,137],BG='#f6f5f1';
  const rigs=[];
  function curve(points,t){const f=clamp(t,0,.999999)*(points.length-1),i=Math.floor(f),u=f-i,a=points[Math.max(0,i-1)],b=points[i],c=points[Math.min(points.length-1,i+1)],d=points[Math.min(points.length-1,i+2)];return b.map((v,j)=>.5*((2*v)+(-a[j]+c[j])*u+(2*a[j]-5*v+4*c[j]-d[j])*u*u+(-a[j]+3*v-3*c[j]+d[j])*u*u*u));}
  function poseAt(t){
    t=((t%CYCLE)+CYCLE)%CYCLE;
    let separation=108,grip=0,phase='ready',pressure=0;
    if(t<3.4){phase='approach';separation=108*(1-smooth(t/3.4));grip=.10*smooth(t/3.4);}
    else if(t<4.5){phase='contact';separation=0;grip=mix(.10,.22,smooth((t-3.4)/1.1));}
    else if(t<6.5){phase='grip';separation=0;grip=mix(.22,1,smooth((t-4.5)/2));}
    else if(t<10.6){phase='hold';separation=0;grip=1;pressure=Math.sin((t-6.5)/4.1*Math.PI)*Math.sin((t-6.5)*Math.PI*1.15);}
    else if(t<13.0){phase='release';separation=0;grip=1-smooth((t-10.6)/2.4);}
    else if(t<16.2){phase='withdraw';separation=108*smooth((t-13)/3.2);}
    return{t,separation,grip,phase,pressure};
  }
  function skeleton(pose){
    const frames=[];
    for(const rig of rigs){
      const lag=rig.thumb?.10:rig.order*.021;
      const g=smooth(clamp((pose.grip-lag)/(1-lag),0,1));
      let origin=rig.anchor.slice();
      for(let j=0;j<rig.lengths.length;j++){
        let direction;
        if(rig.thumb){direction=unit(rig.open[j].map((x,k)=>mix(x,rig.closed[j][k],g)));}
        else{
          // All three rotations share a flexion plane; lengths remain constant.
          // Distal flexion is coupled to the intermediate joint, as in a tendon-driven hand.
          const angle=mix(rig.openAngles[j],rig.closedAngles[j],g);
          direction=unit(add(mul(rig.forward,Math.cos(angle)),mul(rig.bend,Math.sin(angle))));
        }
        const u=unit(cross([0,0,1],direction)),v=unit(cross(direction,u));
        const end=add(origin,mul(direction,rig.lengths[j]));
        frames[rig.first+j]={o:origin,x:direction,y:u,z:v,end,length:rig.lengths[j],kind:rig.kind};
        origin=end;
      }
      // Human skin is one continuous swept surface over the articulated chain.
      // Smooth tangents meet at each pivot instead of revealing separate capsules.
      if(rig.skin)for(const s of rig.skin){
        const b=frames[rig.first+s.segment],previous=frames[rig.first+Math.max(0,s.segment-1)],next=frames[rig.first+Math.min(2,s.segment+1)];
        const d0=mul(s.segment?unit(add(previous.x,b.x)):b.x,b.length),d1=mul(s.segment<2?unit(add(b.x,next.x)):b.x,b.length),t=s.t,t2=t*t,t3=t2*t;
        const o=b.o.map((x,k)=>(2*t3-3*t2+1)*x+(t3-2*t2+t)*d0[k]+(-2*t3+3*t2)*b.end[k]+(t3-t2)*d1[k]);
        const tangent=unit(b.o.map((x,k)=>(6*t2-6*t)*x+(3*t2-4*t+1)*d0[k]+(-6*t2+6*t)*b.end[k]+(3*t2-2*t)*d1[k]));
        const y=unit(cross([0,0,1],tangent)),z=unit(cross(tangent,y));frames[s.key]={o,x:tangent,y,z};
      }
    }
    return frames;
  }
  function sculpture(){
    const points=[];let serial=0,binding=-1,boneCount=0;
    function point(p,n,kind,detail=0,r=1){const id=serial++;points.push({p,n,kind,detail,r,bone:binding,seed:fract(id*.61803398875),phase:fract(id*.754877666)*TAU});}
    function ellipsoid(center,radii,angle,kind,lat=25,lon=57,detail=0){const ca=Math.cos(angle),sa=Math.sin(angle);for(let i=1;i<lat;i++)for(let j=0;j<lon;j++){const jitter=kind==='human'?.20:0,u=(i+(fract(i*j*.17)-.5)*jitter)/lat*Math.PI,v=(j+(i%2)*.5)/lon*TAU,q=[Math.sin(u)*Math.cos(v),Math.cos(u),Math.sin(u)*Math.sin(v)],p=q.map((x,k)=>x*radii[k]),n=unit(q.map((x,k)=>x/radii[k]));point([center[0]+p[0]*ca-p[1]*sa,center[1]+p[0]*sa+p[1]*ca,center[2]+p[2]],[n[0]*ca-n[1]*sa,n[0]*sa+n[1]*ca,n[2]],kind,detail);}}
    function tube(path,radii,kind,steps=33,sides=25,options={}){const robot=kind==='robot';for(let i=0;i<=steps;i++){const t=i/steps,c=curve(path,t),dir=unit(sub(curve(path,Math.min(1,t+.003)),curve(path,Math.max(0,t-.003)))),u=unit(cross(dir,Math.abs(dir[2])>.9?[0,1,0]:[0,0,1])),v=unit(cross(dir,u));const rr=typeof radii==='function'?radii(t):mix(radii[0],radii[1],t),cap=options.cap?Math.max(.05,Math.sqrt(Math.max(0,1-Math.pow(Math.max(0,(t-.80)/.20),2)))):1,depth=options.depth||1;for(let j=0;j<sides;j++){const a=(j+(robot?0:(i%2)*.5))/sides*TAU;let cA=Math.cos(a),sA=Math.sin(a);if(options.facets){const sector=TAU/options.facets,f=Math.cos(sector/2)/Math.cos((a+sector/2)%sector-sector/2);cA*=f;sA*=f;}const radial=add(mul(u,cA*rr*cap),mul(v,sA*rr*cap*depth)),n=unit(add(mul(u,cA),mul(v,sA/depth))),band=options.bands&&options.bands.some(b=>Math.abs(t-b)<.025);point(add(c,radial),n,kind,band?2:options.detail||0,band?1.05:1);}}}
    function line(path,kind,spacing=3,r=.8){const length=path.slice(1).reduce((s,p,i)=>s+Math.hypot(...sub(p,path[i])),0),count=Math.max(8,Math.ceil(length/spacing));for(let i=0;i<=count;i++)point(curve(path,i/count),[0,0,1],kind,3,r);}
    function ring(center,axis,radius,kind,width=1,count=44){const n=unit(axis),u=unit(cross(n,Math.abs(n[2])>.9?[0,1,0]:[0,0,1])),v=cross(n,u);for(let k=0;k<width;k++)for(let j=0;j<count;j++){const a=j/count*TAU,rr=radius-k*2.2;point(add(center,add(mul(u,Math.cos(a)*rr),mul(v,Math.sin(a)*rr))),n,kind,3,.86);}}
    // Forearms and palm surfaces remain anchored to their own hand root.
    tube([[-410,112,-6],[-330,64,-2],[-247,18,2],[-180,-5,5]],[47,35],'human',49,31,{depth:.78});
    ellipsoid([-139,-3,8],[105,66,37],.34,'human',29,65);
    ellipsoid([-145,-37,27],[45,35,25],-.22,'human',20,41);
    line([[-249,5,36],[-223,9,42],[-207,18,42]],'human',3.3,.6);
    line([[-237,27,34],[-215,29,41],[-197,39,39]],'human',3.3,.6);
    line([[-172,10,46],[-138,25,47],[-108,48,40]],'human',3.6,.55);
    tube([[408,-102,-18],[328,-73,-15],[252,-44,-13],[185,-21,-11]],[45,38],'robot',53,34,{depth:.82,facets:8,bands:[.08,.82,.89]});
    tube([[194,-23,-11],[168,-16,-10]],[40,40],'robot',8,34,{depth:.87,facets:12,bands:[.08,.85],detail:1});
    ellipsoid([105,-2,-16],[93,61,28],-.35,'robot',25,53);
    line([[183,-43,18],[121,-57,17],[61,-28,16],[63,19,18],[116,38,18],[167,12,20],[183,-43,18]],'robot',2.7,1);
    line([[159,-30,21],[120,-39,20],[83,-18,21],[84,10,22],[116,23,22],[151,7,22],[159,-30,21]],'robot',3,.65);
    for(let k=0;k<3;k++)line([[240+k*6,-58+k*14,15],[338+k*6,-89+k*14,17]],'robot',4,.7);
    [[151,-30,24],[120,20,25],[76,-17,22]].forEach(p=>ring(p,[0,0,1],4,'robot'));
    function finger(rig){
      rig.first=boneCount;boneCount+=3;rigs.push(rig);
      if(rig.kind==='human'){
        rig.skin=[];
        for(let j=0;j<3;j++)for(let k=0;k<=18;k++){
          if(j&&k===0)continue;
          const t=k/18,a=(j+t)/3,key='skin-'+rig.first+'-'+j+'-'+k;
          rig.skin.push({key,segment:j,t});binding=key;
          const taper=1-.32*a,cap=a>.86?Math.sqrt(Math.max(.001,1-((a-.86)/.14)**2)):1;
          const knuckle=1+.025*Math.exp(-Math.pow((a-1/3)/.055,2))+.018*Math.exp(-Math.pow((a-2/3)/.05,2));
          const radius=rig.radius*taper*cap*knuckle;
          for(let n=0;n<25;n++){const theta=(n+(k%2)*.5)/25*TAU,c=Math.cos(theta),s=Math.sin(theta);point([0,c*radius,s*radius*.94],[0,c,s],'human',0,.94);}
          if(j===2&&k===11){for(let n=0;n<28;n++){const theta=n/28*TAU;point([Math.cos(theta)*rig.lengths[2]*.16,Math.sin(theta)*radius*.43,radius*.87],[0,0,1],'human',1,.55);}}
        }
        binding=-1;return;
      }
      for(let j=0;j<3;j++){
        binding=rig.first+j;const length=rig.lengths[j],radius=rig.radius*[1,.84,.69][j],kind=rig.kind;
        {
          // Joint bearings and rigid links use the same FK pivot; no floating collars.
          const inset=radius*.35;
          ellipsoid([0,0,0],[radius*.86,radius*.90,radius*.86],0,kind,12,26,1);
          ring([0,0,radius*.87],[0,0,1],radius*.68,kind,2,36);
          tube([[inset,0,0],[length-inset*.7,0,0]],[radius*.88,radius*.75],kind,Math.ceil(length/3.5),20,{cap:j===2,depth:.83,facets:8,bands:[.12,.88]});
          line([[inset+2,-radius*.37,radius*.77],[length-inset-1,-radius*.30,radius*.68]],kind,3.1,.6);
          line([[inset+2,radius*.37,radius*.77],[length-inset-1,radius*.30,radius*.68]],kind,3.1,.6);
        }
      }
      binding=-1;
    }
    const humanFingers=[
      {anchor:[-70,-31,34],lengths:[63,46,30],radius:14.3},
      {anchor:[-74,2,35],lengths:[68,49,32],radius:15.1},
      {anchor:[-88,35,29],lengths:[63,44,29],radius:13.8},
      {anchor:[-109,64,17],lengths:[53,36,25],radius:11.7}
    ];
    humanFingers.forEach((f,i)=>{const forward=unit([.91,.40+(i*.012),.14]),bend=unit(sub([.08,.56,-1],mul(forward,dot([.08,.56,-1],forward))));finger({...f,kind:'human',order:i,forward,bend,openAngles:[-.10,-.04,0],closedAngles:[.03,.85,1.60]});});
    const robotFingers=[{anchor:[40,-24,-24],lengths:[54,38,26],radius:13.2},{anchor:[34,3,-25],lengths:[58,40,27],radius:13.8},{anchor:[25,30,-25],lengths:[54,37,25],radius:12.7},{anchor:[14,54,-24],lengths:[46,32,23],radius:11.1}];
    robotFingers.forEach((f,i)=>{const forward=unit([-.94,.31,-.12]),bend=unit(sub([.14,.15,1],mul(forward,dot([.14,.15,1],forward))));finger({...f,kind:'robot',order:i,forward,bend,openAngles:[-.12,-.06,0],closedAngles:[.02,.85,1.52]});});
    finger({kind:'human',thumb:true,order:0,anchor:[-108,-42,35],lengths:[62,51,38],radius:20,open:[unit([.48,-.84,.26]),unit([.68,-.73,.03]),unit([.78,-.62,0])],closed:[unit([.98,-.15,.12]),unit([.99,.10,.08]),unit([.85,.35,-.39])]});
    finger({kind:'robot',thumb:true,order:0,anchor:[85,-40,22],lengths:[65,55,57],radius:18.5,open:[unit([-.55,-.82,.15]),unit([-.65,-.75,.05]),unit([-.70,-.70,.05])],closed:[unit([-.72,-.61,.32]),unit([-.97,.14,.20]),unit([-.63,.71,-.30])]});
    return points;
  }
  const geometry=sculpture();
  document.querySelectorAll('canvas[data-handshake-field]').forEach((canvas,index)=>{
    if(canvas.dataset.handshakeInitialized)return;
    let ctx;try{ctx=canvas.getContext('2d',{alpha:false});}catch(_){return;}
    if(!ctx)return;
    const host=canvas.closest('.handshake-stage')||canvas.parentElement;
    canvas.dataset.handshakeInitialized='true';canvas.tabIndex=0;canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label','An articulated human hand and robotic hand approach, make contact, close their fingers, release and separate. Drag horizontally to rotate; tap to replay the handshake.');
    const help=document.createElement('span');help.className='handshake-sr-only';help.id=`handshake-help-${index}`;help.textContent='Drag horizontally to rotate the sculpture. Vertical touch gestures scroll the page. Arrow keys change the view; Enter replays the approach, contact, grip and release; R resets the view. Conceptual artwork, not a robot simulation.';host.append(help);canvas.setAttribute('aria-describedby',help.id);
    const key=document.createElement('div');key.className='handshake-key';key.setAttribute('aria-hidden','true');key.innerHTML='<span class="handshake-human">HUMAN</span><span class="handshake-hint">Drag to rotate · Tap to replay</span><span class="handshake-robot">ROBOT</span>';host.append(key);
    let w=0,h=0,dpr=1,compact=false,handle=0,last=0,clock=0,frame=0,inView=true,interactions=0;
    let yaw=.08,pitch=-.13,roll=-.035,targetYaw=.08,targetPitch=-.13,pulse=-20;
    let motionStart=0,replay=null,currentPose=poseAt(0),previousPhase='',replayCount=0;
    let drag=null,hover={x:-9999,y:-9999,strength:0,target:0},depthBuffer=new Float32Array(1),zw=1,zh=1;
    const state=(k,v)=>{host.dataset[k]=String(v);canvas.dataset[k]=String(v);};
    const allowed=()=>inView&&!document.hidden&&w>0&&h>0;
    const mark=type=>{state('handshakeInteraction',type);state('handshakeInteractions',++interactions);};
    function replayMotion(){replay={at:clock,from:{...currentPose}};motionStart=clock+.9;replayCount++;state('handshakeReplayCount',replayCount);mark('replay');}
    function motionPose(){
      if(replay&&clock<replay.at+.9){const t=smooth((clock-replay.at)/.9);return{t:0,separation:mix(replay.from.separation,108,t),grip:mix(replay.from.grip,0,t),pressure:0,phase:'prepare'};}
      replay=null;return poseAt(clock-motionStart);
    }
    function rotated(p,ca,sa,cb,sb,cc,sc){const x=p[0]*ca+p[2]*sa,z=p[2]*ca-p[0]*sa,y=p[1]*cb-z*sb,zz=p[1]*sb+z*cb;return[x*cc-y*sc,x*sc+y*cc,zz];}
    function draw(){
      ctx.fillStyle=BG;ctx.fillRect(0,0,w,h);
      const halo=ctx.createRadialGradient(w*.49,h*.49,0,w*.49,h*.49,Math.max(w*.43,h*.45));halo.addColorStop(0,'rgba(222,227,234,.38)');halo.addColorStop(.65,'rgba(232,229,235,.16)');halo.addColorStop(1,'rgba(246,245,241,0)');ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
      const ca=Math.cos(yaw),sa=Math.sin(yaw),cb=Math.cos(pitch),sb=Math.sin(pitch),cc=Math.cos(roll+(compact?-.11:0)),sc=Math.sin(roll+(compact?-.11:0));
      currentPose=motionPose();const bones=skeleton(currentPose),separation=currentPose.separation;
      const handCos=Math.cos(.055*separation/108),handSin=Math.sin(.055*separation/108);
      if(currentPose.phase==='contact'&&previousPhase!=='contact')pulse=clock;
      previousPhase=currentPose.phase;
      // A closer mobile framing favours the grasp; all fingers and both wrists remain visible.
      const scale=Math.min(w/((compact?660:925)+separation*(compact?1.65:.65)),(h-65)/((compact?430:370)+separation*.9)),cy=h*.48;
      const cloud=[],light=unit([-.4,-.55,1]),fingerBounds=[Infinity,Infinity,-Infinity,-Infinity];depthBuffer.fill(-1e6);
      for(let i=0;i<geometry.length;i++){
        const p=geometry[i],breath=Math.sin(clock*.32+p.phase)*.19;
        let xyz=p.p,normal=p.n;
        if(p.bone!==-1){const b=bones[p.bone];xyz=[b.o[0]+b.x[0]*p.p[0]+b.y[0]*p.p[1]+b.z[0]*p.p[2],b.o[1]+b.x[1]*p.p[0]+b.y[1]*p.p[1]+b.z[1]*p.p[2],b.o[2]+b.x[2]*p.p[0]+b.y[2]*p.p[1]+b.z[2]*p.p[2]];normal=[b.x[0]*p.n[0]+b.y[0]*p.n[1]+b.z[0]*p.n[2],b.x[1]*p.n[0]+b.y[1]*p.n[1]+b.z[1]*p.n[2],b.x[2]*p.n[0]+b.y[2]*p.n[1]+b.z[2]*p.n[2]];}
        const side=p.kind==='human'?-1:1,hc=handCos,hs=-side*handSin,pivot=side*180,rx=xyz[0]-pivot,ry=xyz[1];
        xyz=[pivot+rx*hc-ry*hs+side*separation,rx*hs+ry*hc-side*separation*.08+currentPose.pressure*3+breath,xyz[2]];
        normal=[normal[0]*hc-normal[1]*hs,normal[0]*hs+normal[1]*hc,normal[2]];
        const q=rotated(xyz,ca,sa,cb,sb,cc,sc),n=rotated(normal,ca,sa,cb,sb,cc,sc);
        if(n[2]<-.16&&p.detail<3)continue;
        const perspective=950/(950-q[2]),x=w*.5+q[0]*scale*perspective,y=cy+q[1]*scale*perspective;
        if(p.bone!==-1){fingerBounds[0]=Math.min(fingerBounds[0],x);fingerBounds[1]=Math.min(fingerBounds[1],y);fingerBounds[2]=Math.max(fingerBounds[2],x);fingerBounds[3]=Math.max(fingerBounds[3],y);}
        const sx=Math.floor(x/3),sy=Math.floor(y/3),z=q[2];
        if(sx<0||sx>=zw||sy<0||sy>=zh)continue;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const ix=sx+dx,iy=sy+dy;if(ix>=0&&ix<zw&&iy>=0&&iy<zh){const cell=iy*zw+ix;if(z>depthBuffer[cell])depthBuffer[cell]=z;}}
        cloud.push({p,q,n,x,y,sx,sy,perspective,lum:clamp(dot(n,light),0,1)});
      }
      const buckets=Array.from({length:40},()=>[]);
      const pulseAge=clock-pulse;
      for(let i=0;i<cloud.length;i++){
        const a=cloud[i],{p,q,n}=a;
        if(q[2]<depthBuffer[a.sy*zw+a.sx]-13)continue;
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
      frame++;state('handshakeReady',true);state('handshakeFrame',frame);state('handshakePoints',geometry.length);state('handshakeAggregation',(1-separation/108).toFixed(3));state('handshakeMorph',currentPose.grip>.95?'clasped':currentPose.phase);state('handshakeYaw',yaw.toFixed(3));state('handshakePitch',pitch.toFixed(3));
      state('handshakePhase',currentPose.phase);state('handshakeGrip',currentPose.grip.toFixed(3));state('handshakeSeparation',separation.toFixed(2));state('handshakeCycleTime',currentPose.t.toFixed(3));state('handshakeBoneCount',bones.length);
      state('handshakeFingerBounds',fingerBounds.map(x=>x.toFixed(1)).join(','));
      const firstTip=bones[2].end,lastTip=bones[14].end;state('handshakeHumanTip',firstTip.map(x=>x.toFixed(2)).join(','));state('handshakeRobotTip',lastTip.map(x=>x.toFixed(2)).join(','));
      let boneError=0,jointError=0;for(const rig of rigs)for(let j=0;j<3;j++){const b=bones[rig.first+j];boneError=Math.max(boneError,Math.abs(Math.hypot(...sub(b.end,b.o))-b.length));if(j)jointError=Math.max(jointError,Math.hypot(...sub(b.o,bones[rig.first+j-1].end)));}state('handshakeBoneError',boneError.toExponential(2));state('handshakeJointError',jointError.toExponential(2));
    }
    function tick(now){handle=0;if(!allowed()){state('handshakeRunning',false);return;}if(!last)last=now;const delta=(now-last)/1000;if(delta>1/(compact?25:30)){last=now;const dt=Math.min(delta,.08);clock+=dt;const ease=1-Math.exp(-dt*5);yaw+=(targetYaw+Math.sin(clock*.16)*.035-yaw)*ease;pitch+=(targetPitch+Math.sin(clock*.13)*.016-pitch)*ease;hover.strength+=(hover.target-hover.strength)*ease;draw();}state('handshakeRunning',true);handle=requestAnimationFrame(tick);}
    function stop(){if(handle)cancelAnimationFrame(handle);handle=0;last=0;state('handshakeRunning',false);}
    function resume(){if(allowed()&&!handle){last=0;handle=requestAnimationFrame(tick);}state('handshakeRunning',allowed());}
    function resize(){const r=canvas.getBoundingClientRect();const nw=Math.round(r.width),nh=Math.round(r.height),nd=Math.min(devicePixelRatio||1,2);if(!nw||!nh){w=nw;h=nh;stop();return;}if(w===nw&&h===nh&&dpr===nd)return;w=nw;h=nh;dpr=nd;compact=w<700;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);zw=Math.ceil(w/3);zh=Math.ceil(h/3);depthBuffer=new Float32Array(zw*zh);draw();resume();}
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=canvas.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:targetYaw,pitch:targetPitch,moved:false,touch:e.pointerType==='touch'};hover.x=e.clientX-r.left;hover.y=e.clientY-r.top;canvas.classList.add('is-dragging');if(e.pointerType!=='touch')canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();hover.x=e.clientX-r.left;hover.y=e.clientY-r.top;hover.target=1;if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)>4||Math.abs(dy)>4)drag.moved=true;targetYaw=clamp(drag.yaw+dx/Math.max(260,w)*1.35,-.62,.62);if(!drag.touch)targetPitch=clamp(drag.pitch-dy/Math.max(260,h)*.65,-.38,.34);mark('rotate');},{passive:true});
    function release(e){if(!drag||drag.id!==e.pointerId)return;if(!drag.moved&&e.type==='pointerup')replayMotion();drag=null;canvas.classList.remove('is-dragging');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
    canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',()=>{drag=null;canvas.classList.remove('is-dragging');});canvas.addEventListener('pointerleave',()=>{hover.target=0;});
    canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();targetYaw=clamp(targetYaw+(e.key==='ArrowLeft'?-.08:e.key==='ArrowRight'?.08:0),-.62,.62);targetPitch=clamp(targetPitch+(e.key==='ArrowUp'?-.06:e.key==='ArrowDown'?.06:0),-.38,.34);mark('keyboard');}else if(e.key==='Enter'||e.key===' '){e.preventDefault();replayMotion();}else if(e.key.toLowerCase()==='r'){e.preventDefault();targetYaw=.08;targetPitch=-.13;hover.target=0;mark('reset');}});
    // A finite seek event supports deterministic visual regression at every articulated pose.
    canvas.addEventListener('handshake:seek',event=>{const t=Number(event.detail);if(!Number.isFinite(t))return;replay=null;motionStart=clock-clamp(t,0,CYCLE-.001);draw();});
    if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;inView?resume():stop();},{rootMargin:'80px'}).observe(canvas);
    let timer;if(typeof ResizeObserver==='function')new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(resize,50);}).observe(host);
    window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(resize,70);},{passive:true});document.addEventListener('visibilitychange',()=>document.hidden?stop():resume());window.addEventListener('pagehide',stop);window.addEventListener('pageshow',resume);resize();
  });
})();


