// The two Google Vids clips of «Beim Bäcker» (public/ai-cast/baecker-vids.mp4, merged), captioned and sent in three formats to the owner's bot chat.
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
const VIDEO = "public/ai-cast/baecker-vids.mp4";
const total = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", VIDEO], { encoding: "utf8" }));

// when the sentences are spoken in the clips (the starts come from the Vids caption track; the last two are by the 5 s rhythm of the clips)
const ORDERS = [
  [0.0, "Guten Morgen. Ich hätte gern zwei Brötchen.", "hätte", "صبح بخیر. دو تا نان می‌خواهم."],
  [7.1, "Gern. Das macht 2 €.", "macht", "بفرمایید. می‌شود ۲ یورو."],
  [11.4, "2 €? Das ist zu teuer.", "ist", "۲ یورو؟ این خیلی گران است."],
  [15.2, "Ab 80 Jahren gibt es Rabatt.", "gibt", "از ۸۰ سالگی تخفیف هست."],
  [20.7, "Ich bin 80.", "bin", "من ۸۰ ساله‌ام."],
  [25.1, "Oma, du bist 79.", "bist", "مادربزرگ، تو ۷۹ ساله‌ای."],
  [30.2, "Psst! Ein Jahr ist egal.", "ist", "هیس! یک سال مهم نیست."],
  [35.7, "Zeigen Sie bitte Ihren Ausweis.", "Zeigen", "لطفاً کارت شناسایی‌تان را نشان دهید."],
  [42.0, "Mein Ausweis ist zu Hause.", "ist", "کارت شناسایی‌ام خانه است."],
  [45.3, "Dann macht es 2 €.", "macht", "پس می‌شود ۲ یورو."],
  [51.2, "Na gut. Hier, 2 €.", "", "باشد. بفرمایید، ۲ یورو."],
  [54.5, "Aber morgen hat Oma Geburtstag.", "hat", "ولی فردا تولد مادربزرگ است."],
  [61.6, "Dann ist es ein Geschenk. Alles Gute!", "ist", "پس این هدیه است. تولدت مبارک!"],
  [65.4, "Siehst du, ich habe nicht gelogen.", "habe", "دیدی، دروغ نگفتم."],
];
const caps = ORDERS.map(([t0, de, verb, fa], i) => ({ t0: Math.max(0, t0 - 0.1), t1: (ORDERS[i + 1] ? ORDERS[i + 1][0] - 0.2 : total - 0.2), de, verb, fa }));

const compDir = `compositions/vids/${iso}`, outDir = `renders/vids/${iso}`;
for (const d of [compDir, outDir]) mkdirSync(d, { recursive: true });
const voice = `${outDir}/baecker-vids-audio.m4a`;
execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", VIDEO, "-vn", "-c:a", "aac", "-b:a", "192k", voice]);
const silentFor = {};
for (const theme of ["easy", "tiktok", "youtube"]) {
  const c = `${compDir}/baecker-vids-${theme}.html`;
  writeFileSync(c, buildVidsHTML({ total, theme, video: VIDEO, caps }));
  assertComposition(c, { cli: HF });
  const silent = `${outDir}/baecker-vids-${theme}-silent.mp4`;
  execSync(`${HF} render -c "${c}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
  silentFor[theme] = silent;
}
await deliver({ id: "baecker-vids", iso, episodeNo: 1, text: { title: "Beim Bäcker" }, duration: total, caption: "Beim Bäcker 🥖\n\n#DeutschLernen #LearnGerman #Deutsch #A1 #Alltag #fyp", cuts: [], voice,
  silentIn: silentFor.easy, silentFor, parts: [], tg, noTelegram, isCorrection: true, saveProgress: () => {}, idx: 0, outDir,
  brand: { label: "Beim Bäcker", file: "baecker" }, dips: [], musicStyle: "none" });
