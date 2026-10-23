import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
test('local control requires a token; OBS state hides answers; live mode needs verified gifts',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'driving-quiz-test-')),runtime=join(dir,'runtime.json');const port=32000+Math.floor(Math.random()*20000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),QUIZ_RUNTIME_PATH:runtime},stdio:'ignore'});
 try {
  let settings;for(let i=0;i<80;i++){try{settings=JSON.parse(readFileSync(runtime,'utf8'));break;}catch{await delay(100);}}
  assert.ok(settings,'server started');const base=settings.base;
  const post=(path,data={},headers={})=>fetch(base+'/api/admin/'+path,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+settings.token,...headers},body:JSON.stringify(data)});
  assert.equal((await fetch(base+'/screen')).status,200);
  assert.equal((await fetch(base+'/data/questions.json')).status,404);
  assert.equal((await post('start',{}, {authorization:''})).status,401);
  assert.equal((await post('start',{}, {origin:'https://untrusted.example'})).status,403);
  assert.equal((await post('mode',{mode:'live'})).status,400);
  assert.equal((await post('start')).status,200);
  let state=await (await fetch(base+'/api/state')).json();assert.equal(state.phase,'open');assert.equal(state.question.correct,undefined);
  assert.equal((await post('gifts',{ids:['1','2','3']})).status,400);
  assert.equal((await post('simulate',{choice:'A',name:'آزمایش'})).status,200);
  await post('reveal');state=await(await fetch(base+'/api/state')).json();assert.deepEqual(state.question.correct,['A']);assert.equal(state.leaderboard[0].score,1);
 } finally {child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(3000)]);if(child.exitCode===null)child.kill('SIGKILL');rmSync(dir,{recursive:true,force:true});}
});
