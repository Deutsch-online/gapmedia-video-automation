import {spawn,execFile} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync,rmSync} from 'node:fs';
import {join} from 'node:path';

export class LipSyncBudget{
 constructor({limit=6,now=()=>Date.now(),changed=()=>{}}={}){this.limit=limit;this.now=now;this.changed=changed;this.day='';this.used=0;}
 resetDay(){const day=new Date(this.now()).toISOString().slice(0,10);if(day!==this.day){this.day=day;this.used=0;}}
 restore(data){this.resetDay();if(data?.day===this.day&&Number.isFinite(data.used)&&data.used>=0)this.used=data.used;}
 snapshot(){this.resetDay();return {day:this.day,used:this.used,limit:this.limit};}
 reserve(amount){this.resetDay();if(!Number.isFinite(amount)||amount<=0||this.used+amount>this.limit+1e-8)throw Error('سقف بودجهٔ روزانهٔ لب‌خوانی پر شده است.');this.used+=amount;this.changed();return {day:this.day,amount};}
 settle(ticket,measuredUpperBound){this.resetDay();if(ticket.day===this.day){this.used=Math.max(0,this.used-ticket.amount+Math.min(ticket.amount,Math.max(0,measuredUpperBound)));this.changed();}}
}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function audioDuration(file){return new Promise((resolve,reject)=>execFile('ffprobe',['-v','error','-show_entries','format=duration','-of','json',file],{timeout:10000,maxBuffer:16000},(e,s)=>{if(e)return reject(Error('فایل صدا قابل بررسی نیست.'));try{const n=Number(JSON.parse(s).format.duration);if(!Number.isFinite(n)||n<=0||n>30)throw Error();resolve(n);}catch{reject(Error('جمله برای لب‌خوانی باید کوتاه‌تر از ۳۰ ثانیه باشد.'));}}));}

export class NeuralLipSync{
 constructor({root,privateDir,python,changed=()=>{},budgetChanged=()=>{},space=process.env.ARYANA_LIPSYNC_SPACE,revision=process.env.ARYANA_LIPSYNC_REVISION,runner,durationProbe=audioDuration}={}){
  Object.assign(this,{root,privateDir,python,changed,space,revision,durationProbe});this.script=join(root,'tools/lipsync-client.py');this.reference=join(root,'public/assets/idle.mp4');
  this.configured=Boolean(/^afgtakrun\/aryana-live-lipsync$/.test(space||'')&&revision&&python&&existsSync(python)&&existsSync(this.script)&&(process.env.ARYANA_LIPSYNC_TOKEN||process.env.ARYANA_STATE_TOKEN));
  this.referenceHash=existsSync(this.reference)?hash(readFileSync(this.reference)):'';this.budget=new LipSyncBudget({limit:6,changed:budgetChanged});
  this.pending=[];this.active=null;this.child=null;this.generation=0;this.ready=false;this.lastLatency=null;this.lastError='';this.runner=runner||this.runChild.bind(this);
 }
 status(){return {configured:this.configured,ready:this.ready,mode:'neural_per_reply',streaming:false,pending:this.pending.length+(this.active?1:0),activeKind:this.active?.kind||null,lastLatencySeconds:this.lastLatency,lastError:this.lastError,budget:this.budget.snapshot()};}
 restoreBudget(data){this.budget.restore(data);}
 cancel(){this.generation++;for(const job of this.pending.splice(0))job.reject(Error('لب‌خوانی لغو شد.'));const child=this.child;if(child?.pid){try{process.kill(-child.pid,'SIGTERM');}catch{}const timer=setTimeout(()=>{if(child.exitCode===null&&!child.signalCode){try{process.kill(-child.pid,'SIGKILL');}catch{}}},2500);timer.unref();}this.changed();}
 cancelTopics(){
  for(const job of this.pending.filter(job=>job.kind==='topic'))job.reject(Error('گفتگوی موضوعی برای پاسخ به کامنت کنار رفت.'));
  this.pending=this.pending.filter(job=>job.kind!=='topic');
  if(this.active?.kind==='topic'){this.active.cancelled=true;const child=this.child;if(child?.pid){try{process.kill(-child.pid,'SIGTERM');}catch{}const timer=setTimeout(()=>{if(child.exitCode===null&&!child.signalCode){try{process.kill(-child.pid,'SIGKILL');}catch{}}},2500);timer.unref();}}
  this.changed();
 }
 runChild(input){return new Promise((resolve,reject)=>{
  const child=spawn(this.python,[this.script],{detached:process.platform!=='win32',stdio:['pipe','pipe','ignore'],env:{...process.env}});this.child=child;let output='';
  const timer=setTimeout(()=>{try{process.kill(-child.pid,'SIGTERM');}catch{}reject(Error('مهلت آماده‌سازی حرکت لب تمام شد.'));},input.action==='prepare'?300000:240000);
  child.stdout.on('data',chunk=>{output+=chunk.toString();if(output.length>100000)output=output.slice(-100000);});child.stdin.on('error',()=>{});
  child.once('error',()=>{clearTimeout(timer);if(this.child===child)this.child=null;reject(Error('محیط موتور لب‌خوانی اجرا نشد.'));});
  child.once('exit',code=>{clearTimeout(timer);if(this.child===child)this.child=null;try{const line=output.split('\n').filter(x=>x.startsWith('ARYANA_LIPSYNC_RESULT ')).at(-1);const data=JSON.parse(line.slice(22));if(code!==0||!data.ok)throw Error();resolve(data);}catch{reject(Error('سرویس لب‌خوانی پاسخ معتبر نداد؛ اتصال یا اعتبار Hugging Face بررسی شود.'));}});
  child.stdin.end(JSON.stringify({...input,space:this.space,reference_sha256:this.referenceHash}));
 });}
 submit(audioPath,{kind='manual',priority=50}={}){
  if(!this.configured)return Promise.reject(Error('سرویس لب‌خوانی جمله‌های تازه تنظیم نشده است.'));
  if(this.pending.length>=2){const lowest=this.pending.reduce((a,b)=>(a.priority||0)<=(b.priority||0)?a:b);if((lowest.priority||0)>=priority)return Promise.reject(Error('صف لب‌خوانی پر است؛ پاسخ‌های قبلی در حال آماده‌شدن‌اند.'));this.pending.splice(this.pending.indexOf(lowest),1);lowest.reject(Error('پاسخ مهم‌تر جایگزین این درخواست شد.'));}
  return new Promise((resolve,reject)=>{this.pending.push({action:'render',audioPath,kind,priority,resolve,reject,generation:this.generation,at:Date.now()});this.pending.sort((a,b)=>(b.priority||0)-(a.priority||0));this.changed();void this.pump();});
 }
 prepare(){
  if(this.pending.length>=2)return Promise.reject(Error('صف آماده‌سازی پر است.'));
  if(!this.configured)return Promise.reject(Error('سرویس لب‌خوانی تنظیم نشده است.'));
  return new Promise((resolve,reject)=>{this.pending.push({action:'prepare',kind:'prepare',priority:200,resolve,reject,generation:this.generation,at:Date.now()});this.changed();void this.pump();});
 }
 async pump(){
  if(this.active)return;
  while(this.pending.length){const job=this.pending.shift();if(job.cancelled||job.generation!==this.generation){job.reject(Error('لب‌خوانی لغو شد.'));continue;}
   if(Date.now()-job.at>60000){job.reject(Error('پاسخ قدیمی از صف لب‌خوانی حذف شد.'));continue;}
   this.active=job;this.changed();let ticket,partial;
   try{
    const duration=job.action==='render'?await this.durationProbe(job.audioPath):0;
    if(job.cancelled||job.generation!==this.generation)throw Error('لب‌خوانی لغو شد.');
    const identity=job.action==='render'?createHash('sha256').update('musetalk-mouth-v1').update(this.revision).update(this.referenceHash).update(readFileSync(job.audioPath)).digest('hex'):null;
    const directory=join(this.privateDir,'video');mkdirSync(directory,{recursive:true,mode:0o700});
    const target=identity?join(directory,identity+'.mp4'):null,manifest=identity?join(directory,identity+'.json'):null;
    if(target){try{const saved=JSON.parse(readFileSync(manifest,'utf8'));if(saved.audioHash===hash(readFileSync(job.audioPath))&&saved.videoHash===hash(readFileSync(target))){job.resolve('/video/'+identity+'.mp4');this.ready=true;continue;}}catch{}}
    const reserve=(180+120*Math.ceil(duration/6))/600;ticket=this.budget.reserve(reserve);
    partial=target?target+'.'+randomUUID()+'.partial.mp4':null;const started=Date.now();job.startedAt=started;
    const result=await this.runner({action:job.action,audio:job.audioPath,output:partial,offset_seconds:(Date.now()/1000)%60});
    if(job.cancelled||job.generation!==this.generation)throw Error('لب‌خوانی لغو شد.');
    this.budget.settle(ticket,(Date.now()-started)/1000/600);ticket=null;this.ready=true;this.lastError='';this.lastLatency=(Date.now()-started)/1000;
    if(job.action==='prepare'){job.resolve(result);continue;}
    if(!existsSync(partial)||Math.abs(result.video_seconds-duration)>.3||result.reference_sha256!==this.referenceHash||!result.has_audio)throw Error('ویدیو با صدا و چهرهٔ همین پاسخ مطابقت ندارد.');
    renameSync(partial,target);writeFileSync(manifest,JSON.stringify({audioHash:hash(readFileSync(job.audioPath)),videoHash:hash(readFileSync(target)),duration:result.video_seconds,model:this.revision}),{mode:0o600});
    job.resolve('/video/'+identity+'.mp4');
   }catch(error){if(job.cancelled&&ticket){this.budget.settle(ticket,((Date.now()-(job.startedAt||Date.now()))/1000+180)/600);ticket=null;}if(!job.cancelled){this.ready=false;this.lastError=error.message;}job.reject(error);}
   finally{if(partial)rmSync(partial,{force:true});this.active=null;this.changed();}
  }
 }
}
