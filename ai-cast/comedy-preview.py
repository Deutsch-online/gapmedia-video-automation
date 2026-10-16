
"""Everyday-life preview with actual audio-conditioned lip movement and natural-speed acting."""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('series', Path(__file__).with_name('cinematic-series.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
plan = m.load_json(m.ROOT / 'ai-cast/everyday-pilot.json')
plan['title_de'] = 'Die Einkaufstasche'
plan['scenes'] = [
 {'speaker': 'marta', 'de': 'Ich habe die Einkaufstasche zu Hause vergessen.',
  'fa': 'ساک خرید را در خانه فراموش کرده‌ام.',
  'scene': 'Only young cartoon Marta is visible in a medium waist-up shot at a modern Berlin supermarket entrance. Her open handbag and hands are visible. Lukas is entirely off-camera. One face only, clearly visible mouth.',
  'motion': 'Marta speaks naturally while briefly checking her open handbag, then looks up toward her flatmate off-camera. Small believable hand movement, normal breathing and blinking. No exaggerated reaction.', 'asset': None},
 {'speaker': 'lukas', 'de': 'Dann nehmen wir nur das Nötigste mit.',
  'fa': 'پس فقط چیزهای ضروری را می‌گیریم.',
  'scene': 'Only young cartoon Lukas with copper hair and turquoise glasses is visible, medium waist-up at the same supermarket entrance. He holds a small empty shopping basket. Marta stays entirely off-camera. One clear unobstructed face.',
  'motion': 'Lukas replies calmly and gestures once with an open hand toward the basket, then nods slightly toward Marta off-camera. Natural speech, blinking and gentle posture shift, no comic acting.', 'asset': None},
 {'speaker': 'marta', 'de': 'Ich nehme die Eier. Du trägst die Milch.',
  'fa': 'من تخم‌مرغ‌ها را می‌برم. تو شیر را ببر.',
  'scene': 'Only young cartoon Marta is visible, medium waist-up near the supermarket exit. She carefully holds a closed egg carton at chest height. Lukas and the milk are off-camera. One unobstructed speaking face, hands and carton visible.',
  'motion': 'Marta speaks with a friendly practical expression, carefully adjusts her grip on the egg carton and gives a small nod toward her flatmate off-camera. Believable subtle full-body motion, no slow motion.', 'asset': None}
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
