import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {request as httpRequest} from 'node:http';
test('local control requires a token; OBS state hides answers; live mode needs verified gifts',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'driving-quiz-test-')),runtime=join(dir,'runtime.json');const port=32000+Math.floor(Math.random()*20000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),QUIZ_RUNTIME_PATH:runtime,QUIZ_SETTINGS_PATH:join(dir,'settings.json')},stdio:'ignore'});
 try {
  let settings;for(let i=0;i<80;i++){try{settings=JSON.parse(readFileSync(runtime,'utf8'));break;}catch{await delay(100);}}
  assert.ok(settings,'server started');const base=settings.base;const first=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)))[0];
  const post=(path,data={},headers={})=>fetch(base+'/api/admin/'+path,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+settings.token,...headers},body:JSON.stringify(data)});
  assert.equal((await fetch(base+'/screen')).status,200);
  assert.equal((await post('gift-style',{basis:'count',levels:{simple:2,silver:3,gold:4,diamond:5,vip:6}})).status,200);
  assert.equal((await post('gift-style',{basis:'coins',levels:{simple:5,silver:3,gold:4,diamond:5,vip:6}})).status,400);
  assert.equal((await post('activity-display',{side:'free',count:8,top:220})).status,400);
  assert.equal((await post('activity-display',{side:'left',count:11,top:220})).status,400);
  assert.equal((await post('activity-display',{side:'left',count:5,top:300})).status,200);
  assert.deepEqual((await(await fetch(base+'/api/state')).json()).activityDisplay,{side:'left',count:5,top:300});

  assert.equal((await post('narration',{enabled:'yes'})).status,400);assert.equal((await post('narration',{enabled:false})).status,200);assert.equal((await(await fetch(base+'/api/state')).json()).narrationEnabled,false);
  assert.equal((await post('narration',{enabled:true})).status,200);assert.equal((await post('narration-repeat')).status,200);assert.equal((await(await fetch(base+'/api/state')).json()).narrationReplay,1);
  assert.equal((await fetch(base+'/narration/not-a-question.wav')).status,404);

  const video=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url))).find(q=>q.video);
  const partial=await fetch(base+video.video,{headers:{Range:'bytes=0-31'}});assert.equal(partial.status,206);assert.match(partial.headers.get('content-range'),/^bytes 0-31\//);assert.equal(Buffer.from(await partial.arrayBuffer()).toString('ascii',4,8),'ftyp');
  assert.equal((await fetch(base+video.video,{headers:{Range:'bytes=99999999-'}})).status,416);
  assert.equal((await fetch(base+video.video,{method:'HEAD'})).status,200);

  assert.equal((await fetch(base+'/data/questions.json')).status,404);
  assert.equal((await post('start',{}, {authorization:''})).status,401);
  assert.equal((await post('start',{}, {origin:'https://untrusted.example'})).status,403);
  const presetState=await(await fetch(base+'/api/state')).json();assert.deepEqual(['A','B','C'].map(k=>presetState.gifts[k].id),['5655','5269','6064']);
  assert.equal((await post('celebration-audio',{enabled:true,volume:101})).status,400);
  assert.equal((await post('celebration-audio',{enabled:true,volume:18})).status,200);
  assert.equal((await post('timer-sound',{enabled:'yes'})).status,400);assert.equal((await post('timer-sound',{enabled:false})).status,200);
  const musicState=await(await fetch(base+'/api/state')).json();assert.equal(musicState.celebrationMusic,true);assert.equal(musicState.musicVolume,18);assert.equal(musicState.timerSound,false);
  assert.equal(presetState.showPersian,false);assert.equal((await post('display-language',{showPersian:'yes'})).status,400);assert.equal((await post('display-language',{showPersian:true})).status,200);assert.equal((await(await fetch(base+'/api/state')).json()).showPersian,true);
  assert.equal(presetState.answerInput,'comments');assert.equal(presetState.questionSeconds,30);
  assert.equal((await post('question-time',{seconds:9})).status,400);assert.equal((await post('question-time',{seconds:301})).status,400);
  assert.equal((await post('question-time',{seconds:45})).status,200);
  assert.equal((await post('guest-add',{username:'guest',userId:'123'})).status,200);
  const guestKey=(await(await fetch(base+'/api/state')).json()).guests[0].key;
  assert.equal((await post('simulate-guest-gift',{key:guestKey})).status,200);
  assert.equal((await post('mode',{mode:'live'})).status,400);
  assert.equal((await post('manual-gifts',{confirmed:true,gifts:[{id:'1',name:'هدیه A'},{id:'1',name:'هدیه B'},{id:'3',name:'هدیه C'},{}]})).status,400);
  assert.equal((await post('manual-gifts',{confirmed:true,gifts:[{id:'1',name:'هدیه A'},{id:'2',name:'هدیه B'},{id:'3',name:'هدیه C'},{}]})).status,200);
  assert.equal((await post('mode',{mode:'live'})).status,400,'manual choices alone never claim a live connection');
  assert.equal((await post('select',{id:first.id})).status,200);
  assert.equal((await post('start')).status,200);
  assert.equal((await post('question-time',{seconds:60})).status,400);
  const timedState=await(await fetch(base+'/api/state')).json();assert.equal(timedState.questionSeconds,45);assert.equal(timedState.closesAt-timedState.opensAt,45000);
  assert.equal((await post('answer-input',{input:'gifts'})).status,400);
  assert.equal((await post('simulate-comment',{comment:'1',name:'comment-person'})).status,200);
  await post('pause');assert.equal((await post('answer-input',{input:'gifts'})).status,200);assert.equal((await post('simulate-comment',{comment:'1'})).status,400);await post('start');
  let state=await (await fetch(base+'/api/state')).json();assert.equal(state.phase,'open');assert.equal(state.question.correct,undefined);
  assert.equal((await post('gifts',{ids:['1','2','3']})).status,400);
  for(const choice of first.correct)assert.equal((await post('simulate',{choice,name:'آزمایش'})).status,200);
  await post('reveal');state=await(await fetch(base+'/api/state')).json();assert.deepEqual(state.question.correct,first.correct);assert.equal(state.leaderboard[0].score,1);
  assert.equal(state.session.completedTotal,1);assert.equal((await post('select',{id:first.id})).status,400);
  assert.equal((await post('session-settings',{size:49,allowRepeat:false})).status,400);
  assert.equal((await post('session-settings',{size:50,allowRepeat:true})).status,200);
  assert.equal((await post('new-session')).status,200);
  const groups=await(await fetch(base+'/api/admin/questions',{headers:{authorization:'Bearer '+settings.token}})).json();assert.equal(groups.questions.length,200);assert.equal(groups.questions.filter(q=>q.completed).length,1);assert.equal(groups.questions.filter(q=>q.planned).length,50);
  assert.equal((await post('simulate-like',{count:1000,name:'fan'})).status,200);
  state=await(await fetch(base+'/api/state')).json();assert.equal(state.supporters[0].tier,'crown');assert.equal(state.supporters[0].likeLabel,'1K');assert.equal(state.supporters[0].userId,undefined);
  assert.equal((await post('simulate-supporter',{coins:500,name:'fan'})).status,200);
  state=await(await fetch(base+'/api/state')).json();assert.equal(state.supporters.length,1);assert.equal(state.supporters[0].kind,'gift');assert.equal(state.supporters[0].likes,1000);
  assert.equal(JSON.parse(readFileSync(join(dir,'settings.json'))).sessionProgress,undefined,'demo questions never change durable real progress');
  assert.equal((await post('answer-input',{input:'comments'})).status,200);
  state=(await(await post('select',{id:first.id})).json()).state;
  assert.equal(state.phase,'open');assert.equal(state.autoplay,false);
  const manualRound=state.roundId;
  assert.equal((await post('simulate-comment',{comment:first.correct.map(k=>'123'['ABC'.indexOf(k)]).join(''),name:'manual-user'})).status,200);
  state=(await(await post('start')).json()).state;assert.equal(state.roundId,manualRound);assert.equal(state.voters,1,'repeated start never erases a manual answer');
  await post('pause');state=(await(await post('reveal')).json()).state;assert.equal(state.phase,'revealed');assert.deepEqual(state.question.correct,first.correct);assert.equal(state.revealReason,'manual');
  const score=state.leaderboard.find(p=>p.name==='manual-user').score;
  await post('pause');state=(await(await post('reveal')).json()).state;assert.equal(state.leaderboard.find(p=>p.name==='manual-user').score,score);
  state=(await(await post('next')).json()).state;assert.ok(['open','watching'].includes(state.phase));assert.equal(state.autoplay,false);assert.notEqual(state.question.id,first.id);
  state=(await(await post('next')).json()).state;assert.ok(['open','watching'].includes(state.phase));assert.equal(state.autoplay,false,'manual next also works before the prior round closes');

 } finally {child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(3000)]);if(child.exitCode===null)child.kill('SIGKILL');rmSync(dir,{recursive:true,force:true});}
});

test('public hosting accepts only configured hosts and never prints the private control token',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'driving-public-test-')),runtime=join(dir,'runtime.json');const port=32000+Math.floor(Math.random()*20000);
 const token='private-test-token-'.repeat(3);let output='';
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),PUBLIC_URL:'https://quiz.example',QUIZ_BIND_HOST:'127.0.0.1',QUIZ_ADMIN_TOKEN:token,QUIZ_RUNTIME_PATH:runtime,QUIZ_SETTINGS_PATH:join(dir,'settings.json')},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>{output+=d.toString();});child.stderr.on('data',d=>{output+=d.toString();});
 try{
  let ready=false;for(let i=0;i<80;i++){try{readFileSync(runtime);ready=true;break;}catch{await delay(100);}}
  assert.ok(ready);const base=`http://127.0.0.1:${port}`;
  const health=await(await fetch(base+'/health')).json();assert.equal(health.ok,true);
  const hostStatus=host=>new Promise((resolve,reject)=>{const req=httpRequest(base+'/api/state',{headers:{Host:host}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});
  assert.equal(await hostStatus('quiz.example'),200);
  assert.equal(await hostStatus('attacker.example'),403);
  const state=await(await fetch(base+'/api/state')).text();assert.ok(!state.includes(token));assert.ok(!output.includes(token),'public hosting logs must not leak administrative links');
 }finally{child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(3000)]);if(child.exitCode===null)child.kill('SIGKILL');rmSync(dir,{recursive:true,force:true});}
});
