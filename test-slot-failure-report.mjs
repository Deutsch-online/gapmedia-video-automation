import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summariseSlotFailure, classifyVoiceFailure } from "./lib/slot-failure-report.mjs";

// The exact production run this exists for. Reproduced offline on 2026-09-13
// against the real registry and the real Visual Truth Gate for that day's
// tiktok lane: three UNIQUE subjects blocked only by a missing real
// screenshot, three genuine duplicates. Because the LAST attempt was a
// duplicate, the old alert told the owner «این موضوع اخیراً یک‌بار ساخته شده»
// and said nothing about the three topics one photo each would have unblocked.
{
  const real = [
    { id: "retention-graph", kind: "visualQc", missingSlides: [{ n: 1, text: "نمودار نگهداشت را باز کن" }] },
    { id: "pin-comment", kind: "duplicate" },
    { id: "view-jail", kind: "duplicate" },
    { id: "tiktok-pay", kind: "duplicate" },
    { id: "green-screen", kind: "visualQc", missingSlides: [{ n: 1, text: "افکت پرده سبز" }] },
    { id: "tt-story-highlights", kind: "visualQc", missingSlides: [{ n: 2, text: "هایلایت استوری" }] },
  ];
  const out = summariseSlotFailure(real);

  assert.match(out, /از ۶ موضوع امتحان‌شده|از 6 موضوع امتحان‌شده/, "a mixed run must lead with the breakdown, never with one cause");
  assert.match(out, /۳ مورد عکس واقعی نداشت|3 مورد عکس واقعی نداشت/);
  assert.match(out, /۳ مورد تکراری بود|3 مورد تکراری بود/);

  // The actionable half must survive a last attempt that failed differently.
  for (const id of ["retention-graph", "green-screen", "tt-story-highlights"]) {
    assert.ok(out.includes(id), `«${id}» is fixable with one screenshot and must be named`);
  }
  assert.match(out, /اسکرین‌شات/, "the screenshot instruction must not be suppressed by a trailing duplicate");
  assert.match(out, /مرحلهٔ ۱: نمودار نگهداشت را باز کن/, "the specific missing slide must be named, not just the pack");

  // A duplicate is a different ask and must not be dressed up as a photo request.
  assert.ok(!out.includes("view-jail"), "a duplicate needs a new subject, not a screenshot — naming it under the photo request would mislead");
}

// A lane that really is exhausted must still read as exhausted, with no
// screenshot request invented for it.
{
  const out = summariseSlotFailure([
    { id: "a", kind: "duplicate" },
    { id: "b", kind: "duplicate" },
  ]);
  assert.match(out, /اخیراً ساخته شده/);
  assert.ok(!out.includes("اسکرین‌شات"), "nothing here is fixable with a photo — do not ask for one");
}

// A single visual-QC failure keeps the original, already-correct behaviour.
{
  const out = summariseSlotFailure([
    { id: "reply-video", kind: "visualQc", missingSlides: [{ n: 3, text: "ویدیوی پاسخ" }] },
  ]);
  assert.match(out, /reply-video/);
  assert.match(out, /مرحلهٔ ۳: ویدیوی پاسخ/);
  assert.ok(!out.includes("از ۱ موضوع"), "a single attempt needs no breakdown line");
}

// Degenerate input must never crash the alert path — a slot that cannot even
// report why it failed still has to reach the owner.
assert.equal(typeof summariseSlotFailure([]), "string");
assert.equal(typeof summariseSlotFailure(null), "string");
assert.equal(typeof summariseSlotFailure([{ id: "x", kind: "visualQc" }]), "string");

// This module decides wording only. If it ever starts deciding whether a pack
// may ship, the Visual Truth Gate has been routed around.
{
  // Checked against CODE, not prose: this module's own header names
  // assertVisualProof when explaining what it must not do, and a naive grep
  // over the whole file would match that comment and "pass" for the wrong
  // reason. Strip comments first, then assert the real property — a pure
  // string builder imports nothing, so it cannot reach the gate, the
  // registry or Telegram even by accident.
  const code = readFileSync("lib/slot-failure-report.mjs", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/^\s*import\s/m.test(code), "the report module must stay dependency-free — it decides wording, never whether a pack ships");
  assert.ok(!/assertVisualProof|register\(|sendVideo/.test(code), "the report module must not touch the gate, the registry or delivery");
}

console.log("ok   a slot's give-up alert reports every attempt's cause, so a fixable missing photo is never hidden by a trailing duplicate");

// The real daily.yml run #224 (2026-09-13). Twelve attempts across both
// platforms, and FOUR of them died inside music/plan-voice.mjs with the
// provider's own words underneath: "MiniMax TTS failed: insufficient credit."
// That is an account-level stop — every remaining topic hits the identical
// wall and neither a screenshot nor a fresh subject clears it — but the alert
// reported only «تکراری» from the final attempt, so the owner was sent to
// think about content while the actual blocker was a billing page.
{
  const out = summariseSlotFailure([
    { id: "tiktok-pay", kind: "duplicate" },
    { id: "green-screen", kind: "providerShortage", providerShortage: "MiniMax TTS failed: insufficient credit. Please purchase top-up credits" },
    { id: "tt-story-highlights", kind: "visualQc", missingSlides: [{ n: 4, text: "هایلایت استوری" }] },
    { id: "tt-ai-dubbing", kind: "visualQc", missingSlides: [{ n: 1, text: "دوبله هوش مصنوعی" }] },
    { id: "tiktok-first-seconds-signal", kind: "providerShortage", providerShortage: "MiniMax TTS failed: insufficient credit. Please purchase top-up credits" },
    { id: "search-insights-real-ui", kind: "duplicate" },
  ]);

  // The account-level stop outranks everything and must lead.
  assert.match(out.split("\n")[0], /اعتبار یا سهمیه/, "a provider that is out of credit blocks every topic — it cannot be buried under content advice");
  assert.match(out, /insufficient credit/, "the provider's own words must reach the owner, not a paraphrase");
  assert.match(out, /۲ مورد به سقف اعتبار سرویس خورد/);

  // The other causes still have to survive alongside it.
  assert.match(out, /۲ مورد عکس واقعی نداشت/);
  assert.match(out, /۲ مورد تکراری بود/);
  assert.ok(out.includes("tt-story-highlights") && out.includes("tt-ai-dubbing"), "the screenshot-fixable topics are still named");

  // A credit failure is not a technical error and must not be filed as one.
  assert.ok(!out.includes("خطای فنی"), "a known account-level stop must never be reported as an unexplained technical error");
}

// A shortage with no captured detail still has to say what kind of problem it
// is — the classification, not the text, is what makes it actionable.
{
  const out = summariseSlotFailure([{ id: "a", kind: "providerShortage" }]);
  assert.match(out, /اعتبار یا سهمیه/);
}

console.log("ok   an out-of-credit provider leads the alert with its own words — no screenshot or new subject can clear it");

// The free engine's own benign note, quoted verbatim from tts-probe.yml run #2
// (2026-09-13, 13:45:35): it is printed on EVERY unauthenticated run, and it is
// about download speed, not about an account limit. The old inline matcher in
// daily-render.mjs searched the whole stderr for "rate limit", so this line
// alone would have re-labelled every pocket-tts failure — whatever its real
// cause — as «سرویس بیرونی اعتبار یا سهمیه ندارد» and sent the owner to a
// billing page for a free, unbilled engine.
{
  const benign = [
    "Warning: You are sending unauthenticated requests to the HF Hub. Please set a HF_TOKEN to enable higher rate limits and faster downloads.",
    "pocket-tts: ffmpeg exited 1",
  ].join("\n");
  assert.equal(classifyVoiceFailure(benign).kind, "narration-planning",
    "the Hub's download-speed note is not an account limit and must never be reported as one");

  // A real one still classifies, with its own words.
  const real = classifyVoiceFailure([
    "Warning: You are sending unauthenticated requests to the HF Hub. Please set a HF_TOKEN to enable higher rate limits and faster downloads.",
    "MiniMax TTS failed: insufficient credit. Please purchase top-up credits",
  ].join("\n"));
  assert.equal(real.kind, "providerShortage");
  assert.match(real.providerShortage, /insufficient credit/);
}

// The wrapper's real refusal, quoted verbatim from the same run. Only 1 of the
// 170 curated narration lines in lib/narration.mjs contains Latin text, but the
// news and Telegram-custom paths speak text that was not hand-checked, and 30%
// of the feature banks' written strings do. This must reach the owner as the
// one free action that clears it — not as an unexplained technical error, and
// not as a credit problem for an engine that is never billed.
{
  const refusal = "HF_TOKEN is not set, and this line contains English: «Second Space». The English half needs the token once, to fetch the gated kyutai/pocket-tts voice-cloning weights. A line with no Latin text needs no token at all.";
  const v = classifyVoiceFailure(refusal);
  assert.equal(v.kind, "missingToken");
  assert.match(v.missingToken, /Second Space/, "the offending span must survive into the alert");

  const out = summariseSlotFailure([{ id: "custom-1", kind: "missingToken", missingToken: v.missingToken }]);
  assert.match(out, /HuggingFace/);
  assert.match(out, /HF_TOKEN/, "the owner must be told the exact secret name to create");
  assert.match(out, /Second Space/);
  assert.ok(!out.includes("خطای فنی"), "a one-secret fix must not be filed as an unexplained technical error");
  assert.ok(!out.includes("اعتبار یا سهمیه"), "the free engine is never billed — do not send the owner to a billing page");
}

// It survives alongside the other causes in a mixed run, with its own count.
{
  const out = summariseSlotFailure([
    { id: "a", kind: "missingToken", missingToken: "HF_TOKEN is not set, and this line contains English: «Collab»." },
    { id: "b", kind: "duplicate" },
    { id: "c", kind: "visualQc", missingSlides: [{ n: 2, text: "هایلایت استوری" }] },
  ]);
  assert.match(out, /۱ مورد به توکن رایگان HuggingFace نیاز داشت/);
  assert.match(out, /۱ مورد تکراری بود/);
  assert.match(out, /اسکرین‌شات/);
}

// Degenerate input must not crash the alert path.
assert.equal(classifyVoiceFailure("").kind, "narration-planning");
assert.equal(classifyVoiceFailure(null).kind, "narration-planning");

console.log("ok   a missing free token is reported as one free action, and the engine's own download-speed note is never mistaken for a billing problem");
