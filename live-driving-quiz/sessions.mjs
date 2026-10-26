import {randomUUID} from 'node:crypto';
const shuffled=ids=>{const out=[...ids];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
export class QuizSessions{
 constructor(ids,saved={}, {shuffle=shuffled,now=()=>Date.now(),groups={}}={}){
  this.ids=[...new Set(ids)];this.shuffle=shuffle;this.now=now;this.reviewId=null;this.groups=groups;this.section=saved.section&&this.groups[saved.section]?saved.section:"all";
  this.size=Number.isInteger(saved.size)&&saved.size>=(this.section==='all'?30:1)&&saved.size<=this.pool().length?saved.size:Math.min(30,this.pool().length);
  this.allowRepeat=saved.allowRepeat===true;this.number=Number.isInteger(saved.number)?saved.number:0;
  this.completed=Object.fromEntries(Object.entries(saved.completed||{}).filter(([id,v])=>this.ids.includes(id)&&v&&Number.isFinite(v.at)));
  this.lessonPlan={version:1,studied:[],queued:[],active:null,...(saved.lessonPlan||{})};
  if(!Array.isArray(this.lessonPlan.studied))this.lessonPlan.studied=[];if(!Array.isArray(this.lessonPlan.queued))this.lessonPlan.queued=[];
  if(saved.lessonVersion!==2)this.size=Math.min(30,this.pool().length);
  const s=saved.session;this.session=s&&Array.isArray(s.ids)&&s.ids.length>=1&&new Set(s.ids).size===s.ids.length&&s.ids.every(id=>this.ids.includes(id))&&Number.isInteger(s.cursor)&&s.cursor>=0&&s.cursor<=s.ids.length?{...s,done:(Array.isArray(s.done)?s.done:[]).filter(id=>s.ids.includes(id))}:null;
  this.refreshLessons();
 }
 pool(section=this.section){return section==='all'?this.ids:this.ids.filter(id=>this.groups[section]?.ids.includes(id));}
 configure(size,repeat,section="all"){if(section!=="all"&&!this.groups[section])throw Error("بخش ناشناخته است.");const min=section==='all'?30:1,max=this.pool(section).length;if(!Number.isInteger(size)||size<min||size>max||typeof repeat!=='boolean')throw Error(`تعداد جلسه باید بین ${min} و ${max} باشد.`);this.size=size;this.allowRepeat=repeat;this.section=section;}
 create(){
  const pool=this.pool();const fresh=pool.filter(id=>!this.completed[id]);if(fresh.length<this.size&&!this.allowRepeat)throw Error(`فقط ${fresh.length} سؤال تازه مانده است؛ برای جلسهٔ ${this.size} سؤالی، تکرار را روشن کنید یا تعداد را کاهش دهید.`);
  const order=[...this.shuffle(fresh),...(this.allowRepeat?this.shuffle(pool.filter(id=>this.completed[id])):[])].slice(0,this.size);
  this.number++;this.session={id:randomUUID(),number:this.number,section:this.section,ids:order,cursor:0,done:[],createdAt:this.now()};this.reviewId=null;return this.current();
 }
 repeat(){if(!this.session)throw Error("هنوز جلسه‌ای ساخته نشده است.");this.number++;this.session={...this.session,id:randomUUID(),number:this.number,cursor:0,done:[],createdAt:this.now()};this.reviewId=null;return this.current();}
 current(){return this.reviewId||this.session?.ids[this.session.cursor]||null;}
 ensure(){if(this.reviewId)return this.reviewId;if(!this.session)return this.create();if(!this.current())throw Error('جلسه تمام شده است؛ جلسهٔ جدید را از پنل شروع کنید.');return this.current();}
 review(id,{explicitRepeat=false}={}){if(!this.ids.includes(id))throw Error('سؤال ناشناخته است.');if(this.completed[id]&&!this.allowRepeat&&!explicitRepeat)throw Error('برای مرور سؤال انجام‌شده، تکرار را در پنل روشن کنید.');this.reviewId=id;}
 complete(id){if(!this.ids.includes(id))return;const old=this.completed[id];this.completed[id]={at:this.now(),attempts:(old?.attempts||0)+1};if(this.session?.ids.includes(id)&&!this.session.done.includes(id))this.session.done.push(id);if(this.session?.done.length===this.session?.ids.length)this.archiveLesson();else this.refreshLessons();}
 next(){if(this.reviewId){this.reviewId=null;return this.session?this.current():this.ensure();}if(!this.session)return this.ensure();this.session.cursor=Math.min(this.session.cursor+1,this.session.ids.length);return this.current();}
 export(){return {version:1,lessonVersion:2,lessonPlan:this.lessonPlan,section:this.section,size:this.size,allowRepeat:this.allowRepeat,number:this.number,completed:this.completed,session:this.session};}
 refreshLessons(){
  const active=new Set(this.lessonPlan.active?.ids||[]),fresh=this.ids.filter(id=>!this.completed[id]&&!active.has(id));
  const valid=this.lessonPlan.queued.flatMap(row=>row.ids||[]),known=new Set(valid);
  if(valid.length===known.size&&valid.every(id=>fresh.includes(id))&&this.lessonPlan.queued.every(row=>row.ids.length===30)&&valid.length===Math.floor(fresh.length/30)*30 )return;
  const technical=fresh.filter(id=>this.groups.technical?.ids.includes(id)),other=fresh.filter(id=>!this.groups.technical?.ids.includes(id));
  const ordered=[...technical,...other],queued=[];
  for(let i=0;i+30<=ordered.length;i+=30)queued.push({id:randomUUID(),ids:ordered.slice(i,i+30),createdAt:this.now()});
  this.lessonPlan.queued=queued;
 }
 archiveLesson(){
  const session=this.session;if(!session||session.done.length!==session.ids.length)return;
  if(!this.lessonPlan.studied.some(row=>row.sessionId===session.id))this.lessonPlan.studied.push({id:session.lessonId||randomUUID(),sessionId:session.id,ids:[...session.ids],at:this.now(),replay:session.replay===true});
  this.lessonPlan.active=null;this.refreshLessons();
 }
 nextLesson(){
  this.lessonPlan.active=null;this.refreshLessons();const row=this.lessonPlan.queued.shift();if(!row)throw Error('برای جلسهٔ تازهٔ 30 سوالی، سوال خوانده‌نشدهٔ کافی نمانده است. سوال تکراری خودکار اضافه نمی‌شود.');
  this.number++;this.section='all';this.size=30;this.allowRepeat=false;this.reviewId=null;
  this.session={id:randomUUID(),number:this.number,section:'all',lessonId:row.id,ids:[...row.ids],cursor:0,done:[],createdAt:this.now()};this.lessonPlan.active={...row,sessionId:this.session.id};return this.current();
 }
 replayLesson(id){const row=this.lessonPlan.studied.find(row=>row.id===id);if(!row||!row.ids.every(id=>this.ids.includes(id)))throw Error('جلسهٔ خوانده‌شده پیدا نشد.');this.lessonPlan.active=null;this.number++;this.reviewId=null;this.session={id:randomUUID(),number:this.number,section:'all',lessonId:row.id,replay:true,ids:[...row.ids],cursor:0,done:[],createdAt:this.now()};return this.current();}
 lessonFolders(){
  const queued=this.lessonPlan.queued,planned=new Set(queued.flatMap(row=>row.ids)),active=new Set(this.lessonPlan.active?.ids||[]);
  const view=(row,i)=>({id:row.id,number:i+1,count:row.ids.length,at:row.at||null,technical:row.ids.filter(id=>this.groups.technical?.ids.includes(id)).length});
  return {queued:queued.map(view),studied:this.lessonPlan.studied.map(view),active:this.lessonPlan.active?view(this.lessonPlan.active,0):null,remainder:this.ids.filter(id=>!this.completed[id]&&!planned.has(id)&&!active.has(id)).length};
 }
 summary(){return {lessonFolders:this.lessonFolders(),section:this.section,sections:[{id:"all",label:"عمومی",count:this.ids.length},...Object.entries(this.groups).map(([id,g])=>({id,label:g.label,count:g.ids.length}))],poolTotal:this.pool().length,minSize:this.section==='all'?30:1,hasSession:Boolean(this.session),number:this.session?.number||this.number+1,size:this.session?.ids.length||this.size,position:this.reviewId?null:Math.min((this.session?.cursor||0)+1,this.session?.ids.length||this.size),done:this.session?.done.length||0,finished:Boolean(this.session&&this.session.cursor>=this.session.ids.length),review:Boolean(this.reviewId),configuredSize:this.size,allowRepeat:this.allowRepeat,bankTotal:this.ids.length,completedTotal:Object.keys(this.completed).length,freshTotal:this.ids.length-Object.keys(this.completed).length};}
}
