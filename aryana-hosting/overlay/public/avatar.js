import {TalkingHead} from '/assets/avatar/talkinghead.bundle.mjs';
import {HeadAudio} from '/assets/avatar/headaudio.min.mjs';
let head,lip,loading,visible=false;
const node=document.getElementById('avatar3d');
function report(status,detail=''){parent.postMessage({type:'aryana-avatar',status,detail},location.origin);}
export async function showAvatar(show){
 visible=show;node.hidden=!show;
 if(!show){head?.stop();return;}
 if(head){head.start();return;}
 if(loading)return loading;
 report('loading');
 loading=(async()=>{
  head=new TalkingHead(node,{lipsyncModules:[],cameraView:'head',cameraDistance:.8,cameraY:.3,modelFPS:24,modelPixelRatio:Math.min(.75,.75/devicePixelRatio),cameraRotateEnable:false,cameraPanEnable:false,cameraZoomEnable:false,lightAmbientIntensity:1.2,lightDirectIntensity:3,avatarMood:'neutral',avatarIdleEyeContact:.6,avatarIdleHeadMove:.4});
  await head.showAvatar({url:'/assets/avatar/mpfb.glb',body:'F',avatarMood:'neutral'});
  head.armature.traverse(mesh=>{if(!mesh.material)return;for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){if(material.name.includes('ponytail'))material.color.set('#51382c');if(material.name.includes('casualsuit'))material.color.set('#397b78');}});
  if(!visible)head.stop();report('ready');
 })().catch(error=>{head?.stop();head=null;node.hidden=true;report('error',error.message);}).finally(()=>{loading=null;});
 return loading;
}
export async function connectSpeech(context,source){
 if(!head||!visible)return;
 try{
  if(!lip){
   await context.audioWorklet.addModule('/assets/avatar/headworklet.min.mjs');
   lip=new HeadAudio(context,{parameterData:{vadGateActiveDb:-45,vadGateInactiveDb:-65}});
   await lip.loadModel('/assets/avatar/model-en-mixed.bin');
   lip.onvalue=(key,value)=>{const target=head?.mtAvatar[key];if(target){Object.assign(target,{newvalue:value,needsUpdate:true});if(value>.1)node.dataset.lastVisemeAt=String(Date.now());}};
   head.opt.update=lip.update.bind(lip);
   lip.onstarted=()=>{head.lookAtCamera(500);head.speakWithHands();};
  }
  source.connect(lip);
 }catch(error){report('lip-error',error.message);}
}
export function react(kind){if(!head||!visible)return;head.setMood('happy');if(['gift','join','intro'].includes(kind))head.playGesture(kind==='gift'?'thumbup':'handup',2);setTimeout(()=>head?.setMood('neutral'),4000);}
