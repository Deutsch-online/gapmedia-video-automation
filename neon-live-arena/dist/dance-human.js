'use strict';
(()=>{
 const procedural=window.DanceModels;
 let assetPromise;
 const ensureAsset=()=>assetPromise||(assetPromise=(async()=>{
  if(!THREE.GLTFLoader)throw Error('Human model loader is unavailable');
  const loader=new THREE.GLTFLoader(),textureLoader=new THREE.TextureLoader();
  const [body,head,color,normal,motion]=await Promise.all([loader.loadAsync('/models/dancer.glb'),loader.loadAsync('/models/head-scan.glb'),textureLoader.loadAsync('/models/head-color.jpg'),textureLoader.loadAsync('/models/head-normal.jpg'),loader.loadAsync('/models/dance-motion.glb')]);
  color.colorSpace=THREE.SRGBColorSpace;
  return {...body,head,color,normal,motion};
 })().catch(error=>{assetPromise=undefined;throw error}));
 function cloneRig(source){
  const clone=source.clone(true),sourceNodes=[],clonedNodes=[];
  source.traverse(n=>sourceNodes.push(n));clone.traverse(n=>clonedNodes.push(n));
  const nodes=new Map(sourceNodes.map((n,i)=>[n,clonedNodes[i]]));
  source.traverse(n=>{if(n.isSkinnedMesh){const m=nodes.get(n);m.skeleton=n.skeleton.clone();m.skeleton.bones=n.skeleton.bones.map(b=>nodes.get(b));m.bindMatrix.copy(n.bindMatrix);m.bindMatrixInverse.copy(n.bindMatrixInverse)}});
  // Geometry and textures belong to the cached asset. Only per-instance materials
  // are cloned, so a departing guest never disposes another dancer's skin maps.
  clone.traverse(n=>{if(n.isMesh){n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();n.castShadow=n.receiveShadow=true;n.frustumCulled=false}});
  return clone;
 }
 const position=new THREE.Vector3(),q=new THREE.Quaternion(),parentQ=new THREE.Quaternion();
 function orientDown(bone,child){
  bone.updateWorldMatrix(true,true);const origin=bone.getWorldPosition(new THREE.Vector3());
  const direction=child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
  const change=new THREE.Quaternion().setFromUnitVectors(direction,new THREE.Vector3(0,-1,0));
  bone.getWorldQuaternion(q).premultiply(change);bone.parent.getWorldQuaternion(parentQ);
  bone.quaternion.copy(parentQ.invert().multiply(q));bone.updateWorldMatrix(true,true);
 }
 function attach(c,gltf){
  if(c.disposed)return;
  const model=cloneRig(gltf.scene),bones={};model.traverse(n=>{if(n.isBone||n.name.startsWith('mixamorig'))bones[n.name.replace(/^mixamorig:?/,'')]=n});
  model.rotation.y=Math.PI;const container=new THREE.Group();container.add(model);c.root.add(container);container.visible=false;
  c.root.updateMatrixWorld(true);
  const authored=new Map();model.traverse(b=>{if(b.name.startsWith('mixamorig'))authored.set(b.name.replace(/^mixamorig:?/,''),b.getWorldQuaternion(new THREE.Quaternion()).premultiply(c.root.getWorldQuaternion(new THREE.Quaternion()).invert()))});
  // Normalize the authored T pose into the controller's relaxed stance, preserving
  // each bone's bind orientation for the retargeting correction below.
  for(const side of ['Left','Right']){
   orientDown(bones[side+'Arm'],bones[side+'ForeArm']);orientDown(bones[side+'ForeArm'],bones[side+'Hand']);
   orientDown(bones[side+'UpLeg'],bones[side+'Leg']);orientDown(bones[side+'Leg'],bones[side+'Foot']);
  }
  c.root.updateMatrixWorld(true);
  const neutralHip=bones.Hips.getWorldPosition(new THREE.Vector3());c.root.worldToLocal(neutralHip);
  const factor=1.545/neutralHip.y;model.scale.multiplyScalar(factor);model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model);c.root.worldToLocal(box.min);model.position.y-=box.min.y;
  c.root.updateMatrixWorld(true);
  const mappings=[[c.body,bones.Hips],[c.spine,bones.Spine],[c.chest,bones.Spine2],[c.head,bones.Head]];
  for(const [key,side] of [['L','Left'],['R','Right']]){const l=c.limbs[key];mappings.push([l.arm,bones[side+'Arm']],[l.elbow,bones[side+'ForeArm']],[l.wrist,bones[side+'Hand']],[l.leg,bones[side+'UpLeg']],[l.knee,bones[side+'Leg']],[l.ankle,bones[side+'Foot']])}
  // Capture the controller at rest; its current animated pose is saved and restored
  // so late network completion cannot reset a moving dancer.
  const rest=[];for(const [source] of mappings){rest.push([source,source.quaternion.clone(),source.position.clone()]);source.quaternion.identity()}
  c.body.position.set(0,0,0);c.root.updateMatrixWorld(true);
  const rootInverse=c.root.getWorldQuaternion(new THREE.Quaternion()).invert();
  const bindings=mappings.map(([source,bone])=>{
   const sourceQ=source.getWorldQuaternion(new THREE.Quaternion()).premultiply(rootInverse);
   const targetQ=bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(rootInverse);
   return {source,bone,correction:sourceQ.invert().multiply(targetQ)};
  });
  for(const [source,rotation,translation]of rest){source.quaternion.copy(rotation);source.position.copy(translation)}
  c.root.updateMatrixWorld(true);
  // Replace the low-resolution helmet/head with a genuine photographed 3D scan.
  // Remove only triangles belonging to the original head; retain the clothed neck.
  const ownedGeometries=[];
  model.traverse(n=>{
   if(n.name==='vanguard_visor'){n.visible=false;return}
   if(!n.isSkinnedMesh)return;
   const geometry=n.geometry.clone(),indices=geometry.index,skin=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight;
   const isHead=i=>{let w=0;for(let j=0;j<4;j++){const name=n.skeleton.bones[skin.getComponent?skin.getComponent(i,j):[skin.getX(i),skin.getY(i),skin.getZ(i),skin.getW(i)][j]].name;if(/Head/.test(name))w+=[weights.getX(i),weights.getY(i),weights.getZ(i),weights.getW(i)][j]}return w>.25};
   const kept=[];for(let i=0;i<indices.count;i+=3){const tri=[indices.getX(i),indices.getX(i+1),indices.getX(i+2)];if(!tri.some(isHead))kept.push(...tri)}
   geometry.setIndex(kept);n.geometry=geometry;ownedGeometries.push(geometry);
  });
  let scanMesh;gltf.head.scene.traverse(n=>{if(n.isMesh)scanMesh=n});
  const scanGeometry=scanMesh.geometry.clone(),scanIndices=scanGeometry.index,scanPositions=scanGeometry.attributes.position,keep=[];
  for(let i=0;i<scanIndices.count;i+=3){const tri=[scanIndices.getX(i),scanIndices.getX(i+1),scanIndices.getX(i+2)];if(tri.every(j=>scanPositions.getY(j)>-1.65))keep.push(...tri)}
  scanGeometry.setIndex(keep);const scanScale=.105;
  bones.Head.getWorldPosition(position);c.root.worldToLocal(position);const headY=position.y;
  bones.HeadTop_End.getWorldPosition(position);c.root.worldToLocal(position);const topY=position.y;
  scanGeometry.scale(scanScale,scanScale,scanScale);scanGeometry.translate(0,topY-headY-3.972547*scanScale,0);
  const scanMaterial=new THREE.MeshStandardMaterial({map:gltf.color,normalMap:gltf.normal,normalScale:new THREE.Vector2(.65,.65),roughness:.64,metalness:0});
  const scan=new THREE.Mesh(scanGeometry,scanMaterial);scan.castShadow=scan.receiveShadow=true;scan.frustumCulled=false;c.root.add(scan);ownedGeometries.push(scanGeometry);
  const materials=[scanMaterial];model.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material]){
   // The imported metallic factor is an exporter default; human skin and cotton
   // are dielectrics. Keep the authored color and normal maps on every surface.
   m.metalness=0;m.roughness=c.type==='disco'?.55:c.type==='sport'?.9:c.type==='astronaut'?.68:.76;m.envMapIntensity=.4;materials.push(m);
  }});
  const motion=cloneRig(gltf.motion.scene),motionBones={};motion.traverse(b=>{if(b.name.startsWith('mixamorig'))motionBones[b.name.replace(/^mixamorig:?/,'')]=b});motion.updateMatrixWorld(true);
  const motionRestHip=motionBones.Hips.getWorldPosition(new THREE.Vector3()),motionHeadInverse=motionBones.Head.getWorldQuaternion(new THREE.Quaternion()).invert();
  const recordedBindings=[];model.traverse(bone=>{
   const name=bone.name.replace(/^mixamorig:?/,'');if(!motionBones[name]||!authored.has(name))return;
   const source=motionBones[name];recordedBindings.push({source,bone,correction:source.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(authored.get(name))});
  });
  const mixer=new THREE.AnimationMixer(motion),clip=gltf.motion.animations.find(a=>a.name==='SambaDance');
  const dance=clip?mixer.clipAction(clip):null;if(dance){dance.play();dance.enabled=false}
  const originalHip=bones.Hips.position.clone();bones.Hips.getWorldPosition(position);const hipNeutralRoot=c.root.worldToLocal(position.clone());
  c.human={model,container,bones,bindings,materials,mixer,dance,originalHip,factor,scan,ownedGeometries,motion,motionBones,motionRestHip,motionHeadInverse,recordedBindings,hipNeutralRoot,footOffset:0};
  // Profile photos stay in name badges; the imported face remains a skinned mesh.
  c.body.visible=false;container.visible=true;c.root.userData.appearance='textured-human';
  const top=new THREE.Box3().setFromObject(model).max;c.root.worldToLocal(top);c.nameAnchor.position.y=top.y+.32;
  window.dispatchEvent(new CustomEvent('dance-human-ready'));
 }
 function create(type,index){
  const c=procedural.create(type,index);c.root.userData.appearance='loading';
  // Do not show the geometric stand-in while the textured character downloads.
  c.body.visible=false;c.ready=ensureAsset().then(gltf=>attach(c,gltf)).catch(error=>{
   if(!c.disposed){c.root.userData.appearance='unavailable';window.dispatchEvent(new CustomEvent('dance-human-error',{detail:'The human character could not load. Refresh to retry.'}))}
   console.warn('Human character load failed:',error.message);
  });return c;
 }
 function animate(c,beat,style,energy,dt,action,age,running=true){
  procedural.animate(c,beat,style,energy,dt,action,age,running);const h=c.human;if(!h)return;
  c.root.updateMatrixWorld(true);
  // Latin mode uses the artist's complete captured performance, including hands,
  // shoulders and facial/head motion. Other styles follow the existing IK rig.
  const captured=style==='salsa'&&running&&h.dance&&!(action&&age>=0&&age<2.8);
  if(captured){
   h.dance.enabled=true;const duration=h.dance.getClip().duration;
   h.mixer.setTime((((beat+c.phase)/2)%duration+duration)%duration);h.motion.updateMatrixWorld(true);
   const rootQ=c.root.getWorldQuaternion(new THREE.Quaternion());
   for(const {source,bone,correction}of h.recordedBindings){
    source.getWorldQuaternion(q).multiply(correction).premultiply(rootQ);bone.parent.getWorldQuaternion(parentQ);
    bone.quaternion.copy(parentQ.invert().multiply(q));bone.updateWorldMatrix(false,false);
   }
   h.motionBones.Hips.getWorldPosition(position).sub(h.motionRestHip).multiplyScalar(h.hipNeutralRoot.y/h.motionRestHip.y).add(h.hipNeutralRoot);
   position.y+=h.container.position.y;c.root.localToWorld(position);h.bones.Hips.parent.worldToLocal(position);h.bones.Hips.position.copy(position);
  }else{
   if(h.dance)h.dance.enabled=false;
   for(const {source,bone,correction}of h.bindings){
    source.getWorldQuaternion(q).multiply(correction);bone.parent.getWorldQuaternion(parentQ);
    bone.quaternion.copy(parentQ.invert().multiply(q));bone.updateWorldMatrix(false,false);
   }
   position.copy(h.hipNeutralRoot).add(new THREE.Vector3(c.pose.x,c.pose.y,c.pose.z));
   position.y+=h.container.position.y;c.root.localToWorld(position);h.bones.Hips.parent.worldToLocal(position);h.bones.Hips.position.copy(position);
   // Mild anatomically curved fingers replace the straight T-pose hands.
   for(const side of ['Left','Right'])for(const finger of ['Index','Middle','Ring','Pinky'])for(let i=1;i<=3;i++){
    const b=h.bones[side+'Hand'+finger+i];if(b)b.rotation.z=(side==='Left'?1:-1)*(.12+i*.045);
   }
  }
  c.root.updateMatrixWorld(true);
  // Compensate for different leg lengths. Keep the controller's jump height
  // instead of pulling airborne feet back to the floor.
  let lowest=Infinity;
  for(const key of ['LeftFoot','RightFoot']){h.bones[key].getWorldPosition(position);c.root.worldToLocal(position);lowest=Math.min(lowest,position.y)}
  const target=captured?.105:Math.min(c.pose.footL.y,c.pose.footR.y);
  const floorDelta=target-lowest;h.container.position.y+=floorDelta>0?floorDelta:floorDelta*(1-Math.exp(-dt*18));
  c.root.updateMatrixWorld(true);
  h.bones.Head.getWorldPosition(position);h.scan.position.copy(c.root.worldToLocal(position));
  if(captured){h.motionBones.Head.getWorldQuaternion(q).multiply(h.motionHeadInverse);h.scan.quaternion.copy(q)}
  else{c.head.getWorldQuaternion(q);c.root.getWorldQuaternion(parentQ);h.scan.quaternion.copy(parentQ.invert().multiply(q))}
  h.scan.updateMatrixWorld(true);
 }
 function dispose(c){
  c.disposed=true;
  if(c.human){c.human.mixer.stopAllAction();c.human.mixer.uncacheRoot(c.human.motion);c.human.materials.forEach(m=>m.dispose());c.human.ownedGeometries.forEach(g=>g.dispose());c.root.remove(c.human.container,c.human.scan)}
  procedural.dispose(c);
 }
 window.DanceModels={...procedural,create,animate,dispose,preload:ensureAsset};
})();
