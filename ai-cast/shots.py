"""Per-episode series shots (owner, 2026-10-04, after four reference shorts).
For each shot a vertical 9:16 still, then a motion clip from it (Wan 2.2 I2V, Apache-2.0).
The still keeps the characters recognisable: with one character on the picture it is an
edit of that character's portrait (FLUX.1-Kontext, identity kept: same face, hair, age); with
two characters, or when Kontext is not available, it is made from the text description
(FLUX.1-schnell). A shot that fails keeps whatever was made: the still alone still makes a shot.
Usage: python ai-cast/shots.py job.json
  job = [{id, chars: [lena|braun|krause], prompt, motion, seed, dur, png, mp4}]"""
import json, os, shutil, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from build import call, path_of, first_working, LENA, BRAUN, KRAUSE, MOTION_NEG, VIDEO_SPACES
from gradio_client import handle_file
from PIL import Image

CAST_DIR = "public/ai-cast"
LOOK = {"lena": LENA, "braun": BRAUN, "krause": KRAUSE}
STYLE = ("High-end 3D animated feature film still, stylised human, warm natural light, shallow depth of field, "
         "rich detailed textures, expressive appealing faces, vertical 9:16 frame, the characters in the lower two thirds "
         "of the frame and calm background above them, clean image with no text, no letters and no watermark")
KONTEXT = ["mcp-tools/FLUX.1-Kontext-Dev", "black-forest-labs/FLUX.1-Kontext-Dev"]


def vertical_ref(char, shot_dir):
    """The character's portrait as a 9:16 reference picture."""
    src = f"{CAST_DIR}/{char}-cu.png"
    out = f"{shot_dir}/ref-{char}.png"
    if os.path.exists(src) and not os.path.exists(out):
        im = Image.open(src).convert("RGB")
        w, h = im.size
        cw = int(h * 9 / 16)
        x = (w - cw) // 2
        im.crop((x, 0, x + cw, h)).resize((576, 1024), Image.LANCZOS).save(out)
    return out if os.path.exists(out) else None


def make_still(j, shot_dir):
    chars = j["chars"]
    ref = vertical_ref(chars[0], shot_dir) if len(chars) == 1 else None
    if ref:
        prompt = (f"Keep the same character: identical face, hairstyle, skin tone and age. Put this character {j['prompt']}. "
                  "Vertical 9:16 cinematic composition, high-end 3D animated feature film still, warm light, no text.")
        try:
            r = first_working(KONTEXT, {"input_image": handle_file(ref), "prompt": prompt, "seed": j["seed"], "randomize_seed": False,
                                        "guidance_scale": 2.5, "steps": 24}, "kontext")
            Image.open(r).convert("RGB").save(j["png"])
            return "kontext"
        except Exception as e:
            print(f"  kontext failed for {j['id']}: {str(e)[:200]}", flush=True)
            if "quota" in str(e).lower():
                raise
    who = " ".join(f"The {'woman' if c != 'braun' else 'man'} is {LOOK[c]}." for c in chars)
    prompt = f"{STYLE}. {who} Scene: {j['prompt']}."
    r = first_working(["black-forest-labs/FLUX.1-schnell"], {"prompt": prompt, "seed": j["seed"], "randomize_seed": False,
                                                              "width": 576, "height": 1024}, "still")
    Image.open(r).convert("RGB").save(j["png"])
    return "schnell"


def make_clip(j):
    d = min(5.0, max(3.0, float(j.get("dur", 3.5))))
    v = {"input_image": handle_file(j["png"]), "prompt": f"{j['motion']}. The camera is still. Smooth natural animation.",
         "steps": 6, "negative_prompt": MOTION_NEG, "duration_seconds": d, "guidance_scale": 1, "guidance_scale_2": 1,
         "seed": 42, "randomize_seed": False}
    shutil.copy(first_working(VIDEO_SPACES, v, "clip"), j["mp4"])


def main(path):
    jobs = json.load(open(path))
    shot_dir = os.path.dirname(path)
    for j in jobs:
        t0 = time.time()
        try:
            engine = "kept"
            if not os.path.exists(j["png"]):
                engine = make_still(j, shot_dir)
            if not os.path.exists(j["mp4"]):
                make_clip(j)
            print(f"shot {j['id']} ({engine}) in {time.time() - t0:.0f}s", flush=True)
        except Exception as e:
            msg = str(e)[:300]
            print(f"shot FAILED {j['id']}: {msg}", flush=True)
            if "quota" in msg.lower():
                break


if __name__ == "__main__":
    main(sys.argv[1])
