import assert from 'node:assert/strict';
import worker,{videoAction,webhookSecret} from './src/index.js';

for (const question of ['آیا این ابزار به مهاجران کمک می‌کند؟','برنامه هفته من چیست؟','چگونه تحقیق کنم؟','آیا ساخت درس آلمانی زمان می‌برد؟']) {
  assert.equal(videoAction(question),null,`question must stay chat: ${question}`);
}
assert.equal(videoAction('/episode').action,'series-episode');
assert.equal(videoAction('/chat').action,'chat-help');
assert.equal(videoAction('چرا ویدیو ساخته نشد؟').action,'status');

const saved=globalThis.fetch;
const calls=[];
const kv=new Map();
const BOT_STATE={
  get:async (key,format)=>format==='json'?JSON.parse(kv.get(key)||'null'):kv.get(key)||null,
  put:async(key,value)=>{kv.set(key,value);},
  delete:async(key)=>{kv.delete(key);},
};
const state={next_episode:6,pending:{status:'waiting-for-quota'}};
const credit={status:'pending',episode:9002,chat_id:'7',expires_at:'2099-01-01T00:00:00Z'};
const encoded=x=>btoa(unescape(encodeURIComponent(JSON.stringify(x))));
globalThis.fetch=async (url,init={})=>{
  calls.push({url:String(url),init});
  if(String(url).includes('api.github.com/')){
    if(init.method==='PUT')return Response.json({content:{sha:'new'}},{status:201});
    const value=String(url).includes('.cinematic-credit-request.json')?credit:state;
    return Response.json({encoding:'base64',content:encoded(value),sha:'old'});
  }
  return Response.json({ok:true,result:{message_id:1}});
};
const env={ALLOWED_CHAT_ID:'7',TELEGRAM_BOT_TOKEN:'test',GITHUB_TOKEN:'test',BOT_STATE,AI:{run:async(_model,input)=>({response:input.messages.at(-1).content.includes('ممنون')?'خواهش می‌کنم':'پاسخ کوتاه'})}};
const signature=await webhookSecret('test');
const send=async text=>worker.fetch(new Request('https://worker.test/',{method:'POST',headers:{'X-Telegram-Bot-Api-Secret-Token':signature},body:JSON.stringify({message:{chat:{id:7,type:'private'},text}})}),env);
assert.equal((await worker.fetch(new Request('https://worker.test/',{method:'POST',body:'{}'}),env)).status,401,'unsigned requests cannot impersonate owner chat');
await send('آیا ابزار یادگیری آلمانی کمک می‌کند؟');
assert.equal(calls.filter(c=>c.url.includes('.video-request.json')&&c.init.method==='PUT').length,0,'question must not request a build');
assert.ok(kv.has('chat:7'),'conversation history should use configured BOT_STATE');
await send('ممنون');
assert.equal(JSON.parse(kv.get('chat:7')).length,4,'the next answer retains prior turns');
await send('/status');
assert.ok(calls.some(c=>c.url.includes('/sendMessage')&&String(c.init.body).includes('قسمت بعدی: 6')),'status reports real repository state');
await send('/new');
assert.equal(kv.has('chat:7'),false,'new clears the chat');
// Credit replies take priority over a draft's pending text prompt.
kv.set('pending:7',JSON.stringify({action:'content-search-live'}));
const code='cc-'+'a'.repeat(32);
await send('تایید '+code);
const creditPush=calls.filter(c=>c.url.includes('.video-request.json')&&c.init.method==='PUT').at(-1);
assert.ok(creditPush,'credit command is forwarded');
const pushed=JSON.parse(decodeURIComponent(escape(atob(JSON.parse(creditPush.init.body).content))));
assert.equal(pushed.action,'approved-feature');
assert.equal(pushed.payload,'تایید '+code);
kv.delete('pending:7');
await send('/episode');
assert.ok(calls.some(c=>c.url.includes('.cinematic-series-request.json')&&c.init.method==='PUT'),'episode requests the dedicated quota-gated workflow');
globalThis.fetch=saved;
console.log('chat, memory, status and episode routing hold');
