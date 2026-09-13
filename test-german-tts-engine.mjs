import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Owner alert 2026-09-13: after TTS_ENGINE=pocket was set in news-scan.yml,
// episode 18 STILL failed with
//   Command failed: node music/minimax-tts.mjs اولین خریدِت ...
// because german-lesson-build.mjs called that script by a hardcoded path and
// never read TTS_ENGINE at all. music/plan-voice.mjs:26 and
// music/make-voice.mjs:47 had always read it; this file simply never did.
const src = readFileSync("german-lesson-build.mjs", "utf8");

assert.match(src, /const TTS_ENGINE = process\.env\.TTS_ENGINE === "pocket" \? "pocket" : "minimax";/,
  "the German build must read TTS_ENGINE like the other two synthesis paths");
assert.match(src, /const script = engine === "pocket" \? "music\/pocket-tts\.mjs" : "music\/minimax-tts\.mjs";/,
  "the engine must choose the script");
assert.ok(!/execFileSync\("node", \["music\/minimax-tts\.mjs"/.test(src),
  "the hardcoded MiniMax path is what made the env variable a no-op — it must not come back");

// The half that must NOT move. pocket-tts ships a Farsi model and an English
// one and has no German. Reading a German word with either reproduces exactly
// what the owner rejected on 2026-09-10 ("the German clips still came out
// sounding English-accented"), which is the whole reason GERMAN_WORD_VOICE_ID
// exists. So the German clip is pinned to the only engine that has a German
// voice, whatever TTS_ENGINE says.
assert.match(src, /const engine = languageBoost \? "minimax" : TTS_ENGINE;/,
  "the German vocabulary clip must stay on the engine that actually has a German voice");

// The spoken copy has to be prepared for whichever engine will read it —
// pocketSpeakable and minimaxSpeakable are different transforms, and
// music/voice-qc.mjs compares ASR against this exact string.
assert.match(src, /import \{ minimaxSpeakable, pocketSpeakable \}/);
assert.match(src, /const speakableFor = \(engine\) => \(engine === "pocket" \? pocketSpeakable : minimaxSpeakable\);/);
assert.ok(!/const spoken = minimaxSpeakable\(written\);/.test(src),
  "the spoken copy must follow the engine, not assume MiniMax");

console.log("ok   the German build honours TTS_ENGINE, and the German word stays on a German voice");
