// Persian voiceover for one video, laid out on the scene timings.
// Uses MiniMax TTS with a Persian account voice. The API key and voice ID stay
// in environment variables, never in source code.
//
// Usage: node music/make-voice.mjs <feature-id> <hookDur> <tipDur> <tipCount> <outroAt> <total> <out.m4a>
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, existsSync, unlinkSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { narrationFor } from "../lib/narration.mjs";
import { minimaxSpeakable, pocketSpeakable } from "../lib/pronounce.mjs";
import { narrationLineCheck } from "../lib/voice-settings.mjs";
import { assertVoiceSchedule } from "../lib/voice-timing.mjs";

process.chdir(dirname(dirname(fileURLToPath(import.meta.url))));

const argv = process.argv.slice(2);
const diagnosticFile = process.env.VOICE_DIAGNOSTIC_FILE || "";
function timingDiagnostic(reason, timing = null) {
  if (!diagnosticFile) return;
  try {
    writeFileSync(diagnosticFile, JSON.stringify({ stage: "narration-mixing", reason, timing, at: new Date().toISOString() }, null, 2));
  } catch {}
}
// --tips a,b,c,d gives each scene its own measured length
let tipList = null;
const ti = argv.indexOf("--tips");
if (ti >= 0) { tipList = argv[ti + 1].split(",").map(Number); argv.splice(ti, 2); }
const [featureId, hookDur, tipDur, tipCount, outroAt, total, out] = argv;
if (!featureId || !out) {
  console.error("usage: make-voice.mjs <feature-id> <hookDur> <tipDur> <tipCount> <outroAt> <total> <out.m4a>");
  process.exit(1);
}
const HOOK = Number(hookDur), TIP = Number(tipDur), N = Number(tipCount);
const OUT_AT = Number(outroAt), TOTAL = Number(total);

const vo = narrationFor(featureId);
if (!vo) { console.log(`  no narration for ${featureId} — silent`); process.exit(0); }

// TTS_ENGINE=pocket switches to the local, free pocket-tts pipeline (see
// music/pocket-tts.mjs) instead of the paid MiniMax API. Default stays
// MiniMax — pocket-tts is a 2026-09-07 prototype, not yet load-bearing. Must
// match plan-voice.mjs's choice exactly, or the cache filename below misses
// the file plan-voice already measured and this re-synthesises it, risking a
// slightly different length that runs into the next slide.
// Free engines first; MiniMax is only the fallback. "edge" joined on
// 2026-09-13 — and it matters that it is listed here, because until it was,
// setting TTS_ENGINE=edge on this path silently selected MINIMAX, the engine
// whose exhausted credit stopped delivery in the first place.
const ENGINE = ["pocket", "edge"].includes(process.env.TTS_ENGINE) ? process.env.TTS_ENGINE : "minimax";
// Edge is an ordinary neural engine like MiniMax, so it takes the long-standing
// Persian transform with its tested pronunciation fixes, not pocket's.
const speakable = ENGINE === "pocket" ? pocketSpeakable : minimaxSpeakable;
const TTS = ENGINE === "pocket"
  ? "music/pocket-tts.mjs"
  : ENGINE === "edge"
    ? "music/edge-tts.mjs"
    : "music/minimax-tts.mjs";
// music/edge-tts.mjs defaults to a GERMAN voice (it was written for the German
// lesson's vocabulary clip), so Persian narration must name its own voice or a
// German speaker would read it.
const ttsEnv = ENGINE === "edge"
  ? { ...process.env, EDGE_TTS_VOICE: process.env.EDGE_PERSIAN_VOICE || "fa-IR-FaridNeural" }
  : process.env;
// Match plan-voice.mjs exactly: a new speaking profile must synthesise fresh
// lines rather than reuse a slower cached voice.
const voiceKey = `${process.env.MINIMAX_VOICE_ID || "default"}-${process.env.TTS_PROFILE || "fa-natural-v6"}`
  .replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 96);

mkdirSync("music/voice", { recursive: true });

const lines = [
  { text: vo.hook, at: 0.3 },
  ...vo.steps.slice(0, N).map((t, i) => ({
    text: t,
    // start of scene i, using the measured lengths when we have them
    at: (tipList ? HOOK + tipList.slice(0, i).reduce((a, d) => a + d, 0) : HOOK + i * TIP) + 0.2,
  })),
  { text: vo.outro, at: OUT_AT + 0.35 },
];
const sourceKey = createHash("sha256").update(lines.map((line) => line.text).join("\n")).digest("hex").slice(0, 12);
const speechPlan = `music/voice/${featureId}-${voiceKey}-${ENGINE}-${sourceKey}-speech-plan.json`;
let spokenLines = lines.map((line) => speakable(line.text));
// Planning may have safely repaired one TTS-hostile word after ASR rejected it.
// Reuse exactly that approved spoken copy and its measured files; never revert
// to the original line during mixing.
if (existsSync(speechPlan)) {
  try {
    const saved = JSON.parse(readFileSync(speechPlan, "utf8"));
    if (saved?.featureId === featureId && saved.engine === ENGINE && saved.voiceKey === voiceKey &&
      saved.sourceKey === sourceKey && Array.isArray(saved.spokenLines) &&
      saved.spokenLines.length === lines.length && saved.spokenLines.every((line) => !narrationLineCheck(line).length)) {
      spokenLines = saved.spokenLines;
    }
  } catch {}
}
// Must match plan-voice.mjs.  The cache is keyed by the exact private spoken
// copy, so a pronunciation correction can never reuse an older bad take.
const copyKey = createHash("sha256").update(spokenLines.join("\n")).digest("hex").slice(0, 12);

const parts = [];
for (let i = 0; i < lines.length; i++) {
  // Reuse the exact audio that plan-voice measured for the scene duration.
  // Re-synthesising here can vary the length slightly and makes a sentence run
  // into the next slide.
  const f = `music/voice/${featureId}-${voiceKey}-${ENGINE}-${copyKey}-line${i}.mp3`;
  if (!existsSync(f)) {
    execFileSync("node", [TTS, spokenLines[i], "-o", f], {
      stdio: ["ignore", "ignore", "inherit"], env: ttsEnv,
    });
  }
  const duration = Number(execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f,
  ]).toString().trim());
  parts.push({ file: f, at: lines[i].at, duration });
}

// Do not rely on the visual clock alone. If a TTS take is longer than the
// scene measured during planning, publishing it would cut a word or collide
// with the next card. Fail before render instead.
try {
  assertVoiceSchedule(parts, TOTAL);
} catch (error) {
  // No raw text here: it can contain a user-provided feature label. This fixed
  // reason lets the cloud reporter distinguish a real timing rejection from
  // an API, renderer or Telegram failure.
  timingDiagnostic("voice-timing-guard", error.voiceTiming || null);
  throw error;
}

// place each line at its scene on one bed of the video's exact length
const inputs = parts.flatMap((p) => ["-i", p.file]);
const delays = parts
  .map((p, i) => `[${i + 1}:a]adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)}[v${i}]`)
  .join(";");
const mixIns = parts.map((_, i) => `[v${i}]`).join("");
const filter =
  `${delays};[0:a]${mixIns}amix=inputs=${parts.length + 1}:duration=first:normalize=0[m];` +
  `[m]loudnorm=I=-16:TP=-2:LRA=11[out]`;

execFileSync("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error",
  "-f", "lavfi", "-t", String(TOTAL), "-i", "anullsrc=r=44100:cl=stereo",
  ...inputs,
  "-filter_complex", filter, "-map", "[out]",
  "-c:a", "aac", "-b:a", "192k", out,
], { stdio: "inherit" });

for (const p of parts) if (existsSync(p.file)) unlinkSync(p.file);
console.log(`  voice -> ${out} (${parts.length} lines)`);
