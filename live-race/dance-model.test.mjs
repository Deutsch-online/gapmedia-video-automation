import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({console,document:{createElement:()=>({width:64,height:64,getContext:()=>({fillRect(){}})})}});
context.window=context;
vm.runInContext(readFileSync(new URL('./dist/vendor/three.min.js',import.meta.url),'utf8'),context);
vm.runInContext(readFileSync(new URL('./dist/dance-model.js',import.meta.url),'utf8'),context);
const {THREE,DanceModels}=context;
const styles=['groove','shuffle','disco','wave','salsa','robot'];
test('all character rigs keep reachable ankles at their targets across dance styles',()=>{
 for(const type of ['street','disco','sport','astronaut']){
  const c=DanceModels.create(type,2);c.root.position.set(3,1.61,-2);c.root.rotation.y=.4;
  for(const style of styles)for(let frame=0;frame<360;frame++){
   DanceModels.animate(c,frame/30,style,1.8,1/60,null,0,true);c.root.updateMatrixWorld(true);
   for(const key of ['L','R']){
    const point=new THREE.Vector3();c.limbs[key].ankle.getWorldPosition(point);c.root.worldToLocal(point);
    assert.ok([point.x,point.y,point.z].every(Number.isFinite),`${type}/${style}: finite ankle`);
    assert.ok(Math.abs(point.y-c.pose['foot'+key].y)<.025,`${type}/${style}: foot contact`);
    assert.ok(c.limbs[key].knee.rotation.x>=-.001,`${type}/${style}: knee cannot bend backward`);
   }
  }
  DanceModels.dispose(c);
 }
});
test('pause returns to a stable stance and spin finishes without reversing a full turn',()=>{
 const c=DanceModels.create('street');
 for(let frame=0;frame<168;frame++)DanceModels.animate(c,frame/30,'groove',1,1/60,'spin',frame/60,true);
 const before=c.pose.ry;DanceModels.animate(c,5.6,'groove',1,1/60,'spin',2.8,true);
 assert.ok(Math.abs(c.pose.ry-before)<.12,'no reverse spin at action boundary');
 for(let frame=0;frame<180;frame++)DanceModels.animate(c,8,'shuffle',1,1/60,null,0,false);
 assert.ok(Math.abs(c.pose.x)<.001);assert.ok(Math.abs(c.pose.y)<.001);
 for(const key of ['L','R'])assert.ok(Math.abs(c.pose['foot'+key].y-.115)<.001);
 DanceModels.dispose(c);
});
