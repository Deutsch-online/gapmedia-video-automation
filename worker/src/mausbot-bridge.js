// One existing Telegram webhook; private KV queue; no bot token leaves Worker.
const SESSION_TTL=30*86400, TASK_TTL=7*86400;
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store'}});
const taskKey=(owner,id)=>`mausbot:task:${owner}:${id}`;

export async function mausbotCommand({env,owner,message,updateId,now=Date.now()}) {
 const text=String(message?.text||'').trim();
 if(!/^\/(?:agent(?:_status|_disconnect)?|mausbot_pair)(?:\s|$)/i.test(text))return null;
 if(message.chat?.type!=='private'||String(message.chat.id)!==String(owner)||String(message.from?.id)!==String(owner))return {text:null};
 if(message.forward_origin||message.forward_date)return {text:'دستور را خودتان به‌صورت پیام تازه بفرستید؛ پیام فورواردشده اجرا نمی‌شود.'};
 if(!env.BOT_STATE)return {text:'حافظهٔ صف در دسترس نیست؛ دستوری برای اجرا ثبت نشد.'};
 const kv=env.BOT_STATE;
 const pair=text.match(/^\/mausbot_pair\s+([a-f0-9]{64})$/i);
 if(pair){
  await kv.put(`mausbot:pair:${await hash(pair[1].toLowerCase())}`,JSON.stringify({owner:String(owner),expires:now+10*60000}),{expirationTtl:600});
  return {text:'درخواست جفت‌سازی برای ده دقیقه ثبت شد؛ اتصال هنوز باید از محیط Mausbot تکمیل شود.'};
 }
 if(/^\/mausbot_pair\b/i.test(text))return {text:'کد جفت‌سازی را از ابزار رابط Mausbot بگیرید؛ توکن تلگرام یا کلید API را در چت نفرستید.'};
 if(/^\/agent_disconnect$/i.test(text)){
  await kv.delete(`mausbot:active:${owner}`);
  return {text:'دسترسی رابط Mausbot لغو شد. وظیفه‌ای که قبلاً اجرا شده با این دستور برگردانده نمی‌شود.'};
 }
 const savedSession=await kv.get(`mausbot:active:${owner}`,'json');
 const session=savedSession?.expires>now?savedSession:null;
 if(/^\/agent_status$/i.test(text)){
  if(!session)return {text:'Mausbot به این چت جفت نشده است.'};
  const live=now-Number(session.seen_at||0)<6*60000;
  return {text:`رابط Mausbot: ${live?'در دسترس':'آفلاین یا بدون گزارش تازه'}؛ آخرین وضعیت موتور: ${session.engine_status||'آزموده نشده'}. دریافت دستور به معنی پایان اجرای آن نیست.`};
 }
 const instruction=text.replace(/^\/agent\s*/i,'').trim();
 if(!instruction)return {text:'فرمان را این‌طور بفرستید: /agent وضعیت تولید ویدیو را بررسی و خطا را رفع کن'};
 if(instruction.length>6000)return {text:'فرمان طولانی است؛ حداکثر ۶۰۰۰ نویسه بفرستید.'};
 if(!session)return {text:'ابتدا رابط Mausbot را جفت کنید؛ این فرمان اجرا یا در صف ثبت نشد.'};
 const id=Number.isSafeInteger(updateId)&&updateId>=0?`u${String(updateId).padStart(16,'0')}`:null;
 if(!id)return {text:'شناسهٔ معتبر پیام دریافت نشد؛ فرمان اجرا نشد.'};
 const key=taskKey(owner,id);
 if(await kv.get(key)||await kv.get(`mausbot:receipt:${owner}:${id}`))return {text:null};
 await kv.put(key,JSON.stringify({id,owner:String(owner),session_digest:session.digest,text:instruction,status:'queued',created_at:now}),{expirationTtl:TASK_TTL});
 return {text:`فرمان ${id} در صف Mausbot ثبت شد؛ پایان اجرا جداگانه گزارش می‌شود.${session.engine_status==='auth_required'?' ورود موتور Codex باید تجدید شود.':''}`};
}

export async function mausbotRoute(request,env,send,now=Date.now()) {
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/mausbot/'))return null;
 if(path==='/mausbot/health'&&request.method==='GET')return json({bridge:true,version:1,queue_available:Boolean(env.BOT_STATE)});
 if(!env.BOT_STATE)return json({error:'queue_unavailable'},503);
 const kv=env.BOT_STATE;
 if(Number(request.headers.get('content-length')||0)>12000)return json({error:'too_large'},413);
 let body={};
 if(request.method==='POST'){
  const raw=await request.text();
  if(raw.length>12000)return json({error:'too_large'},413);
  try{body=JSON.parse(raw);}catch{return json({error:'invalid_json'},400);}
 }
 if(path==='/mausbot/pair'&&request.method==='POST'){
  if(!/^[a-f0-9]{64}$/.test(body.code||''))return json({error:'invalid_pairing_code'},400);
  const key=`mausbot:pair:${await hash(body.code)}`;
  const pair=await kv.get(key,'json');
  if(!pair||pair.expires<=now)return json({error:'pairing_not_authorized_or_expired'},403);
  const token=random(),digest=await hash(token);
  const session={owner:pair.owner,digest,expires:now+SESSION_TTL*1000,seen_at:now,engine_status:'not_tested'};
  await kv.put(`mausbot:session:${digest}`,JSON.stringify(session),{expirationTtl:SESSION_TTL});
  await kv.put(`mausbot:active:${pair.owner}`,JSON.stringify(session),{expirationTtl:SESSION_TTL});
  await kv.delete(key);
  return json({token,expires:session.expires});
 }
 const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 if(!token)return json({error:'unauthorized'},401);
 const digest=await hash(token),session=await kv.get(`mausbot:session:${digest}`,'json');
 const active=session&&await kv.get(`mausbot:active:${session.owner}`,'json');
 if(!session||session.expires<=now||active?.digest!==digest)return json({error:'session_expired_or_revoked'},403);
 if(path==='/mausbot/heartbeat'&&request.method==='POST'){
  const engine_status=['not_tested','ready','auth_required','failed'].includes(body.engine_status)?body.engine_status:'not_tested';
  await kv.put(`mausbot:active:${session.owner}`,JSON.stringify({...active,seen_at:now,engine_status}),{expirationTtl:Math.max(60,Math.ceil((session.expires-now)/1000))});
  return json({ok:true});
 }
 if(path==='/mausbot/tasks'&&request.method==='GET'){
  const tasks=[];let cursor;
  do {
   const listing=await kv.list({prefix:`mausbot:task:${session.owner}:`,limit:100,...(cursor?{cursor}:{})});
   for(const item of listing.keys){
    const task=await kv.get(item.name,'json');
    if(task?.status==='queued'&&task.session_digest===digest&&now-task.created_at<TASK_TTL*1000)tasks.push({id:task.id,text:task.text,created_at:task.created_at});
    if(tasks.length===4)break;
   }
   cursor=listing.list_complete?null:listing.cursor;
  } while(cursor&&tasks.length<4);
  return json({tasks});
 }
 if(path==='/mausbot/result'&&request.method==='POST'){
  if(!/^u\d{16}$/.test(body.id||'')||!['completed','failed','needs_input','uncertain'].includes(body.status)||typeof body.text!=='string'||body.text.length>3400)return json({error:'invalid_result'},400);
  const receipt=await kv.get(`mausbot:receipt:${session.owner}:${body.id}`,'json');
  if(receipt)return json({ok:true,message_id:receipt.message_id});
  const key=taskKey(session.owner,body.id),task=await kv.get(key,'json');
  if(!task)return json({error:'unknown_task'},404);
  if(task.session_digest!==digest)return json({error:'task_belongs_to_previous_pairing'},409);
  if(task.status==='waiting_input'&&body.status==='needs_input')return json({ok:true,message_id:task.message_id});
  if(task.status==='reporting')return json({error:'delivery_needs_reconciliation'},409);
  await kv.put(key,JSON.stringify({...task,status:'reporting',result_status:body.status}),{expirationTtl:TASK_TTL});
  try{
   const result=await send(session.owner,`Mausbot · ${body.id} · ${body.status}\n${body.text}`);
   if(!result?.ok||!result.result?.message_id)throw Error('missing_receipt');
   if(body.status==='needs_input')await kv.put(key,JSON.stringify({...task,status:'waiting_input',message_id:result.result.message_id}),{expirationTtl:TASK_TTL});
   else {
    await kv.put(`mausbot:receipt:${session.owner}:${body.id}`,JSON.stringify({message_id:result.result.message_id,status:body.status}),{expirationTtl:TASK_TTL});
    await kv.delete(key);
   }
   return json({ok:true,message_id:result.result.message_id});
  }catch{return json({error:'delivery_outcome_uncertain_do_not_replay'},503);}
 }
 return json({error:'not_found'},404);
}
