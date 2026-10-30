export class AutomaticSpeechBuffer{
 constructor({now=()=>Date.now(),valid=()=>true,playable=()=>true}={}){Object.assign(this,{now,valid,playable});this.pending=null;this.prepared=null;this.pool=[];this.recent=[];this.endAt=0;this.resumeAt=0;}
 begin(ticket){if(this.pending||this.prepared)return false;this.pending=ticket;return true;}
 ready(ticket,clip){if(this.pending!==ticket)return false;this.pending=null;this.prepared=clip;return true;}
 failed(ticket){if(this.pending===ticket)this.pending=null;}
 interrupt(){this.pending=null;this.prepared=null;this.endAt=this.now();this.resumeAt=this.now()+4000;}
 observe(duration,priority=0){const now=this.now();this.endAt=(priority>=110?now:Math.max(now,this.endAt))+Math.max(.2,duration)*1000+300;}
 remember(clip){const key=clip.audio+'|'+clip.video;if(!['explain','joke','retention'].includes(clip.segment?.type))return;this.pool=this.pool.filter(item=>item.key!==key);this.pool.push({...clip,key});this.pool=this.pool.slice(-12);}
 take({enabled,blocked,context}){
  const now=this.now();if(!enabled||blocked||now<this.resumeAt||now<this.endAt-350)return null;
  if(this.prepared&&(!this.valid(this.prepared)||!this.playable(this.prepared.segment)||this.prepared.audio===this.recent.at(-1)&&!this.prepared.segment?.type?.startsWith('quiz'))){this.prepared=null;}
  if(this.prepared&&now>=(this.prepared.segment?.notBefore||0)){const clip=this.prepared;this.prepared=null;this.recent.push(clip.audio);this.recent=this.recent.slice(-2);return clip;}
  if(!this.pending&&!this.prepared)return null;
  this.pool=this.pool.filter(clip=>this.valid(clip));const candidates=this.pool.filter(clip=>clip.context===context&&!this.recent.includes(clip.audio));if(this.pool.filter(clip=>clip.context===context).length<3||!candidates.length)return null;
  const clip=candidates[0];this.recent.push(clip.audio);this.recent=this.recent.slice(-2);return {...clip,reused:true};
 }
}
