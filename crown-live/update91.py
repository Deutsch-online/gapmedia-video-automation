from pathlib import Path
root=Path('/tmp/crown91')
p=root/'public/supporters.mjs';s=p.read_text();s=s.replace("userId:String(event.userId||u.userId||u.id||'')", "userId:String([event.userId,u.userId,u.idStr,u.id,event.uniqueId,u.uniqueId,u.displayId,u.secUid].find(v=>v!==undefined&&v!==null&&!['','0','undefined','null'].includes(String(v).trim()))||'')")
p.write_text(s)
p=root/'public/math-duel.mjs';s=p.read_text().replace('=90','=91').replace('!==90','!==91').replace('version:90','version:91')
a=s.index('function speak(');b=s.index('\nexport function mathState',a)
s=s[:a]+'''function speak(s,text,kind,now){
 if(!text||s.voiceEnabled===false)return;
 s.voiceSerial=(s.voiceSerial||0)+1;const item={id:`voice:${s.voiceSerial}:${now}`,text,kind,language:s.language||'en',until:now+Math.min(19000,Math.max(4500,text.length*70)),question:s.serial};
 s.voiceQueue=(s.voiceQueue||[]).filter(x=>x.kind!=='question');
 if(kind==='question'&&(!s.voice||s.voice.until<=now||s.voice.kind==='question')){s.voice=item;return;}
 if(s.voiceQueue.length>=12)return;
 s.voiceQueue.push(item);
 if(!s.voice||s.voice.until<=now){s.voice=s.voiceQueue.shift();s.voice.until=now+Math.min(19000,Math.max(4500,s.voice.text.length*70));}
}
''' +s[b:]
s=s.replace("if(s.version!==91){s.version=91;", "if(s.version!==91){s.version=91;for(const key of ['viewerProfiles','waiting','welcomed','supporterProfiles','engagementThanks','realActive'])if(s[key])delete s[key]['0'];s.players=(s.players||[]).filter(p=>p.id!=='0');")
s=s.replace("const d=normalizeLiveEvent(raw);mathTick(s,now);const id=String(d.userId||d.uniqueId||'');if(!id||id.startsWith('demo:'))", "const d=normalizeLiveEvent(raw);mathTick(s,now);const id=String(d.userId||d.uniqueId||'');if(!id||id==='0'||id.startsWith('demo:'))")
p.write_text(s)
p=root/'public/math-duel-ui.mjs';s=p.read_text().replace('v=90','v=91').replace('math90','math91');a=s.index('function playVoice(');b=s.index('\nfunction setMonitor',a)
s=s[:a]+'''const pendingVoices=[];let voicePlaying=false;
function clearPlayback(){pendingVoices.length=0;voicePlaying=false;audio?.pause();audio=null;activeVoiceId='';}
function playVoice(v){
 if(!v||!audioEnabled||mutedPreview||blockedAudio||seenVoice.has(v.id)||pendingVoices.some(x=>x.id===v.id)||(screen&&(latest?.outputVolume??.85)===0))return;
 if(v.kind==='question')for(let i=pendingVoices.length-1;i>=0;i--)if(pendingVoices[i].kind==='question')pendingVoices.splice(i,1);
 if(pendingVoices.length<12)pendingVoices.push({...v,queuedAt:Date.now()});
 drainVoice();
}
function drainVoice(){
 if(voicePlaying||!audioEnabled||mutedPreview||blockedAudio)return;
 while(pendingVoices.length){
  const v=pendingVoices.shift();if(seenVoice.has(v.id)||(v.kind==='question'&&v.question!==latest?.serial)||Date.now()-v.queuedAt>60000)continue;
  voicePlaying=true;activeVoiceId=v.id;seenVoice.add(v.id);const clip=new Audio(v.url);audio=clip;clip.volume=screen?(latest?.outputVolume??.85):monitorVolume;
  const finish=error=>{if(audio!==clip)return;voicePlaying=false;audio=null;activeVoiceId='';if(!screen)$('voiceStatus').textContent=t(error?'audioUnavailable':'panelListening');drainVoice();};
  clip.onended=()=>finish(false);clip.onerror=()=>finish(true);
  clip.play().then(()=>{if(audio!==clip||!audioEnabled){clip.pause();return;}$('screenAudioUnlock').hidden=true;if(!screen)$('voiceStatus').textContent=t('panelListening');}).catch(e=>{if(audio!==clip)return;if(e.name==='NotAllowedError'){blockedAudio=true;seenVoice.delete(v.id);pendingVoices.unshift(v);voicePlaying=false;audio=null;if(screen&&!mutedPreview)$('screenAudioUnlock').hidden=false;else $('voiceStatus').textContent=t('audioBlocked');}else finish(true);});
  if(seenVoice.size>250)seenVoice.delete(seenVoice.values().next().value);return;
 }
}
''' +s[b:]
s=s.replace("if(!enabled)audio?.pause();", "if(!enabled)clearPlayback();")
s=s.replace("if(!s.voiceEnabled||s.phase==='paused'){audio?.pause()}", "if(!s.voiceEnabled||s.phase==='paused'){clearPlayback()}")
s=s.replace("audioUnavailable:'Natural voice unavailable or daily allowance reached'", "audioUnavailable:'Audio could not play; trying the next announcement'")
p.write_text(s)
for f in ['server.mjs','public/math-duel.html']:
 p=root/f;s=p.read_text().replace('mathVersion:90','mathVersion:91').replace('mathPanelVersion:90','mathPanelVersion:91').replace('math90','math91').replace('v=90','v=91');p.write_text(s)
print('91 patched')
p=root/'public/math-duel.mjs';s=p.read_text().replace('>=91000','>=90000').replace("s.voiceQueue=(s.voiceQueue||[]).filter(x=>x.kind!=='question');", "s.voiceQueue??=[];if(kind==='question')s.voiceQueue=s.voiceQueue.filter(x=>x.kind!=='question');")
s=s.replace("s.finishedAt=now;s.voice=null;s.voiceQueue=[];return true;", "s.finishedAt=now;if(s.voice?.kind==='question')s.voice=null;s.voiceQueue=(s.voiceQueue||[]).filter(v=>v.kind!=='question');return true;")
p.write_text(s)
p=root/'public/math-duel-ui.mjs';s=p.read_text().replace("v.kind==='question'&&v.question!==latest?.serial", "v.kind==='question'&&(v.question!==latest?.serial||['finished','exhausted'].includes(latest?.phase))");p.write_text(s)
