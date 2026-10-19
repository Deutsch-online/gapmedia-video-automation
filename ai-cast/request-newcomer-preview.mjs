import {readFileSync} from 'node:fs';
import {telegramConfig, verifyDelivery} from '../lib/telegram.mjs';
import {requestCredit} from '../lib/cinematic-credit.mjs';
const tg = telegramConfig(process.env);
const verified = await verifyDelivery({token:tg.token,chatId:tg.reviewChatId,requirePrivate:true});
if (!verified.ok) throw new Error('Private chat verification failed');
const plan = JSON.parse(readFileSync('ai-cast/newcomer-preview-plan.json','utf8'));
const receipt = await requestCredit(tg,{kind:'preview',plan,credit_from_scene:0});
console.log(JSON.stringify(receipt));
