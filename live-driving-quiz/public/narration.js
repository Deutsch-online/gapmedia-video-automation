// Share the unlocked Browser-source AudioContext with timer/music.
// Never request external TTS or fall back to a paid provider.
export class QuestionNarrator {
 constructor({fetchAudio=url=>fetch(url)}={}){this.fetchAudio=fetchAudio;this.key=null;this.generation=0;this.source=null;this.pending=false;}
 stop(){this.generation++;try{this.source?.stop();}catch{}this.source=null;this.pending=false;}
 update(state,ctx){
  const active=state.narrationEnabled&&state.phase==='open'&&state.roundId&&ctx?.state==='running';
  if(!active){this.stop();this.key=null;return;}
  const key=JSON.stringify([state.roundId,state.question.id,state.narrationReplay||0]);
  if(this.key===key)return;
  this.stop();this.key=key;this.pending=true;
  const generation=this.generation;
  void (async()=>{
   try{
    const response=await this.fetchAudio('/narration/'+encodeURIComponent(state.question.id)+'.wav');
    if(!response.ok)throw Error('German question audio unavailable');
    const audio=await ctx.decodeAudioData(await response.arrayBuffer());
    if(generation!==this.generation)return;
    const source=ctx.createBufferSource();source.buffer=audio;source.connect(ctx.destination);
    this.source=source;source.onended=()=>{source.disconnect();if(this.source===source)this.source=null;};source.start();
   }catch{if(generation===this.generation){const button=document.getElementById('enableMusic');if(button)button.title='Fragenstimme nicht verfügbar. Bitte Quelle neu laden oder Frage erneut vorlesen.';}}
   finally{if(generation===this.generation)this.pending=false;}
  })();
 }
}
