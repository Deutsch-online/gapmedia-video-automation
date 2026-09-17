import assert from "node:assert/strict";
import { minimaxSpeakable, lessonSpeakable } from "./lib/pronounce.mjs";
import { narrationFor } from "./lib/narration.mjs";
import { narrationLineCheck } from "./lib/voice-settings.mjs";

const sample = narrationFor("search-insights-real-ui");
const spoken = [sample.hook, ...sample.steps, sample.outro]
  .map(minimaxSpeakable)
  .join("\n");

// UI labels are genuine English. They must not become Persian transliterations
// or acquire an artificial pause while being prepared for the TTS engine.
assert.match(spoken, /Creator Search Insights/);
assert.match(spoken, /Content gap/);
assert.match(spoken, /Search analytics/);
assert.doesNotMatch(spoken, /کریتر|کانتنت گَپ|سرچ اَنالیتیکس/);

// Brand names and colloquial Persian remain natural, with no space introduced
// inside a spoken word.
assert.match(spoken, /تیک تاک/);
assert.equal(minimaxSpeakable("می‌خواهید سریع‌تر کار کنید."), "میخواهید سریعتر کار کنین.");
assert.equal(minimaxSpeakable("می‌توانید این کار را انجام دهید."), "میتونین این کار را انجام دهید.");
assert.equal(minimaxSpeakable("از صفر شروع کن."), "از صِفر شروع کن.");
assert.equal(minimaxSpeakable("Preview را ببین."), "پیش نَمایش را ببین.");
assert.equal(minimaxSpeakable("پرویو را ببین."), "پیش نَمایش را ببین.");
assert.equal(minimaxSpeakable("بدون میکروفون ضبط کن."), "بدون مایک ضبط کن.");
assert.equal(minimaxSpeakable("بدون مایک و بدون صدای خودت ضبط کن."), "بدون مایک و بدون صدای خودت ضبط کن.");
assert.match(lessonSpeakable("می‌توانی امروز آلمانی صحبت کنی؟"), /^میتوااانی /, "lesson hook may lengthen only its opening emphasis, without breaking the sentence");
assert.equal(lessonSpeakable("امروز یک جملهٔ کوتاه می‌آموزیم."), minimaxSpeakable("امروز یک جملهٔ کوتاه می‌آموزیم."), "ordinary lesson lines must stay natural; never stretch every sentence");
assert.match(narrationLineCheck("Preview را ببین.").join(" "), /unsafe UI label/);
assert.match(narrationLineCheck("بدون میکروفون ضبط کن.").join(" "), /unsafe UI label/);

// Production incident 2026-09-13 (a1-18-shopping): «خریدت» (your shopping —
// خرید + enclitic ـت) was heard as «خریده» (has bought, a different word) on
// every one of 6 independent MiniMax takes across two builds. Same fault as
// every other unmarked possessive-ـت case in PERSIAN_TTS_FIXES: mark the
// connecting vowel, do not touch the word.
assert.equal(minimaxSpeakable("اولین خریدت در آلمان را با همین جمله‌ها انجام بده."), "اولین خریدِت در آلمان را با همین جملهها انجام بده.");
assert.equal(minimaxSpeakable("با این چهار جمله، خریدت را کامل به آلمانی انجام بده."), "با این چهار جمله، خریدِت را کامل به آلمانی انجام بده.");

// Regression: the preflight once mistook every Persian word ending in «ت»
// before «د» for a possessive and rejected the valid recovery phrase
// «تفاوت دارد». Only the three observed possessive forms are blocked.
assert.equal(narrationLineCheck("این دو شکل تفاوت دارد.").some((i) => i.includes("ـت")), false);

console.log("Persian TTS copy keeps UI labels clear and Persian words connected");
