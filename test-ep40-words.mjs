// Owner report 2026-09-27: «ماندن» and «دردسر» misread in episode 40.
// Audition verdict: «ماندن» → B («ماندَن»), «دردسر» → A (unmarked).
import assert from "node:assert/strict";
import { lessonSpeakable } from "./lib/pronounce.mjs";

const hook = lessonSpeakable("پشت باجهٔ اداره، ساکت ماندن گران تمام می‌شود.");
const outro = lessonSpeakable("نفهمیدن عیب نیست؛ نپرسیدن دردسر می‌سازد.");
assert.match(hook, /ساکت ماندَن گران/, "«ماندن» carries the fatha of its last syllable");
// «دردسر»: the owner picked the bare spelling (A) by ear — it must stay bare.
assert.match(outro, /نپرسیدن دردسر می/, "«دردسر» reaches the voice unmarked, as auditioned");
// Controls: nearby words that must not move.
assert.match(hook, /پشت باجه ی اداره/);
assert.match(outro, /^نفهمیدن عیب نیست/);
console.log("✅ «ماندَن» marked, «دردسر» bare — as chosen by ear");
