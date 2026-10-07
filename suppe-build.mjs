// «Die Suppe» on Hugging Face: builds the episode and sends it, in three formats, to the owner's bot chat only.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runSeries } from "./lib/easydeutsch.mjs";
import { SUPPE_CFG, SUPPE_EPISODES } from "./lib/suppe-series.mjs";
import { loadEnv, telegramConfig } from "./lib/telegram.mjs";

process.chdir(dirname(fileURLToPath(import.meta.url)));
const localEnv = loadEnv();
Object.assign(process.env, localEnv);
const tg = telegramConfig(localEnv);
const ids = Object.keys(SUPPE_EPISODES);
const argAt = process.argv.indexOf("--episode");
const id = argAt > 0 ? process.argv[argAt + 1] : ids[0];
const idx = ids.indexOf(id);
if (idx < 0) { console.error(` ✗ unknown Suppe episode "${id}"`); process.exit(1); }
await runSeries(SUPPE_CFG, {
  unit: { id }, nextUnit: { id: ids[idx + 1] || "" }, episodeNo: idx + 1, idx, isCorrection: true, tg,
  noTelegram: process.argv.includes("--no-telegram"),
  HF: process.env.OMA_HF || "npx --yes hyperframes@0.8.79", iso: new Date().toISOString().slice(0, 10), saveProgress: () => {},
});
