from pathlib import Path
import sys,subprocess,urllib.request
root=Path(sys.argv[1]);root.mkdir(parents=True,exist_ok=True)
subprocess.run([sys.executable,'-m','venv',str(root/'venv')],check=True)
subprocess.run([str(root/'venv/bin/python'),'-m','pip','install','--disable-pip-version-check','piper-tts==1.3.0'],check=True)
base='https://huggingface.co/rhasspy/piper-voices/resolve/6b9cfaacb4fb2e02a9621227e3c1a48bec9710c3/en/en_US/ljspeech/medium/'
for filename in ['en_US-ljspeech-medium.onnx','en_US-ljspeech-medium.onnx.json','MODEL_CARD']:
 with urllib.request.urlopen(base+filename,timeout=180)as source,(root/filename).open('wb')as target:
  while data:=source.read(1024*1024):target.write(data)
(root/'ATTRIBUTION.txt').write_text('LJ Speech female English voice. Dataset: https://keithito.com/LJ-Speech-Dataset/ (public domain). Model: rhasspy/piper-voices, revision 6b9cfaacb4fb2e02a9621227e3c1a48bec9710c3. Piper: https://github.com/OHF-Voice/piper1-gpl (GPL-3.0).\n')
print('FEMALE_NEURAL_MODEL_INSTALLED',flush=True)
