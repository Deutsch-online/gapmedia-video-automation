// Real-time, owner-only credit callback handling in the active webhook.
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}

export async function decideSimpleCredit(request, message, plan, now=Date.now()) {
  const word=String(message?.text||'').trim().replace(/ي/g,'ی');
  if(!['تایید','تأیید','رد'].includes(word)||request?.simple_text_approval!==true||request.status!=='pending')return null;
  if(message.chat?.type!=='private'||String(message.chat.id)!==request.chat_id||String(message.from?.id)!==request.chat_id||message.forward_origin)return null;
  if(!(Date.parse(request.expires_at)>now)||!Number.isFinite(Date.parse(request.created_at)))return null;
  if(!Number.isInteger(message.message_id)||!Number.isInteger(request.message_id)||message.message_id<=request.message_id)return null;
  const sent=Number(message.date)*1000;
  if(!Number.isFinite(sent)||sent<Math.floor(Date.parse(request.created_at)/1000)*1000||sent>now+60000)return null;
  if(message.reply_to_message&&message.reply_to_message.message_id!==request.message_id)return null;
  if(!plan)return null;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(plan)));
  if(Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')!==request.plan_sha)return null;
  return {...request,status:word==='رد'?'rejected':'approved',decided_at:new Date(now).toISOString(),decision_method:'telegram-simple-text',decision_message_id:message.message_id};
}

export async function handleSimpleCredit(message,env,telegram,headers) {
  if(!/^(?:تایید|تأیید|رد)$/.test(String(message?.text||'').trim().replace(/ي/g,'ی')))return false;
  const base=`https://api.github.com/repos/${env.GITHUB_OWNER||'Deutsch-online'}/${env.GITHUB_REPO||'gapmedia-video-automation'}/contents/`;
  const read=async path=>{
    const response=await fetch(base+path+'?ref=main',{headers});
    if(!response.ok)throw new Error('Credit record unavailable');
    const file=await response.json();
    const bytes=Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0));
    return {sha:file.sha,value:JSON.parse(new TextDecoder().decode(bytes))};
  };
  const file=await read('.cinematic-credit-request.json'),request=file.value;
  const plan=request.kind==='preview'?(await read('ai-cast/newcomer-preview-plan.json')).value:(await read('.cinematic-series-state.json')).value.pending?.plan;
  const decision=await decideSimpleCredit(request,message,plan);
  if(!decision){await telegram(env,'sendMessage',{chat_id:message.chat.id,text:'درخواست اعتبار فعالی برای این پاسخ پیدا نشد یا قبلاً پاسخ داده شده است. /credit'});return true;}
  const content=btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(decision,null,2)+'\n')));
  const saved=await fetch(base+'.cinematic-credit-request.json',{method:'PUT',headers,body:JSON.stringify({branch:'main',sha:file.sha,content,message:'Telegram owner '+decision.status+' scoped credit request'})});
  // Never retry a conflicting write with a newer SHA: another decision won.
  if(!saved.ok)throw new Error('Credit decision was not saved; retry /credit');
  await telegram(env,'sendMessage',{chat_id:message.chat.id,text:decision.status==='approved'?'✅ تأیید مصرف اعتبار ثبت شد؛ ادامهٔ همین صحنه‌ها در صف اجرا قرار گرفت.':'❌ مصرف اعتبار رد شد.'});
  return true;
}
export async function handleCredit(query, env, telegram, headers) {
  const match = /^cc:([yn]):([a-f0-9]{24})$/.exec(query?.data || '');
  if (!match) return false;
  const owner = env.GITHUB_OWNER || 'Deutsch-online';
  const repo = env.GITHUB_REPO || 'gapmedia-video-automation';
  const base = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/';
  const read = async path => {
    const response = await fetch(base + path + '?ref=main', {headers});
    if (!response.ok) throw new Error('Credit record unavailable');
    const file = await response.json();
    const bytes = Uint8Array.from(atob(file.content.replace(/\s/g,'')), c => c.charCodeAt(0));
    return {sha:file.sha, value:JSON.parse(new TextDecoder().decode(bytes))};
  };
  const invalid = async () => {
    await telegram(env, 'answerCallbackQuery', {callback_query_id:query.id, text:'این درخواست معتبر یا فعال نیست.'});
    return true;
  };
  const file = await read('.cinematic-credit-request.json');
  const request = file.value;
  const chat = query.message?.chat;
  if (request.status !== 'pending' || match[2] !== request.id || chat?.type !== 'private' ||
      String(chat.id) !== request.chat_id || String(query.from?.id) !== request.chat_id ||
      query.message.message_id !== request.message_id ||
      (env.ALLOWED_CHAT_ID && String(chat.id) !== String(env.ALLOWED_CHAT_ID)) ||
      !(Date.parse(request.expires_at) > Date.now())) return invalid();
  const plan = request.kind === 'preview'
    ? (await read('ai-cast/newcomer-preview-plan.json')).value
    : (await read('.cinematic-series-state.json')).value.pending?.plan;
  if (!plan) return invalid();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(plan)));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
  if (hash !== request.plan_sha) return invalid();
  request.status = match[1] === 'y' ? 'approved' : 'rejected';
  request.decided_at = new Date().toISOString();
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(request,null,2)+'\n')));
  const saved = await fetch(base + '.cinematic-credit-request.json', {method:'PUT', headers,
    body:JSON.stringify({branch:'main',sha:file.sha,content:encoded,message:'Telegram owner ' + request.status + ' scoped credit request'})});
  if (!saved.ok) return invalid(); // A raced/repeated decision never overwrites the first one.
  await telegram(env, 'answerCallbackQuery', {callback_query_id:query.id,text:request.status==='approved'?'تأیید ثبت شد.':'مصرف اعتبار رد شد.'}).catch(()=>{});
  await telegram(env, 'editMessageReplyMarkup', {chat_id:chat.id,message_id:request.message_id,reply_markup:{inline_keyboard:[]}}).catch(()=>{});
  await telegram(env, 'sendMessage', {chat_id:chat.id,text:request.status==='approved'
    ? '✅ تأیید ثبت شد؛ ساخت همین نمونه یا قسمت در نوبت اجرا شروع می‌شود.'
    : '❌ رد شد؛ اعتبار مصرف نمی‌شود.'});
  return true;
}
