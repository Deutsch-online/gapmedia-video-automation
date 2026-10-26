import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
export class LiveSpeech{
 constructor({worker=process.env.QUIZ_TTS_WORKER?pathToFileURL(process.env.QUIZ_TTS_WORKER):new URL('./fa-speech-worker.py',import.meta.url),python=process.env.QUIZ_TTS_PYTHON||'python3',timeout=45000,rulesFor=async()=>[],style=()=>({}),revision=()=>0,processAudio=async clip=>clip}={}){this.worker=worker;this.processAudio=processAudio;this.rulesFor=rulesFor;this.style=style;this.revision=revision;this.python=python;this.timeout=timeout;this.cache=new Map();this.child=null;this.pending=null;this.state='idle';}
 start(){
  if(this.child)return;const child=spawn(this.python,[fileURLToPath(this.worker)],{stdio:['pipe','pipe','ignore']});this.child=child;let buffer='';
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{buffer+=chunk;if(buffer.length>8000000){this.fail();return;}let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);try{const result=JSON.parse(line);if(result.id!==this.pending?.id)continue;const pending=this.pending;if(result.error)throw Error('Native voice unavailable');if(pending.kind==='learn'){if(!result.learned||typeof result.learned.spoken!=='string'||result.learned.spoken.length>60||typeof result.learned.reviewNeeded!=='boolean')throw Error('Invalid learned pronunciation');clearTimeout(pending.timer);this.pending=null;this.state='ready';pending.resolve(result.learned);continue;}const audio=Buffer.from(result.audio,'base64');if(audio.length>5500000||audio.toString('ascii',0,4)!=='RIFF'||!Number.isInteger(result.duration_ms)||result.duration_ms<400||result.duration_ms>120000)throw Error('Invalid speech');clearTimeout(pending.timer);this.pending=null;this.state='ready';pending.resolve({audio,durationMs:result.duration_ms});}catch{this.fail();}}});
  child.stdin.on('error',()=>this.fail(child));child.once('error',()=>this.fail(child));child.once('exit',()=>{if(this.child===child)this.fail(child);});
 }
 fail(child=this.child){if(child&&this.child!==child)return;this.state='error';const pending=this.pending;this.pending=null;if(pending){clearTimeout(pending.timer);pending.reject(Error('صدای محلی فارسی آماده نیست؛ اعتبار پولی مصرف نشد.'));}this.child=null;child?.kill();}
 async synthesize(text){
  if(typeof text!=='string'||!text.trim()||text.length>1600)throw Error('متن گفتار بیش از حد بلند است.');
  const key=createHash('sha256').update(String(this.revision())+'\n'+text).digest('hex');if(this.cache.has(key))return this.cache.get(key);if(this.pending)throw Error('Speech worker is busy');const rules=await this.rulesFor(text);if(this.pending)throw Error('Speech worker is busy');this.start();this.state='loading';
  const result=await new Promise((resolve,reject)=>{const id=randomUUID(),timer=setTimeout(()=>this.fail(),this.timeout);this.pending={id,resolve,reject,timer};const child=this.child;child.stdin.write(JSON.stringify({id,text,rules,style:this.style()})+'\n',error=>{if(error)this.fail(child);});});
  const processed=await this.processAudio(result);this.cache.set(key,processed);while(this.cache.size>12)this.cache.delete(this.cache.keys().next().value);return processed;
 }
 async learn(word,audio){
  if(this.pending)throw Error('تمرین صدا مشغول است؛ چند لحظه صبر کنید.');this.start();this.state='learning';
  return new Promise((resolve,reject)=>{const id=randomUUID(),timer=setTimeout(()=>this.fail(),120000);this.pending={id,kind:'learn',resolve,reject,timer};this.child.stdin.write(JSON.stringify({id,operation:'learn',text:word,reference:audio.toString('base64'),style:this.style()})+'\n',error=>{if(error)this.fail();});});
 }
 close(){this.fail();this.cache.clear();this.state='closed';}
}
