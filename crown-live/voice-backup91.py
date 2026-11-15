import sys,io,wave
from piper import PiperVoice,SynthesisConfig
voice=PiperVoice.load(sys.argv[1])
text=sys.stdin.read(3000)
output=io.BytesIO()
with wave.open(output,'wb')as audio:
 voice.synthesize_wav(text,audio,syn_config=SynthesisConfig(length_scale=1.06,noise_scale=.5,noise_w_scale=.5))
sys.stdout.buffer.write(output.getvalue())
