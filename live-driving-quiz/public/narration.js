// Complete decoded clips on one shared audio device; no per-word streaming or paid API.
export class QuestionNarrator {
 constructor({fetchAudio=(url,options)=>fetch(url,options)}={}){this.fetchAudio=fetchAudio;this.key=null;this.generation=0;this.source=null;this.pending=false;this.cache=new Map();this.status='idle';}
 stop(){this.generation++;this.controller?.abort();this.controller=null;try{this.source?.stop();}catch{}this.source=null;this.pending=false;this.status='idle';}
 update(state,ctx){
  if(!(state.narrationEnabled&&state.phase==='open'&&state.roundId)){if(this.key!==null||this.pending||this.source)this.stop();this.key=null;return;}
  const languages=state.narrationLanguage==='both'?['de','fa']:[state.narrationLanguage==='fa'?'fa':'de'];
  const id=state.question.id,key=JSON.stringify([state.roundId,id,state.narrationReplay||0,languages]);
  this.play(key,languages.map(lang=>'/narration/'+(lang==='fa'?'fa/':'')+encodeURIComponent(id)+'.wav'),ctx);
 }
 play(key,urls,ctx){
  if(this.key!==null&&this.key!==key){this.stop();this.key=null;}
  if(!ctx||ctx.state!=='running'){this.status='locked';return;}
  if(this.key===key){if(this.source)this.status='playing';return;}
  this.stop();this.key=key;this.pending=true;this.status='loading';
  const generation=this.generation,controller=new AbortController();this.controller=controller;
  void (async()=>{
   try{
    const clips=[];
    for(const url of urls){
     let audio=this.cache.get(url);
     if(!audio){let failure;
      for(let attempt=0;attempt<2;attempt++){
       if(controller.signal.aborted)throw Error('Speech cancelled');
       try{const response=await this.fetchAudio(url,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});if(!response.ok)throw Error('Speech audio unavailable');audio=await ctx.decodeAudioData(await response.arrayBuffer());failure=null;break;}catch(error){failure=error;}
      }
      if(failure)throw failure;if(generation!==this.generation)return;
      this.cache.set(url,audio);if(this.cache.size>6)this.cache.delete(this.cache.keys().next().value);
     }
     clips.push(audio);
    }
    if(generation!==this.generation)return;
    const next=index=>{
     if(generation!==this.generation)return;
     if(index>=clips.length){this.source=null;this.status='ready';return;}
     const source=ctx.createBufferSource();source.buffer=clips[index];source.connect(ctx.destination);this.source=source;this.status='playing';
     source.onended=()=>{source.disconnect();if(this.source===source){this.source=null;next(index+1);}};
     source.start(ctx.currentTime+(index===0?.08:.3));
    };
    next(0);
   }catch{if(generation===this.generation)this.status=controller.signal.aborted?'timeout':'error';}
   finally{if(generation===this.generation){this.pending=false;this.controller=null;}}
  })();
 }
}
export class WelcomeAnnouncer extends QuestionNarrator{
 update(state,ctx,{busy=false}={}){
  const welcome=state.welcome,announcement=welcome?.announcement;
  const active=welcome?.enabled&&announcement&&state.serverTime<announcement.expiresAt&&!['open','watching'].includes(state.phase)&&(state.mode==='live'&&state.connection?.status==='connected'||announcement.demo===true&&state.mode==='demo');
  if(!active){if(this.key!==null||this.pending||this.source)this.stop();this.key=null;return;}
  if(busy&&!this.source&&!this.pending)return;
  if(this.key===null&&this.lastAnnouncement===announcement.id)return;
  const language=state.narrationLanguage==='fa'?'fa':welcome.language||'both';const urls=language==='both'?['/narration/welcome-fa.wav','/narration/welcome-de.wav']:['/narration/welcome-'+language+'.wav'];
  this.play(announcement.id,urls,ctx);if(this.key===announcement.id)this.lastAnnouncement=announcement.id;
 }
}

export class AssistantAnnouncer extends QuestionNarrator{
 update(state,ctx,{busy=false}={}){
  const item=state.assistant?.active;
  const active=state.assistant?.enabled&&item&&(!item.roundId||item.roundId===state.roundId)&&state.serverTime<item.expiresAt&&!['open','watching'].includes(state.phase)&&(state.mode==='demo'||state.mode==='live'&&state.connection?.status==='connected');
  if(!active){if(this.key!==null||this.pending||this.source)this.stop();this.key=null;return;}
  if(busy&&!this.source&&!this.pending)return;
  if(this.key===null&&this.lastAnnouncement===item.id)return;
  this.play(item.id,[item.audioUrl],ctx);if(this.key===item.id)this.lastAnnouncement=item.id;
 }
}
