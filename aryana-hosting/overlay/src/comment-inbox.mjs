export class CommentInbox{
 constructor({answer,speak,valid=()=>true,accepted=()=>{},changed=()=>{},error=()=>{},now=()=>Date.now(),limit=4,maxAge=30000}){Object.assign(this,{answer,speak,valid,accepted,changed,error,now,limit,maxAge});this.items=[];this.active=null;this.seen=new Set();}
 get busy(){return Boolean(this.active||this.items.length);}
 push(text,context={},key){if(key&&this.seen.has(key))return false;if(key){this.seen.add(key);while(this.seen.size>1000)this.seen.delete(this.seen.values().next().value);}const job={text,context,at:this.now()};if(this.items.length>=this.limit)this.items.shift();this.items.push(job);this.accepted(job);this.changed();void this.pump();return true;}
 clear(){this.items=[];if(this.active)this.active.cancelled=true;this.changed();}
 async pump(){if(this.active)return;while(this.items.length){const job=this.items.shift();if(!this.valid(job)||this.now()-job.at>this.maxAge)continue;this.active=job;this.changed();try{const text=await this.answer(job.text);if(!job.cancelled&&this.valid(job))this.speak(text,job);}catch(error){if(!job.cancelled&&this.valid(job))this.error(error);}finally{this.active=null;this.changed();}}}
}
