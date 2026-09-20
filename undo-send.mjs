// Deletes the videos the bot last posted to Telegram.
//
// Usage:  node undo-send.mjs        # the last 3 (one day's batch)
//         node undo-send.mjs 6      # the last 6
//
// Telegram only lets a bot delete its own messages, and only for 48 hours after
// posting. Anything older has to be removed by hand in the app — the script says
// so rather than failing silently.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { loadEnv, telegramConfig, deleteMessage, sendMessage } from "./lib/telegram.mjs";

process.chdir(dirname(fileURLToPath(import.meta.url)));

const LOG = ".telegram-sent.json";
const n = Math.max(1, Number(process.argv[2]) || 3);
const tg = telegramConfig(loadEnv());

if (!tg.enabled) { console.error("Telegram is not configured."); process.exit(1); }
if (!existsSync(LOG)) { console.log("Nothing recorded as sent yet."); process.exit(0); }

const all = JSON.parse(readFileSync(LOG, "utf8"));
const want = process.argv.includes("--news") ? "news" : process.argv.includes("--daily") ? "daily" : null;
const log = all;
const pool = want ? all.filter((x) => (x.kind || "daily") === want) : all;
const batch = pool.slice(-n);
if (!batch.length) { console.log("Nothing to delete."); process.exit(0); }

const DAY2 = 48 * 60 * 60 * 1000;
let removed = 0, tooOld = 0, failed = [];

for (const item of batch) {
  if (Date.now() - item.at > DAY2) { tooOld++; continue; }
  // Delete where the video actually went: every sendVideo in this project
  // addresses tg.reviewChatId, so tg.chatId would delete nothing.
  const r = await deleteMessage({ token: tg.token, chatId: tg.reviewChatId, messageId: item.messageId });
  if (r.ok) removed++;
  else failed.push(`${item.platform}: ${r.error}`);
}

// keep only what is still standing
const removedIds = new Set(batch.filter((b) => Date.now() - b.at <= DAY2).map((b) => b.messageId));
writeFileSync(LOG, JSON.stringify(all.filter((x) => !removedIds.has(x.messageId)), null, 2));

// A deleted video's dedupe fingerprint used to survive forever, in two
// separate files with two separate real jobs — daily-render.mjs's send-time
// duplicate gate (lib/dedupe.mjs's fingerprint check) reads
// .content-registry.json specifically, not .content-history.json (that one
// is topic-plan.mjs's own, simpler "already proposed" memory). Both matched
// on this content and permanently refused to resend the same id, even for
// content undone specifically *because* the first send was defective (e.g.
// sent silent, no narration). Undoing a send has to undo both records.
for (const FILE of [".content-history.json", ".content-registry.json"]) {
  if (!removedIds.size || !existsSync(FILE)) continue;
  try {
    const stored = JSON.parse(readFileSync(FILE, "utf8"));
    const kept = stored.filter((x) => !removedIds.has(x.messageId));
    if (kept.length !== stored.length) writeFileSync(FILE, JSON.stringify(kept, null, 2));
  } catch { /* a missing/unreadable dedupe file is not this script's job to fix */ }
}

const lines = [`🗑 ${removed} ویدیو حذف شد.`];
if (tooOld) lines.push(`${tooOld} تا قدیمی‌تر از ۴۸ ساعت بود و تلگرام اجازهٔ حذفش را نمی‌دهد — دستی پاکشان کن.`);
if (failed.length) lines.push("خطا: " + failed.join(" · "));

const text = lines.join("\n");
await sendMessage({ token: tg.token, chatId: tg.chatId, text });
console.log(text);
