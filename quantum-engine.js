/* Four ideal qubits. Big-endian labels |q0 q1 q2 q3>; no device/noise claims. */
(function(scope){
  'use strict';
  const N=16, TAU=2*Math.PI;
  const bit=q=>1<<(3-q);
  const gate=(type,q,extra={})=>({type,q,...extra});
  function qft(qubits,inverse=false){
    const gates=[];
    for(let j=0;j<qubits.length;j++){
      gates.push(gate('H',qubits[j]));
      for(let k=j+1;k<qubits.length;k++)gates.push(gate('CP',qubits[j],{control:qubits[k],angle:Math.PI/2**(k-j)}));
    }
    for(let j=0;j<Math.floor(qubits.length/2);j++)gates.push(gate('SWAP',qubits[j],{other:qubits[qubits.length-1-j]}));
    return inverse?gates.reverse().map(g=>({...g,...(g.angle!==undefined?{angle:-g.angle}:{})})):gates;
  }
  function sequence(preset,phase=.375){
    if(preset==='ghz')return [gate('H',0),gate('CX',1,{control:0}),gate('CX',2,{control:1}),gate('CX',3,{control:2})];
    if(preset==='qft')return [gate('X',1),gate('X',3),...qft([0,1,2,3])];
    if(preset==='qpe')return [gate('X',3),gate('H',0),gate('H',1),gate('H',2),
      ...[0,1,2].map(q=>gate('CP',3,{control:q,angle:TAU*phase*2**(2-q),power:2**(2-q)})),...qft([0,1,2],true)];
    throw new Error('Unknown circuit');
  }
  function apply(re,im,g){
    const mask=bit(g.q);
    if(g.type==='H'){
      for(let i=0;i<N;i++)if(!(i&mask)){const j=i|mask,a=re[i],b=im[i],c=re[j],d=im[j];re[i]=(a+c)*Math.SQRT1_2;im[i]=(b+d)*Math.SQRT1_2;re[j]=(a-c)*Math.SQRT1_2;im[j]=(b-d)*Math.SQRT1_2;}
    }else if(g.type==='X'||g.type==='CX'){
      for(let i=0;i<N;i++)if(!(i&mask)&&(g.type==='X'||(i&bit(g.control)))){const j=i|mask;[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}
    }else if(g.type==='CP'){
      const c=Math.cos(g.angle),s=Math.sin(g.angle);
      for(let i=0;i<N;i++)if((i&mask)&&(i&bit(g.control))){const a=re[i],b=im[i];re[i]=a*c-b*s;im[i]=a*s+b*c;}
    }else if(g.type==='SWAP'){
      const other=bit(g.other);
      for(let i=0;i<N;i++)if(!(i&mask)&&(i&other)){const j=i^mask^other;[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}
    }else throw new Error('Unsupported gate');
  }
  function simulate(gates,steps=gates.length){
    const re=new Float64Array(N),im=new Float64Array(N);re[0]=1;
    for(const g of gates.slice(0,steps))apply(re,im,g);
    const probabilities=Array.from(re,(r,i)=>r*r+im[i]*im[i]);
    // Entanglement entropy of q0 with q1q2q3 for the current pure state.
    let p0=0,p1=0,cr=0,ci=0;
    for(let i=0;i<8;i++){p0+=probabilities[i];p1+=probabilities[i+8];cr+=re[i]*re[i+8]+im[i]*im[i+8];ci+=im[i]*re[i+8]-re[i]*im[i+8];}
    const delta=Math.sqrt(Math.max(0,(p0-p1)**2+4*(cr*cr+ci*ci)));
    const eigen=[Math.min(1,Math.max(0,(1+delta)/2)),Math.min(1,Math.max(0,(1-delta)/2))];
    const entropy=-eigen.reduce((s,x)=>s+(x>1e-14?x*Math.log2(x):0),0);
    return {re:Array.from(re),im:Array.from(im),probabilities,norm:probabilities.reduce((s,p)=>s+p,0),entropy};
  }
  const api=Object.freeze({qft,sequence,simulate});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else scope.QuantumCircuitEngine=api;
})(typeof window==='undefined'?globalThis:window);
