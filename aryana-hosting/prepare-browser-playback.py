"""Re-encode existing media for browsers on CPU; never generate or purchase."""
import hashlib,json,re,subprocess
from pathlib import Path

root=Path('aryana-hosting');manifest_path=root/'assets.json';manifest=json.loads(manifest_path.read_text())
video=root/'assets'/manifest['files']['public/assets/idle.mp4']['file']
assert hashlib.sha256(video.read_bytes()).hexdigest()==manifest['files']['public/assets/idle.mp4']['sha256']
def probe(path):
 d=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_streams','-show_format','-of','json',str(path)]));return d['streams'][0],d['format']
before,before_format=probe(video)
ready=before.get('pix_fmt')=='yuv420p' and before.get('color_range')=='tv' and before.get('profile')=='Main'
if not ready:
 temp=Path('/tmp/aryana-browser-compatible.mp4')
 matrix='bt601' if before.get('color_space') in ['bt470bg','smpte170m',None] else 'bt709'
 source_range='pc' if before.get('color_range')=='pc' or before.get('pix_fmt','').startswith('yuvj') else 'tv'
 vf='scale=in_range='+source_range+':out_range=tv:in_color_matrix='+matrix+':out_color_matrix=bt709,setsar=1'
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(video),'-vf',vf,'-an','-c:v','libx264','-preset','medium','-crf','21','-maxrate','1800k','-bufsize','3600k','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart',str(temp)],check=True)
 after,after_format=probe(temp)
 assert after['codec_name']=='h264' and after['profile']=='Main' and after['pix_fmt']=='yuv420p' and after['color_range']=='tv'
 assert after['width']==before['width'] and after['height']==before['height'] and after['nb_frames']==before['nb_frames']
 assert abs(float(after_format['duration'])-float(before_format['duration']))<0.05
 temp.replace(video)
else:after,after_format=before,before_format
digest=hashlib.sha256(video.read_bytes()).hexdigest();version=digest[:16]
manifest['files']['public/assets/idle.mp4']['sha256']=digest
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
for name in ['overlay/src/server.mjs','overlay/public/live.js','overlay/public/live.html']:
 p=root/name;s=p.read_text();s,count=re.subn(r'/assets/idle\.mp4\?v=[A-Za-z0-9_-]+','/assets/idle.mp4?v='+version,s)
 assert count>0,name
 if name.endswith('live.html'):
  s=re.sub(r'/live\.js\?v=[A-Za-z0-9_-]+','/live.js?v='+version,s)
  s=re.sub(r'href="/style\.css(?:\?v=[A-Za-z0-9_-]+)?"','href="/style.css?v='+version+'"',s)
 p.write_text(s)
request_path=root/'live-entry-hotfix-request.json';request=json.loads(request_path.read_text())
request.update(request='browser-video-range-and-autoplay-recovery-v1',video_only=True,motion_release=True,playback_compatibility=True,on_air_test_speech=False)
request_path.write_text(json.dumps(request,indent=2)+'\n')
report={'status':'prepared','generation_calls':0,'duration':float(after_format['duration']),'sha256':digest,'version':version,'bytes':video.stat().st_size,'codec':after['codec_name'],'profile':after['profile'],'pixel_format':after['pix_fmt'],'color_range':after['color_range']}
(root/'playback-release.json').write_text(json.dumps(report,indent=2)+'\n');print('ARYANA_PLAYBACK_RELEASE '+json.dumps(report),flush=True)
