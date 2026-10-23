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
import {loadBankMedia} from './bank-media.mjs';
import {serveMedia} from './media-response.mjs';
import {GIFT_PRESET_VERSION,presetGifts,configuredGift,observeGift} from './gifts.mjs';
import {SupporterWall} from './supporters.mjs';
import {GuestSupport} from './guests.mjs';
import {liveDiagnostics} from './live-diagnostics.mjs';

// The dependency otherwise discovers SIGN_API_KEY from the environment.
// This application deliberately permits anonymous/free signing only.
SignConfig.apiKey=undefined;
SignConfig.basePath='https://api.eulerstream.com';
SignConfig.cachedInstance=undefined;

const root=fileURLToPath(new URL('.',import.meta.url));
const hosting=hostingConfig();
const {token,port,base}=hosting;
const settingsFile=process.env.QUIZ_SETTINGS_PATH||join(root,'settings.json');
const defaults={showPersian:false,timerSound:true,celebrationMusic:true,musicVolume:20,questionSeconds:30,answerInput:'comments',username:'easydeutsches',gifts:presetGifts('easydeutsches'),giftPreset:GIFT_PRESET_VERSION};
const stored=existsSync(settingsFile)?JSON.parse(readFileSync(settingsFile,'utf8')):null;
let settings=stored?{...defaults,...stored}:defaults;
settings.gifts={...defaults.gifts,...settings.gifts};
if((stored&&stored.giftPreset!==GIFT_PRESET_VERSION)||Object.values(settings.gifts).some(g=>g?.id==='101')){settings.gifts=presetGifts(settings.username);settings.giftPreset=GIFT_PRESET_VERSION;save();}
const quiz=new Quiz(JSON.parse(readFileSync(join(root,'data/questions.json'),'utf8')));
quiz.seconds=Number.isInteger(settings.questionSeconds)&&settings.questionSeconds>=10&&settings.questionSeconds<=300?settings.questionSeconds:30;
const bankMedia=loadBankMedia(quiz.questions);
const supporters=new SupporterWall();
const guests=new GuestSupport(settings.guests||[]);
function saveGuests(){settings.guests=guests.guests;save();}
let mode='demo',autoplay=false,advanceAt=null,connection=null,connecting=false;
let live={status:'disconnected',message:'حالت آزمایشی؛ هیچ گیفت واقعی دریافت نمی‌شود.',catalog:[]};
let recent=[],lastReject=null;
const freshTraffic=()=>({commentsReceived:0,answerCommentsReceived:0,commentsAccepted:0,giftsReceived:0,giftsAccepted:0,lastCommentReject:null,lastGiftReject:null});
let traffic=freshTraffic();
function catalogFrom(raw) {
  const candidates=[raw,raw?.gifts,raw?.data?.gifts,raw?.giftList,raw?.data?.giftList,raw?.data];
  const list=candidates.find(Array.isArray)||[];
  return [...new Map(list.slice(0,10000).map(g=>({id:String(g.id??g.giftId??''),name:String(g.name??g.describe??'').slice(0,80),coins:Number(g.diamondCount??g.diamond_count)})).filter(g=>/^\d+$/.test(g.id)&&g.name&&Number.isFinite(g.coins)&&g.coins>0).map(g=>[g.id,g])).values()];
}
function ready() {
  if(live.status!=='connected')return false;
  if(settings.answerInput==='comments')return true;
  const selected=LETTERS.map(k=>settings.gifts[k]);
  return live.status==='connected' && new Set(selected.map(g=>g?.id)).size===3 && selected.every(g=>g?.verified && (live.catalog.some(c=>c.id===g.id)||configuredGift(g,settings.username)));
}
function publicState() {
  return {...quiz.snapshot(),mode,autoplay,answerInput:settings.answerInput,username:settings.username,gifts:settings.gifts,liveReady:ready(),traffic:{...traffic},showPersian:settings.showPersian,timerSound:settings.timerSound,celebrationMusic:settings.celebrationMusic,musicVolume:settings.musicVolume,supporters:supporters.snapshot(),guests:guests.snapshot(),
    connection:{status:live.status,message:live.message,giftCount:live.catalog.length,diagnostics:live.diagnostics||[]},recent:recent.slice(-4).reverse(),lastReject};
}
const wss=new WebSocketServer({noServer:true});
function broadcast() {const data=JSON.stringify(publicState());for(const ws of wss.clients)if(ws.readyState===1){if(ws.bufferedAmount>1000000)ws.terminate();else ws.send(data);}}
function save() {writeFileSync(settingsFile,JSON.stringify(settings,null,2)+'\n',{mode:0o600});}
function changeMode(next){if(mode!==next){supporters.clear();guests.clear();quiz.pause();quiz.leaderboard.clear();quiz.answers.clear();quiz.lastAnswer=null;recent=[];}mode=next;}
function safeError(error) {
  if(/offline/i.test(error?.constructor?.name||error?.name||''))return 'حساب اکنون لایو ندارد.';
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
  supporters.clear();traffic=freshTraffic();settings.username=username.replace(/^@/,'');for(const g of Object.values(settings.gifts))if(g.source==='owner-preset')g.bound_username=settings.username;save();connecting=true;autoplay=false;quiz.pause();
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
    traffic.giftsReceived++;
    const details=data.giftDetails||data.gift||data.extendedGiftInfo||{};
    const id=String(data.giftId??details.id??'');const name=String(details.giftName||details.name||data.giftName||'').slice(0,80);
    const cost=Number(details.diamondCount??details.diamond_count??data.diamondCount);
    if(/^\d+$/.test(id)&&name){
      const gift={id,name,coins:Number.isFinite(cost)&&cost>0?cost:null,source:'live-event'};
      const i=live.catalog.findIndex(g=>g.id===id);if(i<0&&live.catalog.length<1000)live.catalog.push(gift);else if(i>=0)live.catalog[i]=gift;
      for(const k of [...LETTERS,'ALL'])if(settings.gifts[k].id===id)settings.gifts[k]=observeGift(settings.gifts[k],gift);
    }
    let guestResult;
    if(live.status==='connected'){if(guests.observe(data.user))saveGuests();if(guests.observe(data.toUser))saveGuests();guestResult=guests.gift(data);supporters.gift(data,{});}
    if(guestResult?.accepted){broadcast();return;}
    if(mode!=='live'||settings.answerInput!=='gifts'||!ready()||connection!==client){broadcast();return;}
    const result=quiz.gift(data,Object.fromEntries(Object.entries(settings.gifts).filter(([,g])=>g.verified)));
    if(result.accepted) {traffic.giftsAccepted++;traffic.lastGiftReject=null;recent.push({...quiz.lastAnswer,at:Date.now()});recent=recent.slice(-12);lastReject=null;}
    else {traffic.lastGiftReject=result.reason;if(!['unmapped_gift','streak_not_finished','duplicate_event','already_selected'].includes(result.reason))lastReject=result.reason;}
    broadcast();
  });
  client.on(WebcastEvent.CHAT,data=>{
    if(connection!==client)return;
    traffic.commentsReceived++;
    if(/^[123۱۲۳١٢٣]$/.test(String(data.content??data.comment??data.text??'').trim()))traffic.answerCommentsReceived++;
    if(connection===client&&guests.observe(data.user)){saveGuests();broadcast();}
    if(connection!==client||mode!=='live'||settings.answerInput!=='comments'||!ready())return;
    const result=quiz.comment(data);
    if(result.accepted){traffic.commentsAccepted++;traffic.lastCommentReject=null;recent.push({...quiz.lastAnswer,at:Date.now()});recent=recent.slice(-12);lastReject=null;}
    else if(result.reason!=='irrelevant_comment'){traffic.lastCommentReject=result.reason;if(!['duplicate_event','already_selected'].includes(result.reason))lastReject=result.reason;}
    if(result.reason!=='irrelevant_comment')broadcast();
  });
  let timeout;
  try {
    await Promise.race([client.connect(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Connect timeout')),45000);})]);
    if(connection!==client)throw Error('Connection changed');
    const catalog=catalogFrom(client.availableGifts);
    live={status:'connected',message:'متصل؛ هدایا از رویدادهای همین لایو شناخته می‌شوند. می‌توانید نام و شناسهٔ هدایا را هم دستی ثبت کنید.',catalog};
    for(const k of [...LETTERS,'ALL']){
      const current=catalog.find(g=>g.id===settings.gifts[k].id);
      const manual=configuredGift(settings.gifts[k],settings.username);
      settings.gifts[k]=current?observeGift(settings.gifts[k],current):{...settings.gifts[k],verified:Boolean(manual)};
    }
    save();
    if(startOnConnect&&ready()){changeMode('live');autoplay=true;startRound();}
  } catch(error) {
    if(connection===client)await disconnect();
    live={status:'error',message:safeError(error),catalog:[],diagnostics:liveDiagnostics(error)};
  } finally {clearTimeout(timeout);connecting=false;broadcast();}
}
function startRound() {if(mode==='live'&&!ready())throw Error('ابتدا لایو را وصل کنید و روش پاسخ را تنظیم کنید.');quiz.start();advanceAt=null;broadcast();}
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
const assets=new Map([['/','screen.html'],['/screen','screen.html'],['/control','control.html'],['/style.css','style.css'],['/screen.js','screen.js'],['/celebration.js','celebration.js'],['/guests-ui.js','guests-ui.js'],['/control.js','control.js'],['/font.woff2','font.woff2']]);
function json(res,status,data) {res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws:; img-src 'self' data: https://*.tiktokcdn.com https://*.tiktokcdn-us.com https://*.tiktokcdn-eu.com https://*.byteimg.com https://*.ibyteimg.com https://*.ibytedtos.com; font-src 'self'; frame-ancestors 'self'");
  if(!hosting.allowedHosts.has(req.headers.host)||!originAllowed(req))return json(res,403,{error:'Host or origin is not allowed'});
  const url=new URL(req.url,base);
  try {
    if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,version:'fahrfit-online-v1',build:process.env.QUIZ_BUILD_SHA||'local',mode,questions:quiz.questions.length,verified_images:[...bankMedia.keys()].filter(p=>p.endsWith('.png')).length,verified_videos:[...bankMedia.keys()].filter(p=>p.endsWith('.mp4')).length});
    if(req.method==='GET'&&url.pathname==='/api/state')return json(res,200,publicState());
    if(url.pathname.startsWith('/api/admin/')) {
      if(!authenticated(req))return json(res,401,{error:'رمز پنل کنترل معتبر نیست.'});
      if(req.method==='GET'&&url.pathname==='/api/admin/questions')return json(res,200,{questions:quiz.questions.map(q=>({id:q.id,topic:q.topic,video:Boolean(q.video)}))});
      if(req.method==='GET'&&url.pathname==='/api/admin/catalog')return json(res,200,{gifts:live.catalog});
      if(req.method!=='POST')return json(res,405,{error:'POST required'});
      const data=await body(req);const action=url.pathname.split('/').at(-1);
      if(action==='guest-add'){guests.add(data.username,data.userId);saveGuests();}
      else if(action==='guest-remove'){guests.remove(String(data.key));saveGuests();}
      else if(action==='simulate-guest-gift'){
        if(mode!=='demo')throw Error('فقط در حالت آزمایشی مجاز است.');
        const guest=guests.guests.find(g=>g.key===data.key);if(!guest?.userId)throw Error('شناسهٔ عددی مهمان برای آزمایش لازم است.');
        const result=guests.gift({receiverUserId:guest.userId,giftId:'demo-guest-gift',giftName:'Testgeschenk',diamondCount:500,repeatCount:1,user:{id:'demo-donor',nickname:'حامی آزمایشی'},common:{msgId:randomUUID(),createTime:Date.now()}});if(!result.accepted)throw Error(result.reason);
      }
      else if(action==='start')startRound();
      else if(action==='reveal'){if(quiz.phase==='watching')throw Error('ابتدا نمایش فیلم تمام شود یا سؤال را متوقف کنید.');quiz.reveal();advanceAt=Date.now()+12000;}
      else if(action==='select'){quiz.select(String(data.id));advanceAt=null;}
      else if(action==='next'){quiz.next();advanceAt=null;}
      else if(action==='pause'){autoplay=false;quiz.pause();}
      else if(action==='autoplay'){autoplay=Boolean(data.enabled);if(autoplay&&!['open','watching'].includes(quiz.phase)){if(quiz.phase==='revealed')quiz.next();startRound();}}
      else if(action==='mode'){
        if(!['demo','live'].includes(data.mode))throw Error('حالت معتبر نیست.');
        if(['open','watching'].includes(quiz.phase))throw Error('پیش از تغییر حالت، سؤال را متوقف کنید.');
        if(data.mode==='live'&&!ready())throw Error('اتصال لایو و آماده‌بودن روش پاسخ لازم است.');
        changeMode(data.mode);autoplay=false;quiz.pause();
      }
      else if(action==='display-language'){
        if(typeof data.showPersian!=='boolean')throw Error('تنظیم ترجمه معتبر نیست.');settings.showPersian=data.showPersian;save();
      }
      else if(action==='timer-sound'){
        if(typeof data.enabled!=='boolean')throw Error('تنظیم صدای زمان معتبر نیست.');settings.timerSound=data.enabled;save();
      }
      else if(action==='celebration-audio'){
        const volume=Number(data.volume);if(typeof data.enabled!=='boolean'||!Number.isInteger(volume)||volume<0||volume>100)throw Error('تنظیم صدا معتبر نیست.');
        settings.celebrationMusic=data.enabled;settings.musicVolume=volume;save();
      }
      else if(action==='question-time'){
        const seconds=Number(data.seconds);if(!Number.isInteger(seconds)||seconds<10||seconds>300)throw Error('زمان پاسخ باید عدد صحیح بین 10 و 300 ثانیه باشد.');
        if(['open','watching'].includes(quiz.phase))throw Error('ابتدا سؤال را متوقف کنید.');
        settings.questionSeconds=seconds;quiz.seconds=seconds;save();
      }
      else if(action==='answer-input'){
        if(!['comments','gifts'].includes(data.input))throw Error('روش پاسخ معتبر نیست.');
        if(['open','watching'].includes(quiz.phase))throw Error('ابتدا سؤال را متوقف کنید.');
        settings.answerInput=data.input;lastReject=null;save();
      }
      else if(action==='gift-preset'){if(['open','watching'].includes(quiz.phase))throw Error('ابتدا سؤال را متوقف کنید.');settings.gifts=presetGifts(settings.username);settings.giftPreset=GIFT_PRESET_VERSION;save();}
      else if(action==='gifts'){
        if(['open','watching'].includes(quiz.phase))throw Error('پیش از تغییر هدایا سؤال را متوقف کنید.');
        if(!Array.isArray(data.ids)||![3,4].includes(data.ids.length)||data.ids.slice(0,3).some(id=>!id)||new Set(data.ids.filter(Boolean).map(String)).size!==data.ids.filter(Boolean).length)throw Error('سه هدیهٔ متفاوت و در صورت تمایل یک هدیهٔ جدا برای هر سه انتخاب کنید.');
        const selected=data.ids.slice(0,3).map(id=>live.catalog.find(g=>g.id===String(id)));
        const all=data.ids[3]?live.catalog.find(g=>g.id===String(data.ids[3])):null;
        if(selected.some(g=>!g)||(data.ids[3]&&!all))throw Error('هدیه باید از فهرست همین اتصال زنده انتخاب شود.');
        settings.gifts={...Object.fromEntries(LETTERS.map((k,i)=>[k,{...selected[i],verified:true}])),ALL:all?{...all,verified:true}:defaults.gifts.ALL};save();
      }
      else if(action==='manual-gifts'){
        if(['open','watching'].includes(quiz.phase))throw Error('پیش از تغییر هدایا سؤال را متوقف کنید.');
        if(!data.confirmed||!Array.isArray(data.gifts)||data.gifts.length!==4)throw Error('نام و شناسهٔ سه هدیه و انتخاب اختیاری هر سه را تأیید کنید.');
        const rows=data.gifts.map((g,i)=>!g.id&&i===3?null:{id:String(g.id||''),name:String(g.name||'').trim().slice(0,80),coins:null,verified:true,source:'owner-manual',bound_username:settings.username});
        if(rows.slice(0,3).some(g=>!/^\d{1,20}$/.test(g.id)||g.id==='0'||!g.name)||rows[3]&&(!/^\d{1,20}$/.test(rows[3].id)||rows[3].id==='0'||!rows[3].name)||new Set(rows.filter(Boolean).map(g=>g.id)).size!==rows.filter(Boolean).length)throw Error('نام و شناسهٔ معتبر و متفاوت برای هدایا لازم است.');
        settings.gifts=Object.fromEntries([...LETTERS,'ALL'].map((k,i)=>[k,rows[i]||defaults.gifts.ALL]));save();
      }
      else if(action==='simulate-comment'){
        if(mode!=='demo'||settings.answerInput!=='comments')throw Error('این آزمایش فقط در حالت آزمایشی کامنت مجاز است.');
        const name=String(data.name||'بینندهٔ آزمایشی').slice(0,40);
        const result=quiz.comment({comment:String(data.comment||''),user:{id:name,nickname:name,profilePictureUrl:data.avatar},common:{msgId:randomUUID(),createTime:Date.now()}});
        if(!result.accepted)throw Error('کامنت ثبت نشد: '+result.reason);
      }
      else if(action==='simulate-supporter'){
        if(mode!=='demo')throw Error('آزمایش حلقه فقط در حالت آزمایشی مجاز است.');
        const result=supporters.gift({giftId:'demo-outside-gifts',giftName:'Testgeschenk',diamondCount:Number(data.coins),repeatCount:1,user:{id:String(data.name||'demo-supporter'),nickname:String(data.name||'حامی آزمایشی'),profilePictureUrl:data.avatar},common:{msgId:randomUUID(),createTime:Date.now()}},settings.gifts);
        if(!result.accepted)throw Error('ثبت آزمایشی انجام نشد.');
      }
      else if(action==='clear-supporters'){if(mode!=='demo')throw Error('پاک‌کردن آزمایش فقط در حالت آزمایشی است.');supporters.clear();}
      else if(action==='simulate'){
        if(mode!=='demo')throw Error('شبیه‌سازی در حالت واقعی ممنوع است.');
        const choice=String(data.choice);const userId=String(data.name||'بینندهٔ آزمایشی').slice(0,40);
        const result=quiz.submit({id:'demo-'+randomUUID(),userId,name:userId,avatar:data.avatar,choice,time:Date.now(),roundId:quiz.round?.id});
        if(!result.accepted)throw Error('پاسخ ثبت نشد: '+result.reason);
        recent.push({...quiz.lastAnswer,at:Date.now()});recent=recent.slice(-12);
      }
      else if(action==='connect')await connect(String(data.username||settings.username),data.startOnConnect===true);
      else if(action==='disconnect')await disconnect();
      else return json(res,404,{error:'Unknown command'});
      broadcast();return json(res,200,{ok:true,state:publicState()});
    }
    if(['GET','HEAD'].includes(req.method)&&bankMedia.has(url.pathname))return serveMedia(req,res,bankMedia.get(url.pathname),url.pathname.endsWith('.mp4')?'video/mp4':'image/png');
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
  quiz.tick();if(quiz.phase==='revealed'&&advanceAt===null)advanceAt=Date.now()+12000;
  if(autoplay&&quiz.phase==='revealed'&&Date.now()>=advanceAt){quiz.next();try{startRound();}catch{autoplay=false;quiz.pause();}}
  broadcast();
},500);
server.listen(port,hosting.bind,()=>{
  writeFileSync(process.env.QUIZ_RUNTIME_PATH||join(root,'.runtime.json'),JSON.stringify({base,token,screen:base+'/screen',control:base+'/control#'+token,pid:process.pid},null,2),{mode:0o600});
  console.log(hosting.publicOrigin?`Screen: ${base}/screen\nPrivate control link is delivered separately to the owner.\nDemo mode; paid signing is disabled.`:`Screen: ${base}/screen\nControl: ${base}/control#${token}\nDemo mode; no live connection or paid service has been enabled.`);
});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{clearInterval(tick);await disconnect();wss.close();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),2000).unref();});
