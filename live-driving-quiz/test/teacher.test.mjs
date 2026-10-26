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

test('full-sentence recordings exceed the word limit, trim silence and stay tied to the edited text',async()=>{
 const {validateSentenceAudio,textHash}=await import('../teacher-profile.mjs');const {trimRecording}=await import('../public/teacher-audio.js');const rate=22050,a=Float32Array.from({length:7*rate},(_,i)=>Math.sin(i/12)*.2),bytes=Buffer.from(await pcmWav(a,rate,60).arrayBuffer());assert.throws(()=>validateWordAudio(bytes));const info=validateSentenceAudio(bytes);assert.equal(info.durationMs,7000);
 const p=new TeacherProfile(),q={id:'1.2.03-001',fa:'متن اصلی'};p.setQuestionText(q.id,'متن اصلاح‌شده');p.setQuestionRecording(q,info);assert.equal(p.questionRecording(q).textSha256,textHash('متن اصلاح‌شده'));p.setVoiceReference(info);assert.equal(p.voiceReference.enabled,false);p.enableVoiceReference(true);assert.equal(new TeacherProfile(p.export()).privateState().voiceCloneActive,true);p.setQuestionText(q.id,'متن تازه');assert.equal(p.questionRecording(q),null);p.resetQuestionText(q.id);assert.equal(p.questionText(q),'متن اصلی');
 const padded=new Float32Array(9*rate);padded.set(a,rate);const trimmed=trimRecording(padded,rate);assert.ok(trimmed.length<padded.length);assert.ok(trimmed.length>=a.length);
});
test('private samples use JSON Git files instead of binary WAV commits and can be restored without a local cache',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'teacher-json-')),original=globalThis.fetch;let stored;
 const samples=Float32Array.from({length:11025},(_,i)=>Math.sin(i/8)*.2),bytes=Buffer.from(await pcmWav(samples,22050).arrayBuffer()),info=validateWordAudio(bytes),store={repo:'test/private',token:'never-log-this',ready:true};
 try{globalThis.fetch=async(url,options)=>{if(options.method==='POST'){const lines=options.body.trim().split('\n').map(JSON.parse),file=lines.find(v=>v.key==='file').value;assert.ok(file.path.endsWith('.json'));stored=Buffer.from(file.content,'base64');assert.deepEqual(Buffer.from(JSON.parse(stored).audio,'base64'),bytes);return new Response('{}');}assert.ok(url.endsWith('.json'));return new Response(stored);};await new PrivateTeacherFiles(store,join(dir,'first')).save(info.sha256,bytes);assert.deepEqual(await new PrivateTeacherFiles(store,join(dir,'reload')).load(info.sha256),bytes);
 globalThis.fetch=async()=>new Response('{}',{status:403});await assert.rejects(()=>new PrivateTeacherFiles(store,join(dir,'error')).save(info.sha256,bytes),e=>e.message.includes('HTTP 403')&&!e.message.includes(store.token));}finally{globalThis.fetch=original;rmSync(dir,{recursive:true,force:true});}
});

test('queued audio callbacks after Stop cannot read a closed audio context',()=>{const audio=new TeacherAudio({status:()=>{}});assert.doesNotThrow(()=>audio.process(new Float32Array(2048)));});

test('corrections automatically match Arabic letter variants and vowels across lessons without touching longer words',()=>{
 const p=new TeacherProfile();p.queueWord('موتر');p.setText('موتر','موتَر');p.setText('کلاچ','کْلَچ');assert.equal(p.pendingWords.length,0);
 const q1={id:'lesson-one',fa:'موتَر فاصله دارد.'},q2={id:'lesson-two',fa:'كِلاچ را فشار دهید.'};
 assert.ok(p.customQuestion(q1));assert.ok(p.customQuestion(q2));assert.equal(p.matches('موترها').length,0);assert.equal(p.matches('موتر‌ها').length,0);
 p.setText('مُوتر','موتَر');assert.equal(p.rules.length,2,'vowel spelling updates the same word');assert.equal(new TeacherProfile(p.export()).matches(q2.fa).length,1);
 for(let i=0;i<60;i++)p.upsert({word:'واژه'+String.fromCodePoint(0x4e00+i),spoken:'تلفظ'});assert.ok(p.rules.length>50);
});

test('automatic pronunciation audit flags substitutions, suppresses Afghan aliases and cannot rewrite corrections',async()=>{
 const {suspectWords,auditKey}=await import('../pronunciation-audit.mjs');
 const expected='شما باید فاصله مناسب با موتر دیگر داشته باشید';
 assert.deepEqual(suspectWords(expected,'شما باید فاصله مناسب با متر دیگر داشته باشید'),[{word:'موتر',heard:'متر'}]);
 assert.deepEqual(suspectWords('شما باید ترمز موتر را بررسی کنید','شما باید بریک موتر را بررسی کنید'),[]);
 assert.deepEqual(suspectWords(expected,'این متن هیچ ربطی ندارد'),[]);assert.deepEqual(suspectWords(expected,'شما باید فاصله مناسب با موتر دیگر داشته'),[]);
 assert.notEqual(auditKey('a',expected,Buffer.from('one')),auditKey('a',expected,Buffer.from('two')));
 const p=new TeacherProfile({suspected:[{word:'موتر',heard:'متر',questionId:'a'}]});p.upsert({word:'موتر',spoken:'موتَر'});assert.equal(p.suspected.length,0);assert.equal(new TeacherProfile(p.export()).rules.length,1);
});

test('Python splicing and JS selection agree on vowelled words, Arabic letters and original sentence offsets',async()=>{
 const {execFileSync}=await import('node:child_process');
 const code=`import json\nfrom runtime_pronunciation import correction_matches\nt='كِلاچ و موتَر، موترها و موتر باری'\nr=[{'word':'کلاچ','spoken':'کْلَچ'},{'word':'موتر','spoken':'موتَر'},{'word':'موتر باری','spoken':'نمونه'}]\nprint(json.dumps([(t[a:b],r['word']) for a,b,r in correction_matches(t,r)],ensure_ascii=False))`;
 const found=JSON.parse(execFileSync('python3',['-c',code],{cwd:new URL('..',import.meta.url),encoding:'utf8'}));
 assert.deepEqual(found,[['كِلاچ','کلاچ'],['موتَر','موتر'],['موتر باری','موتر باری']]);
});

test('vowel-only targets cannot create empty matching patterns',()=>{const p=new TeacherProfile();assert.throws(()=>p.setText('َ','تلفظ'));assert.throws(()=>p.queueWord('ـَ'));});
