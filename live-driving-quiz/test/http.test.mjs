import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pcmWav} from '../public/teacher-audio.js';
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
  assert.equal((await fetch(base+'/screen')).status,200);const beforeRefresh=await(await fetch(base+'/api/state')).json();assert.equal((await post('refresh-screen')).status,200);const afterRefresh=await(await fetch(base+'/api/state')).json();assert.equal(afterRefresh.screenRevision,beforeRefresh.screenRevision+1);assert.equal(afterRefresh.phase,beforeRefresh.phase);assert.deepEqual(afterRefresh.session,beforeRefresh.session);
  assert.equal((await fetch(base+'/api/admin/assistant')).status,401);
  for(const endpoint of ['teacher','next-lesson','practice-lesson','teacher-word?word=test'])assert.equal((await fetch(base+'/api/admin/'+endpoint)).status,401);
  assert.equal((await fetch(base+'/teacher-ui.js')).status,200);
  assert.equal((await fetch(base+'/live-demo')).status,200);
  assert.equal((await fetch(base+'/live-demo.js')).status,200);
  assert.equal((await fetch(base+'/teacher-audio.js')).status,200);
  const ownerGet=path=>fetch(base+'/api/admin/'+path,{headers:{authorization:'Bearer '+settings.token}});
  assert.equal((await ownerGet('next-lesson')).status,200);
  const practice=await(await ownerGet('practice-lesson')).json();assert.equal(practice.questions.length,30);assert.ok(practice.questions.every(q=>q.fa&&q.note));
  assert.equal((await post('teacher-preview',{text:''})).status,400);
  assert.equal((await fetch(base+'/api/admin/teacher-transcribe',{method:'POST',body:'not audio'})).status,401);
  assert.equal((await post('teacher-transcribe')).status,400);
  const arm=await(await post('teacher-command',{text:'این کلمه را اینطور تلفظ کن'})).json();
  assert.equal(arm.command.silent,true);assert.equal(arm.profile.pendingCorrection,true);
  assert.equal((await post('teacher-word-text',{word:'فلش',spoken:'فِلَش'})).status,200);
  const privateProfile=await(await ownerGet('teacher')).json();assert.equal(privateProfile.profile.rules.length,1);
  const publicProfile=await(await fetch(base+'/api/state')).json();assert.equal(publicProfile.teacherProfile,undefined);assert.equal(publicProfile.rules,undefined);
  assert.equal((await post('teacher-word-text',{word:'فلش',spoken:'فلش'})).status,400);
  assert.equal((await post('teacher-word-remove',{word:'فلش'})).status,200);
  const testText='این جمله برای تمرین صدای خودم اصلاح شده است.';
  assert.equal((await post('teacher-question-text',{id:practice.questions[0].id,text:testText})).status,200);
  assert.equal((await(await ownerGet('practice-lesson')).json()).questions.find(q=>q.id===practice.questions[0].id).fa,testText);
  const samples=Float32Array.from({length:22050*7},(_,i)=>Math.sin(i/12)*.2),sampleBytes=Buffer.from(await pcmWav(samples,22050,60).arrayBuffer());
  const sampleUrl=base+'/api/admin/teacher-question-audio?id='+encodeURIComponent(practice.questions[0].id)+'&textHash='+createHash('sha256').update(testText).digest('hex');
  const sampleResponse=await fetch(sampleUrl,{method:'POST',headers:{authorization:'Bearer '+settings.token,'content-type':'audio/wav'},body:sampleBytes});assert.equal(sampleResponse.status,200);
  const recorded=await post('teacher-preview',{text:testText,questionId:practice.questions[0].id});assert.equal(recorded.status,200);assert.deepEqual(Buffer.from(await recorded.arrayBuffer()),sampleBytes,'exact owner recording plays offline without Python, LIVE or a public screen');
  assert.equal((await post('teacher-clone-reference',{id:practice.questions[0].id})).status,200);assert.equal((await post('teacher-clone-enabled',{enabled:true})).status,200);
  assert.equal((await post('teacher-clone-enabled',{enabled:false})).status,200);
  assert.equal((await post('teacher-question-recording-remove',{id:practice.questions[0].id})).status,200);
  assert.equal((await post('teacher-question-reset',{id:practice.questions[0].id})).status,200);
  assert.equal((await(await ownerGet('practice-lesson')).json()).questions.find(q=>q.id===practice.questions[0].id).fa,practice.questions[0].fa);


  assert.equal((await fetch(base+'/api/admin/presenter-intro-play',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,401);
  assert.equal((await post('presenter-intro-play')).status,200);const introState=await(await fetch(base+'/api/state')).json();assert.equal(introState.phase,'paused');assert.equal(introState.presenterIntro.durationMs,30000);assert.ok(introState.presenterIntro.active);
  assert.equal((await post('presenter-intro-stop')).status,200);assert.equal((await(await fetch(base+'/api/state')).json()).presenterIntro.active,null);
  assert.equal((await post('presenter-intro-settings',{auto:false})).status,200);
  const videoRange=await fetch(base+'/presenter/lesson-intro.mp4',{headers:{Range:'bytes=0-31'}});assert.equal(videoRange.status,206);assert.equal((await videoRange.arrayBuffer()).byteLength,32);
  assert.equal((await fetch(base+'/api/admin/technical-lesson')).status,401);
  const technical=await(await fetch(base+'/api/admin/technical-lesson',{headers:{authorization:'Bearer '+settings.token}})).json();assert.equal(technical.questions.length,50);assert.ok(technical.questions.every(q=>q.explanation.length>100));
  const teacher=await(await fetch(base+'/api/admin/assistant',{headers:{authorization:'Bearer '+settings.token}})).json();assert.equal(teacher.settings.enabled,true);assert.equal(teacher.settings.showCaptions,false);
  assert.equal((await post('assistant-settings',{...teacher.settings,commentGap:0})).status,400);
  assert.equal((await post('assistant-explain')).status,400,'viewers and owner cannot reveal keys through lesson speech before reveal');
  assert.equal((await post('assistant-say',{text:'Only English'})).status,400);
  assert.equal((await post('assistant-settings',{...teacher.settings,enabled:false})).status,200);
  assert.equal((await post('assistant-say',{text:'سلام'})).status,400);
  assert.equal((await post('assistant-settings',{...teacher.settings,enabled:true,autoExplain:false})).status,200);
  assert.equal((await fetch(base+'/assistant/audio/00000000-0000-0000-0000-000000000000.wav')).status,404);

  assert.equal((await fetch(base+'/api/admin/gift-events')).status,401);const giftLog=await(await fetch(base+'/api/admin/gift-events',{headers:{authorization:'Bearer '+settings.token}})).json();assert.deepEqual(giftLog.events,[]);assert.equal(giftLog.traffic.giftProfilesRecorded,0);

  assert.equal((await fetch(base+'/demo')).status,200);assert.equal((await fetch(base+'/rights')).status,200);
  const beforeDemo=await(await fetch(base+'/api/state')).json();const demo=await(await fetch(base+'/api/demo')).json();assert.ok(demo.questions.length>=4);assert.ok(demo.questions.some(q=>q.video));const afterDemo=await(await fetch(base+'/api/state')).json();assert.equal(afterDemo.roundId,beforeDemo.roundId);assert.equal(afterDemo.voters,beforeDemo.voters);

  assert.equal((await post('gift-style',{basis:'count',levels:{simple:2,silver:3,gold:4,diamond:5,vip:6}})).status,200);
  assert.equal((await post('gift-style',{basis:'coins',levels:{simple:5,silver:3,gold:4,diamond:5,vip:6}})).status,400);
  assert.equal((await post('activity-display',{side:'free',count:8,top:220})).status,400);
  assert.equal((await post('activity-display',{side:'left',count:11,top:220})).status,400);
  assert.equal((await post('join-display',{enabled:true,side:'right',size:112,bottom:100})).status,200);assert.equal((await post('activity-display',{side:'left',count:5,top:1200})).status,200);
  assert.equal((await post('activity-display',{side:'left',count:5,top:1201})).status,400);
  assert.equal((await post('join-display',{enabled:true,side:'right',size:64,bottom:100})).status,200);
  assert.equal((await post('join-display',{enabled:true,side:'free',size:64,bottom:100})).status,400);
  assert.equal((await post('join-display',{enabled:true,side:'right',size:500,bottom:100})).status,400);
  assert.deepEqual((await(await fetch(base+'/api/state')).json()).joinDisplay,{enabled:true,side:'right',size:64,bottom:100});
  assert.equal((await post('activity-display',{side:'left',count:5,top:300})).status,200);
  assert.deepEqual((await(await fetch(base+'/api/state')).json()).activityDisplay,{side:'left',count:5,top:300});

  assert.equal((await post('narration-language',{language:'wrong'})).status,400);
  assert.equal((await post('narration-language',{language:'both'})).status,200);
  assert.equal((await post('welcome-settings',{enabled:true,language:'fa'})).status,200);assert.equal((await post('welcome-settings',{enabled:true,language:'wrong'})).status,400);
  assert.equal((await post('simulate-welcome')).status,200);
  let audioState=await(await fetch(base+'/api/state')).json();assert.equal(audioState.welcome.intervalSeconds,120);assert.equal(audioState.welcome.announcement.demo,true);assert.match(audioState.welcome.texts.fa,/خوش آمدید/);
  for(const path of ['/narration/fa/'+first.id+'.wav','/narration/welcome-fa.wav','/narration/welcome-de.wav']){const response=await fetch(base+path);assert.ok([200,503].includes(response.status));if(response.status===200)assert.equal(Buffer.from(await response.arrayBuffer()).toString('ascii',0,4),'RIFF');}
  assert.equal((await fetch(base+'/narration/fa/no-such-question.wav')).status,404);
  assert.equal((await post('wait-time',{seconds:-1})).status,400);
  assert.equal((await post('wait-time',{seconds:23})).status,200);
  assert.equal((await(await fetch(base+'/api/state')).json()).waitSeconds,23);
  assert.equal((await post('profile-frames',{liker:'gold',gifter:'fire'})).status,200);
  assert.equal((await post('profile-frames',{liker:'evil',gifter:'fire'})).status,400);
  assert.deepEqual((await(await fetch(base+'/api/state')).json()).profileFrames,{liker:'gold',gifter:'fire'});
  assert.equal((await post('simulate-join')).status,200);
  assert.equal((await(await fetch(base+'/api/state')).json()).joins.length,1);
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
  assert.equal((await post('session-settings',{size:29,allowRepeat:false})).status,400);
  assert.equal((await post('session-settings',{size:50,allowRepeat:true})).status,200);
  assert.equal((await post('new-session')).status,200);
  const groups=await(await fetch(base+'/api/admin/questions',{headers:{authorization:'Bearer '+settings.token}})).json();assert.equal(groups.questions.length,346);assert.equal(groups.questions.filter(q=>q.completed).length,1);assert.equal(groups.questions.filter(q=>q.planned).length,50);
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
  const latestId=state.question.id;await post('session-settings',{size:50,allowRepeat:false});
  state=(await(await post('previous')).json()).state;assert.notEqual(state.question.id,latestId);assert.equal(state.autoplay,false);
  state=(await(await post('next')).json()).state;assert.equal(state.question.id,latestId);
  const priorRound=state.roundId;state=(await(await post('repeat')).json()).state;assert.equal(state.question.id,latestId);assert.notEqual(state.roundId,priorRound);assert.equal(state.voters,0);assert.equal(state.session.allowRepeat,false,'explicit operator repeat does not enable bulk session repeats');


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
