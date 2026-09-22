// «گفت‌وگو» must be spoken as one word, not «گفت» + «وگو».
//
// Reported live 2026-09-22 by the channel owner, on episode 31
// (a1-31-small-talk), whose hook is «اولین گفت‌وگو را با این جمله‌های کوتاه
// گرم کن.» normalise() replaced the ZWNJ with a space, so the «و» started a
// word and the engine read it as the consonant /v/ — "goft va-gu" — instead
// of the enclitic conjunction /o/ that binds to the word before it,
// /gof.to.gu/.
//
// The two halves of this test are equally important: the compounds whose «و»
// IS the conjunction must join, and the ones whose «و» merely opens a second
// word (وقت، وفا، واژه) must keep splitting. A fix that joined both classes
// would trade one mispronunciation for another.
import assert from "node:assert/strict";
import { lessonSpeakable, normalise } from "./lib/pronounce.mjs";

const ZWNJ = "‌";

// The reported line, end to end, through the engine path a lesson actually uses.
const hook = `اولین گفت${ZWNJ}وگو را با این جمله${ZWNJ}های کوتاه گرم کن.`;
const spoken = lessonSpeakable(hook);
assert.ok(!/گفت وگو/.test(spoken),
  "«گفت وگو» is the reported defect: a word boundary before «و» makes it the consonant /v/");
assert.match(spoken, /گفتگو/,
  "«گفت‌وگو» must reach the engine as one word, read /gof.to.gu/");

// The conjunction class, including the suffixed forms the curriculum uses.
for (const [written, spokenForm] of [
  [`گفت${ZWNJ}وگو`, "گفتگو"],
  [`گفت${ZWNJ}وگوی`, "گفتگوی"],
  [`گفت${ZWNJ}وگوها`, "گفتگوها"],
  [`جست${ZWNJ}وجو`, "جستجو"],
  [`جست${ZWNJ}وجوی`, "جستجوی"],
  [`شست${ZWNJ}وشو`, "شستشو"],
]) {
  assert.equal(normalise(written), spokenForm,
    `«${written}» is one phonological word — its «و» is the conjunction /o/, not a new word`);
  // The path a delivered video actually takes. (sayable() is deliberately not
  // asserted here: lib/pronounce.mjs's own note at the «پست» entry records
  // that the voice pipeline never calls it — only voice-ending-probe.mjs
  // does — and its FIXES table replaces bare substrings, so the «تگ» entry
  // lands a fatha inside «گفتگو». That is a pre-existing defect in a table no
  // video reads, not something this fix introduces or should quietly change.)
  assert.equal(lessonSpeakable(written), spokenForm,
    `the delivered narration path must speak «${written}» as one word`);
}

// The control group: here «و» genuinely opens the next word, so the split the
// general ZWNJ rule gives them is already correct and must survive.
for (const [written, spokenForm] of [
  [`هیچ${ZWNJ}وقت`, "هیچ وقت"],
  [`آن${ZWNJ}وقت`, "آن وقت"],
  [`قابل${ZWNJ}وفا`, "قابل وفا"],
  [`وام${ZWNJ}واژه`, "وام واژه"],
]) {
  assert.equal(normalise(written), spokenForm,
    `«${written}» must keep its split — its «و» is the first letter of a real word`);
}

// The ه-stem rule of 2026-09-21 is in the same function and must be untouched.
assert.equal(normalise(`مانده${ZWNJ}ای`), "مانده ای",
  "the 2026-09-21 ه-stem listening test still decides «مانده‌ای»");
assert.equal(normalise(`غریبه${ZWNJ}ها`), "غریبه ها",
  "the 2026-09-21 ه-stem listening test still decides «غریبه‌ها»");
assert.equal(normalise(`رنگ${ZWNJ}ها`), "رنگها",
  "a non-ه stem still keeps its plural bound");

console.log("«گفت‌وگو» is spoken as one word, and «هیچ‌وقت» still splits");
