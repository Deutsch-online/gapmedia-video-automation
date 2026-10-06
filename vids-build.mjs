// The two Google Vids clips of «Oma sagt 2» (public/ai-cast/oma-vids.mp4, merged), captioned and sent in three formats to the owner's bot chat.
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
const VIDEO = "public/ai-cast/oma-vids.mp4";
const total = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", VIDEO], { encoding: "utf8" }));

// when the sentences are spoken in the clips (the starts come from the Vids caption track; the last two are by the 5 s rhythm of the clips)
const ORDERS = [
  [0.2, "Mach die Tür auf!", "Mach", "در را باز کن!"], [5.4, "Zieh die Jacke an!", "Zieh", "کاپشن را بپوش!"],
  [10.56, "Trink das Wasser!", "Trink", "آب را بنوش!"], [15.5, "Iss den Apfel!", "Iss", "سیب را بخور!"],
  [20.4, "Schreib deinen Namen!", "Schreib", "اسمت را بنویس!"], [25.3, "Lies das Buch!", "Lies", "کتاب را بخوان!"],
  [30.5, "Gieß die Blume!", "Gieß", "به گل آب بده!"], [35.2, "Wirf den Ball zu mir!", "Wirf", "توپ را بسوی من پرت کن!"],
  [40.4, "Mach das Licht aus!", "Mach", "چراغ را خاموش کن!"], [45.4, "Komm zu mir!", "Komm", "پیش من بیا!"],
  [50.4, "Du bist toll!", "bist", "تو عالی هستی!"],
];
const caps = ORDERS.map(([t0, de, verb, fa], i) => ({ t0: Math.max(0, t0 - 0.1), t1: (ORDERS[i + 1] ? ORDERS[i + 1][0] - 0.2 : total - 0.2), de, verb, fa }));

const compDir = `compositions/vids/${iso}`, outDir = `renders/vids/${iso}`;
for (const d of [compDir, outDir]) mkdirSync(d, { recursive: true });
const voice = `${outDir}/oma-vids-audio.m4a`;
execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", VIDEO, "-vn", "-c:a", "aac", "-b:a", "192k", voice]);
const silentFor = {};
for (const theme of ["easy", "tiktok", "youtube"]) {
  const c = `${compDir}/oma-vids-${theme}.html`;
  writeFileSync(c, buildVidsHTML({ total, theme, video: VIDEO, caps }));
  assertComposition(c, { cli: HF });
  const silent = `${outDir}/oma-vids-${theme}-silent.mp4`;
  execSync(`${HF} render -c "${c}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
  silentFor[theme] = silent;
}
await deliver({ id: "oma-vids", iso, episodeNo: 1, text: { title: "Oma sagt 2" }, duration: total, caption: "Oma sagt (2) 👵\n\n#DeutschLernen #LearnGerman #Deutsch #A1 #Imperativ #fyp", cuts: [], voice,
  silentIn: silentFor.easy, silentFor, parts: [], tg, noTelegram, isCorrection: true, saveProgress: () => {}, idx: 0, outDir,
  brand: { label: "Oma sagt 2", file: "omavids" }, dips: [], musicStyle: "none" });
