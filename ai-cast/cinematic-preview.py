"""Render a cinematic, genuinely animated German/Persian taxi story.
Uses the project Wan image-to-video adapter, original generated artwork, native
German voices and FFmpeg. No static-image or paid-provider fallback.
"""
import hashlib, json, os, re, shutil, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from shots import run_free, make_clip

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
OUT = ROOT / "renders/cinematic-taxi"
CACHE = OUT / "motion-v1"
OUT.mkdir(parents=True, exist_ok=True)
CACHE.mkdir(parents=True, exist_ok=True)
ART = ROOT / "public/ai-cast/cinematic-taxi"
SCENES = [
    {"image": "conversation.png", "voice": "de-DE-KatjaNeural",
     "de": "Zum Bahnhof, bitte. Was kostet das?",
     "fa": "لطفاً به ایستگاه قطار. هزینه‌اش چقدر است؟",
     "de_display": r"Zum Bahnhof, bitte.\NWas kostet das?",
     "fa_display": r"لطفاً به ایستگاه قطار.\Nهزینه‌اش چقدر است؟",
     "motion": "The elderly grandmother on the left looks up at the driver and politely asks him a question, her lips moving naturally. She looks into her small open purse, then raises her eyes to meet his. The young driver on the right listens attentively and gently nods. Subtle breathing, natural blinking, fabric moves slightly in the warm breeze. Preserve exact faces, outfits, and the car."},
    {"image": "kindness.png", "voice": "de-DE-ConradNeural",
     "de": "Heute ist die Fahrt kostenlos!",
     "fa": "امروز کرایه رایگان است!",
     "de_display": "Heute ist die Fahrt kostenlos!",
     "fa_display": "امروز کرایه رایگان است!",
     "motion": "The young driver on the right speaks warmly, his lips moving, then gently supports the grandmother's hand and guides her one small step towards the open taxi door. The grandmother on the left smiles with relief and takes his hand. Clear careful hand and arm movement, subtle natural expressions and breathing, realistic fabric movement. Preserve the characters, the taxi and the golden sunlight."},
    {"image": "farewell.png", "voice": "de-DE-KatjaNeural",
     "de": "Vielen Dank! Sie sind sehr freundlich.",
     "fa": "خیلی ممنون! شما خیلی مهربان هستید.",
     "de_display": r"Vielen Dank!\NSie sind sehr freundlich.",
     "fa_display": r"خیلی ممنون!\Nشما خیلی مهربان هستید.",
     "motion": "The elderly grandmother seated inside the taxi smiles gratefully and speaks, her lips moving softly, then gives a small warm farewell wave through the open window. The young driver outside on the right smiles, nods and returns the wave. The car remains stationary. Natural blinking and gentle expressive gestures. Maintain exact identity and beautiful cinematic light."},
]

def run(args, **kw):
    return subprocess.run([str(x) for x in args], check=True, **kw)

def probe(path):
    return json.loads(subprocess.check_output(["ffprobe", "-v", "error",
        "-show_streams", "-show_format", "-of", "json", str(path)]))

def duration(path):
    return float(probe(path)["format"]["duration"])

def ass_time(t):
    n = round(t * 100)
    return f"{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}"

# All voice clips are required before any GPU work.
for i, s in enumerate(SCENES):
    voice = OUT / f"voice-{i}.mp3"
    env = {**os.environ, "EDGE_TTS_CLIENT": "python", "EDGE_TTS_VOICE": s["voice"],
           "EDGE_TTS_SPEED": "0.95", "EDGE_TTS_VOL": "1.2"}
    run(["node", "music/edge-tts.mjs", s["de"], "-o", voice], env=env)
    if not 0.5 < duration(voice) <= 4.6:
        raise RuntimeError(f"Speech does not fit its shot: {i}")
    s["audio"] = voice

parts = []
for i, s in enumerate(SCENES):
    source = ART / s["image"]
    if not source.is_file():
        raise RuntimeError(f"Required original art missing: {source}")
    png, clip = CACHE / f"shot-{i}.png", CACHE / f"shot-{i}.mp4"
    signature = hashlib.sha256(source.read_bytes() + s["motion"].encode()).hexdigest()
    sig = CACHE / f"shot-{i}.sig"
    if not sig.exists() or sig.read_text() != signature:
        clip.unlink(missing_ok=True)
    shutil.copyfile(source, png)
    if not clip.exists():
        job = {"id": f"cinematic-{i}", "png": str(png), "mp4": str(clip),
               "dur": 5, "motion": s["motion"], "seed": 1207 + i * 11}
        run_free(make_clip, job)
        if not clip.exists():
            raise RuntimeError("Video model returned no motion clip; static fallback is forbidden")
        sig.write_text(signature)
    d = duration(clip)
    if d < 2:
        raise RuntimeError("Video model returned an incomplete shot")
    final_part = OUT / f"part-{i}.mp4"
    run(["ffmpeg", "-y", "-v", "error", "-i", clip, "-i", s["audio"],
         "-filter_complex",
         f"[0:v]setpts={5/d:.8f}*PTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30[v];"
         "[1:a]adelay=300|300,apad,atrim=0:5,aresample=48000[a]",
         "-map", "[v]", "-map", "[a]", "-t", "5",
         "-c:v", "libx264", "-preset", "fast", "-crf", "18",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", final_part])
    parts.append(final_part)

ass = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: DE,DejaVu Sans,50,&H00A5DFFF,&H000000FF,&H00251D17,&H00251D17,0,0,0,0,100,100,0,0,1,1,0,5,55,55,0,1
Style: FA,Noto Naskh Arabic,72,&H00FFFFFF,&H000000FF,&H00251D17,&H00251D17,0,0,0,0,100,100,0,0,1,0,0,5,55,55,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
for i, s in enumerate(SCENES):
    a, b = ass_time(i*5 + .1), ass_time((i+1)*5)
    ass += f"Dialogue: 0,{a},{b},DE,,0,0,0,,{{\\pos(540,1620)}}{s['de_display']}\n"
    ass += f"Dialogue: 0,{a},{b},FA,,0,0,0,,{{\\pos(540,1765)}}{s['fa_display']}\n"
subs = OUT / "subtitles.ass"
subs.write_text(ass, encoding="utf-8")
manifest = OUT / "concat.txt"
manifest.write_text("".join(f"file '{p.resolve()}'\n" for p in parts))
out = OUT / "cinematic-taxi-fa-de.mp4"
run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", manifest,
     "-vf", f"drawbox=x=35:y=1510:w=1010:h=350:color=0x152128@0.86:t=fill,ass={subs}",
     "-af", "loudnorm=I=-16:TP=-1.5:LRA=9", "-c:v", "libx264", "-crf", "18",
     "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
     "-movflags", "+faststart", out])

info = probe(out)
v = next(s for s in info["streams"] if s["codec_type"] == "video")
if v["width"] != 1080 or v["height"] != 1920:
    raise RuntimeError("Wrong video dimensions")
if not any(s["codec_type"] == "audio" for s in info["streams"]):
    raise RuntimeError("Missing German narration")
if abs(duration(out) - 15) > .2:
    raise RuntimeError("Incomplete video")
# Reject a frozen model result, even when the file itself is valid MP4.
frozen = run(["ffmpeg", "-hide_banner", "-i", out,
              "-vf", "freezedetect=n=-50dB:d=2", "-an", "-f", "null", "-"],
             capture_output=True, text=True).stderr
freeze_seconds = sum(float(x) for x in re.findall(r"freeze_duration: ([\d.]+)", frozen))
if freeze_seconds > 5:
    raise RuntimeError(f"Too little genuine animation: frozen for {freeze_seconds:.2f}s")
run(["ffmpeg", "-y", "-v", "error", "-i", out, "-vf",
     "fps=1/2.5,scale=270:-1,tile=3x2", "-frames:v", "1", OUT/"contact.jpg"])
report = {"video": str(out.relative_to(ROOT)), "duration": duration(out),
          "width": v["width"], "height": v["height"], "German_audio": True,
          "Persian_and_German_subtitles": True, "genuine_motion": True,
          "frozen_seconds": freeze_seconds, "source": "original generated cinematic illustrations",
          "paid_fallback": False, "scenes": [{"de": s["de"], "fa": s["fa"]} for s in SCENES]}
(OUT / "quality.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False), flush=True)
