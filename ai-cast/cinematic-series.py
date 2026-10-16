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
from datetime import datetime, timezone, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
STATE = Path('.cinematic-series-state.json')
CONFIG = Path('.cinematic-series.json')
STYLE = ('Polished original theatrical 3D CARTOON everyday-life animation, appealing exaggerated adult cartoon proportions, '
         'large expressive eyes and eyebrows, clear readable comic silhouettes, rounded shapes, tactile colorful clothing, '
         'warm contemporary Berlin shared apartment, vibrant mustard teal and coral palette, '
         'beautiful dimensional light and rich environmental depth, vertical 9:16. '
         'Natural believable real-time everyday actions, grounded expressive facial reactions and genuine character acting. '
         'No live action, no photorealistic adults, no elderly grandmother, no vintage taxi, no flat vectors, '
         'no stick figures, no writing, no watermark. ')
CAST = ('Marta is the young adult woman on the LEFT of the reference, warm olive skin, large brown eyes, '
        'dark chestnut wavy bob, expressive eyebrows, mustard sweatshirt, teal dungarees and coral sneakers. '
        'She is a practical, friendly young adult flatmate. '
        'Lukas is the tall lanky young adult man on the RIGHT, messy copper-red quiff, turquoise round glasses, '
        'coral hoodie, navy joggers and white sneakers outdoors or soft white slippers at home. '
        'He is a friendly, ordinary young adult flatmate. '
        'They are equal adult roommates, never grandmother and taxi driver. Preserve exact reference identity. ')
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
    recovery = min(1, max(0, int(state.get('manual_recovery', {}).get(date, 0))))
    quota = state.get('quota_recovery', {})
    quota_extra = 0
    if quota and (state.get('pending') or {}).get('status') == 'render-failed':
        ready = datetime.fromisoformat(quota['not_before'])
        if ready.tzinfo is None:
            raise ValueError('Quota recovery timestamp must include timezone')
        if local < ready:
            return False, 'waiting-for-gpu-quota', date
        quota_extra = 1 if quota.get('date') == date else 0
    if state.get('attempts', {}).get(date, 0) >= config.get('max_daily_attempts', 2) + recovery + quota_extra:
        return False, 'daily-attempt-limit', date
    if not force and not quota and local.strftime('%H:%M') < config['time']:
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
    if episode >= 3:
        if plan.get('series_version') != 'wg-alltag-v1':
            raise ValueError('New episodes must belong to the 3D cartoon everyday-life series')
        if plan.get('content_basis') != 'everyday-reenactment':
            raise ValueError('Do not present an illustrative story as a documented true event')
        for key in ('visual_hook', 'everyday_problem', 'practical_resolution'):
            if not isinstance(plan.get(key), str) or len(plan[key].strip()) < 20:
                raise ValueError('Everyday stories need a concrete situation, problem and practical resolution: ' + key)
        if any(scene.get('asset') for scene in plan.get('scenes', [])):
            raise ValueError('Do not reuse the old taxi-season scene assets')
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

def groq_model(key):
    override = os.getenv('CINEMATIC_GROQ_TEXT_MODEL')
    if override:
        return override
    req = urllib.request.Request('https://api.groq.com/openai/v1/models',
                                 headers={'Authorization': 'Bearer ' + key,
                                          'User-Agent': 'GapMedia-CinematicSeries/1.0'})
    with urllib.request.urlopen(req, timeout=30) as response:
        models = {m['id'] for m in json.load(response)['data'] if m.get('active', True)}
    for candidate in ('openai/gpt-oss-120b', 'llama-3.3-70b-versatile',
                      'qwen/qwen3-32b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'):
        if candidate in models:
            return candidate
    raise ValueError('No supported German/Persian story model in the Groq model catalog')

def make_plan(state):
    episode = state['next_episode']
    if episode == 3:
        return validate_plan(load_json(ROOT / 'ai-cast/everyday-pilot.json'), episode, state['history'])
    if episode == 1:
        return validate_plan(first_episode(), 1, state['history'])
    memory = [{'episode': h['episode'], 'title': h['title_de'], 'summary': h['summary'],
               'cliffhanger': h['cliffhanger']} for h in state['history'] if h.get('series_version') == 'wg-alltag-v1']
    prompt = ('Write the NEXT 60-second German A1/A2 animated everyday-life conversation. '
              'Marta & Lukas: Alltag in Deutschland. They are ordinary young adult flatmates in Berlin. '
              'Use a familiar real-life activity: groceries, commuting, laundry, a medical appointment, '
              'cooking, housework or a practical administrative task. Natural speech and credible actions only. '
              'No invented comic accidents, slapstick, punchline, fantasy gadgets, artificial drama or moral lecture. '
              'Start with the ordinary practical situation, show the steps, and resolve one small everyday problem. '
              'These are illustrative everyday reenactments, NOT documented true events. Never claim that a specific '
              'real person experienced this or invent a source, quote, current price or legal requirement. '
              'Continue only this everyday-life series history. Do not continue the robot-vacuum comedy or taxi season. '
              'No long introductions. Both flatmates listen and respond naturally. '
              'Return ONLY valid JSON: episode (integer), title_de, title_fa, summary (English), '
              'cliffhanger (an ordinary next step, not a dramatic cliffhanger), '
              'series_version (wg-alltag-v1), series_name (Marta & Lukas: Alltag in Deutschland), '
              'content_basis (everyday-reenactment), visual_hook, everyday_problem, practical_resolution '
              '(specific credible actions in English), scenes (EXACTLY 13 objects). '
              'Each scene has speaker (marta or lukas), de (natural German, 4-12 words, under 4.4 seconds), '
              'fa (accurate natural Persian translation), scene (English composition), motion (English action). '
              'Only these two speaking characters. Silent background people are allowed. '
              'No asset field, no visible generated text in images, no markup or line breaks in JSON strings. '
              f'Episode number: {episode}. Story history: ' + json.dumps(memory, ensure_ascii=False))
    errors = []
    for provider in ('gemini', 'groq'):
        try:
            if provider == 'gemini':
                key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
                if not key:
                    continue
                model = os.getenv('CINEMATIC_TEXT_MODEL', 'gemini-3.8-flash')
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
                                 {'model': groq_model(key), 'messages': [{'role': 'user', 'content': prompt}],
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


def gpu_retry_at(message, now=None):
    now = now or datetime.now(timezone.utc)
    match = re.search(r'try again in (\d+):(\d{2}):(\d{2})', message, re.I)
    delay = timedelta(hours=5)
    if match:
        hours, minutes, seconds = map(int, match.groups())
        delay = timedelta(hours=hours, minutes=minutes, seconds=seconds)
    return now + delay + timedelta(minutes=2)

def conform_duration(path):
    """Fit the full story and all spoken lines to exactly sixty seconds."""
    path = Path(path)
    info = ffprobe(path)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    duration = float(video.get('duration') or info['format']['duration'])
    if abs(duration - 60) > .00001:
        if not 60 < duration <= 65.3:
            raise RuntimeError('Unexpected source duration; refusing to cut or pad the story')
        target = path.with_name(path.stem + '-60s.mp4')
        speed = duration / 60
        command(['ffmpeg', '-y', '-v', 'error', '-i', path,
                 '-vf', f'setpts=(PTS-STARTPTS)/{speed:.12f},fps=30',
                 '-af', f'atempo={speed:.12f},apad,atrim=duration=60',
                 '-t', '60', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
                 '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-b:a', '192k',
                 '-movflags', '+faststart', target])
        target.replace(path)
    info = ffprobe(path)
    if abs(float(info['format']['duration']) - 60) > .00001:
        # AAC at 96 kHz can leave an 8 ms tail even with -t 60.
        # Keep the already exact video and remux a 48 kHz audio track.
        target = path.with_name(path.stem + '-audio60.mp4')
        command(['ffmpeg', '-y', '-v', 'error', '-i', path, '-c:v', 'copy',
                 '-af', 'aresample=48000,atrim=duration=60', '-ar', '48000',
                 '-c:a', 'aac', '-b:a', '192k', '-t', '60',
                 '-movflags', '+faststart', target])
        target.replace(path)
        info = ffprobe(path)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    if abs(float(video['duration']) - 60) > .00001 or abs(float(info['format']['duration']) - 60) > .00001:
        raise RuntimeError('Output must be exactly sixty seconds')
    return 60.0


def caption_text(text, family, size, width=950):
    """Fit whole words to two large lines using actual font widths."""
    from PIL import ImageFont
    path = subprocess.check_output(['fc-match', '-f', '%{file}', family], text=True).strip()
    for point_size in range(size, size-11, -2):
        font = ImageFont.truetype(path, point_size)
        words = text.split()
        if font.getlength(text) <= width:
            return text, point_size
        candidates = [(' '.join(words[:i]), ' '.join(words[i:])) for i in range(1, len(words))]
        if candidates:
            pair = min(candidates, key=lambda p: max(font.getlength(p[0]), font.getlength(p[1])))
            if max(font.getlength(pair[0]), font.getlength(pair[1])) <= width:
                return r'\N'.join(pair), point_size
    if size == 64:
        font = ImageFont.truetype(path, 60)
        lines, line = [], ''
        for word in text.split():
            candidate = (line + ' ' + word).strip()
            if line and font.getlength(candidate) > width:
                lines.append(line)
                line = word
            else:
                line = candidate
        lines.append(line)
        if len(lines) <= 3:
            return r'\N'.join(lines), 60
    raise ValueError('Caption is too long for the large readable layout')

def build_subtitles(plan):
    ass = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: DE,DejaVu Sans,64,&H005B4C11,&H000000FF,&H00F8F4EE,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,5,80,80,0,1
Style: FA,Noto Naskh Arabic,92,&H00372622,&H000000FF,&H00F8F4EE,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,5,80,80,0,1
Style: CARD,DejaVu Sans,20,&H10F8F4EE,&H000000FF,&H00F8F4EE,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    def rounded(width, height, r=26):
        return (f'm {r} 0 l {width-r} 0 b {width} 0 {width} 0 {width} {r} '
                f'l {width} {height-r} b {width} {height} {width} {height} {width-r} {height} '
                f'l {r} {height} b 0 {height} 0 {height} 0 {height-r} '
                f'l 0 {r} b 0 0 0 0 {r} 0')
    for i, scene in enumerate(plan['scenes']):
        start, end = subtitle_time(i*5+.1), subtitle_time((i+1)*5)
        for lang, top, height, y, size, family, accent in [
                ('de', 1410, 160, 1490, 64, 'DejaVu Sans:style=Bold', '&H00B6A632&'),
                ('fa', 1590, 190, 1685, 92, 'Noto Naskh Arabic:style=Bold', '&H0080A3F2&')]:
            text, fitted_size = caption_text(scene[lang], family, size)
            if lang == 'de' and text.count(r'\N') == 2:
                top, height, y = 1350, 220, 1460
            ass += f'Dialogue: 0,{start},{end},CARD,,0,0,0,,{{\\an7\\pos(40,{top})\\p1}}{rounded(1000,height)}{{\\p0}}\n'
            # A slim colored tab identifies each language without a heavy black rail.
            ass += f'Dialogue: 1,{start},{end},CARD,,0,0,0,,{{\\an7\\pos(40,{top+28})\\1c{accent}\\p1}}{rounded(8,height-56,4)}{{\\p0}}\n'
            ass += f'Dialogue: 2,{start},{end},{lang.upper()},,0,0,0,,{{\\pos(540,{y})\\fs{fitted_size}}}{text}\n'
    return ass


def render(plan, config, preview=False):
    if preview and len(plan.get('scenes', [])) != 3:
        raise ValueError('A short preview must contain exactly three scenes')
    # Heavy model dependencies are loaded only for an actual production run.
    sys.path.insert(0, str(ROOT / 'ai-cast'))
    import shots
    from gradio_client import handle_file
    from PIL import Image
    ep = ('preview-' if preview else '') + f"e{plan['episode']:04}"
    folder = Path('renders/cinematic-series') / ep
    cache = Path('renders/cinematic-series-cache') / ep
    folder.mkdir(parents=True, exist_ok=True)
    cache.mkdir(parents=True, exist_ok=True)
    art = Path(config['reference_dir'])
    reference_signature = hashlib.sha256((art / 'characters.png').read_bytes()).hexdigest()
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
                prompt = ('Keep the EXACT young cartoon flatmates from this reference whenever present: '
                          'identical faces, hair, clothes and ages. ' + STYLE + CAST + 'Scene: ' + scene['scene'] +
                          ' Faces and important action in upper three quarters; calm lower area for later captions.')
                def create_still():
                    return shots.first_working(shots.KONTEXT,
                        {'input_image': handle_file(str(art / 'characters.png')), 'prompt': prompt,
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
    ass = build_subtitles(plan)
    subs = folder / 'subtitles.ass'
    subs.write_text(ass, encoding='utf-8')
    concat = folder / 'concat.txt'
    concat.write_text(''.join(f"file '{p.resolve()}'\n" for p in parts))
    final = folder / f'{ep}-cinematic-fa-de.mp4'
    command(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', concat,
             '-vf', f'ass={subs}',
             '-af', 'loudnorm=I=-16:TP=-1.5:LRA=9', '-c:v', 'libx264', '-crf', '18', '-preset', 'fast',
             '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final])
    if final.stat().st_size > 45 * 1024 * 1024:
        smaller = folder / 'telegram-sized.mp4'
        command(['ffmpeg', '-y', '-v', 'error', '-i', final, '-c:v', 'libx264',
                 '-b:v', '4000k', '-maxrate', '4200k', '-bufsize', '8000k',
                 '-c:a', 'copy', '-movflags', '+faststart', smaller])
        smaller.replace(final)
    if not preview:
        conform_duration(final)
    info = ffprobe(final)
    v = next(s for s in info['streams'] if s['codec_type'] == 'video')
    duration = seconds(final)
    duration_ok = (15 <= duration <= 15.3) if preview else abs(duration - 60) <= .00001
    if not duration_ok or (v['width'], v['height']) != (1080, 1920):
        raise RuntimeError('Episode failed duration or frame quality requirements')
    if not any(s['codec_type'] == 'audio' for s in info['streams']):
        raise RuntimeError('German narration is missing')
    result = command(['ffmpeg', '-hide_banner', '-i', final, '-vf', 'freezedetect=n=-50dB:d=2',
                      '-an', '-f', 'null', '-'], capture_output=True, text=True)
    frozen = sum(float(x) for x in re.findall(r'freeze_duration: ([\d.]+)', result.stderr))
    if frozen > (3 if preview else 13):
        raise RuntimeError('Episode contains too much frozen footage')
    atomic_json(folder / 'quality.json', {'duration': duration, 'width': 1080, 'height': 1920,
                'genuine_motion': True, 'German_audio': True, 'bilingual_subtitles': True, 'caption_design': 'cream-large-v2', 'frozen_seconds': frozen})
    command(['ffmpeg', '-y', '-v', 'error', '-i', final, '-vf', 'fps=1/5,scale=216:-1,tile=5x3',
             '-frames:v', '1', folder / 'contact.jpg'])
    return str(final)


PLATFORM_PROFILES = {'tiktok': ('4500k', '5000k'), 'instagram': ('3500k', '4000k')}

def export_platforms(master):
    master = Path(master)
    quality = load_json(master.parent / 'quality.json')
    if quality.get('duration') != 60 or not all(quality.get(k) for k in
            ('genuine_motion', 'German_audio', 'bilingual_subtitles')):
        raise RuntimeError('Platform exports require an approved sixty-second master')
    files = {}
    for platform, (bitrate, maximum) in PLATFORM_PROFILES.items():
        folder = master.parent / platform
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / (master.name.split('-')[0] + '-' + platform + '-60s.mp4')
        command(['ffmpeg', '-y', '-v', 'error', '-i', master,
                 '-vf', 'scale=1080:1920,setsar=1,fps=30',
                 '-c:v', 'libx264', '-profile:v', 'high', '-level:v', '4.2',
                 '-preset', 'fast', '-b:v', bitrate, '-maxrate', maximum, '-bufsize', '10000k',
                 '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-t', '60',
                 '-map_metadata', '-1', '-movflags', '+faststart', target])
        conform_duration(target)
        info = ffprobe(target)
        video = next(x for x in info['streams'] if x['codec_type'] == 'video')
        audio = next(x for x in info['streams'] if x['codec_type'] == 'audio')
        if (video['width'], video['height']) != (1080, 1920) or video['codec_name'] != 'h264':
            raise RuntimeError('Platform video dimensions or codec failed')
        if video['avg_frame_rate'] != '30/1' or audio['codec_name'] != 'aac':
            raise RuntimeError('Platform frame rate or audio codec failed')
        if target.stat().st_size > 45 * 1024 * 1024:
            raise RuntimeError('Platform export exceeds the private bot upload budget')
        atomic_json(folder / 'quality.json', {**quality, 'duration': 60.0, 'platform': platform,
                                             'width': 1080, 'height': 1920, 'fps': 30})
        files[platform] = str(target)
    return files

def deliver_platforms(state, master):
    pending = state['pending']
    receipts = pending.setdefault('platform_receipts', {})
    if pending.get('status') == 'dispatching':
        raise RuntimeError('An upload intent is unresolved; reconcile before any replay')
    files = export_platforms(master)
    pending['platform_files'] = files
    for platform in PLATFORM_PROFILES:
        if platform in receipts:
            continue
        pending.update(status='dispatching', file=files[platform], platform=platform)
        checkpoint(state)
        receipt = bot('send', files[platform], platform)
        if not receipt.get('message_id'):
            raise RuntimeError('Missing platform delivery receipt; do not replay')
        receipts[platform] = receipt['message_id']
        atomic_json(Path(master).parent / ('delivery-' + platform + '.json'), receipt)
        pending['status'] = 'exporting'
        checkpoint(state)
    return dict(receipts)

def bot(action, extra='', platform=''):
    try:
        result = command(['node', 'ai-cast/cinematic-series-bot.mjs', action, extra, platform], capture_output=True, text=True)
    except subprocess.CalledProcessError as exc:
        print(provider_error(ValueError((exc.stderr or 'Bot operation failed')[-2000:])), file=sys.stderr, flush=True)
        raise
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
    state['pending'] = {**(pending or {}), 'plan': plan, 'date': date, 'status': 'rendering'}
    checkpoint(state)
    try:
        final = render(plan, config)
    except Exception as exc:
        state['pending']['status'] = 'render-failed'
        if 'quota' in str(exc).lower() and state.get('quota_recovery', {}).get('date') != date:
            # One deferred continuation per day; never occupy a runner waiting for GPU credits.
            state['quota_recovery'] = {'date': date, 'not_before':
                gpu_retry_at(str(exc)).isoformat(),
                'reason': 'ZeroGPU quota exhausted'}
        checkpoint(state)
        raise
    # Complete media preparation before declaring an uncertain upload intent.
    conform_duration(final)
    quality_path = Path(final).parent / 'quality.json'
    quality = load_json(quality_path)
    quality['duration'] = 60.0
    atomic_json(quality_path, quality)
    receipts = deliver_platforms(state, final)
    state['deliveries'][date] = {'episode': plan['episode'],
                                 'message_id': receipts['tiktok'], 'platforms': receipts}
    state['history'].append(plan)
    state['next_episode'] = plan['episode'] + 1
    state['pending'] = None
    checkpoint(state)
    print(f"Episode {plan['episode']} delivered in both formats: {receipts}", flush=True)


def main():
    os.chdir(ROOT)
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['gate', 'run', 'check', 'conform'])
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--file')
    args = parser.parse_args()
    if args.action == 'conform':
        if not args.file:
            raise ValueError('A video file is required')
        duration = conform_duration(args.file)
        quality_path = Path(args.file).parent / 'quality.json'
        quality = load_json(quality_path)
        quality['duration'] = duration
        atomic_json(quality_path, quality)
        return
    if args.action == 'check':
        validate_plan(first_episode(), 1, [])
        config = load_json(CONFIG)
        if config['minimum_seconds'] != 60 or config.get('maximum_seconds') != 60 or config['target_seconds'] != 60:
            raise ValueError('Every episode must be exactly sixty seconds')
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
