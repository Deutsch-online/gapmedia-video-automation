"""Comedy music beds (owner, 2026-10-04: "the music has nothing to do with comedy").
ACE-Step (open text-to-music weights, Hugging Face ZeroGPU Space) makes instrumental underscore
from a style prompt; the beds are kept in public/music/ and every episode of both series cuts its
music from them (lib/easydeutsch.mjs). Usage: python ai-cast/music.py [only-id]
A bed that already exists is not made again. The Space API is read at run time (endpoint and
parameter names), because it is not documented here: the log lists what it offers."""
import json, os, shutil, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
import build
from build import client

OUT = "public/music"
SPACES = ["ACE-Step/ACE-Step", "ACE-Step/Ace-Step-v1.5", "Reubencf/Kiku-ACE-Step"]
BEDS = [
    {"id": "comedy-1", "seed": 1101, "prompt": "quirky comedy underscore, pizzicato strings, staccato bassoon, marimba, playful sneaking cartoon sitcom music, light and bouncy, instrumental, 120 bpm, major key, no vocals, no singing"},
    {"id": "comedy-2", "seed": 2202, "prompt": "oompah march, tuba, clarinet, accordion, cheerful slapstick silent film comedy music, instrumental, 120 bpm, no vocals, no singing"},
    {"id": "kitchen-1", "seed": 4404, "prompt": "cheerful happy cooking show background music, bright acoustic guitar, ukulele, light hand percussion, whistling, upbeat sunny kitchen mood, warm and fun, 108 bpm, major key, instrumental, no vocals, no singing"},
    {"id": "kitchen-2", "seed": 5505, "prompt": "light bouncy happy bossa nova, nylon guitar, soft marimba, finger snaps, cheerful morning kitchen, charming and playful, 104 bpm, major key, instrumental, no vocals, no singing"},
    {"id": "comedy-3", "seed": 3303, "prompt": "bouncy ukulele, whistling, hand claps, upbeat quirky indie sitcom theme, funny and warm, instrumental, 120 bpm, no vocals, no singing"},
]
DURATION = 75


def pick_endpoint(c):
    eps = c.view_api(return_format="dict", print_info=False)["named_endpoints"]
    for name, e in eps.items():
        have = {p["parameter_name"] for p in e["parameters"]}
        if "prompt" in have and "lyrics" in have:
            return name, {p["parameter_name"]: p for p in e["parameters"]}
    print("  endpoints:", {n: [p["parameter_name"] for p in e["parameters"]] for n, e in eps.items()}, flush=True)
    raise RuntimeError("no endpoint with prompt and lyrics")


def make(bed):
    last = None
    for space in SPACES:
        try:
            c = client(space)
            name, have = pick_endpoint(c)
            print(f"  {space}{name}: {sorted(have)}", flush=True)
            values = {"prompt": bed["prompt"], "lyrics": "[instrumental]", "audio_duration": DURATION, "infer_step": 60, "guidance_scale": 15,
                      "scheduler_type": "euler", "cfg_type": "apg", "omega_scale": 10, "manual_seeds": str(bed["seed"]), "guidance_interval": 0.5,
                      "guidance_interval_decay": 0, "min_guidance_scale": 3, "use_erg_tag": True, "use_erg_lyric": False, "use_erg_diffusion": True,
                      "oss_steps": "", "guidance_scale_text": 0, "guidance_scale_lyric": 0}
            kw = {k: v for k, v in values.items() if k in have}
            r = c.predict(api_name=name, **kw)
            r = r if isinstance(r, (list, tuple)) else [r]
            path = next((x for x in r if isinstance(x, str) and x.lower().endswith((".wav", ".mp3", ".flac", ".ogg"))), None)
            if not path:
                path = next((x.get("path") for x in r if isinstance(x, dict) and x.get("path")), None)
            if not path:
                raise RuntimeError(f"no audio in result: {str(r)[:200]}")
            os.makedirs(OUT, exist_ok=True)
            subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", path, "-ac", "2", "-ar", "44100", "-b:a", "192k", f"{OUT}/{bed['id']}.mp3"], check=True)
            return space
        except Exception as e:
            last = e
            print(f"  {space} failed: {type(e).__name__}: {str(e)[:300]}", flush=True)
            if "quota" in str(e).lower():
                break
    raise last or RuntimeError("no space")


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else ""
    for bed in BEDS:
        if only and bed["id"] != only:
            continue
        if os.path.exists(f"{OUT}/{bed['id']}.mp3"):
            print(f"bed {bed['id']} exists"); continue
        t0 = time.time()
        try:
            sp = make(bed)
            print(f"bed {bed['id']} made by {sp} in {time.time() - t0:.0f}s", flush=True)
        except Exception as e:
            print(f"bed {bed['id']} FAILED: {str(e)[:200]}", flush=True)
            if "quota" in str(e).lower():
                break


if __name__ == "__main__":
    main()
