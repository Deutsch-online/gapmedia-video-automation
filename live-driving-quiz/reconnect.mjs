// Bounded anonymous/free connection attempts. No signing key or paid fallback.
export class LiveReconnect{
 constructor({enabled=false,now=()=>Date.now()}={}){this.now=now;this.enabled=enabled;this.attempts=0;this.nextAt=enabled?now()+5000:null;this.room=null;}
 enable(){this.enabled=true;this.attempts=0;this.nextAt=this.now();}
 disable(){this.enabled=false;this.nextAt=null;this.attempts=0;}
 due({connecting,connected}){return this.enabled&&!connecting&&!connected&&this.nextAt!==null&&this.now()>=this.nextAt;}
 failed(reason){if(!this.enabled)return;this.attempts++;const delay=reason==='rate_limit'?300000:Math.min(120000,15000*2**Math.min(this.attempts-1,3));this.nextAt=this.now()+delay;}
 connected(room){const changed=Boolean(this.room&&room&&this.room!==String(room));if(room)this.room=String(room);this.attempts=0;this.nextAt=null;return changed;}
 snapshot(){return {autoReconnect:this.enabled,retryAt:this.nextAt,retryAttempt:this.attempts};}
}
