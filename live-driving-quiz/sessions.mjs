import {randomUUID} from 'node:crypto';
const shuffled=ids=>{const out=[...ids];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
export class QuizSessions{
 constructor(ids,saved={}, {shuffle=shuffled,now=()=>Date.now()}={}){
  this.ids=[...new Set(ids)];this.shuffle=shuffle;this.now=now;this.reviewId=null;
  this.size=Number.isInteger(saved.size)&&saved.size>=50&&saved.size<=ids.length?saved.size:50;
  this.allowRepeat=saved.allowRepeat===true;this.number=Number.isInteger(saved.number)?saved.number:0;
  this.completed=Object.fromEntries(Object.entries(saved.completed||{}).filter(([id,v])=>this.ids.includes(id)&&v&&Number.isFinite(v.at)));
  const s=saved.session;this.session=s&&Array.isArray(s.ids)&&s.ids.length>=50&&new Set(s.ids).size===s.ids.length&&s.ids.every(id=>this.ids.includes(id))&&Number.isInteger(s.cursor)&&s.cursor>=0&&s.cursor<=s.ids.length?{...s,done:(Array.isArray(s.done)?s.done:[]).filter(id=>s.ids.includes(id))}:null;
 }
 configure(size,repeat){if(!Number.isInteger(size)||size<50||size>this.ids.length||typeof repeat!=='boolean')throw Error(`تعداد جلسه باید بین 50 و ${this.ids.length} باشد.`);this.size=size;this.allowRepeat=repeat;}
 create(){
  const fresh=this.ids.filter(id=>!this.completed[id]);if(fresh.length<this.size&&!this.allowRepeat)throw Error(`فقط ${fresh.length} سؤال تازه مانده است؛ برای جلسهٔ ${this.size} سؤالی، تکرار را روشن کنید یا تعداد را کاهش دهید.`);
  const order=[...this.shuffle(fresh),...(this.allowRepeat?this.shuffle(this.ids.filter(id=>this.completed[id])):[])].slice(0,this.size);
  this.number++;this.session={id:randomUUID(),number:this.number,ids:order,cursor:0,done:[],createdAt:this.now()};this.reviewId=null;return this.current();
 }
 current(){return this.reviewId||this.session?.ids[this.session.cursor]||null;}
 ensure(){if(this.reviewId)return this.reviewId;if(!this.session)return this.create();if(!this.current())throw Error('جلسه تمام شده است؛ جلسهٔ جدید را از پنل شروع کنید.');return this.current();}
 review(id,{explicitRepeat=false}={}){if(!this.ids.includes(id))throw Error('سؤال ناشناخته است.');if(this.completed[id]&&!this.allowRepeat&&!explicitRepeat)throw Error('برای مرور سؤال انجام‌شده، تکرار را در پنل روشن کنید.');this.reviewId=id;}
 complete(id){if(!this.ids.includes(id))return;const old=this.completed[id];this.completed[id]={at:this.now(),attempts:(old?.attempts||0)+1};if(this.session?.ids.includes(id)&&!this.session.done.includes(id))this.session.done.push(id);}
 next(){if(this.reviewId){this.reviewId=null;return this.session?this.current():this.ensure();}if(!this.session)return this.ensure();this.session.cursor=Math.min(this.session.cursor+1,this.session.ids.length);return this.current();}
 export(){return {version:1,size:this.size,allowRepeat:this.allowRepeat,number:this.number,completed:this.completed,session:this.session};}
 summary(){return {number:this.session?.number||this.number+1,size:this.session?.ids.length||this.size,position:this.reviewId?null:Math.min((this.session?.cursor||0)+1,this.session?.ids.length||this.size),done:this.session?.done.length||0,finished:Boolean(this.session&&this.session.cursor>=this.session.ids.length),review:Boolean(this.reviewId),configuredSize:this.size,allowRepeat:this.allowRepeat,bankTotal:this.ids.length,completedTotal:Object.keys(this.completed).length,freshTotal:this.ids.length-Object.keys(this.completed).length};}
}
