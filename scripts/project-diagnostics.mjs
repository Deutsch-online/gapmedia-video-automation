import {formatDiagnostic,validateDiagnostic} from '../worker/src/project-diagnostics.js';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const REPO='Deutsch-online/gapmedia-video-automation';
const ROOT='https://afghanfollowers-telegram.afghan-video-bot.workers.dev';

export function redact(text,env=process.env) {
  let value=String(text||'');
  for(const [key,secret] of Object.entries(env))if(/TOKEN|SECRET|API_KEY/.test(key)&&secret?.length>=6)value=value.split(secret).join('[REDACTED]');
  return value.replace(/\b(?:gh[pousr]_|github_pat_|sk-)[A-Za-z0-9_\-]{12,}/g,'[REDACTED]')
    .replace(/\b\d{6,}:[A-Za-z0-9_-]{20,}/g,'[REDACTED]')
    .replace(/(?:Bearer\s+|(?:token|secret|api[_-]?key|password)\s*[=:]\s*)[^\s,;]+/gi,'[REDACTED]')
    .replace(/https?:\/\/[^\s]+/g,'[URL]');
}
export function diagnoseLog(log) {
  // Prefer the terminal narration failure over earlier recovered provider errors.
  if(/German narration does not fit scene|Narration timing:/i.test(log))return {kind:'narration_timing',cause:'گفتار یک یا چند صحنه در زمان مجاز جا نشده است؛ این خطا مربوط به سهمیهٔ GPU نیست.',remedy:'پیش از GPU صدای همهٔ صحنه‌ها اندازه‌گیری می‌شود؛ حداکثر دو اصلاح با مدل رایگان، ترجمهٔ هماهنگ و آزمون مجدد صدا مجاز است. اگر اصلاح شکست بخورد گزارش می‌شود؛ صدا بریده یا زمان ویدیو تغییر نمی‌کند.',transient:false,recoverable:true};
  if(/429|rate.limit.exceeded|requests per minute/i.test(log))return {kind:'rate_limit',cause:'سرویس درخواست را به‌دلیل محدودیت نرخ رد کرده است؛ این خطا به‌تنهایی نشانهٔ مشکل GPU نیست.',remedy:'زمان Retry-After رعایت و درخواست آزمایشی اضافه حذف شود؛ جایگزین پولی اجرا نشود.',transient:true};
  if(/ZeroGPU.*quota|quota.*exhaust|GPU quota/i.test(log))return {kind:'gpu_quota',cause:'سهمیهٔ GPU برای ادامه کافی نبوده است.',remedy:'خروجی‌های آماده حفظ و تا موعد سهمیه صبر شود؛ اعتبار بدون تأیید مصرف نشود.',transient:false};
  if(/ModuleNotFoundError|ImportError/i.test(log))return {kind:'dependency',cause:'ماژول یا وابستگی پایتون بارگذاری نشده است.',remedy:'نسخه و نصب وابستگی در workflow بررسی شود؛ نصب دلخواه از متن لاگ انجام نمی‌شود.',transient:false};
  if(/ValueError|AssertionError|quality|lip.sync/i.test(log))return {kind:'validation',cause:'ساختار طرح، داده یا یکی از کنترل‌های کیفیت رد شده است.',remedy:'شاهد دقیق لاگ و آزمون ناموفق بررسی شود؛ گیت کیفیت غیرفعال نشود.',transient:false};
  if(/HTTPError HTTP 50[234]|timed out|TimeoutError|ConnectionError/i.test(log))return {kind:'temporary_provider',cause:'خطای موقت شبکه یا سرویس در لاگ ثبت شده است.',remedy:'فقط با بودجهٔ مجاز همان نوبت، اجرای تازه امتحان شود.',transient:true};
  return {kind:'unknown',cause:'از شواهد موجود علت قطعی تشخیص داده نشد.',remedy:'شاهد لاگ و نتیجهٔ آزمون برای بررسی کد ارائه می‌شود؛ اصلاح حدسی اجرا نمی‌شود.',transient:false};
}
export function evidenceLines(log) {
  return redact(log).split('\n').filter(line=>!/^\s*(?:env:|[A-Z_]+:)/.test(line)&&/(?:Story provider failed|RuntimeError:|ValueError:|ModuleNotFoundError:|AssertionError:|Error:|Exception:)/i.test(line)).slice(-3).map(line=>line.slice(-300));
}
export function failedStepLog(log,steps) {
  const windows=(steps||[]).filter(s=>s.conclusion==='failure').map(s=>[Date.parse(s.started_at),Date.parse(s.completed_at)]).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b));
  if(!windows.length)return String(log).slice(-8000);
  return String(log).split('\n').filter(line=>{
    const stamp=line.match(/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z)/)?.[1];
    const time=Date.parse(stamp||'');
    return Number.isFinite(time)&&windows.some(([a,b])=>time>=a&&time<=b+1000);
  }).join('\n');
}
export async function readJobLog(jobId,fetchImpl=fetch) {
  if(!/^\d+$/.test(String(jobId)))throw new Error('Invalid job ID');
  const response=await fetchImpl(`https://api.github.com/repos/${REPO}/actions/jobs/${jobId}/logs`,{
    headers:{authorization:'Bearer '+process.env.GH_TOKEN,accept:'application/vnd.github+json','user-agent':'GapMedia-Project-Diagnostics'},
    signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('Job logs HTTP '+response.status);
  const text=await response.text();
  if(text.length>3000000)throw new Error('Job log exceeds diagnostic size bound');
  return text;
}
export function pythonChecks(run=spawnSync) {
  const env={PATH:process.env.PATH,PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'};
  const checks=[['-m','py_compile','ai-cast/cinematic-series.py','ai-cast/cinematic_budget.py','ai-cast/cinematic_speech.py'],
    ['-m','unittest','discover','-s','tests','-p','test_cinematic_series.py'],
    ['-m','unittest','discover','-s','tests','-p','test_cinematic_budget.py']];
  const results=checks.map(args=>{const result=run('python',args,{env,encoding:'utf8',timeout:120000,maxBuffer:1000000});return {passed:result.status===0,evidence:redact(result.stderr||result.error?.message||'').slice(-1200)};});
  return {status:results.every(r=>r.passed)?'passed':'failed',failures:results.filter(r=>!r.passed).map(r=>r.evidence)};
}
async function api(path,init={}) {
  const response=await fetch(`https://api.github.com/repos/${REPO}/${path}`,{...init,headers:{authorization:'Bearer '+process.env.GH_TOKEN,accept:'application/vnd.github+json','user-agent':'GapMedia-Project-Diagnostics',...(init.headers||{})},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('GitHub diagnostics API '+response.status);
  return response.status===204?null:response.json();
}
async function main() {
  let request={mode:'diagnose',run_id:process.env.DIAGNOSTIC_RUN_ID};
  if(process.env.GITHUB_EVENT_NAME==='push'){
    request=JSON.parse(readFileSync('.project-diagnostic-request.json','utf8'));
    if(!['diagnose','tests','repair'].includes(request.mode)||Date.now()-Date.parse(request.requested_at)>3600000||!Number.isFinite(Date.parse(request.requested_at)))throw new Error('Invalid diagnostic request');
  }
  const runs=(await api('actions/workflows/cinematic-series.yml/runs?branch=main&per_page=20')).workflow_runs||[];
  let selected;
  if(request.run_id){
    if(!/^\d{1,20}$/.test(String(request.run_id)))throw new Error('Invalid production run ID');
    selected=await api('actions/runs/'+request.run_id);
    const workflow=await api('actions/workflows/cinematic-series.yml');
    if(selected.workflow_id!==workflow.id||selected.head_branch!=='main')throw new Error('Run is not a main production run');
  }else{
    selected=(await api('actions/workflows/cinematic-series.yml/runs?branch=main&status=failure&per_page=1')).workflow_runs?.[0]||runs[0];
  }
  if(!selected)throw new Error('No matching production run');
  const jobs=(await api(`actions/runs/${selected.id}/jobs?per_page=30`)).jobs||[];
  const failed=jobs.filter(j=>['failure','timed_out'].includes(j.conclusion));
  let log='';
  for(const job of failed.slice(0,2)){
    try{
      // Fixed numeric job IDs from GitHub, never command text from Telegram.
      const text=await readJobLog(job.id);
      const narrowed=failedStepLog(text,job.steps);
      console.log(JSON.stringify({job_id:job.id,log_bytes:text.length,failed_step_bytes:narrowed.length}));
      log+='\n'+redact(narrowed).slice(-80000);
    }catch(error){console.log(JSON.stringify({job_id:job.id,log_status:'unavailable',reason:redact(error.message).slice(0,180)}));}
  }
  const diagnosis=diagnoseLog(log),python=pythonChecks();
  if(!log.trim()&&failed.length)diagnosis.cause='لاگ مرحلهٔ ناموفق دریافت یا استخراج نشد؛ علت اجرا قابل تأیید نیست. دسترسی Actions logs بررسی شود.';
  let repair={message:'لاگ و آزمون بررسی شد؛ کد یا گیت کیفیت خودکار تغییر نکرد.'};
  if(request.mode==='repair'&&(diagnosis.transient||diagnosis.recoverable)&&python.status==='passed'&&selected.id===runs[0]?.id&&['failure','timed_out'].includes(selected.conclusion)){
    const gate=spawnSync('python',['ai-cast/cinematic-series.py','gate','--force'],{encoding:'utf8',timeout:15000,env:{PATH:process.env.PATH,PYTHONIOENCODING:'utf-8'}});
    let allowed=false;try{allowed=gate.status===0&&JSON.parse(gate.stdout).go===true;}catch{}
    if(allowed){await api('actions/workflows/cinematic-series.yml/dispatches',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ref:'main',inputs:{force:true}})});repair.message='اجرای تازه با بازیابی آزمایش‌شده درخواست شد؛ موفقیت آن هنوز تأیید نشده و گیت سهمیه و اعتبار برقرار است.';}
    else repair.message='تکرار مجاز نبود: سقف تلاش، قفل ارسال یا زمان سهمیه مانع است. محدودیت دور زده نشد.';
  }
  let providerAttempts=[];
  try{
    const auth=createHash('sha256').update('gapmedia-monitor-v1:'+process.env.TELEGRAM_BOT_TOKEN).digest('hex');
    const response=await fetch(ROOT+'/internal/provider-report',{headers:{'X-Project-Authorization':auth},signal:AbortSignal.timeout(10000)});
    const providers=response.ok?await response.json():null;
    if(providers?.run_id===String(selected.id)&&providers.status==='exhausted'){
      providerAttempts=(providers.attempts||[]).map(a=>({...a,reason:redact(a.reason).slice(0,200)}));
      diagnosis.cause='همهٔ گزینه‌های رایگانِ مجاز این مرحله بررسی شدند و هیچ طرحی کنترل کیفیت را پاس نکرد. دلیل هر گزینه در فهرست آمده است.';
    }
  }catch{}
  const report={run_id:String(selected.id),failed_steps:failed.flatMap(j=>(j.steps||[]).filter(s=>s.conclusion==='failure').map(s=>s.name)).slice(0,3),diagnosis,provider_attempts:providerAttempts,python:{status:python.status},repair,evidence:[...evidenceLines(log),...python.failures].slice(0,3)};
  const signature=createHash('sha256').update('gapmedia-monitor-v1:'+process.env.TELEGRAM_BOT_TOKEN).digest('hex');
  // A newly deployed Worker may still be building; retry the report endpoint
  // only, never replay Python repairs or production dispatch here.
  let result;
  for(let attempt=0;attempt<12;attempt++){
  result=await fetch(ROOT+'/internal/diagnostic-result',{method:'POST',headers:{'content-type':'application/json','X-Project-Authorization':signature},body:JSON.stringify(report),signal:AbortSignal.timeout(20000)});
  if(result.ok)break;
  if(![404,503].includes(result.status)||attempt===11)break;
  await new Promise(resolve=>setTimeout(resolve,15000));
  }
  let delivery='worker';
  if(!result?.ok&&result?.status===404){
    // A confirmed missing route made no delivery. Independently notify only
    // the recorded private owner, without waiting for a Cloudflare build.
    const owner=JSON.parse(readFileSync('.telegram-bot-chat.json','utf8'));
    if(owner.type!=='private'||!owner.id)throw new Error('No verified private diagnostic recipient');
    const response=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/sendMessage',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({chat_id:owner.id,text:formatDiagnostic(validateDiagnostic(report))+'\nانتشار Worker هنوز آماده نیست؛ این گزارش مستقل از GitHub فرستاده شد.',disable_web_page_preview:true}),signal:AbortSignal.timeout(20000)});
    if(!response.ok||(await response.json()).ok!==true)throw new Error('Independent diagnostic delivery not confirmed');
    delivery='telegram-direct';
  }else if(!result?.ok)throw new Error('Private diagnostic delivery failed '+result?.status);
  console.log(JSON.stringify({run_id:report.run_id,kind:diagnosis.kind,python:python.status,delivered:true,delivery}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(redact(error.message));process.exitCode=1;});
