// The chapter rail across the top of every video.
//
// It replaced a single bar that filled 0→1 over the whole runtime. A smear
// tells a viewer nothing they can act on; discrete blocks answer "how long is
// this, and how far in am I" in the first frame, which is the decision a
// short-form viewer makes before they swipe.
//
// The idea came from a chaptered-explainer tool the owner sent on 2026-09-16
// (Vincentwei1021/anything2explainer). The IDEA only: its licence is PolyForm
// Noncommercial 1.0.0 and this is a commercial channel, so nothing was
// installed and no line of it was copied. This is our own implementation on
// our own stack, and this test pins the property that actually matters — the
// rail is driven by the SAME numbers as the scenes, so it can never drift out
// of sync with what is on screen.
//
//   node test-chapter-rail.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildInkHTML } from "./lib/build-ink.mjs";
import { packForFeature } from "./lib/content.mjs";

const pack = packForFeature("search-insights-real-ui", new Date("2026-09-02T00:00:00Z"));
const html = buildInkHTML(pack);

const TOTAL = pack.duration ?? 56;
const HOOK = pack.hookDuration ?? 4;
const OUTRO = pack.outroDuration ?? 6;
// Same derivation lib/build-ink.mjs uses: measured narration when it exists,
// an even split otherwise. Written out here rather than imported so the test
// fails if the builder ever changes how a scene is timed without the rail
// following — which is the exact drift this file exists to catch.
const n = pack.tips.length;
const DURS = Array.isArray(pack.tipDurations) && pack.tipDurations.length === n
  ? pack.tipDurations
  : Array.from({ length: n }, () => (TOTAL - HOOK - OUTRO) / n);

// ── One segment per scene, and the fills to drive them ────────────────────
const segments = [...html.matchAll(/<b><i id="ch(\d+)"><\/i><\/b>/g)].map((m) => Number(m[1]));
const expected = 1 + DURS.length + 1; // hook + every step + outro
assert.equal(segments.length, expected,
  `the rail must have one segment per scene — ${expected} expected for a ${DURS.length}-step video, got ${segments.length}`);
assert.deepEqual(segments, [...Array(expected).keys()],
  "segment ids must be dense and in order, or a fill animates the wrong block");

const fills = [...html.matchAll(/tl\.fromTo\("#ch(\d+)",\{scaleX:0\},\{scaleX:1,ease:"none",duration:([\d.]+)\},([\d.]+)\)/g)]
  .map((m) => ({ i: Number(m[1]), duration: Number(m[2]), at: Number(m[3]) }));
assert.equal(fills.length, expected, "every segment needs exactly one fill on the root timeline");

// ── The rail must track the scenes, not a parallel guess ──────────────────
//
// This is the whole assertion. If a future change re-derives these numbers
// instead of reading the scene constants, the rail drifts and the video lies
// to the viewer about where they are.
const want = [
  { at: 0, duration: HOOK },
  ...DURS.map((d, i) => ({ at: HOOK + DURS.slice(0, i).reduce((a, x) => a + x, 0), duration: d })),
  { at: HOOK + DURS.reduce((a, d) => a + d, 0), duration: OUTRO },
];
for (const [i, w] of want.entries()) {
  const got = fills.find((f) => f.i === i);
  // 1ms: the HTML carries three decimals, so this is rounding, not slack.
  assert.ok(Math.abs(got.at - w.at) < 0.001,
    `chapter ${i} starts at ${got.at}s but its scene starts at ${w.at}s`);
  assert.ok(Math.abs(got.duration - w.duration) < 0.001,
    `chapter ${i} runs ${got.duration}s but its scene runs ${w.duration}s`);
}

// ── No gaps, no overlaps: the rail must tile the whole video ──────────────
const ordered = [...fills].sort((a, b) => a.at - b.at);
for (let i = 1; i < ordered.length; i++) {
  const endOfPrevious = ordered[i - 1].at + ordered[i - 1].duration;
  // 2ms, not 1: `at` and `duration` are each printed to three decimals, so a
  // boundary computed from two of them carries two roundings (±0.0005 each).
  // Anything larger is real drift, not formatting — an evenly-split 15.5s
  // video lands each boundary within 1ms of its neighbour's end.
  assert.ok(Math.abs(ordered[i].at - endOfPrevious) <= 0.002,
    `chapter ${i} starts at ${ordered[i].at}s but the one before it ends at ${endOfPrevious}s — a gap or an overlap means the rail stalls or jumps`);
}

// ── The frame must not have moved ─────────────────────────────────────────
//
// The rail sits in the TikTok/Instagram top safe zone. Its height and stacking
// are what keep it out of everything else's way, so a redesign that quietly
// grew it would push into the frame this project's own VISUAL_QC_STANDARD
// protects.
const source = readFileSync("lib/build-ink.mjs", "utf8");
assert.match(source, /\.rule\{[^\n]*height:8px/,
  "the rail must stay 8px tall — the height the layout around it was built against");
assert.match(source, /\.rule\{[^\n]*z-index:50/,
  "the rail must keep its stacking order above the scenes");
// Matched to end-of-line, not to "}": these declarations interpolate
// ${PAIR[1]}, whose own closing brace would end a [^}]* class early and make
// the assertion pass or fail for the wrong reason.
// The bar this replaced filled right-to-left (transform-origin:right center)
// because everything else on screen is Persian. Both halves of that are pinned
// here: the segment ORDER (direction:rtl puts chapter 1 on the right) and the
// fill DIRECTION. A rail running against the language would be the only
// element on screen doing so.
assert.match(source, /\.rule\{[^\n]*direction:rtl/,
  "chapter 1 must sit at the right — the rail reads with the narration, not against it");
assert.match(source, /\.rule b i\{[^\n]*transform-origin:right center/,
  "each chapter must fill right-to-left, as the single bar it replaced did");
assert.ok(!/rulefill/.test(source) && !/rulefill/.test(html),
  "the single-bar fill is gone; a leftover reference would animate an element that no longer exists");

console.log(`ok   the chapter rail tiles all ${expected} scenes on the scenes' own timings`);
