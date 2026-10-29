'use strict';
(()=>{
 const player=new Audio();player.preload='auto';
 let packPromise,settings={},busy=false,blocked=false,activated=false,cooldown=0,watchdog,pendingName='',utterance,playToken=0;
 const report=(status,detail='')=>window.dispatchEvent(new CustomEvent('race-audio-state',{detail:{status,detail,voice:settings.voiceStyle||'warm'}}));
 function pack(){if(!packPromise)packPromise=fetch('/audio/voices.json?v=2').then(r=>{if(!r.ok)throw Error('voice-pack');return r.json()}).catch(e=>{packPromise=null;throw e});return packPromise}
 function finish(){clearTimeout(watchdog);busy=false;report(settings.sound?'ready':'muted');if(pendingName){const name=pendingName;pendingName='';setTimeout(()=>speakName(name),80)}}
 player.onended=finish;player.onerror=()=>{clearTimeout(watchdog);busy=false;cooldown=Date.now()+10000;report('error','clip-playback-error')};
 async function playClip(key,{force=false}={}){
  if(!force&&window.RaceHost?.busy)return false;
  if(!force&&(!settings.sound||busy||blocked||Date.now()<cooldown))return false;
  if(force)stop();const token=++playToken;busy=true;report('loading');
  try{const data=await pack(),voice=data.voices[settings.voiceStyle]||data.voices.warm;const src=voice.clips[key]||voice.clips.mixed;
   if(token!==playToken)return false;if(!force&&!settings.sound){busy=false;return false}player.src=src;player.volume=Math.max(0,Math.min(1,(settings.volume??50)/100));player.currentTime=0;
   await player.play();if(token!==playToken)return false;blocked=false;activated=true;report('playing',voice.name);clearTimeout(watchdog);watchdog=setTimeout(()=>{if(busy){player.pause();busy=false;cooldown=Date.now()+5000;report('error','playback-timeout')}},45000);return true;
  }catch(e){if(token!==playToken)return false;busy=false;blocked=e.name==='NotAllowedError';cooldown=Date.now()+10000;report(blocked?'blocked':'error',blocked?'click-enable-sound':e.message==='voice-pack'?'voice-pack-unavailable':'audio-play-failed');return false}
 }
 function stop(){playToken++;clearTimeout(watchdog);player.pause();player.currentTime=0;pendingName='';if('speechSynthesis'in window)speechSynthesis.cancel();busy=false}
 function cleanName(name){return String(name||'').normalize('NFKC').replace(/[^\p{L}\p{M}\s]/gu,' ').replace(/\s+/g,' ').trim().slice(0,40)}
 async function speakName(name){name=cleanName(name);if(!name)return false;if(!settings.sound||!settings.welcomeVoice)return false;if(busy){pendingName=String(name).slice(0,40);return false}if(blocked)return false;if(!('speechSynthesis'in window)){report('ready','name-voice-unavailable');return false}
  let voices=speechSynthesis.getVoices();if(!voices.length)voices=await new Promise(resolve=>{const done=()=>{clearTimeout(timer);speechSynthesis.removeEventListener('voiceschanged',done);resolve(speechSynthesis.getVoices())},timer=setTimeout(done,1500);speechSynthesis.addEventListener('voiceschanged',done,{once:true})});
  const persian=settings.voiceStyle==='persian'||/[\u0600-\u06ff]/.test(name);const female=persian?voices.find(v=>/^fa(?:-|_)/i.test(v.lang)&&/dilara|female|زن/i.test(v.name))||voices.find(v=>/^fa(?:-|_)/i.test(v.lang)):voices.find(v=>/samantha|victoria|zira|aria|jenny|susan|karen|moira|tessa|fiona|ava\b|allison|joanna|female|hazel|sara|sonia|natasha/i.test(v.name)&&/^en/i.test(v.lang));
  if(!female){report('ready','name-voice-unavailable');return false}if(busy){pendingName=name;return false}busy=true;utterance=new SpeechSynthesisUtterance(String(name).slice(0,40));utterance.voice=female;utterance.lang=female.lang;utterance.rate=.9;utterance.pitch=1.05;utterance.volume=(settings.volume??50)/100;utterance.onstart=()=>report('playing','name-welcome');utterance.onend=finish;utterance.onerror=e=>{busy=false;report(e.error==='not-allowed'?'blocked':'error',e.error||'name-voice-failed')};speechSynthesis.speak(utterance);watchdog=setTimeout(()=>{speechSynthesis.cancel();finish()},12000);return true;
 }
 function configure(next){const changed=settings.voiceStyle&&settings.voiceStyle!==next.voiceStyle,muted=settings.sound&&!next.sound;settings={...next};if(changed||muted)stop();if(muted)report('muted')}
 window.RaceVoice={configure,playClip,speakName,cleanName,stop,unlock(){activated=true;blocked=false;cooldown=0;report('ready');return true},get busy(){return busy},get blocked(){return blocked},get activated(){return activated}};
 pack().catch(()=>report('error','voice-pack-unavailable'));document.addEventListener('pointerdown',()=>{if(blocked)window.RaceVoice.unlock()});
})();
