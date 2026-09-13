// Microsoft Edge neural TTS adapter — a real NATIVE German voice, free and
// keyless. Same CLI contract as minimax-tts.mjs and pocket-tts.mjs:
//   node music/edge-tts.mjs <text> -o <output.mp3>
//
// Why this exists. The German-lesson pipeline needs two different voices: the
// Persian narration (now on free pocket-tts) and the GERMAN VOCABULARY WORD.
// pocket-tts has a Farsi model and an English model and no German one, and a
// German word read by either is the English-accented result the owner rejected
// on 2026-09-10 — so that one clip stayed on MiniMax, and when MiniMax ran out
// of credit on 2026-09-13 episode 18 stopped building entirely, failing the
// same way every hour on «Was kostet das?».
//
// Edge's service is what lib/edge-tts.mjs already talks to for Persian
// (render-ai-education-voice.mjs uses it), it needs no key and no account, and
// it has genuinely native German voices — de-DE-KatjaNeural and
// de-DE-ConradNeural are German speakers, not an English model reading German.
//
// The voice is overridable with EDGE_TTS_VOICE so an audition never needs a
// code change.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { synthesize } from "../lib/edge-tts.mjs";
import { trimDeadAir } from "../lib/voice-settings.mjs";

const argv = process.argv.slice(2);
const outAt = argv.indexOf("-o");
const text = argv.slice(0, outAt < 0 ? argv.length : outAt).join(" ").trim();
const output = outAt >= 0 ? argv[outAt + 1] : "";
if (!text || !output) {
  console.error("usage: edge-tts.mjs <text> -o <output.mp3>");
  process.exit(1);
}

// German by default: this adapter exists for the German vocabulary clip. A
// caller wanting another language passes EDGE_TTS_VOICE.
const voice = process.env.EDGE_TTS_VOICE || "de-DE-KatjaNeural";

// The owner's 2026-09-11 correction — the German word read too fast and too
// quiet — was expressed in MiniMax's units (speed 0.85, vol 1.4,
// GERMAN_WORD_VOICE_SETTINGS in lib/voice-settings.mjs). Edge takes percentage
// strings instead, so the same INTENT is carried across rather than dropped:
// the caller passes the multipliers it already has and they are converted here.
// Unset, both are Edge's own default, which is what the probe auditioned.
const pct = (mult, fallback) => {
  const n = Number(mult);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  const delta = Math.round((n - 1) * 100);
  return `${delta >= 0 ? "+" : ""}${delta}%`;
};
const rate = pct(process.env.EDGE_TTS_SPEED, "+0%");
const volume = pct(process.env.EDGE_TTS_VOL, "+0%");

let audio;
try {
  audio = await synthesize({ text, voice, rate, volume, timeoutMs: 25000 });
} catch (e) {
  console.error(`Edge TTS failed: ${e.message}`);
  process.exit(1);
}
if (!audio || audio.length < 1024) {
  console.error(`Edge TTS returned no usable audio (${audio ? audio.length : 0} bytes).`);
  process.exit(1);
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, audio);
trimDeadAir(output);
console.log(`  Edge voice (${voice}, rate ${rate}, volume ${volume}) -> ${output}`);
