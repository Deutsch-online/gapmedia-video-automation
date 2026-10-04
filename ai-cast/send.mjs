// Sends what the AI-cast run made today to the owner's bot chat (never the channel).
import { readFileSync, existsSync } from "node:fs";
import { telegramConfig, sendPhoto, sendVideo, sendMessage } from "../lib/telegram.mjs";

const tg = telegramConfig(process.env);
const r = JSON.parse(readFileSync("ai-cast/last-run.json", "utf8"));
if (!tg.token || !tg.reviewChatId) { console.log("telegram not configured"); process.exit(0); }
for (const id of r.made) {
  const png = `public/ai-cast/${id}.png`, mp4 = `public/ai-cast/${id}.mp4`;
  if (existsSync(png)) await sendPhoto({ token: tg.token, chatId: tg.reviewChatId, file: png, caption: `EasyDeutsch — AI cast: ${id}` });
  if (existsSync(mp4)) await sendVideo({ token: tg.token, chatId: tg.reviewChatId, file: mp4, caption: `EasyDeutsch — AI cast: ${id}` });
}
await sendMessage({ token: tg.token, chatId: tg.reviewChatId, text: `EasyDeutsch AI cast\n${r.log.join("\n")}\nleft: ${r.left.length ? r.left.join(", ") : "nothing — the library is complete"}` });
