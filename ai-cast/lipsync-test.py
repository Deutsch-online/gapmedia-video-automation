"""One lip-sync test on Hugging Face (LongCat-Video-Avatar): a still + a voice file -> a video whose lips follow the voice.
Usage: python ai-cast/lipsync-test.py still.jpg voice.mp3 out.mp4
Prints the Space's API first, so a wrong argument list shows in the log instead of hiding behind a fallback."""
import os, sys, json
os.environ.setdefault("PAID_FALLBACK", "off")
sys.path.insert(0, os.path.dirname(__file__))
import build, shots
from build import client
png, audio, out = sys.argv[1:4]
c = client(shots.LIPSYNC_SPACE)
try:
    api = c.view_api(return_format="dict", print_info=False)
    for name, ep in api.get("named_endpoints", {}).items():
        print(name, [(p["parameter_name"], p.get("type"), p.get("parameter_default")) for p in ep["parameters"]])
except Exception as e:
    print("view_api failed:", e)
job = {"png": png, "audio": audio, "mp4": out, "chars": ["braun"]}
shots.run_free(shots.make_lipsync, job, {"braun": {"look": "a friendly cartoon man with short dark-brown hair"}})
print("lipsync ok ->", out)
