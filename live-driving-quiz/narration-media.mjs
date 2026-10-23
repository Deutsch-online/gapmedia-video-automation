// No runtime TTS requests or paid fallback. Generate complete neural readings once.
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
execFileSync(process.env.QUIZ_TTS_PYTHON||'python3',[fileURLToPath(new URL('./prepare-narration.py',import.meta.url))],{stdio:'inherit',timeout:600000});
