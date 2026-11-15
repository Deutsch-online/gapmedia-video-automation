import sys,io,wave,json
from pathlib import Path
import onnxruntime
from piper import PiperVoice,SynthesisConfig
from piper.config import PiperConfig
from piper.voice import ESPEAK_DATA_DIR
options=onnxruntime.SessionOptions()
options.intra_op_num_threads=2
options.inter_op_num_threads=1
options.enable_mem_pattern=False
with open(sys.argv[1]+'.json')as f:config=PiperConfig.from_dict(json.load(f))
voice=PiperVoice(config=config,session=onnxruntime.InferenceSession(sys.argv[1],sess_options=options,providers=['CPUExecutionProvider']),espeak_data_dir=Path(ESPEAK_DATA_DIR))
text=sys.stdin.read(3000)
output=io.BytesIO()
with wave.open(output,'wb')as audio:
 voice.synthesize_wav(text,audio,syn_config=SynthesisConfig(length_scale=1.06,noise_scale=.5,noise_w_scale=.5))
sys.stdout.buffer.write(output.getvalue())
