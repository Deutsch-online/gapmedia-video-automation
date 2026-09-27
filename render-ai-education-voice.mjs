// Build + render the AI education video WITH a Persian neural voiceover.
//   node render-ai-education-voice.mjs                 # 1080x1920, music ducked under voice
//   node render-ai-education-voice.mjs --4k            # 2160x3840 (re-renders silent master)
//   node render-ai-education-voice.mjs --no-music      # narration only, no music bed
//   node render-ai-education-voice.mjs --voice=fa-IR-DilaraNeural
// Reuses renders/ai-education/ai-education-silent.mp4 when present at 1080p.
import { spawnSync, execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildHTML } from "./lib/build.mjs";
import { aiEducationPack } from "./lib/content.mjs";
import { synthesize } from "./lib/edge-tts.mjs";

const projectDir = dirname(fileURLToPath(import.meta.url));
process.chdir(projectDir);

const args = process.argv.slice(2);
const is4k = args.includes("--4k");
const noMusic = args.includes("--no-music");
const voiceArg = args.find((a) => a.startsWith("--voice="));
const HF = "npx --yes hyperframes@0.8.79";
const resFlag = is4k ? "--resolution portrait-4k" : "";

const pack = aiEducationPack();
if (voiceArg) pack.voice.name = voiceArg.slice("--voice=".length);

// Timeline must match lib/build.mjs (TOTAL 60, HOOK 4, OUTRO 5, 8 sections).
const TOTAL = 60, HOOK = 4, OUTRO = 5;
const n = pack.tips.length;
const TIP = (TOTAL - HOOK - OUTRO) / n;
const slot = (i) =>
  i === 0
    ? { start: 0, dur: HOOK }
    : i <= n
      ? { start: HOOK + (i - 1) * TIP, dur: TIP }
      : { start: HOOK + n * TIP, dur: OUTRO };

const outDir = "renders/ai-education";
const voiceDir = `${outDir}/voice`;
mkdirSync(voiceDir, { recursive: true });

// 1) Silent master (video only).
const silent = `${outDir}/ai-education-silent.mp4`;
if (!existsSync(silent) || is4k) {
  const compDir = "compositions/ai-education";
  mkdirSync(compDir, { recursive: true });
  const comp = `${compDir}/index.html`;
  writeFileSync(comp, buildHTML(pack));
  console.log(`\n=== rendering silent master (${is4k ? "4K" : "1080p"}) ===`);
  execSync(`${HF} render -c "${comp}" --quality high --fps 30 ${resFlag} --skill=faceless-explainer -o "${silent}"`, { stdio: "inherit" });
} else {
  console.log(`\n=== reusing silent master: ${silent} ===`);
}

// 2) Synthesize each narration line.
console.log(`\n=== voiceover: ${pack.voice.name} (${pack.voice.rate}) ===`);
const lines = [];
for (let i = 0; i < pack.narration.length; i++) {
  const text = pack.narration[i];
  const file = `${voiceDir}/line-${String(i).padStart(2, "0")}.mp3`;
  process.stdout.write(`  [tts ${i + 1}/${pack.narration.length}] ${text.slice(0, 46)}…`);
  const mp3 = await synthesize({ text, voice: pack.voice.name, rate: pack.voice.rate });
  writeFileSync(file, mp3);
  const dur = parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${file}"`, { encoding: "utf8" }).trim()
  );
  const s = slot(i);
  const fit = s.dur - 0.4;
  const factor = dur > fit ? Math.min(dur / fit, 1.28) : 1;
  const delay = Math.round((s.start + 0.15) * 1000);
  lines.push({ i, file, dur, factor, delay });
  console.log(` → ${dur.toFixed(2)}s (slot ${s.dur.toFixed(2)}s, atempo x${factor.toFixed(2)})`);
}

// 3) Mix audio in separate passes, then mux it with the video.
// Keeping the voice graph independent from the video avoids a slow/hanging
// ffmpeg filter graph on some Windows builds when many delayed inputs exist.
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
const voiceFilters = lines.map((l) =>
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
  `placing ${lines.length} Persian narration lines`
);

let audioSource = voiceMix;
if (!noMusic) {
  const music = existsSync(pack.music) ? pack.music : "music/bed-60s.m4a";
  const audioMix = `${outDir}/voice-mix.m4a`;
  runFfmpeg(
    [
      "-i", voiceMix, "-i", music,
      "-filter_complex",
      `[0:a]aformat=sample_rates=44100:channel_layouts=stereo,asplit=2[vmain][vside];` +
        `[1:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${TOTAL},volume=0.95[music];` +
        `[music][vside]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=300[ducked];` +
        `[vmain][ducked]amix=inputs=2:duration=longest:normalize=0,apad,atrim=0:${TOTAL}[aout]`,
      "-map", "[aout]", "-c:a", "aac", "-b:a", "192k", "-t", String(TOTAL), "-y", audioMix,
    ],
    "ducking music under the voice"
  );
  audioSource = audioMix;
}

const final = `${outDir}/ai-education-voice.mp4`;
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
