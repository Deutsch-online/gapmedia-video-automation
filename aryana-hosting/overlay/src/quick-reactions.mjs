export const quickPhrases={
 'welcome:fa':'سلام، خوش آمدید!', 'welcome:en':'Hello, welcome!',
 'vip-welcome:fa':'با احترام فراوان خوش آمدید!', 'vip-welcome:en':'A very warm welcome!',
 'thanks:fa':'بسیار تشکر!', 'thanks:en':'Thank you very much!'
};
export class QuickReactions{
 constructor({now=()=>Date.now(),blocked=()=>false,publish=()=>{}}={}){Object.assign(this,{now,blocked,publish});this.clips=new Map();this.pending=new Map();this.endAt=0;}
 offer(type,language='fa',priority=90){const key=type+':'+(language==='en'?'en':'fa');const old=this.pending.get(key);this.pending.set(key,{key,count:(old?.count||0)+1,priority:Math.max(priority,old?.priority||0),at:old?.at??this.now()});this.drain();}
 drain(){if(this.blocked()||this.now()<this.endAt)return false;const job=[...this.pending.values()].filter(job=>this.clips.has(job.key)).sort((a,b)=>b.priority-a.priority||a.at-b.at)[0];if(!job)return false;this.pending.delete(job.key);const clip=this.clips.get(job.key);this.endAt=this.now()+clip.durationSeconds*1000;this.publish({...clip,kind:'reaction',priority:job.priority,batchCount:job.count});return true;}
 clear(){this.pending.clear();this.endAt=0;}
 ready(){return Object.keys(quickPhrases).every(key=>this.clips.has(key));}
}
