import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildInkHTML } from "./lib/build-ink.mjs";
import { packForFeature } from "./lib/content.mjs";

// Owner rule 2026-09-13, with three delivered frames as evidence: a picture is
// never shown incomplete. The frames showed «دایرکت‌فا» cut to
// «...ون هوشمند دایرکت و کامنت این...», a card whose label was chopped at the
// edge, and a hook cut to «...خ آماده و کامنت». All three were real, relevant
// images — mutilated by the frame, not badly chosen.
//
// Cause: shapeOf() forced EVERY landscape source into a 0.75 portrait frame
// and leaned on object-fit:cover, which for a 16:9 source discards ~58% of its
// width from both sides. Fine for a photograph, destructive for text.

const src = readFileSync("lib/build-ink.mjs", "utf8");

// The rule itself.
assert.match(src, /\.official-ui\.fit-contain img\{object-fit:contain\}/,
  "an image that was not deliberately shaped must be drawn whole");
assert.match(src, /\.official-ui\.fit-contain \.shot img\{transform:none\}/,
  "a zoom on top of a contained image would crop it again and undo the rule");

// The landscape crop-to-portrait must not come back.
assert.ok(!/if \(ar > 0\.85\) return \{ cls: "panel", ar: 0\.75 \};/.test(src),
  "forcing a landscape source into a 0.75 portrait frame is what cut the text off");
assert.match(src, /if \(ar > 0\.85\) return \{ cls: "panel", ar: Math\.min\(ar, 1\.6\) \};/,
  "a landscape source keeps its own shape, clamped so it cannot become a sliver");

// A real pack really renders with the rule applied.
{
  const html = buildInkHTML(packForFeature("tts-voice"));
  const frames = [...html.matchAll(/class="official-ui ([^"]+)"/g)].map((m) => m[1]);
  assert.ok(frames.length > 0, "the pack must actually render photo frames");
  assert.ok(frames.every((c) => c.includes("fit-contain")),
    `a sourced screenshot must be framed to show all of itself — got: ${frames.join(" | ")}`);
}

// The other half of the rule: an image whose shape was chosen ON PURPOSE, for
// content that survives a crop, still fills its frame. german-lesson-build.mjs
// sets photoAspect 0.75 on vocabulary photos and auto-image.mjs does the same
// for generated ones — that path is deliberately unchanged, so the 2026-09-10
// fix it exists for is not undone here.
{
  const pack = packForFeature("tts-voice");
  pack.tips.forEach((t) => { t.photoAspect = 0.75; });
  const html = buildInkHTML(pack);
  const frames = [...html.matchAll(/class="official-ui ([^"]+)"/g)].map((m) => m[1]);
  const shaped = frames.filter((c) => c.includes("fit-cover"));
  assert.ok(shaped.length > 0,
    `a deliberately-shaped photo still crops to fill — got: ${frames.join(" | ")}`);
}

console.log("ok   a sourced picture is framed whole; only a deliberately-shaped one still crops");
