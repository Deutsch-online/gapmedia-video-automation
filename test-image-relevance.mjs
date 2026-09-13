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
