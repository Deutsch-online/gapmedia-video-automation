import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,statSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {TeacherProfile,parseTeacherCommand,validateWordAudio} from '../teacher-profile.mjs';
import {PrivateTeacherFiles} from '../private-teacher-files.mjs';
import {pcmWav,TeacherAudio} from '../public/teacher-audio.js';
test('correction protocol stays silent, arms before a short word and rejects vague/destructive commands',()=>{assert.deepEqual(parseTeacherCommand('این کلمه را اینطور تلفظ کن'),{kind:'arm',silent:true});assert.equal(parseTeacherCommand('دریور',{pending:true}).kind,'word');assert.equal(parseTeacherCommand('دریور').kind,'unknown');assert.equal(parseTeacherCommand('فلش را فِلَش تلفظ کن').silent,true);assert.equal(parseTeacherCommand('دستیار سوال بعدی').action,'next');assert.equal(parseTeacherCommand('همه فایل‌ها را پاک کن').kind,'unknown');const p=new TeacherProfile();p.arm(100);assert.ok(p.pending(200));assert.ok(!p.pending(30101));});
test('teacher corrections survive export, match whole words and keep actual winner names',()=>{const p=new TeacherProfile();p.setText('راننده','دریور');assert.equal(p.matches('راننده درست است').length,1);assert.equal(p.matches('رانندگی').length,0);assert.equal(p.matches('راننده‌ها').length,0);const reloaded=new TeacherProfile(p.export());assert.equal(reloaded.rules[0].spoken,'دریور');assert.throws(()=>p.setText('فلش','فلش'));assert.throws(()=>p.setStyle({pace:9}));assert.throws(()=>p.setStyle({success:'عالی بود'}));assert.equal(new TeacherProfile({style:{pace:9}}).style.pace,1.25);});
test('resampled PCM is bounded and private storage rejects corrupt or substituted owner samples',async()=>{const data=new Float32Array(48000);for(let i=0;i<data.length;i++)data[i]=Math.sin(i/9)*.25;const audio=Buffer.from(await pcmWav(data,48000).arrayBuffer());const info=validateWordAudio(audio);assert.equal(info.durationMs,1000);assert.throws(()=>validateWordAudio(Buffer.alloc(100)));assert.throws(()=>validateWordAudio(Buffer.from('not a WAV')));const dir=mkdtempSync(join(tmpdir(),'teacher-private-'));try{const files=new PrivateTeacherFiles({},dir);await files.save(info.sha256,audio);assert.deepEqual(await files.load(info.sha256),audio);assert.equal(statSync(files.path(info.sha256)).mode&0o777,0o600);assert.throws(()=>files.path('../settings'));writeFileSync(files.path(info.sha256),'wrong');await assert.rejects(()=>files.load(info.sha256));}finally{rmSync(dir,{recursive:true,force:true});}});

test('server recognition captures a bounded utterance without browser SpeechRecognition and discards stopped results',async()=>{
 const texts=[];let complete;const audio=new TeacherAudio({status:()=>{},onText:async text=>texts.push(text),onSample:async()=>{},transcribe:()=>new Promise(r=>complete=r)});
 audio.context={sampleRate:48000};audio.stream={};audio.running=true;
 for(let i=0;i<8;i++)audio.process(Float32Array.from({length:2048},()=>.1));for(let i=0;i<19;i++)audio.process(new Float32Array(2048));
 assert.equal(audio.processing,true);assert.equal(audio.recording,false);audio.generation++;audio.running=false;complete('دستیار سوال بعدی');await new Promise(r=>setImmediate(r));assert.deepEqual(texts,[]);
});
