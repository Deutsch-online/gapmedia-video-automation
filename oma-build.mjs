// «Oma sagt …» (owner, 2026-10-05: "make a video from this video"): the grandma who gives orders, the granddaughter who does them.
// A new film in our own drawing (public/2d/oma-stage.js), not a copy of the reference. No Hugging Face, no paid service.
// Ten orders, one per room/action; German sentence with the verb in red and a Persian subtitle; Edge voice; music bed kitchen-1.
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
const WHOOSH = "public/sfx/whoosh-short.mp3";

// sfx: [kind | file, offset into the scene, gain, optional ffmpeg filter that trims a long sound]
const SCENES = [
  { de: "Mach das Fenster zu!", fa: "پنجره را ببند!", verb: "Mach", sfx: [["stamp", 3.9, 0.22]] },
  { de: "Mach das Licht an!", fa: "چراغ را روشن کن!", verb: "Mach", sfx: [["tick", 3.15, 0.6], ["pop", 3.2, 0.3]] },
  { de: "Setz dich hin!", fa: "بنشین!", verb: "Setz", sfx: [["pop", 3.7, 0.4]] },
  { de: "Stell den Teller auf den Tisch!", fa: "بشقاب را روی میز بگذار!", verb: "Stell", sfx: [["ding", 3.5, 0.12]] },
  { de: "Häng die Jacke auf!", fa: "کاپشن را آویزان کن!", verb: "Häng", sfx: [[WHOOSH, 3.2, 0.3]] },
  { de: "Feg den Boden!", fa: "زمین را جارو کن!", verb: "Feg", sfx: [["peel", 1.9, 0.2, "atrim=0:2.5,afade=t=out:st=2.2:d=0.3"]] },
  { de: "Bring den Müll raus!", fa: "زباله را بیرون ببر!", verb: "Bring", sfx: [["stamp", 4.0, 0.2]] },
  { de: "Wasch die Äpfel!", fa: "سیب‌ها را بشوی!", verb: "Wasch", sfx: [["water", 1.9, 0.2, "atrim=0:2.4,afade=t=out:st=2.1:d=0.3"]] },
  { de: "Leg die Kleidung in den Schrank!", fa: "لباس‌ها را توی کمد بگذار!", verb: "Leg", sfx: [["bonk", 2.1, 0.2]] },
  { de: "Mach dein Bett!", fa: "تختت را مرتب کن!", verb: "Mach", sfx: [[WHOOSH, 3.0, 0.3]] },
];
const SCENE_LEN = 6.0, SAY = 0.4, END_HOLD = 3.0;
const END = { de: "Gut gemacht!", fa: "آفرین!" };
const duration = +(SCENES.length * SCENE_LEN + END_HOLD).toFixed(3);
if (duration < 60 || duration > 65) throw new Error(`film is ${duration}s; it must be 60-65 s`);

const compDir = `compositions/oma/${iso}`, outDir = `renders/oma/${iso}`, vDir = "music/voice";
for (const d of [compDir, outDir, vDir]) mkdirSync(d, { recursive: true });

// 1. Oma's voice (Katja, speed 0.95 like the voice the owner chose for «Ich koche»); her mouth follows the real file
const parts = [], mouth = new Array(Math.ceil(duration * 25) + 2).fill(0);
const voiceSpec = { voice: "de-DE-KatjaNeural", speed: 0.95 };
SCENES.forEach((s, i) => {
  const f = `${vDir}/oma-${i}.mp3`;
  const dur = sayEdge(voiceSpec, s.de, f); levelLine(f);
  if (dur > 3.2) throw new Error(`order ${i} is ${dur}s long; it must end before the girl is done`);
  const pcm = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", f, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], { maxBuffer: 1 << 26 });
  const env = mouthEnvelope(new Int16Array(pcm.stdout.buffer, pcm.stdout.byteOffset, Math.floor(pcm.stdout.length / 2)));
  const at = i * SCENE_LEN + SAY;
  parts.push({ file: f, at: +at.toFixed(3) });
  env.forEach((v, k) => { const j = Math.round(at * 25) + k; if (j < mouth.length) mouth[j] = Math.max(mouth[j], v); });
  for (const [kind, off, gain, fx] of s.sfx) parts.push({ file: kind.includes("/") ? kind : sfxFile(kind), at: +(i * SCENE_LEN + off).toFixed(3), gain, fx, keep: true });
  console.log(` voice ${i}: "${s.de}" ${dur.toFixed(2)}s`);
});
parts.push({ file: sfxFile("tada"), at: +(SCENES.length * SCENE_LEN + 0.2).toFixed(3), gain: 0.3, keep: true });
const scenes = SCENES.map((s, i) => ({ ...s, t0: +(i * SCENE_LEN).toFixed(3), t1: +((i + 1) * SCENE_LEN).toFixed(3) }));
const end = { ...END, t0: +(SCENES.length * SCENE_LEN + 0.15).toFixed(3) };
scenes[scenes.length - 1].t1 = end.t0;

// 2. voice mix
const voice = `${vDir}/oma.m4a`;
const delays = parts.map((p, i) => `[${i + 1}:a]${p.gain ? `volume=${p.gain},` : ""}${p.fx ? `${p.fx},` : ""}adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)}[v${i}]`).join(";");
execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-t", String(duration), "-i", "anullsrc=r=44100:cl=stereo",
  ...parts.flatMap((p) => ["-i", p.file]),
  "-filter_complex", `${delays};[0:a]${parts.map((_, i) => `[v${i}]`).join("")}amix=inputs=${parts.length + 1}:duration=first:normalize=0[m];[m]loudnorm=I=-16:TP=-2:LRA=11[out]`,
  "-map", "[out]", "-c:a", "aac", "-b:a", "192k", voice], { stdio: "inherit" });

// 3. the film in three looks
const stage = { id: "oma-stage", src: "public/2d/oma-stage.js", cfg: "__oma", draw: "__omaDraw" };
const silentFor = {};
for (const theme of ["easy", "tiktok", "youtube"]) {
  const c = `${compDir}/oma-${theme}.html`;
  writeFileSync(c, buildKochHTML({ total: duration, theme, scenes, mouth, end, stage, noSparks: true }));
  assertComposition(c, { cli: HF });
  const silent = `${outDir}/oma-${theme}-silent.mp4`;
  execSync(`${HF} render -c "${c}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
  silentFor[theme] = silent;
}

// 4. music bed kitchen-1, then Telegram
const caption = "Oma sagt … 👵\n\n#DeutschLernen #LearnGerman #Deutsch #A1 #Imperativ #fyp";
await deliver({ id: "oma", iso, episodeNo: 1, text: { title: "Oma sagt" }, duration, caption, cuts: scenes.map((s) => s.t0), voice,
  silentIn: silentFor.easy, silentFor, parts, tg, noTelegram, isCorrection: true, saveProgress: () => {}, idx: 0, outDir,
  brand: { label: "Oma sagt", file: "oma" }, dips: [], musicStyle: "comedy", bedPrefix: "kitchen", bedPick: "kitchen-1", musicGain: 0.35 });
