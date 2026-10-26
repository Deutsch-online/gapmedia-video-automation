import {persianVoice} from './persian-voices.mjs';
import {validateTeacherAudio} from './teacher-profile.mjs';
import {LiveSpeech} from './live-speech.mjs';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,readdirSync,statSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
export class FemaleSpeech extends LiveSpeech{
 constructor(options={}){const select=options.voice||(()=> 'male'),revision=options.revision||(()=>0),style=options.style||(()=>({}));super({...options,revision:()=>revision()+':'+persianVoice(select()).id,style:()=>({...style(),voice:persianVoice(select()).id}),worker:process.env.QUIZ_TTS_WORKER?undefined:new URL('./fa-female-worker.py',import.meta.url),timeout:55000});this.directory=options.directory;this.selectVoice=select;}
 get voice(){return persianVoice(this.selectVoice()).id;}
 async synthesize(text){
  const key=createHash('sha256').update(this.voice+'\nstandard-v1\n'+this.revision()+'\n'+JSON.stringify(this.style())+'\n'+text).digest('hex');
  if(this.directory){try{const audio=readFileSync(join(this.directory,key+'.wav'));const info=validateTeacherAudio(audio,{maxBytes:5500000,maxDurationMs:120000});return {audio,durationMs:info.durationMs};}catch{}}
  let clip;try{clip=await super.synthesize(text);}catch{throw Error('صدای انتخاب‌شدهٔ فارسی آماده نشد؛ نسخهٔ ذخیره‌شده برای این جمله موجود نیست. هیچ سرویس پولی یا صدای دیگری استفاده نشد.');}
  if(this.directory){mkdirSync(this.directory,{recursive:true,mode:0o700});writeFileSync(join(this.directory,key+'.wav'),clip.audio,{mode:0o600});const files=readdirSync(this.directory).filter(n=>/^[a-f0-9]{64}\.wav$/.test(n)).map(n=>({n,time:statSync(join(this.directory,n)).mtimeMs,size:statSync(join(this.directory,n)).size})).sort((a,b)=>a.time-b.time);let total=files.reduce((n,f)=>n+f.size,0);while(files.length>256||total>134217728){const old=files.shift();total-=old.size;unlinkSync(join(this.directory,old.n));}}return clip;
 }
}

export {FemaleSpeech as PersianSpeech};
