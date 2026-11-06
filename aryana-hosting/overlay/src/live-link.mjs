export function connectionIssue(error){
 const type=String(error?.name||error?.constructor?.name||'Error').replace(/[^a-zA-Z0-9_]/g,'').slice(0,60),text=(type+' '+String(error?.message||'')+' '+String(error?.cause?.message||'')).toLowerCase();
 const code=/useroffline|not live|isn't online|not online/.test(text)?'account_offline':/signatureratelimit|rate.limit|429/.test(text)?'provider_rate_limited':/signapi|signature|premiumfeature|api.key|sign error/.test(text)?'signing_service':/timeout|timed out/.test(text)?'network_timeout':/403|captcha|forbidden|blocked/.test(text)?'platform_access':'connection_failed';
 return {code,errorType:type};
}
// One owned connection, cancellable retries, and no session reset on recovery.
export class LiveLink{
 constructor({create,changed=()=>{},event=()=>{},ended=()=>{},timer=setTimeout,cancel=clearTimeout}={}){Object.assign(this,{create,changed,event,ended,timer,cancel});this.generation=0;this.client=null;this.retry=null;this.username='';this.status='disconnected';this.attempt=0;this.active=false;this.lastConnectedAt=null;this.lastIssue=null;}
 snapshot(){return {status:this.status,active:this.active,lastIssue:this.lastIssue,username:this.username,attempt:this.attempt,lastConnectedAt:this.lastConnectedAt};}
 update(status){this.status=status;this.changed(this.snapshot());}
 stop(status='disconnected'){this.active=false;this.lastIssue=null;this.generation++;if(this.retry)this.cancel(this.retry);this.retry=null;const old=this.client;this.client=null;old?.disconnect();this.attempt=0;this.update(status);}
 async start(username){if(!/^[a-zA-Z0-9_.]{2,24}$/.test(username))throw Error('یوزرنیم تیک‌تاک معتبر نیست.');this.stop();this.username=username;this.active=true;const generation=this.generation;return this.open(generation,true);}
 async open(generation,initial=false){
  if(!this.active||generation!==this.generation)return;
  this.retry=null;this.update(this.attempt?'reconnecting':'connecting');
  const client=this.create(this.username);this.client=client;
  const current=()=>this.active&&generation===this.generation&&this.client===client;
  for(const kind of ['gift','like','join','chat'])client.on(kind,data=>{if(current()&&this.status==='connected')this.event(kind,data);});
  client.on('error',()=>{});
  client.on('ended',()=>{if(!current())return;this.stop('ended');this.ended();});
  client.on('disconnected',()=>{if(current())this.schedule(generation,client);});
  try{await client.connect();if(!current()){client.disconnect();return;}this.attempt=0;this.lastIssue=null;this.lastConnectedAt=Date.now();this.update('connected');}
  catch(error){if(!current())return;this.lastIssue=connectionIssue(error);this.schedule(generation,client,Number(error?.retryAfter)||0);if(initial)throw Error('اتصال برقرار نشد؛ برنامه به‌طور خودکار دوباره تلاش می‌کند.');}
 }
 schedule(generation,client,retryAfter=0){
  if(!this.active||generation!==this.generation||this.client!==client)return;
  this.client=null;client.disconnect();this.attempt++;this.update('reconnecting');
  const delay=Math.max(Math.min(30000,2000*2**Math.min(this.attempt-1,4)),Math.min(300000,Math.max(0,retryAfter)));
  this.retry=this.timer(()=>void this.open(generation),delay);
 }
}

