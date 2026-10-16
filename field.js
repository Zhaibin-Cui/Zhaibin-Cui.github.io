/* Interactive research studies. Original Canvas 2D geometry; no remote dependencies.
 * Conceptual illustrations, not experimental results or measured model internals.
 * Pointer and keyboard input share one state; offscreen scenes suspend rendering.
 */
(() => {
  'use strict';
  const canvases = [...new Set(document.querySelectorAll('canvas[data-research-field], .research-field > canvas, .quantum-field-stage > canvas, #research-field, #quantum-field'))];
  if (!canvases.length) return;
  const TAU=Math.PI*2,PAPER='#f6f5f1';
  const INK=[47,76,119],BLUE=[71,105,165],PLUM=[116,88,142],PALE=[130,153,186];
  const MODES=['ai','training','agents','vision','quantum'];
  const SHAPES={ai:'neural-network',training:'optimization-landscape',agents:'agent-network',vision:'feature-manifold',quantum:'interference-sphere'};
  const COPY={
    ai:{name:'Neural signal study',hint:'Drag a neuron · send a signal',action:'Send signal',detail:'A conceptual layered network. Drag a node horizontally, or focus this canvas and use arrow keys to move a selected node. Enter sends a signal; R resets the positions.'},
    training:{name:'Optimization landscape',hint:'Explore a training trajectory',action:'Trace a path',detail:'An illustrative optimization surface and three model-scale trajectories, not measured training curves. Drag horizontally to change the view; Enter traces a path; R resets the view.'},
    agents:{name:'Coordinated agents',hint:'Move a node · dispatch a task',action:'Dispatch task',detail:'A conceptual collaboration graph. Drag a node horizontally, or use arrow keys when this canvas is focused. Enter dispatches a task; R resets the positions.'},
    vision:{name:'Spatial representation',hint:'Touch the field to perturb it',action:'Create ripple',detail:'A conceptual spatial-feature manifold. Click or tap to perturb the surface. Arrow keys move the focus point; Enter creates a ripple; R resets the view.'},
    quantum:{name:'Interference and phase',hint:'Drag to rotate · shift the phase',action:'Shift phase',detail:'An artistic illustration of interference and a quantum-state sphere, not an experimental simulation. Drag horizontally to rotate it. Arrow keys rotate the view; Enter shifts the phase; R resets the view.'}
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
      positions.length=0;
      nodes.forEach(n=>positions.push(project(n.x+n.dx,n.y+n.dy+Math.sin(time*.42+n.l*.5+n.n*.15)*.018,n.z+Math.sin(time*.23+n.l)*.04)));
      for(const edge of edges){
        const a=positions[edge.a],b=positions[edge.b],hot=manual>=edge.l&&manual<=edge.l+1.1;
        traceEdge(a,b,edge.l%2?PLUM:BLUE,(hot?.45:.21)*edge.weight,hot?1.1:.70);
        const t=(hot?manual:auto)-edge.l;
        if(t>=0&&t<=1&&(hot||(edge.a+edge.b)%4===0)){const p=bezier(a,b,t);dot(p,hot?2:1.3,edge.l%2?PLUM:BLUE,hot?.85:.5);}
      }
      nodes.forEach((n,i)=>{
        const p=positions[i],wave=Math.max(0,1-Math.abs((manual>0&&manual<9.5?manual:auto)-n.l)/.8),active=i===dragIndex||i===hoverIndex;
        const r=(small?2.0:2.65)*(1+wave*.36)*p.scale;
        if(active||wave>.7){bloom(p,active?20:11,BLUE,active?.20:.08);ring(p,r+(active?7:4),BLUE,active?.66:.25);}
        dot(p,r,n.l%2?PLUM:INK,.65+wave*.30);if(active)dot(p,1.05,[255,255,255],1);
      });
      [-1.3,0,1.3].forEach((x,i)=>{label(['INPUT','REPRESENTATION','OUTPUT'][i],project(x,i===1?1.12:.67,.05),BLUE,.79);});
      host.dataset.fieldMorph='connected';host.dataset.fieldAggregation='1';
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
      const cycle=time%34,gathered=cycle<10?0:cycle<15?smooth((cycle-10)/5):cycle<28?1:1-smooth((cycle-28)/6);
      const rows=small?27:38,cols=small?50:72,grid=[];
      for(let j=0;j<=rows;j++){
        const v=j/rows,z=(v-.5)*2.0,row=[];
        for(let i=0;i<=cols;i++){
          const u=i/cols,x=(u-.5)*2.75,a=Math.hypot(x+.46,z),b=Math.hypot(x-.46,z);
          const wave=.25*(Math.sin(a*8-time*.95)/Math.sqrt(a+.5)+Math.sin(b*8-time*.95+phaseShift)/Math.sqrt(b+.5))+displacement(x,z,time);
          const theta=u*TAU,phi=v*Math.PI,r=.88,sx=r*Math.sin(phi)*Math.cos(theta),sy=r*Math.cos(phi),sz=r*Math.sin(phi)*Math.sin(theta);
          row.push(project(mix(x,sx,gathered),mix(wave,sy,gathered),mix(z,sz,gathered)));
        }
        grid.push(row);if(j%2===0)line(row,j%6===0?PLUM:BLUE,j%6===0?.40:.21,j%6===0?.80:.55);
      }
      for(let i=0;i<=cols;i+=5)line(grid.map(row=>row[i]),BLUE,.17,.65);
      for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const p=grid[j][i];dot(p,small?.85:1.05,(i+j)%5?BLUE:PLUM,.39+(1-p.depth)*.1);}
      if(gathered>.1){const origin=project(0,0,0),angle=time*.10+phaseShift,tip=project(.63*Math.cos(angle),-.51,.38*Math.sin(angle));line([origin,tip],INK,gathered*.83,1.65);bloom(tip,19,BLUE,.15*gathered);dot(tip,4,INK,gathered);ring(tip,9,BLUE,gathered*.30);}
      if(gathered<.8)[-.46,.46].forEach((x,i)=>{const p=project(x,0,0);bloom(p,20,i?PLUM:BLUE,.13*(1-gathered));ring(p,7,i?PLUM:BLUE,.55*(1-gathered));dot(p,2,i?PLUM:BLUE,.8*(1-gathered));});
      label(gathered>.5?'STATE SPACE / PHASE':'SUPERPOSITION / INTERFERENCE',project(.05,1.03,.05),BLUE,.65);
      host.dataset.fieldMorph=gathered>.88?'assembled':gathered<.12?'wave':'morphing';host.dataset.fieldAggregation=gathered.toFixed(2);
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
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width='100%';canvas.style.height='100%';ctx.setTransform(dpr,0,0,dpr,0,0);
      sceneGeometry();gradient=ctx.createRadialGradient(geometry.cx,geometry.cy,0,geometry.cx,geometry.cy,geometry.aw*.58);gradient.addColorStop(0,'rgba(213,223,238,.38)');gradient.addColorStop(.52,'rgba(225,220,235,.23)');gradient.addColorStop(1,'rgba(246,245,241,0)');
      draw(phase);host.dataset.fieldReady='true';host.dataset.fieldPoints=String(nodes.length||((small?28:39)*(small?51:73)));
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
