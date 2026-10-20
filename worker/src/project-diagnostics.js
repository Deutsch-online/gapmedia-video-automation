// Owner-only routing, called after Telegram authentication. No arbitrary code.
export function diagnosticIntent(input) {
  const text=String(input||'').trim();
  if(/^\/(?:diagnose|python|repair)(?:\s|$)/i.test(text)){
    const [command,...args]=text.split(/\s+/);
    if(args.length&&!(command==='/python'&&args.join(' ')==='tests'))return 'help';
    return command==='/repair'?'repair':command==='/python'?'tests':'diagnose';
  }
  if(/(?:خطا|ارور|اجرا|پروژه)/.test(text)&&/(?:رفع کن|برطرف کن|درست کن|اصلاح کن)/.test(text))return 'repair';
  if(/(?:پایتون|python)/i.test(text)&&/(?:تست|آزمون|اجرا)/.test(text))return 'tests';
  if(/(?:چرا|دلیل|علت|بررسی|تحلیل)/.test(text)&&/(?:خطا|ارور|ناموفق|اجرا نشد|ساخته نشد|شکست خورد)/.test(text))return 'diagnose';
  if(/پروژه.*(?:تحلیل کن|بررسی کن)/.test(text))return 'diagnose';
  return null;
}
const repo=env=>`${env.GITHUB_OWNER||'Deutsch-online'}/${env.GITHUB_REPO||'gapmedia-video-automation'}`;

export function formatDiagnostic(report) {
  return [`بررسی اجرا #${report.run_id} — ${report.checked_at}`,
    `علت: ${report.diagnosis.cause}`,`راه‌حل: ${report.diagnosis.remedy}`,
    ...(report.failed_steps.length?[`مرحله: ${report.failed_steps.join('، ')}`]:[]),
    `آزمون پایتون: ${report.python.status==='passed'?'موفق':report.python.status==='failed'?'ناموفق':'اجرا نشده'}`,
    `اقدام: ${report.repair.message}`,
    ...(report.evidence.length?[`شاهد لاگ: ${report.evidence.join('\n')}`]:[]),report.run_url].join('\n');
}

export function validateDiagnostic(raw,repository='Deutsch-online/gapmedia-video-automation') {
  if(!/^\d{1,20}$/.test(String(raw?.run_id||'')))throw new Error('Invalid diagnostic run');
  const text=(v,n=600)=>String(v||'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').slice(0,n);
  if(!['passed','failed','not_run'].includes(raw.python?.status))throw new Error('Invalid test result');
  return {run_id:String(raw.run_id),run_url:`https://github.com/${repository}/actions/runs/${raw.run_id}`,
    checked_at:new Date().toISOString(),diagnosis:{kind:text(raw.diagnosis?.kind,80),cause:text(raw.diagnosis?.cause),remedy:text(raw.diagnosis?.remedy)},
    failed_steps:(Array.isArray(raw.failed_steps)?raw.failed_steps:[]).slice(0,3).map(v=>text(v,160)),
    evidence:(Array.isArray(raw.evidence)?raw.evidence:[]).slice(0,3).map(v=>text(v,300)),
    python:{status:raw.python.status},repair:{message:text(raw.repair?.message)},source:'github-actions-diagnostics'};
}

export async function handleProjectDiagnostics(env,input,writeRequest) {
  const mode=diagnosticIntent(input);
  if(!mode)return null;
  if(mode==='help')return 'فرمان‌های مجاز: /diagnose، /python tests و /repair. اجرای کد یا shell دلخواه از چت فعال نیست.';
  const headers={accept:'application/vnd.github+json','user-agent':'GapMedia-Diagnostics',...(env.GITHUB_TOKEN?{authorization:'Bearer '+env.GITHUB_TOKEN}:{})};
  const endpoint=`https://api.github.com/repos/${repo(env)}/actions/workflows/cinematic-series.yml/runs?branch=main&status=failure&per_page=6`;
  let response=await fetch(endpoint,{headers,signal:AbortSignal.timeout(12000)});
  if(response.status===403&&env.GITHUB_TOKEN)response=await fetch(endpoint,{headers:{accept:headers.accept,'user-agent':headers['user-agent']},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('وضعیت واقعی GitHub خوانده نشد؛ علت حدس زده نشد.');
  const runs=(await response.json()).workflow_runs||[];
  const run=runs.find(r=>['failure','timed_out'].includes(r.conclusion))||runs[0];
  if(!run)return 'اجرایی برای بررسی پیدا نشد.';
  const report=await env.BOT_STATE?.get('project:diagnostic-latest','json');
  if(mode==='diagnose'&&report?.run_id===String(run.id))return formatDiagnostic(report);
  const key=`project:diagnostic-request:${run.id}:${mode}`;
  if(await env.BOT_STATE?.get(key))return 'بررسی این اجرا قبلاً درخواست شده است؛ نتیجهٔ آزمون و علت واقعی پس از پایان به همین چت ارسال می‌شود.';
  await writeRequest('.project-diagnostic-request.json',{id:crypto.randomUUID(),mode,run_id:String(run.id),requested_at:new Date().toISOString()},'telegram: request bounded project diagnostics');
  await env.BOT_STATE?.put(key,'requested',{expirationTtl:600});
  return `بررسی اجرای #${run.id} ثبت شد. لاگ واقعی و آزمون‌های مشخص پایتون در GitHub اجرا و نتیجه همین‌جا ارسال می‌شود.${mode==='repair'?' فقط بازیابی آزمایش‌شده، با حفظ سهمیه و گیت کیفیت مجاز است.':''}\n${run.html_url}`;
}
