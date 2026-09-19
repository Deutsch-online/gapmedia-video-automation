// Owner directive, 2026-09-19, stated twice and then widened: "تمام ارتباط
// باید با بات باشد و منبع ارسال و دریافت باید بات تلگرام باشد".
//
// So this is not only about the video file. Every destination the cycle can
// write to — the video and the reports alike — has to be the one-to-one chat
// with the bot. A channel or a group is refused before the build starts,
// because a video that reaches a channel cannot be recalled.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { telegramConfig, verifyDelivery } from "./lib/telegram.mjs";

// ── the destination resolves to the bot chat ─────────────────────────────
const withReview = telegramConfig({ TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "555", TELEGRAM_REVIEW_CHAT_ID: "777" });
assert.equal(withReview.reviewChatId, "777", "an explicit review chat wins for the video");
const withoutReview = telegramConfig({ TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "555" });
assert.equal(withoutReview.reviewChatId, "555", "without one, the video uses the single bot chat");
console.log("ok   the video destination resolves to a bot chat either way");

// ── only a private chat passes ───────────────────────────────────────────
const ME = { ok: true, result: { id: 80123, username: "GapMediaBot" } };
const stub = (chat) => {
  globalThis.fetch = async (url) => ({
    json: async () => (String(url).includes("getMe") ? ME : { ok: true, result: chat }),
  });
};
for (const [type, allowed] of [["channel", false], ["supergroup", false], ["group", false], ["private", true]]) {
  stub({ id: 1, title: "X", first_name: "Nec", type });
  const r = await verifyDelivery({ token: "t", chatId: "1", requirePrivate: true });
  assert.equal(r.ok, allowed, `a ${type} destination must be ${allowed ? "allowed" : "refused"} for bot-only traffic`);
}
console.log("ok   channel, group and supergroup are refused; only the bot chat passes");

// A network failure must never be read as a bad destination — that would stop
// production over a blip in the Telegram API.
globalThis.fetch = async () => { throw new Error("ECONNRESET"); };
const blip = await verifyDelivery({ token: "t", chatId: "1", requirePrivate: true });
assert.equal(blip.ok, true, "a network error must not block a build");
assert.ok(blip.warning, "a skipped check must say so");
console.log("ok   a network blip warns instead of blocking");

// ── the cycle checks EVERY destination, not just the video's ─────────────
const cycle = readFileSync("german-cycle.mjs", "utf8");
assert.match(cycle, /new Set\(\[tg\.reviewChatId, tg\.chatId\]\.filter\(Boolean\)\)/,
  "both the video and the report destinations must be checked, de-duplicated when they are the same");
assert.match(cycle, /verifyDelivery\(\{ token: tg\.token, chatId: target, requirePrivate: true \}\)/,
  "every destination must be held to the bot-only rule");
console.log("ok   the preflight holds every destination to the rule, before any build");

// ── the video is actually sent to the review chat ────────────────────────
const build = readFileSync("german-lesson-build.mjs", "utf8");
assert.match(build, /sendVideo\(\{ token: tg\.token, chatId: tg\.reviewChatId/,
  "the finished video must go to the review chat, never to tg.chatId directly");
console.log("ok   the finished video is addressed to the bot review chat");
