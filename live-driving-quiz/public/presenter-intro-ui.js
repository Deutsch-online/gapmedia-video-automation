let id=null,serverStart=0,localStart=0,attempt=null,clipStartedAt=0,blocked=false;
const $=id=>document.getElementById(id);
function now(){return serverStart+performance.now()-localStart;}
function play(){const video=$('presenterIntroVideo');if(!id||attempt)return;const expected=id;attempt=video.play();void attempt.then(()=>{if(id!==expected){video.pause();return;}$('presenterIntroUnlock').classList.add('hidden');}).catch(()=>{if(id===expected){$('presenterIntroUnlock').classList.remove('hidden');blocked=true;}}).finally(()=>{attempt=null;});}
export function renderPresenterIntro(state){
 const active=state.presenterIntro?.active,video=$('presenterIntroVideo'),box=$('presenterIntro');
 serverStart=state.serverTime;localStart=performance.now();
 const show=Boolean(active&&state.serverTime<active.expiresAt&&!['open','watching'].includes(state.phase));
 box.classList.toggle('hidden',!show);$('show').classList.toggle('intro-active',show);
 if(!show){id=null;video.pause();$('presenterIntroUnlock').classList.add('hidden');return;}
 if(video.getAttribute('src')!==state.presenterIntro.url)video.src=state.presenterIntro.url;
 const elapsed=Math.max(0,(now()-active.startedAt)/1000);
 clipStartedAt=active.startedAt;
 if(id!==active.id){id=active.id;blocked=false;if(video.readyState)video.currentTime=Math.min(elapsed,video.duration||30);}
 else if(video.readyState&&Math.abs(video.currentTime-elapsed)>1)video.currentTime=Math.min(elapsed,video.duration||30);
 if(!blocked&&video.paused&&elapsed<(state.presenterIntro.durationMs||30000)/1000-.1)play();
}
$('presenterIntroUnlock').addEventListener('click',()=>{const video=$('presenterIntroVideo');video.muted=false;blocked=false;play();});
$('presenterIntroVideo').addEventListener('loadedmetadata',()=>{if(id){const v=$('presenterIntroVideo');v.currentTime=Math.max(0,Math.min((now()-clipStartedAt)/1000,v.duration||30));play();}});
