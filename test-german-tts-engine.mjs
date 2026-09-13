import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Owner alert 2026-09-13: after TTS_ENGINE=pocket was set in news-scan.yml,
// episode 18 STILL failed with
//   Command failed: node music/minimax-tts.mjs اولین خریدِت ...
// because german-lesson-build.mjs called that script by a hardcoded path and
// never read TTS_ENGINE at all. music/plan-voice.mjs:26 and
// music/make-voice.mjs:47 had always read it; this file simply never did.
const src = readFileSync("german-lesson-build.mjs", "utf8");

// It reads TTS_ENGINE, and the set of engines it accepts grew on 2026-09-13
// when pocket-tts failed every narration line of episode 18 against
// music/voice-qc.mjs. What matters is that the variable is honoured and that
// the paid engine is only ever the fallback, never silently the default.
assert.match(src, /const TTS_ENGINE = \["pocket", "edge"\]\.includes\(process\.env\.TTS_ENGINE\) \? process\.env\.TTS_ENGINE : "minimax";/,
  "the German build must read TTS_ENGINE like the other two synthesis paths");
// A Persian line on Edge must name a Persian voice — the adapter's own default
// is German, so an unset voice would have a German speaker read Persian.
assert.match(src, /if \(engine === "edge" && !languageBoost\) env\.EDGE_TTS_VOICE = EDGE_PERSIAN_VOICE;/,
  "Persian on Edge must select a Persian voice explicitly");
assert.match(src, /const EDGE_PERSIAN_VOICE = process\.env\.EDGE_PERSIAN_VOICE \|\| "fa-IR-[A-Za-z]+Neural";/);
// The script is still chosen BY the engine and never hardcoded. The shape grew
// a third branch on 2026-09-13 (edge, for the German word), so this pins the
// property rather than the exact ternary: pocket still routes to pocket-tts,
// and the assertion below still forbids a hardcoded path.
assert.match(src, /const script = engine === "pocket"\s*\n\s*\? "music\/pocket-tts\.mjs"/,
  "the engine must choose the script");
assert.ok(!/execFileSync\("node", \["music\/minimax-tts\.mjs"/.test(src),
  "the hardcoded MiniMax path is what made the env variable a no-op — it must not come back");

// The half that must NOT move. pocket-tts ships a Farsi model and an English
// one and has no German. Reading a German word with either reproduces exactly
// what the owner rejected on 2026-09-10 ("the German clips still came out
// sounding English-accented"), which is the whole reason GERMAN_WORD_VOICE_ID
// exists. So the German clip is pinned to the only engine that has a German
// voice, whatever TTS_ENGINE says.
//
// Updated 2026-09-13: this used to pin the literal "minimax". That named a
// VENDOR where the requirement is a PROPERTY — a real German voice — and when
// MiniMax ran out of credit the literal turned the requirement into a
// permanent outage. It now pins the property instead, which is strictly
// stronger: the clip follows its OWN engine switch, never TTS_ENGINE, and that
// switch can only ever resolve to an engine with a native German voice.
assert.match(src, /const engine = languageBoost \? GERMAN_WORD_ENGINE : TTS_ENGINE;/,
  "the German vocabulary clip must stay on the engine that actually has a German voice");
{
  const decl = src.match(/^const GERMAN_WORD_ENGINE = .*$/m);
  assert.ok(decl, "the German clip's engine switch must exist as its own declaration");
  assert.ok(!decl[0].includes("pocket"),
    "pocket-tts has no German model — the German clip must never be able to resolve to it");
}

// The spoken copy has to be prepared for whichever engine will read it —
// pocketSpeakable and minimaxSpeakable are different transforms, and
// music/voice-qc.mjs compares ASR against this exact string.
assert.match(src, /import \{ minimaxSpeakable, pocketSpeakable \}/);
assert.match(src, /const speakableFor = \(engine\) => \(engine === "pocket" \? pocketSpeakable : minimaxSpeakable\);/);
assert.ok(!/const spoken = minimaxSpeakable\(written\);/.test(src),
  "the spoken copy must follow the engine, not assume MiniMax");

console.log("ok   the German build honours TTS_ENGINE, and the German word stays on a German voice");

// Episode 18 failed every hour on 2026-09-13 for one reason: the German
// vocabulary clip «Was kostet das?» was hardwired to MiniMax, and MiniMax had
// no credit. The constraint was never "only MiniMax can speak German" — it was
// that pocket-tts has no German model and an English model reading German is
// the result the owner rejected on 2026-09-10. Edge's service has native German
// voices and needs no key; proven on a runner (tts-probe.yml run #3,
// 2026-09-13): 1.296s / 21,165 bytes from de-DE-KatjaNeural, no credentials.
{
  const src = readFileSync("german-lesson-build.mjs", "utf8");

  // The German clip has its own engine switch, defaulting to the free native
  // voice, with an explicit way back once credit returns.
  assert.match(src, /const GERMAN_WORD_ENGINE = process\.env\.GERMAN_WORD_ENGINE === "minimax" \? "minimax" : "edge";/,
    "the German clip must default to the free native German voice and stay one variable away from MiniMax");
  assert.match(src, /const engine = languageBoost \? GERMAN_WORD_ENGINE : TTS_ENGINE;/,
    "the German clip's engine must be chosen independently of the Persian one");
  assert.match(src, /engine === "edge"\s*\n\s*\? "music\/edge-tts\.mjs"/,
    "the edge engine must route to its own adapter");

  // The owner's 2026-09-11 correction (German word too fast, too quiet) must
  // survive the engine change rather than silently reverting to a default.
  assert.match(src, /env\.EDGE_TTS_SPEED = String\(GERMAN_WORD_VOICE_SETTINGS\.speed\);/);
  assert.match(src, /env\.EDGE_TTS_VOL = String\(GERMAN_WORD_VOICE_SETTINGS\.vol\);/);

  // The Persian half is chosen independently of the German one, and the paid
  // engine is only ever its fallback.
  assert.match(src, /const TTS_ENGINE = \["pocket", "edge"\]\.includes\(process\.env\.TTS_ENGINE\) \? process\.env\.TTS_ENGINE : "minimax";/,
    "the Persian engine switch stays separate from the German one");
}

// The adapter converts MiniMax-shaped multipliers into Edge's percentage
// strings — the same intent, this engine's units.
{
  const src = readFileSync("music/edge-tts.mjs", "utf8");
  assert.match(src, /const delta = Math\.round\(\(n - 1\) \* 100\);/);
  assert.match(src, /const voice = process\.env\.EDGE_TTS_VOICE \|\| "de-DE-KatjaNeural";/,
    "a German voice must be the default for the adapter that exists to speak German");
  // An empty or broken response must fail loudly, never ship silence.
  assert.match(src, /audio\.length < 1024/,
    "a truncated or empty synthesis must be rejected, not written out as a clip");
}

console.log("ok   the German word has a real German voice that needs no credit, and keeps its approved slower/louder reading");
