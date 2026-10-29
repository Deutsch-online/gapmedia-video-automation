const priority={manual:100,gift:85,vip:90,reply:65,join:35,like:15,thanks:10};
export class SpeechQueue{
 constructor({now=()=>Date.now(),limit=6}={}){this.now=now;this.limit=limit;this.items=[];}
 push(text,kind='manual',revision=0){
  const item={text,kind,revision,priority:priority[kind]??50,at:this.now()};
  if(this.items.some(x=>x.revision===revision&&x.text===text))return false;
  if(this.items.length>=this.limit){const lowest=this.items.reduce((a,b)=>a.priority<=b.priority?a:b);if(lowest.priority>=item.priority)return false;this.items.splice(this.items.indexOf(lowest),1);}
  this.items.push(item);this.items.sort((a,b)=>b.priority-a.priority||a.at-b.at);return true;
 }
 shift(revision){while(this.items.length){const item=this.items.shift(),ttl=item.priority>=80?120000:60000;if(item.revision===revision&&this.now()-item.at<=ttl)return item;}return null;}
 clear(){this.items=[];}
 get length(){return this.items.length;}
}
