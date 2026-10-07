// «Der Anruf» (owner, 2026-10-07: "make a sample like this"): a phone call between two people, one German sentence per scene,
// the picture is our own drawing (public/2d/tel-stage.js), original story and characters (not a copy of the reference).
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
const VOICES = { mama: { voice: "de-DE-KatjaNeural", speed: 0.95 }, ben: { voice: "de-DE-ConradNeural", speed: 1 } };
const LINES = [
  { who: "mama", de: "Ben, wo bist du?", fa: "بن، کجایی؟", verb: "bist", ex: "talk", mood: "worry", prop: "spoon" },
  { who: "ben", de: "Ich bin im Supermarkt.", fa: "من توی سوپرمارکت‌ام.", verb: "bin", ex: "point", mood: "calm", prop: "" },
  { who: "mama", de: "Kauf bitte Milch!", fa: "لطفاً شیر بخر!", verb: "Kauf", ex: "chop", mood: "calm", prop: "spoon" },
  { who: "ben", de: "Ich habe die Milch.", fa: "شیر را دارم.", verb: "habe", ex: "hold", mood: "proud", prop: "milk" },
  { who: "mama", de: "Gut. Kauf auch Eier!", fa: "خوبه. تخم‌مرغ هم بخر!", verb: "Kauf", ex: "talk", mood: "happy", prop: "spoon" },
  { who: "ben", de: "Ich suche die Eier.", fa: "دارم تخم‌مرغ‌ها را می‌گردم.", verb: "suche", ex: "shrug", mood: "worry", prop: "milk" },
  { who: "mama", de: "Sie sind links, neben dem Brot!", fa: "سمت چپ، کنار نان هستند!", verb: "sind", ex: "point", mood: "calm", prop: "spoon" },
  { who: "ben", de: "Ich sehe nur Schokolade.", fa: "فقط شکلات می‌بینم.", verb: "sehe", ex: "hold", mood: "happy", prop: "choc" },
  { who: "mama", de: "Dann kauf keine Schokolade!", fa: "پس شکلات نخر!", verb: "kauf", ex: "chop", mood: "angry", prop: "spoon" },
  { who: "ben", de: "Zu spät. Ich esse sie schon.", fa: "دیر شده. دارم می‌خورمش.", verb: "esse", ex: "eat", mood: "happy", prop: "choc" },
];
const SCENE_LEN = 6.0, SAY = 0.5, END_HOLD = 3.0;
const END = { de: "Gute Einkäufe!", fa: "خرید خوب!" };
const duration = +(LINES.length * SCENE_LEN + END_HOLD).toFixed(3);
if (duration < 60 || duration > 65) throw new Error(`film is ${duration}s; it must be 60-65 s`);

const compDir = `compositions/tel/${iso}`, outDir = `renders/tel/${iso}`, vDir = "music/voice";
for (const d of [compDir, outDir, vDir]) mkdirSync(d, { recursive: true });
const parts = [], mouth = new Array(Math.ceil(duration * 25) + 2).fill(0);
LINES.forEach((s, i) => {
  const f = `${vDir}/tel-${i}.mp3`, dur = sayEdge(VOICES[s.who], s.de, f);
  levelLine(f);
  if (dur > 4.6) throw new Error(`line ${i} is ${dur}s long`);
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

const voice = `${vDir}/tel.m4a`;
const delays = parts.map((p, i) => `[${i + 1}:a]${p.gain ? `volume=${p.gain},` : ""}adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)}[v${i}]`).join(";");
execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-t", String(duration), "-i", "anullsrc=r=44100:cl=stereo",
  ...parts.flatMap((p) => ["-i", p.file]),
  "-filter_complex", `${delays};[0:a]${parts.map((_, i) => `[v${i}]`).join("")}amix=inputs=${parts.length + 1}:duration=first:normalize=0[m];[m]loudnorm=I=-16:TP=-2:LRA=11[out]`,
  "-map", "[out]", "-c:a", "aac", "-b:a", "192k", voice], { stdio: "inherit" });

const stage = { id: "tel-stage", src: "public/2d/tel-stage.js", cfg: "__tel", draw: "__telDraw" };
const silentFor = {};
for (const theme of ["easy", "tiktok", "youtube"]) {
  const c = `${compDir}/tel-${theme}.html`;
  writeFileSync(c, buildKochHTML({ total: duration, theme, scenes, mouth, end, stage, noSparks: true }));
  assertComposition(c, { cli: HF });
  const silent = `${outDir}/tel-${theme}-silent.mp4`;
  execSync(`${HF} render -c "${c}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
  silentFor[theme] = silent;
}
await deliver({ id: "tel", iso, episodeNo: 1, text: { title: "Der Anruf" }, duration, caption: "Der Anruf 📞\n\n#DeutschLernen #LearnGerman #Deutsch #A1 #Alltag #fyp", cuts: scenes.map((s) => s.t0), voice,
  silentIn: silentFor.easy, silentFor, parts, tg, noTelegram, isCorrection: true, saveProgress: () => {}, idx: 0, outDir,
  brand: { label: "Der Anruf", file: "anruf" }, dips: [], musicStyle: "comedy", bedPrefix: "kitchen", bedPick: "kitchen-1", musicGain: 0.35 });
