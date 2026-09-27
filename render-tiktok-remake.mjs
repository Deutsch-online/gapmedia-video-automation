// Build + render the compositions/tiktok-remake video: a faceless AI-tool
// tier-list, one category per slide, narrated by a single voice.
//   node render-tiktok-remake.mjs --input "بهترین هوش مصنوعی برای چت، برای تحقیق"
//   node render-tiktok-remake.mjs --input "..." --preview   # write the composition and open Studio, skip render
//   node render-tiktok-remake.mjs --input "..." --with-music   # add sidechain-ducked music bed
//   node render-tiktok-remake.mjs --input "..." --4k
//
// Reads pack from lib/content.mjs (tierListPack(input)), derives the timing
// from pack.duration / pack.hookDuration / pack.outroDuration, renders the
// silent master via Hyperframes, then synthesizes and muxes in
// pack.narration.
//
// Narration is read by MiniMax (music/minimax-tts.mjs), the same engine and
// approved settings (lib/voice-settings.mjs) that daily-render.mjs uses —
// Edge TTS's free endpoint doesn't support real SSML language-switching and
// was heard reading embedded English words too fast and unclear in either
// language. minimaxSpeakable() is the tested pipeline that keeps English UI
// labels/brand names literal inline in the Persian sentence.
import { spawnSync, execSync, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { buildHTML } from "./lib/build.mjs";
import { tierListPack, isTierListRequest } from "./lib/content.mjs";
import { minimaxSpeakable } from "./lib/pronounce.mjs";
import { loadEnv } from "./lib/telegram.mjs";

const projectDir = dirname(fileURLToPath(import.meta.url));
process.chdir(projectDir);
// minimax-tts.mjs (spawned below) reads MINIMAX_API_KEY only from
// process.env — same promotion daily-render.mjs does for .env values.
Object.assign(process.env, loadEnv());

const args = process.argv.slice(2);
const is4k = args.includes("--4k");
const withMusic = args.includes("--with-music");
const force = args.includes("--force");
const inputAt = args.indexOf("--input");
const inputText = inputAt >= 0 ? args[inputAt + 1] || "" : "";
const previewOnly = args.includes("--preview");
const HF = "npx --yes hyperframes@0.8.79";
const resFlag = is4k ? "--resolution portrait-4k" : "";

if (!inputText) {
  throw new Error('این کامپوزیشن حالا فقط فهرست ابزار می‌سازد؛ --input را بدهید. مثال: --input "بهترین هوش مصنوعی برای چت، برای تحقیق"');
}
if (!isTierListRequest(inputText)) {
  throw new Error(`این متن یک درخواست فهرست ابزار نیست — مثال: «بهترین هوش مصنوعی برای چت، برای تحقیق». دریافتی: «${inputText}»`);
}
const pack = tierListPack(inputText);

// Timeline derived from the pack so it stays in sync with the composition.
const TOTAL = pack.duration;
const HOOK  = pack.hookDuration;
const OUTRO = pack.outroDuration;
const n = pack.tips.length;
const TIP = (TOTAL - HOOK - OUTRO) / n;
const slot = (i) =>
  i === 0
    ? { start: 0, dur: HOOK }
    : i <= n
      ? { start: HOOK + (i - 1) * TIP, dur: TIP }
      : { start: HOOK + n * TIP, dur: OUTRO };

const outDir = "renders/tiktok-remake";
const voiceDir = `${outDir}/voice`;
mkdirSync(voiceDir, { recursive: true });

// The composition is content, not a cache key, so a run with --input always
// rewrites it — the previous run's tier-list categories must never survive
// into this one's preview or render.
const compDir = "compositions/tiktok-remake";
mkdirSync(compDir, { recursive: true });
const comp = `${compDir}/index.html`;
if (inputText || !existsSync(comp)) writeFileSync(comp, buildHTML(pack));

if (previewOnly) {
  console.log(`\n=== ${resolve(comp)} written — opening preview ===`);
  execSync(`${HF} preview -c "${comp}"`, { stdio: "inherit" });
  process.exit(0);
}

// 1) Silent master (video only) — reused unless --force.
const silent = `${outDir}/tiktok-remake-silent.mp4`;
if (!existsSync(silent) || is4k || force || inputText) {
  writeFileSync(comp, buildHTML(pack));
  console.log(`\n=== rendering silent master (${is4k ? "4K" : "1080p"}) ===`);
  execSync(
    `${HF} render -c "${comp}" --quality high --fps 30 ${resFlag} --skill=faceless-explainer -o "${silent}"`,
    { stdio: "inherit" }
  );
} else {
  console.log(`\n=== reusing silent master: ${silent} ===`);
}

// 2) Synthesize each Persian narration line via MiniMax.
// "انرژی کافی در نریشن نیست" — the global APPROVED voice (voice-settings.mjs)
// is deliberately calm (0.95x, tuned by ear for the daily explainer's
// register) and locked: "change these only after a listening test says to".
// This pipeline overrides just VOICE_SPEED for its own synthesis call
// instead of touching that shared default — a punchy tier-list hook can
// read faster than a calm explainer without the global voice drifting.
const TIER_VOICE_SPEED = process.env.TIER_VOICE_SPEED || "1.05";
console.log(`\n=== voiceover (MiniMax, speed=${TIER_VOICE_SPEED}) ===`);
const lines = [];
for (let i = 0; i < pack.narration.length; i++) {
  const text = minimaxSpeakable(pack.narration[i]);
  // Cache by content AND speed so a speed change doesn't silently reuse
  // audio synthesized at the old rate.
  const key = createHash("md5").update(`${TIER_VOICE_SPEED}|${text}`).digest("hex").slice(0, 12);
  const file = `${voiceDir}/line-${String(i).padStart(2, "0")}-${key}.mp3`;
  process.stdout.write(`  [tts ${i + 1}/${pack.narration.length}] ${text.slice(0, 44)}…`);
  if (!existsSync(file)) {
    execFileSync("node", ["music/minimax-tts.mjs", text, "-o", file], {
      stdio: ["ignore", "ignore", "inherit"],
      env: { ...process.env, VOICE_SPEED: TIER_VOICE_SPEED },
    });
  }
  const dur = parseFloat(
    execSync(
      `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${file}"`,
      { encoding: "utf8" }
    ).trim()
  );
  const s = slot(i);
  // Compress gently into the slot — never speed up by more than 1.28x.
  const fit = Math.max(s.dur - 0.4, 1);
  const factor = dur > fit ? Math.min(dur / fit, 1.28) : 1;
  // Slight anchor within each section so the line hits the visual beat.
  const delay = Math.round((s.start + 0.15) * 1000);
  lines.push({ i, file, dur, factor, delay });
  console.log(` → ${dur.toFixed(2)}s (slot ${s.dur.toFixed(2)}s, atempo x${factor.toFixed(2)})`);
}

// 3) Mix audio. Voice first (independent graph), optional music ducking, then mux.
function runFfmpeg(args, label) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\n✗ ffmpeg failed with exit ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

const voiceMix = `${outDir}/voice-mix.wav`;
const voiceInputs = [];
for (const l of lines) voiceInputs.push("-i", l.file);
const voiceFilters = lines.map(
  (l) =>
    `[${l.i}:a]aformat=sample_rates=44100:channel_layouts=stereo,` +
    `atempo=${l.factor.toFixed(4)},adelay=${l.delay}|${l.delay}[v${l.i}]`
);
voiceFilters.push(
  `[${lines.map((l) => `v${l.i}`).join("][")}]amix=inputs=${lines.length}:duration=longest:normalize=0,` +
    `apad,atrim=0:${TOTAL}[aout]`
);
runFfmpeg(
  [
    ...voiceInputs,
    "-filter_complex", voiceFilters.join(";"),
    "-map", "[aout]", "-ar", "44100", "-ac", "2",
    "-c:a", "pcm_s16le", "-t", String(TOTAL), "-y", voiceMix,
  ],
  `placing ${lines.length} Persian narration lines into the timeline`
);

let audioSource = voiceMix;
if (withMusic) {
  // CONTENT-PRODUCTION-RULES.md: music is built separately for each video,
  // its beat synced to that video's own slide cuts — not a reused generic
  // bed, which has no relationship to this pack's timing and is what made an
  // earlier render feel unsynced. Cut points are this pack's own tip
  // boundaries (mirrors the cutTimes construction in daily-render.mjs).
  const cutTimes = Array.from({ length: n }, (_, i) => +(HOOK + (i + 1) * TIP).toFixed(3));
  mkdirSync("music/auto", { recursive: true });
  console.log(`\n=== composing music for this video (${TOTAL}s, mood=${pack.mood}) ===`);
  execSync(
    `node music/make-one.mjs ${TOTAL} ${pack.musicVariant || 1} "${pack.music}" ${pack.musicOutroBars || 4}`,
    {
      stdio: "inherit",
      env: {
        ...process.env,
        MUSIC_CUTS: cutTimes.join(","),
        MUSIC_MOOD: pack.mood || "",
        MUSIC_ACCENTS: cutTimes.map((t) => `${t.toFixed(3)}:click:0.7`).join(","),
      },
    }
  );
  const music = existsSync(pack.music) ? pack.music : "music/bed-60s.m4a";
  const audioMix = `${outDir}/voice-mix.m4a`;
  // "صدای موزیک بلندتر از نریشن است" — measured, not just heard: with the
  // old settings (volume 0.85, threshold 0.02, ratio 8) the ducked music
  // sat at -23.1dB mean during active narration while the voice itself
  // measured -30.5dB in that same window — music louder than the voice it
  // was supposed to duck under. A lower base level (0.45) plus a much
  // deeper, faster-reacting duck (ratio 20, threshold 0.015, attack 5ms)
  // brought ducked music to -30.7dB in the same window — at/under the
  // voice instead of well above it. Verified against the actual rendered
  // files with ffmpeg's volumedetect before this went into the pipeline.
  runFfmpeg(
    [
      "-i", voiceMix, "-i", music,
      "-filter_complex",
      `[0:a]aformat=sample_rates=44100:channel_layouts=stereo,asplit=2[vmain][vside];` +
        `[1:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${TOTAL},volume=0.45[music];` +
        `[music][vside]sidechaincompress=threshold=0.015:ratio=20:attack=5:release=250[ducked];` +
        `[vmain][ducked]amix=inputs=2:duration=longest:normalize=0,apad,atrim=0:${TOTAL}[aout]`,
      "-map", "[aout]", "-c:a", "aac", "-b:a", "192k", "-t", String(TOTAL), "-y", audioMix,
    ],
    "ducking music under the voice"
  );
  audioSource = audioMix;
}

const final = `${outDir}/tiktok-remake.mp4`;
runFfmpeg(
  [
    "-i", silent, "-i", audioSource,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
    "-shortest", "-t", String(TOTAL), "-movflags", "+faststart", "-y", final,
  ],
  `muxing voiceover → ${final}`
);

console.log(`\n✅ ${resolve(final)}\n`);
