import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {PersianSpeech} from '../female-speech.mjs';
import {persianVoice,validPersianVoice} from '../persian-voices.mjs';
test('only the two Persian identities can be selected; default is male',()=>{assert.equal(persianVoice().id,'fa-IR-FaridNeural');assert.equal(persianVoice('female').id,'fa-IR-DilaraNeural');assert.equal(validPersianVoice('toString'),false);assert.equal(validPersianVoice('paid-api'),false);});
test('switching gender never reuses the other voice in memory or private disk cache',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'voice-choice-')),worker=join(dir,'worker.mjs');
 writeFileSync(worker,`import readline from 'node:readline';for await(const l of readline.createInterface({input:process.stdin})){const r=JSON.parse(l),b=Buffer.alloc(44144);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(22050,24);b.writeUInt32LE(44100,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(44100,40);for(let i=44;i<b.length;i+=2)b.writeInt16LE(Math.round(Math.sin(i/12)*(r.style.voice.includes('Farid')?1000:2000)),i);console.log(JSON.stringify({id:r.id,audio:b.toString('base64'),duration_ms:1000}));}`);
 const previous=process.env.QUIZ_TTS_WORKER;process.env.QUIZ_TTS_WORKER=worker;let choice='male';const options={python:process.execPath,voice:()=>choice,directory:join(dir,'cache')},speech=new PersianSpeech(options);
 try{const male=await speech.synthesize('یک سوال'),female=await (choice='female',speech.synthesize('یک سوال'));assert.notDeepEqual(male.audio,female.audio);choice='male';assert.deepEqual((await speech.synthesize('یک سوال')).audio,male.audio);speech.close();const cached=new PersianSpeech(options);try{assert.deepEqual((await cached.synthesize('یک سوال')).audio,male.audio);assert.equal(cached.child,null);}finally{cached.close();}}
 finally{speech.close();if(previous===undefined)delete process.env.QUIZ_TTS_WORKER;else process.env.QUIZ_TTS_WORKER=previous;rmSync(dir,{recursive:true,force:true});}
});
