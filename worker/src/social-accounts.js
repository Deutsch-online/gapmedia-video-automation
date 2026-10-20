// Read-only account connections. No passwords, cookies, posting or paid APIs.
export const ACCOUNTS = {
  tiktok:{handle:'easydeutsches',url:'https://www.tiktok.com/@easydeutsches'},
  instagram:{handle:'easydeutsches',url:'https://www.instagram.com/easydeutsches/'},
};
const ORIGIN = 'https://afghanfollowers-telegram.afghan-video-bot.workers.dev';
const keyFor = platform => `social-grant:${platform}`;
const b64 = bytes => btoa(String.fromCharCode(...bytes));
const unb64 = text => Uint8Array.from(atob(text),c=>c.charCodeAt(0));
export async function monitorSignature(token) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('gapmedia-monitor-v1:'+token));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
async function encryptionKey(env) {
  if(!env.TELEGRAM_BOT_TOKEN)throw new Error('کلید اتصال امن تنظیم نیست.');
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('social-grant-v1:'+env.TELEGRAM_BOT_TOKEN));
  return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);
}
export async function storeGrant(env,platform,value) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await encryptionKey(env),new TextEncoder().encode(JSON.stringify(value)));
  await env.BOT_STATE.put(keyFor(platform),JSON.stringify({iv:b64(iv),cipher:b64(new Uint8Array(cipher))}));
}
export async function readGrant(env,platform) {
  const stored=await env.BOT_STATE?.get(keyFor(platform),'json');
  if(!stored)return null;
  try {
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(stored.iv)},await encryptionKey(env),unb64(stored.cipher));
    return JSON.parse(new TextDecoder().decode(plain));
  }catch{throw new Error('اتصال ذخیره‌شده قابل بازکردن نیست؛ /connect را دوباره اجرا کنید.');}
}
export function connectionReady(env,platform) {
  if(platform==='tiktok')return Boolean(env.TIKTOK_CLIENT_KEY&&env.TIKTOK_CLIENT_SECRET);
  return Boolean(env.INSTAGRAM_APP_ID&&env.INSTAGRAM_APP_SECRET&&/^v\d+\.\d+$/.test(env.INSTAGRAM_GRAPH_VERSION||''));
}
async function api(url,init={}) {
  let response;
  try {response=await fetch(url,{...init,signal:AbortSignal.timeout(12000)});}
  catch{throw new Error('پاسخ سرویس اجتماعی به‌موقع دریافت نشد.');}
  if(!response.ok)throw new Error(`API حساب پاسخ ${response.status} داد؛ دسترسی یا سهمیه را بررسی کنید.`);
  let result;
  try{result=await response.json();}catch{throw new Error('پاسخ سرویس اجتماعی ساختار JSON معتبر نداشت.');}
  if(result.error && result.error.code!=='ok')throw new Error('سرویس اجتماعی اتصال یا مجوز را نپذیرفت؛ اتصال رسمی را دوباره بررسی کنید.');
  return result;
}
const form = params => ({method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params).toString()});
const callback = platform => ORIGIN+'/social/callback/'+platform;

export async function createConnection(env,chatId,platform) {
  if(!Object.hasOwn(ACCOUNTS,platform))return 'نمونه: /connect tiktok یا /connect instagram';
  if(!connectionReady(env,platform))return platform==='tiktok'
    ? 'برای اتصال رسمی، برنامهٔ TikTok باید با TIKTOK_CLIENT_KEY و TIKTOK_CLIENT_SECRET در Secretهای Worker تنظیم شود و مجوزهای user.info.basic، user.info.profile و video.list داشته باشد. ایمیل یا رمز نفرستید.'
    : 'برای اتصال رسمی، حساب Creator/Business و برنامهٔ Instagram با INSTAGRAM_APP_ID، INSTAGRAM_APP_SECRET و نسخهٔ INSTAGRAM_GRAPH_VERSION در Worker لازم است. ایمیل یا رمز نفرستید.';
  const ticket=crypto.randomUUID();
  await env.BOT_STATE.put('social-ticket:'+ticket,JSON.stringify({chatId,platform}),{expirationTtl:600});
  return 'اتصال فقط‌خواندنی را در صفحهٔ رسمی تأیید کنید (لینک ده دقیقه معتبر است):\n'+ORIGIN+'/social/connect?ticket='+ticket;
}
export async function socialAuth(request,env) {
  const url=new URL(request.url);
  if(url.pathname==='/social/connect'){
    const ticket=url.searchParams.get('ticket')||'';
    if(!/^[a-f0-9-]{36}$/.test(ticket))return new Response('Invalid connection link.',{status:400});
    const entry=await env.BOT_STATE?.get('social-ticket:'+ticket,'json');
    if(!entry)return new Response('Connection link expired. Request /connect again.',{status:400});
    await env.BOT_STATE.delete('social-ticket:'+ticket);
    const state=crypto.randomUUID(), verifier=crypto.randomUUID();
    await env.BOT_STATE.put('social-oauth:'+state,JSON.stringify({...entry,verifier}),{expirationTtl:600});
    const target=new URL(entry.platform==='tiktok'?'https://www.tiktok.com/v2/auth/authorize/':'https://www.instagram.com/oauth/authorize');
    const params=entry.platform==='tiktok'
      ? {client_key:env.TIKTOK_CLIENT_KEY,scope:'user.info.basic,user.info.profile,video.list',response_type:'code',redirect_uri:callback('tiktok'),state}
      : {client_id:env.INSTAGRAM_APP_ID,scope:'instagram_business_basic,instagram_business_manage_insights',response_type:'code',redirect_uri:callback('instagram'),state};
    Object.entries(params).forEach(([key,value])=>target.searchParams.set(key,value));
    return new Response(null,{status:302,headers:{location:target.toString(),'set-cookie':`social_oauth=${verifier}; HttpOnly; Secure; SameSite=Lax; Path=/social; Max-Age=600`,'cache-control':'no-store','referrer-policy':'no-referrer'}});
  }
  const match=url.pathname.match(/^\/social\/callback\/(tiktok|instagram)$/);
  if(!match)return null;
  const state=url.searchParams.get('state')||'';
  if(!/^[a-f0-9-]{36}$/.test(state))return new Response('Invalid authorization session.',{status:400});
  const entry=await env.BOT_STATE?.get('social-oauth:'+state,'json');
  const cookie=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('social_oauth='))?.slice(13);
  if(!entry||entry.platform!==match[1]||cookie!==entry.verifier)return new Response('Invalid or expired authorization session.',{status:400});
  await env.BOT_STATE.delete('social-oauth:'+state);
  try{
    if(url.searchParams.has('error')||!url.searchParams.get('code'))throw new Error('اتصال تأیید نشد.');
    const platform=entry.platform;
    const tokens=platform==='tiktok'
      ? await api('https://open.tiktokapis.com/v2/oauth/token/',form({client_key:env.TIKTOK_CLIENT_KEY,client_secret:env.TIKTOK_CLIENT_SECRET,code:url.searchParams.get('code'),grant_type:'authorization_code',redirect_uri:callback(platform)}))
      : await api('https://api.instagram.com/oauth/access_token',form({client_id:env.INSTAGRAM_APP_ID,client_secret:env.INSTAGRAM_APP_SECRET,code:url.searchParams.get('code'),grant_type:'authorization_code',redirect_uri:callback(platform)}));
    if(!tokens.access_token)throw new Error('توکن اتصال دریافت نشد.');
    const grant={access_token:tokens.access_token,refresh_token:tokens.refresh_token||null,expires_at:Date.now()+Number(tokens.expires_in||3600)*1000};
    const identity=await accountIdentity(env,platform,grant);
    if(platform==='instagram'){
      const exchange=new URL('https://graph.instagram.com/access_token');
      exchange.searchParams.set('grant_type','ig_exchange_token');
      exchange.searchParams.set('client_secret',env.INSTAGRAM_APP_SECRET);
      exchange.searchParams.set('access_token',grant.access_token);
      const longLived=await api(exchange.toString());
      if(!longLived.access_token)throw new Error('اتصال بلندمدت Instagram تأیید نشد.');
      grant.access_token=longLived.access_token;
      grant.expires_at=Date.now()+Number(longLived.expires_in)*1000;
    }
    grant.account_id=identity.id;
    if(!grant.account_id||!Number.isFinite(grant.expires_at))throw new Error('شناسه یا تاریخ اعتبار اتصال تأیید نشد.');
    grant.handle=ACCOUNTS[platform].handle;
    await storeGrant(env,platform,grant);
    const connectedAt=new Date().toISOString();
    await env.BOT_STATE.put('social:connection-changed',connectedAt);
    await env.BOT_STATE.put('social:review-requested',connectedAt);
    return new Response('Connected read-only to @easydeutsches. Return to Telegram and use /review.',{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','set-cookie':'social_oauth=; Secure; HttpOnly; Path=/social; Max-Age=0','referrer-policy':'no-referrer'}});
  }catch(error){return new Response(error.message,{status:400,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});}
}
async function accountIdentity(env,platform,grant) {
  const headers={authorization:'Bearer '+grant.access_token};
  if(platform==='tiktok'){
    const result=await api('https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,profile_deep_link',{headers});
    const user=result.data?.user;
    let handle=String(user?.username||'').replace(/^@/,'');
    if(!handle)try{const link=new URL(user?.profile_deep_link);if(['www.tiktok.com','tiktok.com'].includes(link.hostname))handle=link.pathname.replace(/^\/@/,'').replace(/\/$/,'');}catch{}
    if(handle.toLowerCase()!==ACCOUNTS.tiktok.handle)throw new Error('این اتصال به حساب easydeutsches تعلق ندارد؛ حساب درست را انتخاب کنید.');
    return {id:user.open_id};
  }
  const result=await api(`https://graph.instagram.com/${env.INSTAGRAM_GRAPH_VERSION}/me?fields=user_id,username`,{headers});
  if(String(result.username||'').toLowerCase()!==ACCOUNTS.instagram.handle)throw new Error('این اتصال به حساب easydeutsches تعلق ندارد؛ حساب درست را انتخاب کنید.');
  return {id:result.user_id||result.id};
}
async function validGrant(env,platform) {
  const grant=await readGrant(env,platform);
  if(!grant)return null;
  if(platform==='instagram'&&grant.expires_at>Date.now()&&grant.expires_at<Date.now()+7*86400000){
    const refresh=new URL('https://graph.instagram.com/refresh_access_token');
    refresh.searchParams.set('grant_type','ig_refresh_token');
    refresh.searchParams.set('access_token',grant.access_token);
    const result=await api(refresh.toString());
    if(!result.access_token)throw new Error('تازه‌سازی دسترسی Instagram ناموفق بود.');
    const updated={...grant,access_token:result.access_token,expires_at:Date.now()+Number(result.expires_in)*1000};
    await storeGrant(env,platform,updated);return updated;
  }
  if(grant.expires_at>Date.now()+60000)return grant;
  if(platform==='tiktok'&&grant.refresh_token&&connectionReady(env,platform)){
    const result=await api('https://open.tiktokapis.com/v2/oauth/token/',form({client_key:env.TIKTOK_CLIENT_KEY,client_secret:env.TIKTOK_CLIENT_SECRET,grant_type:'refresh_token',refresh_token:grant.refresh_token}));
    if(!result.access_token)throw new Error('تازه‌سازی دسترسی TikTok ناموفق بود.');
    const updated={...grant,access_token:result.access_token,refresh_token:result.refresh_token||grant.refresh_token,expires_at:Date.now()+Number(result.expires_in)*1000};
    await storeGrant(env,platform,updated);return updated;
  }
  throw new Error('مجوز حساب منقضی شده است؛ /connect را دوباره اجرا کنید.');
}
const number = value => typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
export async function accountVideos(env,platform) {
  const grant=await validGrant(env,platform);
  if(!grant)return {status:'needs_connection',videos:[],reason:'آمار خصوصی وصل نیست؛ /connect '+platform};
  await accountIdentity(env,platform,grant);
  const headers={authorization:'Bearer '+grant.access_token};
  const now=new Date().toISOString();
  if(platform==='tiktok'){
    const fields='id,title,create_time,share_url,duration,view_count,like_count,comment_count,share_count';
    const result=await api('https://open.tiktokapis.com/v2/video/list/?fields='+fields,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({max_count:20})});
    if(!Array.isArray(result.data?.videos))throw new Error('فهرست ویدیوهای TikTok در پاسخ وجود نداشت.');
    return {status:'connected',videos:result.data.videos.map(v=>({platform,id:String(v.id),url:v.share_url,title:v.title,published_at:new Date(v.create_time*1000).toISOString(),observed_at:now,duration_seconds:number(v.duration),views:number(v.view_count),likes:number(v.like_count),comments:number(v.comment_count),shares:number(v.share_count),saves:null,source:'official-api'}))};
  }
  const root=`https://graph.instagram.com/${env.INSTAGRAM_GRAPH_VERSION}`;
  const result=await api(root+'/'+encodeURIComponent(grant.account_id)+'/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=12',{headers});
  if(!Array.isArray(result.data))throw new Error('فهرست رسانه‌های Instagram در پاسخ وجود نداشت.');
  const videos=[];
  for(const item of result.data.filter(item=>item.media_type==='VIDEO').slice(0,6)){
    const video={platform,id:String(item.id),url:item.permalink,title:String(item.caption||'').slice(0,300),published_at:item.timestamp,observed_at:now,views:null,likes:number(item.like_count),comments:number(item.comments_count),shares:null,saves:null,duration_seconds:null,source:'official-api'};
    try{
      const insights=await api(root+'/'+encodeURIComponent(item.id)+'/insights?metric=views,reach,saved,shares',{headers});
      for(const metric of insights.data||[]){
        const value=number(metric.values?.[0]?.value??metric.total_value?.value);
        if(['views','reach','shares'].includes(metric.name))video[metric.name]=value;
        if(metric.name==='saved')video.saves=value;
      }
    }catch{
      try{
        const views=await api(root+'/'+encodeURIComponent(item.id)+'/insights?metric=views',{headers});
        video.views=number(views.data?.[0]?.values?.[0]?.value??views.data?.[0]?.total_value?.value);
        video.insights_status='partial';
      }catch{video.insights_status='unavailable';}
    }
    videos.push(video);
  }
  return {status:'connected',videos};
}
