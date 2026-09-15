// The diagnose stage, tested against text this pipeline really emitted.
//
// Every excerpt below is copied from a real news-scan job log on 2026-09-15
// (runs #335-#343) or from the exact template string the source file builds.
// A classifier tested on invented strings proves nothing: the whole point of
// this stage is that it recognises THIS system's failures, so a message that is
// later reworded must break this test loudly rather than silently degrade to
// "unknown" in production.
//
//   node test-diagnose.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { diagnose, shouldRetry, fingerprintOf, rewordBrokeRegister } from "./lib/diagnose.mjs";

// Verbatim from news-scan run #344 (episode 21, a1-21-professions), including
// the Recovery Engine's own before/after labels.
const REGISTER_BREAK = `   German lesson narration recovery: rewording persistent fault «جدا، زن»
     before: این کلمه‌ها یعنی معلم؛ برای مرد و زن جدا است.
     after:  این کلمه‌ها یعنی معلم؛ شکل مؤنث و مذکرشون با هم فرق داره!
Narration QC line 3: wrong «مذکرشون» → «مسکرشون»`;

const REWORD_EXHAUSTED = `   German lesson narration recovery: no valid reword found for «مذکرشون، زن، شغل» in "این سؤال را برای پرسیدن شغل کسی به کار ببر." — recovery strategy space exhausted.
   ✗ episode 21 (a1-21-professions) failed: recovery exhausted: local retries and every proposed new strategy failed, or no new strategy was available`;

const CASES = [
  {
    name: "narration preflight (episode 21, runs #341 and #343)",
    output: "   ✗ voice planning failed, using the beat grid: Persian narration preflight: possessive ـت before «د» — its /t/ assimilates and the word is heard as another; drop the clitic or reorder\n   ✗ episode 21 (a1-21-professions) failed: Persian narration preflight: possessive ـت before «د» — its /t/ assimilates and the word is heard as another; drop the clitic or reorder",
    kind: "narration-preflight",
    retryable: true,
  },
  {
    name: "Recovery Engine exhausted (a1-21-professions, run #343)",
    output: "Narration QC line 3: wrong «مرد» → «مرض»\n   ✗ German lesson narration: local retries and every proposed recovery strategy failed (chain attempt 1). Last rejected word(s): «مرد، زن، جدا».",
    kind: "narration-recovery-exhausted",
    retryable: true,
  },
  {
    name: "plain narration QC rejection",
    output: "Narration QC line 3: wrong «زن» → «زند»\nNarration QC line 4: missing «و» → «—»",
    kind: "narration-qc",
    retryable: true,
  },
  {
    name: "Visual Truth Gate, as the owner saw it for episode 20",
    output: "   ✗ episode 20 (a1-20-countries) failed: هیچ عکس واقعی و مرتبطی برای «Woher kommst du? — اهل کجایی؟ (غیررسمی)» پیدا نشد",
    kind: "visual-proof",
    retryable: true,
  },
  {
    name: "duplicate ledger verdict",
    output: "   ✗ episode 11 (a1-11-time) failed: تکراری (0.92) — قسمت «a1-03» قبلاً رفته است",
    kind: "duplicate",
    retryable: false,
  },
  {
    name: "curriculum exhausted",
    output: "   ✗ curriculum exhausted: GERMAN_A1 has 24 units, next index is 24.",
    kind: "content-exhausted",
    retryable: false,
  },
  {
    name: "every provider for a capability failed",
    output: "ProviderExhaustedError: No configured voice provider completed the request.",
    kind: "provider-exhausted",
    retryable: true,
  },
  {
    name: "Telegram not configured",
    output: "   ✗ episode 22 (a1-22) failed: Telegram is not configured; refusing to mark a local-only render as delivered.",
    kind: "config",
    retryable: false,
  },
];

for (const c of CASES) {
  const d = diagnose({ exitCode: 1, output: c.output });
  assert.equal(d.kind, c.kind, `${c.name}: expected ${c.kind}, got ${d.kind} (evidence: ${d.evidence})`);
  assert.equal(d.retryable, c.retryable, `${c.name}: retryable must be ${c.retryable}`);
  assert.ok(d.evidence, `${c.name}: a diagnosis with no evidence tells the owner nothing`);
  assert.ok(d.fa, `${c.name}: the owner reads Persian, so every kind needs a Persian explanation`);
}
console.log("ok   every real failure class this pipeline produces is identified by name");

// Owner directive 2026-09-15, after run #344: the diagnose stage must also
// catch the case where the automatic reword itself is the defect.
{
  const d = diagnose({ exitCode: 1, output: REGISTER_BREAK });
  assert.equal(d.kind, "narration-register-break",
    "a reword that drags a formal lesson line into محاوره is its own defect, not just a QC failure");
  assert.equal(d.retryable, false,
    "the reword machinery is deterministic — another attempt re-proposes the same colloquial line");
  assert.equal(d.detail.before, "این کلمه‌ها یعنی معلم؛ برای مرد و زن جدا است.");
  assert.equal(d.detail.after, "این کلمه‌ها یعنی معلم؛ شکل مؤنث و مذکرشون با هم فرق داره!");
  assert.match(d.evidence, /مذکرشون/,
    "the evidence must be the offending sentence, which is what the owner has to read");
}
console.log("ok   a reword that breaks the series' formal register is caught as its own defect");

// The comparison is what keeps this safe: a formal reword must NOT be flagged,
// and a line that was ALREADY colloquial before the reword is not evidence
// that the reword broke anything.
{
  const formal = `   German lesson narration recovery: rewording persistent fault «یاد بگیر»
     before: این دو اسم کشور را یاد بگیر.
     after:  این دو اسم کشور را حفظ کن.`;
  assert.equal(rewordBrokeRegister(formal), null,
    "a formal→formal reword must not be flagged — this is the fix that actually shipped episode 20");
  assert.notEqual(diagnose({ output: formal }).kind, "narration-register-break");

  const alreadyCasual = `     before: بیا اینو با هم ببینیم، باشه دیگه؟
     after:  بیا اینو با هم ببینیم، اونم سریع!`;
  assert.equal(rewordBrokeRegister(alreadyCasual), null,
    "if the line was already colloquial, the reword did not introduce anything");

  assert.equal(rewordBrokeRegister("no reword happened in this run at all"), null);
}
console.log("ok   only a reword that INTRODUCES colloquial forms is flagged, never a formal one");

// The marker set is deliberately high-precision, because every false positive
// here stops a build that was going to succeed. Three real traps:
{
  // «رو» is also an ordinary formal word.
  assert.equal(rewordBrokeRegister(`     before: به سمت جلو حرکت کن.
     after:  رو به جلو حرکت کن.`), null,
    "«رو» must not be treated as a colloquial marker — it is an ordinary formal word too");

  // Ordinary formal words that happen to end in ـتون/ـمون. Flagging these is
  // why those two suffixes are not markers at all.
  for (const word of ["آزمون", "مضمون", "پیرامون", "کارتون", "ستون"]) {
    assert.equal(rewordBrokeRegister(`     before: این تمرین را انجام بده.
     after:  ${word} را با دقت بررسی کن.`), null,
      `«${word}» is formal Persian — it must never be read as the colloquial ـشون/ـتون/ـمون ending`);
  }

  // And the one that must still fire, proving the rule was not simply disabled.
  assert.ok(rewordBrokeRegister(`     before: شکل آن‌ها فرق دارد.
     after:  شکل مذکرشون فرق دارد.`),
    "«مذکرشون» is the real colloquial ending and must still be caught");
}
console.log("ok   the marker set stays high-precision — formal Persian is never flagged, محاوره still is");

// The Recovery Engine saying it is out of ideas, in its own words.
{
  const d = diagnose({ exitCode: 1, output: REWORD_EXHAUSTED });
  assert.equal(d.kind, "narration-reword-exhausted");
  assert.equal(d.retryable, false,
    "the engine reports no strategy left; re-running the same deterministic search reaches the same end");
  assert.equal(shouldRetry(d, [], { attempt: 1, maxAttempts: 3 }).again, false,
    "the cycle must not spend a second full build on a search that reported itself exhausted");
}
console.log("ok   'no strategy left' stops the cycle instead of costing another full build");

// Ordering: an exhausted Recovery Loop prints QC lines too. The narrower,
// more informative diagnosis must win, or the cycle would report "a take was
// mis-heard" when the truth is "every rewording strategy is spent".
{
  const both = "Narration QC line 3: wrong «مرد» → «مرض»\n   ✗ German lesson narration: local retries and every proposed recovery strategy failed (chain attempt 2).";
  assert.equal(diagnose({ output: both }).kind, "narration-recovery-exhausted",
    "the specific exhaustion diagnosis must outrank the generic QC one it contains");
}
console.log("ok   the most specific matching diagnosis wins over the generic one it contains");

// An unrecognised failure must still produce a usable verdict rather than
// throwing — a diagnose stage that crashes on a new error class would take the
// whole cycle down with it.
{
  const d = diagnose({ exitCode: 137, output: "Killed\nsome error nobody has classified yet" });
  assert.equal(d.kind, "unknown");
  assert.equal(d.exitCode, 137);
  assert.ok(d.evidence, "even an unknown failure must carry the line it failed on");
}
console.log("ok   an unrecognised failure is reported honestly instead of crashing the cycle");

// Fingerprints decide "is this the same failure again?". Volatile parts must
// not make two identical failures look different, or the no-progress rule
// below never fires and the cycle burns its whole budget on a repeat.
{
  const a = fingerprintOf("narration-preflight", "   ✗ episode 21 (a1-21-professions) failed: Persian narration preflight: possessive ـت before «د»");
  const b = fingerprintOf("narration-preflight", "   ✗ episode 21 (a1-21-professions) failed: Persian narration preflight: possessive ـت before «د»");
  assert.equal(a, b, "the same failure text must fingerprint identically");
  const different = fingerprintOf("narration-preflight", "   ✗ episode 21 failed: Persian narration preflight: ezafe the grammar has no room for");
  assert.notEqual(a, different, "a genuinely different rejection must not collapse into the same fingerprint");
}
console.log("ok   the same failure fingerprints the same, a different one does not");

// The retry policy.
{
  const preflight = diagnose({ output: "Persian narration preflight: possessive ـت before «د»" });
  const duplicate = diagnose({ output: "تکراری (0.92) — قسمت «a1-03» قبلاً رفته است" });

  assert.equal(shouldRetry(duplicate, [], { attempt: 1, maxAttempts: 3 }).again, false,
    "a duplicate rebuilds to the same fingerprint — retrying it is guaranteed waste");

  assert.equal(shouldRetry(preflight, [], { attempt: 1, maxAttempts: 3 }).again, true,
    "a retryable failure on the first attempt earns a second one");

  // The rule that episode 21 actually needed: runs #341 and #343 died on the
  // byte-identical preflight message, because the reword that produced it is
  // deterministic. A third identical attempt was never going to differ.
  const repeat = shouldRetry(preflight, [{ fingerprint: preflight.fingerprint }], { attempt: 2, maxAttempts: 3 });
  assert.equal(repeat.again, false, "the identical failure twice means the cycle is not making progress");
  assert.equal(repeat.reason, "no-progress");

  const spent = shouldRetry(preflight, [{ fingerprint: "other:deadbeef" }], { attempt: 3, maxAttempts: 3 });
  assert.equal(spent.again, false, "the cycle must stop at its budget, not run forever");
  assert.equal(spent.reason, "budget-spent");
}
console.log("ok   the cycle retries real progress, and stops on a repeat, a dead end, or a spent budget");

// The wiring the directive depends on: a failed ATTEMPT must not reach
// Telegram. Asserted against the source because the alternative is running a
// full 12-minute build in a test just to observe that nothing was sent.
{
  const build = readFileSync("german-lesson-build.mjs", "utf8");
  assert.match(build, /const inCycle = process\.env\.GERMAN_CYCLE === "on";/,
    "german-lesson-build.mjs must know when a cycle owns the reporting");
  assert.match(build, /if \(tg\.enabled && !inCycle\) \{/,
    "a failed attempt inside a cycle must not send its own Telegram alert");
  assert.match(build, /if \(tg\.enabled\) \{\s*\n\s*const res = await sendVideo/,
    "the success path must still send the finished video, untouched by the cycle");

  const cycle = readFileSync("german-cycle.mjs", "utf8");
  assert.match(cycle, /GERMAN_CYCLE: "on"/, "the cycle must actually set the flag it relies on");
  assert.match(cycle, /capability: "voice", required: true/, "a build with no usable TTS cannot ship an episode");
  assert.match(cycle, /capability: "delivery", required: true/, "a build that cannot deliver must not start");
  assert.match(cycle, /capability: "search", required: false/,
    "LAW 7 ends in a labelled local graphic, so a rate-limited search must not block an episode");
}
console.log("ok   a failed attempt stays inside the cycle; only a finished video reaches Telegram");
