import {readFileSync} from 'node:fs';
import {telegramConfig} from '../lib/telegram.mjs';
import {save, api} from '../lib/cinematic-credit.mjs';
import {parseCreditText, decideCreditText} from '../lib/credit-text.mjs';
const read = path => {try {return JSON.parse(readFileSync(path,'utf8'));} catch {return null;}};
const command = read('.video-request.json');
if (!parseCreditText(command)) {
  // Never pass malformed credit commands to an unrelated render path.
  if (/\bcc-/i.test(String(command?.payload || ''))) {console.log('ACTION=none'); process.exit(0);}
  process.exit(3);
}
const tg = telegramConfig(process.env);
const current = read('.cinematic-credit-request.json');
const plan = current?.kind === 'preview' ? read('ai-cast/newcomer-preview-plan.json') : read('.cinematic-series-state.json')?.pending?.plan;
const decision = decideCreditText(current, command, plan, tg.reviewChatId);
console.log('ACTION=none');
if (!decision) {
  await api(tg.token,'sendMessage',{chat_id:tg.reviewChatId,text:'این کد مصرف اعتبار معتبر یا فعال نیست؛ فقط از آخرین درخواست استفاده کنید.'});
  process.exit(0);
}
save(decision);
await api(tg.token,'sendMessage',{chat_id:tg.reviewChatId,text:decision.status === 'approved'
  ? '✅ تصمیم مصرف اعتبار ثبت شد: تأیید. ساخت همین نمونه در صف اجرا قرار می‌گیرد.'
  : '❌ تصمیم مصرف اعتبار ثبت شد: رد. برای این درخواست اعتبار مصرف نمی‌شود.'}).catch(()=>{});
if (decision.status === 'approved') {
  console.log('CREDIT_APPROVED=true');
  console.log('CREDIT_WORKFLOW=' + (decision.kind === 'preview' ? 'newcomer-preview.yml' : 'cinematic-series.yml'));
}
