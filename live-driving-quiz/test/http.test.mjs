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
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),QUIZ_RUNTIME_PATH:runtime},stdio:'ignore'});
 try {
  let settings;for(let i=0;i<80;i++){try{settings=JSON.parse(readFileSync(runtime,'utf8'));break;}catch{await delay(100);}}
  assert.ok(settings,'server started');const base=settings.base;const first=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)))[0];
  const post=(path,data={},headers={})=>fetch(base+'/api/admin/'+path,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+settings.token,...headers},body:JSON.stringify(data)});
  assert.equal((await fetch(base+'/screen')).status,200);
  const video=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url))).find(q=>q.video);
  const partial=await fetch(base+video.video,{headers:{Range:'bytes=0-31'}});assert.equal(partial.status,206);assert.match(partial.headers.get('content-range'),/^bytes 0-31\//);assert.equal(Buffer.from(await partial.arrayBuffer()).toString('ascii',4,8),'ftyp');
  assert.equal((await fetch(base+video.video,{headers:{Range:'bytes=99999999-'}})).status,416);
  assert.equal((await fetch(base+video.video,{method:'HEAD'})).status,200);

  assert.equal((await fetch(base+'/data/questions.json')).status,404);
  assert.equal((await post('start',{}, {authorization:''})).status,401);
  assert.equal((await post('start',{}, {origin:'https://untrusted.example'})).status,403);
  assert.equal((await post('mode',{mode:'live'})).status,400);
  assert.equal((await post('manual-gifts',{confirmed:true,gifts:[{id:'1',name:'هدیه A'},{id:'1',name:'هدیه B'},{id:'3',name:'هدیه C'},{}]})).status,400);
  assert.equal((await post('manual-gifts',{confirmed:true,gifts:[{id:'1',name:'هدیه A'},{id:'2',name:'هدیه B'},{id:'3',name:'هدیه C'},{}]})).status,200);
  assert.equal((await post('mode',{mode:'live'})).status,400,'manual choices alone never claim a live connection');
  assert.equal((await post('start')).status,200);
  let state=await (await fetch(base+'/api/state')).json();assert.equal(state.phase,'open');assert.equal(state.question.correct,undefined);
  assert.equal((await post('gifts',{ids:['1','2','3']})).status,400);
  for(const choice of first.correct)assert.equal((await post('simulate',{choice,name:'آزمایش'})).status,200);
  await post('reveal');state=await(await fetch(base+'/api/state')).json();assert.deepEqual(state.question.correct,first.correct);assert.equal(state.leaderboard[0].score,1);
 } finally {child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(3000)]);if(child.exitCode===null)child.kill('SIGKILL');rmSync(dir,{recursive:true,force:true});}
});

test('public hosting accepts only configured hosts and never prints the private control token',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'driving-public-test-')),runtime=join(dir,'runtime.json');const port=32000+Math.floor(Math.random()*20000);
 const token='private-test-token-'.repeat(3);let output='';
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),PUBLIC_URL:'https://quiz.example',QUIZ_BIND_HOST:'127.0.0.1',QUIZ_ADMIN_TOKEN:token,QUIZ_RUNTIME_PATH:runtime},stdio:['ignore','pipe','pipe']});
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
