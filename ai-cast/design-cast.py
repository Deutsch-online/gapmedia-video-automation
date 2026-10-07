"""Character design sheet on Hugging Face (owner, 2026-10-05: "the characters must be attractive and beautiful, bright and happy,
not zoomed"). FLUX.1-schnell makes four full-body candidates per character in a bright, cute, Pixar-like look; the picture
that is chosen later becomes the reference of every shot of that character (FLUX Kontext keeps the face and the clothes).
Usage: python ai-cast/design-cast.py out_dir [seeds=4]   (HF_TOKEN optional; PAID_FALLBACK stays off: only the free and the PRO quota)
Writes out_dir/<char>-<seed>.jpg and out_dir/sheet.jpg."""
import os, sys, json
os.environ.setdefault("PAID_FALLBACK", "off")
sys.path.insert(0, os.path.dirname(__file__))
import build, shots
from build import first_working
from PIL import Image, ImageDraw

STYLE = ("semi-realistic 2D animation character illustration in the style of a modern Disney 2D film or a children's storybook, "
         "handsome slim adult with realistic body proportions, normal-sized head, long legs, NOT chibi, NOT chubby, NOT a baby face, "
         "clean outlines, soft flat shading, warm bright cheerful colours, FULL BODY standing, head to shoes visible, facing the camera "
         "with a friendly smile, plain light cream background, highly detailed, attractive, no text, no watermark")
CHARS = {
    "lena": "a beautiful slim young woman in her twenties with long wavy dark-brown hair, warm brown eyes, a warm smile, a soft pink hoodie, light blue jeans and white sneakers, small silver hoop earrings",
    "braun": "a handsome slim man in his thirties with short dark-brown hair, light stubble, a kind smile, a blue sweater, dark trousers and brown shoes",
    "oma": "a kind slim grandmother in her late sixties with grey hair in a neat bun, red round glasses, a warm smile, a sage-green cardigan over a white blouse, a navy skirt and brown shoes",
    "enkelin": "a cute slim girl of nine years with blond hair in a messy bun with a red hair tie and a few curls, big blue eyes, a happy smile, a red sweater, cream trousers and white sneakers",
    "opa": "a cheerful slim grandfather in his late sixties with a bald head and white fringe, a big white curly moustache, a flat green cap, a yellow shirt with green suspenders, brown trousers and brown shoes, a warm funny smile",
    "krause": "a lovely slim elderly woman in her late sixties with short curly silver hair in pink hair curlers, round glasses on a chain, a warm lovable smile, a floral pink bathrobe and fluffy slippers",
}
CALL_STYLE = ("bold 2D cartoon in the style of a modern adult animated TV comedy series, thick black outlines, flat cel-shaded colours, "
              "slightly exaggerated expressive face with big eyes and heavy eyebrows, attractive and funny, waist-up, holding a smartphone to the ear, "
              "plain light background, highly detailed, no text, no watermark")
CHARS["chefin"] = "an elegant confident woman in her forties, big voluminous wavy auburn hair, green eyes behind stylish glasses, red lipstick, a bordeaux blazer over a white blouse, gold earrings, a stern but funny face"
CHARS["koch"] = "a cheerful stocky chef in his forties, tall white chef hat, thick black moustache, warm brown eyes, a white double-breasted chef jacket with a red neckerchief, sweating a little, a worried funny face"
CALL = {"chefin", "koch"}
ONLY = [c for c in os.environ.get("ONLY", "").split(",") if c] or list(CHARS)   # ONLY=oma,enkelin: only these characters
CHARS = {c: CHARS[c] for c in ONLY if c in CHARS}
KIND = {"opa": ("handsome slim adult", "lovely slim elderly man"), "enkelin": ("handsome slim adult with realistic body proportions, normal-sized head, long legs, NOT chibi, NOT chubby, NOT a baby face", "slim cute child with natural child proportions, normal-sized head, NOT chibi, NOT chubby, NOT a baby face"),
        "oma": ("handsome slim adult", "lovely slim elderly woman")}
out = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 4
SEED0 = int(os.environ.get("SEED0", "1"))   # candidate seeds SEED0 .. SEED0+n-1: a new round does not repeat the old pictures
os.makedirs(out, exist_ok=True)

def one(char, seed):
    r = first_working(["black-forest-labs/FLUX.1-schnell"], {"prompt": f"{CALL_STYLE if char in CALL else STYLE.replace(*KIND[char]) if char in KIND else STYLE}. {CHARS[char]}.", "seed": seed, "randomize_seed": False, "width": 576, "height": 1024}, "still")
    Image.open(r).convert("RGB").save(f"{out}/{char}-{seed}.jpg", quality=88)

for char in CHARS:
    for seed in range(SEED0, SEED0 + n):
        if os.path.exists(f"{out}/{char}-{seed}.jpg"): continue
        try:
            shots.run_free(one, char, seed)
            print(f"made {char}-{seed}", flush=True)
        except Exception as e:
            print(f"FAILED {char}-{seed}: {str(e)[:200]}", flush=True)
            if "quota" in str(e).lower(): break
W, H = 288, 512
files = sorted(f for f in os.listdir(out) if f.endswith(".jpg") and f != "sheet.jpg")
if files:
    cols = n; rows = len(CHARS)
    sheet = Image.new("RGB", (cols * W, rows * H), "#222")
    d = ImageDraw.Draw(sheet)
    for i, c in enumerate(CHARS):
        for s in range(SEED0, SEED0 + n):
            p = f"{out}/{c}-{s}.jpg"
            if os.path.exists(p):
                sheet.paste(Image.open(p).resize((W, H)), ((s - SEED0) * W, i * H))
                d.text(((s - SEED0) * W + 8, i * H + 8), f"{c}-{s}", fill="#000")
    sheet.save(f"{out}/sheet-{SEED0}.jpg", quality=85)
    print("sheet written")
