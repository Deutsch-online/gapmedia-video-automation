// Every GapMedia content-selection/build command the local bot can receive
// must actually be handled by it.
//
// bot.mjs and lib/commands.mjs drifted: commands.mjs's header says it is
// "shared by the local bot and the cloud listener so the two can never drift
// apart", but bot.mjs's own dispatch never checked for it. Two concrete bugs
// this caught: (1) "تیک‌تاک بساز" resolves to cmd.action "build-tiktok", but
// bot.mjs's old branch keyed a LABEL object by "tiktok" — the lookup always
// missed, so every platform-specific build command silently fell through to
// the catch-all "بساز" and built all 3 videos instead of one; (2) content
// planning/approval commands ("موضوع فردا", "برنامه هفته", "تیک تاک" bare,
// "تأیید <id>", "صداها") had no branch in bot.mjs at all — typing one to the
// local bot produced no reply and did nothing.
//
//   node test-bot-commands.mjs
import { readFileSync } from "node:fs";
import { parseCommand } from "./lib/commands.mjs";

const bot = readFileSync("bot.mjs", "utf8");

// Phrases a real user would actually type, one per action this test covers.
// Not every commands.mjs action is here — undo is a keyword check bot.mjs
// answers before parseCommand runs, so it isn't in scope for this test.
const CASES = [
  ["تیک‌تاک بساز", "build-tiktok"],
  ["انستا بساز", "build-instagram"],
  ["ابزار بساز", "build-tools"],
  ["آلمانی بساز", "build-german-lesson"],
  ["تیک تاک", "plan-tiktok"],
  ["انستا", "plan-instagram"],
  ["ابزار", "plan-tools"],
  ["موضوع فردا", "plan-tomorrow"],
  ["برنامه هفته", "plan-week"],
  ["تأیید trial-reels", "approved-feature"],
  ["تأیید تصویر trial-reels 2", "approved-screen"],
  ["صداها", "voice-list"],
  ["رادار محتوا", "content-radar"],
  ["فردا", "build-tomorrow"],
  ["بفرست", "resend"],
  ["وضعیت", "status"],
  ["راهنما", "help"],
  ["بساز", "build-all"],
];

// Only these predate cmd.action existing at all — bot.mjs answers them with
// a raw has(c, ...) keyword check on the normalised text, before
// parseCommand ever runs. Every other action must appear as a literal
// `cmd.action === "..."` / object-key match; falling back to a keyword
// check for those would make this test pass even when the branch is
// missing entirely (a real string like "بساز" turns up all over bot.mjs
// for unrelated reasons, which is exactly how the original bug hid).
const KEYWORD_STYLE = new Set(["build-tomorrow", "resend", "status", "help", "build-all"]);

const problems = [];
for (const [phrase, expected] of CASES) {
  const cmd = parseCommand(phrase);
  if (!cmd) { problems.push(`"${phrase}": commands.mjs no longer resolves this`); continue; }
  if (cmd.action !== expected) {
    problems.push(`"${phrase}": resolves to "${cmd.action}", test expected "${expected}" — update the test or commands.mjs`);
    continue;
  }
  if (KEYWORD_STYLE.has(cmd.action)) {
    if (!phrase.split(" ").every((w) => bot.includes(w))) problems.push(`"${phrase}" (${cmd.action}): no keyword branch in bot.mjs mentions it`);
    continue;
  }
  if (!bot.includes(`"${cmd.action}"`)) problems.push(`"${phrase}" (${cmd.action}): no branch in bot.mjs checks cmd.action === "${cmd.action}"`);
}

console.log(`${CASES.length} commands checked against bot.mjs`);
console.log("");
if (!problems.length) {
  console.log("every checked command has a handler in bot.mjs");
} else {
  for (const p of problems) console.log(`  ✗ ${p}`);
}
process.exit(problems.length ? 1 : 0);
