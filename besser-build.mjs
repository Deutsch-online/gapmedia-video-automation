// The two Google Vids clips of «Besser sagen» (public/ai-cast/besser-gemini-1.mp4, merged), captioned and sent in three formats to the owner's bot chat.
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deliver } from "./lib/easydeutsch.mjs";
import { buildVidsHTML } from "./lib/vids-film.mjs";
import { assertComposition } from "./lib/hf-check.mjs";
import { loadEnv, telegramConfig } from "./lib/telegram.mjs";

process.chdir(dirname(fileURLToPath(import.meta.url)));
const localEnv = loadEnv(); Object.assign(process.env, localEnv);
const tg = telegramConfig(localEnv);
const HF = process.env.OMA_HF || "npx --yes hyperframes@0.8.134", iso = new Date().toISOString().slice(0, 10);
const noTelegram = process.argv.includes("--no-telegram");
const VIDEO = "public/ai-cast/besser-gemini-1.mp4";
const total = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", VIDEO], { encoding: "utf8" }));

// when the sentences are spoken in the Gemini clip (word timings from the CI Whisper transcript)
const ORDERS = [
  [0.0, "Ich will Pizza.", "will", "من پیتزا می‌خواهم."],
  [2.6, "Nicht gut. Ich möchte eine Pizza.", "möchte", "خوب نیست. من یک پیتزا می‌خواهم (مؤدبانه)."],
  [5.0, "Ich möchte eine Pizza.", "möchte", "من یک پیتزا می‌خواهم (مؤدبانه)."],
  [10.4, "Ich nehme Kaffee.", "nehme", "من قهوه می‌گیرم."],
  [12.3, "Besser. Ich hätte gern einen Kaffee.", "hätte", "بهتر. من یک قهوه می‌خواهم."],
  [14.8, "Ich hätte gern einen Kaffee.", "hätte", "من یک قهوه می‌خواهم."],
  [20.4, "Gib mir Brot.", "Gib", "به من نان بده."],
  [22.3, "Nein, ich hätte gern ein Brot.", "hätte", "نه، یک نان می‌خواهم (مؤدبانه)."],
  [25.2, "Nein, ich hätte gern ein Brot.", "hätte", "نه، یک نان می‌خواهم (مؤدبانه)."],
  [28.2, "Ich hätte gern ein Brot.", "hätte", "من یک نان می‌خواهم (مؤدبانه)."],
];
const caps = ORDERS.map(([t0, de, verb, fa], i) => ({ t0: Math.max(0, t0 - 0.1), t1: (ORDERS[i + 1] ? ORDERS[i + 1][0] - 0.2 : total - 0.2), de, verb, fa }));

const compDir = `compositions/vids/${iso}`, outDir = `renders/vids/${iso}`;
for (const d of [compDir, outDir]) mkdirSync(d, { recursive: true });
const voice = `${outDir}/besser-1-audio.m4a`;
execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", VIDEO, "-vn", "-c:a", "aac", "-b:a", "192k", voice]);
const silentFor = {};
for (const theme of ["easy", "tiktok", "youtube"]) {
  const c = `${compDir}/besser-1-${theme}.html`;
  writeFileSync(c, buildVidsHTML({ total, theme, video: VIDEO, caps }));
  assertComposition(c, { cli: HF });
  const silent = `${outDir}/besser-1-${theme}-silent.mp4`;
  execSync(`${HF} render -c "${c}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
  silentFor[theme] = silent;
}
await deliver({ id: "besser-1", iso, episodeNo: 1, text: { title: "Besser sagen" }, duration: total, caption: "Höflich bitten ☕🍞\n\n#DeutschLernen #LearnGerman #Deutsch #A1 #Alltag #fyp", cuts: [], voice,
  silentIn: silentFor.easy, silentFor, parts: [], tg, noTelegram, isCorrection: true, saveProgress: () => {}, idx: 0, outDir,
  brand: { label: "Besser sagen", file: "besser" }, dips: [], musicStyle: "none" });
