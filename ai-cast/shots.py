"""Per-episode series shots (owner, 2026-10-04, after four reference shorts).
For each shot a vertical 9:16 still, then a motion clip from it (Wan 2.2 I2V, Apache-2.0).
The still keeps the characters recognisable: with one character on the picture it is an
edit of that character's portrait (FLUX.1-Kontext, identity kept: same face, hair, age); with
two characters, or when Kontext is not available, it is made from the text description
(FLUX.1-schnell). A shot that fails keeps whatever was made: the still alone still makes a shot.
Usage: python ai-cast/shots.py job.json
  job = { style?, cast: { key: { ref: portrait path, look?: text } }, jobs: [{id, chars, prompt, motion, seed, dur, png, mp4}] }
  (a plain list of jobs still works: the German series cast of ai-cast/build.py is used)"""
import hashlib, json, math, os, shutil, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from build import call, path_of, first_working, LENA, BRAUN, KRAUSE, PFEIFFER, MOTION_NEG, VIDEO_SPACES
from gradio_client import handle_file
from PIL import Image

CAST_DIR = "public/ai-cast"
DEFAULT_CAST = {"lena": {"ref": f"{CAST_DIR}/lena-cu.png", "look": LENA}, "braun": {"ref": f"{CAST_DIR}/braun-cu.png", "look": BRAUN},
                "krause": {"ref": f"{CAST_DIR}/krause-cu.png", "look": KRAUSE}, "pfeiffer": {"ref": f"{CAST_DIR}/pfeiffer-cu.png", "look": PFEIFFER}}
DEFAULT_STYLE = ("High-end 3D animated feature film still, stylised human, warm natural light, shallow depth of field, "
                 "rich detailed textures, expressive appealing faces, vertical 9:16 frame, the characters in the lower two thirds "
                 "of the frame and calm background above them, clean image with no text, no letters and no watermark")
KONTEXT = ["mcp-tools/FLUX.1-Kontext-Dev", "black-forest-labs/FLUX.1-Kontext-Dev"]


def vertical_ref(char, cast, shot_dir):
    """The character's portrait as a 9:16 reference picture."""
    src = (cast.get(char) or {}).get("ref")
    out = f"{shot_dir}/ref-{char}.png"
    if src and os.path.exists(src) and not os.path.exists(out):
        im = Image.open(src).convert("RGB")
        w, h = im.size
        if w / h > 9 / 16:                       # wider than 9:16: take the middle
            cw = int(h * 9 / 16); x = (w - cw) // 2
            im = im.crop((x, 0, x + cw, h))
        else:                                     # taller: take the top (the face), not the middle
            ch = int(w * 16 / 9)
            im = im.crop((0, 0, w, min(h, ch)))
        im.resize((576, 1024), Image.LANCZOS).save(out)
    return out if os.path.exists(out) else None


def make_still(j, shot_dir, cast, style):
    chars = j["chars"]
    ref = vertical_ref(chars[0], cast, shot_dir) if len(chars) == 1 else None
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
    who = " ".join(f"Character {i + 1}: {(cast.get(c) or {}).get('look', c)}." for i, c in enumerate(chars))
    prompt = f"{style}. {who} Scene: {j['prompt']}."
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


def sigs(j, style):
    """What a shot depends on. A kept picture or clip is only reused when this still matches, so a
    cache that is shared between runs never gives a changed story an old picture."""
    still = json.dumps([j["prompt"], j["chars"], j["seed"], style if len(j["chars"]) != 1 else ""], sort_keys=True)
    d = math.ceil(min(5.0, max(3.0, float(j.get("dur", 3.5)))))
    h = lambda x: hashlib.sha1(x.encode()).hexdigest()[:16]
    return h(still), h(still + json.dumps([j["motion"], d]))


def read_sig(path):
    try:
        return open(path + ".sig").read().strip()
    except OSError:
        return ""


def write_sig(path, sig):
    open(path + ".sig", "w").write(sig)


def migrate(path, jobs, style):
    """Shots made before the signatures existed (a plain jobs.json list beside the new job file) are
    adopted when their prompt and motion are unchanged, so the GPU time that made them is not lost."""
    legacy = os.path.join(os.path.dirname(path), "jobs.json")
    if os.path.abspath(legacy) == os.path.abspath(path) or not os.path.exists(legacy):
        return
    try:
        old = {o["id"]: o for o in json.load(open(legacy)) if isinstance(o, dict)}
    except Exception:
        return
    for j in jobs:
        o = old.get(j["id"])
        if not o or o.get("prompt") != j["prompt"] or o.get("chars") != j["chars"]:
            continue
        still, clip = sigs(j, style)
        if os.path.exists(j["png"]) and not read_sig(j["png"]):
            write_sig(j["png"], still)
            if os.path.exists(j["mp4"]) and o.get("motion") == j["motion"]:
                write_sig(j["mp4"], clip)
    os.replace(legacy, os.path.join(os.path.dirname(path), "jobs.legacy.json"))


def main(path):
    data = json.load(open(path))
    jobs = data if isinstance(data, list) else data["jobs"]
    cast = {**DEFAULT_CAST, **({} if isinstance(data, list) else data.get("cast", {}))}
    style = DEFAULT_STYLE if isinstance(data, list) else data.get("style", DEFAULT_STYLE)
    shot_dir = os.path.dirname(path)
    migrate(path, jobs, style)
    for j in jobs:
        t0 = time.time()
        still_sig, clip_sig = sigs(j, style)
        try:
            engine = "kept"
            # a picture whose story changed is thrown away, and so is the clip made from it
            if os.path.exists(j["png"]) and read_sig(j["png"]) != still_sig:
                os.remove(j["png"])
                if os.path.exists(j["mp4"]): os.remove(j["mp4"])
            if os.path.exists(j["mp4"]) and read_sig(j["mp4"]) != clip_sig:
                os.remove(j["mp4"])
            if not os.path.exists(j["png"]):
                engine = make_still(j, shot_dir, cast, style)
                write_sig(j["png"], still_sig)
            if not os.path.exists(j["mp4"]):
                make_clip(j)
                write_sig(j["mp4"], clip_sig)
            print(f"shot {j['id']} ({engine}) in {time.time() - t0:.0f}s", flush=True)
        except Exception as e:
            msg = str(e)[:300]
            print(f"shot FAILED {j['id']}: {msg}", flush=True)
            if "quota" in msg.lower():
                break


if __name__ == "__main__":
    main(sys.argv[1])
