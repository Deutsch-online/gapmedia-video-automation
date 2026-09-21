// Owner directive 2026-09-21: "فعلا فقط درس المانی را ادامه می دهیم بقیه ساخت
// متوقف شود" — for now only the German lesson continues; the rest of
// production stops.
//
//   node test-german-only-production.mjs
//
// The German A1 series is the only lane allowed to start itself. Everything
// else may still exist and still be runnable by hand — stopping production is
// not deleting the code — but nothing else may fire on a clock.
//
// A GitHub-side "disable workflow" toggle is not enough on its own: the cron
// stays in the file and resumes the moment anyone re-enables it. This test
// reads the files, so the stop survives that.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const DIR = ".github/workflows";

// The only two allowed to run on a schedule, and why:
const ALLOWED = new Map([
  ["news-scan.yml", "the German A1 lesson series itself"],
  ["telegram.yml", "the bot poller — it starts no build of its own and carries the German commands"],
]);

const scheduled = [];
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".yml"))) {
  const text = readFileSync(`${DIR}/${file}`, "utf8");
  // A cron line that is not inside a comment.
  const hasCron = text.split("\n").some((l) => /^\s*- cron:/.test(l));
  if (hasCron) scheduled.push(file);
}

const unexpected = scheduled.filter((f) => !ALLOWED.has(f));
assert.deepEqual(unexpected, [],
  `only the German lane may start itself — these still run on a clock: ${unexpected.join(", ")}`);

for (const [file, why] of ALLOWED) {
  assert.ok(scheduled.includes(file), `${file} lost its schedule, but it is needed: ${why}`);
}

// research.mjs sends a Persian content digest to Telegram. It is the Persian
// content bank's lane, not German, so it must not fire by itself.
const research = readFileSync(`${DIR}/research.yml`, "utf8");
assert.doesNotMatch(research, /^\s*- cron:/m,
  "the weekly Persian research digest must not run on a schedule while only German is in production");
assert.match(research, /workflow_dispatch:/,
  "it must stay runnable by hand — production is stopped, not deleted");

console.log(`only ${[...ALLOWED.keys()].join(" and ")} run on a clock; ${scheduled.length} scheduled workflows checked`);
