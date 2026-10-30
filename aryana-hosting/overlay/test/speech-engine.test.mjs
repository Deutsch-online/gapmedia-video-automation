import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SpeechEngine} from '../src/speech-engine.mjs';
function fixture(t){const root=mkdtempSync(join(tmpdir(),'aryana-voice-'));const script=join(root,'worker.mjs');
 writeFileSync(script,`import readline from 'node:readline';console.log(JSON.stringify({ready:true}));readline.createInterface({input:process.stdin}).on('line',line=>{const r=JSON.parse(line);setTimeout(()=>console.log(JSON.stringify({id:r.id,ok:true,result:{pid:process.pid,action:r.action}})),r.slow?150:5);});`);
 const engine=new SpeechEngine({python:process.execPath,script,sample:'sample.mp3',directory:root});t.after(()=>{engine.close();rmSync(root,{recursive:true,force:true});});return engine;}
test('Fresh speech reuses one warm Python process',async t=>{const engine=fixture(t);const a=await engine.warmup();const b=await engine.synthesize({text:'fresh one'});const c=await engine.synthesize({text:'fresh two'});assert.equal(a.pid,b.pid);assert.equal(b.pid,c.pid);assert.equal(engine.warmed,true);assert.equal((await engine.warmup()).cached,true);});
test('Stopping idle speech preserves the warm model',async t=>{const engine=fixture(t);const a=await engine.warmup();engine.cancel();const b=await engine.synthesize({text:'after stop'});assert.equal(a.pid,b.pid);});
test('Stopping an active request rejects it and a new request starts cleanly',async t=>{const engine=fixture(t);await engine.warmup();const old=engine.child.pid;const active=engine.synthesize({text:'cancel me',slow:true});engine.cancel();await assert.rejects(active,/متوقف/);const next=await engine.synthesize({text:'new sentence'});assert.notEqual(next.pid,old);});
