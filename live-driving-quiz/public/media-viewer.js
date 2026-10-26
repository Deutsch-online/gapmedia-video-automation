const $=id=>document.getElementById(id);
const viewport=$('mediaViewport');let questionId,zoom=1,x=0,y=0,placeholder;
const pointers=new Map();let gesture;
const dialog=document.createElement('dialog');dialog.className='media-dialog';dialog.setAttribute('aria-label','Originalmedium vergrößern');
dialog.innerHTML='<div class="media-dialog-head"><b>Original · FahrFit LIVE</b><button type="button" data-view="close" aria-label="Vergrößerung schließen">Schließen ×</button></div><div class="media-dialog-stage"></div><div class="media-dialog-tools"><button type="button" data-view="out" aria-label="Verkleinern">−</button><output class="zoom-value">100%</output><button type="button" data-view="in" aria-label="Vergrößern">+</button><button type="button" data-view="reset">Zurücksetzen</button><button type="button" data-view="fullscreen">Vollbild</button><a class="original-link" target="_blank" rel="noopener noreferrer">Original öffnen ↗</a></div><p class="viewer-hint">Ziehen / zwei Finger zum Zoomen · Die Antwortzeit läuft weiter.</p>';
document.body.append(dialog);
function apply(){
 const width=viewport.clientWidth,height=viewport.clientHeight;x=Math.max(-width*(zoom-1)/2,Math.min(width*(zoom-1)/2,x));y=Math.max(-height*(zoom-1)/2,Math.min(height*(zoom-1)/2,y));
 viewport.style.setProperty('--media-zoom',zoom);viewport.style.setProperty('--media-x',x+'px');viewport.style.setProperty('--media-y',y+'px');
 for(const o of document.querySelectorAll('.zoom-value'))o.textContent=Math.round(zoom*100)+'%';viewport.classList.toggle('zoomed',zoom>1);
}
function setZoom(next){zoom=Math.max(1,Math.min(4,next));if(zoom===1)x=y=0;apply();}
function close(){if(!dialog.open)return;if(document.fullscreenElement===dialog)void document.exitFullscreen().catch(()=>{});dialog.close();restore();}
function restore(){if(placeholder){placeholder.replaceWith(viewport);placeholder=null;}$('bankVideo').controls=false;setZoom(1);pointers.clear();gesture=null;}
function open(){if(dialog.open)return;placeholder=document.createElement('div');placeholder.style.height=viewport.offsetHeight+'px';viewport.before(placeholder);dialog.querySelector('.media-dialog-stage').append(viewport);dialog.showModal();$('bankVideo').controls=!$('bankVideo').classList.contains('hidden');setZoom(1);}
export function controlMedia(action,value){if(action==='height'){const height=Number(value);if(Number.isFinite(height)&&height>=220&&height<=700)viewport.style.setProperty('--question-media-height',height+'px');return;}if(['in','out','reset'].includes(action))command(action);}
function command(action){if(action==='in')setZoom(zoom+.25);if(action==='out')setZoom(zoom-.25);if(action==='reset')setZoom(1);if(action==='open')open();if(action==='close')close();if(action==='fullscreen'){if(document.fullscreenElement===dialog)void document.exitFullscreen().catch(()=>{});else void dialog.requestFullscreen?.().catch(()=>{});}}
for(const root of [$('mediaTools'),dialog])root.addEventListener('click',e=>{const button=e.target.closest('[data-view]');if(button)command(button.dataset.view);});
dialog.addEventListener('close',restore);dialog.addEventListener('cancel',()=>{if(document.fullscreenElement===dialog)void document.exitFullscreen().catch(()=>{});});
viewport.tabIndex=0;viewport.setAttribute('aria-label','Bild oder Video: mit Plus vergrößern und ziehen');
viewport.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom+(e.deltaY<0?.15:-.15));},{passive:false});
viewport.addEventListener('click',()=>{if(!dialog.open&&zoom===1)open();});
viewport.addEventListener('dblclick',()=>setZoom(zoom>1?1:2));
viewport.addEventListener('pointerdown',e=>{
 if(e.target.tagName==='VIDEO'&&e.target.controls&&e.offsetY>e.target.clientHeight-48)return;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});viewport.setPointerCapture(e.pointerId);const points=[...pointers.values()];gesture={zoom,x,y,points};if(points.length===2)gesture.distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
});
viewport.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const points=[...pointers.values()];
 if(points.length===2&&gesture.distance){setZoom(gesture.zoom*Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y)/gesture.distance);}
 else if(points.length===1&&zoom>1){const scale=viewport.getBoundingClientRect().width/viewport.clientWidth;x=gesture.x+(e.clientX-gesture.points[0].x)/scale;y=gesture.y+(e.clientY-gesture.points[0].y)/scale;apply();}
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(event,e=>{pointers.delete(e.pointerId);gesture=null;});
viewport.addEventListener('keydown',e=>{if(['+','=','-','0'].includes(e.key)){e.preventDefault();command(e.key==='-'?'out':e.key==='0'?'reset':'in');}});
for(const [id,event] of [['bankImage','load'],['bankVideo','loadedmetadata']])$(id).addEventListener(event,quality);
function quality(){const video=!$('bankVideo').classList.contains('hidden'),media=$(video?'bankVideo':'bankImage'),w=video?media.videoWidth:media.naturalWidth,h=video?media.videoHeight:media.naturalHeight;$('mediaQuality').textContent=w&&h?'Original '+w+' × '+h:'Original';}
export function renderMediaViewer(state){
 if(questionId!==state.question.id){close();questionId=state.question.id;setZoom(1);}
 const src=state.question.video||state.question.image;dialog.querySelector('.original-link').href=src||'#';quality();
}
