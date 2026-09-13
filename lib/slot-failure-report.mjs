// What the owner is told when a slot gives up after all 6 topics.
//
// The bug this replaces, measured 2026-09-13: the alert named only the LAST
// attempt's reason and picked its advice line from that one error's `kind`.
// Reproduced offline against the real registry and the real Visual Truth Gate
// for that day's tiktok lane — six candidates, and they did NOT fail for one
// reason:
//
//   retention-graph       dedupe UNIQUE (19)   → Visual QC
//   pin-comment           dedupe DUPLICATE     → (also Visual QC)
//   view-jail             dedupe DUPLICATE
//   tiktok-pay            dedupe DUPLICATE
//   green-screen          dedupe UNIQUE (29)   → Visual QC
//   tt-story-highlights   dedupe UNIQUE (22)   → Visual QC
//
// Half the lane was UNIQUE subject matter blocked only by a missing real
// screenshot. Because the final attempt happened to be a duplicate, the owner
// was told «این موضوع اخیراً یک‌بار ساخته شده» — advice about content
// repetition — while the actually actionable request (send a screenshot for
// these specific topics) was suppressed. They cannot act on what they are not
// shown, and the two causes need opposite responses: a duplicate needs a new
// subject, a Visual QC miss needs one photo.
//
// This changes the MESSAGE only. Nothing here decides whether a pack ships:
// assertVisualProof() and the duplicate check reject exactly what they
// rejected before, and a missing photo still stops the video.

// Counts and slide numbers are Persian prose, so they take Persian digits —
// fa_lint.py flags Latin ones, and the pipeline's other owner-facing strings
// already read this way. Pack ids stay Latin on purpose: the owner has to type
// one back verbatim as a photo caption for save-user-photo.mjs to match it.
const fa = (n) => String(n).replace(/[0-9]/g, (d) => "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9"[Number(d)]);

/**
 * What a failed narration-planning step actually means, decided from the
 * child's own stderr.
 *
 * Two things forced this out of daily-render.mjs and into a tested function.
 *
 * 1. The free engine prints a benign line on EVERY unauthenticated run:
 *    "Warning: You are sending unauthenticated requests to the HF Hub. Please
 *    set a HF_TOKEN to enable higher rate limits and faster downloads."
 *    (seen verbatim in tts-probe.yml run #2, 2026-09-13). The old inline
 *    matcher looked for "rate limit" anywhere in stderr, so that warning would
 *    have made EVERY pocket-tts failure — whatever its real cause — reach the
 *    owner as «سرویس بیرونی اعتبار یا سهمیه ندارد» and send them to a billing
 *    page. The Hub note is about download speed, not authorisation.
 * 2. A line that contains English needs the free HuggingFace token, and the
 *    wrapper refuses it by design. That is neither a credit problem nor an
 *    unexplained technical error: it is one free secret away.
 *
 * @param {string} detail the child process's stderr
 * @returns {{kind: string, providerShortage?: string, missingToken?: string}}
 */
export function classifyVoiceFailure(detail) {
  const text = String(detail || "");

  // The token refusal is specific and quotes the offending span, so it wins
  // over the generic buckets below.
  const token = text.match(/^.*HF_TOKEN is not set.*$/im);
  if (token) return { kind: "missingToken", missingToken: token[0].trim().slice(0, 300) };

  // Only lines that are genuinely about an account's limits count. The Hub's
  // own unauthenticated-download note is dropped first.
  const lines = text.split(/\r?\n/).filter(
    (l) => !/unauthenticated requests to the HF Hub|higher rate limits/i.test(l),
  );
  const shortage = lines.find((l) => /insufficient credit|quota|rate limit|429/i.test(l));
  if (shortage) return { kind: "providerShortage", providerShortage: shortage.trim().slice(0, 200) };

  return { kind: "narration-planning" };
}

/**
 * @param {Array<{id: string, kind?: string, missingSlides?: Array<{n: number, text: string}>}>} failures
 *   One entry per attempt, in the order they were tried.
 * @returns {string} the advice block appended under "آخرین علت".
 */
export function summariseSlotFailure(failures) {
  const list = Array.isArray(failures) ? failures.filter(Boolean) : [];
  if (!list.length) return "خطای فنی در ساخت یا ارسال.";

  const visual = list.filter((f) => f.kind === "visualQc");
  const duplicate = list.filter((f) => f.kind === "duplicate");
  const shortage = list.filter((f) => f.kind === "providerShortage");
  const missingToken = list.filter((f) => f.kind === "missingToken");
  const other = list.filter((f) => !["visualQc", "duplicate", "providerShortage", "missingToken"].includes(f.kind));

  const parts = [];

  // First, and on its own line: a paid provider out of credit or over quota
  // stops every topic and every slot equally, and no screenshot or new subject
  // clears it. Measured 2026-09-13 — MiniMax TTS reported "insufficient
  // credit" and took 4 of that run's 12 attempts across both platforms, while
  // the alert called them generic technical errors and the owner was left
  // looking at content.
  if (shortage.length) {
    const reason = shortage.find((f) => f.providerShortage)?.providerShortage;
    parts.push(`⛔ سرویس بیرونی اعتبار یا سهمیه ندارد؛ تا شارژ نشود هیچ موضوعی ساخته نمی‌شود${reason ? `:\n${reason}` : "."}`);
  }

  // Also account-level and also nothing to do with the topic, but the remedy
  // is different and it is free: the offline voice engine speaks Persian with
  // no credentials at all, and asks for a free HuggingFace token only for the
  // spans that are written in Latin script.
  if (missingToken.length) {
    const said = missingToken.find((f) => f.missingToken)?.missingToken;
    parts.push(
      "⛔ یک خط نریشن واژهٔ انگلیسی دارد و موتور رایگان صدا برای همان بخش به یک توکن رایگان HuggingFace نیاز دارد"
      + `${said ? `:\n${said}` : "."}`
      + "\nیک توکن رایگان از huggingface.co/settings/tokens بساز و در Settings ← Secrets مخزن با نام HF_TOKEN ثبت کن. "
      + "خط‌های کاملاً فارسی به هیچ توکنی نیاز ندارند و همین حالا هم ساخته می‌شوند.",
    );
  }

  // Lead with the breakdown so a mixed run can never read as one cause.
  if (list.length > 1) {
    const counts = [
      visual.length ? `${fa(visual.length)} مورد عکس واقعی نداشت` : null,
      duplicate.length ? `${fa(duplicate.length)} مورد تکراری بود` : null,
      shortage.length ? `${fa(shortage.length)} مورد به سقف اعتبار سرویس خورد` : null,
      missingToken.length ? `${fa(missingToken.length)} مورد به توکن رایگان HuggingFace نیاز داشت` : null,
      other.length ? `${fa(other.length)} مورد خطای فنی داد` : null,
    ].filter(Boolean);
    parts.push(`از ${fa(list.length)} موضوع امتحان‌شده: ${counts.join("، ")}.`);
  }

  // The screenshot request is the only line the owner can act on immediately,
  // so it is never dropped just because a later attempt failed differently.
  if (visual.length) {
    parts.push("این موضوع‌ها فقط عکس واقعیِ همان قابلیت را کم دارند:");
    for (const f of visual) {
      const slides = (f.missingSlides || []).map((s) => `  مرحلهٔ ${fa(s.n)}: ${s.text}`).join("\n");
      parts.push(`• «${f.id}»${slides ? `\n${slides}` : ""}`);
    }
    parts.push(
      "برای هرکدام یک اسکرین‌شات واقعی از همان صفحه در اپ بگیر و همینجا به‌صورت عکس (نه فایل) بفرست؛ "
      + "کپشن عکس را دقیقاً همان شناسه بگذار. رندر بعدی خودکار از آن استفاده می‌کند.",
    );
  }

  if (duplicate.length && !visual.length) parts.push("این موضوع‌ها اخیراً ساخته شده‌اند.");
  else if (duplicate.length) parts.push(`${fa(duplicate.length)} موضوع دیگر اخیراً ساخته شده بود و به موضوع تازه نیاز دارد.`);

  if (other.length && !visual.length && !duplicate.length && !shortage.length && !missingToken.length) parts.push("خطای فنی در ساخت یا ارسال.");

  return parts.join("\n");
}
