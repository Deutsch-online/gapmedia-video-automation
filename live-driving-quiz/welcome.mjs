import {randomUUID} from 'node:crypto';
export class WelcomeCycle{
 constructor({now=()=>Date.now(),interval=120000}={}){this.now=now;this.interval=interval;this.dueAt=null;this.announcement=null;}
 tick({connected,enabled,phase,durationMs}){
  const now=this.now();if(!connected||!enabled){this.dueAt=null;this.announcement=null;return null;}
  this.dueAt??=now+this.interval;
  if(this.announcement&&now>=this.announcement.expiresAt)this.announcement=null;
  if(now<this.dueAt||['open','watching'].includes(phase))return null;
  this.announcement={id:randomUUID(),at:now,expiresAt:now+durationMs+2000};this.dueAt=now+this.interval;return this.announcement;
 }
 demo(durationMs){return this.announcement={id:randomUUID(),at:this.now(),expiresAt:this.now()+durationMs+2000,demo:true};}
}
