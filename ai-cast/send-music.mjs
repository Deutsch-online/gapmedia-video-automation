// Sends the comedy beds to the bot chat for listening (owner, 2026-10-04).
import { existsSync, readdirSync } from "node:fs";
import { loadEnv, telegramConfig, sendAudio } from "../lib/telegram.mjs";
const tg = telegramConfig(loadEnv());
if (!tg.enabled) { console.log("Telegram is not configured"); process.exit(0); }
for (const f of existsSync("public/music") ? readdirSync("public/music").filter((x) => /^comedy-\d\.mp3$/.test(x)).sort() : []) {
  await sendAudio({ token: tg.token, chatId: tg.reviewChatId, file: `public/music/${f}`, caption: `comedy music bed ${f}`, title: f });
  console.log(`sent ${f}`);
}
