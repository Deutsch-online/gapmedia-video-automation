"""Per-lesson reel shots (owner, 2026-10-04, with two reference shorts): for each shot a
vertical 9:16 still (FLUX.1-schnell, Apache-2.0) of Lena and Herr Braun acting out the
phrase, then a 3.5-second motion clip from it (Wan 2.2 I2V, Apache-2.0).
Usage: python ai-cast/shots.py job.json   job = [{prompt, motion, seed, png, mp4}]
A shot that fails keeps whatever was made (the still alone still makes a shot)."""
import json, os, shutil, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from build import call, path_of, first_working, LENA, BRAUN, MOTION_NEG, VIDEO_SPACES
from gradio_client import handle_file
from PIL import Image

STYLE = ("High-end 3D animated feature film still, stylised human, warm natural light, shallow depth of field, "
         "rich detailed textures, expressive appealing faces, vertical 9:16 frame, the characters stand in the lower two thirds "
         "of the frame and the upper third shows calm background (wall, sky), clean image with no text, no letters and no watermark")


def main(path):
    jobs = json.load(open(path))
    for j in jobs:
        t0 = time.time()
        try:
            if not os.path.exists(j["png"]):
                prompt = f"{STYLE}. The young woman is {LENA}. The man is {BRAUN}. Scene: {j['prompt']}."
                r = first_working(["black-forest-labs/FLUX.1-schnell"], {"prompt": prompt, "seed": j["seed"], "randomize_seed": False,
                                  "width": 576, "height": 1024}, "still")
                Image.open(r).convert("RGB").save(j["png"])
            if not os.path.exists(j["mp4"]):
                v = {"input_image": handle_file(j["png"]), "prompt": f"{j['motion']}. The camera is still. Smooth natural animation.",
                     "steps": 6, "negative_prompt": MOTION_NEG, "duration_seconds": 3.5, "guidance_scale": 1, "guidance_scale_2": 1,
                     "seed": 42, "randomize_seed": False}
                shutil.copy(first_working(VIDEO_SPACES, v, "clip"), j["mp4"])
            print(f"shot {j['mp4']} in {time.time() - t0:.0f}s", flush=True)
        except Exception as e:
            msg = str(e)[:300]
            print(f"shot FAILED {j['mp4']}: {msg}", flush=True)
            if "quota" in msg.lower():
                break


if __name__ == "__main__":
    main(sys.argv[1])
