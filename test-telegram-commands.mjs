// Every command the bot can receive must actually do something.
//
// `demand-research` was reachable from menu item 26: it asked for a topic,
// waited for the answer, dispatched it to GitHub — and the workflow's guard,
// which lists the actions it will accept, did not include it. The run started,
// matched no step, and ended green. A command that prompts for input and then
// silently discards it is worse than one that does not exist, and nothing in
// the pipeline could tell you it was happening.
//
// Three ways a command can be answered, and it must be exactly one:
//   · the worker replies itself (help, status)
//   · the workflow guard accepts it AND a step runs it
//   · it is not emitted at all
//
//   node test-telegram-commands.mjs
import { readFileSync } from "node:fs";

const worker = readFileSync("worker/src/index.js", "utf8");
const flow = readFileSync(".github/workflows/telegram.yml", "utf8");

if (!/case "\$request_action" in[\s\S]*?build-german-lesson/.test(flow)) {
  console.log("  ✗ the phone-request allow-list drops the active German A1 lesson command");
  process.exit(1);
}

const emitted = [...new Set(
  [...worker.matchAll(/action:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]),
)].sort();

// The guard is the pipe-separated case list that decides what a real
// Telegram command (INPUT_ACTION) is allowed to dispatch. Anchored to that
// specific `case` line, not just the first "approved-feature|" in the file —
// a second, deliberately narrower guard for the .video-request.json push
// path (only custom-content|content-radar|approved-feature|rerender-feature)
// was added earlier in the file and also starts with "approved-feature|",
// which made the old un-anchored regex grab that short list instead and
// report every other real command as unguarded (confirmed live 2026-09-12:
// all 28 false positives were exactly the actions missing from that other,
// unrelated guard).
const guard = (flow.match(/case "\$INPUT_ACTION" in\s*\n\s*([a-z0-9-|]+)\)/) || [, ""])[1]
  .split("|").map((s) => s.trim()).filter(Boolean);

// Regression guard for the 2026-09-12 incident itself, not for any command.
// Both failure modes of the extraction above look identical from the loop
// below — a pile of healthy commands reported as "the guard drops it" — so
// the read has to be checked before it is allowed to accuse anything:
//   · no match at all: `|| [, ""]` silently yields an empty guard, and then
//     EVERY command reads as dropped.
//   · the wrong match: the old un-anchored /approved-feature\|[^)]*/ grabbed
//     the first "approved-feature|" in the file, which belongs to the narrow
//     $request_action push-path guard (custom-content|content-radar|
//     approved-feature|rerender-feature), leaving 2 of 37 actions accepted
//     and 28 real commands falsely failing.
// A broken TEST must say so in its own words instead of blaming the pipeline.
const pushPathGuard = (flow.match(/case "\$request_action" in\s*([a-z0-9-|]+)\)/) || [, ""])[1]
  .split("|").map((s) => s.trim()).filter(Boolean);

if (!guard.length) {
  console.log('  ✗ telegram.yml\'s `case "$INPUT_ACTION" in` guard did not match at all — this test can no longer read the workflow, so it cannot judge any command. Fix the extraction here, not the commands.');
  process.exit(1);
}
// The real guard always carries actions the 4-action push-path guard does not
// (build-tiktok, resend, plan-week, …). If everything extracted also appears
// in that narrow list, the extraction landed on the wrong `case` — whether it
// grabbed all four or, as in 2026-09-12, a two-action fragment of them.
if (pushPathGuard.length && guard.every((a) => pushPathGuard.includes(a))) {
  console.log(`  ✗ the guard read here (${guard.join("|")}) is the narrow $request_action push-path list, not the $INPUT_ACTION dispatch guard — the 2026-09-12 false-positive bug is back. Fix the extraction here, not the commands.`);
  process.exit(1);
}

// Answered inside the worker, so they never reach GitHub.
const ANSWERED_LOCALLY = ["help", "custom-help", "status"];

// An action can pass the guard and still match no step. Look for it being named
// in a step condition or a case arm.
const hasStep = (a) =>
  new RegExp(`["']${a}["']`).test(flow) &&
  (flow.includes(`== '${a}'`) || flow.includes(`"${a}"`) || new RegExp(`\n\s+${a}\)`).test(flow));

const problems = [];
for (const a of emitted) {
  if (ANSWERED_LOCALLY.includes(a)) continue;
  if (!guard.includes(a)) { problems.push(`${a}: dispatched, but the guard drops it`); continue; }
  if (!hasStep(a)) problems.push(`${a}: passes the guard, but no step runs it`);
}

console.log(`${emitted.length} commands emitted, ${guard.length} accepted, ${ANSWERED_LOCALLY.length} answered by the worker`);
console.log("");
if (!problems.length) {
  console.log("every command does something");
} else {
  for (const p of problems) console.log(`  ✗ ${p}`);
}
process.exit(problems.length ? 1 : 0);
