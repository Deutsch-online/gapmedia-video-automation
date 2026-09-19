// Owner screenshots, 2026-09-19, episode 026: the second caption sat ON TOP of
// the first, so the first line could not be read.
//
// Cause: .band is in normal flow, .cap was pinned with position:absolute. A
// head that wraps to two lines grows the band downwards until it reaches the
// pinned caption. Measured in Chromium at rest, before the fix: 36px of
// overlap on slide 2, and only 6px of clearance on slide 3 — the fault was one
// wrapped line away on every slide.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("lib/build-ink.mjs", "utf8");

// german-flashcard is the family every German lesson actually renders with —
// buildInkHTML reads pack.design?.family, and german-lesson-build.mjs passes a
// plain string, so the tiktok/instagram families never win. Its caption is the
// one that must be in flow. The other two are fixed as well, so enabling them
// later cannot reintroduce the fault.
for (const design of [
  "design-german-flashcard",
  "design-german-tiktok-learning",
  "design-german-instagram-learning",
]) {
  const rule = new RegExp(`\\.${design} \\.cap\\{([^}]*)\\}`);
  const found = css.match(rule);
  assert.ok(found, `${design} must carry its own .cap rule`);
  assert.match(found[1], /position:static/,
    `${design}: the caption must be in normal flow, or a two-line head grows the band over it`);
  assert.doesNotMatch(found[1], /bottom:\s*\d/,
    `${design}: a pinned bottom is exactly what put the caption under the band`);
}
console.log("ok   every German design lays the caption out in flow, never pinned");

// The base rule stays absolute on purpose: the other video families position
// their caption over artwork and are not affected by this fault.
assert.match(css, /\n\.cap\{position:absolute/,
  "the base caption rule is deliberately left alone for the non-German families");
console.log("ok   the fix is scoped to the German designs and leaves the rest untouched");

// The safe zone is what keeps the caption clear of the platform UI, so the
// bottom padding must survive the change.
assert.match(css, /\.design-german-flashcard \.world\{[^}]*padding:150px 62px 250px/,
  "the scene's bottom padding is the safe zone and must not be traded away for space");
console.log("ok   the platform safe zone is unchanged");
