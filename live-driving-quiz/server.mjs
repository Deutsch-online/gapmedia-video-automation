import http from 'node:http';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {WebSocketServer} from 'ws';
import {TikTokLiveConnection,ControlEvent,WebcastEvent,SignConfig} from 'tiktok-live-connector';
import {HttpProxyAgent,HttpsProxyAgent} from 'hpagent';
import {Quiz,LETTERS} from './quiz.mjs';
import {hostingConfig} from './hosting.mjs';

// The dependency otherwise discovers SIGN_API_KEY from the environment.
// This application deliberately permits anonymous/free signing only.
SignConfig.apiKey=undefined;
SignConfig.basePath='https://api.eulerstream.com';
SignConfig.cachedInstance=undefined;

const root=fileURLToPath(new URL('.',import.meta.url));
const hosting=hostingConfig();
const {token,port,base}=hosting;
const settingsFile=join(root,'settings.json');
const defaults={username:'easydeutsches',gifts:{...Object.fromEntries(LETTERS.map((k,i)=>[k,{id:String(101+i),name:`هدیهٔ تمرینی ${k}`,coins:null,verified:false}])),ALL:{id:null,name:'هدیهٔ هر سه گزینه',coins:null,verified:false}}};
let settings=existsSync(settingsFile)?{...defaults,...JSON.parse(readFileSync(settingsFile,'utf8'))}:defaults;
settings.gifts={...defaults.gifts,...settings.gifts};
const quiz=new Quiz(JSON.parse(readFileSync(join(root,'data/questions.json'),'utf8')));
let mode='demo',autoplay=false,advanceAt=null,connection=null,connecting=false;
let live={status:'disconnected',message:'حالت آزمایشی؛ هیچ گیفت واقعی دریافت نمی‌شود.',catalog:[]};
let recent=[],lastReject=null;
function catalogFrom(raw) {
  const candidates=[raw,raw?.gifts,raw?.data?.gifts,raw?.giftList,raw?.data?.giftList,raw?.data];
  const list=candidates.find(Array.isArray)||[];
  return [...new Map(list.slice(0,10000).map(g=>({id:String(g.id??g.giftId??''),name:String(g.name??g.describe??'').slice(0,80),coins:Number(g.diamondCount??g.diamond_count)})).filter(g=>/^\d+$/.test(g.id)&&g.name&&Number.isFinite(g.coins)&&g.coins>0).map(g=>[g.id,g])).values()];
}
function ready() {
  const selected=LETTERS.map(k=>settings.gifts[k]);
  return live.status==='connected' && new Set(selected.map(g=>g?.id)).size===3 && selected.every(g=>g?.verified && (live.catalog.some(c=>c.id===g.id)||(g.source==='owner-manual'&&g.bound_username===settings.username)));
}
function publicState() {
  return {...quiz.snapshot(),mode,autoplay,username:settings.username,gifts:settings.gifts,liveReady:ready(),
    connection:{status:live.status,message:live.message,giftCount:live.catalog.length},recent:recent.slice(-4).reverse(),lastReject};
}
const wss=new WebSocketServer({noServer:true});
function broadcast() {const data=JSON.stringify(publicState());for(const ws of wss.clients)if(ws.readyState===1){if(ws.bufferedAmount>1000000)ws.terminate();else ws.send(data);}}
function save() {writeFileSync(settingsFile,JSON.stringify(settings,null,2)+'\n',{mode:0o600});}
function changeMode(next){if(mode!==next){quiz.pause();quiz.leaderboard.clear();quiz.answers.clear();quiz.lastAnswer=null;recent=[];}mode=next;}
function safeError(error) {
  if(/offline/i.test(error?.name||''))return 'حساب اکنون لایو ندارد.';
  if(/Room ID/.test(error?.message||''))return 'شناسهٔ لایو دریافت نشد؛ حساب ممکن است آفلاین یا دسترسی محدود باشد.';
  if(/rate|sign|premium/i.test(error?.name||''))return 'محدودیت سرویس واسط؛ هیچ سرویس پولی فعال نشد.';
  return 'اتصال ناموفق بود؛ وضعیت لایو، شبکه یا سرویس واسط را بررسی کنید.';
}
async function disconnect() {
  const old=connection;connection=null;connecting=false;
  autoplay=false;quiz.pause();live={status:'disconnected',message:'اتصال قطع است؛ دریافت پاسخ غیرفعال است.',catalog:[]};broadcast();
  if(old)await Promise.race([old.disconnect().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,1500))]);
}
async function connect(username,startOnConnect=false) {
  if(connecting||connection)throw Error('ابتدا اتصال قبلی را قطع کنید.');
  if(!/^@?[A-Za-z0-9_.]{1,30}$/.test(username))throw Error('نام کاربری معتبر نیست.');
  settings.username=username.replace(/^@/,'');save();connecting=true;autoplay=false;quiz.pause();
  live={status:'connecting',message:'در حال اتصال ناشناس به لایو…',catalog:[]};broadcast();
  const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
  const agent=proxy?{http:new HttpProxyAgent({proxy}),https:new HttpsProxyAgent({proxy})}:null;
  const client=new TikTokLiveConnection(settings.username,{authenticateWs:false,processInitialData:false,enableExtendedGiftInfo:false,
    webClientOptions:{timeout:{request:10000},retry:{limit:0},...(agent?{agent}:{})},wsClientOptions:{handshakeTimeout:10000,...(agent?{agent:agent.https}:{})}});
  connection=client;
  client.on(ControlEvent.ERROR,()=>{});
  client.on(ControlEvent.DISCONNECTED,()=>{if(connection===client){connection=null;connecting=false;autoplay=false;quiz.pause();live={status:'disconnected',message:'اتصال لایو قطع شد؛ سؤال متوقف شد.',catalog:[]};broadcast();}});
  client.on(WebcastEvent.STREAM_END,()=>{if(connection===client)void disconnect();});
  client.on(WebcastEvent.GIFT,data=>{
    if(connection!==client)return;
    const details=data.giftDetails||data.gift||data.extendedGiftInfo||{};
    const id=String(data.giftId??details.id??'');const name=String(details.giftName||details.name||data.giftName||'').slice(0,80);
    const cost=Number(details.diamondCount??details.diamond_count??data.diamondCount);
    if(/^\d+$/.test(id)&&name){
      const gift={id,name,coins:Number.isFinite(cost)&&cost>0?cost:null,source:'live-event'};
      const i=live.catalog.findIndex(g=>g.id===id);if(i<0&&live.catalog.length<1000)live.catalog.push(gift);else if(i>=0)live.catalog[i]=gift;
      for(const k of [...LETTERS,'ALL'])if(settings.gifts[k].id===id)settings.gifts[k]={...gift,verified:true};
    }
    if(mode!=='live'||!ready()||connection!==client)return;
    const result=quiz.gift(data,Object.fromEntries(Object.entries(settings.gifts).filter(([,g])=>g.verified)));
    if(result.accepted) {recent.push({...quiz.lastAnswer,at:Date.now()});recent=recent.slice(-12);lastReject=null;}
    else if(!['unmapped_gift','streak_not_finished','duplicate_event','already_selected'].includes(result.reason))lastReject=result.reason;
    broadcast();
  });
  let timeout;
  try {
    await Promise.race([client.connect(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Connect timeout')),45000);})]);
    if(connection!==client)throw Error('Connection changed');
    const catalog=catalogFrom(client.availableGifts);
    live={status:'connected',message:'متصل؛ هدایا از رویدادهای همین لایو شناخته می‌شوند. می‌توانید نام و شناسهٔ هدایا را هم دستی ثبت کنید.',catalog};
    for(const k of [...LETTERS,'ALL']){
      const current=catalog.find(g=>g.id===settings.gifts[k].id);
      const manual=settings.gifts[k].source==='owner-manual'&&settings.gifts[k].bound_username===settings.username;
      settings.gifts[k]=current?{...current,verified:true}:{...settings.gifts[k],verified:manual};
    }
    save();
    if(startOnConnect&&ready()){changeMode('live');autoplay=true;startRound();}
  } catch(error) {
    if(connection===client)await disconnect();
    live={status:'error',message:safeError(error),catalog:[]};
  } finally {clearTimeout(timeout);connecting=false;broadcast();}
}
function startRound() {if(mode==='live'&&!ready())throw Error('ابتدا اتصال زنده و سه هدیهٔ معتبر را تنظیم کنید.');quiz.start();advanceAt=null;broadcast();}
function authenticated(req) {
  const value=req.headers.authorization?.replace(/^Bearer /,'')||'';
  const a=Buffer.from(value),b=Buffer.from(token);
  return a.length===b.length&&timingSafeEqual(a,b);
}
function originAllowed(req) {
  const origin=req.headers.origin;
  return !origin||hosting.allowedOrigins.has(origin);
}
async function body(req) {
  if(!String(req.headers['content-type']||'').startsWith('application/json'))throw Error('JSON required');
  let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>32768)throw Error('Request too large');}
  return JSON.parse(text||'{}');
}
const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.woff2':'font/woff2'};
const assets=new Map([['/','screen.html'],['/screen','screen.html'],['/control','control.html'],['/style.css','style.css'],['/screen.js','screen.js'],['/control.js','control.js'],['/font.woff2','font.woff2']]);
function json(res,status,data) {res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws:; img-src 'self' data:; font-src 'self'; frame-ancestors 'self'");
  if(!hosting.allowedHosts.has(req.headers.host)||!originAllowed(req))return json(res,403,{error:'Host or origin is not allowed'});
  const url=new URL(req.url,base);
  try {
    if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,version:'fahrfit-online-v1',build:process.env.QUIZ_BUILD_SHA||'local',mode,questions:quiz.questions.length});
    if(req.method==='GET'&&url.pathname==='/api/state')return json(res,200,publicState());
    if(url.pathname.startsWith('/api/admin/')) {
      if(!authenticated(req))return json(res,401,{error:'رمز پنل کنترل معتبر نیست.'});
      if(req.method==='GET'&&url.pathname==='/api/admin/catalog')return json(res,200,{gifts:live.catalog});
      if(req.method!=='POST')return json(res,405,{error:'POST required'});
      const data=await body(req);const action=url.pathname.split('/').at(-1);
      if(action==='start')startRound();
      else if(action==='reveal'){quiz.reveal();advanceAt=Date.now()+12000;}
      else if(action==='next'){quiz.next();advanceAt=null;}
      else if(action==='pause'){autoplay=false;quiz.pause();}
      else if(action==='autoplay'){autoplay=Boolean(data.enabled);if(autoplay&&quiz.phase!=='open'){if(quiz.phase==='revealed')quiz.next();startRound();}}
      else if(action==='mode'){
        if(!['demo','live'].includes(data.mode))throw Error('حالت معتبر نیست.');
        if(quiz.phase==='open')throw Error('پیش از تغییر حالت، سؤال را متوقف کنید.');
        if(data.mode==='live'&&!ready())throw Error('اتصال زنده و سه هدیهٔ معتبر لازم است.');
        changeMode(data.mode);autoplay=false;quiz.pause();
      }
      else if(action==='gifts'){
        if(quiz.phase==='open')throw Error('پیش از تغییر هدایا سؤال را متوقف کنید.');
        if(!Array.isArray(data.ids)||![3,4].includes(data.ids.length)||data.ids.slice(0,3).some(id=>!id)||new Set(data.ids.filter(Boolean).map(String)).size!==data.ids.filter(Boolean).length)throw Error('سه هدیهٔ متفاوت و در صورت تمایل یک هدیهٔ جدا برای هر سه انتخاب کنید.');
        const selected=data.ids.slice(0,3).map(id=>live.catalog.find(g=>g.id===String(id)));
        const all=data.ids[3]?live.catalog.find(g=>g.id===String(data.ids[3])):null;
        if(selected.some(g=>!g)||(data.ids[3]&&!all))throw Error('هدیه باید از فهرست همین اتصال زنده انتخاب شود.');
        settings.gifts={...Object.fromEntries(LETTERS.map((k,i)=>[k,{...selected[i],verified:true}])),ALL:all?{...all,verified:true}:defaults.gifts.ALL};save();
      }
      else if(action==='manual-gifts'){
        if(quiz.phase==='open')throw Error('پیش از تغییر هدایا سؤال را متوقف کنید.');
        if(!data.confirmed||!Array.isArray(data.gifts)||data.gifts.length!==4)throw Error('نام و شناسهٔ سه هدیه و انتخاب اختیاری هر سه را تأیید کنید.');
        const rows=data.gifts.map((g,i)=>!g.id&&i===3?null:{id:String(g.id||''),name:String(g.name||'').trim().slice(0,80),coins:null,verified:true,source:'owner-manual',bound_username:settings.username});
        if(rows.slice(0,3).some(g=>!/^\d{1,20}$/.test(g.id)||g.id==='0'||!g.name)||rows[3]&&(!/^\d{1,20}$/.test(rows[3].id)||rows[3].id==='0'||!rows[3].name)||new Set(rows.filter(Boolean).map(g=>g.id)).size!==rows.filter(Boolean).length)throw Error('نام و شناسهٔ معتبر و متفاوت برای هدایا لازم است.');
        settings.gifts=Object.fromEntries([...LETTERS,'ALL'].map((k,i)=>[k,rows[i]||defaults.gifts.ALL]));save();
      }
      else if(action==='simulate'){
        if(mode!=='demo')throw Error('شبیه‌سازی در حالت واقعی ممنوع است.');
        const choice=String(data.choice);const userId=String(data.name||'بینندهٔ آزمایشی').slice(0,40);
        const result=quiz.submit({id:'demo-'+randomUUID(),userId,name:userId,choice,time:Date.now(),roundId:quiz.round?.id});
        if(!result.accepted)throw Error('پاسخ ثبت نشد: '+result.reason);
        recent.push({...quiz.lastAnswer,at:Date.now()});recent=recent.slice(-12);
      }
      else if(action==='connect')await connect(String(data.username||settings.username),data.startOnConnect===true);
      else if(action==='disconnect')await disconnect();
      else return json(res,404,{error:'Unknown command'});
      broadcast();return json(res,200,{ok:true,state:publicState()});
    }
    const asset=assets.get(url.pathname);
    if(req.method==='GET'&&asset) {
      const ext='.'+asset.split('.').at(-1);res.writeHead(200,{'content-type':contentTypes[ext]||'application/octet-stream','cache-control':'no-store'});return res.end(readFileSync(join(root,'public',asset)));
    }
    return json(res,404,{error:'Not found'});
  }catch(error){return json(res,400,{error:String(error.message||'Request failed').slice(0,300)});}
});
server.on('upgrade',(req,socket,head)=>{
  if(req.url!=='/events'||!originAllowed(req)||!hosting.allowedHosts.has(req.headers.host)){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>{wss.emit('connection',ws,req);ws.send(JSON.stringify(publicState()));});
});
const tick=setInterval(()=>{
  const before=quiz.phase;quiz.tick();if(before==='open'&&quiz.phase==='revealed')advanceAt=Date.now()+12000;
  if(autoplay&&quiz.phase==='revealed'&&Date.now()>=advanceAt){quiz.next();try{startRound();}catch{autoplay=false;quiz.pause();}}
  broadcast();
},500);
server.listen(port,hosting.bind,()=>{
  writeFileSync(process.env.QUIZ_RUNTIME_PATH||join(root,'.runtime.json'),JSON.stringify({base,token,screen:base+'/screen',control:base+'/control#'+token,pid:process.pid},null,2),{mode:0o600});
  console.log(hosting.publicOrigin?`Screen: ${base}/screen\nPrivate control link is delivered separately to the owner.\nDemo mode; paid signing is disabled.`:`Screen: ${base}/screen\nControl: ${base}/control#${token}\nDemo mode; no live connection or paid service has been enabled.`);
});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{clearInterval(tick);await disconnect();wss.close();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),2000).unref();});
