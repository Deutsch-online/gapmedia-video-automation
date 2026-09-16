// The shared production cycle: run an attempt, diagnose a failure, decide
// whether another attempt is honest, and never let anything reach the channel
// before a real success.
//
// Extracted from german-cycle.mjs on 2026-09-16, unchanged, when the owner
// asked for the same shape on the income pipeline
// («خطاها را بررسی کن و مثل آموزش آلمانی بساز، به بخش دیاگنوز ببر»). Two
// copies of a loop that decides whether production keeps trying would drift,
// and only one of them would have the run #345 deadline lesson baked in.
//
// It knows nothing about German lessons, daily videos, Telegram or the
// filesystem: the caller injects runAttempt() and reads the result. That is
// what makes it testable without rendering a video.
import { diagnose, shouldRetry } from "./diagnose.mjs";

/**
 * The cycle itself, with the attempt runner injected.
 *
 * Kept separate from the process/Telegram/filesystem body below — the same
 * split lib/recovery-chain.mjs uses for decide() — so the loop that decides
 * whether the pipeline keeps trying can be tested without rendering a video
 * or sending anything. That loop is the whole point of this file; leaving it
 * only reachable through a 12-minute build would mean never testing it.
 *
 * @param {{runAttempt:(n:number)=>Promise<{exitCode:number,output:string}>,
 *          maxAttempts:number, onDiagnosis?:Function}} opts
 * @returns {Promise<{outcome:"success"|"failed", attempts:number,
 *                    diagnoses:object[], stopped:string|null}>}
 */
export async function runCycle({ runAttempt, maxAttempts, onDiagnosis, deadlineAt = null, now = () => Date.now() }) {
  const diagnoses = [];
  let lastDuration = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startedAt = now();
    const result = await runAttempt(attempt);
    lastDuration = now() - startedAt;
    // Success is the ONLY path that lets anything reach the channel, and the
    // build script owns that send — it happens after every gate has passed.
    if (result.exitCode === 0) {
      return { outcome: "success", attempts: attempt, diagnoses, stopped: null };
    }
    const d = diagnose(result);
    let verdict = shouldRetry(d, diagnoses, { attempt, maxAttempts });
    // Never START an attempt that cannot finish.
    //
    // Run #345 is why this exists. The job carries timeout-minutes, and a
    // timed-out job is killed outright: GitHub reports it as "cancelled", the
    // final report is never written, and the diagnosis never reaches the
    // owner — which defeats the entire point of the cycle. #345 was killed at
    // exactly 30m15s into a 30-minute job, mid-attempt, having said nothing.
    //
    // The estimate is the duration of the attempt that just ran, not a
    // hardcoded guess: attempts on this pipeline vary from ~12 to ~16 minutes
    // depending on how much recovery each one does, and the run itself is the
    // only honest source for that number.
    if (verdict.again && deadlineAt && now() + lastDuration > deadlineAt) {
      const left = Math.max(0, Math.round((deadlineAt - now()) / 60000));
      verdict = {
        again: false,
        reason: "deadline",
        fa: `تلاش بعدی حدود ${Math.round(lastDuration / 60000)} دقیقه طول می‌کشد و فقط ${left} دقیقه تا سقف زمانی این اجرا مانده است. چرخه به‌جای این‌که وسط کار کشته شود و هیچ گزارشی ندهد، همین‌جا تمیز می‌ایستد و تشخیص را می‌فرستد.`,
      };
    }
    diagnoses.push({ attempt, ...d, decision: verdict.reason });
    await onDiagnosis?.({ attempt, diagnosis: d, verdict });
    if (!verdict.again) {
      return { outcome: "failed", attempts: attempt, diagnoses, stopped: verdict.reason, verdict };
    }
  }
  return { outcome: "failed", attempts: maxAttempts, diagnoses, stopped: "budget-spent" };
}
