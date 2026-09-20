// Owner instruction, 2026-09-20: "قبلا چت ایدی اضافه کردم چرا حالا دوباره
// اضافه کنم از همان کار بگیر فقط ارتباط را با بات برقرار کن".
//
// The value already in TELEGRAM_CHAT_ID is a broadcast channel — Telegram's own
// getChat calls it «AfghanFollowers - افغان فالور», type "channel". A channel id
// cannot be turned into a private chat id by any amount of code: the one-to-one
// conversation with the bot is a different number that only exists once the
// owner has written to the bot.
//
// So the bot learns it instead of being told it. Any private chat that writes to
// the bot is recorded here, and from then on both directions — what the project
// sends and what it receives — use that chat. No new secret, and no channel.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { getUpdates } from "./telegram.mjs";

export const BOT_CHAT_FILE = ".telegram-bot-chat.json";

export function readBotChat(file = BOT_CHAT_FILE) {
  try {
    const saved = JSON.parse(readFileSync(file, "utf8"));
    return saved && saved.id ? saved : null;
  } catch { return null; }
}

// Written by whichever process first sees the owner talk to the bot. Kept in the
// repo on purpose: getUpdates is a queue, and cloud-listen.mjs confirms offsets
// as it polls, so an update seen once is gone. A committed note survives that.
export function rememberBotChat(chat, file = BOT_CHAT_FILE) {
  if (!chat || chat.type !== "private" || !chat.id) return null;
  const current = readBotChat(file);
  if (current && String(current.id) === String(chat.id)) return current;
  const record = {
    id: String(chat.id),
    type: chat.type,
    name: [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || null,
    learnedAt: new Date().toISOString(),
  };
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

// Synchronous, no network: what the project should talk to right now.
//   1. an explicit override, when someone set one
//   2. the chat the bot has already learned
//   3. whatever TELEGRAM_CHAT_ID holds — which the preflight still checks, so a
//      channel is refused rather than published to
export function botChatIdFrom(env, file = BOT_CHAT_FILE) {
  return env?.TELEGRAM_REVIEW_CHAT_ID || readBotChat(file)?.id || env?.TELEGRAM_CHAT_ID || "";
}

// Last resort, with the network: read the pending update queue and look for a
// private chat. Called WITHOUT an offset, so nothing is confirmed and
// cloud-listen.mjs's own polling is left exactly as it was.
//
// Returns { chat } when exactly one private chat is waiting, { candidates } when
// several are (which a person must settle, since picking one at random could
// send the owner's videos to somebody else), or { chat: null } when the queue
// holds none.
export async function discoverBotChat({ token, file = BOT_CHAT_FILE } = {}) {
  if (!token) return { chat: null, reason: "no-token" };
  let updates;
  try {
    updates = await getUpdates({ token, offset: undefined, timeout: 0 });
  } catch (e) {
    return { chat: null, reason: `getUpdates failed: ${e.message}` };
  }
  const seen = new Map();
  for (const u of updates || []) {
    const chat = (u.message || u.edited_message || u.my_chat_member || {}).chat;
    if (chat?.type === "private" && chat.id) seen.set(String(chat.id), chat);
  }
  const found = [...seen.values()];
  if (found.length === 1) return { chat: rememberBotChat(found[0], file) };
  if (found.length > 1) return { chat: null, candidates: found, reason: "several private chats are waiting" };
  return { chat: null, reason: "no private chat has written to the bot yet" };
}
