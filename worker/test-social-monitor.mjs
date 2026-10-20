import assert from 'node:assert/strict';
import {validateSample,mergeSamples,analyzeDataset,runSocialMonitor,monitorHealth,creativeFeedback,handleSocialConversation,storeRenderAudit,proposeExperiments} from './src/social-monitor.js';
import {storeGrant,readGrant,accountVideos,createConnection,socialAuth,monitorSignature} from './src/social-accounts.js';
import worker from './src/index.js';

const memory=new Map();
const BOT_STATE={
  get:async(key,type)=>type==='json'?JSON.parse(memory.get(key)||'null'):memory.get(key)||null,
  put:async(key,value)=>memory.set(key,value),delete:async key=>memory.delete(key),
};
const env={BOT_STATE,TELEGRAM_BOT_TOKEN:'test-token'};
const now=Date.now();
const sample=(id,views,extra={})=>validateSample({platform:'tiktok',id:String(id),url:'https://www.tiktok.com/@easydeutsches/video/'+id,published_at:new Date(now-24*3600000).toISOString(),observed_at:new Date(now).toISOString(),duration_seconds:60,views,likes:5,shares:1,promotion_status:'organic',...extra});
let dataset=mergeSamples(null,[sample(1,100),sample(2,200),sample(3,300)]);
const analyzed=analyzeDataset(dataset);
assert.equal(analyzed.cohorts.length,1);
assert.equal(analyzed.cohorts[0].median_views,200);
assert.equal(analyzed.cohorts[0].leader.id,'3');
assert.equal(analyzed.cohorts[0].median_watch_ratio,null,'missing watch time is not fabricated');
assert.equal(sample(4,4).comments,null,'unknown counts remain unknown rather than zero');
assert.throws(()=>sample(1,-1));
assert.throws(()=>sample(1,1,{completion_rate:15}));
assert.throws(()=>sample(1,1,{url:'https://www.tiktok.com/@someoneelse/video/1'}));
assert.equal(analyzeDataset(mergeSamples(null,[sample(1,100),sample(2,200,{promotion_status:'promoted'}),sample(3,300)])).cohorts.length,0,'promoted and organic observations cannot form one benchmark group');
dataset=mergeSamples(dataset,[sample(1,900,{observed_at:new Date(now+60000).toISOString()})]);
assert.equal(dataset.media['tiktok:1'].benchmark.views,100,'a later observation does not overwrite a closer-to-24h benchmark');
assert.equal(dataset.media['tiktok:1'].latest.views,900);

await storeGrant(env,'tiktok',{access_token:'very-private-test-token',expires_at:now+3600000,account_id:'account'});
assert.ok(!memory.get('social-grant:tiktok').includes('very-private-test-token'),'access token is encrypted in KV');
assert.equal((await readGrant(env,'tiktok')).access_token,'very-private-test-token');
memory.delete('social-grant:tiktok');
assert.match(await createConnection(env,'7','tiktok'),/TIKTOK_CLIENT_KEY/);
assert.equal((await socialAuth(new Request('https://worker.test/social/callback/tiktok?state=bad'),env)).status,400);
const oauthEnv={...env,TIKTOK_CLIENT_KEY:'app',TIKTOK_CLIENT_SECRET:'app-secret'};
const invitation=await createConnection(oauthEnv,'7','tiktok');
const connectionUrl=invitation.split('\n').at(-1);
const redirected=await socialAuth(new Request(connectionUrl),oauthEnv);
assert.equal(redirected.status,302);
const authorization=new URL(redirected.headers.get('location'));
assert.equal(authorization.origin,'https://www.tiktok.com');
const state=authorization.searchParams.get('state');
const forged=await socialAuth(new Request('https://worker.test/social/callback/tiktok?state='+state+'&code=fake'),oauthEnv);
assert.equal(forged.status,400,'a stolen state without the bound browser cookie is rejected');
assert.equal(await readGrant(env,'tiktok'),null);

const original=globalThis.fetch;
const calls=[];
globalThis.fetch=async(url,init={})=>{
  calls.push({url:String(url),init});
  if(String(url)==='https://mcp.exa.ai/mcp'){
    const body=JSON.parse(init.body);
    if(body.method==='tools/list')return Response.json({result:{tools:[{name:'web_fetch_exa',annotations:{readOnlyHint:true}},{name:'web_search_exa',annotations:{readOnlyHint:true}}]}});
    if(body.params.name==='web_fetch_exa')return Response.json({result:{isError:true,content:[]}});
    return Response.json({result:{content:[{type:'text',text:'Candidate URL: https://www.tiktok.com/@example/video/123. No verified stats.'}]}});
  }
  throw new Error('Unexpected network request');
};
const reports=[];
const report=await runSocialMonitor(env,{owner:'7',notify:async(_id,text)=>reports.push(text)});
assert.equal(report.accounts.tiktok.status,'needs_connection');
assert.equal(report.accounts.instagram.public_status,'blocked');
assert.equal(report.analysis.posts,0);
assert.equal((await monitorHealth(env)).status,'limited_access','lack of OAuth is not a stopped monitor');
assert.equal(reports.length,1);
const requestCount=calls.length;
await runSocialMonitor(env,{owner:'7',notify:async(_id,text)=>reports.push(text)});
assert.equal(calls.length,requestCount,'five-minute cron respects hourly collection limit');
assert.equal(reports.length,1,'limited access cannot spam the owner on each timer tick');
const feedback=await creativeFeedback(env);
assert.equal(feedback.evidence_level,'hypotheses_only');
assert.equal(feedback.research_candidates.verified_viral,false);
assert.ok(feedback.experiments.every(item=>!/proven_cause/.test(item.evidence)));
const previousLearning=memory.get('social:learning');
memory.delete('social:learning');
const proposal=await proposeExperiments({...env,AI:{run:async()=>({response:JSON.stringify({experiments:Array.from({length:3},()=>({hypothesis:'فرضیه‌ای که هنوز از داده اثبات نشده است',change:'یک آزمایش مشخص برای نمایش واضح مشکل و شیء بساز',measure:'مقایسهٔ نگه‌داشت در زمان و طول مشابه',evidence:'proven_cause'}))})})}},analyzed,{text:'unverified candidates'});
assert.ok(proposal.experiments.every(item=>item.evidence==='hypothesis_not_proven'),'model cannot promote suggestions to proven causes');
memory.set('social:learning',previousLearning);
await storeRenderAudit(env,{episode:7,duration_seconds:60,width:1080,height:1920,frozen_seconds:4,caption_design:'cream-large-v2'});
assert.equal((await creativeFeedback(env)).render_qc.source,'local-ffmpeg-qc');
assert.equal((await creativeFeedback(env)).experiments[1].evidence,'render_qc_not_a_causal_claim');
await assert.rejects(storeRenderAudit(env,{episode:7,duration_seconds:59,width:1080,height:1920,frozen_seconds:0}));
const imported=await handleSocialConversation(env,'7','/metrics '+JSON.stringify(sample(55,55)));
assert.match(imported,/ثبت شد/);
assert.equal(JSON.parse(memory.get('social:dataset')).media['tiktok:55'].latest.source,'owner-reported');

const unauthorized=await worker.fetch(new Request('https://worker.test/internal/creative-feedback'),env);
assert.equal(unauthorized.status,401);
const authorized=await worker.fetch(new Request('https://worker.test/internal/creative-feedback',{headers:{'X-Project-Authorization':await monitorSignature(env.TELEGRAM_BOT_TOKEN)}}),env);
assert.equal(authorized.status,200);
assert.ok(!(await authorized.text()).includes('access_token'),'feedback cannot expose connection tokens');

// A token for another account must fail before video-list access.
await storeGrant(env,'tiktok',{access_token:'private',expires_at:Date.now()+3600000});
globalThis.fetch=async(url)=>{
  assert.ok(String(url).includes('/user/info/'),'identity must be verified before videos are read');
  return Response.json({data:{user:{open_id:'other',profile_deep_link:'https://www.tiktok.com/@not-the-owner'}},error:{code:'ok'}});
};
await assert.rejects(accountVideos(env,'tiktok'),/تعلق ندارد/);
memory.delete('social-grant:tiktok');
// A grant added after the cached report must refresh inside the cooldown.
await storeGrant(env,'tiktok',{access_token:'new-private',expires_at:Date.now()+3600000});
assert.match(await handleSocialConversation(env,'7','/insights'),/گزارش قبلی/);
assert.match(await handleSocialConversation(env,'7','/review'),/درخواست بررسی ثبت شد/);
// Simulate expiry of the preceding collection's short lease.
memory.delete('social:lease');
let reads=0;
globalThis.fetch=async(url)=>{
  if(String(url).includes('/user/info/'))return Response.json({data:{user:{open_id:'owner',username:'easydeutsches'}},error:{code:'ok'}});
  if(String(url).includes('/video/list/')){reads++;return Response.json({data:{videos:[]},error:{code:'ok'}});}
  throw new Error('Unexpected network request');
};
const refreshed=await runSocialMonitor(env,{owner:'7',notify:async(_id,text)=>reports.push(text)});
assert.equal(refreshed.accounts.tiktok.status,'connected','new grant bypasses stale needs-connection cache and cooldown');
assert.equal(reads,1);
assert.equal(reports.length,2,'new connection delivers an updated report even if the previous overall status was limited');
await runSocialMonitor(env);
assert.equal(reads,1,'new connection refresh is not an unlimited polling bypass');
assert.match(await handleSocialConversation(env,'7','/insights'),/متصل به API رسمی/);
globalThis.fetch=original;
console.log('same-age social comparisons, missing-data honesty, encrypted read-only grants and bounded monitoring hold');
