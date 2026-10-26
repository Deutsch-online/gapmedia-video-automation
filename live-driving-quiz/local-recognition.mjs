import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {validateWordAudio} from './teacher-profile.mjs';
export class LocalRecognition{
 constructor({python=process.env.QUIZ_ASR_PYTHON||'python3',timeout=60000,worker=new URL('./recognize-teacher.py',import.meta.url)}={}){Object.assign(this,{python,timeout,worker,state:'idle',child:null,pending:null});}
 fail(child=this.child){if(child&&child!==this.child)return;const pending=this.pending;this.pending=null;if(pending){clearTimeout(pending.timer);pending.reject(Error('تبدیل صدای محلی آماده نیست؛ دوباره تلاش کنید. اعتبار پولی مصرف نشد.'));}this.child=null;this.state='error';child?.kill();}
 start(){if(this.child)return;clearTimeout(this.idle);const child=spawn(this.python,[fileURLToPath(this.worker)],{stdio:['pipe','pipe','ignore']});this.child=child;let buffer='';child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{buffer+=chunk;if(buffer.length>20000){this.fail(child);return;}let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);try{const value=JSON.parse(line);if(value.id!==this.pending?.id)continue;if(value.error||typeof value.text!=='string'||value.text.length>240)throw Error('Recognition unavailable');const p=this.pending;clearTimeout(p.timer);this.pending=null;this.state='ready';p.resolve(value.text.trim());this.idle=setTimeout(()=>this.close(),120000);this.idle.unref();}catch{this.fail(child);}}});child.stdin.on('error',()=>this.fail(child));child.once('error',()=>this.fail(child));child.once('exit',()=>this.fail(child));}
 async transcribe(audio){validateWordAudio(audio);if(this.pending)throw Error('تبدیل صدا مشغول است؛ چند لحظه صبر کنید.');clearTimeout(this.idle);this.start();this.state='loading';return new Promise((resolve,reject)=>{const id=randomUUID(),timer=setTimeout(()=>this.fail(),this.timeout);this.pending={id,timer,resolve,reject};this.child.stdin.write(JSON.stringify({id,audio:audio.toString('base64')})+'\n',error=>{if(error)this.fail();});});}
 close(){clearTimeout(this.idle);this.fail();this.state='idle';}
}
