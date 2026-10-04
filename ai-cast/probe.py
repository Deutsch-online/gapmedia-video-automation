"""Style probe: several prompt/model variants of Herr Braun's still, to find one without the red nose."""
import os, sys
from pathlib import Path
sys.path.insert(0, "ai-cast")
from build import call, path_of, BRAUN
from PIL import Image

OUT = Path("ai-cast/probe"); OUT.mkdir(parents=True, exist_ok=True)
SCENE = "sitting at a small wooden cafe table with a coffee cup, cozy German cafe interior blurred behind, medium close-up, square frame"
V = {
    "a-zimg-film": ("mrfakename/Z-Image-Turbo", f"Modern 3D animated movie character render, DreamWorks-like stylisation, cool neutral daylight. {BRAUN}, {SCENE}."),
    "b-zimg-clay": ("mrfakename/Z-Image-Turbo", f"Stylised 3D character, clean neutral studio lighting, matte skin with uniform beige skin colour across the whole face. {BRAUN}, {SCENE}."),
    "c-flux-film": ("black-forest-labs/FLUX.1-schnell", f"High-end 3D animated feature film still, stylised human, natural daylight. {BRAUN}, {SCENE}."),
    "d-zimg-2d": ("mrfakename/Z-Image-Turbo", f"Polished 2D digital painting in the style of a modern animated series, clean line art, soft cel shading. {BRAUN}, {SCENE}."),
}
for k, (sp, prompt) in V.items():
    try:
        r = call(sp, {"prompt": prompt, "seed": 1207, "randomize_seed": False, "width": 1024, "height": 1024, "aspect_ratio": "1:1"})
        Image.open(path_of(r)).convert("RGB").save(OUT / f"{k}.png"); print("ok", k)
    except Exception as e:
        print("fail", k, str(e)[:300])
