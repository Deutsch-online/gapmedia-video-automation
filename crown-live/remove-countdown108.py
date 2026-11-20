from pathlib import Path
import re

def replace_once(source, old, new):
    if source.count(old) != 1:
        raise SystemExit(f'Expected a single occurrence of {old!r}')
    return source.replace(old, new, 1)

ui = Path('public/math-duel-ui.mjs')
source = ui.read_text()
source = replace_once(source, "import {CountdownAudio} from './countdown-audio.mjs';\n", '')
source = replace_once(source, 'if(enabled)countdownAudio.unlock();', '')
source = replace_once(source, "const countdownAudio=new CountdownAudio({onBlocked:()=>{if(screen&&!mutedPreview)$('screenAudioUnlock').hidden=false;}});addEventListener('pagehide',()=>countdownAudio.close());\n", '')
source, removed = re.subn(r'countdownAudio\.update\(\{[^{}]+\}\);', '', source)
if removed != 2:
    raise SystemExit('Countdown audio call sites changed')
source = replace_once(source, 'countdownAudio.unlock();', '')
if 'CountdownAudio' in source or 'countdownAudio' in source or 'function playVoice' not in source:
    raise SystemExit('Unexpected audio wiring')
ui.write_text(source)

html = Path('public/math-duel.html')
html.write_text(replace_once(html.read_text(), 'math-duel-ui.mjs?v=107', 'math-duel-ui.mjs?v=108'))
