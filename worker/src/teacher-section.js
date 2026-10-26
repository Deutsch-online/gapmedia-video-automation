const TEACHER_ORIGIN='https://afgtakrun-fahrfit-driving-live.hf.space';
const keyboard={keyboard:[[{text:'📚 درس و تلفظ'},{text:'🎬 ویدیو'}]],resize_keyboard:true,is_persistent:true};
async function signature(token,prefix){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(prefix+token));return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');}
export const teacherBridgeSecret=token=>signature(token,'fahrfit-social-bridge-v1:');
export const teacherResultSecret=token=>signature(token,'fahrfit-social-result-v1:');
export async function handleTeacherSection({env,chatId,input,update,telegram,fetcher=fetch}){
 const text=input.trim(),key='bot-section:'+chatId;
 const menu=async body=>telegram(env,'sendMessage',{chat_id:chatId,text:body,reply_markup:keyboard});
 if(/^(\/sections|بخش‌ها|بخش ها)$/.test(text)){await menu('بخش مورد نظر را انتخاب کنید: درس و تلفظ، یا ویدیو.');return true;}
 if(/^(🎬 ویدیو|\/video|بخش ویدیو)$/.test(text)){await env.BOT_STATE?.put(key,'video');await menu('بخش ویدیو فعال شد. دستور ساخت، وضعیت یا بررسی ویدیو را بفرستید.');return true;}
 const entry=/^(📚 درس و تلفظ|\/teacher|\/start teacher|دستیار درس|بخش درس)$/.test(text);
 if(entry){if(!env.BOT_STATE)throw Error('ذخیرهٔ بخش درس آماده نیست.');await env.BOT_STATE.put(key,'teacher');await menu('📚 دستیار درس و تلفظ\nوضعیت · درس این جلسه · بررسی خطا · شروع درس · توقف · سوال بعدی · تکرار سوال · جلسه بعدی\nبرای اصلاح: یک را یِک تلفظ کن\nبرای زمان‌بندی: بعد از 5 دقیقه سوال بعدی\nبازگشت به ویدیو: دکمهٔ ویدیو یا /video');return true;}
 const explicit=text.match(/^\/teacher\s+(.+)$/s),section=await env.BOT_STATE?.get(key);
 if(!explicit&&section!=='teacher')return false;
 // Existing explicit video/social/credit commands keep their own handlers.
 if(!explicit&&/^\/(?!status\b|lesson\b|jobs\b|diagnose\b|pause\b|next\b|previous\b|repeat\b|reveal\b)[a-z_]+/i.test(text))return false;
 const message=update.message;
 if(message?.chat?.type!=='private'||String(message.from?.id)!==String(chatId))return true;
 try{
  const response=await fetcher(TEACHER_ORIGIN+'/internal/social-teacher',{method:'POST',headers:{'content-type':'application/json','X-Teacher-Authorization':await teacherBridgeSecret(env.TELEGRAM_BOT_TOKEN)},body:JSON.stringify({...update,message:{...message,text:explicit?explicit[1]:text}}),signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('bridge_unavailable');
 }catch{await menu('دستیار درس فعلاً در دسترس نیست؛ فرمان در صف تأیید نشد. کمی بعد دوباره امتحان کنید. بخش ویدیو جداگانه فعال است.');}
 return true;
}
