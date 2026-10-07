// «Die Suppe» (owner, 2026-10-07: "make a sample like this"): a phone call between two people, one German sentence per scene,
// the picture is our own drawing (public/2d/anruf-stage.js), original story and characters (not a copy of the reference).
// German sentence word by word, verb in red, Persian subtitle; Edge voices (Mama = Katja, Ben = Conrad); music bed kitchen-1.
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
const HF = process.env.OMA_HF || "npx --yes hyperframes@0.8.79", iso = new Date().toISOString().slice(0, 10);
const noTelegram = process.argv.includes("--no-telegram");
const VOICES = { boss: { voice: "de-DE-KatjaNeural", speed: 0.97 }, cook: { voice: "de-DE-ConradNeural", speed: 1 } };
const LINES = [
  { who: "boss", de: "Wo ist die Suppe?", fa: "سوپ کجاست؟", verb: "ist", ex: "talk", mood: "sour", prop: "" },
  { who: "cook", de: "Die Suppe? Sie ist gleich fertig!", fa: "سوپ؟ الان آماده می‌شود!", verb: "ist", ex: "shrug", mood: "worry", prop: "bowl" },
  { who: "boss", de: "Gleich? Der Gast wartet seit einer Stunde!", fa: "الان؟! مهمان یک ساعت است منتظر است!", verb: "wartet", ex: "fist", mood: "angry", prop: "" },
  { who: "cook", de: "Ich koche so schnell ich kann.", fa: "تا جایی که می‌توانم سریع می‌پزم.", verb: "koche", ex: "talk", mood: "worry", prop: "bowl" },
  { who: "boss", de: "Probieren Sie die Suppe. Ist sie gut?", fa: "سوپ را امتحان کنید. خوب است؟", verb: "Probieren", ex: "point", mood: "calm", prop: "" },
  { who: "cook", de: "Hmm. Sie ist ein bisschen kalt.", fa: "هوم. کمی سرد است.", verb: "ist", ex: "shrug", mood: "worry", prop: "bowl" },
  { who: "boss", de: "Kalt?! Dann machen Sie sie warm!", fa: "سرد؟! پس گرمش کنید!", verb: "machen", ex: "fist", mood: "angry", prop: "" },
  { who: "cook", de: "Chefin, das ist Gazpacho. Man isst ihn kalt!", fa: "خانم رئیس، این گازپاچو است. باید سرد خورد!", verb: "isst", ex: "point", mood: "happy", prop: "bowl" },
  { who: "boss", de: "Ach so. Dann bringen Sie ihn sofort!", fa: "آهان. پس فوراً بیاورید!", verb: "bringen", ex: "talk", mood: "shock", prop: "" },
  { who: "cook", de: "Sofort, Chefin! Ich bin schon unterwegs.", fa: "فوراً، خانم رئیس! دارم می‌آیم.", verb: "bin", ex: "talk", mood: "happy", prop: "bowl" },
  { who: "boss", de: "Und lächeln Sie bitte!", fa: "و لطفاً لبخند بزنید!", verb: "lächeln", ex: "point", mood: "smug", prop: "" },
  { who: "cook", de: "Ich lächle doch die ganze Zeit!", fa: "من که تمام مدت لبخند می‌زنم!", verb: "lächle", ex: "shrug", mood: "sour", prop: "bowl" },
];
const SCENE_LEN = 5.0, SAY = 0.4, END_HOLD = 3.0;
const END = { de: "Guten Appetit!", fa: "نوش جان!" };
const duration = +(LINES.length * SCENE_LEN + END_HOLD).toFixed(3);
if (duration < 60 || duration > 65) throw new Error(`film is ${duration}s; it must be 60-65 s`);

const compDir = `compositions/anruf/${iso}`, outDir = `renders/anruf/${iso}`, vDir = "music/voice";
for (const d of [compDir, outDir, vDir]) mkdirSync(d, { recursive: true });
const parts = [], mouth = new Array(Math.ceil(duration * 25) + 2).fill(0);
LINES.forEach((s, i) => {
  const f = `${vDir}/anruf-${i}.mp3`, dur = sayEdge(VOICES[s.who], s.de, f);
  levelLine(f);
  if (dur > 4.3) throw new Error(`line ${i} is ${dur}s long`);
  const pcm = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", f, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], { maxBuffer: 1 << 26 });
  const env = mouthEnvelope(new Int16Array(pcm.stdout.buffer, pcm.stdout.byteOffset, Math.floor(pcm.stdout.length / 2)));
  const at = i * SCENE_LEN + SAY;
  parts.push({ file: f, at: +at.toFixed(3) });
  env.forEach((v, k) => { const j = Math.round(at * 25) + k; if (j < mouth.length) mouth[j] = Math.max(mouth[j], v); });
  console.log(` voice ${i} (${s.who}): "${s.de}" ${dur.toFixed(2)}s`);
});
parts.push({ file: sfxFile("tada"), at: +(LINES.length * SCENE_LEN + 0.2).toFixed(3), gain: 0.3, keep: true });
const scenes = LINES.map((s, i) => ({ ...s, t0: +(i * SCENE_LEN).toFixed(3), t1: +((i + 1) * SCENE_LEN).toFixed(3) }));
const end = { ...END, t0: +(LINES.length * SCENE_LEN + 0.15).toFixed(3) };
scenes[scenes.length - 1].t1 = end.t0;

const voice = `${vDir}/anruf.m4a`;
const delays = parts.map((p, i) => `[${i + 1}:a]${p.gain ? `volume=${p.gain},` : ""}adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)}[v${i}]`).join(";");
execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-t", String(duration), "-i", "anullsrc=r=44100:cl=stereo",
  ...parts.flatMap((p) => ["-i", p.file]),
  "-filter_complex", `${delays};[0:a]${parts.map((_, i) => `[v${i}]`).join("")}amix=inputs=${parts.length + 1}:duration=first:normalize=0[m];[m]loudnorm=I=-16:TP=-2:LRA=11[out]`,
  "-map", "[out]", "-c:a", "aac", "-b:a", "192k", voice], { stdio: "inherit" });

const stage = { id: "anruf-stage", src: "public/2d/anruf-stage.js", cfg: "__anruf", draw: "__anrufDraw" };
const silentFor = {};
for (const theme of ["easy", "tiktok", "youtube"]) {
  const c = `${compDir}/anruf-${theme}.html`;
  writeFileSync(c, buildKochHTML({ total: duration, theme, scenes, mouth, end, stage, noSparks: true }));
  assertComposition(c, { cli: HF });
  const silent = `${outDir}/anruf-${theme}-silent.mp4`;
  execSync(`${HF} render -c "${c}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
  silentFor[theme] = silent;
}
await deliver({ id: "anruf", iso, episodeNo: 1, text: { title: "Die Suppe" }, duration, caption: "Die Suppe 🍲\n\n#DeutschLernen #LearnGerman #Deutsch #A1 #Alltag #fyp", cuts: scenes.map((s) => s.t0), voice,
  silentIn: silentFor.easy, silentFor, parts, tg, noTelegram, isCorrection: true, saveProgress: () => {}, idx: 0, outDir,
  brand: { label: "Die Suppe", file: "suppe" }, dips: [], musicStyle: "comedy", bedPrefix: "kitchen", bedPick: "kitchen-1", musicGain: 0.35 });
