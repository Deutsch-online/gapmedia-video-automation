// Two narration faults the owner reported on episode 32 (a1-32-spelling-contact).
//
// 1. «بی‌اشتباه» in the hook «نام و ایمیلت را بی‌اشتباه به آلمانی بده.»
//    JOIN_BEFORE joined the prefix unconditionally, so the engine received
//    «بیاشتباه» — and «بیا» is a word, the imperative "come". Same failure
//    class as the ه-stem join of 2026-09-21: a join that spells something else.
//
// 2. «هجی» in «لطفاً می‌توانید آن را هجی کنید؟» — no entry covered it, so the
//    bare spelling went to an Arabic-native voice to guess the vowel at.
//
// The halves that must NOT move are as important as the fixes: «آ» carries its
// own long vowel and cannot form the /yâ/ digraph, so the ten «می‌آید»/«می‌آیم»
// joins in the curriculum keep the join they already have.
import assert from "node:assert/strict";
import { lessonSpeakable, normalise } from "./lib/pronounce.mjs";

const ZWNJ = "‌";
const NB = " ";

// 1 — the reported hook, through the path a delivered lesson actually uses.
const hook = `نام و ایمیلت را بی${ZWNJ}اشتباه به آلمانی بده.`;
const spokenHook = lessonSpeakable(hook);
assert.ok(!/بیاشتباه/.test(spokenHook),
  "«بیاشتباه» is the reported defect: the join makes the first syllable «بیا», the imperative «come»");
assert.match(spokenHook, /بی اشتباه/,
  "«بی» must stand off a plain-alef stem so it is read /bi/, not /biyâ/");

// The same defect in a unit that has not aired yet — fixed by the same rule.
assert.match(lessonSpeakable(`رفتار بی${ZWNJ}ادبانه`), /بی ادبانه/,
  "«بی‌ادبانه» is the same join spelling «بیا» and must split too");

// The pair is marked as one spoken unit before the space is restored, so a lane
// that breathes cannot drop a comma inside it.
assert.equal(normalise(`بی${ZWNJ}اشتباه`), `بی${NB}اشتباه`,
  "normalise() must join the pair with NBSP, the marker this file uses for «said as one»");

// 2 — «هجی» reaches the engine with its vowel marked.
assert.match(lessonSpeakable(`لطفاً می${ZWNJ}توانید آن را هجی کنید؟`), /هِجی/,
  "«هجی» must carry the kasra the voice cannot guess, the same treatment as «صفر»→«صِفر»");

// The controls: a madda-alef stem keeps its join.
for (const [written, joined] of [
  [`می${ZWNJ}آید`, "میآید"],
  [`می${ZWNJ}آیم`, "میآیم"],
  [`نمی${ZWNJ}آید`, "نمیآید"],
]) {
  assert.equal(normalise(written), joined,
    `«${written}» must keep its join — «آ» is its own long vowel and forms no /yâ/ digraph`);
}
// And an ordinary consonant stem is untouched by any of this.
assert.equal(normalise(`می${ZWNJ}کند`), "میکند", "a consonant stem keeps the join it always had");
assert.equal(normalise(`نمی${ZWNJ}کند`), "نمیکند", "so does the negative prefix");
assert.equal(normalise(`بی${ZWNJ}صدا`), "بیصدا", "and «بی» before a consonant");

// The 2026-09-21 and 2026-09-22 verdicts live in the same function and must hold.
assert.equal(normalise(`مانده${ZWNJ}ای`), "مانده ای", "the ه-stem listening test still decides «مانده‌ای»");
assert.equal(normalise(`رنگ${ZWNJ}ها`), "رنگها", "a non-ه stem still keeps its plural bound");
assert.equal(normalise(`گفت${ZWNJ}وگو`), "گفتگو", "the conjunction compound still speaks as one word");

console.log("«بی» stands off a plain alef, «هجی» carries its kasra, and «می‌آید» keeps its join");
