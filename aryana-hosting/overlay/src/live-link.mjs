// One owned connection, cancellable retries, and no session reset on recovery.
export class LiveLink{
 constructor({create,changed=()=>{},event=()=>{},ended=()=>{},timer=setTimeout,cancel=clearTimeout}={}){Object.assign(this,{create,changed,event,ended,timer,cancel});this.generation=0;this.client=null;this.retry=null;this.username='';this.status='disconnected';this.attempt=0;this.active=false;this.lastConnectedAt=null;}
 snapshot(){return {status:this.status,username:this.username,attempt:this.attempt,lastConnectedAt:this.lastConnectedAt};}
 update(status){this.status=status;this.changed(this.snapshot());}
 stop(status='disconnected'){this.active=false;this.generation++;if(this.retry)this.cancel(this.retry);this.retry=null;const old=this.client;this.client=null;old?.disconnect();this.attempt=0;this.update(status);}
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
  try{await client.connect();if(!current()){client.disconnect();return;}this.attempt=0;this.lastConnectedAt=Date.now();this.update('connected');}
  catch{if(!current())return;this.schedule(generation,client);if(initial)throw Error('اتصال برقرار نشد؛ برنامه به‌طور خودکار دوباره تلاش می‌کند.');}
 }
 schedule(generation,client){
  if(!this.active||generation!==this.generation||this.client!==client)return;
  this.client=null;client.disconnect();this.attempt++;this.update('reconnecting');
  const delay=Math.min(30000,2000*2**Math.min(this.attempt-1,4));
  this.retry=this.timer(()=>void this.open(generation),delay);
 }
}
