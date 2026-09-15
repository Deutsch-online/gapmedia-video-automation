// The build → diagnose → build cycle, exercised without building anything.
//
// Owner directive 2026-09-15: «تمام ساخت ویدیوهای آلمانی را در یک دور چرخشی
// ایجاد کن ... نباید تا اجرا موفق نشود به تلگرام برود». The behaviour that
// matters is not "does a build work" (german-lesson-build.mjs already owns
// that) — it is how many times the cycle tries, when it stops, and that a
// failed attempt never ends the loop prematurely or leaks out of it. Those are
// decisions, so they are tested as decisions, with the attempt runner injected.
//
//   node test-german-cycle.mjs
import assert from "node:assert/strict";
import { runCycle } from "./german-cycle.mjs";

const PREFLIGHT = "   ✗ episode 21 (a1-21-professions) failed: Persian narration preflight: possessive ـت before «د» — its /t/ assimilates";
const QC = "Narration QC line 3: wrong «مرد» → «مرض»";
const DUPLICATE = "   ✗ episode 11 (a1-11-time) failed: تکراری (0.92) — قسمت «a1-03» قبلاً رفته است";

// A runner that replays a fixed script of attempt outcomes, and records how
// many times it was actually called.
const scripted = (outcomes) => {
  const calls = [];
  const run = async (attempt) => {
    calls.push(attempt);
    const next = outcomes[attempt - 1];
    return next ?? { exitCode: 0, output: "✅ episode ready" };
  };
  run.calls = calls;
  return run;
};

// 1. The ordinary day: the first build works, nothing is retried.
{
  const run = scripted([{ exitCode: 0, output: "   ✈ sent to Telegram\n✅ episode 20 ready" }]);
  const result = await runCycle({ runAttempt: run, maxAttempts: 3 });
  assert.equal(result.outcome, "success");
  assert.equal(result.attempts, 1);
  assert.deepEqual(run.calls, [1], "a build that works must not be run a second time");
  assert.equal(result.diagnoses.length, 0, "nothing failed, so there is nothing to diagnose");
}
console.log("ok   a first-attempt success ends the cycle immediately");

// 2. The reason the cycle exists: a failure that a fresh attempt genuinely
//    clears. Before this, one bad take ended the run and alerted the channel.
{
  const run = scripted([
    { exitCode: 1, output: QC },
    { exitCode: 0, output: "   ✈ sent to Telegram\n✅ episode 20 ready" },
  ]);
  const result = await runCycle({ runAttempt: run, maxAttempts: 3 });
  assert.equal(result.outcome, "success");
  assert.equal(result.attempts, 2);
  assert.equal(result.diagnoses[0].kind, "narration-qc",
    "the failed attempt must still be diagnosed and recorded, even though the next one worked");
}
console.log("ok   a recoverable failure is diagnosed and the next attempt still ships the episode");

// 3. Episode 21's real history: runs #341 and #343 died on the byte-identical
//    preflight message. The third attempt could only have produced a fourth
//    copy of it, so the cycle must stop at two and say so.
{
  const run = scripted([
    { exitCode: 1, output: PREFLIGHT },
    { exitCode: 1, output: PREFLIGHT },
    { exitCode: 1, output: PREFLIGHT },
  ]);
  const result = await runCycle({ runAttempt: run, maxAttempts: 3 });
  assert.equal(result.outcome, "failed");
  assert.equal(result.stopped, "no-progress");
  assert.deepEqual(run.calls, [1, 2], "the identical failure twice must stop the cycle, not spend a third build");
}
console.log("ok   the same failure twice stops the cycle instead of burning the budget on a repeat");

// 4. A dead end is recognised on its first appearance — rebuilding a duplicate
//    produces the same fingerprint every time, by definition.
{
  const run = scripted([{ exitCode: 1, output: DUPLICATE }]);
  const result = await runCycle({ runAttempt: run, maxAttempts: 3 });
  assert.equal(result.outcome, "failed");
  assert.equal(result.stopped, "not-retryable:duplicate");
  assert.deepEqual(run.calls, [1], "a failure that cannot improve must not be retried even once");
}
console.log("ok   a non-retryable failure stops on the first attempt");

// 5. Genuinely different failures each time still hit a hard ceiling — a cycle
//    that can run forever is not a cycle, it is a stuck job.
{
  const run = scripted([
    { exitCode: 1, output: QC },
    { exitCode: 1, output: PREFLIGHT },
    { exitCode: 1, output: "ProviderExhaustedError: No configured voice provider completed the request." },
  ]);
  const result = await runCycle({ runAttempt: run, maxAttempts: 3 });
  assert.equal(result.outcome, "failed");
  assert.equal(result.stopped, "budget-spent");
  assert.deepEqual(run.calls, [1, 2, 3]);
  assert.deepEqual(result.diagnoses.map((d) => d.kind),
    ["narration-qc", "narration-preflight", "provider-exhausted"],
    "every attempt's own cause must be kept, so the final report shows the real trail");
}
console.log("ok   three different real failures spend the budget and stop with the full trail");

// 6. The whole trail is what the owner is shown instead of one bare error, so
//    it has to survive to the end of the run rather than being overwritten.
{
  const run = scripted([
    { exitCode: 1, output: QC },
    { exitCode: 1, output: PREFLIGHT },
  ]);
  const result = await runCycle({ runAttempt: run, maxAttempts: 2 });
  assert.equal(result.diagnoses.length, 2);
  for (const d of result.diagnoses) {
    assert.ok(d.evidence, "each recorded diagnosis must carry the line it failed on");
    assert.ok(d.fa, "each recorded diagnosis must carry its Persian explanation");
    assert.ok(d.decision, "each recorded diagnosis must say what the cycle decided after it");
  }
}
console.log("ok   every attempt's diagnosis survives to the final report");
