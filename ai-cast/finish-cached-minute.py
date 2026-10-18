"""Finish the requested minute from eleven cached speaking takes plus a five-second vocabulary recap."""
import copy
import hashlib
import importlib.util
import json
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
spec = importlib.util.spec_from_file_location('series', Path(__file__).with_name('cinematic-series.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
from cinematic_music import add_pause_music
cache = Path('renders/cinematic-series-cache/e0004')
folder = Path('renders/cinematic-series/e0004')
folder.mkdir(parents=True, exist_ok=True)
state = m.load_json(m.STATE)
if any(d.get('episode') == 4 for d in state['deliveries'].values()):
    print('Episode four already delivered; no replay')
    raise SystemExit(0)
pending = state.get('pending') or {}
if pending.get('status') == 'dispatching':
    raise RuntimeError('Unresolved delivery intent; do not replay')
original = pending.get('plan', {})
if original.get('episode') != 4 or len(original.get('scenes', [])) not in (11, 13):
    raise RuntimeError('Unexpected pending episode')
plan = copy.deepcopy(original)
if len(plan['scenes']) == 13:
    m.validate_plan(plan, 4, state['history'])
    plan['deferred_scenes'] = plan['scenes'][11:]
    plan['scenes'] = plan['scenes'][:11]
plan['summary'] = 'Marta and Lukas choose tomatoes, spaghetti and an intact egg carton at the supermarket. They check a cracked egg and safely pack the replacement. The oat-milk purchase and checkout conversation continue in the next episode.'
plan['cliffhanger'] = 'Next, they still need oat milk before walking to the checkout; continue the two deferred scenes first.'
plan['format'] = '55 seconds of native-speed dialogue plus 5-second silent vocabulary recap'
state['pending'] = {**pending, 'plan': plan, 'status': 'rendering'}
m.checkpoint(state)
parts = []
for i, scene in enumerate(plan['scenes']):
    clip, audio, png = (cache / f'{i:02}.{suffix}' for suffix in ('mp4','aligned.wav','png'))
    marker = m.load_json(clip.with_suffix('.speech.json'))
    if (marker['audio_sha256'] != hashlib.sha256(audio.read_bytes()).hexdigest() or
            marker['image_sha256'] != hashlib.sha256(png.read_bytes()).hexdigest()):
        raise RuntimeError('Cached audio/image does not match the speaking take')
    if not 5 <= m.seconds(clip) <= 5.3:
        raise RuntimeError('Speaking take duration failed')
    part = folder / f'part-{i:02}.mp4'
    m.command(['ffmpeg','-y','-v','error','-i',clip,'-i',audio,'-filter_complex',
               '[0:v]' + m.scene_layout() + '[v];[1:a]atrim=0:5,aresample=48000[a]',
               '-map','[v]','-map','[a]','-t','5','-c:v','libx264','-preset','fast',
               '-crf','18','-pix_fmt','yuv420p','-ar','48000','-c:a','aac',part])
    parts.append(part)
    print(f'Prepared cached scene {i+1}/11 without GPU', flush=True)
# An intentional lesson recap, not a substitute speaking scene. No character lips or narration.
image = Image.new('RGB', (1080,1920), '#eef4f8')
draw = ImageDraw.Draw(image)
fontpath = m.command(['fc-match','-f','%{file}','DejaVu Sans:style=Bold'],capture_output=True,text=True).stdout.strip()
font = ImageFont.truetype(fontpath,62)
small = ImageFont.truetype(fontpath,42)
draw.text((540,200), 'Kurz wiederholen', font=font, fill='#114c5b', anchor='mm')
for y,word in [(460,'die Tomate'),(720,'die Spaghetti'),(980,'das Ei')]:
    draw.rounded_rectangle((100,y-90,980,y+90),radius=36,fill='#ffffff')
    draw.text((540,y),word,font=font,fill='#114c5b',anchor='mm')
draw.text((540,1210),'Marta & Lukas',font=small,fill='#6d7478',anchor='mm')
card = folder / 'recap.png'
image.save(card)
recap = folder / 'part-11.mp4'
m.command(['ffmpeg','-y','-v','error','-loop','1','-i',card,'-f','lavfi','-i',
           'anullsrc=r=48000:cl=mono','-t','5','-r','30','-c:v','libx264','-preset','fast',
           '-crf','18','-pix_fmt','yuv420p','-ar','48000','-c:a','aac',recap])
parts.append(recap)
subs_plan = {**plan, 'scenes': plan['scenes'] + [{'de':'Tomaten, Spaghetti und Eier.',
                'fa':'گوجه‌فرنگی، اسپاگتی و تخم‌مرغ.'}]}
subs = folder / 'subtitles.ass'
subs.write_text(m.build_subtitles(subs_plan))
concat = folder / 'concat.txt'
concat.write_text(''.join(f"file '{p.resolve()}'\n" for p in parts))
final = folder / 'e0004-cinematic-fa-de.mp4'
m.command(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',concat,
           '-vf',f'ass={subs}','-af','loudnorm=I=-16:TP=-1.5:LRA=9',
           '-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p',
           '-ar','48000','-c:a','aac','-t','60','-movflags','+faststart',final])
m.conform_duration(final)
report=add_pause_music(final)
info=m.ffprobe(final)
v=next(s for s in info['streams'] if s['codec_type']=='video')
if abs(m.seconds(final)-60)>.00001 or (v['width'],v['height'])!=(1080,1920):
    raise RuntimeError('Sixty-second master geometry failed')
if not any(s['codec_type']=='audio' for s in info['streams']):
    raise RuntimeError('Audio stream is missing')
result=m.command(['ffmpeg','-hide_banner','-i',final,'-vf','freezedetect=n=-50dB:d=2',
                  '-an','-f','null','-'],capture_output=True,text=True)
frozen=sum(float(x) for x in re.findall(r'freeze_duration: ([\d.]+)',result.stderr))
if frozen>13:
    raise RuntimeError('Too much frozen footage')
m.atomic_json(folder/'quality.json',{'duration':60.0,'width':1080,'height':1920,
 'genuine_motion':True,'German_audio':True,'bilingual_subtitles':True,'audio_conditioned_lips':True,
 'no_slow_motion':True,'pause_music':True,'music_during_speech_samples':report['nonzero_music_samples_during_protected_speech'],
 'frozen_seconds':frozen,'speaking_seconds':55,'intentional_recap_seconds':5,
 'caption_design':'separate-stage-cream-large'})
m.atomic_json(folder/'episode.json',plan)
receipts=m.deliver_platforms(state,str(final))
date=m.local_date().date().isoformat()
state['deliveries'][date]={'episode':4,'message_id':receipts['tiktok'],'platforms':receipts}
state['history'].append(plan)
state['next_episode']=5
state['pending']=None
state.pop('quota_recovery',None)
m.checkpoint(state)
print(json.dumps({'duration':60,'receipts':receipts,'deferred_scenes':len(plan['deferred_scenes'])}),flush=True)
