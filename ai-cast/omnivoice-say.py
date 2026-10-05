"""OmniVoice (k2-fsa, free, CPU) — German sentences for the voice sample.
usage: omnivoice-say.py jobs.json   jobs.json = {mode: "auto"|"clone", ref, refText, jobs: [{text, out}]}"""
import json, sys
import soundfile as sf
import torch
from omnivoice import OmniVoice

cfg = json.load(open(sys.argv[1]))
model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cpu", dtype=torch.float32)
kw = {}
if cfg["mode"] == "clone":
    kw = {"voice_clone_prompt": model.create_voice_clone_prompt(ref_audio=cfg["ref"], ref_text=cfg["refText"])}
for j in cfg["jobs"]:
    audio = model.generate(text=j["text"], **kw)
    sf.write(j["out"], audio[0], 24000)
    print(f'  omnivoice {cfg["mode"]}: "{j["text"]}" -> {j["out"]} ({len(audio[0]) / 24000:.2f}s)')
