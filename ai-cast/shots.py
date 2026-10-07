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
import build
from build import call, client, path_of, first_working, LENA, BRAUN, KRAUSE, PFEIFFER, MOTION_NEG, VIDEO_SPACES   # `client` was missing: every lip-sync call failed with a NameError until 2026-10-05
from gradio_client import handle_file
from PIL import Image

CAST_DIR = "public/ai-cast"
DEFAULT_CAST = {"lena": {"ref": f"{CAST_DIR}/lena-cu.png", "look": LENA}, "braun": {"ref": f"{CAST_DIR}/braun-cu.png", "look": BRAUN},
                "krause": {"ref": f"{CAST_DIR}/krause-cu.png", "look": KRAUSE}, "pfeiffer": {"ref": f"{CAST_DIR}/pfeiffer-cu.png", "look": PFEIFFER}}
DEFAULT_STYLE = ("High-end 3D animated feature film still, stylised human, warm natural light, shallow depth of field, "
                 "rich detailed textures, expressive appealing faces, vertical 9:16 frame, the characters in the lower two thirds "
                 "of the frame and calm background above them, clean image with no text, no letters and no watermark")
# owner, 2026-10-05: the characters were zoomed in and the picture was not happy: a wide shot, the whole body, the place around, bright
WIDE = ("WIDE medium shot, camera far away: the whole body is visible from head to shoes with free space around the character, "
        "the place clearly visible in the background, bright cheerful colours, soft sunny light, in exactly the same illustration style as the reference picture, "
        "vertical 9:16, no close-up, no text, no watermark.")
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


def pair_ref(chars, cast, shot_dir):
    """Two characters side by side on one 9:16 reference picture (the left one is chars[0])."""
    out = f"{shot_dir}/ref-{chars[0]}-{chars[1]}.png"
    if os.path.exists(out):
        return out
    parts = [vertical_ref(c, cast, shot_dir) for c in chars[:2]]
    if not all(parts):
        return None
    canvas = Image.new("RGB", (576, 1024), "#F7EFDD")
    for k, f in enumerate(parts):
        canvas.paste(Image.open(f).convert("RGB").resize((288, 512), Image.LANCZOS), (k * 288, 256))
    canvas.save(out)
    return out


def make_still(j, shot_dir, cast, style):
    chars = j["chars"]
    ref = vertical_ref(chars[0], cast, shot_dir) if len(chars) == 1 else (pair_ref(chars, cast, shot_dir) if len(chars) == 2 else None)
    if ref:
        who = "the same character" if len(chars) == 1 else "the same two characters (the one on the left and the one on the right of the reference picture)"
        prompt = (f"Keep {who}: identical faces, hairstyles, outfits, skin tones and ages. Put {'this character' if len(chars) == 1 else 'these two characters'} {j['prompt']}. "
                  + j.get("wide", WIDE))
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


# Paid fallback (owner, 2026-10-04: "if the daily quota is not enough, use the credits"). The free
# ZeroGPU quota is used first. When it is spent, the same shot is made with Hugging Face Inference
# Providers, which bill the credits of the HF_TOKEN account. PAID_FALLBACK=off turns it off;
# PAID_BUDGET_USD (default 0.50 a run) is the spending guard; PAID_PROVIDER defaults to fal-ai.
PAID_ON = os.environ.get("PAID_FALLBACK", "on").lower() != "off" and bool(os.environ.get("HF_TOKEN"))
# Spending guard in dollars (owner, 2026-10-04: about 1 USD a day at most; two runs a day, so 0.50 each).
# The prices are my own conservative ESTIMATES, not read from the provider: set PAID_STILL_USD and
# PAID_CLIP_USD when the real prices are known. A call that would pass the budget is not made.
PAID_BUDGET = float(os.environ.get("PAID_BUDGET_USD", "0.50"))
PAID_STILL_USD = float(os.environ.get("PAID_STILL_USD", "0.04"))
PAID_CLIP_USD = float(os.environ.get("PAID_CLIP_USD", "0.40"))
PAID_SPENT = 0.0
PAID_USED = 0
# The order (owner, 2026-10-04): 1. the anonymous free ZeroGPU quota, 2. the PRO quota of HF_TOKEN
# (the daily allowance should be spent here), 3. only then the paid credits. A tier that says
# "quota" is left for the rest of the run.
HF_TOKEN = os.environ.get("HF_TOKEN") or None
TIER = 0 if (HF_TOKEN and os.environ.get("FREE_FIRST", "on").lower() != "off") else 1
QUOTA_SPENT = False


def run_free(fn, *a):
    global TIER, QUOTA_SPENT
    while TIER < 2:
        build.TOKEN = None if TIER == 0 else HF_TOKEN
        try:
            return fn(*a)
        except Exception as e:
            if not is_quota(e):
                raise
            print(f"  {'free' if TIER == 0 else 'PRO'} GPU quota spent", flush=True)
            TIER += 1
    QUOTA_SPENT = True
    raise RuntimeError("quota")


def is_quota(e):
    return "quota" in str(e).lower()


def paid_client():
    from huggingface_hub import InferenceClient
    return InferenceClient(provider=os.environ.get("PAID_PROVIDER", "fal-ai"), api_key=os.environ["HF_TOKEN"])


def paid_still(j, shot_dir, cast, style):
    chars = j["chars"]
    ref = vertical_ref(chars[0], cast, shot_dir) if len(chars) == 1 else None
    c = paid_client()
    if ref:
        prompt = (f"Keep the same character: identical face, hairstyle, outfit, skin tone and age. Put this character {j['prompt']}. "
                  + WIDE)
        img = c.image_to_image(open(ref, "rb").read(), prompt=prompt, model="black-forest-labs/FLUX.1-Kontext-dev")
    else:
        who = " ".join(f"Character {i + 1}: {(cast.get(x) or {}).get('look', x)}." for i, x in enumerate(chars))
        img = c.text_to_image(f"{style}. {who} Scene: {j['prompt']}.", model="black-forest-labs/FLUX.1-schnell", width=576, height=1024)
    img.convert("RGB").save(j["png"])
    return "paid-kontext" if ref else "paid-schnell"


def paid_clip(j):
    data = paid_client().image_to_video(j["png"], prompt=f"{j['motion']}. The camera is still. Smooth natural animation.",
                                        model="Wan-AI/Wan2.2-I2V-A14B", negative_prompt=MOTION_NEG)
    open(j["mp4"], "wb").write(data)


LIPSYNC_SPACE = os.environ.get("LIPSYNC_SPACE", "victor/LongCat-Video-Avatar-1.5")


def make_lipsync(j, cast):
    """A shot whose visible character speaks: LongCat-Video-Avatar makes a video of that still saying exactly the
    audio of the shot (owner, 2026-10-04: the lips did not match the voice). 480p, about 5 s, native speed."""
    look = (cast.get((j.get("chars") or [""])[0]) or {}).get("look", "a person")
    prompt = f"{look}, talking to someone off-screen, natural lip movement that matches the speech, expressive face, small head movement."
    c = client(LIPSYNC_SPACE)
    r = c.predict(handle_file(j["png"]), handle_file(j["audio"]), prompt, "480p", 42, "Clean speech (fast)", "DBCache faster", api_name="/generate")
    r = r[0] if isinstance(r, (list, tuple)) else r
    r = (r.get("video") or r.get("path")) if isinstance(r, dict) else r
    shutil.copy(r, j["mp4"])
    open(j["mp4"] + ".ls", "w").write("1")


def file_sig(path):
    try:
        return hashlib.sha1(open(path, "rb").read()).hexdigest()[:12]
    except OSError:
        return ""


def sigs(j, style):
    """What a shot depends on. A kept picture or clip is only reused when this still matches, so a
    cache that is shared between runs never gives a changed story an old picture."""
    still = json.dumps([j["prompt"], j["chars"], j["seed"], style if len(j["chars"]) != 1 else ""], sort_keys=True)
    d = math.ceil(min(5.0, max(3.0, float(j.get("dur", 3.5)))))
    h = lambda x: hashlib.sha1(x.encode()).hexdigest()[:16]
    lip = file_sig(j["audio"]) if j.get("audio") else ""
    return h(still), h(still + json.dumps([j["motion"], d, lip]))


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
    global PAID_USED, PAID_SPENT
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
                if os.path.exists(j["mp4"] + ".ls"): os.remove(j["mp4"] + ".ls")
            if not os.path.exists(j["png"]):
                try:
                    engine = run_free(make_still, j, shot_dir, cast, style)
                except Exception as e:
                    if not (is_quota(e) and PAID_ON): raise
                    if PAID_SPENT + PAID_STILL_USD > PAID_BUDGET: raise RuntimeError(f"quota: paid budget {PAID_BUDGET:.2f} USD reached")
                    print(f"  GPU quotas spent: this still uses the paid credits (about {PAID_STILL_USD:.2f} USD)", flush=True)
                    engine = paid_still(j, shot_dir, cast, style); PAID_USED += 1; PAID_SPENT += PAID_STILL_USD
                write_sig(j["png"], still_sig)
            if not os.path.exists(j["mp4"]) and j.get("audio") and os.environ.get("LIPSYNC", "off") == "on":
                t1 = time.time()
                try:
                    run_free(make_lipsync, j, cast)
                    write_sig(j["mp4"], clip_sig)
                    engine += "+lipsync"
                    print(f"  lipsync {j['id']} in {time.time() - t1:.0f}s", flush=True)
                except Exception as e:
                    for f in (j["mp4"], j["mp4"] + ".ls"):
                        if os.path.exists(f): os.remove(f)
                    print(f"  lipsync FAILED {j['id']}: {type(e).__name__}: {str(e)[:200]} -> the generic motion clip instead", flush=True)
            if not os.path.exists(j["mp4"]):
                try:
                    run_free(make_clip, j)
                except Exception as e:
                    if not (is_quota(e) and PAID_ON): raise
                    if PAID_SPENT + PAID_CLIP_USD > PAID_BUDGET: raise RuntimeError(f"quota: paid budget {PAID_BUDGET:.2f} USD reached")
                    print(f"  GPU quotas spent: this clip uses the paid credits (about {PAID_CLIP_USD:.2f} USD)", flush=True)
                    paid_clip(j); engine += "+paid-clip"; PAID_USED += 1; PAID_SPENT += PAID_CLIP_USD
                write_sig(j["mp4"], clip_sig)
            print(f"shot {j['id']} ({engine}) in {time.time() - t0:.0f}s", flush=True)
        except Exception as e:
            msg = str(e)[:300]
            print(f"shot FAILED {j['id']}: {msg}", flush=True)
            if "quota" in msg.lower():
                break


if __name__ == "__main__":
    main(sys.argv[1])
