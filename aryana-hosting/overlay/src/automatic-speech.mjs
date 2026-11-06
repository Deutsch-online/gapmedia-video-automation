export class AutomaticSpeechBuffer{
 constructor({now=()=>Date.now(),valid=()=>true,playable=()=>true}={}){Object.assign(this,{now,valid,playable});this.pending=null;this.prepared=null;this.deferred=[];this.pool=[];this.consumed=new Set();this.recent=[];this.endAt=0;this.resumeAt=0;}
 begin(ticket){if(this.pending||this.prepared)return false;this.pending=ticket;return true;}
 ready(ticket,clip){if(this.pending!==ticket)return false;this.pending=null;if(clip.segment?.notBefore>this.now())this.deferred.push(clip);else this.prepared=clip;return true;}
 failed(ticket){if(this.pending===ticket)this.pending=null;}
 interrupt(){this.pending=null;this.prepared=null;this.deferred=[];this.endAt=this.now();this.resumeAt=this.now()+1000;}
 observe(duration,priority=0){const now=this.now();this.endAt=(priority>=110?now:Math.max(now,this.endAt))+Math.max(.2,duration)*1000;}
 remember(clip){const key=clip.audio+'|'+clip.video;if(this.consumed.has(key)||!['explain','joke','retention','program','support'].includes(clip.segment?.type))return;this.pool=this.pool.filter(item=>item.key!==key);this.pool.push({...clip,key});this.pool=this.pool.slice(-12);}
 eligible(clip,context){return clip.context===context&&this.valid(clip)&&this.playable({...clip.segment,text:clip.text||clip.segment?.text});}
 take({enabled,blocked,context}){
  const now=this.now();this.deferred=this.deferred.filter(clip=>this.eligible(clip,context));
  if(this.prepared&&!this.eligible(this.prepared,context))this.prepared=null;
  if(this.prepared&&this.prepared.segment?.notBefore>now){this.deferred.push(this.prepared);this.prepared=null;}
  if(!enabled||blocked||now<this.resumeAt||now<this.endAt-350)return null;
  const due=this.deferred.findIndex(clip=>now>=(clip.segment?.notBefore||0));
  let clip=due>=0?this.deferred.splice(due,1)[0]:this.prepared;
  if(clip===this.prepared)this.prepared=null;
  if(!clip){this.pool=this.pool.filter(item=>this.valid(item));clip=this.pool.find(item=>this.eligible(item,context)&&!this.recent.includes(item.audio));if(clip)clip={...clip,fromPreparedBank:true};}
  if(!clip)return null;const key=clip.audio+'|'+clip.video;this.consumed.add(key);this.pool=this.pool.filter(item=>item.key!==key);this.recent.push(clip.audio);this.recent=this.recent.slice(-2);return clip;
 }
}
