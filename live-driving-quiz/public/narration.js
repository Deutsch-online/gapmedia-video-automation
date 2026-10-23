// Fully buffered speech on the same audio device/context as the LIVE source.
// A suspended device pauses Web Audio itself: do not restart the sentence.
export class QuestionNarrator {
 constructor({fetchAudio=(url,options)=>fetch(url,options)}={}){this.fetchAudio=fetchAudio;this.key=null;this.generation=0;this.source=null;this.pending=false;this.cache=new Map();this.status='idle';}
 stop(){this.generation++;this.controller?.abort();this.controller=null;try{this.source?.stop();}catch{}this.source=null;this.pending=false;this.status='idle';}
 update(state,ctx){
  const active=state.narrationEnabled&&state.phase==='open'&&state.roundId;
  if(!active){if(this.key!==null||this.pending||this.source)this.stop();this.key=null;return;}
  // Keep an already scheduled/playing source intact on device interruptions.
  // It resumes at the same sample when the shared AudioContext resumes.
  const key=JSON.stringify([state.roundId,state.question.id,state.narrationReplay||0]);
  if(this.key!==null&&this.key!==key){this.stop();this.key=null;}
  if(!ctx||ctx.state!=='running'){this.status='locked';return;}
  if(this.key===key){if(this.source)this.status='playing';return;}
  this.stop();this.key=key;this.pending=true;this.status='loading';
  const generation=this.generation,id=state.question.id;
  const controller=new AbortController();this.controller=controller;
  void (async()=>{
   try{
    let audio=this.cache.get(id);
    if(!audio){
     // A short network hiccup gets one bounded free retry; no per-word streaming.
     let failure;
     for(let attempt=0;attempt<2;attempt++){
      if(controller.signal.aborted)throw Error('German audio request cancelled');
      const deadline=setTimeout(()=>controller.abort(),15000);
      try{
       const response=await this.fetchAudio('/narration/'+encodeURIComponent(id)+'.wav',{signal:controller.signal});
       if(!response.ok)throw Error('German question audio unavailable');
       audio=await ctx.decodeAudioData(await response.arrayBuffer());failure=null;break;
      }catch(error){failure=error;}finally{clearTimeout(deadline);}
     }
     if(failure)throw failure;
     if(generation!==this.generation)return;
     this.cache.set(id,audio);if(this.cache.size>4)this.cache.delete(this.cache.keys().next().value);
    }
    if(generation!==this.generation)return;
    const source=ctx.createBufferSource();source.buffer=audio;source.connect(ctx.destination);
    this.source=source;this.status='playing';
    source.onended=()=>{source.disconnect();if(this.source===source){this.source=null;this.status='ready';}};
    // Playback latency hint and a small scheduling lead absorb busy UI frames.
    source.start(ctx.currentTime+.08);
   }catch{if(generation===this.generation)this.status=controller.signal.aborted?'timeout':'error';}
   finally{if(generation===this.generation){this.pending=false;this.controller=null;}}
  })();
 }
}
