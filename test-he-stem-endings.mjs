// A suffix after a stem ending in ه is spoken as its own word.
//
//   node test-he-stem-endings.mjs
//
// Settled by the listening test of 2026-09-21 (VOICE-LOG.md). The owner heard
// the same sentence in each real spelling and chose the SPLIT reading in every
// group:
//
//   «مانده‌ای»  -> «مانده ای»   (group 1, C)
//   «غریبه‌ها»  -> «غریبه ها»   (group 2, C)
//   «گرسنه‌ایم» -> «گرسنه ایم»  (group 3, A)
//
// Joining instead spells something else: «ماندهای» carries the plural «ها»,
// and «غریبهها» is a double ه. This test exists because that join has been
// added, removed and added again — 2026-08-31 reverted it unheard, 2026-09-07
// brought it back for «حرفه‌ای», and the owner heard the result two weeks later.
import assert from "node:assert/strict";
import { sayable } from "./lib/pronounce.mjs";

// ── what the ear chose ───────────────────────────────────────────────────
for (const [source, spoken] of [
  ["جلوی دستگاه بلیت مانده‌ای؟", "مانده ای"],
  ["با غریبه‌ها رسمی حرف بزن.", "غریبه ها"],
  ["ما گرسنه‌ایم.", "گرسنه ایم"],
  ["حرفه‌ای", "حرفه ای"],
  ["جمله‌ها", "جمله ها"],
  ["خسته‌ای", "خسته ای"],
]) {
  assert.ok(sayable(source).includes(spoken),
    `«${source}» must be spoken with the suffix split off: expected «${spoken}», got «${sayable(source)}»`);
}

// ── the forms the ear rejected must not come back ────────────────────────
for (const source of ["مانده‌ای", "غریبه‌ها", "حرفه‌ای", "بیننده‌های", "جمله‌ها"]) {
  const said = sayable(source);
  assert.doesNotMatch(said, /هها/,
    `«${source}» must not produce a double ه — VOICE-LOG.md rejected that form on 2026-08-31 (got «${said}»)`);
}
assert.equal(sayable("مانده‌ای"), "مانده ای",
  "joining spells «ماندهای», whose ه+ا is the plural suffix «ها» — that is the reported defect");

// ── a stem that does NOT end in ه keeps its join ─────────────────────────
// The rule is about ه specifically. Widening it would undo joins that were
// never reported and never auditioned.
for (const [source, spoken] of [
  ["رنگ‌ها", "رنگها"],
  ["عکس‌ها", "عکسها"],
  ["بزرگ‌تر", "بزرگتر"],
]) {
  assert.equal(sayable(source), spoken,
    `«${source}» has no ه before the suffix, so it must stay joined as «${spoken}»`);
}

// ── the prefix join is a different rule and stays untouched ──────────────
assert.equal(sayable("می‌شود"), "میشود", "the verb prefix join must be unaffected");
assert.equal(sayable("نمی‌فهمی"), "نمیفهمی", "the negative prefix join must be unaffected");

console.log("a suffix after ه is spoken as its own word; every other join is unchanged");
