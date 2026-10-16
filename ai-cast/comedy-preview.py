
"""Owner-requested short preview with redesigned large cream captions (v2)."""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('series', Path(__file__).with_name('cinematic-series.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
plan = m.load_json(m.ROOT / 'ai-cast/comedy-pilot.json')
plan['title_de'] = 'Der persönliche Assistent'
plan['scenes'] = [
 {'speaker': 'lukas', 'de': 'Mein Staubsauger macht jetzt die ganze Arbeit!',
  'fa': 'حالا جاروبرقی‌ام همهٔ کارها را انجام می‌دهد!',
  'scene': 'Wide low angle in the colorful Berlin flat. Young cartoon Lukas proudly holds the remote, Marta beside him. The teal robot vacuum drags a bright yellow sock at their feet.',
  'motion': 'Lukas speaks proudly with clear animated mouth movement, raises the remote and strikes a heroic pose. Marta raises an amused eyebrow as the vacuum darts past with the yellow sock.', 'asset': None},
 {'speaker': 'marta', 'de': 'Warum rennst du dann hinter deiner Socke her?',
  'fa': 'پس چرا دنبال جورابت می‌دوی؟',
  'scene': 'Wide full-body shot in the same Berlin living room. Marta stands by the sofa. Lukas is mid-step chasing the teal robot vacuum and its stolen yellow sock.',
  'motion': 'Marta speaks with visible mouth movement and deadpan expression. Lukas hops briskly after the robot, reaches for the sock and nearly catches it. Energetic normal-speed physical comedy, clear readable action.', 'asset': None},
 {'speaker': 'lukas', 'de': 'Ich bin nur sein persönlicher Assistent.',
  'fa': 'من فقط دستیار شخصی او هستم.',
  'scene': 'Medium-wide final punchline in the same flat. Lukas, ruffled but trying to look dignified, holds a small dustpan for the teal robot vacuum. Marta folds her arms with a delighted grin.',
  'motion': 'Lukas speaks with visible mouth movement, straightens his hoodie and gives a ridiculously formal bow to the little robot. Marta breaks into a broad laugh as the robot rolls majestically past him.', 'asset': None}
]
m.bot('verify')
master = Path(m.render(plan, m.load_json(m.CONFIG), preview=True))
quality = m.load_json(master.parent / 'quality.json')
files = {}
for platform, (bitrate, maximum) in m.PLATFORM_PROFILES.items():
    folder = master.parent / platform
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / ('wg-chaos-preview-' + platform + '.mp4')
    m.command(['ffmpeg', '-y', '-v', 'error', '-i', master,
               '-c:v', 'libx264', '-preset', 'fast', '-b:v', bitrate, '-maxrate', maximum,
               '-bufsize', '10000k', '-pix_fmt', 'yuv420p', '-c:a', 'copy',
               '-movflags', '+faststart', target])
    info = m.ffprobe(target)
    if not 15 <= float(info['format']['duration']) <= 15.3:
        raise RuntimeError('Preview duration failed')
    files[platform] = str(target)
m.atomic_json(master.parent / 'preview-exports.json', {'files': files, 'quality': quality})
m.command(['node', 'ai-cast/send-comedy-preview.mjs', str(master.parent / 'preview-exports.json')])
