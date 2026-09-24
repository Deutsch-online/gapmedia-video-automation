// Every episode's hook must be able to find its OWN picture.
//
// Owner report 2026-09-24: the hook slide of every recent video showed the
// same photo. The cause was not the image search but the query handed to it.
//
// findLessonImage() broadens a query that finds nothing: the full phrase, then
// its last two words, then its last word (lib/lesson-image.mjs — deliberate,
// because a long compound is not what stock libraries index). The hook query
// was built as `${item.img} German language learning`, with the generic phrase
// at the END. So the moment the long phrase missed — which is the common case
// the broadening exists for — EVERY episode collapsed to the identical
// "language learning", then "learning": one search, one top result, the same
// picture in video after video.
//
// The fix is only where the generic phrase sits. At the front it still gives
// the full-length tier its learning context, while every broadened tier falls
// back to that episode's own subject.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GERMAN_A1 } from "./lib/german-a1.mjs";

const build = readFileSync("german-lesson-build.mjs", "utf8");

// Read the real templates out of the source, so moving the constant back to
// the end fails this test instead of quietly shipping one photo for everyone.
const block = build.slice(build.indexOf("const hookQueries = ["));
const templates = [...block.slice(0, block.indexOf("];")).matchAll(/`([^`]+)`/g)].map((m) => m[1]);
assert.ok(templates.length >= 2, "the hook must still have more than one query to try");

for (const t of templates) {
  assert.doesNotMatch(t, /\}\s*German language (learning|learner)\s*$/,
    `hook query «${t}» ends with the generic phrase — every episode would broaden to the same words`);
}

// The property that actually matters, checked on the real curriculum: the
// broadened tiers must not be the same for everybody.
const tiersOf = (phrase) => {
  const w = phrase.split(/\s+/).filter(Boolean);
  return { two: w.slice(-2).join(" "), one: w.slice(-1).join(" ") };
};
const fill = (t, unit) => t
  .replace("${hookItem.img}", unit.items[0].img)
  .replace("${unit.items.at(-1).img}", unit.items.at(-1).img);

for (const [i, t] of templates.entries()) {
  const two = new Set();
  const one = new Set();
  for (const unit of GERMAN_A1) {
    const { two: a, one: b } = tiersOf(fill(t, unit));
    two.add(a);
    one.add(b);
  }
  // One shared tail would be a collision; all 36 sharing one is the bug itself.
  assert.ok(two.size > 1,
    `hook query ${i + 1} broadens all ${GERMAN_A1.length} episodes to the same two words «${[...two][0]}»`);
  assert.ok(one.size > 1,
    `hook query ${i + 1} broadens all ${GERMAN_A1.length} episodes to the same word «${[...one][0]}»`);
  // And it must be genuinely varied, not two buckets for 36 lessons.
  assert.ok(two.size >= GERMAN_A1.length / 2,
    `hook query ${i + 1} gives only ${two.size} distinct two-word tiers for ${GERMAN_A1.length} episodes`);
}

// Which photo the hook actually got must be in the log. The owner's report of
// 2026-09-24 could be neither confirmed nor refuted from a build log, because
// nothing recorded it. The filename is a hash of the source URL, so printing it
// makes "the same photo as last time" comparable between two runs.
assert.match(build, /hook photo for \$\{unit\.id\}: \$\{hookPhoto\.photo\}/,
  "the build must record which photo the hook chose, by its content-hashed filename");
assert.match(build, /via «\$\{hookQueryUsed\}»/,
  "and which of the hook queries won, so a repeat can be traced to the query that produced it");

// The hook photo must still be refused if it repeats a slide photo in the same
// episode — the check that was already there and is not what broke.
assert.match(build, /usedSlidePhotos\.has\(candidate\.photo\)/,
  "the hook photo must still be rejected when it duplicates one of this episode's slides");

console.log(`each of the ${GERMAN_A1.length} episodes broadens its hook search to its own subject`);
