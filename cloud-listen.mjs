// Cloud command listener.
// GitHub Actions cannot hold a socket open, so instead of a long-running bot we
// poll Telegram on a schedule: read any new messages, act on the newest command,
// and remember the last update id so the same order never runs twice.
//
// Prints the chosen action for the workflow to consume, e.g.  ACTION=all
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { loadEnv, telegramConfig, sendMessage, getUpdates } from "./lib/telegram.mjs";
import { rememberBotChat, readBotChat } from "./lib/bot-chat.mjs";
import { parseCommand, HELP_TEXT } from "./lib/commands.mjs";

process.chdir(dirname(fileURLToPath(import.meta.url)));

const STATE = ".telegram-offset";
const tg = telegramConfig(loadEnv());
if (!tg.enabled) { console.log("ACTION=none"); process.exit(0); }

// A bare number (or the topic's own words) replying to the last content-radar
// shortlist should pick one of its candidates — the Worker (worker/) has a
// KV-based "selection state" that does this, but per its own README it needs
// a one-time Cloudflare deploy the owner has not done, so this polling path
// (the one actually running) had no equivalent and silently ignored every
// reply. Only trusted while the list itself is recent (matches the 2-day
// auto-refresh window) so a reply days later can't land on a stale offer.
const RADAR_FILE = ".content-radar.json";
function radarShown() {
  try {
    const data = JSON.parse(readFileSync(RADAR_FILE, "utf8"));
    if (!Array.isArray(data.shown) || !data.shown.length) return null;
    const ageDays = (Date.now() - new Date(data.at).getTime()) / 86400000;
    return ageDays <= 2 ? data.shown : null;
  } catch { return null; }
}
function matchRadarPick(text, shown) {
  const t = String(text || "").trim();
  const digits = t.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  if (/^[0-9]+$/.test(digits)) {
    return shown.find((s) => s.n === Number(digits)) || null;
  }
  // Otherwise: does the reply share most of a candidate's own distinctive
  // words? Reuses content-radar.mjs's own stopword/stem approach so "typing
  // the topic instead of the number" (also promised in the radar message)
  // works the same way that script already dedupes near-identical titles.
  const words = (s) => new Set(
    String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const tw = words(t);
  if (tw.size < 2) return null;
  let best = null, bestScore = 0;
  for (const s of shown) {
    const sw = words(s.title);
    if (!sw.size) continue;
    let shared = 0;
    for (const w of tw) if (sw.has(w)) shared++;
    const score = shared / Math.min(tw.size, sw.size);
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return bestScore >= 0.5 ? best : null;
}

const stored = existsSync(STATE) ? Number(readFileSync(STATE, "utf8").trim()) || 0 : 0;

// timeout=0 → return immediately; a scheduled job must not sit and wait.
// getUpdates now throws when Telegram rejects the call, so that a caller can
// tell a refusal from an empty queue. This poll must not die of one: a bad
// minute at Telegram is not a reason to fail the scheduled job.
let updates = [];
try {
  updates = await getUpdates({ token: tg.token, offset: stored ? stored + 1 : 0, timeout: 0 });
} catch (e) {
  console.error(`poll skipped: ${e.message}`);
  console.log("ACTION=none");
  process.exit(0);
}

let action = "none", label = "", highest = stored, pick = 1, payloadText = "", photoFileId = "";
const shownRadar = radarShown();
const PAUSED_TUTORIAL_ACTIONS = new Set([
  "approved-feature", "rerender-feature", "content-approve", "build-tiktok",
  "build-instagram", "build-tools", "build-all", "build-tomorrow",
  "build-app-pair", "resend", "custom-content", "custom-content-media",
]);

const cleanPayload = (t) =>
  String(t)
    .replace(/^\s*(?:خبر|news)\s*[:：]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);

for (const u of updates) {
  highest = Math.max(highest, u.update_id);
  const msg = u.message || u.channel_post;
  if (!msg) continue;
  // The bot only ever listened to TELEGRAM_CHAT_ID, which is the channel — so a
  // message written in the one-to-one chat with the bot was dropped without a
  // trace. The owner asked for both directions to run through the bot
  // (2026-09-20), so the first private chat that writes is learned here and
  // accepted from then on. First writer wins; TELEGRAM_REVIEW_CHAT_ID overrides
  // it if that is ever the wrong chat.
  if (msg.chat?.type === "private") {
    const learned = rememberBotChat(msg.chat);
    if (learned) console.log(`bot chat learned: ${learned.name || learned.id} (${learned.id})`);
  }
  const accepted = new Set([String(tg.chatId), String(tg.reviewChatId), String(readBotChat()?.id ?? "")]);
  if (!accepted.has(String(msg.chat.id))) continue;
  // A real screenshot sent straight from the phone, caption = the feature
  // id it belongs to — the direct route PROJECT_RULES §14-د/14-ه already
  // calls for once no official source has the image. Telegram sends one
  // update per photo with several resolutions in `photo`; the array is
  // ordered smallest to largest, so the last entry is the one worth saving.
  if (Array.isArray(msg.photo) && msg.photo.length) {
    action = "user-photo"; label = "ذخیرهٔ عکس واقعی";
    payloadText = msg.caption || "";
    photoFileId = msg.photo[msg.photo.length - 1].file_id;
    continue; // a photo carries no further text command to parse
  }
  // Telegram sends an uncompressed image as `document` instead of `photo`
  // whenever the sender picks "send without compression" (or the file-picker
  // route on some clients) — same real screenshot, different update shape.
  // Missing this meant a screenshot sent that way got no response at all.
  if (msg.document && /^image\//.test(msg.document.mime_type || "")) {
    action = "user-photo"; label = "ذخیرهٔ عکس واقعی";
    payloadText = msg.caption || "";
    photoFileId = msg.document.file_id;
    continue;
  }
  if (!msg.text) continue;
  const radarPick = shownRadar && matchRadarPick(msg.text, shownRadar);
  if (radarPick) {
    // Same route custom-draft.mjs already serves for a creator-typed topic:
    // expand into a reviewable draft, never straight to a render.
    action = "content-topic-preview"; label = "پیش‌نمایش موضوع رادار"; payloadText = radarPick.title;
    continue;
  }
  const cmd = parseCommand(msg.text);
  if (cmd) {
    action = cmd.action; label = cmd.label; payloadText = msg.text;
    const digits = String(msg.text).replace(/[^0-9۰-۹]/g, "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
    pick = Number(digits) || 1;
  }
}

writeFileSync(STATE, String(highest));

if (action === "help") {
  await sendMessage({ token: tg.token, chatId: tg.chatId, text: HELP_TEXT });
  console.log("ACTION=none");
} else if (action === "status") {
  await sendMessage({
    token: tg.token, chatId: tg.chatId,
    text: "✅ سیستم ابری فعال است. فعلاً فقط درس‌های آلمانی A1 ساخته می‌شوند: هر درس حداقل یک دقیقه و در دو نسخهٔ مستقل TikTok و Instagram. برای شروع بنویس: «درس آلمانی بساز».",
  });
  console.log("ACTION=none");
} else if (action === "undo") {
  console.log("ACTION=undo");
} else if (PAUSED_TUTORIAL_ACTIONS.has(action)) {
  await sendMessage({
    token: tg.token, chatId: tg.chatId,
    text: "⏸ ویدیوهای آموزشی عمومی فعلاً متوقف هستند. در این مرحله فقط درس‌های آلمانی A1 در دو نسخهٔ TikTok و Instagram ساخته می‌شوند. برای ساخت بنویس: «درس آلمانی بساز». ",
  });
  console.log("ACTION=none");
} else if (action !== "none") {
  const planning = action.startsWith("plan-") || action === "research";
  const building = action.startsWith("build-") || action === "approved-feature" || action === "resend";
  await sendMessage({
    token: tg.token, chatId: tg.chatId,
    text: planning
      ? `🔎 دستور دریافت شد: ${label}. موضوع‌ها و لینک‌های تحقیق‌شده را می‌فرستم؛ هنوز ویدیویی ساخته نمی‌شود.`
      : building
        ? `✅ دستور دریافت شد: ${label}. ساخت در فضای ابری شروع شد.`
        : `📩 دستور دریافت شد: ${label}.`,
  });
  console.log(`ACTION=${action}`);
  console.log(`PICK=${pick}`);
  // flatten newlines — GITHUB_OUTPUT is line-based, so a multi-line value
  // would break the parsing of everything after it
  const payload = cleanPayload(payloadText);
  console.log(`PAYLOAD=${payload}`);
  if (photoFileId) console.log(`PHOTO_FILE_ID=${photoFileId}`);
} else {
  console.log("ACTION=none");
}

