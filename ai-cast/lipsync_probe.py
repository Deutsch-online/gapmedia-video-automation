"""Lip-sync probe: one German line of Lena through LongCat-Video-Avatar 1.5 (MIT), to
measure quality and GPU time before it is used for whole lessons."""
import asyncio, os, shutil, sys, time
sys.path.insert(0, "ai-cast")
from build import client, path_of
from gradio_client import handle_file
import edge_tts

OUT = "ai-cast/probe"; os.makedirs(OUT, exist_ok=True)
LINE = "Wir machen einen Ausflug. In die Berge!"
asyncio.run(edge_tts.Communicate(LINE, "de-DE-KatjaNeural", rate="-15%").save(f"{OUT}/line.mp3"))
os.system(f"ffmpeg -y -loglevel error -i {OUT}/line.mp3 -ar 16000 -ac 1 {OUT}/line.wav")
for space in ["victor/LongCat-Video-Avatar-1.5", "meituan-longcat/LongCat-Video-Avatar-1.5-Demo"]:
    t0 = time.time()
    try:
        c = client(space)
        eps = c.view_api(return_format="dict", print_info=False)["named_endpoints"]
        print(space, list(eps))
        name = next((n for n in eps if "generate" in n), next(iter(eps)))
        r = c.predict(handle_file("public/ai-cast/lena-cu.png"), handle_file(f"{OUT}/line.wav"),
                      "A young woman in a pink hoodie sits at a cafe table and talks cheerfully to someone off-screen, natural lip movement, small head movement.",
                      "480p", 42, api_name=name)
        shutil.copy(path_of(r), f"{OUT}/lena-lipsync.mp4")
        print(f"OK {space} in {time.time() - t0:.0f}s"); break
    except Exception as e:
        print(f"FAIL {space} after {time.time() - t0:.0f}s: {type(e).__name__}: {str(e)[:500]}")
