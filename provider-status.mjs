// Telegram-facing Provider List and latest file-ready report.
import { existsSync, readFileSync } from "node:fs";
import { formatProviderReportFa } from "./lib/providers.mjs";
import { loadEnv, sendMessage, telegramConfig } from "./lib/telegram.mjs";

const env = loadEnv();
const tg = telegramConfig(env);
const report = formatProviderReportFa(env);
let latest = null;
try {
  const events = JSON.parse(readFileSync(".provider-runtime-report.json", "utf8"))?.events || [];
  latest = events.at(-1) || null;
} catch { /* no provider file has been received yet */ }
const suffix = latest
  ? `\n\n<b>آخرین فایل آماده</b>\n${latest.provider} — ${latest.capability} — ${latest.status}\nمرحلهٔ بعد: ورک‌فلو ادامه دارد و نتیجه به تلگرام گزارش می‌شود.`
  : "\n\nهنوز فایل جدیدی از یک Provider ثبت نشده است.";
console.log(report.replace(/<[^>]+>/g, "") + suffix.replace(/<[^>]+>/g, ""));
if (tg.enabled) await sendMessage({ token: tg.token, chatId: tg.chatId, text: report + suffix });
