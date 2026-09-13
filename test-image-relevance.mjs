import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REAL_IMAGE_SEARCH_STRATEGIES, slideSearchCue } from "./lib/auto-image.mjs";

// Owner report 2026-09-13, with three delivered TikTok frames as evidence. The
// "green-screen" pack ships four slides and none carries a photo, so every one
// is filled by the live rescue. All four searched the SAME phrase — the pack
// id — because the strategies took only `topic` and never the slide's own
// text. What reached viewers:
//   slide 2 «در افکت‌ها «Green Screen» را انتخاب کن»  → a cropped Android
//           app-reviews page
//   slide 3 «عکس یا اسکرین‌شات دلخواهت را بگذار»      → a Figma landing page
// Neither shows TikTok at all.

// The Latin spans of a caption ARE the UI labels a real screenshot is captioned
// with, and they are the part worth sending to an English-language search.
assert.equal(slideSearchCue("در افکت‌ها «Green Screen» را انتخاب کن"), "Green Screen");
assert.equal(slideSearchCue("روی Effects بزن و بعد Green Screen"), "Effects Green Screen");

// Persian-only captions contribute nothing: appending them to an English query
// would make results worse, so the query must stay exactly as it was.
assert.equal(slideSearchCue("دکمهٔ ساخت ویدیو را بزن"), "");
assert.equal(slideSearchCue(""), "");
assert.equal(slideSearchCue(undefined), "");
// A bare digit is not a UI label.
assert.equal(slideSearchCue("مرحلهٔ 3 را بزن"), "");

// Every strategy must carry the cue, or the slide's own content is lost again.
for (const [i, build] of REAL_IMAGE_SEARCH_STRATEGIES.entries()) {
  const withCue = build("green-screen", "Green Screen");
  assert.ok(withCue.includes("green-screen"), `strategy ${i + 1} must keep the topic`);
  assert.ok(withCue.includes("Green Screen"), `strategy ${i + 1} must include the slide's own UI label`);

  // No cue ⇒ byte-identical to the old topic-only query. The fix may only add
  // signal; it must never degrade a slide that has no Latin label.
  const withoutCue = build("green-screen", "");
  assert.ok(!withoutCue.includes("  "), `strategy ${i + 1} must not leave a double space when there is no cue`);
  assert.equal(withoutCue, build("green-screen"), `strategy ${i + 1} must behave identically when the cue is omitted`);
}

// Two different slides of the SAME pack must now produce different queries —
// that is the whole defect.
{
  const build = REAL_IMAGE_SEARCH_STRATEGIES[0];
  const s2 = build("green-screen", slideSearchCue("در افکت‌ها «Green Screen» را انتخاب کن"));
  const s3 = build("green-screen", slideSearchCue("روی Effects بزن"));
  assert.notEqual(s2, s3, "slides naming different UI must not search the same phrase");
}

// The relevance judge must be asked about the SLIDE's claim and must be told,
// in words, to reject the exact things that shipped.
{
  const src = readFileSync("lib/auto-image.mjs", "utf8");
  assert.match(src, /ادعای دقیق این اسلاید/, "the slide's own claim must be what the judge weighs");
  assert.match(src, /لندینگ/, "a product landing page whose image is a marketing banner must be named as a reject");
  assert.match(src, /محصول یا سرویس دیگری/, "a different product must be named as a reject");
  assert.ok(!/آیا محتمل است تصویر همین صفحه واقعاً همان موضوع\/اپ\/قابلیت را نشان بدهد/.test(src),
    "the old topic-only question must not come back — it passed a Figma page for a TikTok slide");
}

console.log("ok   each slide searches for its own UI labels, and relevance is judged against that slide's claim");

// End to end on the REAL pack, offline: the query a green-screen slide now
// actually produces. Owner report 2026-09-13 — the three delivered frames came
// from searching the literal string "green-screen", because the pack carries
// no photo, brand, title or name and the topic fell through to the bare id.
{
  const { packForFeature } = await import("./lib/content.mjs");
  const pack = packForFeature("green-screen");
  assert.ok(pack, "the green-screen pack must exist");

  // buildFeaturePack() copies named fields only, so a feature-level key it does
  // not list is dropped. That silently happened on the first attempt at this
  // fix; pin it so the plumbing cannot rot back.
  assert.equal(pack.searchTopic, "TikTok Green Screen effect mobile app",
    "searchTopic must survive buildFeaturePack() — verified against a real pack, not assumed");

  // rescuePackPhotos()'s own precedence, reproduced: searchTopic wins.
  const topic = pack.searchTopic || pack.title || pack.name || pack.id;
  const slide = (pack.tips || pack.steps || [])[1];
  const slideText = String(slide.text || slide.head || "");
  const query = REAL_IMAGE_SEARCH_STRATEGIES[0](topic, slideSearchCue(slideText));

  assert.match(query, /TikTok/, "the query must name the product, not just the effect");
  assert.match(query, /Green Screen/, "and the specific screen the slide is about");
  assert.ok(!/^green-screen /.test(query),
    "the bare pack id must no longer be the whole topic — that is what returned a Figma page");
}

console.log("ok   a real green-screen slide now searches for TikTok's own Green Screen screen");

// Telegram run #459 (2026-09-13 13:01), the rebuild of this same green-screen
// pack. Its rescue diagnostics said, in order:
//   strategy 1/3 — 6 candidates … tooSmall:2 notRelevant:2
//   strategy 2/3 — 8 candidates … used:2 download:1 badType:2 tooSmall:1
//   strategy 3/3 — 8 candidates … tooSmall:3 notRelevant:3
//   generateAIImage(...): attempt 1 — Gemini 429 — "You exceeded your current quota"
// Two defects in that report, both inside findRealImage():
{
  const src = readFileSync("lib/auto-image.mjs", "utf8");

  // 1. The loop has always stopped at six hits while the line printed
  //    hits.length, so "8 candidates, none passed" named two that were never
  //    opened — and the counters, summing to six, quietly disagreed with it.
  assert.match(src, /const examined = hits\.slice\(0, MAX_CANDIDATES_PER_STRATEGY\)/);
  assert.match(src, /\$\{examined\.length\} candidates examined/,
    "the diagnostic must report what was examined, not what was found");
  assert.ok(!/\$\{hits\.length\} candidates, none passed/.test(src),
    "the headline that overstated how many candidates were tried must not come back");

  // 2. isRelevant() returns false BOTH when a model says the picture is wrong
  //    and when no model answers at all. Gemini was returning 429 in the same
  //    second as strategy 3's three «notRelevant» rejections, so those may
  //    never have been judged. The two must be counted apart.
  assert.match(src, /judgeUnavailable:\$\{rejected\.unjudged\}/,
    "a judge outage must be reported as an outage, not as an irrelevant picture");
  assert.match(src, /rejected\[verdict\.judged \? "irrelevant" : "unjudged"\]\+\+/);
}

// The gate itself is unchanged: an image no model could judge is still
// REJECTED. Only the bookkeeping was split — if this ever flips to accepting
// an unjudged image, the Visual Truth Gate has been routed around.
{
  const { judgeRelevance, isRelevant } = await import("./lib/auto-image.mjs");
  const candidate = { title: "x", url: "https://example.invalid/x", snippet: "" };
  // No GEMINI_KEY / GROQ_KEY is set in the test environment, so no provider
  // can answer — exactly the outage case.
  const verdict = await judgeRelevance("green-screen", ["مرحله ۱"], candidate);
  assert.equal(verdict.relevant, false, "an unjudged image must never be accepted");
  assert.equal(verdict.judged, false, "and it must be reported as unjudged, not as judged-irrelevant");
  assert.equal(await isRelevant("green-screen", ["مرحله ۱"], candidate), false,
    "the original predicate must keep its exact contract for every existing caller");
}

console.log("ok   a judge outage is no longer logged as an irrelevant picture, and the candidate count means what it says");

// daily.yml run #232 (2026-09-13), the first full evening render after the
// diagnostics landed. Across the whole run the rejection counters totalled:
//   used 23 · download 78 · badType 26 · tooSmall 366 · notRelevant 97
//   judgeUnavailable 0
// Two things follow. judgeUnavailable:0 proves the relevance judge answered
// every time (the Groq fallback carried it while Gemini was returning 429 to
// generateAIImage) — so those 97 are real verdicts, not an outage wearing a
// content label. And tooSmall alone is 62% of every rejection, which the
// counter cannot explain on its own: a 1200×630 Open Graph card just under the
// area floor and a 300×200 thumbnail produce the identical number but mean
// opposite things. The line must carry one real measurement so the next look
// decides from evidence instead of a hypothesis.
{
  const src = readFileSync("lib/auto-image.mjs", "utf8");
  assert.match(src, /largest undersized: \$\{rejected\.bestSmall\.label\}/,
    "an undersized rejection must report a real width×height and host, not just a count");
  assert.match(src, /area > \(rejected\.bestSmall\?\.area \|\| 0\)/,
    "it must keep the best near-miss, not whichever candidate happened to be last");
  // Measurement only: the floor itself is untouched.
  assert.match(src, /Math\.max\(size\.width, size\.height\) < 1080 \|\| size\.width \* size\.height < 700000/,
    "the 1080px / 700,000px floor must stay exactly as it is — this change measures, it does not relax");
}

console.log("ok   an undersized candidate reports its real size, so 'tooSmall' can be diagnosed instead of guessed");

// A saturated provider must not be asked first for the rest of the run.
// daily #240 (2026-09-13) spent its whole 8-minute pre-scan budget and
// delivered neither evening format: withRetry() waits 1.5s then 3s, which
// does not outlast a per-MINUTE rate limit, so every later candidate paid
// 4.5s to re-ask the same saturated provider before the working one was
// tried at all. Ordering is pure and tested without a network.
{
  const { judgeProviderOrder } = await import("./lib/auto-image.mjs");
  const now = 1_000;
  assert.deepEqual(
    judgeProviderOrder(["gemini", "groq"], now, { gemini: now + 5_000, groq: 0 }),
    ["groq", "gemini"],
    "a provider that just rate-limited must go to the back of the order",
  );
  assert.deepEqual(
    judgeProviderOrder(["gemini", "groq"], now, { gemini: 0, groq: 0 }),
    ["gemini", "groq"],
    "with nothing cooling off the established order is unchanged",
  );
  // The important half. Cooling off REORDERS; it never removes a provider, so
  // a candidate is never rejected as unjudged just because both providers were
  // busy a moment ago. A real attempt always beats an unexamined rejection.
  assert.deepEqual(
    judgeProviderOrder(["gemini", "groq"], now, { gemini: now + 1, groq: now + 1 }),
    ["gemini", "groq"],
    "when every provider is cooling off, all of them must still be tried",
  );
  assert.deepEqual(judgeProviderOrder([], now, { gemini: 0, groq: 0 }), []);

  const src = readFileSync("lib/auto-image.mjs", "utf8");
  // The verdict itself is untouched: unjudged still means rejected.
  assert.match(src, /return \{ relevant: false, judged: false, why: why\.join\("; "\) \}/,
    "a candidate no model judged must still be rejected");
  assert.match(src, /if \(!verdict\.relevant\) \{ rejected\[verdict\.judged \? "irrelevant" : "unjudged"\]\+\+; continue; \}/,
    "the reject-on-unjudged path must stay exactly as it is");
}

console.log("ok   a rate-limited judge provider is tried last, never dropped, and unjudged still means rejected");
