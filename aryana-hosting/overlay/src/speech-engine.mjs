import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';

export class SpeechEngine{
 constructor({python,script,sample,directory,changed=()=>{}}){Object.assign(this,{python,script,sample,directory,changed});this.child=null;this.pending=null;this.ready=false;this.warmed=false;this.buffer='';this.status='idle';this.lastSeconds=null;}
 update(status){this.status=status;this.changed();}
 snapshot(){return {ready:this.ready,warmed:this.warmed,status:this.status,pending:Boolean(this.pending),lastSeconds:this.lastSeconds};}
 start(){
  if(this.child)return;
  this.buffer='';this.ready=false;const child=spawn(this.python,[this.script,'--worker'],{stdio:['pipe','pipe','ignore'],env:{...process.env}});this.child=child;this.update('starting');
  child.stdin.on('error',()=>{});child.stdout.setEncoding('utf8');
  child.stdout.on('data',chunk=>{if(this.child!==child)return;this.buffer+=chunk;if(this.buffer.length>100000){this.close();return;}let at;while((at=this.buffer.indexOf('\n'))>=0){const line=this.buffer.slice(0,at);this.buffer=this.buffer.slice(at+1);let result;try{result=JSON.parse(line);}catch{continue;}
   if(result.ready){this.ready=true;this.update(this.pending?'working':'ready');if(this.pending)child.stdin.write(JSON.stringify(this.pending.request)+'\n');}
   else if(result.id===this.pending?.request.id){const pending=this.pending;this.pending=null;clearTimeout(pending.timer);this.lastSeconds=(Date.now()-pending.started)/1000;
    if(result.ok){this.warmed=true;this.update('ready');pending.resolve(result.result);}else{this.update('error');pending.reject(Error('تولید صدای اختصاصی موفق نشد.'));}
   }
  }});
  const failed=()=>{if(this.child!==child)return;this.child=null;this.ready=false;this.warmed=false;this.update('error');if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(Error('موتور صدا متوقف شد.'));this.pending=null;}};
  child.once('error',failed);child.once('exit',failed);
 }
 request(data){
  if(this.pending)return Promise.reject(Error('موتور صدا در حال آماده‌سازی درخواست قبلی است.'));
  return new Promise((resolve,reject)=>{const request={...data,id:randomUUID()};this.pending={request,resolve,reject,started:Date.now(),timer:setTimeout(()=>this.close(),180000)};if(!this.child)this.start();else if(this.ready){this.update('working');this.child.stdin.write(JSON.stringify(request)+'\n');}});
 }
 synthesize(data){return this.request({...data,action:'synthesize'});}
 warmup(){return this.warmed?Promise.resolve({warmed:true,cached:true}):this.request({action:'warmup',sample:this.sample,directory:this.directory});}
 cancel(){if(this.pending)this.close();}
 close(){const child=this.child;this.child=null;this.ready=false;this.warmed=false;if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(Error('گفتار متوقف شد.'));this.pending=null;}child?.kill('SIGTERM');if(child){const timer=setTimeout(()=>{if(child.exitCode===null&&!child.signalCode)child.kill('SIGKILL');},3000);timer.unref();}this.update('idle');}
}
