"""Lip-sync batch for one EasyDeutsch lesson (owner, 2026-10-04: "the lips do not match the
voice"). Reads a job file [{image, audio, out}], and for each entry asks
LongCat-Video-Avatar 1.5 (MIT weights, Hugging Face ZeroGPU Space) for a ~5-second video in
which the character speaks that audio. Entries that fail (quota, Space error) are skipped:
the lesson then uses the generic talk clip for those lines.
Usage: python ai-cast/lipsync.py job.json"""
import json, os, shutil, sys, time
from gradio_client import Client, handle_file

SPACE = os.environ.get("LIPSYNC_SPACE", "victor/LongCat-Video-Avatar-1.5")
TOKEN = os.environ.get("HF_TOKEN") or None
PROMPT = {"lena": "A young woman in a pink hoodie sits at a cafe table and talks to someone off-screen, natural lip movement, small head movement.",
          "braun": "A man in a blue sweater sits at a cafe table and talks to someone off-screen, natural lip movement, small head movement."}


def main(path):
    jobs = json.load(open(path))
    try:
        c = Client(SPACE, token=TOKEN, verbose=False)
    except TypeError:
        c = Client(SPACE, hf_token=TOKEN, verbose=False)
    done = 0
    for j in jobs:
        t0 = time.time()
        try:
            r = c.predict(handle_file(j["image"]), handle_file(j["audio"]), PROMPT.get(j.get("who"), PROMPT["lena"]),
                          "480p", 42, "Clean speech (fast)", "DBCache faster", api_name="/generate")
            r = r[0] if isinstance(r, (list, tuple)) else r
            r = r.get("video") or r.get("path") if isinstance(r, dict) else r
            shutil.copy(r, j["out"]); done += 1
            print(f"lipsync {j['out']} in {time.time() - t0:.0f}s", flush=True)
        except Exception as e:
            msg = str(e)[:300]
            print(f"lipsync FAILED {j['out']}: {type(e).__name__}: {msg}", flush=True)
            if "quota" in msg.lower() or "limit" in msg.lower():
                break
    print(f"lipsync: {done} of {len(jobs)} made", flush=True)


if __name__ == "__main__":
    main(sys.argv[1])
