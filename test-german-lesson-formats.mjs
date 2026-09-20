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
assert.match(lesson, /German lessons require approved narration/,
  "a silent German lesson must fail before it can render or send");
assert.match(lesson, /pack\.hookPhoto = hookPhoto\.photo/,
  "the hook must use its own real, topic-matched photograph");
assert.match(lesson, /usedSlidePhotos/,
  "the hook photograph must never repeat a vocabulary slide");
assert.match(readFileSync("lib/lesson-image.mjs", "utf8"), /minLongSide: 1440[\s\S]*minShortSide: 900[\s\S]*minArea: 1_400_000/,
  "lesson image criteria must be locked before providers are searched");
assert.match(readFileSync("lib/lesson-image.mjs", "utf8"), /Pexels → Openverse\/Wikimedia Commons → German[\s\S]*Wikipedia/,
  "lesson photos must have multiple free-source fallbacks, not one provider");
assert.match(lesson, /german-a1-\$\{pack\.id\}-\$\{iso\}-\$\{format\.slug\}/,
  "the two output files must stay distinct");

// Owner request 2026-09-20: two Berlin slots a day, one lesson per slot, and
// that one lesson goes out in both formats.  Rendering two files is not the
// contract — both files reaching the bot is.
assert.match(lesson, /for \(const video of deliveredVideos\)[\s\S]{0,400}sendVideo\(/,
  "every rendered format must be sent, not just the last one built");
assert.match(lesson, /deliveredVideos\.push\(/,
  "each format variant must be collected for delivery");
assert.match(lesson, /if \(!res\?\.message_id\) throw new Error/,
  "a format Telegram did not confirm must fail the episode, not pass silently");
// Different design family per format: without this both files are the same
// film recoloured, which is one format delivered twice.
assert.match(lesson, /design: \{ family: format\.design \}/,
  "each format must carry its own design family into the renderer");
assert.match(readFileSync("lib/build-ink.mjs", "utf8"), /const DESIGN = pack\.design\?\.family \|\|/,
  "the renderer must honour the per-format design family");
for (const family of ["german-tiktok-learning", "german-instagram-learning"]) {
  assert.match(readFileSync("lib/build-ink.mjs", "utf8"), new RegExp(`\\.design-${family} `),
    `${family} must have its own stylesheet, not fall back to the flash-card design`);
}
// One lesson per slot: the curriculum pointer advances by exactly one, so a
// slot can never consume two episodes.
assert.equal((lesson.match(/saveProgress\(idx \+ 1\)/g) || []).length, 2,
  "a successful run must advance the curriculum by exactly one episode");
assert.doesNotMatch(lesson, /saveProgress\(idx \+ 2\)/,
  "no run may skip or consume a second episode");
assert.match(daily, /vars\.GAPMEDIA_TUTORIALS_ENABLED == 'true'/,
  "general daily tutorials must be opt-in while German A1 is active");
assert.match(telegram, /vars\.GAPMEDIA_TUTORIALS_ENABLED == 'true'/,
  "Telegram must not bypass the paused general-tutorial lane");

console.log("German lessons are 60s+, one episode per slot, delivered in both formats, example-led, and the other tutorial lane is paused");
