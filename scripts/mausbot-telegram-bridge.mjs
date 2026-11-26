#!/usr/bin/env node
// Pull only this owner's paired private queue. Never poll Telegram getUpdates.
import {randomBytes} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync,chmodSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
const [mode,urlArg]=process.argv.slice(2);
const root=resolve(process.env.MAUSBOT_BRIDGE_DIR||'.mausbot-telegram');
mkdirSync(root,{recursive:true,mode:0o700});chmodSync(root,0o700);
const file=join(root,'state.json'),cli=process.env.MAUSBOT_CLI||'openmausbot';
const port=process.env.MAUSBOT_PORT||'8799',bot=process.env.MAUSBOT_NAME||'GapMedia';
const save=s=>{writeFileSync(file,JSON.stringify(s,null,2)+'\n',{mode:0o600});chmodSync(file,0o600);};
const load=()=>JSON.parse(readFileSync(file,'utf8'));
function origin(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('Use the exact HTTPS Worker origin');return u.origin;}
async function api(state,path,body){
 const r=await fetch(state.url+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(state.token?{authorization:'Bearer '+state.token}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});
 const data=await r.json();if(!r.ok)throw Error('Gateway '+r.status+': '+String(data.error||'request_failed'));return data;
}
function command(args,timeout=20000){
 const r=spawnSync(cli,[...args,'--port',port,'--json'],{encoding:'utf8',timeout,shell:false});
 let data;try{data=JSON.parse(r.stdout||'');}catch{throw Error('Mausbot command outcome is unknown; do not replay');}
 return {code:r.status,data};
}
function lastText(data){
 const rows=(data.messages||[]).filter(m=>m.role==='bot');
 const text=rows.filter(m=>typeof m.text==='string'&&m.text.trim()).at(-1)?.text||rows.find(m=>m.tool?.ok===false)?.tool?.name||data.error||data.reason||data.job?.reason||'پاسخ قابل‌تأیید ثبت نشد.';
 return String(text).slice(0,3300);
}
async function inspectOnce(state,db){
 if(!state.token)throw Error('Pair this bridge first');
 if(!state.heartbeat||Date.now()-state.heartbeat>5*60000){await api(state,'/mausbot/heartbeat',{engine_status:state.engine_status||'not_tested'});state.heartbeat=Date.now();save(state);}
 const queue=await api(state,'/mausbot/tasks');
 for(const task of queue.tasks||[]){
  if(!/^u\d{16}$/.test(task.id)||typeof task.text!=='string'||task.text.length>6000)continue;
  if(db.prepare('SELECT id FROM tasks WHERE id=?').get(task.id))continue;
  const message=join(root,task.id+'.txt');writeFileSync(message,task.text,{mode:0o600});
  db.prepare('INSERT INTO tasks(id,phase) VALUES (?,?)').run(task.id,'dispatching'); // durable BEFORE submission
  try{
   const {code,data}=command(['send',bot,'--message-file',message,'--task','new','--title','Telegram '+task.id,'--send-id','telegram-'+task.id]);
   if(code!==0||!data.success||typeof data.taskId!=='string')throw Error('No confirmed task receipt');
   db.prepare('UPDATE tasks SET phase=?,task_id=? WHERE id=?').run('submitted',data.taskId,task.id);
  }catch{
   db.prepare('UPDATE tasks SET phase=?,result_status=?,result_text=? WHERE id=?').run('report','uncertain','نتیجهٔ ارسال فرمان به Mausbot نامعلوم است؛ خودکار تکرار نشد. سرویس و رسید آن باید بررسی شوند.',task.id);
  }
 }
 for(const row of db.prepare("SELECT * FROM tasks WHERE phase IN ('submitted','waiting_input')").all()){
  try{
   const {code,data}=command(['wait',bot,'--task',row.task_id,'--timeout','1s','--on-input','exit','--on-timeout','leave'],10000);
   if(code===7){db.prepare('UPDATE tasks SET phase=?,result_status=?,result_text=? WHERE id=?').run('report','uncertain','محادثهٔ قبلی در این اجرای Mausbot پیدا نشد؛ فرمان خودکار دوباره اجرا نشد.',row.id);continue;}
   let status=data.job?.state||data.state||data.status;
   if(status==='needsInput')status='needs_input';
   if(!['completed','failed','needs_input'].includes(status))continue;
   if(status==='needs_input'&&row.last_status==='needs_input')continue;
   const text=lastText(data);
   if(/sign.in.*expired|sign in again|access token.*refresh/i.test(text)){state.engine_status='auth_required';state.heartbeat=0;save(state);}
   else if(status==='completed'){state.engine_status='ready';save(state);}
   db.prepare('UPDATE tasks SET phase=?,result_status=?,result_text=? WHERE id=?').run('report',status,text,row.id);
  }catch{} // a failed read never resubmits the task
 }
 for(const row of db.prepare("SELECT * FROM tasks WHERE phase='report'").all()){
  db.prepare('UPDATE tasks SET phase=? WHERE id=?').run('reporting',row.id); // unknown upload is not replayed
  try{
   const result=await api(state,'/mausbot/result',{id:row.id,status:row.result_status,text:row.result_text});
   if(!result.ok||!result.message_id)throw Error('Missing Telegram receipt');
   db.prepare('UPDATE tasks SET phase=?,last_status=? WHERE id=?').run(row.result_status==='needs_input'?'waiting_input':'reported',row.result_status,row.id);
   console.log(JSON.stringify({id:row.id,status:row.result_status,telegram_receipt:result.message_id}));
  }catch{console.error('Result delivery needs reconciliation for '+row.id+'; no automatic replay.');}
 }
}
try{
 if(mode==='init'){
  if(existsSync(file))throw Error('Existing pairing state retained; use another dedicated directory for a new pairing');
  const state={url:origin(urlArg),code:randomBytes(32).toString('hex'),engine_status:'not_tested'};
  let health;try{health=await api(state,'/mausbot/health');}catch{throw Error('Deploy the updated Worker before pairing; bridge health could not be verified');}
  if(!health.bridge||!health.queue_available)throw Error('Worker bridge or private queue is not ready');
  save(state);
  console.log('Send this once to your existing private Telegram bot, then run pair:\n/mausbot_pair '+state.code);
 }else if(mode==='pair'){
  const state=load();if(state.token)throw Error('Already paired');
  const result=await api(state,'/mausbot/pair',{code:state.code});state.token=result.token;state.expires=result.expires;delete state.code;save(state);console.log('Paired. The token is stored locally and is not printed.');
 }else if(mode==='once'||mode==='listen'){
  // Filesystem-exclusive lock: an existing lock is never silently stolen after a crash.
  const lock=join(root,'listener.lock');const fd=openSync(lock,'wx',0o600);writeFileSync(fd,String(process.pid));
  const db=new DatabaseSync(join(root,'tasks.sqlite'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,phase TEXT NOT NULL,task_id TEXT,result_status TEXT,result_text TEXT,last_status TEXT)');
  db.prepare("UPDATE tasks SET phase='report',result_status='uncertain',result_text=? WHERE phase='dispatching'").run('ارسال قبلی پیش از ثبت رسید قطع شده است؛ فرمان خودکار تکرار نشد و نیاز به بررسی رسید دارد.');
  let stopped=false;process.on('SIGINT',()=>{stopped=true;});process.on('SIGTERM',()=>{stopped=true;});
  try{do{try{await inspectOnce(load(),db);}catch(e){console.error(String(e.message).replace(/Bearer [a-f0-9]+/g,'[redacted]'));if(mode==='once')throw e;}if(mode==='listen'&&!stopped)await new Promise(r=>setTimeout(r,15000));}while(mode==='listen'&&!stopped);}
  finally{db.close();closeSync(fd);unlinkSync(lock);}
 }else throw Error('Usage: node scripts/mausbot-telegram-bridge.mjs init HTTPS_WORKER_ORIGIN | pair | once | listen');
}catch(e){console.error(String(e.message));process.exitCode=1;}
