// «خانواده در غربت»: builds the next episode of the Afghan-family comedy series and sends it, in
// three formats (TikTok, Instagram, YouTube Shorts), to the owner's bot chat only.
// Progress: .family-progress.json (nextIndex). An optional --episode <id> re-renders one episode
// without moving the pointer. No episode left: a message to the owner, no video, a clear failure.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runSeries } from "./lib/easydeutsch.mjs";
import { FAMILY_CFG, FAMILY_EPISODES } from "./lib/family-series.mjs";
import { loadEnv, telegramConfig, sendMessage } from "./lib/telegram.mjs";

process.chdir(dirname(fileURLToPath(import.meta.url)));
const localEnv = loadEnv();
Object.assign(process.env, localEnv);
const tg = telegramConfig(localEnv);
const noTelegram = process.argv.includes("--no-telegram");
const ids = Object.keys(FAMILY_EPISODES);
const PROGRESS = ".family-progress.json";
const argAt = process.argv.indexOf("--episode");
const forced = argAt > 0 ? process.argv[argAt + 1] : "";
const nextIndex = () => { try { return Math.max(0, Number(JSON.parse(readFileSync(PROGRESS, "utf8")).nextIndex) || 0); } catch { return 0; } };
const saveProgress = (i) => writeFileSync(PROGRESS, JSON.stringify({ nextIndex: i, lastBuiltAt: new Date().toISOString() }, null, 2));

const isCorrection = !!forced;
const idx = isCorrection ? ids.indexOf(forced) : nextIndex();
if (isCorrection && idx < 0) { console.error(` ✗ unknown family episode "${forced}"`); process.exit(1); }
if (idx >= ids.length) {
  console.error(` ✗ the family series has no episode left (${ids.length} written).`);
  if (tg.enabled) { try { await sendMessage({ token: tg.token, chatId: tg.reviewChatId, text: `⚠ قسمت تازه‌ای برای «${FAMILY_CFG.series.title}» آماده نیست (${ids.length} قسمت نوشته شده). ویدیو ساخته نشد تا تکراری نباشد.` }); } catch {} }
  process.exit(1);
}
const unit = { id: ids[idx] };
await runSeries(FAMILY_CFG, {
  unit, nextUnit: { id: ids[idx + 1] || "" }, episodeNo: idx + 1, idx, isCorrection, tg, noTelegram,
  HF: "npx --yes hyperframes@0.8.79", iso: new Date().toISOString().slice(0, 10), saveProgress,
});
