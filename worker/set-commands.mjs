const token=process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
const commands=[
  {command:'start',description:'شروع گفتگو و راهنما'},
  {command:'help',description:'راهنمای بات'},
  {command:'status',description:'وضعیت ساخت ویدیو'},
  {command:'credit',description:'وضعیت تأیید اعتبار'},
  {command:'episode',description:'درخواست قسمت بعدی'},
  {command:'new',description:'گفتگوی تازه'},
  {command:'commands',description:'همه فرمان‌های شماره‌ای'},
];
const response=await fetch(`https://api.telegram.org/bot${token}/setMyCommands`,{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({commands}),
});
const result=await response.json();
if(!response.ok||!result.ok)throw new Error(`setMyCommands failed: ${response.status}`);
console.log('Telegram command menu updated');
