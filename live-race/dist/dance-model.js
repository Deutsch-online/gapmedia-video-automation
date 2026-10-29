'use strict';
(()=>{
 const palettes=['#9586bc','#447f83','#b47d52','#a96880','#4a658d','#93835b','#a65d54','#527c69'];
 const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const material=(color,metalness=0,roughness=.75)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 function ellipsoid(parent,m,x,y,z,sx,sy=sx,sz=sx){const o=mesh(new THREE.SphereGeometry(1,20,14),m,parent,x,y,z);o.scale.set(sx,sy,sz);return o}
 function joint(parent,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g}
 function segment(parent,m,length,top,bottom){return mesh(new THREE.CylinderGeometry(top,bottom,length,16),m,parent,0,-length/2,0)}
 function fabricTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='#bdbdbd';ctx.fillRect(0,0,64,64);for(let y=0;y<64;y+=2)for(let x=0;x<64;x+=2){ctx.fillStyle=(x+y)%4?'#b3b3b3':'#c9c9c9';ctx.fillRect(x,y,1,2)}const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(7,7);return t}
 function createCharacter(type,index=0){
  const root=new THREE.Group(),body=joint(root,0,0,0),pelvis=joint(body,0,1.58,0),spine=joint(pelvis,0,.12,0),chest=joint(spine,0,.45,0);
  const color=palettes[index%palettes.length],skin=material(['#c89977','#8c5940','#e2b795','#b07b5b'][index%4],0,.62),lips=material('#915f56'),hair=material(['#251b18','#32251e','#171719','#524132'][index%4],0,.92),eyeWhite=material('#d9d6cb',0,.4),iris=material('#3f3026',0,.32),pupil=material('#111214',0,.22);
  const cloth=material(type==='astronaut'?'#d9dbd7':color,type==='disco'?.35:0,type==='disco'?.39:.91),pants=material(type==='sport'?color:type==='astronaut'?'#b6bfbe':'#232a33',0,.94),sole=material('#b9b8b2',0,.86),shoe=material(type==='disco'?'#242224':'#3c4249',0,.7),trim=material(type==='astronaut'?'#527b83':'#c5b8a0',type==='disco'?.65:.1,.4);
  cloth.bumpMap=fabricTexture();cloth.bumpScale=.013;
  // A seven-and-a-half-head silhouette, tapered torso, articulated spine and pelvis.
  ellipsoid(pelvis,pants,0,0,0,.29,.22,.19);
  const outline=[[.255,-.12],[.27,-.06],[.255,.10],[.25,.22],[.285,.40],[.33,.55],[.335,.64],[.29,.72],[.15,.79],[.10,.80]].map(([r,y])=>new THREE.Vector2(r,y));
  const torso=mesh(new THREE.LatheGeometry(outline,32),cloth,spine);torso.scale.z=.64;
  const neck=joint(chest,0,.4,0);mesh(new THREE.CylinderGeometry(.085,.105,.20,16),skin,neck,0,.04,0);
  const head=joint(neck,0,.28,0);
  ellipsoid(head,skin,0,.015,0,.205,.265,.195);ellipsoid(head,skin,0,-.12,.035,.155,.15,.145);
  for(const sign of [-1,1]){
   ellipsoid(head,skin,sign*.203,-.01,-.005,.035,.062,.033);
   ellipsoid(head,eyeWhite,sign*.079,.037,.176,.047,.023,.015);
   ellipsoid(head,iris,sign*.079,.037,.190,.019,.019,.006);
   ellipsoid(head,pupil,sign*.079,.037,.195,.009,.012,.004);
   const brow=ellipsoid(head,hair,sign*.079,.084,.176,.052,.011,.009);brow.rotation.z=-sign*.08;
   const lid=ellipsoid(head,skin,sign*.079,.061,.181,.050,.009,.010);
   ellipsoid(head,skin,sign*.022,-.049,.196,.019,.014,.016);
  }
  ellipsoid(head,skin,0,-.005,.190,.023,.056,.026);ellipsoid(head,skin,0,-.04,.22,.025,.021,.021);
  ellipsoid(head,lips,0,-.109,.172,.057,.009,.013);ellipsoid(head,skin,0,-.145,.153,.065,.027,.025);
  const scalp=mesh(new THREE.SphereGeometry(1,24,16,0,TAU,0,Math.PI*.55),hair,head,0,.03,-.025);scalp.scale.set(.211,.267,.195);
  for(let i=0;i<5;i++){const lock=ellipsoid(head,hair,-.13+i*.057,.229-i*.006,.04,.07,.052,.12);lock.rotation.z=-.2}
  if(type==='street'){const hood=ellipsoid(chest,cloth,0,.27,-.16,.255,.18,.13);for(const sign of [-1,1])mesh(new THREE.CylinderGeometry(.009,.009,.22,6),sole,chest,sign*.07,.17,.195)}
  if(type==='disco'){for(const sign of [-1,1]){const lapel=mesh(new THREE.BoxGeometry(.07,.35,.018),trim,chest,sign*.1,.08,.19);lapel.rotation.z=-sign*.18}ellipsoid(chest,skin,0,.24,.17,.065,.1,.03)}
  if(type==='sport'){for(const sign of [-1,1])mesh(new THREE.BoxGeometry(.025,.30,.02),sole,chest,sign*.27,.07,.145)}
  if(type==='astronaut'){mesh(new THREE.BoxGeometry(.23,.20,.05),trim,chest,0,.07,.20);for(let i=0;i<3;i++)ellipsoid(chest,sole,-.06+i*.06,.1,.232,.012);mesh(new THREE.BoxGeometry(.37,.48,.16),pants,chest,0,.02,-.25)}
  const limbs={};
  for(const [key,sign]of [['L',-1],['R',1]]){
   const arm=joint(chest,sign*.345,.24,0);ellipsoid(arm,cloth,0,-.04,0,.115,.14,.12);segment(arm,cloth,.48,.105,.075);
   const elbow=joint(arm,0,-.48,0);ellipsoid(elbow,type==='street'||type==='disco'?skin:cloth,0,0,0,.077);segment(elbow,type==='street'||type==='disco'?skin:cloth,.43,.073,.045);
   const wrist=joint(elbow,0,-.43,0),hand=joint(wrist,0,-.07,0);ellipsoid(hand,type==='astronaut'?sole:skin,0,0,0,.055,.09,.034);
   for(let f=0;f<4;f++){const finger=ellipsoid(hand,skin,(f-1.5)*.025,-.1,.01,.012,.044,.015);finger.rotation.x=-.14-f*.04}const thumb=ellipsoid(hand,skin,-sign*.055,-.015,.018,.022,.05,.023);thumb.rotation.z=-sign*.45;
   const leg=joint(pelvis,sign*.17,-.035,0);ellipsoid(leg,pants,0,-.09,0,.14,.18,.14);segment(leg,pants,.72,.13,.092);
   const knee=joint(leg,0,-.72,0);ellipsoid(knee,pants,0,0,0,.095);segment(knee,pants,.70,.09,.06);
   const ankle=joint(knee,0,-.70,0);ellipsoid(ankle,shoe,0,-.03,.09,.10,.09,.20);ellipsoid(ankle,sole,0,-.087,.09,.105,.025,.205);
   limbs[key]={arm,elbow,wrist,leg,knee,ankle,sign};
  }
  const nameAnchor=joint(root,0,3.45,0),faceAnchor=joint(head,0,0,.22);
  const face=head;return {root,body,hip:pelvis,spine,chest,head,face,faceAnchor,nameAnchor,limbs,type,index,color,pose:{},phase:index*.17};
 }
 // Foot targets stay fixed during the support phase. A smooth swing lifts each foot
 // only while it travels; two-bone IK keeps the knees bending forward.
 function footTarget(key,beat,style,energy){
  const sign=key==='L'?-1:1,cycle=((beat/2+(key==='L'?0:.5))%1+1)%1;
  const swing=cycle>.58?(cycle-.58)/.42:0,lift=Math.sin(swing*Math.PI);
  let x=sign*.18,z=.04,y=.115;
  if(style==='shuffle'){z=cycle<=.58?.20-.40*cycle/.58:-.20+.40*(swing*swing*(3-2*swing));y+=lift*.16*energy;x+=sign*.035*lift}
  else if(style==='salsa'){z=cycle<=.58?.12:-.12*Math.cos(swing*Math.PI);y+=lift*.08*energy;x+=sign*.07*lift*energy}
  else if(style==='groove'||style==='disco'){x+=sign*.09*lift*energy;y+=lift*.045*energy}
  else if(style==='robot'){y+=lift*.035*energy}
  return {x,y,z};
 }
 function choreography(style,t,energy){
  const b=t*TAU,p=Math.sin(b*.5),q=Math.cos(b*.5),beat=Math.sin(b),s={x:p*.055*energy,y:-.018-Math.pow(Math.sin(b),2)*.035*energy,z:0,rx:.025,ry:p*.06*energy,rz:-p*.025*energy,spineX:Math.sin(b-.35)*.025*energy,spineY:p*.06*energy,head:-p*.025,headY:-p*.04,Lax:-.15+q*.12,Rax:-.15-q*.12,Laz:.12+p*.07,Raz:-.12+p*.07,Lel:-.60-q*.15,Rel:-.60+q*.15};
  if(style==='groove'){s.x=p*.105*energy;s.spineX=Math.sin(b-.5)*.05*energy;s.Lax=-.2+q*.24*energy;s.Rax=-.2-q*.24*energy;s.Lel=-.95+beat*.22;s.Rel=-.95-beat*.22}
  if(style==='shuffle'){s.rx=.10;s.x=p*.055*energy;s.Lax=-.1-p*.48*energy;s.Rax=-.1+p*.48*energy;s.Lel=-.85;s.Rel=-.85;s.spineY=-p*.10*energy}
  if(style==='disco'){const reach=.5+.5*Math.sin(b*.25);s.Laz=.18+1.95*reach*energy;s.Raz=-.18-1.95*(1-reach)*energy;s.Lel=-.7+.50*reach;s.Rel=-.7+.50*(1-reach);s.spineY=p*.15*energy;s.rz=-p*.055*energy}
  if(style==='wave'){s.Laz=1.0+Math.sin(b*.5)*.20*energy;s.Raz=-1.0+Math.sin(b*.5-1)*.20*energy;s.Lel=-.7+Math.sin(b*.5-.6)*.48*energy;s.Rel=-.7+Math.sin(b*.5-1.6)*.48*energy;s.spineX=Math.sin(b*.5-.8)*.11*energy;s.head=Math.sin(b*.5-1.2)*.06;s.ry=p*.12*energy}
  if(style==='salsa'){s.x=p*.115*energy;s.ry=-p*.13*energy;s.spineY=p*.22*energy;s.Laz=.40;s.Raz=-.4;s.Lel=-1.2;s.Rel=-1.2;s.Lax=-.25+q*.17;s.Rax=-.25-q*.17}
  if(style==='robot'){const stop=Math.tanh(beat*4);s.ry=Math.tanh(p*3)*.18*energy;s.spineY=-s.ry*.5;s.Lax=-.65+stop*.35*energy;s.Rax=-.65-stop*.35*energy;s.Lel=-1.4+stop*.35;s.Rel=-1.4-stop*.35;s.Laz=.35;s.Raz=-.35;s.y=-.03}
  return s;
 }
 const down=new THREE.Vector3(0,-1,0),rotation=new THREE.Quaternion();
 function solveLeg(c,key,target){
  const l=c.limbs[key],hip=l.leg.position.clone(),ankle=new THREE.Vector3(target.x,target.y,target.z);
  c.body.worldToLocal(c.root.localToWorld(ankle));c.hip.worldToLocal(c.body.localToWorld(ankle));
  const delta=ankle.sub(hip),a=.72,b=.70,d=clamp(delta.length(),.1,a+b-.001),forward=delta.clone().normalize();
  const pole=new THREE.Vector3(0,0,1).addScaledVector(forward,-forward.z).normalize();
  const along=(a*a+d*d-b*b)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
  const knee=forward.multiplyScalar(along).addScaledVector(pole,height);
  l.leg.quaternion.setFromUnitVectors(down,knee.clone().normalize());
  const shin=delta.sub(knee).normalize().applyQuaternion(rotation.copy(l.leg.quaternion).invert());
  l.knee.quaternion.setFromUnitVectors(down,shin);
  const worldQ=new THREE.Quaternion();l.knee.getWorldQuaternion(worldQ);c.root.getWorldQuaternion(rotation);l.ankle.quaternion.copy(worldQ.invert().multiply(rotation));
 }
 function animateCharacter(c,beat,style,energy,dt,action,age,running=true){
  energy=clamp(Number(energy)||.4,.2,1.8);const t=beat+c.phase,s=choreography(style,t,energy),targets={L:footTarget('L',t,style,energy),R:footTarget('R',t,style,energy)};
  if(!running){for(const k in s)s[k]=({Lax:-.06,Rax:-.06,Laz:.09,Raz:-.09,Lel:-.15,Rel:-.15}[k]||0);targets.L={x:-.18,y:.115,z:.04};targets.R={x:.18,y:.115,z:.04}}
  if(running&&action&&age>=0&&age<2.8){const u=age/2.8,e=Math.sin(u*Math.PI)**2;if(action==='spin'){const turn=u*u*(3-2*u)*TAU;s.ry+=turn;s.Laz+=e*.5;s.Raz-=e*.5;for(const f of Object.values(targets)){const x=f.x;f.x=x*Math.cos(turn)+f.z*Math.sin(turn);f.z=f.z*Math.cos(turn)-x*Math.sin(turn)}}else if(action==='jump'){const jump=Math.sin(Math.PI*clamp((u-.15)/.7,0,1))**2*.38*energy;s.y+=jump;for(const f of Object.values(targets))f.y+=jump;s.Laz+=e;s.Raz-=e}else if(action==='hello'){s.Raz=-2.3*e-.1;s.Rel=-.2-e*(.6+Math.sin(age*11)*.25)}}
  if(c.pose.ry!==undefined)s.ry+=Math.round((c.pose.ry-s.ry)/TAU)*TAU;
  const alpha=1-Math.exp(-Math.min(.1,Math.max(0,dt))*14);for(const k in s)c.pose[k]=(c.pose[k]??s[k])+(s[k]-(c.pose[k]??s[k]))*alpha;
  const v=c.pose;c.body.position.set(v.x,v.y,v.z);c.body.rotation.set(v.rx,v.ry,v.rz);c.spine.rotation.set(v.spineX,v.spineY,0);c.chest.rotation.y=-v.spineY*.3;c.head.rotation.set(-v.spineX*.35,v.headY,v.head);
  for(const key of ['L','R']){const l=c.limbs[key];l.arm.rotation.set(v[key+'ax'],0,v[key+'az']);l.elbow.rotation.x=v[key+'el'];l.wrist.rotation.set(-.08,Math.sin(t*Math.PI-.6)*.08,-l.sign*.08)}
  c.root.updateMatrixWorld(true);for(const key of ['L','R']){const target=targets[key];const previous=c.pose['foot'+key]||(c.pose['foot'+key]={...target});for(const axis of ['x','y','z'])previous[axis]+=(target[axis]-previous[axis])*alpha;solveLeg(c,key,previous);c.root.updateMatrixWorld(true)}
 }
 function disposeCharacter(c){const geometries=new Set(),materials=new Set(),textures=new Set();c.root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if(m.map)textures.add(m.map);if(m.bumpMap)textures.add(m.bumpMap)}}});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose())}
 window.DanceModels={create:createCharacter,animate:animateCharacter,dispose:disposeCharacter,palettes};
})();
