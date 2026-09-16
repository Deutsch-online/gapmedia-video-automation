// The income pipeline's production cycle, pinned against the run it was
// written for.
//
// daily.yml run #280 (2026-09-16) is the evidence behind every case here. Both
// slots were killed at exactly 32m00s by the workflow's per-slot `timeout`
// (tiktok 09:13:09→09:45:09, instagram 09:45:09→10:17:09) and bash reported a
// single line — "<slot> did not complete" — while the real causes sat unread
// in a 1,200-line log: Pollinations 500-wrapping-429 on every AI image, no
// keyless index answering at all, and therefore every topic refused by the
// Visual Truth Gate.
//
//   node test-daily-cycle.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { diagnose } from "./lib/diagnose.mjs";
import { runCycle } from "./lib/cycle.mjs";

const workflow = readFileSync(".github/workflows/daily.yml", "utf8");
const cycle = readFileSync("daily-cycle.mjs", "utf8");
const render = readFileSync("daily-render.mjs", "utf8");

// ── 1. The timeouts must nest, or the cycle dies before it can speak ───────
//
// This is the whole point of the file: bash's `timeout` must stay ABOVE the
// cycle's deadline, which must stay above the per-attempt ceiling. Invert any
// pair and the outer killer fires first, which is exactly the silent death
// this cycle was built to end.
{
  const slotTimeout = Number(workflow.match(/timeout --preserve-status (\d+)m node daily-cycle\.mjs/)[1]);
  const deadline = Number(cycle.match(/DAILY_CYCLE_DEADLINE_MINUTES\) \|\| (\d+)/)[1]);
  const attempt = Number(cycle.match(/DAILY_ATTEMPT_MINUTES\) \|\| (\d+)/)[1]);
  assert.ok(attempt < deadline,
    `the per-attempt ceiling (${attempt}m) must be under the cycle deadline (${deadline}m), or the cycle can never stop an attempt itself`);
  assert.ok(deadline < slotTimeout,
    `the cycle deadline (${deadline}m) must be under the workflow's per-slot timeout (${slotTimeout}m), or bash kills the cycle before it writes the diagnosis`);
  console.log(`  ok   timeouts nest: attempt ${attempt}m < deadline ${deadline}m < slot ${slotTimeout}m`);
}

// ── 2. A failed attempt must not reach the channel on its own ─────────────
{
  assert.match(render, /if \(tg\.enabled && !inCycle\)/,
    "daily-render.mjs must not send its own «ساخته نشد» alert while a cycle owns the run");
  assert.match(render, /const inCycle = process\.env\.DAILY_CYCLE === "on";/,
    "the flag daily-cycle.mjs sets must be the one daily-render.mjs reads");
  assert.match(cycle, /DAILY_CYCLE: "on"/,
    "daily-cycle.mjs must actually set the flag it relies on");
  // The success path stays untouched: a finished video still goes out.
  assert.ok(!/sendVideo[\s\S]{0,120}inCycle/.test(render),
    "the success send must NOT be gated — only failure alerts are the cycle's to own");
  console.log("  ok   a failed attempt stays in the cycle; a finished video still ships");
}

// ── 3. Run #280's real log lines must each get a real diagnosis ───────────
//
// Before this, none of these matched a signature and the whole failure came
// back as "unknown" — a diagnose stage that cannot name the daily pipeline's
// own errors is not a diagnose stage.
const cases = [
  ["image-generator-down",
    `   ⚠ generateAIImage(Upscayl): attempt 2 — Pollinations 500 — {"error":"Internal Server Error","message":"Gen Sana request failed with 429: ..."}`],
  ["search-index-down",
    "   ⚠ findRealImage(نمودار ماندگاری ویدیو — GapMedia): strategy 2/3 no keyless index answered — tried duckduckgo(fetch failed), duckduckgo-html(fetch failed), mojeek(cooling)"],
  ["visual-proof",
    "   ⚠ Visual QC: view-jail منبع رسمی/معتبر برای قابلیت ثبت‌نشده — تصویر واقعی همچنان الزامی است."],
  ["visual-proof",
    "   ⚠ tiktok (retention-graph) attempt 2/6 failed: Visual QC: تصویر اسلاید 2 در retention-graph برای قاب عمودی باکیفیت کافی ندارد."],
  ["attempt-timeout",
    "   ✗ tiktok: attempt exceeded its 30-minute ceiling and was stopped by the cycle."],
  ["slot-exhausted",
    "   ✗ instagram (pin-posts) failed after 6 attempts, no more topics to try: Visual QC failed"],
];
for (const [want, line] of cases) {
  const d = diagnose({ exitCode: 1, output: line });
  assert.equal(d.kind, want, `«${line.trim().slice(0, 60)}…» should diagnose as ${want}, got ${d.kind}`);
  assert.ok(d.fa && d.cause, `${want} must carry a Persian explanation and a technical cause`);
}
console.log(`  ok   all ${cases.length} of run #280's own failure lines get a named diagnosis`);

// The generator outage outranks the gate refusal when both are present: one is
// the cause, the other its effect, and only the first tells the owner that
// waiting will fix it.
{
  const both = [
    "   ⚠ Visual QC: view-jail منبع رسمی/معتبر برای قابلیت ثبت‌نشده — تصویر واقعی همچنان الزامی است.",
    `   ⚠ generateAIImage(view-jail): attempt 2 — Pollinations 500 — {"message":"Gen Sana request failed with 429"}`,
    "   ✗ tiktok (view-jail) failed after 6 attempts, no more topics to try: Visual QC failed",
  ].join("\n");
  assert.equal(diagnose({ exitCode: 1, output: both }).kind, "image-generator-down",
    "with the generator down AND the gate refusing, the outage is the diagnosis worth reporting");
  console.log("  ok   the outage outranks its own downstream gate refusal");
}

// ── 4. The loop's two honest decisions, on daily-shaped failures ──────────
{
  // A fast failure leaves room, so it earns a second attempt.
  const fast = await runCycle({
    maxAttempts: 2,
    deadlineAt: 40 * 60_000,
    now: (() => { let t = 0; return () => (t += 2 * 60_000); })(),
    runAttempt: async (n) => n === 1
      ? { exitCode: 1, output: "   ⚠ findRealImage(x): strategy 1/3 no keyless index answered — tried duckduckgo(fetch failed)" }
      : { exitCode: 0, output: "✅ sent" },
  });
  assert.equal(fast.outcome, "success");
  assert.equal(fast.attempts, 2, "a cheap failure with time left must get its second attempt");

  // A slow one does not: the guard refuses to start an attempt that would be
  // killed mid-render, and says so instead of dying silently.
  let clock = 0;
  const slow = await runCycle({
    maxAttempts: 2,
    deadlineAt: 31 * 60_000,
    now: () => clock,
    runAttempt: async () => {
      clock += 29 * 60_000;
      return { exitCode: 1, output: "   ✗ tiktok: attempt exceeded its 30-minute ceiling and was stopped by the cycle." };
    },
  });
  assert.equal(slow.outcome, "failed");
  assert.equal(slow.attempts, 1);
  assert.equal(slow.stopped, "deadline",
    "an attempt that cannot finish before the slot timeout must be refused, not started");
  assert.equal(slow.diagnoses[0].kind, "attempt-timeout");
  console.log("  ok   a cheap failure retries; one that would be killed mid-render is refused with a reason");
}

console.log("");
console.log("ok   the income pipeline diagnoses its own failures before anything reaches the channel");
