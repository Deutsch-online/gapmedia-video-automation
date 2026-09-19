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

// Markers of colloquial written Persian (محاوره‌نویسی). Taken from the
// persian-writing skill's references/writing-style.md §"Colloquial written
// Persian" — the project's own reference for register — rather than invented
// here, and deliberately narrow: only forms that cannot be anything BUT
// colloquial. «رو» (را) is excluded on purpose because it is also an ordinary
// formal word («رو به جلو»), and a false positive here stops a build that
// would have succeeded.
//
// Two traps, both hit while writing this:
//
//   · \b does not work here. JavaScript defines it over [A-Za-z0-9_], so a
//     Persian letter is a non-word character and «داره» followed by a space
//     has no \b between them — every \b-delimited pattern silently matched
//     nothing. Persian word edges are expressed with lookarounds on the
//     Arabic block instead.
//   · ـتون and ـمون are NOT usable as markers. Ordinary formal words end in
//     those letters — آزمون، مضمون، پیرامون، کارتون — and flagging them would
//     stop a build over a perfectly good reword. Only ـشون is kept, which has
//     no common formal counterpart.
const FA = "؀-ۿ";
const edge = (body) => new RegExp(`(?<![${FA}])(?:${body})(?![${FA}])`);
const COLLOQUIAL_MARKERS = [
  // ـشان → ـشون, attached to a real word («مذکرشون»)
  new RegExp(`[${FA}]{2,}شون(?![${FA}])`),
  // است/دارد/می‌شود/می‌روم… in their spoken contractions
  edge("میشه|نمیشه|میشد|میره|میرن|میخوام|می‌خوام|میدونم|نمیدونم|بذار|بریم|هستش"),
  edge("داره|نداره|میاد|نمیاد"),
  // آن/این → اون/اینا
  edge("اون|اونا|اونه|اینا"),
  // particles that only exist in speech
  edge("دیگه|مگه|چیه|کیه"),
];

// The Recovery Engine prints its rewrites as a labelled before/after pair.
// Parsing it is what lets this stage compare the two rather than judge the
// register of a line in isolation — «this reword INTRODUCED colloquial forms»
// is a far safer claim than «this line looks colloquial».
export function extractReword(output) {
  const before = String(output || "").match(/^\s*before:\s*(.+)$/m);
  const after = String(output || "").match(/^\s*after:\s*(.+)$/m);
  if (!before || !after) return null;
  return { before: before[1].trim(), after: after[1].trim() };
}

const isColloquial = (text) => COLLOQUIAL_MARKERS.some((m) => m.test(String(text || "")));

/**
 * Did an automatic reword drag a formal lesson line into محاوره?
 *
 * Measured on news-scan run #344 (episode 21, a1-21-professions). The Recovery
 * Engine rewrote
 *   «این کلمه‌ها یعنی معلم؛ برای مرد و زن جدا است.»
 * into
 *   «این کلمه‌ها یعنی معلم؛ شکل مؤنث و مذکرشون با هم فرق داره!»
 * — «مذکرشون» and «فرق داره!» are both colloquial, in a series that is formal
 * throughout. The skill's own consistency rule is explicit: pick a register and
 * hold it. So this is a content defect in its own right, separate from the fact
 * that the new text was then rejected by the narration gate anyway.
 */
export function rewordBrokeRegister(output) {
  const pair = extractReword(output);
  if (!pair) return null;
  if (!isColloquial(pair.after) || isColloquial(pair.before)) return null;
  return pair;
}

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
    kind: "telegram-rejected",
    // lib/telegram.mjs's send* helpers, which throw
    // «Telegram sendVideo failed (403): Forbidden: ...» when the API rejects
    // the delivery itself. Distinct from "config" above, which is the case
    // where the secrets are absent: here they are present and Telegram still
    // refuses the destination, so the build is fine and only delivery is not.
    //
    // Run #109 (2026-09-19) had no rule for this, so a 403 fell through to
    // "visual-proof" — because the same log also carries the image layer's
    // own wording — and the owner was sent to look at the Visual Truth Gate
    // for a chat-id problem. It is placed above the image rules so the
    // terminal delivery failure wins over anything earlier in the log.
    //
    // 4xx only, and never retryable: a rejected destination rejects the next
    // attempt identically, and retrying cost three full renders per run. A 5xx
    // is deliberately left out, so a genuine Telegram outage stays retryable.
    test: (out) => /Telegram \w+ failed \(4\d\d\)/.test(out),
    cause: "Telegram accepted the credentials but refused the destination, so a finished video could not be delivered",
    fa: "تلگرام مقصد را نپذیرفت، پس ویدیوی آماده تحویل داده نشد. این خطای تنظیمات است نه خطای ساخت: TELEGRAM_CHAT_ID باید شناسهٔ عددی خودتان یا @نام_کانال باشد، نه شناسهٔ ربات. «node get-chat-id.mjs» مقدار درست را نشان می‌دهد. تکرار اجرا آن را درست نمی‌کند.",
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
    kind: "narration-register-break",
    // Ordered above the two failures below on purpose: when a reword both
    // breaks register AND fails the gate, the register break is the root
    // defect and the one the owner has to decide on. Retrying cannot help —
    // the reword machinery is deterministic, so another attempt re-proposes
    // the same colloquial line.
    test: (out) => rewordBrokeRegister(out) !== null,
    // The offending sentence itself, not the generic "episode failed" line:
    // it is what the owner needs to read, and it keeps two different bad
    // rewords from collapsing into one fingerprint.
    evidence: (out) => `reword → ${rewordBrokeRegister(out)?.after || ""}`,
    detail: (out) => rewordBrokeRegister(out),
    cause: "an automatic reword rewrote a formal lesson line into colloquial Persian",
    fa: "بازنویسی خودکار، جملهٔ رسمی درس را به محاوره تبدیل کرد. کل این سری رسمی است، پس این متن حتی اگر از گیت رد می‌شد هم نباید منتشر می‌شد. جمله باید دستی و با لحن رسمی بازنویسی شود.",
    retryable: false,
  },
  {
    kind: "narration-reword-exhausted",
    // The Recovery Engine saying, in its own words, that it has no strategy
    // left — distinct from "a take kept failing". Run #344: «no valid reword
    // found for «مذکرشون، زن، شغل» ... recovery strategy space exhausted».
    // Another cycle attempt re-runs the same deterministic search and reaches
    // the same end, so this stops here. Nothing is lost by that: the
    // cross-run chain (lib/recovery-chain.mjs) still runs as the workflow's
    // failure() step and still owns the "try a whole fresh run" decision
    // under its own bounded budget.
    test: (out) => /no valid reword found for|recovery strategy space exhausted/.test(out),
    cause: "the Recovery Engine has no rewording strategy left to propose",
    fa: "موتور بازیابی اعلام کرد هیچ بازنویسی معتبری برایش باقی نمانده است. هیچ تلاش خودکار دیگری این را حل نمی‌کند؛ جمله در lib/narration.mjs باید دستی بازنویسی شود.",
    retryable: false,
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
    kind: "attempt-timeout",
    // daily-cycle.mjs kills a render that has run past its per-attempt
    // ceiling. Measured on daily.yml run #280 (2026-09-16): BOTH slots were
    // killed at exactly 32m00s — tiktok 09:13:09→09:45:09, instagram
    // 09:45:09→10:17:09 — by the per-slot `timeout` in the workflow's bash,
    // which reports nothing at all. A killed attempt that says why is worth
    // more than a silent one, so the cycle owns the kill and names it.
    test: (out) => /attempt exceeded its \d+-minute ceiling|attempt-timeout/.test(out),
    cause: "the attempt ran past its per-attempt time ceiling and was stopped",
    fa: "این تلاش از سقف زمانی خودش گذشت و متوقف شد. معمولاً یعنی منابع تصویر کند یا از دسترس خارج‌اند و حلقهٔ تلاش مجدد وقت را می‌سوزاند.",
    retryable: true,
  },
  {
    kind: "image-generator-down",
    // LAW 7 layer 4. Pollinations answers 500 wrapping its own upstream 429
    // when the free flux backend is over quota — the exact shape daily.yml
    // run #280 hit on every slide of every topic: «Pollinations 500 —
    // {"error":"Internal Server Error","message":"Gen Sana request failed
    // with 429..."}». Ordered ABOVE visual-proof because when both appear the
    // generator outage is the cause and the gate refusal is its effect: it is
    // the difference between "no real photo exists for this topic" (an
    // editorial problem) and "the free generator is rate-limited right now"
    // (an outage that passes).
    test: (out) => /Pollinations \d{3} —|Gen Sana request failed with 429/.test(out),
    cause: "the free AI image generator refused every request in this attempt",
    fa: "تولیدکنندهٔ رایگان تصویر (Pollinations) در این تلاش همهٔ درخواست‌ها را رد کرد — سهمیهٔ سرویس بالادستی پر است. این خطای بیرونی است، نه باگ؛ با گذشت زمان برمی‌گردد.",
    retryable: true,
  },
  {
    kind: "search-index-down",
    // lib/web-search.mjs reporting that no keyless index answered at all —
    // run #280: «no keyless index answered — tried duckduckgo(fetch failed),
    // duckduckgo-html(fetch failed), mojeek(cooling)». Distinct from "the
    // indexes answered and nothing was relevant", which is an editorial
    // result, not an outage.
    test: (out) => /no keyless index answered/.test(out),
    cause: "no keyless search index answered, so the real-photo layers had nothing to judge",
    fa: "هیچ‌کدام از موتورهای جست‌وجوی بی‌کلید پاسخ ندادند، پس لایه‌های عکس واقعی چیزی برای داوری نداشتند. خطای بیرونی است.",
    retryable: true,
  },
  {
    kind: "visual-proof",
    // lib/visual-proof.mjs's assertVisualProof. Image sources are rate-limited
    // and quota-bound (Exa 402, Gemini/Groq 429 on runs #340/#342), so a later
    // attempt genuinely can succeed where this one could not.
    // The daily (income) pipeline states the same refusal in its own words —
    // «منبع رسمی/معتبر برای قابلیت ثبت‌نشده — تصویر واقعی همچنان الزامی است»
    // and «تصویر اسلاید N در <id> برای قاب عمودی باکیفیت کافی ندارد» — neither
    // of which the German-only patterns matched, so run #280's real blocker
    // came back as "unknown". Same gate, same diagnosis.
    test: (out) => /تصویر واقعیِ همان قابلیت ندارد|assertVisualProof|هیچ عکس واقعی و مرتبطی|تصویر واقعی همچنان الزامی است|برای قاب عمودی باکیفیت کافی ندارد/.test(out),
    cause: "no image passed the Visual Truth Gate for at least one slide",
    fa: "برای دست‌کم یک اسلاید هیچ تصویری از گیت تصویر واقعی رد نشد.",
    retryable: true,
  },
  {
    kind: "slot-exhausted",
    // daily-render.mjs giving up on one delivery format after trying every
    // remaining topic — «✗ tiktok (retention-graph) failed after 6 attempts,
    // no more topics to try». Below visual-proof on purpose: when the log
    // also carries a gate refusal, THAT is the reason the topics ran out.
    // This signature is for the case where the slot exhausted itself for
    // some other mix of reasons and the summary line is all there is.
    test: (out) => /failed after \d+ attempts?, no more topics to try|did not complete\. Its sibling format/.test(out),
    cause: "one delivery format tried every available topic and none produced a shippable video",
    fa: "این قالب انتشار همهٔ موضوع‌های موجود را امتحان کرد و هیچ‌کدام ویدیوی قابل‌انتشار نداد.",
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
  // A signature may name its own evidence when the generic "episode failed"
  // line is the less useful of the two — a register break, for instance, is
  // about the sentence that was written, not about the episode stopping.
  if (typeof signature?.evidence === "function") {
    const own = signature.evidence(output);
    if (own) return String(own).trim().slice(0, 400);
  }
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
    // Structured extras a signature chose to carry — currently the reword
    // pair, so the final report can show the owner exactly what was rewritten
    // into what instead of making them open the job log.
    detail: typeof signature.detail === "function" ? signature.detail(output) : null,
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
