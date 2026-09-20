// Cloudflare Worker command contract. This is deliberately separate from the
// local-PC bot test: the phone uses worker/src/index.js, so it needs its own
// regression test for the exact commands the creator actually types.
import assert from "node:assert/strict";
import worker, { NUMBERED_ACTIONS, menuCode, videoAction, commandFromPending, acknowledgementFor, bareTopicPick, parseChatIntent, dueDailyDispatch, dueGermanLessonDispatch } from "./src/index.js";

assert.equal(videoAction("تیک تاک بساز").action, "build-tiktok");
assert.equal(videoAction("انستا بساز").action, "build-instagram");
assert.equal(videoAction("بساز").action, "build-all");
assert.equal(videoAction("درس آلمانی بساز").action, "build-german-lesson");
assert.equal(videoAction("تأیید محتوا").action, "content-approve");
assert.equal(videoAction("محتوا: یک موضوع واقعی با سه گام کامل برای ویدیوی آموزشی").action, "custom-content");
assert.equal(videoAction("ویدیو مستقیم: یک موضوع واقعی با سه گام کامل برای ویدیوی آموزشی").action, "custom-content-media");
assert.equal(menuCode("۱"), "1");
assert.equal(NUMBERED_ACTIONS["1"].action, "content-search");
assert.equal(NUMBERED_ACTIONS["2"].pending, "content-search-live");
assert.equal(NUMBERED_ACTIONS["3"].pending, "custom-content-media");
assert.equal(NUMBERED_ACTIONS["4"].action, "content-preview");
assert.equal(NUMBERED_ACTIONS["5"].pending, "content-edit-hook");
assert.equal(NUMBERED_ACTIONS["6"].pending, "content-edit-steps");
assert.equal(NUMBERED_ACTIONS["7"].action, "content-approve");
assert.equal(NUMBERED_ACTIONS["8"].action, "content-radar");
assert.equal(NUMBERED_ACTIONS["9"].pending, "demand-research");
assert.equal(NUMBERED_ACTIONS["10"].action, "voice-list");
assert.equal(NUMBERED_ACTIONS["11"].action, "build-german-lesson");
assert.equal(NUMBERED_ACTIONS["26"].pending, "custom-content-media");
assert.equal(menuCode("۶"), "6");
assert.equal(commandFromPending({ action: "content-edit-hook" }, "قلاب تازه و روشن").action, "content-edit-hook");
assert.equal(commandFromPending({ action: "custom-content-media" }, "یک موضوع کامل | گام یک | گام دو").action, "custom-content-media");
assert.match(commandFromPending({ action: "custom-content-media" }, "خیلی کوتاه").error, /خیلی کوتاه/);
assert.match(acknowledgementFor({ action: "plan-tiktok" }), /گیت انتشار/);
assert.match(acknowledgementFor({ action: "content-approve" }), /ساخت واقعی/);

// Rule 12 (2026-09-03 content-search spec): «جستجوی محتوا» and «جستجوی جدید: X»
// already existed as direct phrase matches; "موضوع: متن من" is the new alias
// onto the same direct, quality-gated custom-content path «محتوا:» already uses.
assert.equal(videoAction("جستجوی محتوا").action, "content-search");
assert.equal(videoAction("جستجوی جدید: درآمد از تیک‌تاک").action, "content-search-live");
assert.equal(videoAction("موضوع: چطور از قابلیت تازهٔ اینستاگرام مشتری جذب کنیم").action, "custom-content");
assert.equal(videoAction("رد ۲").action, "topic-reject");

// A bare "۱".."۵" is ambiguous with the fixed numbered menu (NUMBERED_ACTIONS)
// and must only resolve to picking a content-search topic when that list is
// the one currently active — never merely because a digit was sent.
assert.equal(bareTopicPick("3", "search").action, "search-topic-pick");
assert.equal(bareTopicPick("3", "search").pick, "3");
assert.equal(bareTopicPick("۴", "search").pick, "4");
assert.equal(bareTopicPick("3", null), null);
assert.equal(bareTopicPick("3", "news"), null);
assert.equal(bareTopicPick("6", "search"), null); // only 1-5 are offered topics
assert.match(acknowledgementFor({ action: "search-topic-pick" }), /گیت انتشار/);

// Natural chat is constrained to known actions; a model answer cannot invent
// a shell command, a URL, or an arbitrary workflow input.
assert.deepEqual(
  parseChatIntent('حتماً: {"action":"content-edit-hook","payload":"قلاب را کوتاه‌تر و پرانرژی‌تر کن"}'),
  { action: "content-edit-hook", payload: "قلاب را کوتاه‌تر و پرانرژی‌تر کن", voiceMode: "on", voiceId: "" },
);
assert.equal(parseChatIntent('{"action":"delete-everything","payload":"x"}'), null);
assert.equal(parseChatIntent('{"action":"content-edit-hook","payload":""}'), null);

// custom-content.mjs hard-requires "topic | point | point ..."; a model
// reply that just paraphrases the raw text with no "|" would otherwise
// dispatch a build doomed to fail deep inside a GitHub Actions run.
assert.equal(parseChatIntent('{"action":"custom-content","payload":"یک متن بدون جداکننده"}'), null);
assert.deepEqual(
  parseChatIntent('{"action":"custom-content","payload":"موضوع | نکتهٔ یک | نکتهٔ دو"}'),
  { action: "custom-content", payload: "موضوع | نکتهٔ یک | نکتهٔ دو", voiceMode: "on", voiceId: "" },
);

// A captioned Telegram video must use the same direct-build path as a photo.
// This is an in-memory Worker request: no message or workflow is sent outside
// the test process.
const savedFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).includes("api.github.com/")) return new Response(JSON.stringify({ sha: "prior" }), { status: init.method === "PUT" ? 201 : 200 });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
const response = await worker.fetch(new Request("https://worker.test/", {
  method: "POST",
  body: JSON.stringify({ message: {
    chat: { id: 7 },
    caption: "یک موضوع واقعی | گام یک | گام دو | گام سه",
    video: { file_id: "telegram-video-id" },
  } }),
}), { ALLOWED_CHAT_ID: "7", TELEGRAM_BOT_TOKEN: "test", GITHUB_TOKEN: "test" });
globalThis.fetch = savedFetch;
assert.equal(response.status, 200);
const dispatch = calls.find((c) => c.url.includes("api.github.com/") && c.init.method === "PUT");
assert.ok(dispatch, `captioned video dispatches the workflow; observed ${calls.map((c) => c.url).join(", ")}`);
const request = JSON.parse(decodeURIComponent(escape(atob(JSON.parse(dispatch.init.body).content))));
assert.equal(request.action, "custom-content-media");
assert.equal(JSON.parse(request.payload).videoFileId, "telegram-video-id");

// A phone request for German A1 must not call the disabled Actions dispatch
// endpoint. It updates the dedicated trigger file, whose push starts the
// independent German-lesson workflow.
const germanCalls = [];
globalThis.fetch = async (url, init = {}) => {
  germanCalls.push({ url: String(url), init });
  if (String(url).includes(".german-manual-build-request.json") && !String(url).includes("?ref=")) return new Response(JSON.stringify({ content: {} }), { status: 201 });
  if (String(url).includes(".german-manual-build-request.json")) return new Response(JSON.stringify({ sha: "old-sha" }), { status: 200 });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
const germanResponse = await worker.fetch(new Request("https://worker.test/", {
  method: "POST",
  body: JSON.stringify({ message: { chat: { id: 7 }, text: "درس آلمانی بساز" } }),
}), { ALLOWED_CHAT_ID: "7", TELEGRAM_BOT_TOKEN: "test", GITHUB_TOKEN: "test" });
globalThis.fetch = savedFetch;
assert.equal(germanResponse.status, 200);
const germanPut = germanCalls.find((c) => c.url.includes(".german-manual-build-request.json") && c.init.method === "PUT");
assert.ok(germanPut, "German command must update the push-trigger file");
assert.doesNotMatch(germanPut.url, /actions\/workflows/);
assert.match(JSON.parse(germanPut.init.body).message, /German A1 lesson/);

// The external scheduler is timezone-aware, writes the ordinary Git trigger,
// and records one idempotency key so a five-minute cron cannot double-send.
const scheduleCalls = [];
const kv = new Map();
globalThis.fetch = async (url, init = {}) => {
  scheduleCalls.push({ url: String(url), init });
  if (String(url).includes("api.github.com/")) return new Response(JSON.stringify({ sha: "prior" }), { status: init.method === "PUT" ? 201 : 200 });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
const state = { get: async (key) => kv.get(key), put: async (key, value) => kv.set(key, value) };
assert.equal(await dueDailyDispatch({ GITHUB_TOKEN: "test", BOT_STATE: state }, new Date("2026-09-18T06:30:00Z")), true);
assert.equal(await dueDailyDispatch({ GITHUB_TOKEN: "test", BOT_STATE: state }, new Date("2026-09-18T06:30:00Z")), false);
assert.equal(await dueDailyDispatch({ GITHUB_TOKEN: "test", BOT_STATE: state }, new Date("2026-09-18T06:34:00Z")), false);
assert.equal(scheduleCalls.filter((c) => c.url.includes(".trigger-daily-dispatch") && c.init.method === "PUT").length, 1);
globalThis.fetch = savedFetch;

// The independent German curriculum must retain all three Berlin slots.  Its
// trigger deliberately goes through news-scan.yml's normal schedule gate; it
// must never use the manual lesson request, which would skip curriculum-slot
// accounting.
const lessonScheduleCalls = [];
const lessonKv = new Map();
globalThis.fetch = async (url, init = {}) => {
  lessonScheduleCalls.push({ url: String(url), init });
  if (String(url).includes("api.github.com/")) return new Response(JSON.stringify({ sha: "prior" }), { status: init.method === "PUT" ? 201 : 200 });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
const lessonState = { get: async (key) => lessonKv.get(key), put: async (key, value) => lessonKv.set(key, value) };
// The owner-approved programme is two Berlin slots: 05:00 and 17:30.
for (const instant of ["2026-09-18T03:00:00Z", "2026-09-18T15:30:00Z"]) {
  assert.equal(await dueGermanLessonDispatch({ GITHUB_TOKEN: "test", BOT_STATE: lessonState }, new Date(instant)), true);
}
// 11:00 Berlin is a retired slot and must never dispatch again.
assert.equal(await dueGermanLessonDispatch({ GITHUB_TOKEN: "test", BOT_STATE: lessonState }, new Date("2026-09-18T09:00:00Z")), false);
assert.equal(await dueGermanLessonDispatch({ GITHUB_TOKEN: "test", BOT_STATE: lessonState }, new Date("2026-09-18T03:01:00Z")), false);
assert.equal(lessonScheduleCalls.filter((c) => c.url.includes(".trigger-lesson-dispatch") && c.init.method === "PUT").length, 2);
assert.equal(lessonScheduleCalls.some((c) => c.url.includes(".german-manual-build-request.json")), false);
globalThis.fetch = savedFetch;

console.log("cloud Telegram command contract holds");
