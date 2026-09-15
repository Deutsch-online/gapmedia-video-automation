// The German A1 vocabulary lane must be judged on ITS claim, not the
// app-feature lane's.
//
// Until 2026-09-15 both lanes shared one prompt, written for app features. It
// asks whether a PAGE is about the same app/feature and tells the model to
// answer false when «تصویر احتمالاً لوگو، آیکن، عکس عمومی یا تصویرسازی است».
// For a vocabulary word an everyday photograph of ordinary people IS the right
// picture, so the lane was instructing the judge to reject precisely what it
// needed. news-scan run #342 (episode 20) measured the cost: Pexels reported
// «8 candidates examined, none passed — notRelevant:8» for all four words at
// every broadening tier, and the episode fell through every real image source
// to LAW 7 layer 6's local graphic.
//
// This proves the real judge — not a reimplementation — sends the right prompt
// for each lane, and that the vocabulary prompt still refuses what it must.
//
//   node test-vocabulary-relevance.mjs
import assert from "node:assert/strict";

// Read at module load in lib/auto-image.mjs, so it must be set before import.
process.env.GEMINI_API_KEY = "test-gemini-key";
delete process.env.GROQ_API_KEY;

const sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.includes("generativelanguage.googleapis.com")) {
    const body = JSON.parse(init.body);
    sent.push(body.contents[0].parts[0].text);
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"relevant": true, "reason": "ok"}' }] } }] }) };
  }
  throw new Error(`unexpected fetch in test: ${u}`);
};

const { judgeRelevance } = await import("./lib/auto-image.mjs");

const candidate = {
  title: "Two women greeting each other with a hug in a park",
  url: "https://www.pexels.com/photo/123456/",
  snippet: "Two women greeting each other with a hug in a park",
};

try {
  // The vocabulary lane.
  const vocab = await judgeRelevance("two friends waving hello outdoors", ["سلام (غیررسمی)"], candidate, { lane: "vocabulary" });
  assert.equal(vocab.relevant, true);
  assert.equal(vocab.judged, true);
  const vocabPrompt = sent.at(-1);

  assert.match(vocabPrompt, /واژهٔ آموزش زبان آلمانی/,
    "the vocabulary judge must be told it is judging a vocabulary slide");
  assert.match(vocabPrompt, /«عکس استوک بودن» به‌تنهایی دلیل رد نیست/,
    "the one sentence the whole fix turns on: an ordinary photo is not grounds for refusal here");
  assert.match(vocabPrompt, /two friends waving hello outdoors/, "the concept searched for must reach the judge");
  assert.match(vocabPrompt, /سلام \(غیررسمی\)/, "the Persian meaning must reach the judge");
  assert.doesNotMatch(vocabPrompt, /اپ\/قابلیت/,
    "the vocabulary lane must never be asked the app-feature question");
  assert.doesNotMatch(vocabPrompt, /عکس عمومی/,
    "«generic photo» must not be a rejection rule for a lane whose correct answer is an ordinary photo");

  // The bar this prompt still holds. A vocabulary slide must show the thing
  // the word means — these four refusals are what keeps that true, and losing
  // any of them would turn this fix into a weakened gate.
  for (const rule of [/نقاشی، کارتون، آیکن/, /لوگو، اسکرین‌شات، نمودار/, /موضوع دیگری است/, /آن مفهوم در آن دیده نمی‌شود/]) {
    assert.match(vocabPrompt, rule, `the vocabulary prompt must keep refusing: ${rule}`);
  }

  // The app-feature lane, unchanged — including the default with no options,
  // which is how every existing caller still reaches it.
  for (const opts of [undefined, { lane: "feature" }]) {
    await judgeRelevance("TikTok Green Screen", ["ویدیوی خودت را پس‌زمینه کن"], candidate, opts);
    const featurePrompt = sent.at(-1);
    assert.match(featurePrompt, /آیا این صفحه دربارهٔ همان اپ\/قابلیتی است/,
      "the app-feature lane must keep its own question");
    assert.match(featurePrompt, /تصویر احتمالاً لوگو، آیکن، عکس عمومی یا تصویرسازی است/,
      "the app lane's own rejection rules must be untouched by the vocabulary fix");
    assert.doesNotMatch(featurePrompt, /واژهٔ آموزش زبان آلمانی/,
      "the vocabulary prompt must never leak into the app-feature lane");
  }

  // Two lanes asking about the same candidate must not share one cached
  // verdict — the cache is keyed on the prompt, and these are different
  // questions with legitimately different answers.
  assert.notEqual(
    sent.find((p) => /واژهٔ آموزش زبان آلمانی/.test(p)),
    sent.find((p) => /اپ\/قابلیت/.test(p)),
    "the two lanes must produce genuinely different prompts, so neither can reuse the other's verdict",
  );

  console.log("ok   each lane is judged on its own claim, and the vocabulary bar still refuses what it must");
} finally {
  globalThis.fetch = realFetch;
}

// An unjudgeable candidate is still rejected — "couldn't judge" must never
// become "relevant" in either lane, whatever the prompt says.
{
  globalThis.fetch = async () => { throw new Error("Gemini 429"); };
  try {
    const { judgeRelevance: judge } = await import("./lib/auto-image.mjs");
    const verdict = await judge("two friends waving hello outdoors", ["سلام"], { ...candidate, url: "https://www.pexels.com/photo/999/" }, { lane: "vocabulary" });
    assert.equal(verdict.relevant, false, "a judge outage must keep failing closed in the vocabulary lane too");
    assert.equal(verdict.judged, false, "and it must still be distinguishable from a real 'not relevant' verdict");
  } finally {
    globalThis.fetch = realFetch;
  }
  console.log("ok   a judge outage still fails closed — the vocabulary lane did not become permissive");
}
