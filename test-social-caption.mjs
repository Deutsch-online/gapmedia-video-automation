// Social captions are three lines: a German topic, one funny Persian line,
// and exactly five hashtags. No #viral, #fyp, or #LearnGerman.
// YouTube still appends " #Shorts" outside this builder, which makes six tags.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GERMAN_A1 } from "./lib/german-a1.mjs";
import { EASY_TEXT } from "./lib/easy-titles.mjs";
import { EPISODES } from "./lib/easy-series.mjs";
import {
  buildSocialCaption,
  captionForLesson,
  captionForSeries,
} from "./lib/social-caption.mjs";

const BANNED = /#(viral|fyp|learngerman)\b/i;
const EMOJI = /\p{Extended_Pictographic}/gu;
const FIXED = ["#DeutschLeichtGemacht", "#DeutschLernen", "#DeutschFürAnfänger"];

function assertCaption(caption, label) {
  const lines = caption.split("\n");
  assert.equal(lines.length, 3, `${label}: expected 3 lines`);
  assert.match(lines[0], /^Deutsch lernen leicht gemacht: \S/, `${label}: topic line`);
  assert.doesNotMatch(lines[0], /[\u0600-\u06FF]/, `${label}: topic line stays German`);
  assert.match(lines[1], /[\u0600-\u06FF]/, `${label}: Persian line`);
  assert.equal(lines[1].includes("\n"), false);
  assert.ok((lines[1].match(EMOJI) || []).length <= 1, `${label}: at most one emoji`);
  const tags = lines[2].split(/\s+/);
  assert.equal(tags.length, 5, `${label}: exactly 5 hashtags`);
  assert.deepEqual(tags.slice(0, 3), FIXED, `${label}: fixed hashtags`);
  assert.ok(tags.includes("#Alltagsdeutsch") || tags.includes("#PraktischesDeutsch"), `${label}: lesson tag`);
  assert.ok(tags.includes("#آلمانی_به_دری") || tags.includes("#آموزش_زبان_آلمانی"), `${label}: Persian tag`);
  assert.ok(tags.every((tag) => /^#[\p{L}\p{N}_]+$/u.test(tag)), `${label}: single-token tags`);
  assert.equal((caption.match(/#/g) || []).length, 5, `${label}: no extra hash`);
  assert.doesNotMatch(caption, BANNED, `${label}: banned tag`);
}

for (const unit of GERMAN_A1) {
  const episodeNo = Number(unit.id.slice(3, 5));
  const caption = captionForLesson(unit, episodeNo);
  assert.equal(caption, captionForLesson(unit, episodeNo), `${unit.id}: deterministic`);
  assertCaption(caption, unit.id);
  assert.ok(
    caption.startsWith(`Deutsch lernen leicht gemacht: ${EASY_TEXT[unit.id].title}\n`),
    `${unit.id}: German title comes from lesson data`,
  );
}

const greetings = captionForLesson(GERMAN_A1.find((unit) => unit.id === "a1-01-greetings"), 1);
const numbers = captionForLesson(GERMAN_A1.find((unit) => unit.id === "a1-05-numbers-2"), 5);
const apple = captionForLesson(GERMAN_A1.find((unit) => unit.id === "a1-09-colors"), 9);
assert.match(greetings, /^Deutsch lernen leicht gemacht: Hallo & Tschüss\n/);
assert.match(numbers, /تا ده را که یاد بگیری، دیگر در نانوایی گم نمی‌شوی! 🥖/);
assert.match(apple, /^Deutsch lernen leicht gemacht: Farben\n/);
assert.match(apple, /سیب سرخ را که یاد بگیری، رنگ‌ها دیگر قاطی نمی‌شوند! 🍎/);

const unknown = captionForLesson({ id: "not-a-unit", topic: "موضوع ناشناخته" }, 7);
assert.match(unknown, /^Deutsch lernen leicht gemacht: Deutsch A1 – Lektion 7\n/);
assertCaption(unknown, "fallback");
assert.match(unknown, /این درس را که یاد بگیری/);

const fromData = captionForLesson({
  id: "a1-01-greetings",
  captionFa: "این خط از دادهٔ درس آمده است! 🙂🥖",
}, 1);
assert.match(fromData, /این خط از دادهٔ درس آمده است! 🙂/);
assert.equal((fromData.split("\n")[1].match(EMOJI) || []).length, 1, "extra emoji is dropped");

for (const episode of Object.values(EPISODES)) {
  const caption = captionForSeries(episode);
  assert.equal(caption, captionForSeries(episode), `${episode.title}: deterministic`);
  assertCaption(caption, episode.title);
  assert.ok(caption.startsWith(`Deutsch lernen leicht gemacht: ${episode.title}\n`), episode.title);
}
const youtube = `${captionForSeries(Object.values(EPISODES)[0])} #Shorts`;
assert.equal((youtube.match(/#/g) || []).length, 6, "YouTube appends #Shorts as a sixth tag");

assert.throws(
  () => buildSocialCaption({
    topic: "Farben",
    funny: "سیب سرخ! 🍎",
    germanTag: "#viral",
    persianTag: "#آلمانی_به_دری",
  }),
  /banned|lesson-relevant|hashtag/i,
);
assert.throws(
  () => buildSocialCaption({
    topic: "موضوع",
    funny: "سیب! 🍎",
    germanTag: "#Alltagsdeutsch",
    persianTag: "#آلمانی_به_دری",
  }),
  /German/,
);

const lesson = readFileSync("german-lesson-build.mjs", "utf8");
const easy = readFileSync("lib/easydeutsch.mjs", "utf8");
assert.match(lesson, /captionForLesson\(unit, episodeNo\)/);
assert.doesNotMatch(lesson, /#viral|#fyp|#LearnGerman/);
assert.match(easy, /captionForLesson/);
assert.match(easy, /captionForSeries/);
assert.doesNotMatch(easy, /#viral|#fyp|#LearnGerman/);
assert.match(easy, /v\.slug\.startsWith\("youtube"\) \? `\$\{caption\} #Shorts`/);

console.log("ok   social captions are 3 lines, 5 hashtags, and carry no #viral or #fyp");
console.log("--- greetings ---");
console.log(greetings);
console.log("--- numbers ---");
console.log(numbers);
console.log("--- apple ---");
console.log(apple);
