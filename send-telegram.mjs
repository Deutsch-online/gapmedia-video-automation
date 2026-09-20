// Manually send an existing day's 3 videos to Telegram (for testing the setup).
// Usage: node send-telegram.mjs [YYYY-MM-DD]   (defaults to today)
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { existsSync } from "node:fs";
import { loadEnv, telegramConfig, sendVideo } from "./lib/telegram.mjs";
import { packsForDate, CATEGORIES } from "./lib/content.mjs";

process.chdir(dirname(fileURLToPath(import.meta.url)));

const iso = (process.argv[2] || new Date().toISOString().slice(0, 10));
const tg = telegramConfig(loadEnv());
if (!tg.enabled) {
  console.error("✗ Telegram not configured. Put TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env (see .env.example).");
  process.exit(1);
}

const sel = packsForDate(new Date(iso + "T12:00:00"));
let n = 0;
for (const p of CATEGORIES) {
  const file = `renders/daily/${iso}/gapmedia-${p}-${iso}.mp4`;
  if (!existsSync(file)) { console.error(`  skip ${p}: not found (${file})`); continue; }
  process.stdout.write(`  sending ${p}... `);
  // A video goes to the bot chat, never to whatever TELEGRAM_CHAT_ID points at.
  try { await sendVideo({ token: tg.token, chatId: tg.reviewChatId, file, caption: sel[p].tgTitle }); console.log("✈ ok"); n++; }
  catch (e) { console.log("✗ " + e.message); }
}
console.log(`\nDone — ${n}/3 sent for ${iso}.`);
