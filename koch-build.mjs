// «Ich koche»: the owner's reference-style short (2026-10-05), built without Hugging Face and without any paid service.
// A hand-drawn SVG cartoon (public/2d/koch-stage.js), the Edge voice the owner chose (Conrad, speed 0.95) and the music bed
// kitchen-1. Six scenes, each: the sentence, the action, the sentence again, the result. Sent to the owner's bot chat only.
import { execFileSync, execSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sayEdge, levelLine, deliver } from "./lib/easydeutsch.mjs";
import { buildKochHTML, mouthEnvelope } from "./lib/koch-film.mjs";
import { assertComposition } from "./lib/hf-check.mjs";
import { sfxFile } from "./lib/sfx.mjs";
import { loadEnv, telegramConfig } from "./lib/telegram.mjs";

process.chdir(dirname(fileURLToPath(import.meta.url)));
const localEnv = loadEnv(); Object.assign(process.env, localEnv);
const tg = telegramConfig(localEnv);
const HF = "npx --yes hyperframes@0.8.79", iso = new Date().toISOString().slice(0, 10);
const noTelegram = process.argv.includes("--no-telegram");

const SCENES = [
  { de: "Ich wasche das Gemüse.", verb: "wasche", sfx: [["water", 0.3, 0.22]] },
  { de: "Ich schneide die Tomate.", verb: "schneide", sfx: [["chop", 0.3, 0.3]] },
  { de: "Ich schäle die Kartoffel.", verb: "schäle", sfx: [["peel", 0.4, 0.28]] },
  { de: "Ich lege die Zwiebel in die Pfanne.", verb: "lege", sfx: [["sizzle", 2.0, 0.2]] },
  { de: "Ich rühre das Essen um.", verb: "rühre", sfx: [["stir", 0.3, 0.26], ["sizzle", 0.2, 0.14]] },
  { de: "Ich koche die Suppe.", verb: "koche", sfx: [["boil", 0.3, 0.24]] },
];
const SCENE_LEN = 10.2, SAY1 = 0.5, SAY2 = 5.7, END_HOLD = 3.0;
const END = { de: "Guten Appetit!" };
const duration = +(SCENES.length * SCENE_LEN + END_HOLD).toFixed(3);
if (duration < 60 || duration > 65) throw new Error(`film is ${duration}s; it must be 60-65 s`);

const compDir = `compositions/koch/${iso}`, outDir = `renders/koch/${iso}`, vDir = "music/voice";
for (const d of [compDir, outDir, vDir]) mkdirSync(d, { recursive: true });

// 1. the voice: Conrad, speed 0.95, no pitch change (VOICE-LOG.md, the owner's choice); each sentence once, said twice
const parts = [], mouth = new Array(Math.ceil(duration * 25) + 2).fill(0);
const voiceSpec = { voice: "de-DE-ConradNeural", speed: 0.95 };
SCENES.forEach((s, i) => {
  const f = `${vDir}/koch-${i}.mp3`;
  const dur = sayEdge(voiceSpec, s.de, f); levelLine(f);
  if (dur > 3.6) throw new Error(`sentence ${i} is ${dur}s long; it must end before the action changes`);
  const pcm = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", f, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], { maxBuffer: 1 << 26 });
  const env = mouthEnvelope(new Int16Array(pcm.stdout.buffer, pcm.stdout.byteOffset, Math.floor(pcm.stdout.length / 2)));
  for (const say of [SAY1, SAY2]) {
    const at = i * SCENE_LEN + say;
    parts.push({ file: f, at: +at.toFixed(3) });
    env.forEach((v, k) => { const j = Math.round(at * 25) + k; if (j < mouth.length) mouth[j] = Math.max(mouth[j], v); });
  }
  for (const [kind, off, gain] of s.sfx) parts.push({ file: sfxFile(kind), at: +(i * SCENE_LEN + off).toFixed(3), gain, keep: true });
  parts.push({ file: sfxFile("ding"), at: +(i * SCENE_LEN + 5.15).toFixed(3), gain: 0.14, keep: true });
  console.log(` voice ${i}: "${s.de}" ${dur.toFixed(2)}s`);
});
parts.push({ file: sfxFile("tada"), at: +(SCENES.length * SCENE_LEN + 0.2).toFixed(3), gain: 0.3, keep: true });
const scenes = SCENES.map((s, i) => ({ ...s, t0: +(i * SCENE_LEN).toFixed(3), t1: +((i + 1) * SCENE_LEN).toFixed(3) }));
const end = { ...END, t0: +(SCENES.length * SCENE_LEN + 0.15).toFixed(3) };
// the last scene hands over to the end card
scenes[scenes.length - 1].t1 = end.t0;

// 2. the voice mix (voice + kitchen sounds)
const voice = `${vDir}/koch.m4a`;
const delays = parts.map((p, i) => `[${i + 1}:a]${p.gain ? `volume=${p.gain},` : ""}adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)}[v${i}]`).join(";");
execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-t", String(duration), "-i", "anullsrc=r=44100:cl=stereo",
  ...parts.flatMap((p) => ["-i", p.file]),
  "-filter_complex", `${delays};[0:a]${parts.map((_, i) => `[v${i}]`).join("")}amix=inputs=${parts.length + 1}:duration=first:normalize=0[m];[m]loudnorm=I=-16:TP=-2:LRA=11[out]`,
  "-map", "[out]", "-c:a", "aac", "-b:a", "192k", voice], { stdio: "inherit" });

// 3. the film in the three looks
const silentFor = {};
for (const theme of ["easy", "tiktok", "youtube"]) {
  const c = `${compDir}/koch-${theme}.html`;
  writeFileSync(c, buildKochHTML({ total: duration, theme, scenes, mouth, end }));
  assertComposition(c, { cli: HF });
  const silent = `${outDir}/koch-${theme}-silent.mp4`;
  execSync(`${HF} render -c "${c}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
  silentFor[theme] = silent;
}

// 4. music bed kitchen-1 (the owner's choice), quiet under the voice, then Telegram
const caption = "Ich koche 🍳\n\n#DeutschLernen #LearnGerman #Deutsch #A1 #fyp";
await deliver({ id: "koch", iso, episodeNo: 1, text: { title: "Ich koche" }, duration, caption, cuts: scenes.map((s) => s.t0), voice,
  silentIn: silentFor.easy, silentFor, parts, tg, noTelegram, isCorrection: true, saveProgress: () => {}, idx: 0, outDir,
  brand: { label: "Ich koche", file: "koch" }, dips: [], musicStyle: "comedy", bedPrefix: "kitchen", bedPick: "kitchen-1", musicGain: 0.35 });
