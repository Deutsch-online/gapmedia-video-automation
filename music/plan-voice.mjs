// Generates the narration lines, measures each one, and prints a timing plan.
// Scene lengths then follow the SPEECH instead of a fixed grid — which is the
// only way the caption on screen and the words being spoken stay together.
//
// Usage: node music/plan-voice.mjs <feature-id>   -> JSON on stdout
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, existsSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { narrationFor } from "../lib/narration.mjs";
import { minimaxSpeakable, pocketSpeakable } from "../lib/pronounce.mjs";
import { narrationLineCheck } from "../lib/voice-settings.mjs";
import { recoverSpokenLine } from "../lib/narration-recovery.mjs";

process.chdir(dirname(dirname(fileURLToPath(import.meta.url))));

const featureId = process.argv[2];
const requestedTips = Math.max(1, Number(process.argv[3]) || 4);
const vo = narrationFor(featureId);
if (!vo) { console.log(JSON.stringify({ ok: false })); process.exit(0); }

// TTS_ENGINE=pocket switches to the local, free pocket-tts pipeline (see
// music/pocket-tts.mjs) instead of the paid MiniMax API. Default stays
// MiniMax — pocket-tts is a 2026-09-07 prototype, not yet load-bearing.
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
// Cached MiniMax lines must belong to the selected voice. Reusing a file named
// only after the feature silently kept the previous speaker after the user
// chose another Voice ID in Telegram.
// The profile is part of the cache key. Otherwise a new speed/pitch setting
// silently reuses last week's slow MP3 files.
const voiceKey = `${process.env.MINIMAX_VOICE_ID || "default"}-${process.env.TTS_PROFILE || "fa-natural-v6"}`
  .replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 96);
// The engine name is part of the cache filename too (not just voiceKey), so
// switching TTS_ENGINE never reuses — or is mistaken for — the other
// engine's cached line, even when neither MINIMAX_VOICE_ID nor TTS_PROFILE
// changed.

mkdirSync("music/voice", { recursive: true });

function dur(file) {
  const out = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file,
  ]).toString().trim();
  return Number(out) || 0;
}

// Only synthesise lines that will actually be on screen. Generating unseen
// cards wastes MiniMax balance and makes a short bulletin needlessly slow.
const texts = [vo.hook, ...vo.steps.slice(0, requestedTips), vo.outro];
const sourceKey = createHash("sha256").update(texts.join("\n")).digest("hex").slice(0, 12);
let spokenLines = texts.map(speakable);
// The spoken-copy hash belongs in the cache key.  A pronunciation correction
// must always create fresh audio; reusing a line by feature ID alone would
// silently ship yesterday's mispronounced MP3 with today's corrected text.
let copyKey = "";
let files = [];
const speechPlan = `music/voice/${featureId}-${voiceKey}-${ENGINE}-${sourceKey}-speech-plan.json`;
function refreshCacheKey() {
  copyKey = createHash("sha256").update(spokenLines.join("\n")).digest("hex").slice(0, 12);
  files = spokenLines.map((_, i) => `music/voice/${featureId}-${voiceKey}-${ENGINE}-${copyKey}-line${i}.mp3`);
}
refreshCacheKey();

function readDiagnostic() {
  const file = process.env.RENDER_DIAGNOSTIC_FILE || "";
  if (!file || !existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
}

function writeSpeechPlan() {
  // This transient file lets make-voice reuse the exact corrected clips that
  // planning measured. It is keyed to the source narration and never committed.
  writeFileSync(speechPlan, JSON.stringify({
    featureId, engine: ENGINE, voiceKey, sourceKey, spokenLines,
  }, null, 2));
}

function synthesizeMissing() {
  for (let i = 0; i < texts.length; i++) {
    const spoken = spokenLines[i];
    const issues = narrationLineCheck(spoken);
    if (issues.length) {
      console.error(`Narration QC failed for line ${i + 1}: ${issues.join(", ")}`);
      process.exit(1);
    }
    const f = files[i];
    if (!existsSync(f)) {
      execFileSync("node", [TTS, spoken, "-o", f], {
        stdio: ["ignore", "ignore", "inherit"], env: ttsEnv,
      });
    }
  }
}

synthesizeMissing();

// This gate examines the exact per-line audio cached above — not a separately
// generated audition. It gets at most three bounded attempts: a fresh take,
// then one approved spoken-only repair for the exact ASR-reported word, then a
// fresh take of that repair. Unknown words are never guessed or shipped.
if (process.env.NARRATION_QC !== "off") {
  let manifest = "";
  const writeManifest = () => {
    manifest = `music/voice/${featureId}-${voiceKey}-${ENGINE}-${copyKey}-qc.json`;
    writeFileSync(manifest, JSON.stringify({
      featureId,
      entries: texts.map((written, i) => ({ written, spoken: spokenLines[i], file: files[i] })),
    }, null, 2));
  };
  let passed = false;
  const MAX_NARRATION_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_NARRATION_ATTEMPTS; attempt++) {
    writeManifest();
    try {
      execFileSync("node", ["music/voice-qc.mjs", "--manifest", manifest], { stdio: "inherit" });
      passed = true;
      break;
    } catch {
      if (attempt === MAX_NARRATION_ATTEMPTS) break;
      const diagnostic = readDiagnostic();
      const lineIndex = Number(diagnostic?.line) - 1;
      const repair = diagnostic?.reason === "voice-asr-mismatch" && lineIndex >= 0
        ? recoverSpokenLine(spokenLines[lineIndex], diagnostic.wordIndex)
        : null;
      if (repair?.changed) {
        // No user text is logged: the line number and fixed reason are enough
        // to diagnose a repair without leaking a custom submission to Actions.
        console.error(`Narration ASR QC rejected line ${lineIndex + 1}; applying approved spoken-only recovery.`);
        spokenLines[lineIndex] = repair.text;
        refreshCacheKey();
      } else {
        console.error("Narration ASR QC rejected this take; synthesizing one fresh take.");
      }
      for (const f of files) rmSync(f, { force: true });
      synthesizeMissing();
    }
  }
  if (!passed) {
    console.error("Narration ASR QC failed after bounded recovery; this video is blocked before visual rendering.");
    process.exit(1);
  }
}

writeSpeechPlan();

const durs = [];
for (const f of files) {
  durs.push(dur(f));
}

console.log(JSON.stringify({ ok: true, featureId, files, durs }));
