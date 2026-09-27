// Owner report 2026-09-27: «ماندن» and «دردسر» misread in episode 40. The
// spoken copy marks one short vowel each; the written line stays as it is.
import assert from "node:assert/strict";
import { lessonSpeakable } from "./lib/pronounce.mjs";

const hook = lessonSpeakable("پشت باجهٔ اداره، ساکت ماندن گران تمام می‌شود.");
const outro = lessonSpeakable("نفهمیدن عیب نیست؛ نپرسیدن دردسر می‌سازد.");
assert.match(hook, /ساکت ماندَن گران/, "«ماندن» carries the fatha of its last syllable");
assert.match(outro, /نپرسیدن دردِسر می/, "«دردسر» carries its linking kasra");
// Controls: nearby words that must not move.
assert.match(hook, /پشت باجه ی اداره/);
assert.match(outro, /^نفهمیدن عیب نیست/);
console.log("✅ «ماندَن» and «دردِسر» reach the voice; the rest of both lines is unchanged");
