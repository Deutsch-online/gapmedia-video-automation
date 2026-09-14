import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { decide, MAX_CHAIN_RETRIES } from "./lib/recovery-chain.mjs";

// Owner directive 2026-09-13: FAILED_ATTEMPT != FAILED_JOB. A GitHub Actions
// job that already exited cannot resume mid-flight, so news-scan.yml's
// "Chain an automatic Recovery Loop retry" step (if: failure()) is the only
// way a Recovery Loop keeps trying past one run's local budget. This tests
// the pure decision logic that step's script (lib/recovery-chain.mjs) runs —
// without touching git or the filesystem.

// No marker at all (a failure unrelated to the Recovery Engine) must never
// be chained — that failure belongs to a human or another self-heal routine.
assert.deepEqual(decide(null), { chain: false, reason: "no-marker" });

// Fresh exhaustion (this run's first RecoveryExhausted for this unit) must
// chain — this is exactly the case that used to require a human/agent to
// notice run #223's failure and manually push run #224.
assert.deepEqual(decide({ unit: "a1-18-shopping", attempts: 1 }), { chain: true, attempts: 1 });
assert.deepEqual(decide({ unit: "a1-18-shopping", attempts: MAX_CHAIN_RETRIES - 1 }), { chain: true, attempts: MAX_CHAIN_RETRIES - 1 });

// Budget exhausted must stop chaining for real — never an infinite loop of
// auto-retries masking a genuinely unrecoverable case from a human.
assert.deepEqual(decide({ unit: "a1-18-shopping", attempts: MAX_CHAIN_RETRIES }), { chain: false, reason: "budget-spent", attempts: MAX_CHAIN_RETRIES });
assert.deepEqual(decide({ unit: "a1-18-shopping", attempts: MAX_CHAIN_RETRIES + 5 }), { chain: false, reason: "budget-spent", attempts: MAX_CHAIN_RETRIES + 5 });

// A marker missing "attempts" (should never happen, but must fail safe as
// attempt 1 rather than throw or silently loop forever).
assert.deepEqual(decide({ unit: "a1-18-shopping" }), { chain: true, attempts: 1 });

console.log("ok   Recovery Loop cross-run chain decision: chains a bounded number of times, never infinitely, never for an unrelated failure");

// Measured on 2026-09-13, recorded so nobody re-derives it from scratch:
// the commit this script pushes does NOT start the next run. Commit 48d8c22
// was pushed by the script as github-actions[bot], modified
// .trigger-daily-dispatch, and produced zero runs in news-scan.yml or
// daily.yml — both of which trigger on exactly that path and both of which
// ran for every equivalent push made with the owner's own credentials.
// GitHub does not let a GITHUB_TOKEN push trigger further workflows.
//
// The mechanism's value is therefore the evidence and the bounded counter,
// not the push. This test pins the honest contract so a future change does
// not quietly reintroduce the claim that the chain self-starts.
{
  const src = readFileSync("lib/recovery-chain.mjs", "utf8");
  assert.match(src, /GITHUB_TOKEN/, "the GITHUB_TOKEN limitation must stay documented where the code lives");
  assert.doesNotMatch(
    src,
    /push trigger will start the next attempt/,
    "must not claim the pushed commit starts the next run — measured false on 2026-09-13",
  );
}

console.log("ok   the chain's real contract is recorded: it hands evidence forward, it does not self-start the next run");

// Regression for the concurrency starvation measured on 2026-09-13. All three
// production workflows share the "gapmedia-production" concurrency group with
// cancel-in-progress: false, and GitHub holds only ONE pending run per group —
// so a single push that creates two runs in it loses one of them. Four runs
// from two identical pushes proved it is a coin flip which: #223/#228
// (news-scan survived, daily cancelled) and #229/#230 (daily survived,
// news-scan cancelled). While TRIGGER was ".trigger-daily-dispatch" — a path
// BOTH daily.yml and news-scan.yml listen to — a chained retry could be
// cancelled before running while still having spent an attempt against the
// marker's budget. The chain's trigger path must therefore stay exclusive to
// the workflow that actually rebuilds the lesson.
{
  const { TRIGGER } = await import("./lib/recovery-chain.mjs");
  const listeners = readdirSync(".github/workflows")
    .filter((f) => f.endsWith(".yml"))
    .filter((f) => readFileSync(`.github/workflows/${f}`, "utf8").includes(TRIGGER));

  assert.deepEqual(
    listeners,
    ["news-scan.yml"],
    `the chain's trigger path must fire the lesson workflow and nothing else, or a retry can lose the one pending concurrency slot — currently listened to by: ${listeners.join(", ")}`,
  );
  assert.ok(existsSync(TRIGGER), `${TRIGGER} must exist in the repo — the chain rewrites its "last touch:" line in place and cannot create it`);
  assert.match(
    readFileSync(TRIGGER, "utf8"),
    /^last touch: /m,
    "the trigger file needs the 'last touch:' line the chain rewrites, or its push would be a no-op diff",
  );
}

console.log("ok   the chained retry fires a path no other workflow races it for");

// Why episode 18 never shipped, even after every real cause was fixed.
// Measured 2026-09-13: the chain recorded «خریدِت» as the rejected word and
// spent attempt after attempt on it. The line was then reworded to
// «خرید خودت», so that word no longer existed anywhere in the narration — but
// the budget kept counting, and at 2/3 the chain was one failure away from
// standing down permanently and demanding a human review a sentence that had
// already been fixed. A retry budget is for "the same thing kept failing";
// once the text changes it is not the same thing.
{
  const { evidenceIsStale, decide, MAX_CHAIN_RETRIES } = await import("./lib/recovery-chain.mjs");
  const spent = {
    unit: "a1-18-shopping",
    attempts: MAX_CHAIN_RETRIES,
    lastReason: { faultWords: ["خریدِت"] },
  };

  // The real text after the rewrite — the word is gone.
  const fixed = () => "اولین خرید خودت در آلمان را با همین جمله‌ها انجام بده.";
  assert.equal(evidenceIsStale(spent, fixed), true,
    "a recorded word that no longer appears in the narration is stale evidence");
  assert.equal(decide(spent, fixed).chain, true,
    "a spent budget must not stand down over a failure that has already been fixed");
  assert.equal(decide(spent, fixed).reason, "evidence-stale");

  // The diacritic the gate records is not in the source text; matching must
  // not depend on it, or every marker would look stale.
  assert.equal(evidenceIsStale(spent, () => "اولین خریدت در آلمان را ..."), false,
    "«خریدِت» and «خریدت» are the same word — a kasre must not make evidence look stale");

  // A genuinely persisting failure still exhausts its budget and reaches a
  // human. This is the half that must never be weakened.
  const live = { unit: "a1-18-shopping", attempts: MAX_CHAIN_RETRIES, lastReason: { faultWords: ["قیمت"] } };
  assert.equal(decide(live, () => "این سؤال را برای پرسیدن قیمت به کار ببر.").chain, false,
    "a word still present in the narration keeps failing and must still stand down for a person");
  assert.equal(decide(live, () => "این سؤال را برای پرسیدن قیمت به کار ببر.").reason, "budget-spent");

  // Degenerate inputs must not turn into a chain that never ends.
  assert.equal(evidenceIsStale(null, fixed), false);
  assert.equal(evidenceIsStale({ lastReason: {} }, fixed), false);
  assert.equal(evidenceIsStale(spent, () => ""), false, "an unreadable unit is not proof of a fix");
  assert.equal(evidenceIsStale(spent, () => { throw new Error("boom"); }), false);
  // Without a reader the old behaviour is exactly preserved.
  assert.equal(decide(spent).chain, false);
}


// --- The budget is per SUBJECT, not per unit id (the write side) ---
// Measured 2026-09-14 on a1-19-directions, run #286: the episode had spent 2
// chained attempts on «عبارت/یعنی/مستقیم./دیگر/نمیشوی.». Those lines were
// reworded, every one of those words passed, and the build then failed on a
// completely different set — «رفتن», «مسیری». german-lesson-build.mjs counted
// that as attempt 3 of 3 purely because the unit id matched, and the chain
// stood down for a human on the new subject's FIRST failure, having never
// tried to fix either word. The rule that prevents it already lives in
// evidenceIsStale(); the bug was that only the READER applied it, after the
// writer had already replaced the evidence. This asserts the writer applies
// it too — on the real file, since that is where the regression was.
{
  const build = readFileSync("german-lesson-build.mjs", "utf8");
  assert.match(build, /import \{ evidenceIsStale \} from "\.\/lib\/recovery-chain\.mjs";/,
    "the writer must use the SAME staleness rule as the reader, not a second copy of it");
  assert.match(build, /prior\.unit === pack\.id && !evidenceIsStale\(prior, readNarration\)/,
    "attempts may only increment when the prior evidence still describes a LIVE failure");
}

console.log("ok   a fix that lands does not get thrown away by a retry budget spent on the problem it fixed");
