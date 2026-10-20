const token=process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
const commands=[
  {command:'start',description:'شروع گفتگو و راهنما'},
  {command:'help',description:'راهنمای بات'},
  {command:'chat',description:'گفت‌وگوی آزاد و پرسش و پاسخ'},
  {command:'status',description:'وضعیت ساخت ویدیو'},
  {command:'credit',description:'وضعیت تأیید اعتبار'},
  {command:'episode',description:'درخواست قسمت بعدی'},
  {command:'files',description:'فهرست فایل‌های GitHub'},
  {command:'read',description:'خواندن فایل از GitHub'},
  {command:'find',description:'یافتن فایل در مخزن'},
  {command:'search',description:'جست‌وجوی وب'},
  {command:'runs',description:'آخرین اجراهای GitHub'},
  {command:'jobs',description:'جزئیات یک اجرا در GitHub'},
  {command:'edit',description:'ویرایش فایل متنی در GitHub'},
  {command:'new',description:'گفتگوی تازه'},
  {command:'commands',description:'همه فرمان‌های شماره‌ای'},
];
const response=await fetch(`https://api.telegram.org/bot${token}/setMyCommands`,{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({commands}),
});
const result=await response.json();
if(!response.ok||!result.ok)throw new Error(`setMyCommands failed: ${response.status}`);
console.log('Telegram command menu updated');

const nameResponse=await fetch(`https://api.telegram.org/bot${token}/setMyName`,{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'ویدیو آلمانی'}),
});
const nameResult=await nameResponse.json();
if(!nameResponse.ok||!nameResult.ok)throw new Error(`setMyName failed: ${nameResponse.status}`);
console.log('Telegram display name updated');
