import assert from 'node:assert/strict';
import worker,{webhookSecret} from './src/index.js';
import {seriesRequest,validateDraft} from './src/series-assistant.js';

assert.equal(seriesRequest('پرامیت ویدیوی بعدی را بفرست').kind,'prompt');
assert.equal(seriesRequest('قسمت ۷',{kind:'prompt',episode:7}).episode,7);
assert.equal(seriesRequest('چطور سناریو بنویسم؟'),null);
assert.equal(seriesRequest('پرومپت چیست؟'),null);

const memory = new Map([['bot-chat-recorded:7','1']]);
const BOT_STATE = {
  get:async(key,type)=>type==='json'?JSON.parse(memory.get(key)||'null'):memory.get(key)||null,
  put:async(key,value)=>memory.set(key,value),
  delete:async key=>memory.delete(key),
};
const plan = {
  episode:7,duration_seconds:60,title_de:'Der falsche Korb',title_fa:'سبد اشتباه',
  summary_fa:'مارتا در فروشگاه سبدها را اشتباه می‌گیرد و اشتباهش را با احترام حل می‌کند.',
  scenes:Array.from({length:12},(_,i)=>({speaker:i%2?'lukas':'marta',de:`Das ist mein Korb Nummer ${i+1}.`,fa:`این سبد شماره ${i+1} است.`,visual_fa:`صحنهٔ ${i+1} با سبد واقعی فروشگاه.`,prompt_en:`Shot ${i+1}: Marta holds the basket; only the current speaker moves their lips.`})),
};
const state={next_episode:7,pending:null,history:[{episode:6,title_de:'Im Supermarkt',summary:'Marta buys oat milk.',scenes:[{speaker:'marta',de:'Diese Milch, bitte.',fa:'این شیر لطفاً.',scene:'Marta holds a milk carton.'}]}]};
const config={target_seconds:60,schedule_mode:'gpu-availability',content_direction:{genre:'everyday-comic'}};
const shortPlan={...plan,episode:9,duration_seconds:45,scenes:plan.scenes.slice(0,9)};
assert.equal(validateDraft(shortPlan,9).scenes.length,9);
assert.throws(()=>validateDraft({...shortPlan,duration_seconds:60},9));
assert.throws(()=>validateDraft({...shortPlan,scenes:plan.scenes},9));
const calls=[];
const savedFetch=globalThis.fetch;
let failState=false;
globalThis.fetch=async(url,init={})=>{
  calls.push({url:String(url),init});
  if(String(url).includes('api.github.com/')){
    if(failState)return new Response('unavailable',{status:503});
    const value=String(url).includes('.cinematic-series-state.json')?state:config;
    return Response.json({encoding:'base64',content:btoa(unescape(encodeURIComponent(JSON.stringify(value))))});
  }
  if(String(url)==='https://mcp.exa.ai/mcp'){
    const request=JSON.parse(init.body);
    if(request.method==='tools/list')return Response.json({jsonrpc:'2.0',id:1,result:{tools:[{name:'web_fetch_exa',annotations:{readOnlyHint:true}}]}});
    return Response.json({jsonrpc:'2.0',id:1,result:{content:[{type:'text',text:'URL: https://www.goethe.de/de/spr/ueb/lua.html\nOfficial Goethe source: Learn practical everyday German through shopping and daily activities, living in Germany, going to the doctor, and taking the train. Use these everyday situations for original short German-learning dialogue.'}]}});
  }
  return Response.json({ok:true,result:{message_id:123}});
};
let drafts=0;
const env={BOT_STATE,ALLOWED_CHAT_ID:'7',TELEGRAM_BOT_TOKEN:'test',GITHUB_TOKEN:'test',AI:{run:async()=>{
  drafts++;
  return {response:JSON.stringify(plan)};
}}};
const signature=await webhookSecret('test');
const send=async text=>worker.fetch(new Request('https://worker.test/',{method:'POST',headers:{'X-Telegram-Bot-Api-Secret-Token':signature},body:JSON.stringify({message:{chat:{id:7,type:'private'},text}})}),env);
const messages=()=>calls.filter(call=>call.url.endsWith('/sendMessage')).map(call=>JSON.parse(call.init.body).text);

await send('محتوا ویدیو ساخت که در نوبت منتظر است را بفرست');
assert.match(messages().at(-1),/قسمت بعدی در برنامه: 7/);
assert.match(messages().at(-1),/هنوز سناریوی تولید/);
await send('پرامیت ویدیوی بعدی را بفرست');
assert.equal(drafts,1,'an absent next-episode script can be drafted without video generation');
assert.ok(messages().some(text=>text.includes('Shot 12:')),'long prompt is sent through the final scene, not truncated');
await send('قسمت ۷');
await send('بفرست سناریو را');
assert.equal(drafts,1,'follow-up reuses the same draft instead of inventing a new story');
assert.ok(messages().some(text=>text.includes('55–60 ثانیه')),'last timed scene is delivered');
assert.ok(messages().some(text=>text.includes('سبد شماره 12')),'scenario includes the last German/Persian dialogue');
assert.equal(JSON.parse(memory.get('series-conversation:7')).episode,7);
assert.ok(calls.filter(call=>call.url.includes('api.github.com/')).every(call=>!call.init.method || call.init.method==='GET'),'scenario inspection never writes a build request');
await send('/scenario 6');
assert.match(messages().at(-1),/Diese Milch/,'existing delivered script comes from the repository');
assert.equal(drafts,1);
failState=true;
await send('/queue');
assert.match(messages().at(-1),/503/,'unavailable live data is an error, not a claim that no queued video exists');
globalThis.fetch=savedFetch;
console.log('live queue, Persian follow-up context, sourced draft and complete scenario delivery hold');
