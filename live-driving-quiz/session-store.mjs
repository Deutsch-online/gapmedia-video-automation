// Small private Dataset file; no paid persistent volume, no participant data.
export class SessionStore{
 constructor(env=process.env){this.repo=env.HF_SESSION_REPO;this.token=env.HF_SESSION_TOKEN;this.status=this.repo?'loading':'local';this.ready=!this.repo;this.pending=null;this.running=null;}
 async load(){
  if(!this.repo)return null;
  if(!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(this.repo)||!this.token){this.status='error';return null;}
  for(let attempt=0;attempt<3;attempt++)try{
   const r=await fetch(`https://huggingface.co/datasets/${this.repo}/resolve/main/sessions.json`,{headers:{Authorization:'Bearer '+this.token},signal:AbortSignal.timeout(10000)});
   if(!r.ok)throw Error('Unavailable');const text=await r.text();if(text.length>524288)throw Error('Oversized');const data=JSON.parse(text);if(data.version!==1)throw Error('Invalid version');this.ready=true;this.status='saved';return data;
  }catch{}
  this.status='error';return null;
 }
 queue(data){if(!this.repo)return;this.pending=JSON.stringify(data);this.status='saving';if(!this.running)this.running=this.drain().finally(()=>{this.running=null;});}
 async drain(){while(this.pending){const text=this.pending;this.pending=null;let saved=false;
   for(let attempt=0;attempt<3&&!saved;attempt++)try{
    const body=[{key:'header',value:{summary:'Save quiz session progress'}},{key:'file',value:{path:'sessions.json',content:Buffer.from(text).toString('base64'),encoding:'base64'}}].map(x=>JSON.stringify(x)).join('\n')+'\n';
    const r=await fetch(`https://huggingface.co/api/datasets/${this.repo}/commit/main`,{method:'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/x-ndjson'},body,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Save failed');await r.arrayBuffer();saved=true;
   }catch{}
   if(!saved){this.pending=this.pending||text;this.status='error';return;}
  }this.status='saved';}
 async flush(){if(!this.ready)throw Error('پیشرفت ذخیره‌شده قابل خواندن نیست؛ برای جلوگیری از تکرار، شروع جلسه متوقف است.');if(this.running)await this.running;if(this.status==='error')throw Error('ذخیرهٔ پیشرفت ناموفق بود؛ از پنل دوباره تلاش کنید.');}
 retry(data){this.queue(data);return this.flush();}
}
