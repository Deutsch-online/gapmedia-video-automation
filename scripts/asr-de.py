"""Print German word timings of a video's audio (used to caption Google Vids clips)."""
import sys, whisper
m = whisper.load_model("medium")
r = m.transcribe(sys.argv[1], language="de", word_timestamps=True, condition_on_previous_text=False, fp16=False, temperature=0)
for s in r["segments"]:
    print(f'SEG {s["start"]:.2f}-{s["end"]:.2f} {s["text"].strip()}')
    print("  " + " ".join(f'{w["word"].strip()}@{w["start"]:.2f}' for w in s.get("words", [])))
