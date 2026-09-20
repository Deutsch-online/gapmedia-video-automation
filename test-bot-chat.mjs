// Owner, 2026-09-20: "قبلا چت ایدی اضافه کردم چرا حالا دوباره اضافه کنم از همان
// کار بگیر فقط ارتباط را با بات برقرار کن".
//
// TELEGRAM_CHAT_ID holds a broadcast channel — Telegram's own getChat named it
// «AfghanFollowers - افغان فالور», type "channel". No code can derive the
// one-to-one chat id from a channel id, so the bot learns it from whoever
// writes to it instead of the owner configuring a second secret.
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { rememberBotChat, readBotChat, botChatIdFrom, discoverBotChat } from "./lib/bot-chat.mjs";

const F = "./.test-bot-chat.json";
const reset = () => rmSync(F, { force: true });
reset();

// ── only a private chat is ever learned ──────────────────────────────────
assert.equal(rememberBotChat({ id: -1001, type: "channel", title: "AfghanFollowers" }, F), null,
  "a channel must never be learned as the bot chat — that is the thing being moved away from");
assert.equal(rememberBotChat({ id: -100, type: "supergroup", title: "Review" }, F), null,
  "a group is not the one-to-one chat with the bot either");
const learned = rememberBotChat({ id: 555, type: "private", first_name: "Nec" }, F);
assert.equal(learned.id, "555");
assert.equal(readBotChat(F).id, "555", "the learned chat must survive a re-read");
console.log("ok   only the one-to-one chat with the bot is learned");

// ── resolution order ─────────────────────────────────────────────────────
assert.equal(botChatIdFrom({ TELEGRAM_REVIEW_CHAT_ID: "999", TELEGRAM_CHAT_ID: "@Chan" }, F), "999",
  "an explicit override wins, so a wrong guess is always correctable");
assert.equal(botChatIdFrom({ TELEGRAM_CHAT_ID: "@Chan" }, F), "555",
  "the learned chat beats the configured channel — that is the whole point");
assert.equal(botChatIdFrom({ TELEGRAM_CHAT_ID: "@Chan" }, "./.no-such-file.json"), "@Chan",
  "with nothing learned it falls back, and the preflight refuses the channel");
console.log("ok   the learned chat outranks the configured channel, and an override outranks both");

// ── discovery from the pending update queue ──────────────────────────────
const stub = (updates) => { globalThis.fetch = async () => ({ json: async () => ({ ok: true, result: updates }) }); };

reset();
stub([
  { update_id: 1, message: { chat: { id: -1001, type: "channel", title: "AfghanFollowers" } } },
  { update_id: 2, message: { chat: { id: 777, type: "private", first_name: "Nec" } } },
]);
assert.equal((await discoverBotChat({ token: "t", file: F })).chat.id, "777",
  "one private chat among channel posts is the bot chat");

// Picking one of several at random could send the owner's videos to a stranger.
reset();
stub([
  { update_id: 1, message: { chat: { id: 1, type: "private" } } },
  { update_id: 2, message: { chat: { id: 2, type: "private" } } },
]);
const many = await discoverBotChat({ token: "t", file: F });
assert.equal(many.chat, null, "several private chats must not be guessed between");
assert.equal(many.candidates.length, 2, "the candidates are reported so a person can settle it");

reset();
stub([{ update_id: 1, message: { chat: { id: -1, type: "channel" } } }]);
assert.equal((await discoverBotChat({ token: "t", file: F })).chat, null,
  "an empty queue is not an error, it just means nobody has written yet");

// A network failure must not be mistaken for "no chat".
globalThis.fetch = async () => { throw new Error("ECONNRESET"); };
const blip = await discoverBotChat({ token: "t", file: F });
assert.equal(blip.chat, null);
assert.match(blip.reason, /getUpdates failed/, "a network failure says so instead of looking like an empty queue");
console.log("ok   discovery finds the one chat, refuses to guess between several, and survives an outage");
reset();

// ── the queue is actually read ───────────────────────────────────────────
// Run #137 (2026-09-20) reported "no private chat has written to the bot yet"
// for a chat that HAD written: discovery omits the offset on purpose, but
// getUpdates interpolated it anyway and sent «offset=undefined», which Telegram
// rejects. The rejection came back as [] — indistinguishable from an empty
// queue, so discovery never really looked.
{
  const urls = [];
  globalThis.fetch = async (url) => { urls.push(String(url)); return { json: async () => ({ ok: true, result: [] }) }; };
  await discoverBotChat({ token: "t", file: F });
  assert.equal(urls.length, 1, "discovery must actually call getUpdates");
  assert.doesNotMatch(urls[0], /offset=undefined/,
    "an omitted offset must be left out of the query, not sent as the string 'undefined'");
  assert.doesNotMatch(urls[0], /offset=/,
    "discovery must not confirm anything, so the real poller keeps its place");

  // A refusal must not read as an empty queue.
  globalThis.fetch = async () => ({ json: async () => ({ ok: false, description: "Bad Request: bad offset" }) });
  const refused = await discoverBotChat({ token: "t", file: F });
  assert.equal(refused.chat, null);
  assert.match(refused.reason, /getUpdates failed/, "a refused call must say so, not look like nobody wrote");
}
console.log("ok   discovery reads the queue without confirming it, and tells a refusal from an empty queue");

// ── both directions actually use it ──────────────────────────────────────
const listener = readFileSync("cloud-listen.mjs", "utf8");
assert.match(listener, /if \(msg\.chat\?\.type === "private"\) \{/,
  "the listener must learn the bot chat when someone writes to it");
assert.match(listener, /const accepted = new Set\(\[String\(tg\.chatId\), String\(tg\.reviewChatId\), String\(readBotChat\(\)\?\.id \?\? ""\)\]\);/,
  "the listener must accept the bot chat, not only the channel it was pinned to");

const cycle = readFileSync("german-cycle.mjs", "utf8");
assert.match(cycle, /const destinations = botChat\?\.id\s*\n?\s*\? \[String\(botChat\.id\)\]/,
  "once the bot chat is known it must be the only destination — the channel stops being one");

const build = readFileSync("german-lesson-build.mjs", "utf8");
assert.doesNotMatch(build, /chatId: tg\.chatId/,
  "no German message may still address the configured channel");
assert.doesNotMatch(cycle, /chatId: tg\.chatId/,
  "the cycle's own reports must follow the video to the bot chat");
console.log("ok   sending and receiving both run through the bot chat");
