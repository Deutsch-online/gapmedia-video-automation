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
import {SupporterWall,DEFAULT_GIFT_STYLE,validGiftStyle,styledGiftTier} from './supporters.mjs';
import {LiveReconnect} from './reconnect.mjs';
import {LikeWall,activityWall,activityFocus} from './likes.mjs';
import {bankSections} from './sections.mjs';
import {QuizSessions} from './sessions.mjs';
import {SessionStore} from './session-store.mjs';
import {GuestSupport} from './guests.mjs';
import {LiveSpeech} from './live-speech.mjs';
import {LiveAssistant,ASSISTANT_DEFAULTS,validAssistantSettings} from './live-assistant.mjs';
import {answerComment,teachingNote} from './teaching.mjs';
import {WelcomeCycle} from './welcome.mjs';
import {profileAvatar} from './gifts.mjs';
import {narrationMetadata,narrationDuration} from './narration-metadata.mjs';
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
let narrationReplay=0;
let narrationInfo;
const defaults={assistant:{...ASSISTANT_DEFAULTS},joinDisplay:{enabled:true,side:"right",size:64,bottom:100},narrationLanguage:"both",welcomeEnabled:true,waitSeconds:12,profileFrames:{liker:"auto",gifter:"auto"},giftStyle:DEFAULT_GIFT_STYLE,activityDisplay:{side:'right',count:8,top:220},narrationEnabled:true,autoReconnect:true,showPersian:false,timerSound:true,celebrationMusic:true,musicVolume:20,questionSeconds:30,answerInput:'comments',username:'easydeutsches',gifts:presetGifts('easydeutsches'),giftPreset:GIFT_PRESET_VERSION};
const stored=existsSync(settingsFile)?JSON.parse(readFileSync(settingsFile,'utf8')):null;
let settings=stored?{...defaults,...stored}:defaults;
settings.gifts={...defaults.gifts,...settings.gifts};
settings.activityDisplay={...defaults.activityDisplay,...settings.activityDisplay};
if(!validGiftStyle(settings.giftStyle))settings.giftStyle=DEFAULT_GIFT_STYLE;
if((stored&&stored.giftPreset!==GIFT_PRESET_VERSION)||Object.values(settings.gifts).some(g=>g?.id==='101')){settings.gifts=presetGifts(settings.username);settings.giftPreset=GIFT_PRESET_VERSION;save();}
const quiz=new Quiz(JSON.parse(readFileSync(join(root,'data/questions.json'),'utf8')));
quiz.seconds=Number.isInteger(settings.questionSeconds)&&settings.questionSeconds>=10&&settings.questionSeconds<=300?settings.questionSeconds:30;
const bankMedia=loadBankMedia(quiz.questions);
const welcomeCycle=new WelcomeCycle();const speechTexts=JSON.parse(readFileSync(join(root,'speech-texts.json'),'utf8'));
const welcomeDuration=()=>((narrationInfo?.welcome?.fa?.duration_ms||11000)+(narrationInfo?.welcome?.de?.duration_ms||9000)+300);
const supporters=new SupporterWall({limit:20});
const likes=new LikeWall();
const sessionStore=new SessionStore();
const loadedProgress=await sessionStore.load();
const savedActivity=loadedProgress?.activityDisplay;
if(savedActivity&&['left','right'].includes(savedActivity.side)&&Number.isInteger(savedActivity.count)&&savedActivity.count>=1&&savedActivity.count<=10&&Number.isInteger(savedActivity.top)&&savedActivity.top>=80&&savedActivity.top<=1200)settings.activityDisplay={side:savedActivity.side,count:savedActivity.count,top:savedActivity.top};
if(validGiftStyle(loadedProgress?.giftStyle))settings.giftStyle=loadedProgress.giftStyle;

if(Number.isInteger(loadedProgress?.waitSeconds)&&loadedProgress.waitSeconds>=0&&loadedProgress.waitSeconds<=300)settings.waitSeconds=loadedProgress.waitSeconds;
if(loadedProgress?.profileFrames)settings.profileFrames=loadedProgress.profileFrames;
if(['de','fa','both'].includes(loadedProgress?.narrationLanguage))settings.narrationLanguage=loadedProgress.narrationLanguage;
if(typeof loadedProgress?.welcomeEnabled==='boolean')settings.welcomeEnabled=loadedProgress.welcomeEnabled;
const validJoinDisplay=value=>value&&typeof value.enabled==='boolean'&&['right','left'].includes(value.side)&&[56,64,72].includes(value.size)&&Number.isInteger(value.bottom)&&value.bottom>=80&&value.bottom<=500;
if(validJoinDisplay(loadedProgress?.joinDisplay))settings.joinDisplay=loadedProgress.joinDisplay;else if(!validJoinDisplay(settings.joinDisplay))settings.joinDisplay=defaults.joinDisplay;
if(validAssistantSettings(loadedProgress?.assistant))settings.assistant=loadedProgress.assistant;else if(!validAssistantSettings(settings.assistant))settings.assistant={...ASSISTANT_DEFAULTS};
const liveVoice=new LiveSpeech();const assistant=new LiveAssistant({voice:liveVoice,settings:()=>settings.assistant});
const ids=quiz.questions.map(q=>q.id);const groups=bankSections(quiz.questions);
const liveSessions=new QuizSessions(ids,loadedProgress||settings.sessionProgress||{},{groups});
let demoSessions=new QuizSessions(ids,{size:liveSessions.size,allowRepeat:liveSessions.allowRepeat},{groups});
const sessions=()=>mode==='live'?liveSessions:demoSessions;
let questionTrail=[],trailIndex=-1;
function rememberQuestion(id){if(questionTrail[trailIndex]===id)return;questionTrail=questionTrail.slice(0,trailIndex+1);questionTrail.push(id);trailIndex=questionTrail.length-1;if(questionTrail.length>200){questionTrail.shift();trailIndex--;}}
let completedRound=null,advancing=false,sessionError=null,roundControlGeneration=0;
function checkRoundGeneration(generation){if(generation!==roundControlGeneration)throw Error('فرمان قبلی با دستور تازه لغو شد.');}
function progressData(){return {...liveSessions.export(),activityDisplay:settings.activityDisplay,giftStyle:settings.giftStyle,waitSeconds:settings.waitSeconds,profileFrames:settings.profileFrames,narrationLanguage:settings.narrationLanguage,welcomeEnabled:settings.welcomeEnabled,joinDisplay:settings.joinDisplay,assistant:settings.assistant};}
function persistSession(){if(mode==='live'){settings.sessionProgress=liveSessions.export();save();sessionStore.queue(progressData());}}
async function persistDisplay(){save();if(sessionStore.repo){sessionStore.queue(progressData());await sessionStore.flush();}}
async function flushSession(){if(mode==='live')await sessionStore.flush();}
function recordCompleted(){if(quiz.phase==='revealed'&&quiz.round?.id!==completedRound){completedRound=quiz.round?.id;sessions().complete(quiz.questions[quiz.index].id);persistSession();if(settings.assistant.enabled&&settings.assistant.autoExplain)assistant.explain(quiz.questions[quiz.index],quiz.round.id,{revealed:true});}}
async function nextRound({generation=roundControlGeneration}={}){recordCompleted();await flushSession();checkRoundGeneration(generation);const id=sessions().next();persistSession();await flushSession();checkRoundGeneration(generation);advanceAt=null;if(!id){autoplay=false;return false;}quiz.select(id);return true;}

const guests=new GuestSupport(settings.guests||[]);
function saveGuests(){settings.guests=guests.guests;save();}
let mode='demo',autoplay=false,advanceAt=null,connection=null,connecting=false;
const reconnect=new LiveReconnect({enabled:Boolean(hosting.publicOrigin)&&settings.autoReconnect!==false});
let resumeOnReconnect=false,connectGeneration=0;
let live={status:'disconnected',message:'حالت آزمایشی؛ هیچ گیفت واقعی دریافت نمی‌شود.',catalog:[]};
let recent=[],lastReject=null;let recentJoins=[];
function receiveJoin(data){const name=String(data.user?.nickname||data.user?.displayId||data.user?.uniqueId||"Besucher").slice(0,60);const message=String(data.common?.msgId||'');const key=message&&!/^0+$/.test(message)?message:randomUUID();if(recentJoins.some(j=>j.key===key))return;recentJoins.push({key,name,avatar:profileAvatar(data),at:Date.now()});recentJoins=recentJoins.slice(-64);}
const freshTraffic=()=>({likesReceived:0,commentsReceived:0,answerCommentsReceived:0,commentsAccepted:0,giftsReceived:0,giftsAccepted:0,giftProfilesRecorded:0,giftProfilesUpdated:0,giftProgressReceived:0,giftDisplayRejected:0,giftDuplicates:0,lastGiftDisplayReject:null,lastCommentReject:null,lastGiftReject:null});
let traffic=freshTraffic();let giftDisplayEvents=[];
function recordGiftDisplay(event,result){
 if(result.accepted){if(result.updated)traffic.giftProfilesUpdated++;else traffic.giftProfilesRecorded++;if(result.pending)traffic.giftProgressReceived++;traffic.lastGiftDisplayReject=null;}
 else if(['duplicate_event','older_streak_update'].includes(result.reason))traffic.giftDuplicates++;
 else{traffic.giftDisplayRejected++;traffic.lastGiftDisplayReject=result.detail||result.reason;}
 const count=Number(result.count??event.repeatCount??event.gift?.repeat_count),item={at:Date.now(),accepted:result.accepted,pending:result.pending===true,updated:result.updated===true,reason:result.detail||result.reason||null,giftId:String(event.giftId??event.gift?.id??'').slice(0,30),count:Number.isSafeInteger(count)&&count>0?count:null,coins:result.coins??null,username:typeof event.user?.displayId==='string'?event.user.displayId.slice(0,24):typeof event.user?.uniqueId==='string'?event.user.uniqueId.slice(0,24):null};
 giftDisplayEvents.unshift(item);giftDisplayEvents=giftDisplayEvents.slice(0,30);
}
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
function styleActivity(person){return person?.kind==='gift'?{...person,tier:styledGiftTier(person,settings.giftStyle)}:person;}
function publicState() {
  const snapshot=quiz.snapshot();recordCompleted();
  return {...snapshot,assistant:{enabled:settings.assistant.enabled,showCaptions:settings.assistant.showCaptions,...assistant.snapshot({roundId:quiz.round?.id,phase:quiz.phase})},navigation:{hasPrevious:trailIndex>0},session:sessions().summary(),sessionStorage:{status:mode==='live'?sessionStore.status:'demo',ready:mode!=='live'||sessionStore.ready,error:sessionError},build:process.env.QUIZ_BUILD_SHA||'local',mode,autoplay,answerInput:settings.answerInput,username:settings.username,gifts:settings.gifts,liveReady:ready(),traffic:{...traffic},narrationEnabled:settings.narrationEnabled,narrationLanguage:settings.narrationLanguage,welcome:{enabled:settings.welcomeEnabled,intervalSeconds:120,announcement:welcomeCycle.announcement,texts:speechTexts.welcome},narrationReplay,showPersian:settings.showPersian,timerSound:settings.timerSound,celebrationMusic:settings.celebrationMusic,musicVolume:settings.musicVolume,giftStyle:settings.giftStyle,waitSeconds:settings.waitSeconds,profileFrames:settings.profileFrames,joinDisplay:settings.joinDisplay,joins:recentJoins.filter(j=>Date.now()-j.at<9000),activityDisplay:settings.activityDisplay,activityFocus:styleActivity(activityFocus(likes,supporters)),supporters:activityWall(likes,supporters,settings.activityDisplay.count).map(styleActivity),guests:guests.snapshot(),
    connection:{...reconnect.snapshot(),status:live.status,message:live.message,giftCount:live.catalog.length,diagnostics:live.diagnostics||[]},recent:recent.slice(-4).reverse(),lastReject};
}
const wss=new WebSocketServer({noServer:true});
function broadcast() {const data=JSON.stringify(publicState());for(const ws of wss.clients)if(ws.readyState===1){if(ws.bufferedAmount>1000000)ws.terminate();else ws.send(data);}}
function save() {writeFileSync(settingsFile,JSON.stringify(settings,null,2)+'\n',{mode:0o600});}
function changeMode(next){if(mode!==next){assistant.clear();recentJoins=[];questionTrail=[];trailIndex=-1;roundControlGeneration++;supporters.clear();likes.clear();guests.clear();quiz.lastWinningRound=null;quiz.pause();quiz.leaderboard.clear();quiz.answers.clear();quiz.lastAnswer=null;recent=[];}mode=next;}
function safeError(error) {
  if(/offline/i.test(error?.constructor?.name||error?.name||''))return 'حساب اکنون لایو ندارد.';
  if(/Room ID/.test(error?.message||''))return 'شناسهٔ لایو دریافت نشد؛ حساب ممکن است آفلاین یا دسترسی محدود باشد.';
  if(/rate|sign|premium/i.test(error?.name||''))return 'محدودیت سرویس واسط؛ هیچ سرویس پولی فعال نشد.';
  return 'اتصال ناموفق بود؛ وضعیت لایو، شبکه یا سرویس واسط را بررسی کنید.';
}
async function disconnect({manual=true}={}) {
  roundControlGeneration++;
  if(manual){connectGeneration++;reconnect.disable();resumeOnReconnect=false;settings.autoReconnect=false;save();}
  const old=connection;connection=null;connecting=false;
  autoplay=false;quiz.pause();assistant.clear();live={status:'disconnected',message:'اتصال قطع است؛ دریافت پاسخ غیرفعال است.',catalog:[]};broadcast();
  if(old)await Promise.race([old.disconnect().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,1500))]);
}
async function connect(username,startOnConnect=false,automatic=false) {
  if(connecting||connection)throw Error('ابتدا اتصال قبلی را قطع کنید.');
  if(!/^@?[A-Za-z0-9_.]{1,30}$/.test(username))throw Error('نام کاربری معتبر نیست.');
  const account=username.replace(/^@/,'');
  if(!automatic){settings.autoReconnect=true;reconnect.enable();resumeOnReconnect=startOnConnect;}
  const generation=++connectGeneration;
  if(settings.username!==account){supporters.clear();likes.clear();guests.clear();quiz.lastWinningRound=null;traffic=freshTraffic();giftDisplayEvents=[];reconnect.room=null;}
  settings.username=account;for(const g of Object.values(settings.gifts))if(g.source==='owner-preset')g.bound_username=settings.username;save();connecting=true;autoplay=false;quiz.pause();
  live={status:'connecting',message:'در حال اتصال ناشناس به لایو…',catalog:[]};broadcast();
  const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
  const agent=proxy?{http:new HttpProxyAgent({proxy}),https:new HttpsProxyAgent({proxy})}:null;
  const client=new TikTokLiveConnection(settings.username,{authenticateWs:false,processInitialData:false,enableExtendedGiftInfo:false,
    webClientOptions:{timeout:{request:10000},retry:{limit:0},...(agent?{agent}:{})},wsClientOptions:{handshakeTimeout:10000,...(agent?{agent:agent.https}:{})}});
  connection=client;
  client.on(ControlEvent.ERROR,()=>{});
  client.on(ControlEvent.DISCONNECTED,()=>{if(connection===client){resumeOnReconnect=autoplay||resumeOnReconnect;connection=null;connecting=false;autoplay=false;quiz.pause();assistant.clear();reconnect.failed();live={status:'disconnected',message:reconnect.enabled?'اتصال لایو قطع شد؛ تلاش مجدد خودکار فعال است.':'اتصال لایو قطع شد؛ از پنل دوباره وصل کنید.',catalog:[]};broadcast();}});
  client.on(WebcastEvent.STREAM_END,()=>{if(connection===client){reconnect.failed('offline');void disconnect({manual:false});}});
  const pendingGifts=[];
  function handleGift(data){
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
    const displayResult=supporters.gift(data,{});recordGiftDisplay(data,displayResult);assistant.noteSupport('gift',data,displayResult);
    let guestResult;
    if(live.status==='connected'){if(guests.observe(data.user))saveGuests();if(guests.observe(data.toUser))saveGuests();guestResult=guests.gift(data);}
    if(guestResult?.accepted){broadcast();return;}
    if(mode!=='live'||settings.answerInput!=='gifts'||!ready()||connection!==client){broadcast();return;}
    const result=quiz.gift(data,Object.fromEntries(Object.entries(settings.gifts).filter(([,g])=>g.verified)));
    if(result.accepted) {traffic.giftsAccepted++;traffic.lastGiftReject=null;recent.push({...quiz.lastAnswer,at:Date.now()});recent=recent.slice(-12);lastReject=null;}
    else {traffic.lastGiftReject=result.reason;if(!['unmapped_gift','streak_not_finished','duplicate_event','already_selected'].includes(result.reason))lastReject=result.reason;}
    broadcast();
  }
  client.on(WebcastEvent.GIFT,data=>{if(connection!==client)return;if(live.status==='connecting'){pendingGifts.push(data);if(pendingGifts.length>256)pendingGifts.shift();return;}handleGift(data);});
  client.on(WebcastEvent.MEMBER,data=>{if(connection!==client||live.status!=='connected')return;receiveJoin(data);broadcast();});
  client.on(WebcastEvent.LIKE,data=>{if(connection!==client||live.status!=='connected')return;traffic.likesReceived++;const result=likes.observe(data);const id=String(data.user?.id??data.user?.userId??data.userId??'');assistant.noteSupport('like',data,result,likes.users.get(id)?.likes||0);broadcast();});
  client.on(WebcastEvent.CHAT,data=>{
    if(connection!==client)return;
    traffic.commentsReceived++;if(mode==='live'&&live.status==='connected')assistant.comment(data,quiz.questions[quiz.index],quiz.phase,quiz.round?.id);
    if(/[123۱۲۳١٢٣]/.test(String(data.content??data.comment??data.text??'').trim()))traffic.answerCommentsReceived++;
    if(connection===client&&guests.observe(data.user)){saveGuests();broadcast();}
    if(connection!==client||mode!=='live'||settings.answerInput!=='comments'||!ready())return;
    const result=quiz.comment(data);
    if(result.accepted){traffic.commentsAccepted++;traffic.lastCommentReject=null;recent.push({...quiz.lastAnswer,at:Date.now()});recent=recent.slice(-12);lastReject=null;}
    else if(result.reason!=='irrelevant_comment'){traffic.lastCommentReject=result.reason;if(!['duplicate_event','already_selected'].includes(result.reason))lastReject=result.reason;}
    if(result.reason!=='irrelevant_comment')broadcast();
  });
  let timeout;
  try {
    const connectedState=await Promise.race([client.connect(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Connect timeout')),45000);})]);
    if(connection!==client)throw Error('Connection changed');
    if(reconnect.connected(connectedState?.roomId)){supporters.clear();likes.clear();guests.clear();assistant.clear();traffic=freshTraffic();giftDisplayEvents=[];quiz.lastWinningRound=null;}
    changeMode('live');
    const catalog=catalogFrom(client.availableGifts);
    live={status:'connected',message:'متصل؛ هدایا از رویدادهای همین لایو شناخته می‌شوند. می‌توانید نام و شناسهٔ هدایا را هم دستی ثبت کنید.',catalog};
    for(const event of pendingGifts.splice(0))handleGift(event);
    for(const k of [...LETTERS,'ALL']){
      const current=catalog.find(g=>g.id===settings.gifts[k].id);
      const manual=configuredGift(settings.gifts[k],settings.username);
      settings.gifts[k]=current?observeGift(settings.gifts[k],current):{...settings.gifts[k],verified:Boolean(manual)};
    }
    save();
    if((startOnConnect||resumeOnReconnect)&&ready())try{await startRound();autoplay=true;}catch(error){autoplay=false;sessionError=error.message;}
  } catch(error) {
    pendingGifts.length=0;
    if(generation!==connectGeneration){await Promise.race([client.disconnect().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,1500))]);return;}
    if(connection===client){connection=null;await Promise.race([client.disconnect().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,1500))]);}
    const diagnostics=liveDiagnostics(error);reconnect.failed(diagnostics[0]?.reason);
    live={status:'error',message:safeError(error),catalog:[],diagnostics};
  } finally {clearTimeout(timeout);if(generation===connectGeneration){connecting=false;broadcast();}}

}
async function startRound({generation=roundControlGeneration}={}) {
 if(['open','watching'].includes(quiz.phase))return;
 if(mode==='live'&&!ready())throw Error('ابتدا لایو را وصل کنید و روش پاسخ را تنظیم کنید.');
 await flushSession();checkRoundGeneration(generation);let id=sessions().ensure();
 while(!sessions().reviewId&&sessions().session.done.includes(id)){if(!await nextRound({generation}))throw Error('جلسه تمام شده است؛ جلسهٔ جدید را شروع کنید.');id=sessions().current();}
 if(quiz.questions[quiz.index].id!==id)quiz.select(id);
 persistSession();await flushSession();checkRoundGeneration(generation);sessionError=null;quiz.start({narrationMs:settings.narrationEnabled?narrationDuration(narrationInfo,quiz.questions[quiz.index].id,settings.narrationLanguage):0});rememberQuestion(id);advanceAt=null;broadcast();
}
async function revisitQuestion(id,generation){
 recordCompleted();await flushSession();checkRoundGeneration(generation);quiz.pause();sessions().review(id,{explicitRepeat:true});quiz.select(id);await startRound({generation});if(sessions().session?.ids[sessions().session.cursor]===id)sessions().reviewId=null;
}
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
narrationInfo=narrationMetadata(root,quiz.questions);
const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.woff2':'font/woff2','.png':'image/png'};
const assets=new Map([['/','screen.html'],['/demo','sales.html'],['/rights','rights.html'],['/sales.css','sales.css'],['/sales.js','sales.js'],['/sales-preview.js','sales-preview.js'],['/media-viewer.js','media-viewer.js'],['/operator-controls.js','operator-controls.js'],['/screen','screen.html'],['/control','control.html'],['/style.css','style.css'],['/screen.js','screen.js'],['/celebration.js','celebration.js'],['/activity-ui.js','activity-ui.js'],['/rings.js','rings.js'],['/frames/fire.png','frames/fire.png'],['/frames/gold.png','frames/gold.png'],['/frames/ice.png','frames/ice.png'],['/narration.js','narration.js'],['/guests-ui.js','guests-ui.js'],['/control.js','control.js'],['/font.woff2','font.woff2']]);
function json(res,status,data) {res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws:; img-src 'self' data: https://*.tiktokcdn.com https://*.tiktokcdn-us.com https://*.tiktokcdn-eu.com https://*.byteimg.com https://*.ibyteimg.com https://*.ibytedtos.com; font-src 'self'; frame-ancestors 'self'");
  if(!hosting.allowedHosts.has(req.headers.host)||!originAllowed(req))return json(res,403,{error:'Host or origin is not allowed'});
  const url=new URL(req.url,base);
  try {
    if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,version:'fahrfit-online-v1',build:process.env.QUIZ_BUILD_SHA||'local',mode,questions:quiz.questions.length,german_voice:narrationInfo?.voice||null,persian_voice:narrationInfo?.persian_voice||null,persian_recordings:quiz.questions.filter(q=>existsSync(join(root,'public/narration/fa',q.id+'.wav'))).length,german_recordings:quiz.questions.filter(q=>existsSync(join(root,'public','narration',q.id+'.wav'))).length,verified_images:[...bankMedia.keys()].filter(p=>p.endsWith('.png')).length,verified_videos:[...bankMedia.keys()].filter(p=>p.endsWith('.mp4')).length});
    if(req.method==='GET'&&url.pathname==='/api/demo'){
      const selected=[quiz.questions[0],...quiz.questions.filter(q=>q.video),...quiz.questions.filter(q=>q.id.startsWith('1.3.01')).slice(0,2),...quiz.questions.filter(q=>q.id.startsWith('1.4.40')).slice(0,1)];
      return json(res,200,{label:'Isolated sales demonstration; all participants and gifts are simulated',questions:selected});
    }
    if(req.method==='GET'&&url.pathname==='/api/state')return json(res,200,publicState());
    if(url.pathname.startsWith('/api/admin/')) {
      if(!authenticated(req))return json(res,401,{error:'رمز پنل کنترل معتبر نیست.'});
      if(req.method==='GET'&&url.pathname==='/api/admin/assistant')return json(res,200,{settings:settings.assistant,...assistant.status(),note:teachingNote(quiz.questions[quiz.index]),source:quiz.questions[quiz.index].source});
      if(req.method==='GET'&&url.pathname==='/api/admin/questions')return json(res,200,{session:sessions().summary(),questions:quiz.questions.map(q=>({id:q.id,topic:q.topic,video:Boolean(q.video),completed:Boolean(sessions().completed[q.id]),planned:sessions().session?.ids.includes(q.id)||false}))});
      if(req.method==='GET'&&url.pathname==='/api/admin/gift-events')return json(res,200,{events:giftDisplayEvents,traffic});
      if(req.method==='GET'&&url.pathname==='/api/admin/catalog')return json(res,200,{gifts:live.catalog});
      if(req.method!=='POST')return json(res,405,{error:'POST required'});
      const data=await body(req);const action=url.pathname.split('/').at(-1);
      if(action==='assistant-settings'){
        if(!sessionStore.ready)throw Error('ابتدا ذخیره‌سازی را بازیابی کنید.');if(!validAssistantSettings(data))throw Error('تنظیم دستیار معتبر نیست.');settings.assistant=Object.fromEntries(Object.keys(ASSISTANT_DEFAULTS).map(key=>[key,data[key]]));if(!data.enabled)assistant.clear();await persistDisplay();
      }
      else if(action==='assistant-say'){
        if(typeof data.text!=='string'||!data.text.trim()||data.text.length>600)throw Error('متن فارسی را تا 600 نویسه وارد کنید.');const result=assistant.enqueue({text:data.text,title:'متن مدرس',kind:'owner',priority:0});if(!result.accepted)throw Error('متن وارد صف نشد: '+result.reason);
      }
      else if(action==='assistant-ask'){
        if(typeof data.text!=='string'||data.text.length>240)throw Error('پرسش کوتاه فارسی وارد کنید.');const response=answerComment(data.text,quiz.questions[quiz.index],{revealed:quiz.phase==='revealed'});if(!response)throw Error('پرسش را دربارهٔ سوال جاری یا یک اصطلاح رانندگی بنویسید.');const result=assistant.enqueue({text:response.text,title:'پاسخ دستیار به مدرس',kind:'reply',priority:0,roundId:response.questionBound?quiz.round?.id:null,requiresReveal:quiz.phase==='revealed'&&response.questionBound===true});if(!result.accepted)throw Error('صف دستیار در دسترس نیست.');
      }
      else if(action==='assistant-hint'||action==='assistant-explain'){
        if(action==='assistant-explain'&&quiz.phase!=='revealed')throw Error('ابتدا پاسخ سوال را نمایش دهید.');const result=assistant.explain(quiz.questions[quiz.index],quiz.round?.id,{revealed:action==='assistant-explain',owner:true});if(!result.accepted)throw Error('صف دستیار در دسترس نیست.');
      }
      else if(action==='assistant-stop'){assistant.clear();liveVoice.close();}
      else if(action==='assistant-test-comment'){
        if(mode!=='demo')throw Error('فقط در حالت آزمایشی');const result=assistant.comment({content:String(data.text||'چرا این گزینه درست است؟'),user:{nickname:'بینندهٔ آزمایشی'},common:{msgId:randomUUID()}},quiz.questions[quiz.index],quiz.phase,quiz.round?.id);if(!result.accepted)throw Error('کامنت آزمایشی وارد صف نشد: '+result.reason);
      }
      else if(action==='assistant-test-support'){
        if(mode!=='demo')throw Error('فقط در حالت آزمایشی');assistant.noteSupport('gift',{user:{id:'assistant-demo-support',nickname:'حامی آزمایشی'}},{accepted:true,pending:false});assistant.noteSupport('like',{user:{id:'assistant-demo-support',nickname:'حامی آزمایشی'}},{accepted:true},1000);
      }
      else if(action==='guest-add'){guests.add(data.username,data.userId);saveGuests();}
      else if(action==='guest-remove'){guests.remove(String(data.key));saveGuests();}
      else if(action==='simulate-guest-gift'){
        if(mode!=='demo')throw Error('فقط در حالت آزمایشی مجاز است.');
        const guest=guests.guests.find(g=>g.key===data.key);if(!guest?.userId)throw Error('شناسهٔ عددی مهمان برای آزمایش لازم است.');
        const result=guests.gift({receiverUserId:guest.userId,giftId:'demo-guest-gift',giftName:'Testgeschenk',diamondCount:500,repeatCount:1,user:{id:'demo-donor',nickname:'حامی آزمایشی'},common:{msgId:randomUUID(),createTime:Date.now()}});if(!result.accepted)throw Error(result.reason);
      }
      else if(action==='session-settings'){sessions().configure(Number(data.size),data.allowRepeat,data.section||"all");persistSession();await flushSession();}
      else if(action==='retry-session-save'){if(!sessionStore.ready)throw Error('پیشرفت خوانده نشده است؛ سرور را دوباره راه‌اندازی کنید.');await sessionStore.retry(progressData());sessionError=null;}
      else if(action==='repeat-session'||action==='new-session'){
        if(['open','watching'].includes(quiz.phase))throw Error('ابتدا توقف را بزنید.');
        await flushSession();const id=action==='repeat-session'?sessions().repeat():sessions().create();roundControlGeneration++;questionTrail=[];trailIndex=-1;quiz.select(id);autoplay=false;advanceAt=null;persistSession();await flushSession();sessionError=null;
      }
      else if(action==='start'){const generation=++roundControlGeneration;await startRound({generation});}
      else if(action==='reveal'){if(quiz.phase==='watching')throw Error('ابتدا نمایش فیلم تمام شود یا سؤال را متوقف کنید.');roundControlGeneration++;quiz.reveal({manual:true});recordCompleted();advanceAt=Date.now()+settings.waitSeconds*1000;}
      else if(action==='select'){
        sessions().review(String(data.id));const generation=++roundControlGeneration;autoplay=false;resumeOnReconnect=false;quiz.pause();quiz.select(String(data.id));advanceAt=null;await startRound({generation});
      }
      else if(action==='previous'){
        if(trailIndex<=0)throw Error('هنوز سؤال قبلی در این نشست نمایش داده نشده است.');const generation=++roundControlGeneration;autoplay=false;resumeOnReconnect=false;const nextIndex=trailIndex-1;const id=questionTrail[nextIndex];trailIndex=nextIndex;await revisitQuestion(id,generation);
      }
      else if(action==='repeat'){
        const generation=++roundControlGeneration;autoplay=false;resumeOnReconnect=false;await revisitQuestion(quiz.questions[quiz.index].id,generation);
      }
      else if(action==='next'){
        const generation=++roundControlGeneration;autoplay=false;resumeOnReconnect=false;
        if(quiz.phase==='open')quiz.reveal({manual:true});else if(quiz.phase==='watching')quiz.pause();
        if(trailIndex+1<questionTrail.length){const id=questionTrail[++trailIndex];await revisitQuestion(id,generation);}
        else if(await nextRound({generation}))await startRound({generation});
      }
      else if(action==='pause'){roundControlGeneration++;resumeOnReconnect=false;autoplay=false;quiz.pause();}
      else if(action==='autoplay'){const generation=++roundControlGeneration;resumeOnReconnect=Boolean(data.enabled);autoplay=Boolean(data.enabled);if(autoplay&&!['open','watching'].includes(quiz.phase)){if(quiz.phase==='revealed'&&!await nextRound())throw Error('جلسه تمام شده است؛ جلسهٔ جدید را شروع کنید.');await startRound();}}
      else if(action==='mode'){
        if(!['demo','live'].includes(data.mode))throw Error('حالت معتبر نیست.');
        if(['open','watching'].includes(quiz.phase))throw Error('پیش از تغییر حالت، سؤال را متوقف کنید.');
        if(data.mode==='live'&&!ready())throw Error('اتصال لایو و آماده‌بودن روش پاسخ لازم است.');
        if(data.mode==='demo')await disconnect();changeMode(data.mode);resumeOnReconnect=false;autoplay=false;quiz.pause();
      }
      else if(action==='display-language'){
        if(typeof data.showPersian!=='boolean')throw Error('تنظیم ترجمه معتبر نیست.');settings.showPersian=data.showPersian;save();
      }
      else if(action==='gift-style'){
        if(!sessionStore.ready)throw Error('تنظیم ذخیره‌شده قابل خواندن نیست؛ ابتدا اتصال ذخیره‌سازی را بازیابی کنید.');
        if(!validGiftStyle(data))throw Error('مقادیر سطح گیفت باید عدد صحیح مثبت و به ترتیب افزایشی باشند.');settings.giftStyle={basis:data.basis,levels:{...data.levels}};await persistDisplay();
      }
      else if(action==='activity-display'){
        if(!sessionStore.ready)throw Error('تنظیم ذخیره‌شده قابل خواندن نیست؛ ابتدا اتصال ذخیره‌سازی را بازیابی کنید.');
        const {side,count,top}=data;
        if(!['left','right'].includes(side)||!Number.isInteger(count)||count<1||count>10||!Number.isInteger(top)||top<80||top>1200)throw Error('تنظیم ستون معتبر نیست: تعداد 1 تا 10 و ارتفاع 80 تا 1200.');
        settings.activityDisplay={side,count,top};await persistDisplay();
      }
      else if(action==='join-display'){
        if(!sessionStore.ready)throw Error('ابتدا ذخیره‌سازی را بازیابی کنید.');
        if(!validJoinDisplay(data))throw Error('تنظیم حباب معتبر نیست.');settings.joinDisplay={enabled:data.enabled,side:data.side,size:data.size,bottom:data.bottom};await persistDisplay();
      }
      else if(action==='narration-language'){
        if(!sessionStore.ready)throw Error('ابتدا ذخیره‌سازی را بازیابی کنید.');
        if(!['de','fa','both'].includes(data.language))throw Error('زبان نامعتبر است.');
        if(['open','watching'].includes(quiz.phase))throw Error('ابتدا سؤال را متوقف کنید.');settings.narrationLanguage=data.language;await persistDisplay();
      }
      else if(action==='welcome-settings'){
        if(!sessionStore.ready)throw Error('ابتدا ذخیره‌سازی را بازیابی کنید.');
        if(typeof data.enabled!=='boolean')throw Error('تنظیم نامعتبر است.');settings.welcomeEnabled=data.enabled;await persistDisplay();
      }
      else if(action==='simulate-welcome'){
        if(mode!=='demo')throw Error('فقط در حالت آزمایشی');if(['open','watching'].includes(quiz.phase))throw Error('ابتدا سؤال را متوقف کنید.');welcomeCycle.demo(welcomeDuration());
      }
      else if(action==='narration'){
        if(typeof data.enabled!=='boolean')throw Error('تنظیم خواندن سؤال معتبر نیست.');settings.narrationEnabled=data.enabled;save();
      }
      else if(action==='narration-repeat'){narrationReplay++;}
      else if(action==='timer-sound'){
        if(typeof data.enabled!=='boolean')throw Error('تنظیم صدای زمان معتبر نیست.');settings.timerSound=data.enabled;save();
      }
      else if(action==='celebration-audio'){
        const volume=Number(data.volume);if(typeof data.enabled!=='boolean'||!Number.isInteger(volume)||volume<0||volume>100)throw Error('تنظیم صدا معتبر نیست.');
        settings.celebrationMusic=data.enabled;settings.musicVolume=volume;save();
      }
      else if(action==='wait-time'){
        if(!sessionStore.ready)throw Error('ابتدا اتصال ذخیره‌سازی را بازیابی کنید.');
        if(!Number.isInteger(data.seconds)||data.seconds<0||data.seconds>300)throw Error('زمان انتظار باید بین 0 و 300 ثانیه باشد.');settings.waitSeconds=data.seconds;if(quiz.phase==='revealed')advanceAt=Date.now()+data.seconds*1000;await persistDisplay();
      }
      else if(action==='profile-frames'){
        if(!sessionStore.ready)throw Error('ابتدا اتصال ذخیره‌سازی را بازیابی کنید.');
        if(!['auto','none','simple','glow','silver','gold','ice','fire'].includes(data.liker)||!['auto','none','simple','glow','silver','gold','ice','fire'].includes(data.gifter))throw Error('قاب نامعتبر است.');settings.profileFrames={liker:data.liker,gifter:data.gifter};await persistDisplay();
      }
      else if(action==='simulate-join'){if(mode!=='demo')throw Error('فقط در حالت آزمایشی');receiveJoin({user:{nickname:'Demo · Neuer Besucher'}});}
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
      else if(action==='simulate-like'){
        if(mode!=='demo')throw Error('فقط در حالت آزمایشی مجاز است.');
        const result=likes.observe({count:Number(data.count),user:{id:String(data.name||'demo-liker'),nickname:String(data.name||'Test Likes'),uniqueId:data.username,profilePictureUrl:data.avatar},common:{msgId:randomUUID(),createTime:Date.now()}});
        if(!result.accepted)throw Error('لایک آزمایشی معتبر نیست.');
      }
      else if(action==='simulate-supporter'){
        if(mode!=='demo')throw Error('آزمایش حلقه فقط در حالت آزمایشی مجاز است.');
        const result=supporters.gift({giftId:'demo-outside-gifts',giftName:'Testgeschenk',diamondCount:Number(data.coins),repeatCount:Number.isSafeInteger(data.count)&&data.count>0?data.count:1,gift:{type:data.combo===true?1:0},repeatEnd:data.final===true?1:0,groupId:typeof data.groupId==='string'?data.groupId.slice(0,60):undefined,user:{id:String(data.name||'demo-supporter'),nickname:String(data.name||'حامی آزمایشی'),uniqueId:data.username,profilePictureUrl:data.avatar},common:{msgId:randomUUID(),createTime:Date.now()}},settings.gifts);
        if(!result.accepted)throw Error('ثبت آزمایشی انجام نشد.');
      }
      else if(action==='clear-supporters'){if(mode!=='demo')throw Error('پاک‌کردن آزمایش فقط در حالت آزمایشی است.');supporters.clear();likes.clear();}
      else if(action==='simulate'){
        if(mode!=='demo')throw Error('شبیه‌سازی در حالت واقعی ممنوع است.');
        const choice=String(data.choice);const userId=String(data.name||'بینندهٔ آزمایشی').slice(0,40);
        const result=quiz.submit({id:'demo-'+randomUUID(),userId,name:userId,avatar:data.avatar,choice,time:Date.now(),roundId:quiz.round?.id});
        if(!result.accepted)throw Error('پاسخ ثبت نشد: '+result.reason);
        recent.push({...quiz.lastAnswer,at:Date.now()});recent=recent.slice(-12);
      }
      else if(action==='auto-reconnect'){
        if(typeof data.enabled!=='boolean')throw Error('تنظیم اتصال معتبر نیست.');
        settings.autoReconnect=data.enabled;if(data.enabled)reconnect.enable();else reconnect.disable();save();
      }
      else if(action==='connect')await connect(String(data.username||settings.username),data.startOnConnect===true);
      else if(action==='disconnect')await disconnect();
      else return json(res,404,{error:'Unknown command'});
      broadcast();return json(res,200,{ok:true,state:publicState()});
    }
    const assistantAudio=url.pathname.match(/^\/assistant\/audio\/([a-f0-9-]{36})\.wav$/);
    if(['GET','HEAD'].includes(req.method)&&assistantAudio){const audio=assistant.getAudio(assistantAudio[1]);if(!audio)return json(res,404,{error:'Speech expired'});return serveMedia(req,res,audio,'audio/wav');}
    if(['GET','HEAD'].includes(req.method)&&url.pathname.startsWith('/narration/')){
      if(['/narration/welcome-fa.wav','/narration/welcome-de.wav'].includes(url.pathname)){const file=join(root,'public',url.pathname);if(!existsSync(file))return json(res,503,{error:'Welcome audio is not prepared'});return serveMedia(req,res,readFileSync(file),'audio/wav');}
      const language=url.pathname.startsWith('/narration/fa/')?'fa':'de',prefix=language==='fa'?'/narration/fa/':'/narration/';
      const id=url.pathname.slice(prefix.length).replace(/\.wav$/,'');
      if(!quiz.questions.some(q=>q.id===id)||url.pathname!==`${prefix}${id}.wav`)return json(res,404,{error:'Unknown question audio'});
      const path=join(root,'public','narration',...(language==='fa'?['fa']:[]),id+'.wav');
      if(!existsSync(path))return json(res,503,{error:'Question audio is not prepared'});
      return serveMedia(req,res,readFileSync(path),'audio/wav');
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
const tick=setInterval(async()=>{
  if(reconnect.due({connecting,connected:Boolean(connection)}))void connect(settings.username,false,true).catch(()=>{reconnect.failed();});
  quiz.tick();recordCompleted();if(quiz.phase==='revealed'&&advanceAt===null)advanceAt=Date.now()+settings.waitSeconds*1000;
  const announcement=(mode==='demo'&&welcomeCycle.announcement?.demo&&Date.now()<welcomeCycle.announcement.expiresAt)?null:welcomeCycle.tick({connected:mode==='live'&&live.status==='connected',enabled:settings.welcomeEnabled,phase:(assistant.active&&Date.now()<assistant.active.expiresAt)||(settings.celebrationMusic&&quiz.lastWinningRound&&quiz.lastWinningRound.roundId===quiz.round?.id&&Date.now()-quiz.lastWinningRound.at<10000)?'open':quiz.phase,durationMs:welcomeDuration()});
  if(announcement&&quiz.phase==='revealed')advanceAt=Math.max(advanceAt||0,announcement.expiresAt);
  const welcomeBusy=welcomeCycle.announcement&&Date.now()<welcomeCycle.announcement.expiresAt;
  const musicBusy=settings.celebrationMusic&&quiz.lastWinningRound&&quiz.lastWinningRound.roundId===quiz.round?.id&&Date.now()-quiz.lastWinningRound.at<10000;
  const spoken=assistant.tick({roundId:quiz.round?.id,phase:quiz.phase,canSpeak:!['open','watching'].includes(quiz.phase)&&!welcomeBusy&&!musicBusy&&(mode==='demo'||live.status==='connected')});
  if(spoken&&quiz.phase==='revealed')advanceAt=Math.max(advanceAt||0,spoken.expiresAt);
  if(autoplay&&!advancing&&quiz.phase==='revealed'&&Date.now()>=advanceAt){advancing=true;try{if(await nextRound())await startRound();}catch(error){autoplay=false;sessionError=error.message;}finally{advancing=false;}}
  broadcast();
},500);
server.listen(port,hosting.bind,()=>{
  writeFileSync(process.env.QUIZ_RUNTIME_PATH||join(root,'.runtime.json'),JSON.stringify({base,token,screen:base+'/screen',control:base+'/control#'+token,pid:process.pid},null,2),{mode:0o600});
  console.log(hosting.publicOrigin?`Screen: ${base}/screen\nPrivate control link is delivered separately to the owner.\nDemo mode; paid signing is disabled.`:`Screen: ${base}/screen\nControl: ${base}/control#${token}\nDemo mode; no live connection or paid service has been enabled.`);
});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{clearInterval(tick);liveVoice.close();reconnect.disable();await disconnect({manual:false});wss.close();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),2000).unref();});
