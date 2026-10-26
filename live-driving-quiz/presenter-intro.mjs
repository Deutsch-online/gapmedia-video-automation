import {randomUUID} from 'node:crypto';
export class PresenterIntro{
 constructor({now=()=>Date.now(),durationMs=30000}={}){this.now=now;this.durationMs=durationMs;this.active=null;}
 start(){const startedAt=this.now();this.active={id:randomUUID(),startedAt,expiresAt:startedAt+this.durationMs};return this.active;}
 stop(){this.active=null;}
 snapshot(){if(this.active&&this.now()>=this.active.expiresAt)this.active=null;return {durationMs:this.durationMs,url:'/presenter/lesson-intro.mp4',active:this.active};}
 busy(){return Boolean(this.snapshot().active);}
}
