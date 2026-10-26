import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {normalWord,parseTeacherCommand} from './teacher-profile.mjs';
export function teacherIntent(value){
 let text=normalWord(value).replace(/^\//,'').replace(/@takrun_bot\b/i,'').trim();let delay=0;
 const scheduled=text.match(/^بعد از ([0-9۰-۹]+) (دقیقه|ثانیه) (.+)$/);if(scheduled){const n=Number(scheduled[1].replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)));delay=n*(scheduled[2]==='دقیقه'?60000:1000);text=scheduled[3];if(!Number.isFinite(delay)||delay>86400000||delay<1000)return {kind:'unknown'};}
 if(/^(start|help|راهنما|سلام)$/.test(text))return {kind:'help'};
 if(/^(status|وضعیت|گزارش|چه خبر|بررسی وضعیت)$/.test(text))return {kind:'status'};
 if(/^(jobs|صف|کارها|فرمان های من|فرمان‌های من)$/.test(text))return {kind:'jobs'};
 if(/^(diagnose|بررسی خطا|خطا را بررسی کن|چرا خطا داد|مشکل صدا|بررسی پروژه)$/.test(text))return {kind:'diagnose'};
 if(/^(lesson|درس این جلسه|جلسه|برنامه درس|درس نوبت|درس بعدی)$/.test(text))return {kind:'lesson'};
 if(/^(توضیح سوال|تشریح سوال|این سوال را توضیح بده)$/.test(text))return {kind:'explain'};
 const aliases={'pause':'pause','next':'next','previous':'previous','repeat':'repeat','reveal':'reveal','شروع درس':'start','شروع سوال':'start','توقف':'pause','توقف درس':'pause','سوال بعدی':'next','بعدی':'next','سوال قبلی':'previous','قبلی':'previous','تکرار سوال':'repeat','پاسخ را نشان بده':'reveal','جواب را نشان بده':'reveal','تکرار جلسه':'repeat-session','جلسه بعدی':'next-lesson','درس بعدی را شروع کن':'next-lesson','ریفریش':'refresh-screen'};
 if(aliases[text])return {kind:'action',action:aliases[text],delay};
 const parsed=parseTeacherCommand(text);if(parsed.kind==='text-correction')return {kind:'correction',word:parsed.word,spoken:parsed.spoken,delay};
 return {kind:'unknown'};
}
export class TelegramTeacher{
 constructor({token=process.env.TAKRUN_BOT_TOKEN,owner=process.env.TAKRUN_OWNER_ID,origin=process.env.PUBLIC_URL,saved={},persist=async()=>{},execute,fetcher=fetch,now=()=>Date.now()}={}){Object.assign(this,{token,owner:String(owner||''),origin,persist,execute,fetcher,now,jobs:(saved.jobs||[]).slice(-50).map(j=>j.status==='accepting'?{...j,status:'queued'}:j.status==='running'?{...j,status:'failed',error:'سرور هنگام اجرا متوقف شد؛ پیش از تکرار، وضعیت درس را بررسی کنید.',notified:false}:j),lastUpdate:saved.lastUpdate||0,state:token&&owner?'checking':'not_configured',running:false});this.secret=token?createHmac('sha256',token).update('fahrfit-takrun-webhook-v1').digest('hex'):'';}
 export(){return {jobs:this.jobs,lastUpdate:this.lastUpdate};}
 status(){return {state:this.state,lastError:this.lastError||null,expectedBot:'takrun_bot',jobs:this.jobs.map(({id,status,action,error,due})=>({id,status,action,error,due})),requiresSecret:'TAKRUN_BOT_TOKEN'};}
 authorized(header){const a=Buffer.from(header||''),b=Buffer.from(this.secret);return b.length>0&&a.length===b.length&&timingSafeEqual(a,b);}
 async api(method,payload={}){const r=await this.fetcher('https://api.telegram.org/bot'+this.token+'/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('ارتباط تلگرام ناموفق بود.');const d=await r.json();if(!d.ok)throw Error('تلگرام درخواست را نپذیرفت.');return d.result;}
 async start(){if(this.starting||this.state==='ready'||this.state==='not_configured')return;this.starting=true;try{const me=await this.api('getMe');if(me.username?.toLowerCase()!=='takrun_bot'){this.state='wrong_bot';return;}const hook=await this.api('getWebhookInfo');const url=this.origin+'/telegram/takrun';if(hook.url&&hook.url!==url){this.state='external_webhook';return;}await this.api('setWebhook',{url,secret_token:this.secret,allowed_updates:['message'],max_connections:1,drop_pending_updates:false});await this.api('setMyCommands',{commands:[{command:'status',description:'وضعیت درس و صدا'},{command:'lesson',description:'درس این جلسه'},{command:'jobs',description:'صف فرمان‌ها'},{command:'diagnose',description:'بررسی خطا'},{command:'pause',description:'توقف درس'},{command:'next',description:'سوال بعدی'}]});this.state='ready';this.timer=setInterval(()=>{void this.drain();},1000);this.timer.unref();}catch{this.state='connection_error';this.reconnectAt=this.now()+60000;}finally{this.starting=false;}}
 async receive(update){const task=(this.receiving||Promise.resolve()).then(()=>this.receiveOne(update));this.receiving=task.catch(()=>{});return task;}
 async receiveOne(update){
 const message=update.message;if(!this.token||!this.owner||!message||message.chat?.type!=='private'||String(message.chat.id)!==this.owner||String(message.from?.id)!==this.owner)return;
 if(!Number.isSafeInteger(update.update_id)||update.update_id<=this.lastUpdate)return;
 const intent=teacherIntent(String(message.text||'').slice(0,600)),previousUpdate=this.lastUpdate;this.lastUpdate=update.update_id;
 if(intent.kind==='unknown'){try{await this.persist(this.export());}catch(e){this.lastUpdate=previousUpdate;throw e;}await this.api('sendMessage',{chat_id:this.owner,text:'این دستور روشن نیست. بنویسید: وضعیت، بررسی خطا، درس این جلسه، شروع درس، توقف، سوال بعدی، تکرار سوال یا «یک را یِک تلفظ کن». برای زمان‌بندی: بعد از 5 دقیقه سوال بعدی.'});return;}
 const job={id:randomUUID().slice(0,8),status:'accepting',intent,action:intent.action||intent.kind,due:this.now()+(intent.delay||0),at:this.now()};this.jobs.push(job);while(this.jobs.length>50){const old=this.jobs.findIndex(j=>['done','failed'].includes(j.status));if(old<0){this.jobs.pop();throw Error('صف فرمان‌ها پر است.');}this.jobs.splice(old,1);}try{await this.persist(this.export());job.status='queued';}catch(e){this.jobs=this.jobs.filter(j=>j.id!==job.id);this.lastUpdate=previousUpdate;throw e;}
 try{await this.api('sendMessage',{chat_id:this.owner,text:'فرمان '+job.id+' ثبت شد؛ نتیجه پس از اجرا ارسال می‌شود.'});}catch{}void this.drain();
 }
 async drain(){
  let job,started=false;
  if(this.running||this.state!=='ready'||this.now()<(this.retryAt||0))return;this.running=true;
  try{
   job=this.jobs.find(j=>['done','failed'].includes(j.status)&&!j.notified);
   if(!job){job=this.jobs.find(j=>j.status==='queued'&&j.due<=this.now());if(!job)return;job.status='running';await this.persist(this.export());started=true;try{job.result=String(await this.execute(job.intent)).slice(0,3500);job.status='done';}catch(e){job.error=String(e.message||'اجرای فرمان ناموفق بود.').slice(0,240);job.status='failed';}job.notified=false;await this.persist(this.export());}
   await this.persist(this.export());await this.api('sendMessage',{chat_id:this.owner,text:(job.status==='done'?'انجام شد · ':'ناموفق · ')+job.id+'\n'+(job.result||job.error)});job.notified=true;await this.persist(this.export());this.lastError=null;
  }catch{if(job?.status==='running'&&!started)job.status='queued';this.retryAt=this.now()+15000;this.lastError='ذخیره یا ارسال نتیجه ناموفق بود؛ دوباره تلاش می‌شود.';}
  finally{this.running=false;}
 }

 close(){clearInterval(this.timer);}
}
