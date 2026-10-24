const frameArt=new Map();
export function setFrameArt(id,image){frameArt.set(id,image);}
if(typeof Image!=='undefined')for(const id of ['gold','ice','fire']){const img=new Image();img.onload=()=>setFrameArt(id,img);img.src='/frames/'+id+'.png';}
const palettes={simple:['#bbbcc8','#ffffff','#707582'],glow:['#c9a3ff','#fff3ff','#7941dd'],silver:['#a8c1d8','#ffffff','#667d95'],gold:['#f2b839','#fff3ba','#b87613'],ice:['#58d8ff','#efffff','#477be6'],fire:['#ff5c19','#ffe88e','#bc1123']};
const ranks={simple:0,glow:1,silver:2,gold:3,ice:4,fire:5};
const TAU=Math.PI*2;
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(',');
const mistCache=new Map();
function mist(ctx,color){
 if(mistCache.has(color))return mistCache.get(color);
 const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(96,96):typeof document!=='undefined'?document.createElement('canvas'):null;
 if(!canvas)return null;canvas.width=canvas.height=96;const c=canvas.getContext('2d'),g=c.createRadialGradient(48,48,0,48,48,48);
 g.addColorStop(0,`rgba(${rgb(color)},.65)`);g.addColorStop(.35,`rgba(${rgb(color)},.32)`);g.addColorStop(1,`rgba(${rgb(color)},0)`);c.fillStyle=g;c.fillRect(0,0,96,96);mistCache.set(color,canvas);return canvas;
}
function cloud(ctx,x,y,radius,color,opacity){
 ctx.globalAlpha=opacity;const sprite=mist(ctx,color);
 if(sprite){ctx.drawImage(sprite,x-radius,y-radius,radius*2,radius*2);return;}
 const g=ctx.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,`rgba(${rgb(color)},.55)`);g.addColorStop(1,`rgba(${rgb(color)},0)`);ctx.fillStyle=g;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
}
export function drawRing(ctx,x,y,size,level,time,{speed=1,intensity=1,simpleStyle='orbit',ornaments=false}={}){
 if(!level)return;const id=typeof level==='string'?level:level.id,p=palettes[id]||palettes.simple,rank=ranks[id]??0;
 const t=time*.001*(.6+speed*.35),r=size*.5,power=.75+intensity*.25;
 ctx.save();ctx.translate(x,y);
 // Keep the guest's face clear; all fog, waves and particles stay outside this hole.
 ctx.beginPath();ctx.rect(-size*2,-size*2,size*4,size*4);ctx.arc(0,0,r-size*.022,0,TAU);ctx.clip('evenodd');
 ctx.globalCompositeOperation='screen';ctx.shadowBlur=0;
 // Drifting cloud banks: higher tiers add layers, density and a wider halo.
 const banks=30+rank*14,layers=1+Math.floor(rank/2);
 for(let layer=0;layer<layers;layer++)for(let i=0;i<banks;i++){
  const phase=i*2.39996+layer*1.77,a=i/banks*TAU+t*(layer%2?-.13:.11)+Math.sin(phase+t*.45)*.13;
  const breath=.5+.5*Math.sin(phase*1.6+t*.95),radius=r+size*(.018+layer*.022+breath*(.025+rank*.013));
  const puff=size*(.034+rank*.006+breath*.022)*(1+layer*.12);
  cloud(ctx,Math.cos(a)*radius,Math.sin(a)*radius,puff,p[(i+layer)%3===0?1:0],(.28+rank*.05)*power*(.6+.4*breath));
 }
 // Continuous ripples travel around the halo, rather than a static border.
 const waves=1+Math.floor(rank/2);
 for(let layer=0;layer<waves;layer++){
  ctx.beginPath();for(let j=0;j<=160;j++){const a=j/160*TAU;const ripple=Math.sin(a*(5+layer*2)-t*(1.2+layer*.4))*.5+Math.sin(a*11+t*.8+layer)*.3;
   const radius=r+size*(.018+layer*.022+(.005+rank*.002)*ripple);const xx=Math.cos(a)*radius,yy=Math.sin(a)*radius;j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}
  ctx.closePath();ctx.globalAlpha=(.16+rank*.03)*power;ctx.strokeStyle=p[layer%2];ctx.lineWidth=size*(.006+rank*.001);ctx.shadowColor=p[0];ctx.shadowBlur=size*.028;ctx.stroke();
 }
 ctx.globalAlpha=.9;ctx.strokeStyle=p[0];ctx.lineWidth=Math.max(1.5,size*.012);ctx.shadowColor=p[0];ctx.shadowBlur=(6+intensity*4)*size/200;
 if(id==='simple'&&simpleStyle==='dots')ctx.setLineDash([size*.012,size*.04]);
 for(let j=0;j<(id==='simple'?(simpleStyle==='double'?2:1):2);j++){ctx.beginPath();ctx.arc(0,0,r+j*size*.022,0,TAU);ctx.stroke();}ctx.setLineDash([]);ctx.shadowBlur=0;
 // Outward-moving dust, frost and embers; particle counts increase with every tier.
 const particles=30+rank*26;
 for(let i=0;i<particles;i++){
  const seed=i*2.39996,life=((t*(.15+rank*.025)+i*.618034)%1+1)%1,angle=seed+t*(i%2?.12:-.09);
  const radius=r+size*(.018+life*(.07+rank*.022)),px=Math.cos(angle)*radius,py=Math.sin(angle)*radius;
  ctx.globalAlpha=Math.sin(life*Math.PI)*(.4+rank*.06)*power;ctx.fillStyle=i%4===0?p[1]:p[0];
  ctx.save();ctx.translate(px,py);ctx.rotate(seed+t*.5);
  if(id==='ice'){
   const h=size*(.005+.011*(.5+.5*Math.sin(seed)));ctx.beginPath();ctx.moveTo(0,-h*1.8);ctx.lineTo(h*.55,0);ctx.lineTo(0,h*1.8);ctx.lineTo(-h*.55,0);ctx.closePath();ctx.fill();
   if(i%5===0){ctx.strokeStyle=p[1];ctx.lineWidth=size*.003;ctx.beginPath();for(let j=0;j<3;j++){const a=j*Math.PI/3;ctx.moveTo(-Math.cos(a)*h*1.8,-Math.sin(a)*h*1.8);ctx.lineTo(Math.cos(a)*h*1.8,Math.sin(a)*h*1.8);}ctx.stroke();}
  }else{ctx.beginPath();ctx.ellipse(0,0,size*(id==='fire'?.004:.003),size*(id==='fire'?.009:.003),0,0,TAU);ctx.fill();}
  ctx.restore();
 }
 // Frost grows from the ice ring. The highest tier erupts into curling flames.
 if(id==='ice'||id==='fire'){
  const count=id==='fire'?84:42;
  for(let i=0;i<count;i++){
   const angle=i/count*TAU+t*.07,wave=.5+.5*Math.sin(i*7.13+t*(id==='fire'?3.6:1.3));
   ctx.save();ctx.rotate(angle);ctx.translate(r+size*.015,0);ctx.globalAlpha=(.4+.45*wave)*power;
   if(id==='fire'){
    const length=size*(.035+wave*.105),width=size*(.012+.011*wave),curl=Math.sin(i*3.1-t*2.1)*size*.033;
    const g=ctx.createLinearGradient(-size*.015,0,length,0);g.addColorStop(0,p[1]);g.addColorStop(.35,p[0]);g.addColorStop(1,'rgba(188,17,35,0)');ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(-size*.02,-width);ctx.bezierCurveTo(length*.25,-width*1.8,length*.72,curl-width,length,curl);ctx.bezierCurveTo(length*.55,curl+width*.25,length*.25,width*1.6,-size*.02,width);ctx.closePath();ctx.fill();
   }else{
    const h=size*(.018+.048*wave);ctx.fillStyle=i%3===0?p[1]:p[0];ctx.beginPath();ctx.moveTo(-size*.01,-size*.01);ctx.lineTo(h*.65,-size*.008);ctx.lineTo(h,0);ctx.lineTo(h*.3,size*.014);ctx.closePath();ctx.fill();
   }ctx.restore();
  }
 }
 ctx.globalAlpha=.8;ctx.strokeStyle=p[1];ctx.lineWidth=size*.007;ctx.shadowColor=p[0];ctx.shadowBlur=size*.025;ctx.rotate(t*.35);
 for(let j=0;j<(rank?3:1);j++){ctx.beginPath();ctx.arc(0,0,r+size*.006,j*TAU/3,j*TAU/3+.3+rank*.04);ctx.stroke();}
 // Neon circuit ornaments and energy nodes intensify above the simple tier.
 if(rank>0){ctx.shadowBlur=size*.035;ctx.strokeStyle=p[1];ctx.fillStyle=p[1];ctx.lineWidth=size*.004;const nodes=6+rank*2;
  for(let i=0;i<nodes;i++){ctx.save();ctx.rotate(i/nodes*TAU-t*.12);const q=r+size*(.045+.015*Math.sin(t+i));ctx.globalAlpha=.45+.4*Math.sin(t*1.8+i)**2;ctx.beginPath();ctx.moveTo(q-size*.02,-size*.012);ctx.lineTo(q,0);ctx.lineTo(q+size*.015,0);ctx.stroke();ctx.translate(q+size*.02,0);ctx.rotate(Math.PI/4);ctx.fillRect(-size*.004,-size*.004,size*.008,size*.008);ctx.restore();}
 }
 ctx.restore();
 // AI-painted transparent ornaments sit over the animated mist and energy ring.
 const art=frameArt.get(id);
 if(art&&ornaments){ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.rect(-size*2,-size*2,size*4,size*4);ctx.arc(0,0,size*.32,0,TAU);ctx.clip('evenodd');const breathe=1+Math.sin(t*.9)*.007,span=size*1.61*breathe;ctx.rotate(Math.sin(t*.6)*(id==='gold'?.002:.006));ctx.shadowColor=p[0];ctx.shadowBlur=size*(.025+.012*Math.sin(t*1.6)**2)*power;ctx.drawImage(art,-span/2,-span/2,span,span);ctx.restore();}
}
