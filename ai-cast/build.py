"""AI cast for the EasyDeutsch dialogues (owner, 2026-10-04: "I want a real animation").

Builds, a little each day, a library of real animated clips of Lena and Herr Braun:
  1. character stills with Qwen-Image (Apache-2.0 weights)
  2. 3.5-second motion clips from those stills with Wan 2.2 I2V (Apache-2.0 weights)
Both run on free Hugging Face ZeroGPU Spaces. The free daily GPU quota is small, so the
job makes what fits, keeps every finished file in public/ai-cast/, and continues the
next day. A quota refusal is the normal end of a day's run, not a failure.
"""
import json, os, shutil, sys, time, traceback
from pathlib import Path

from gradio_client import Client, handle_file

OUT = Path("public/ai-cast")
OUT.mkdir(parents=True, exist_ok=True)
TOKEN = os.environ.get("HF_TOKEN") or None
MAX_STEPS = int(os.environ.get("AI_CAST_MAX", "6"))

STYLE = ("high-end 3D animated feature film still in the style of a modern Pixar or Disney movie, "
         "soft global illumination, warm cinematic lighting, shallow depth of field, rich detailed textures, "
         "expressive appealing faces with natural skin-tone noses, cozy German cafe interior with a window and a chalkboard in the blurred background")
LENA = ("a young woman in her twenties with long wavy dark-brown hair parted in the middle, big warm brown eyes "
        "with long lashes, small silver hoop earrings, a soft pink hoodie with white drawstrings, gentle friendly smile")
BRAUN = ("a man in his thirties with short dark-brown hair, a broad friendly face, light stubble and a small beard tuft "
         "under the lower lip that is clearly visible, dark brown eyes, a blue crew-neck sweatshirt, warm confident smile")
NEG = "red nose, clown nose, sunburn, text, letters, watermark, logo, caption, blurry, low resolution, extra fingers, deformed hands, extra people"
MOTION_NEG = ("static, frozen, blurry details, subtitles, text, worst quality, low quality, jpeg artifacts, ugly, "
              "deformed, extra fingers, bad hands, bad face, morphing face, extra people, walking away")

# priority order: what the dialogue needs first comes first
PLAN = [
    {"id": "lena-cu", "kind": "still", "prompt": f"{STYLE}. Medium close-up of {LENA}, sitting at a small wooden cafe table with a coffee cup, her body turned three-quarters to the right as she talks to someone off-screen right. Square frame, head and shoulders and hands on the table.", "seed": 1207},
    {"id": "braun-cu", "kind": "still", "prompt": f"{STYLE}. Medium close-up of {BRAUN}, sitting at a small wooden cafe table with a coffee cup, his body turned three-quarters to the left as he talks to someone off-screen left. Square frame, head and shoulders and hands on the table.", "seed": 1207},
    {"id": "lena-talk", "kind": "clip", "from": "lena-cu", "prompt": "The young woman talks cheerfully to the person off-screen, natural mouth movement as she speaks, she blinks, tilts her head slightly and gestures gently with one hand. The camera is still. Smooth natural animation."},
    {"id": "braun-talk", "kind": "clip", "from": "braun-cu", "prompt": "The man talks warmly to the person off-screen, natural mouth movement as he speaks, he blinks, nods slightly and gestures with one open hand. The camera is still. Smooth natural animation."},
    {"id": "two-shot", "kind": "still", "prompt": f"{STYLE}. Wide two-shot: on the left {LENA}; on the right {BRAUN}. They sit opposite each other at a small wooden cafe table with two coffee cups and look at each other. Square frame.", "seed": 1207},
    {"id": "two-talk", "kind": "clip", "from": "two-shot", "prompt": "The two people chat happily across the table, the woman speaks and the man listens and nods, then he smiles. Natural small movements, blinking. The camera is still. Smooth natural animation."},
    {"id": "lena-laugh", "kind": "clip", "from": "lena-cu", "prompt": "The young woman bursts out laughing at a joke, her shoulders shake, she covers her mouth with one hand for a moment, then smiles widely. The camera is still. Smooth natural animation."},
    {"id": "braun-laugh", "kind": "clip", "from": "braun-cu", "prompt": "The man laughs heartily at a joke, leans back a little and shakes his head with a big grin. The camera is still. Smooth natural animation."},
    {"id": "lena-listen", "kind": "clip", "from": "lena-cu", "prompt": "The young woman listens attentively to someone off-screen, nods slowly, blinks and smiles a little. Her mouth stays closed. The camera is still. Smooth natural animation."},
    {"id": "braun-listen", "kind": "clip", "from": "braun-cu", "prompt": "The man listens attentively to someone off-screen, nods slowly, blinks and raises his eyebrows with interest. His mouth stays closed. The camera is still. Smooth natural animation."},
]


IMAGE_SPACES = ["mrfakename/Z-Image-Turbo", "black-forest-labs/FLUX.1-schnell", "mcp-tools/Qwen-Image"]
VIDEO_SPACES = ["zerogpu-aoti/wan2-2-fp8da-aoti-faster"]


def client(space):
    try:
        return Client(space, token=TOKEN, verbose=False)
    except TypeError:
        return Client(space, hf_token=TOKEN, verbose=False)


def path_of(result):
    if isinstance(result, (list, tuple)):
        result = result[0]
    if isinstance(result, dict):
        result = result.get("video") or result.get("path") or result.get("value") or result.get("url")
    return result


def call(space, values, prefer=("generate", "infer", "predict", "run")):
    """Calls a Space's main endpoint with named values; only parameters it has are sent."""
    c = client(space)
    eps = c.view_api(return_format="dict", print_info=False)["named_endpoints"]
    name = next((n for n in eps if any(k in n for k in prefer)), next(iter(eps)))
    have = {p["parameter_name"]: p for p in eps[name]["parameters"]}
    kw = {k: v for k, v in values.items() if k in have}
    print(f"  {space}{name} with {sorted(kw)} (has {sorted(have)})")
    return c.predict(api_name=name, **kw)


def first_working(spaces, values, label):
    errors = []
    for sp in spaces:
        try:
            return path_of(call(sp, values))
        except Exception as e:
            msg = f"{sp}: {type(e).__name__}: {str(e)[:400]}"
            print("  ", msg); traceback.print_exc(limit=2); errors.append(msg)
    raise RuntimeError(f"{label} failed on every Space — " + " | ".join(errors))


def make_still(job):
    from PIL import Image
    v = {"prompt": job["prompt"], "seed": job["seed"], "randomize_seed": False, "aspect_ratio": "1:1",
         "width": 1024, "height": 1024, "negative_prompt": NEG}
    Image.open(first_working(IMAGE_SPACES, v, "still")).convert("RGB").save(OUT / f"{job['id']}.png")


def make_clip(job):
    src = OUT / f"{job['from']}.png"
    if not src.exists():
        raise RuntimeError(f"still {src} is not built yet")
    v = {"input_image": handle_file(str(src)), "prompt": job["prompt"], "steps": 6, "negative_prompt": MOTION_NEG,
         "duration_seconds": 3.5, "guidance_scale": 1, "guidance_scale_2": 1, "seed": 42, "randomize_seed": False}
    shutil.copy(first_working(VIDEO_SPACES, v, "clip"), OUT / f"{job['id']}.mp4")


def main():
    made, log = [], []
    todo = [j for j in PLAN if not (OUT / f"{j['id']}.{'png' if j['kind'] == 'still' else 'mp4'}").exists()]
    print(f"AI cast: {len(PLAN) - len(todo)} of {len(PLAN)} done, {len(todo)} to go; token={'yes' if TOKEN else 'no'}")
    for job in todo[:MAX_STEPS]:
        if job["kind"] == "clip" and not (OUT / f"{job['from']}.png").exists():
            log.append(f"{job['id']}: waits for {job['from']}"); continue
        t0 = time.time()
        try:
            (make_still if job["kind"] == "still" else make_clip)(job)
            made.append(job["id"]); log.append(f"{job['id']}: built in {time.time() - t0:.0f}s")
        except Exception as e:  # quota or Space errors end the day's run
            msg = str(e)[:700]
            log.append(f"{job['id']}: stopped — {msg}")
            print(log[-1])
            if "quota" in msg.lower() or "exceeded" in msg.lower():
                break
    left = [j["id"] for j in PLAN if not (OUT / f"{j['id']}.{'png' if j['kind'] == 'still' else 'mp4'}").exists()]
    report = {"made": made, "log": log, "left": left}
    Path("ai-cast/last-run.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    sys.exit(main())
