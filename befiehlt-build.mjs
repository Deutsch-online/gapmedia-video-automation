// «Frau Krause befiehlt»: builds the stand-alone episode and sends it, in three formats (TikTok, Instagram,
// YouTube Shorts), to the owner's bot chat only. No progress pointer (one episode, re-run on demand).
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runSeries } from "./lib/easydeutsch.mjs";
import { BEFIEHLT_CFG, BEFIEHLT_EPISODES } from "./lib/befiehlt-series.mjs";
import { loadEnv, telegramConfig } from "./lib/telegram.mjs";

process.chdir(dirname(fileURLToPath(import.meta.url)));
const localEnv = loadEnv();
Object.assign(process.env, localEnv);
const tg = telegramConfig(localEnv);
const ids = Object.keys(BEFIEHLT_EPISODES);
const argAt = process.argv.indexOf("--episode");
const id = argAt > 0 ? process.argv[argAt + 1] : ids[0];
const idx = ids.indexOf(id);
if (idx < 0) { console.error(` ✗ unknown Befiehlt episode "${id}"`); process.exit(1); }
await runSeries(BEFIEHLT_CFG, {
  unit: { id }, nextUnit: { id: ids[idx + 1] || "" }, episodeNo: idx + 1, idx, isCorrection: true, tg,
  noTelegram: process.argv.includes("--no-telegram"),
  HF: "npx --yes hyperframes@0.8.79", iso: new Date().toISOString().slice(0, 10), saveProgress: () => {},
});
