// The A1 series' manual build cycle (owner request 2026-09-15): a command
// must resolve, must not silently collide with an existing build-X action,
// and every consumer of lib/commands.mjs (cloud listener via telegram.yml,
// local bot.mjs) must actually do something with it — the same "a command
// that matches but nothing handles it" bug class test-telegram-commands.mjs
// and test-bot-commands.mjs already guard against elsewhere in this repo.
//
//   node test-german-manual-build.mjs
import { readFileSync } from "node:fs";
import { parseCommand } from "./lib/commands.mjs";

const problems = [];

// 1. The command itself resolves, and to the right action — not swallowed
//    by an earlier, broader test (build-tools' "ابزار"/"ai"/"tool" set, or
//    the bare "بساز" catch-all).
const PHRASES = ["آلمانی بساز", "درس آلمانی بساز", "german lesson build"];
for (const phrase of PHRASES) {
  const cmd = parseCommand(phrase);
  if (!cmd) { problems.push(`"${phrase}": does not resolve to any command`); continue; }
  if (cmd.action !== "build-german-lesson") {
    problems.push(`"${phrase}": resolves to "${cmd.action}", expected "build-german-lesson"`);
  }
}
// The other build-X commands and the bare catch-all must still resolve to
// themselves — a regression here would mean the new pattern is too greedy.
for (const [phrase, expected] of [
  ["ابزار بساز", "build-tools"],
  ["تیک‌تاک بساز", "build-tiktok"],
  ["بساز", "build-all"],
]) {
  const cmd = parseCommand(phrase);
  if (!cmd || cmd.action !== expected) {
    problems.push(`"${phrase}": expected "${expected}", got "${cmd?.action ?? "(none)"}" — the new pattern is too broad`);
  }
}

// 2. telegram.yml: the guard accepts it, a step actually runs it, and the
//    permission that step needs (actions: write, to call workflow_dispatch —
//    a push from this job's own GITHUB_TOKEN cannot trigger another
//    workflow) is actually granted.
const tgYml = readFileSync(".github/workflows/telegram.yml", "utf8");
const guardMatch = tgYml.match(/case "\$INPUT_ACTION" in\s*\n\s*([a-z0-9-|]+)\)/);
const guard = (guardMatch ? guardMatch[1] : "").split("|").map((s) => s.trim());
if (!guard.includes("build-german-lesson")) {
  problems.push("telegram.yml: build-german-lesson is missing from the $INPUT_ACTION guard");
}
if (!/steps\.cmd\.outputs\.ACTION == 'build-german-lesson'/.test(tgYml)) {
  problems.push("telegram.yml: no step is gated on ACTION == 'build-german-lesson'");
}
if (!/\n\s*actions:\s*write/.test(tgYml.split("jobs:")[0])) {
  problems.push("telegram.yml: permissions block is missing actions: write (needed to call workflow_dispatch on news-scan.yml)");
}
if (!/workflows\/news-scan\.yml\/dispatches/.test(tgYml)) {
  problems.push("telegram.yml: the build-german-lesson step does not dispatch news-scan.yml");
}

// 3. news-scan.yml: the push path exists, and the gate step has a branch
//    that checks THIS push actually touched it (not just that the file
//    exists on disk — a stale request could otherwise be replayed by any
//    unrelated commit, the same class of bug the correction-request branch
//    right above it was already written to avoid).
const newsYml = readFileSync(".github/workflows/news-scan.yml", "utf8");
if (!/\.german-manual-build-request\.json/.test(newsYml.split("jobs:")[0])) {
  problems.push("news-scan.yml: .german-manual-build-request.json is missing from on.push.paths");
}
if (!/pushed "\.german-manual-build-request\.json"/.test(newsYml) || !/grep -Fxq "\$1"/.test(newsYml)) {
  problems.push("news-scan.yml: the gate step does not verify THIS push changed .german-manual-build-request.json");
}
if (!/Manual build request: building the next episode now/.test(newsYml)) {
  problems.push("news-scan.yml: no go=yes branch for a manual build request");
}

// 4. bot.mjs: the local bot (the third consumer lib/commands.mjs's own
//    header warns must never drift from the other two) has a real branch,
//    not a silent fall-through — bot.mjs's handle() has no final "else",
//    so an unmatched cmd.action produces no reply at all.
const botMjs = readFileSync("bot.mjs", "utf8");
if (!botMjs.includes('cmd.action === "build-german-lesson"')) {
  problems.push('bot.mjs: no branch checks cmd.action === "build-german-lesson"');
}
if (!/german-manual-build-request\.json/.test(botMjs)) {
  problems.push("bot.mjs: the branch does not write .german-manual-build-request.json");
}

console.log(`${PHRASES.length} manual-build phrases checked, ${guard.length} actions in the telegram.yml guard`);
console.log("");
if (!problems.length) {
  console.log("the manual German A1 build cycle resolves and is handled everywhere it needs to be");
} else {
  for (const p of problems) console.log(`  ✗ ${p}`);
}
process.exit(problems.length ? 1 : 0);
