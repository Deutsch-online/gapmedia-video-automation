// The diagnose stage of the German-lesson build cycle.
//
// Owner directive 2026-09-15 ("یک قسمت اجرا خط گرفت باید به بخش دیاگنوز برود و
// انجا خطا شناسایی شود"): a failed build attempt must not end the run and must
// not reach Telegram. It goes here first, the real cause is identified from the
// attempt's own output, and only then does the cycle decide whether another
// attempt is honest work or a repeat of something already proven not to work.
//
// This module is deliberately PURE — it reads text and returns a verdict. It
// never edits narration, never touches a quality gate, never sends anything.
// Every remedy it can recommend is either "attempt again" or "stop": the actual
// fixing of wording is the Recovery Engine's job (lib/recovery-engine.mjs +
// lib/narration-recovery.mjs), inside each attempt, under the phonological
// discipline documented there. A diagnosis is allowed to say "try again"; it is
// never allowed to say "lower the bar".
import { createHash } from "node:crypto";

// Ordered most-specific first: an exhausted Recovery Loop also prints the
// "Narration QC line N:" lines that a plain QC failure prints, so the broader
// pattern must never win over the narrower one.
//
// Every pattern below is a string this repository's own code really emits —
// checked against production logs from news-scan runs #335-#343 (2026-09-15),
// not invented. The Persian ones are matched on a distinctive fragment rather
// than the whole sentence so a reworded message does not silently stop matching.
const SIGNATURES = [
  {
    kind: "config",
    // lib/telegram.mjs / german-lesson-build.mjs refuse to treat a local-only
    // render as delivered. No number of retries creates a missing secret.
    test: (out) => /Telegram is not configured|refusing to mark a local-only render/i.test(out),
    cause: "Telegram credentials are not configured for this run",
    fa: "توکن یا Chat ID تلگرام تنظیم نشده است. این با تکرار اجرا درست نمی‌شود؛ باید Secret تنظیم شود.",
    retryable: false,
  },
  {
    kind: "content-exhausted",
    // german-lesson-build.mjs refuses to wrap around to a1-01 under a new
    // episode number (owner report 2026-09-11: A1-011 re-taught a1-03 word for
    // word). Retrying re-reads the same curriculum length and the same pointer.
    test: (out) => /curriculum exhausted: GERMAN_A1 has|به آخر بانک محتوای فعلی رسید/.test(out),
    cause: "the A1 curriculum has no unit left at the current progress index",
    fa: "بانک محتوای دورهٔ A1 تمام شده است. باید به lib/german-a1.mjs واحد تازه اضافه شود؛ تکرار اجرا چیزی عوض نمی‌کند.",
    retryable: false,
  },
  {
    kind: "duplicate",
    // lib/dedupe.mjs's verdict. Rebuilding produces the same fingerprint, so a
    // retry is guaranteed to fail identically — this is a content decision.
    test: (out) => /تکراری \(|این موضوع اخیراً یک‌بار ساخته شده/.test(out),
    cause: "duplicate content rejected by the 30-day ledger",
    fa: "این محتوا تکراری تشخیص داده شد. ساخت دوباره همان اثر انگشت را می‌سازد، پس تکرار اجرا بی‌فایده است.",
    retryable: false,
  },
  {
    kind: "narration-preflight",
    // lib/voice-settings.mjs's preflight, thrown before any synthesis. Episode
    // 21 (a1-21-professions) died here on runs #341 and #343 with the identical
    // message both times, because the Recovery Engine's reword is deterministic:
    // it proposed the same replacement sentence, which tripped the same rule.
    // Retryable in principle — a later cycle can propose a different reword —
    // but the cycle's own no-progress rule is what actually stops the loop when
    // the proposal does not change.
    test: (out) => /Persian narration preflight:/.test(out),
    cause: "narration text was rejected by the pre-synthesis phonology check",
    fa: "متن نریشن پیش از ساخت صدا رد شد (قانون آوایی lib/voice-settings.mjs).",
    retryable: true,
  },
  {
    kind: "narration-recovery-exhausted",
    // lib/recovery-engine.mjs's RecoveryExhausted, surfaced by
    // german-lesson-build.mjs. Each new attempt gets a fresh recovery budget
    // and may propose a strategy the last one ruled out, so this is retryable —
    // bounded by the cycle, and by the no-progress rule when it repeats.
    test: (out) => /local retries and every proposed recovery strategy failed/.test(out),
    cause: "the Recovery Engine tried every sanctioned rewording strategy and none passed",
    fa: "موتور بازیابی همهٔ راهکارهای مجاز بازنویسی را امتحان کرد و هیچ‌کدام از گیت نریشن رد نشد.",
    retryable: true,
  },
  {
    kind: "narration-qc",
    // music/voice-qc.mjs rejecting a take. A fresh attempt re-synthesises, and
    // genuine synthesis noise does clear on a new take — that is exactly why
    // the local retry budget exists inside a single attempt.
    test: (out) => /Narration QC line \d+:/.test(out),
    cause: "spoken narration did not match the written line",
    fa: "گیت شنیداری نریشن، تلفظ را مطابق متن تشخیص نداد.",
    retryable: true,
  },
  {
    kind: "visual-proof",
    // lib/visual-proof.mjs's assertVisualProof. Image sources are rate-limited
    // and quota-bound (Exa 402, Gemini/Groq 429 on runs #340/#342), so a later
    // attempt genuinely can succeed where this one could not.
    test: (out) => /تصویر واقعیِ همان قابلیت ندارد|assertVisualProof|هیچ عکس واقعی و مرتبطی/.test(out),
    cause: "no image passed the Visual Truth Gate for at least one slide",
    fa: "برای دست‌کم یک اسلاید هیچ تصویری از گیت تصویر واقعی رد نشد.",
    retryable: true,
  },
  {
    kind: "provider-exhausted",
    // lib/providers.mjs's ProviderExhaustedError. Usually a rate limit rather
    // than a permanent outage, so one more attempt is legitimate.
    test: (out) => /ProviderExhaustedError|No configured \w+ provider completed the request/.test(out),
    cause: "every configured provider for one capability failed in this attempt",
    fa: "همهٔ Providerهای آمادهٔ یک قابلیت در این تلاش شکست خوردند.",
    retryable: true,
  },
  {
    kind: "render",
    // The hyperframes render step. Browser/GPU startup on a fresh runner is the
    // known flaky part here (it downloads Chrome per run), so one retry is fair.
    test: (out) => /Render failed|render failed|Rendering .* failed|Browser: download.*\n.*Error/i.test(out),
    cause: "the video render step failed",
    fa: "مرحلهٔ رندر ویدیو شکست خورد.",
    retryable: true,
  },
];

const UNKNOWN = {
  kind: "unknown",
  cause: "the attempt failed for a reason this stage does not recognise",
  fa: "علت شکست با هیچ الگوی شناخته‌شده‌ای مطابقت نداشت.",
  // Retryable once: a genuinely new failure class deserves a second data point
  // before a person is asked to look, and the no-progress rule caps it at two
  // when the same unknown error simply repeats.
  retryable: true,
};

// The single most informative line for the owner: the build script's own
// "✗ episode N (unit) failed: <reason>" when present, otherwise the first line
// that actually matched a signature. Used as the human-facing evidence AND as
// the input to the fingerprint, so "same failure twice" is decided on the real
// error text rather than on timestamps or progress bars that always differ.
export function extractEvidence(output, signature) {
  const lines = String(output || "").split("\n");
  const failed = lines.find((l) => /✗ episode \d+ .*failed:/.test(l));
  if (failed) return failed.trim().slice(0, 400);
  if (signature?.test) {
    const matched = lines.find((l) => signature.test(l));
    if (matched) return matched.trim().slice(0, 400);
  }
  const lastReal = [...lines].reverse().find((l) => l.trim() && !/^\s*[█░]/.test(l));
  return (lastReal || "").trim().slice(0, 400);
}

// Two attempts that fail the same way must be recognisable as the same failure.
// Volatile parts — timestamps, episode/attempt counters, file paths with a date,
// candidate counts — are stripped first, so "wrong «زن» → «زند»" on attempt 1
// and attempt 2 produce one fingerprint and the cycle can see it is not moving.
export function fingerprintOf(kind, evidence) {
  const stable = String(evidence || "")
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, "")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
  return `${kind}:${createHash("sha256").update(stable).digest("hex").slice(0, 12)}`;
}

/**
 * Identify what actually went wrong in one build attempt.
 *
 * @param {{exitCode?:number, output?:string}} attempt combined stdout+stderr
 * @returns {{kind:string, cause:string, fa:string, evidence:string,
 *            retryable:boolean, fingerprint:string, exitCode:number}}
 */
export function diagnose({ exitCode = 1, output = "" } = {}) {
  const signature = SIGNATURES.find((s) => s.test(output)) || UNKNOWN;
  const evidence = extractEvidence(output, signature);
  return {
    kind: signature.kind,
    cause: signature.cause,
    fa: signature.fa,
    evidence,
    retryable: signature.retryable,
    fingerprint: fingerprintOf(signature.kind, evidence),
    exitCode,
  };
}

/**
 * Should the cycle spend another attempt?
 *
 * The rule that matters most here is the second one. Episode 21 failed on the
 * identical preflight message on two separate runs (#341, #343) because the
 * remedy that produced it is deterministic — a third identical attempt was
 * never going to differ. Burning the budget on a repeat is not persistence, it
 * is noise, and it delays the moment a person sees a real, specific diagnosis.
 *
 * @param {{kind:string,fingerprint:string,retryable:boolean}} current
 * @param {Array<{fingerprint:string}>} history earlier diagnoses this cycle
 * @param {{attempt:number, maxAttempts:number}} budget
 * @returns {{again:boolean, reason:string, fa:string}}
 */
export function shouldRetry(current, history, { attempt, maxAttempts }) {
  if (!current.retryable) {
    return {
      again: false,
      reason: `not-retryable:${current.kind}`,
      fa: "این خطا با تکرار اجرا درست نمی‌شود، پس چرخه همین‌جا می‌ایستد.",
    };
  }
  if (history.some((h) => h.fingerprint === current.fingerprint)) {
    return {
      again: false,
      reason: "no-progress",
      fa: "این دقیقاً همان خطای تلاش قبلی است؛ تکرار دوبارهٔ آن نتیجهٔ تازه‌ای نمی‌دهد، پس چرخه می‌ایستد.",
    };
  }
  if (attempt >= maxAttempts) {
    return {
      again: false,
      reason: "budget-spent",
      fa: `بودجهٔ چرخه (${maxAttempts} تلاش) تمام شد.`,
    };
  }
  return { again: true, reason: `retry:${current.kind}`, fa: "علت شناسایی شد و تلاش تازه‌ای با بودجهٔ کامل بازیابی آغاز می‌شود." };
}
