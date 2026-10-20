import {readFileSync} from 'node:fs';
import {telegramConfig,verifyDelivery} from '../lib/telegram.mjs';
import {requestCredit} from '../lib/cinematic-credit.mjs';
const tg=telegramConfig(process.env);
const check=await verifyDelivery({token:tg.token,chatId:tg.reviewChatId,requirePrivate:true});
if (!check.ok || check.chat?.type !== 'private' || String(check.chat.id)!==String(tg.reviewChatId)) throw new Error('Private owner chat verification required');
const state=JSON.parse(readFileSync('.cinematic-series-state.json','utf8'));
const pending=state.pending;
if(!pending?.credit_approval_required||!pending.plan||!Number.isInteger(pending.credit_from_scene))throw new Error('No scoped unfinished episode needing credit');
const current=JSON.parse(readFileSync('.cinematic-credit-request.json','utf8'));
if(['approved','running','sending'].includes(current.status))throw new Error('Existing credit decision must be reconciled first');
// Do not send a one-word prompt until the live webhook supports it.
let ready=false;
for(let i=0;i<16;i++){
  try{const r=await fetch('https://afghanfollowers-telegram.afghan-video-bot.workers.dev/health',{signal:AbortSignal.timeout(10000)});ready=(await r.json()).simple_credit_approval===true;}catch{}
  if(ready)break;
  await new Promise(resolve=>setTimeout(resolve,10000));
}
if(!ready)throw new Error('Live webhook does not yet support simple credit replies; no prompt sent');
process.env.CREDIT_REPLACE_PENDING='true';
const result=await requestCredit(tg,{kind:'episode',plan:pending.plan,credit_from_scene:pending.credit_from_scene,simple_text_approval:true});
console.log('TEXT_CREDIT_PROMPT_MESSAGE_ID='+result.message_id);
