import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lesson = readFileSync("german-lesson-build.mjs", "utf8");
const daily = readFileSync(".github/workflows/daily.yml", "utf8");
const telegram = readFileSync(".github/workflows/telegram.yml", "utf8");

assert.match(lesson, /const MIN_EPISODE_SECONDS = 60/,
  "German lessons must be at least one minute long");
assert.match(lesson, /function applyMinimumLessonDuration\(\)/,
  "measured narration must be extended with readable visual holds, not clipped");
assert.match(lesson, /slug: "tiktok"/,
  "every German lesson must render a TikTok variant");
assert.match(lesson, /slug: "instagram"/,
  "every German lesson must render an Instagram variant");
assert.match(lesson, /slug: "tiktok",[\s\S]*?musicVariant: 2/,
  "TikTok must use its own music seed");
assert.match(lesson, /slug: "instagram",[\s\S]*?musicVariant: 3/,
  "Instagram must use a different music seed");
assert.match(lesson, /exampleFile/,
  "each vocabulary slide must include a native-German example sentence");
assert.match(lesson, /german-a1-\$\{pack\.id\}-\$\{iso\}-\$\{format\.slug\}/,
  "the two output files must stay distinct");
assert.match(daily, /vars\.GAPMEDIA_TUTORIALS_ENABLED == 'true'/,
  "general daily tutorials must be opt-in while German A1 is active");
assert.match(telegram, /vars\.GAPMEDIA_TUTORIALS_ENABLED == 'true'/,
  "Telegram must not bypass the paused general-tutorial lane");

console.log("German lessons are 60s+, dual-format, example-led, and the other tutorial lane is paused");
