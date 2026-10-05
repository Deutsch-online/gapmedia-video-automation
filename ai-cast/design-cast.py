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

STYLE = ("cute adorable 3D animated family-movie character design, Pixar and Disney style, FULL BODY standing, head to shoes visible, "
         "facing the camera, friendly smile, bright cheerful pastel colours, soft warm studio lighting, plain light cream background, "
         "highly detailed, attractive, beautiful, happy, no text, no watermark")
CHARS = {
    "lena": "a lovely young woman in her twenties with long wavy dark-brown hair, big sparkling brown eyes, rosy cheeks, a warm smile, a soft pink hoodie, light blue jeans and white sneakers, small silver hoop earrings",
    "braun": "a friendly handsome man in his thirties with short dark-brown hair, light stubble and a small beard tuft under the lower lip, a kind dry smile, a blue sweatshirt, dark trousers and brown shoes",
    "krause": "a sweet funny elderly woman in her late sixties with short curly silver hair in pink hair curlers, round glasses on a chain, rosy cheeks, a bossy but lovable smile, a floral pink bathrobe and fluffy slippers",
}
out = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 4
os.makedirs(out, exist_ok=True)

def one(char, seed):
    r = first_working(["black-forest-labs/FLUX.1-schnell"], {"prompt": f"{STYLE}. {CHARS[char]}.", "seed": seed, "randomize_seed": False, "width": 576, "height": 1024}, "still")
    Image.open(r).convert("RGB").save(f"{out}/{char}-{seed}.jpg", quality=88)

for char in CHARS:
    for seed in range(1, n + 1):
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
        for s in range(1, n + 1):
            p = f"{out}/{c}-{s}.jpg"
            if os.path.exists(p):
                sheet.paste(Image.open(p).resize((W, H)), ((s - 1) * W, i * H))
                d.text(((s - 1) * W + 8, i * H + 8), f"{c}-{s}", fill="#000")
    sheet.save(f"{out}/sheet.jpg", quality=85)
    print("sheet written")
