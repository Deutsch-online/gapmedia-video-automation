import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const ROOT='https://afghanfollowers-telegram.afghan-video-bot.workers.dev';
const REPO='Deutsch-online/gapmedia-video-automation';
const STATE='.cache/social-watchdog.json';
const signature=token=>createHash('sha256').update('gapmedia-monitor-v1:'+token).digest('hex');

export async function checkMonitor({token,githubToken,fetchImpl=fetch,now=Date.now()}={}) {
  const problems=[];
  let health=null;
  try{
    const response=await fetchImpl(ROOT+'/health',{signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('health HTTP '+response.status);
    const value=await response.json();
    if(!value.worker||!value.telegramTokenValid||!value.webhookConfigured)problems.push('سلامت Worker یا اتصال webhook تأیید نشد؛ تنظیمات Worker و webhook بررسی شود.');
    const monitor=await fetchImpl(ROOT+'/monitor-health',{signal:AbortSignal.timeout(15000)});
    if(!monitor.ok)throw new Error('monitor HTTP '+monitor.status);
    health=await monitor.json();
    if(token&&(!health.last_attempt||!health.next_due||Date.parse(health.next_due)<=now||Date.parse(health.requested_at||'')>Date.parse(health.last_attempt||'1970-01-01'))){
      const sync=await fetchImpl(ROOT+'/internal/social-run',{method:'POST',headers:{'X-Project-Authorization':signature(token)},signal:AbortSignal.timeout(150000)});
      if(sync.ok)health=await sync.json();
      else problems.push('نوبت پایش پاسخ '+sync.status+' داد؛ /monitor و سهمیه/دسترسی سرویس بررسی شود.');
    }
    const starting=health.status==='running'&&now-Date.parse(health.last_attempt)<5*60000;
    if(!starting&&(!health.last_completed||now-Date.parse(health.last_completed)>3*3600000))problems.push('پایش در سه ساعت گذشته کامل نشده؛ Cron، KV و خطای آخر Worker بررسی شود.');
    if(health.status==='failed')problems.push('پایش با خطا تمام شده؛ دادهٔ قبلی حفظ شده و تلاش بعد با فاصلهٔ بیشتر انجام می‌شود.');
    if(health.notification_status==='unknown_or_failed')problems.push('ارسال آخرین گزارش پایش به تلگرام تأیید نشد؛ دسترسی بات و خطای Telegram بررسی شود.');
  }catch{problems.push('دسترسی به Worker/پایش برقرار نشد؛ اتصال شبکه، انتشار Cloudflare و webhook بررسی شود.');}
  if(githubToken){
    try{
      const headers={authorization:'Bearer '+githubToken,accept:'application/vnd.github+json','user-agent':'GapMedia-Social-Watchdog'};
      const response=await fetchImpl('https://api.github.com/repos/'+REPO+'/actions/workflows/cinematic-series.yml/runs?branch=main&per_page=1',{headers,signal:AbortSignal.timeout(15000)});
      if(response.ok){
        const run=(await response.json()).workflow_runs?.[0];
        if(run?.status==='completed'&&['failure','timed_out','cancelled'].includes(run.conclusion)){
          const jobs=await fetchImpl('https://api.github.com/repos/'+REPO+'/actions/runs/'+run.id+'/jobs?per_page=20',{headers,signal:AbortSignal.timeout(15000)});
          const failed=jobs.ok?(await jobs.json()).jobs?.flatMap(job=>(job.steps||[]).filter(step=>step.conclusion==='failure').map(step=>step.name)).slice(0,3):[];
          problems.push('آخرین اجرای تولید '+run.conclusion+' است'+(failed?.length?'؛ مرحله: '+failed.join('، '):'')+'. بدون تغییر گیت‌های کیفیت و اعتبار، علت در لاگ بررسی شود.\n'+run.html_url);
        }
      }else problems.push('خواندن وضعیت تولید از GitHub پاسخ '+response.status+' داد؛ دسترسی Actions: read بررسی شود.');
    }catch{problems.push('وضعیت آخرین تولید از GitHub خوانده نشد؛ دسترسی شبکه یا API بررسی شود.');}
  }
  return {checked_at:new Date(now).toISOString(),health,problems};
}

async function main() {
  const token=process.env.TELEGRAM_BOT_TOKEN;
  let result=await checkMonitor({token,githubToken:process.env.GITHUB_TOKEN});
  if(process.env.GITHUB_EVENT_NAME==='push'&&!result.health){
    for(let retry=0;retry<2&&!result.health;retry++){await delay(30000);result=await checkMonitor({token,githubToken:process.env.GITHUB_TOKEN});}
  }
  console.log(JSON.stringify({checked_at:result.checked_at,monitor_status:result.health?.status||'unreachable',problems:result.problems.length}));
  let previous={};
  try{previous=JSON.parse(readFileSync(STATE,'utf8'));}catch{}
  if(result.problems.length&&token){
    const fingerprint=createHash('sha256').update(result.problems.join('\n')).digest('hex');
    if(previous.fingerprint!==fingerprint||Date.now()-Date.parse(previous.notified_at||'')>6*3600000){
      let owner;
      try{const saved=JSON.parse(readFileSync('.telegram-bot-chat.json','utf8'));if(saved.type==='private')owner=saved.id;}catch{}
      if(owner){
        // Mark intent first. Unknown delivery is not automatically repeated.
        previous={fingerprint,notified_at:new Date().toISOString(),delivery:'attempted'};
        mkdirSync('.cache',{recursive:true});writeFileSync(STATE,JSON.stringify(previous));
        const send=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:owner,text:('هشدار پایش و بهبود پروژه\n'+result.problems.join('\n\n')).slice(0,3800),disable_web_page_preview:true}),signal:AbortSignal.timeout(15000)});
        if(!send.ok)throw new Error('Telegram watchdog notification failed: '+send.status);
      }
    }
  }
  if(!result.problems.length){mkdirSync('.cache',{recursive:true});writeFileSync(STATE,JSON.stringify({healthy_at:result.checked_at}));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Social watchdog could not complete; inspect this workflow run.');process.exitCode=1;});
