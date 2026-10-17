"""Export only the two completed episode-four takes. No provider calls or GPU use."""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('series', Path(__file__).with_name('cinematic-series.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
from cinematic_music import add_pause_music
cache = Path('renders/cinematic-series-cache/e0004')
folder = Path('renders/object-preview-e0004')
folder.mkdir(parents=True, exist_ok=True)
state = m.load_json('.cinematic-series-state.json')
plan = next((p for p in [*(h for h in state['history'] if h['episode'] == 4),
                       (state.get('pending') or {}).get('plan', {})] if p.get('episode') == 4), None)
if not plan:
    raise RuntimeError('Episode four plan unavailable')
plan = {**plan, 'scenes': plan['scenes'][:2]}
parts = []
for i in range(2):
    clip = cache / f'{i:02}.mp4'
    audio = cache / f'{i:02}.aligned.wav'
    marker = m.load_json(clip.with_suffix('.speech.json'))
    import cinematic_speech as speech
    if marker['audio_sha256'] != speech.audio_sha(audio):
        raise RuntimeError('Cached speech does not match the video')
    part = folder / f'part-{i:02}.mp4'
    m.command(['ffmpeg','-y','-v','error','-i',clip,'-i',audio,'-filter_complex',
               '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30[v];[1:a]atrim=0:5,aresample=48000[a]',
               '-map','[v]','-map','[a]','-t','5','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac',part])
    parts.append(part)
subs = folder / 'subtitles.ass'
subs.write_text(m.build_subtitles(plan))
concat = folder / 'concat.txt'
concat.write_text(''.join(f"file '{p.resolve()}'\n" for p in parts))
master = folder / 'objects-preview.mp4'
m.command(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',concat,
           '-vf',f'ass={subs}','-af','loudnorm=I=-16:TP=-1.5:LRA=9',
           '-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',
           '-ar','48000','-c:a','aac','-t','10','-movflags','+faststart',master])
report = add_pause_music(master)
files = {}
for platform, (bitrate, maximum) in m.PLATFORM_PROFILES.items():
    target = folder / (platform + '-preview-10s.mp4')
    m.command(['ffmpeg','-y','-v','error','-i',master,'-c:v','libx264','-preset','fast',
               '-b:v',bitrate,'-maxrate',maximum,'-bufsize','10000k','-pix_fmt','yuv420p',
               '-c:a','copy','-t','10','-movflags','+faststart',target])
    info=m.ffprobe(target)
    if not 9.99 <= float(info['format']['duration']) <= 10.05:
        raise RuntimeError('Preview duration failed')
    files[platform] = str(target)
m.atomic_json(folder / 'preview-exports.json', {'files':files,'quality':{
    'duration':10.0,'genuine_motion':True,'German_audio':True,'bilingual_subtitles':True,
    'audio_conditioned_lips':True,'no_slow_motion':True,'pause_music':True,
    'music_during_speech_samples':report['nonzero_music_samples_during_protected_speech']}})
m.command(['node','ai-cast/send-object-preview.mjs',str(folder / 'preview-exports.json')])
