"""Daily cinematic German/Persian serial. Genuine 13 x 5-second shots.
State is checkpointed to GitHub before delivery; uncertain sends are never replayed.
"""
import argparse
import copy
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import textwrap
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
STATE = Path('.cinematic-series-state.json')
CONFIG = Path('.cinematic-series.json')
STYLE = ('Cinematic semi-realistic animated feature film, beautiful natural adult proportions, '
         'detailed expressive faces and hands, tactile wool and linen fabrics, subtle painted skin, '
         'vintage European village and station, teal and warm gold palette, soft volumetric morning light, '
         'rich environmental depth, elegant painterly rendering, vertical 9:16, '
         'no flat vector graphics, no stick figures, no chibi, no writing or watermarks. ')
CAST = ('Marta is the same kind elderly grandmother as the reference, round spectacles, '
        'silver hair, burgundy patterned headscarf, forest-green wool coat and leather handbag. '
        'Lukas is the same young taxi driver as the reference, wavy dark brown hair, '
        'cream linen shirt with rolled sleeves and brown trousers. The taxi is dark teal. ')
VOICES = {'marta': 'de-DE-KatjaNeural', 'lukas': 'de-DE-ConradNeural'}

def command(args, **kwargs):
    return subprocess.run([str(a) for a in args], check=True, **kwargs)

def atomic_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    tmp.replace(path)

def load_json(path, default=None):
    path = Path(path)
    if not path.exists():
        if default is None:
            raise FileNotFoundError(path)
        return copy.deepcopy(default)
    # Corrupt history must fail closed, never look like a brand-new series.
    return json.loads(path.read_text(encoding='utf-8'))

def new_state():
    return {'version': 1, 'next_episode': 1, 'deliveries': {}, 'history': [], 'pending': None, 'attempts': {}}

def local_date(now=None):
    now = now or datetime.now(timezone.utc)
    return now.astimezone(ZoneInfo('Europe/Berlin'))

def due(state, config, now=None, force=False):
    local = local_date(now)
    date = local.date().isoformat()
    if date in state['deliveries']:
        return False, 'already-delivered', date
    if (state.get('pending') or {}).get('status') == 'dispatching':
        return False, 'delivery-needs-reconciliation', date
    if state.get('attempts', {}).get(date, 0) >= config.get('max_daily_attempts', 2):
        return False, 'daily-attempt-limit', date
    if not force and local.strftime('%H:%M') < config['time']:
        return False, 'before-daily-slot', date
    return True, 'manual' if force else 'daily-slot', date

SEED_LINES = [
 ('marta', 'Guten Morgen! Fahren Sie zum Bahnhof?', 'صبح بخیر! به ایستگاه قطار می‌روید؟', 'Marta stands beside the taxi and politely asks Lukas a question; medium two shot.', 'Marta speaks and raises one hand politely; Lukas listens and nods.', 'conversation.png'),
 ('lukas', 'Ja, natürlich. Steigen Sie bitte ein.', 'بله، البته. لطفاً سوار شوید.', 'Lukas stands by the open passenger door and welcomes Marta; the seat is visible.', 'Lukas speaks and opens the passenger door wider, offering his hand.', None),
 ('marta', 'Was kostet die Fahrt?', 'کرایهٔ مسیر چقدر است؟', 'Medium close-up of Marta beside the taxi, holding her small coin purse.', 'Marta speaks, opens her purse and looks up with a questioning expression.', None),
 ('lukas', 'Normalerweise kostet sie zehn Euro.', 'معمولاً ده یورو می‌شود.', 'Medium close-up of Lukas outside the teal taxi, facing Marta just off camera.', 'Lukas speaks kindly and makes one small explanatory gesture with his open hand.', None),
 ('marta', 'Oh, ich habe nur fünf Euro dabei.', 'اوه، من فقط پنج یورو همراهم دارم.', 'Marta looks worried into her nearly empty purse beside the open taxi door.', 'Marta speaks, looks down at the coins and then looks back up at Lukas.', None),
 ('lukas', 'Kein Problem. Heute fahren Sie kostenlos.', 'اشکالی ندارد. امروز رایگان می‌روید.', 'Both characters beside the open teal taxi, Lukas gently holding out his hand to help Marta.', 'Lukas speaks with a warm smile, takes Marta\'s hand gently and nods reassuringly.', 'kindness.png'),
 ('marta', 'Wirklich? Das ist sehr freundlich von Ihnen.', 'واقعاً؟ این خیلی مهربانانه است.', 'Medium close-up of Marta, her worried expression turning into a relieved smile.', 'Marta speaks in delighted surprise, smiles and briefly lifts her free hand to her chest.', None),
 ('lukas', 'Ich helfe Ihnen mit der Tasche.', 'در برداشتن کیف کمکتان می‌کنم.', 'Lukas carefully takes Marta\'s leather handbag while she stands by the open passenger door.', 'Lukas speaks, gently lifts the handbag and moves it towards the back seat.', None),
 ('marta', 'Vielen Dank. Mein Zug fährt um zwölf Uhr.', 'خیلی ممنون. قطار من ساعت دوازده حرکت می‌کند.', 'Marta is seated comfortably in the rear of the taxi, looking towards Lukas at the driver\'s door.', 'Marta speaks, settles into the seat and looks towards the driver with a grateful smile.', None),
 ('lukas', 'Keine Sorge. Wir kommen rechtzeitig an.', 'نگران نباشید. به‌موقع می‌رسیم.', 'Interior taxi two shot with Lukas in the driver seat and Marta in the rear seat, village street outside.', 'Lukas speaks reassuringly, looks ahead and gently turns the steering wheel as the street moves outside.', None),
 ('lukas', 'Da vorne ist schon der Bahnhof.', 'ایستگاه قطار همین جلو است.', 'Taxi interior looking past Lukas towards the grand train station ahead; Marta visible in the back seat.', 'Lukas speaks and briefly points towards the station ahead, while the taxi slows smoothly.', None),
 ('marta', 'Danke! Wie kann ich mich bedanken?', 'ممنون! چطور می‌توانم از شما تشکر کنم؟', 'At the station curb, Marta looks out through the open rear window towards Lukas standing outside.', 'Marta speaks gratefully through the open window and makes a small warm gesture.', None),
 ('lukas', 'Erzählen Sie mir morgen von Ihrer Reise.', 'فردا از سفرتان برایم تعریف کنید.', 'Lukas beside the taxi and Marta at the open window, both waving goodbye at the station.', 'Lukas speaks with a friendly smile, waves gently; Marta returns the wave.', 'farewell.png'),
]

def first_episode():
    return {'episode': 1, 'title_de': 'Eine unerwartete Fahrt', 'title_fa': 'یک سفر غیرمنتظره',
            'summary': 'Marta meets Lukas, who takes her to the station free of charge. She promises to tell him about her journey tomorrow.',
            'cliffhanger': 'At the station, Marta is about to discover that her ticket is missing.',
            'scenes': [dict(speaker=s, de=d, fa=f, scene=p, motion=m, asset=a)
                       for s, d, f, p, m, a in SEED_LINES]}

def validate_plan(plan, episode, history):
    if plan.get('episode') != episode or len(plan.get('scenes', [])) != 13:
        raise ValueError('A new episode must contain exactly thirteen five-second scenes')
    for key in ('title_de', 'title_fa', 'summary', 'cliffhanger'):
        if not isinstance(plan.get(key), str) or not plan[key].strip():
            raise ValueError('Missing episode field: ' + key)
    old_lines = {s['de'].strip().lower() for h in history for s in h.get('scenes', [])}
    lines = []
    for s in plan['scenes']:
        if s.get('speaker') not in VOICES:
            raise ValueError('Unknown speaking character')
        for key in ('de', 'fa', 'scene', 'motion'):
            if not isinstance(s.get(key), str) or not s[key].strip():
                raise ValueError('Every scene needs dialogue, translation, a setting and genuine action')
            if any(x in s[key] for x in ('\n', '\r', '{', '}', '\\')):
                raise ValueError('Subtitle/control markup is not allowed')
        if len(s['de'].split()) > 12 or len(s['de']) > 105:
            raise ValueError('A line is too long for its shot')
        if not re.search(r'[\u0600-\u06ff]', s['fa']):
            raise ValueError('Persian translation is missing')
        if s.get('asset') and s['asset'] not in ('conversation.png', 'kindness.png', 'farewell.png'):
            raise ValueError('Unapproved source asset')
        if len(textwrap.wrap(s['de'], 36)) > 2 or len(textwrap.wrap(s['fa'], 40)) > 2:
            raise ValueError('Bilingual captions must fit two separate non-overlapping lines each')
        lines.append(s['de'].strip().lower())
    if len(set(lines)) != 13:
        raise ValueError('Repeated dialogue inside episode')
    if sum(l in old_lines for l in lines) >= 4:
        raise ValueError('Episode repeats too much previous dialogue')
    if any(h.get('title_de', '').lower() == plan['title_de'].lower() for h in history):
        raise ValueError('Repeated episode title')
    return plan

def request_json(url, payload, headers):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json', 'User-Agent': 'GapMedia-CinematicSeries/1.0', **headers})
    with urllib.request.urlopen(req, timeout=75) as response:
        return json.load(response)


def provider_error(exc):
    """Report useful provider diagnostics without logging credentials or URLs."""
    detail = type(exc).__name__
    if isinstance(exc, urllib.error.HTTPError):
        detail += ' HTTP ' + str(exc.code)
        try:
            body = json.loads(exc.read(16384).decode('utf-8', errors='replace'))
            error = body.get('error', {})
            if isinstance(error, dict):
                fields = [str(error[k]) for k in ('status', 'code', 'type', 'message')
                          if isinstance(error.get(k), (str, int))]
                detail += ': ' + ' | '.join(fields)
        except (ValueError, OSError, AttributeError):
            pass
    elif isinstance(exc, (ValueError, KeyError)):
        detail += ': ' + str(exc)
    # Providers sometimes echo a credential in an error message.
    for name, value in os.environ.items():
        if value and any(tag in name.upper() for tag in ('KEY', 'TOKEN', 'SECRET', 'PASSWORD')):
            detail = detail.replace(value, '[REDACTED]')
    detail = re.sub(r'https?://[^\s|]+', '[URL]', detail)
    detail = re.sub(r'(?i)(bearer\s+|key[=:]\s*)[^\s|]+', r'\1[REDACTED]', detail)
    return re.sub(r'[\x00-\x1f\x7f]', ' ', detail)[:1600]

def make_plan(state):
    episode = state['next_episode']
    if episode == 1:
        return validate_plan(first_episode(), 1, state['history'])
    memory = [{'episode': h['episode'], 'title': h['title_de'], 'summary': h['summary'],
               'cliffhanger': h['cliffhanger']} for h in state['history']]
    prompt = ('Write the NEXT episode of an ongoing warm cinematic German A1/A2 learning serial, '
              'Marta und Lukas. Same elderly grandmother Marta and young taxi driver Lukas. '
              'Continue the most recent cliffhanger, resolve a small everyday problem and finish with a new '
              'concrete cliffhanger. No violence, no repetitive generic moral, no repeated plot or dialogue. '
              'No new speaking characters; other people may appear silently. Characters can speak by phone '
              'when apart. Each scene shows a clear visible action. Preserve story continuity. '
              'Return ONLY valid JSON with episode (integer), title_de, title_fa, summary (English), '
              'cliffhanger (English), scenes (EXACTLY 13 objects). Each scene has speaker (marta or lukas), '
              'de (natural German, 4-12 words, one thought that fits under 4.4 seconds), '
              'fa (accurate natural Persian translation), scene (English visual composition with camera and '
              'location), motion (English visible action including who speaks and who listens). '
              'Never insert subtitle text into the image prompts. Do not set asset. '
              'Avoid backslashes, markup and line breaks in JSON string values. '
              f'Episode number: {episode}. Story history: ' + json.dumps(memory, ensure_ascii=False))
    errors = []
    for provider in ('gemini', 'groq'):
        try:
            if provider == 'gemini':
                key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
                if not key:
                    continue
                model = os.getenv('CINEMATIC_TEXT_MODEL', 'gemini-2.5-flash')
                r = request_json('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
                                 {'contents': [{'parts': [{'text': prompt}]}],
                                  'generationConfig': {'responseMimeType': 'application/json', 'temperature': .7}},
                                 {'x-goog-api-key': key})
                raw = ''.join(p.get('text', '') for p in r['candidates'][0]['content']['parts'])
            else:
                key = os.getenv('GROQ_API_KEY')
                if not key:
                    continue
                r = request_json('https://api.groq.com/openai/v1/chat/completions',
                                 {'model': 'llama-3.3-70b-versatile', 'messages': [{'role': 'user', 'content': prompt}],
                                  'response_format': {'type': 'json_object'}, 'temperature': .7, 'max_tokens': 5000},
                                 {'Authorization': 'Bearer ' + key})
                raw = r['choices'][0]['message']['content']
            return validate_plan(json.loads(raw), episode, state['history'])
        except Exception as exc:
            detail = provider + ': ' + provider_error(exc)
            print('Story provider failed: ' + detail, flush=True)
            errors.append(detail)
    raise RuntimeError('Story providers did not produce a valid continuing episode: ' + ', '.join(errors))

def checkpoint(state):
    atomic_json(STATE, state)
    if os.getenv('GITHUB_ACTIONS') != 'true':
        return
    command(['git', 'config', 'user.name', 'github-actions[bot]'])
    command(['git', 'config', 'user.email', 'github-actions[bot]@users.noreply.github.com'])
    command(['git', 'add', '-f', STATE])
    diff = subprocess.run(['git', 'diff', '--cached', '--quiet'])
    if diff.returncode == 0:
        return
    command(['git', 'commit', '-m', 'cinematic-series: checkpoint episode and delivery state'])
    for attempt in range(3):
        command(['git', 'pull', '--rebase', '--autostash', 'origin', 'main'])
        result = subprocess.run(['git', 'push', 'origin', 'HEAD:main'])
        if result.returncode == 0:
            return
    raise RuntimeError('Episode state could not be saved; delivery is stopped')

def ffprobe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)]))

def seconds(path):
    return float(ffprobe(path)['format']['duration'])

def subtitle_time(t):
    n = round(t * 100)
    return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'

def render(plan, config):
    # Heavy model dependencies are loaded only for an actual production run.
    sys.path.insert(0, str(ROOT / 'ai-cast'))
    import shots
    from gradio_client import handle_file
    from PIL import Image
    ep = f"e{plan['episode']:04}"
    folder = Path('renders/cinematic-series') / ep
    cache = Path('renders/cinematic-series-cache') / ep
    folder.mkdir(parents=True, exist_ok=True)
    cache.mkdir(parents=True, exist_ok=True)
    art = Path(config['reference_dir'])
    reference_signature = hashlib.sha256((art / 'kindness.png').read_bytes()).hexdigest()
    atomic_json(folder / 'episode.json', plan)
    audios = []
    for i, scene in enumerate(plan['scenes']):
        audio = cache / f'{i:02}.mp3'
        audio_sig = hashlib.sha256((scene['speaker'] + scene['de']).encode()).hexdigest()
        sigfile = cache / f'{i:02}.audio.sig'
        if not audio.exists() or not sigfile.exists() or sigfile.read_text() != audio_sig:
            command(['python3', '-m', 'edge_tts', '--voice', VOICES[scene['speaker']], '--text', scene['de'],
                     '--rate=-5%', '--write-media', audio])
            if seconds(audio) > 4.5:
                command(['python3', '-m', 'edge_tts', '--voice', VOICES[scene['speaker']], '--text', scene['de'],
                         '--rate=+3%', '--write-media', audio])
            if not .4 < seconds(audio) <= 4.5:
                raise RuntimeError(f'German narration does not fit scene {i}')
            sigfile.write_text(audio_sig)
        audios.append(audio)
    parts = []
    for i, scene in enumerate(plan['scenes']):
        png, clip = cache / f'{i:02}.png', cache / f'{i:02}.mp4'
        signature = hashlib.sha256(json.dumps([STYLE, CAST, reference_signature, scene], sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        sigfile = cache / f'{i:02}.sig'
        if not sigfile.exists() or sigfile.read_text() != signature:
            png.unlink(missing_ok=True)
            clip.unlink(missing_ok=True)
        if not png.exists():
            if scene.get('asset'):
                shutil.copyfile(art / scene['asset'], png)
            else:
                prompt = ('Keep the EXACT grandmother and young man from this reference whenever present: '
                          'identical faces, hair, clothes and ages. ' + STYLE + CAST + 'Scene: ' + scene['scene'] +
                          ' Faces and important action in upper three quarters; calm lower area for later captions.')
                def create_still():
                    return shots.first_working(shots.KONTEXT,
                        {'input_image': handle_file(str(art / 'kindness.png')), 'prompt': prompt,
                         'seed': plan['episode'] * 1009 + i * 11, 'randomize_seed': False,
                         'guidance_scale': 2.5, 'steps': 24}, 'cinematic reference edit')
                result = shots.run_free(create_still)
                Image.open(result).convert('RGB').save(png)
            # Preserve a finished still across a video-provider failure.
            sigfile.write_text(signature)
        if not clip.exists():
            job = {'id': f'{ep}-{i}', 'png': str(png), 'mp4': str(clip), 'dur': 5,
                   'motion': scene['motion'] + ' Preserve exact identity, anatomy and film lighting.',
                   'seed': plan['episode'] * 1009 + i * 11}
            shots.run_free(shots.make_clip, job)
        if not clip.exists() or seconds(clip) < 2:
            raise RuntimeError('Genuine character animation is missing; static or loop fallback is not allowed')
        part = folder / f'part-{i:02}.mp4'
        command(['ffmpeg', '-y', '-v', 'error', '-i', clip, '-i', audios[i], '-filter_complex',
                 f'[0:v]setpts={5/seconds(clip):.8f}*PTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30[v];'
                 '[1:a]adelay=250|250,apad,atrim=0:5,aresample=48000[a]', '-map', '[v]', '-map', '[a]', '-t', '5',
                 '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', part])
        parts.append(part)
        print(f'Completed scene {i+1}/13 of episode {plan["episode"]}', flush=True)
    ass = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: DE,DejaVu Sans,50,&H00A5DFFF,&H000000FF,&H00251D17,&H00251D17,0,0,0,0,100,100,0,0,1,1,0,5,65,65,0,1
Style: FA,Noto Naskh Arabic,70,&H00FFFFFF,&H000000FF,&H00251D17,&H00251D17,0,0,0,0,100,100,0,0,1,0,0,5,65,65,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    for i, scene in enumerate(plan['scenes']):
        for lang, y, width in [('de', 1615, 36), ('fa', 1760, 40)]:
            text = r'\N'.join(textwrap.wrap(scene[lang], width=width))
            ass += f'Dialogue: 0,{subtitle_time(i*5+.1)},{subtitle_time((i+1)*5)},{lang.upper()},,0,0,0,,{{\\pos(540,{y})}}{text}\n'
    subs = folder / 'subtitles.ass'
    subs.write_text(ass, encoding='utf-8')
    concat = folder / 'concat.txt'
    concat.write_text(''.join(f"file '{p.resolve()}'\n" for p in parts))
    final = folder / f'{ep}-cinematic-fa-de.mp4'
    command(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', concat,
             '-vf', f'drawbox=x=35:y=1500:w=1010:h=365:color=0x152128@0.86:t=fill,ass={subs}',
             '-af', 'loudnorm=I=-16:TP=-1.5:LRA=9', '-c:v', 'libx264', '-crf', '18', '-preset', 'fast',
             '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final])
    if final.stat().st_size > 45 * 1024 * 1024:
        smaller = folder / 'telegram-sized.mp4'
        command(['ffmpeg', '-y', '-v', 'error', '-i', final, '-c:v', 'libx264',
                 '-b:v', '4000k', '-maxrate', '4200k', '-bufsize', '8000k',
                 '-c:a', 'copy', '-movflags', '+faststart', smaller])
        smaller.replace(final)
    info = ffprobe(final)
    v = next(s for s in info['streams'] if s['codec_type'] == 'video')
    duration = seconds(final)
    if not 65 <= duration <= 65.3 or (v['width'], v['height']) != (1080, 1920):
        raise RuntimeError('Episode failed duration or frame quality requirements')
    if not any(s['codec_type'] == 'audio' for s in info['streams']):
        raise RuntimeError('German narration is missing')
    result = command(['ffmpeg', '-hide_banner', '-i', final, '-vf', 'freezedetect=n=-50dB:d=2',
                      '-an', '-f', 'null', '-'], capture_output=True, text=True)
    frozen = sum(float(x) for x in re.findall(r'freeze_duration: ([\d.]+)', result.stderr))
    if frozen > 13:
        raise RuntimeError('Episode contains too much frozen footage')
    atomic_json(folder / 'quality.json', {'duration': duration, 'width': 1080, 'height': 1920,
                'genuine_motion': True, 'German_audio': True, 'bilingual_subtitles': True, 'frozen_seconds': frozen})
    command(['ffmpeg', '-y', '-v', 'error', '-i', final, '-vf', 'fps=1/5,scale=216:-1,tile=5x3',
             '-frames:v', '1', folder / 'contact.jpg'])
    return str(final)

def bot(action, extra=''):
    result = command(['node', 'ai-cast/cinematic-series-bot.mjs', action, extra], capture_output=True, text=True)
    # The helper returns only a message id, never credentials or chat details.
    return json.loads(result.stdout.strip().splitlines()[-1])

def production(force=False):
    config = load_json(CONFIG)
    state = load_json(STATE, new_state())
    go, reason, date = due(state, config, force=force)
    if not go:
        print(json.dumps({'go': False, 'reason': reason, 'date': date}))
        return
    state['attempts'][date] = state['attempts'].get(date, 0) + 1
    checkpoint(state)
    if not (os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY') or os.getenv('GROQ_API_KEY')):
        raise RuntimeError('A continuing series needs a configured story provider (Gemini or Groq)')
    bot('verify')
    pending = state.get('pending')
    plan = pending['plan'] if pending else make_plan(state)
    validate_plan(plan, state['next_episode'], state['history'])
    state['pending'] = {'plan': plan, 'date': date, 'status': 'rendering'}
    checkpoint(state)
    try:
        final = render(plan, config)
    except Exception:
        state['pending']['status'] = 'render-failed'
        checkpoint(state)
        raise
    # This intent is durable BEFORE sendVideo. A process killed during upload
    # may have reached Telegram: never automatically send the same episode twice.
    state['pending'].update(status='dispatching', file=final)
    checkpoint(state)
    result = bot('send', final)
    if not result.get('message_id'):
        raise RuntimeError('Telegram did not confirm delivery')
    state['deliveries'][date] = {'episode': plan['episode'], 'message_id': result['message_id']}
    state['history'].append(plan)
    state['next_episode'] = plan['episode'] + 1
    state['pending'] = None
    checkpoint(state)
    print(f"Episode {plan['episode']} delivered; Telegram message {result['message_id']}", flush=True)


def main():
    os.chdir(ROOT)
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['gate', 'run', 'check'])
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    if args.action == 'check':
        validate_plan(first_episode(), 1, [])
        config = load_json(CONFIG)
        if config['minimum_seconds'] < 60 or config['target_seconds'] != 65:
            raise ValueError('Minimum episode duration must be at least one minute')
        print('Cinematic series plan and duration contract verified')
    elif args.action == 'gate':
        go, reason, date = due(load_json(STATE, new_state()), load_json(CONFIG), force=args.force)
        print(json.dumps({'go': go, 'reason': reason, 'date': date}))
        if os.getenv('GITHUB_OUTPUT'):
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write('go=' + ('true' if go else 'false') + '\n')
    else:
        production(args.force)

if __name__ == '__main__':
    main()
