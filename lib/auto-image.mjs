// Finds one real, relevant image for a topic that arrived as plain text with
// no attached photo/video and no hand-mapped preset (custom-content.mjs's
// `visualPreset`). Rule 15 removed the "wait for approval" step that used to
// let a human eyeball fetch-screens.mjs's candidates before one was wired in
// — this does the same search-and-verify job without a human in the loop, so
// a bare "این متن را ویدیو کن" doesn't have to be rejected just because no
// picture was attached to the same message.
//
// Two independent checks gate a candidate before it is trusted:
//   1. mechanical — a real image file (media-guard.mjs), 1080px/700k-pixel
//      floor, same bar every other real asset in this project already meets.
//   2. relevance — an LLM reads the topic against the candidate's own page
//      title/URL/snippet and says whether it plausibly documents the same
//      thing. This is the check fetch-screens.mjs used to leave to a human,
//      because a real, officially-published image can still be completely
//      unrelated (its own comment: an "Edits sound separation" search once
//      resolved to an Android promo photo of someone's face).
// A candidate must pass both before it is used; the first one that does wins.
//
// A REAL search always runs first for every slide. generateAIImage() below
// is a distinct, clearly-labelled (sourceType "ai-generated") fallback for
// when that real search genuinely finds nothing — owner decision 2026-09-11,
// which formally amended PROJECT_RULES.md rule 39/41 (see that file's
// "پیوست دوم" and this function's own comment) after the same request was
// first declined. Never used to avoid searching, and never mislabeled as a
// real photo — assertVisualProof()/visualEvidence keep the two distinguishable
// downstream even though a viewer sees no visible difference.
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { imageType, imageSize } from "./media-guard.mjs";
import { segment } from "./tts-segments.mjs";
import { webImageHits } from "./web-search.mjs";
import { fullSizeVariants } from "./image-upsize.mjs";
import { jevConfigured, jevVocabularyVerdict } from "./jev.mjs";

const EXA_KEY = process.env.EXA_API_KEY || "";
// Exa is the one PAID index in LAW 7 (layer 3). Owner directive 2026-09-16:
// keep it — the key stays registered, none of its code is removed — but make
// it OPT-IN, so the default build costs nothing. Both switches must be on: the
// flag says "I want to spend", the key says "I can". Everything else this file
// reaches (Pexels, Wikimedia, DuckDuckGo/web-search, Pollinations, our own
// assets, the local SVG) is keyless or free-tier, so unset means $0, not
// degraded — layer 3 is a second real-photo index, never the only one.
const ENABLE_EXA = process.env.ENABLE_EXA === "true";
const HAS_EXA_KEY = Boolean(EXA_KEY);
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

// None of this file's fetch() calls had a timeout — confirmed live
// 2026-09-12: a single stuck request (no response, no error, just silence)
// blocked the whole pre-scan round for 16+ minutes, blowing past
// daily-render.mjs's own 8-minute pre-scan budget, because that budget is
// only checked between rounds, not inside one. rescuePackPhotos() can chain
// several of these calls per missing slide (search, image download,
// relevance check) and up to 4 slides per pack, so one hung call anywhere
// in that chain stalls the whole thing. Every existing caller already
// wraps these in try/catch, so an aborted request is handled exactly like
// any other failed request — no new error handling needed, just a ceiling
// on how long a single one can take.
const FETCH_TIMEOUT_MS = 20_000;
// Image generation (unlike a search or a short relevance judgement) is
// legitimately slower — a 20s cap there would abort normal, still-working
// requests, not just stuck ones.
const IMAGE_GEN_TIMEOUT_MS = 45_000;
const withTimeout = (init = {}, ms = FETCH_TIMEOUT_MS) => ({ ...init, signal: AbortSignal.timeout(ms) });

// Exa is the one PAID index in LAW 7 (layer 3). Every other source in this
// file — Pexels, Wikimedia, DuckDuckGo/web-search, Pollinations — is keyless
// or free-tier, so the project runs at no cost with EXA_API_KEY simply unset.
// findRealImage() has always guarded its own call site with `if (EXA_KEY)`
// and falls through to the keyless indexes; lib/lesson-image.mjs did not, and
// spent a doomed round trip per vocabulary word that came back «Exa 401»,
// which reads in a build log exactly like a paid key that broke rather than a
// key that was never meant to be there. The guard lives in the function too,
// so no future caller can reintroduce that.
let exaModeAnnounced = false;
export function exaConfigured() {
  const on = ENABLE_EXA && HAS_EXA_KEY;
  // Announced once per process, not per call: findLessonImage() asks up to
  // three times per vocabulary word, four words per episode, and a line
  // repeated twelve times is noise a real diagnostic then hides behind.
  if (!exaModeAnnounced) {
    exaModeAnnounced = true;
    console.error(on
      ? "   ℹ [image] Exa layer ENABLED — paid index in use (ENABLE_EXA=true with a key)"
      : `   ℹ [image] Exa layer SKIPPED — $0 mode (${HAS_EXA_KEY ? "key registered; set ENABLE_EXA=true to use it" : "no EXA_API_KEY set"})`);
  }
  return on;
}

export async function exaSearch(query) {
  if (!ENABLE_EXA || !HAS_EXA_KEY) throw new Error(`Exa is off (${HAS_EXA_KEY ? "ENABLE_EXA is not \"true\"" : "EXA_API_KEY unset"})`);
  const res = await fetch("https://api.exa.ai/search", withTimeout({
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": EXA_KEY },
    body: JSON.stringify({
      query, numResults: 8, type: "auto",
      contents: { text: { maxCharacters: 300 } },
    }),
  }));
  if (!res.ok) throw new Error(`Exa ${res.status}`);
  const seen = new Set();
  return ((await res.json()).results || [])
    .filter((r) => r.image && !seen.has(r.image) && seen.add(r.image));
}

// Two catalogue searches that need neither an account nor a paid API key.
// They are deliberately limited to public-domain/CC0 material: a result is
// useful only when the project can lawfully republish it.  They are not stock
// photo sources and still pass through the same download, dimension and
// relevance checks as every other candidate below.
export const FREE_CATALOGUE_IMAGE_SOURCES = ["wikimedia-commons", "openverse"];

function reusableLicense(value) {
  const license = String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  return license === "cc0" || license === "pdm" || /public domain/.test(license) || /cc public domain/.test(license);
}

function catalogueHit(provider, image, url, title, text) {
  if (!/^https?:\/\//i.test(String(image || ""))) return null;
  return { provider, image, url: url || image, title: String(title || "").slice(0, 180), text: String(text || "").slice(0, 360) };
}

export async function wikimediaCommonsImageHits(query) {
  const params = new URLSearchParams({
    action: "query", format: "json", generator: "search", gsrsearch: query,
    gsrnamespace: "6", gsrlimit: "6", prop: "imageinfo",
    iiprop: "url|size|extmetadata", iiurlwidth: "1440", origin: "*",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, withTimeout());
  if (!res.ok) throw new Error(`Wikimedia Commons ${res.status}`);
  const pages = Object.values((await res.json())?.query?.pages || {});
  return pages.flatMap((page) => {
    const info = page?.imageinfo?.[0];
    const meta = info?.extmetadata || {};
    const license = meta.LicenseShortName?.value || meta.UsageTerms?.value || "";
    if (!info || !reusableLicense(license)) return [];
    const source = `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || "")}`;
    const hit = catalogueHit("wikimedia-commons", info.thumburl || info.url, source, page.title, `${meta.ImageDescription?.value || ""} · ${license}`);
    return hit ? [hit] : [];
  });
}

export async function openverseImageHits(query) {
  const params = new URLSearchParams({ q: query, page_size: "6", license: "cc0,pdm" });
  const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, withTimeout());
  if (!res.ok) throw new Error(`Openverse ${res.status}`);
  return ((await res.json())?.results || []).flatMap((item) => {
    if (!reusableLicense(item.license)) return [];
    const hit = catalogueHit(
      "openverse",
      item.url || item.thumbnail,
      item.foreign_landing_url || item.detail_url || item.url,
      item.title,
      `${item.creator || ""} · ${item.license}`,
    );
    return hit ? [hit] : [];
  });
}

export async function freeCatalogueImageHits(query) {
  const results = await Promise.allSettled([wikimediaCommonsImageHits(query), openverseImageHits(query)]);
  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

// Judges the SLIDE's claim, not the pack's topic. Owner report 2026-09-13 with
// three delivered frames: the old wording asked only whether the page showed
// «همان موضوع/اپ/قابلیت», so a page that was broadly about screenshots passed
// for a slide whose caption was «عکس یا اسکرین‌شات دلخواهت را بگذار» — and the
// picture that actually shipped was a Figma landing page. A slide makes one
// specific claim about one specific screen, and that is what its picture has
// to show.
//
// Known limit, stated here so nobody mistakes this for more than it is: the
// judge reads the PAGE's title/URL/snippet, never the image itself. It can
// only rule out a page that is obviously about something else; it cannot see
// that a correctly-topical page's og:image happens to be a marketing banner.
// Closing that needs a multimodal look at the downloaded bytes.
function relevancePrompt(topic, points, candidate) {
  const claim = String(points[0] || "").trim();
  return `موضوع کلی ویدیو: «${topic}»
ادعای دقیق این اسلاید: ${claim ? `«${claim}»` : "(اسلاید ادعای جداگانه‌ای ندارد؛ فقط موضوع کلی را بسنج)"}
یک صفحهٔ وب با این مشخصات پیدا شده:
عنوان صفحه: «${candidate.title}»
آدرس: ${candidate.url}
خلاصهٔ صفحه: «${candidate.snippet}»

پرسش: آیا این صفحه دربارهٔ همان اپ/قابلیتی است که ادعای این اسلاید می‌گوید، به‌طوری که تصویرِ خودِ این صفحه همان صفحه یا همان گام را نشان بدهد؟

با false جواب بده اگر هر کدام از این‌ها برقرار باشد:
- صفحه دربارهٔ محصول یا سرویس دیگری است، حتی اگر موضوعش شبیه باشد؛
- صفحهٔ معرفی/تبلیغ/لندینگ یک محصول است و تصویرش بنر بازاریابی است، نه صفحهٔ واقعی همان قابلیت؛
- صفحه فقط کلی دربارهٔ همان حوزه است و آن گام مشخص را نشان نمی‌دهد؛
- تصویر احتمالاً لوگو، آیکن، عکس عمومی یا تصویرسازی است.

فقط یک JSON با همین دو کلید بده، بدون هیچ متن دیگر: {"relevant": true یا false, "reason": "دلیل خیلی کوتاه فارسی"}`;
}

// The German A1 vocabulary lane asks a genuinely different question, and until
// 2026-09-15 it was asking the one above instead.
//
// That prompt is written for an app-feature slide: it asks whether a PAGE is
// about the same app/feature, and it instructs the model to answer false when
// «تصویر احتمالاً لوگو، آیکن، عکس عمومی یا تصویرسازی است». For a vocabulary
// word, an ordinary photograph of ordinary people IS the correct picture — so
// the lane was telling the judge to reject exactly what it needed. Measured on
// news-scan run #342 (episode 20, a1-20-countries): Pexels reported
// «8 candidates examined, none passed — notRelevant:8» for all four words, at
// every broadening tier, and the build fell through every real source to LAW 7
// layer 6's local graphic.
//
// What this prompt does NOT do is lower the bar. A vocabulary slide still has
// to show the thing the word means, and the four rejection rules below are the
// ones that actually matter for that claim — a different subject, a drawing
// instead of a photograph, a logo/screenshot/chart instead of the thing, or a
// picture that simply does not contain the concept. What changes is that
// "an everyday photo of real people" stops being a reason to refuse.
//
// Same known limit as above, and it is worth restating: the judge reads the
// candidate's TEXT (a Pexels photo's own alt description, or the Wikipedia
// article the lead image comes from), never the pixels.
function vocabularyRelevancePrompt(concept, points, candidate) {
  const meaning = String(points[0] || "").trim();
  return `این اسلاید یک واژهٔ آموزش زبان آلمانی را به فارسی‌زبان یاد می‌دهد.
مفهومی که باید نشان داده شود: «${concept}»
${meaning ? `معنی فارسی واژه: «${meaning}»` : ""}
یک تصویر نامزد با این مشخصات پیدا شده:
عنوان/توضیح تصویر: «${candidate.title}»
منبع: ${candidate.url}
${candidate.snippet && candidate.snippet !== candidate.title ? `توضیح بیشتر: «${candidate.snippet}»` : ""}

پرسش: آیا این تصویر، همان مفهوم بالا را نشان می‌دهد؟ یعنی بیننده با دیدن آن، معنی واژه را بفهمد؟

یک عکس معمولی و روزمره از آدم‌ها، اشیا، مکان یا موقعیت واقعی — اگر همان مفهوم را نشان بدهد — پاسخ درست است و باید true بگیرد. «عکس استوک بودن» به‌تنهایی دلیل رد نیست.

فقط اگر یکی از این‌ها برقرار بود false بده:
- تصویر موضوع دیگری است و ربطی به این مفهوم ندارد؛
- نقاشی، کارتون، آیکن، کلیپ‌آرت یا رندر سه‌بعدی است، نه عکس واقعی؛
- لوگو، اسکرین‌شات، نمودار، جدول یا متن است، نه تصویر خودِ آن چیز؛
- آن‌قدر کلی یا خالی است که آن مفهوم در آن دیده نمی‌شود.

فقط یک JSON با همین دو کلید بده، بدون هیچ متن دیگر: {"relevant": true یا false, "reason": "دلیل خیلی کوتاه فارسی"}`;
}

function parseVerdict(raw) {
  try {
    const match = String(raw || "").match(/\{[\s\S]*\}/);
    if (!match) return null;
    const value = JSON.parse(match[0]);
    return typeof value?.relevant === "boolean" ? value : null;
  } catch { return null; }
}

// rescuePackPhotos() can call this dozens of times in one daily-render.mjs
// run (one whole rotation category's worth of missing-photo candidates) —
// confirmed live 2026-09-06: a run that worked fine calling this in
// isolation started returning empty/failed verdicts partway through a real
// multi-candidate run, which is a per-minute rate limit, not a real outage.
// The same one-retry-with-backoff pattern lib/translate-fa.mjs already uses
// for this exact symptom.
async function withRetry(call) {
  let response = await call();
  for (let i = 0; !response.ok && (response.status === 503 || response.status === 429) && i < 2; i++) {
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    response = await call();
  }
  return response;
}

// Exported for reuse by lib/recovery-engine.mjs's narration-rewording
// strategy generator — the same "ask an LLM, parse JSON back" plumbing,
// not specific to image relevance despite living in this file historically.
export async function askGemini(prompt) {
  const res = await withRetry(() => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, withTimeout({
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": GEMINI_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    }),
  })));
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const body = await res.json();
  return body?.candidates?.[0]?.content?.parts?.map((p) => p?.text || "").join("") || "";
}

export async function askGroq(prompt) {
  const res = await withRetry(() => fetch("https://api.groq.com/openai/v1/chat/completions", withTimeout({
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You judge image-page relevance for a Persian video project. Respond with a single JSON object: {\"relevant\": true|false, \"reason\": \"...\"}. No other text." },
        { role: "user", content: prompt },
      ],
    }),
  })));
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const body = await res.json();
  return body?.choices?.[0]?.message?.content || "";
}

// How many search hits one strategy actually opens. Unchanged from the literal
// it replaces (6) — this names it so the diagnostic can report the same number
// the loop uses instead of the raw hit count.
const MAX_CANDIDATES_PER_STRATEGY = 6;

/**
 * The same decision as isRelevant(), but it also says whether a model actually
 * answered. Both cases still REJECT — that part is unchanged and must stay
 * unchanged — but they mean opposite things to whoever reads the log:
 * "the picture is wrong" is a content problem, "no model answered" is an
 * outage. Telegram run #459 (2026-09-13 13:01) reported notRelevant:3 for
 * green-screen strategy 3 while Gemini was answering 429 to the very next
 * call in the same second, so those three may never have been judged at all.
 *
 * @returns {Promise<{relevant: boolean, judged: boolean}>} judged=false means
 *   no provider returned a usable verdict.
 */
// Why the judge could not answer, as the providers themselves reported it.
// Both failures used to be swallowed by bare `catch {}`, so a run where every
// candidate was rejected for want of a verdict could only say
// "judgeUnavailable:5" — true, and useless: it named neither which provider
// failed nor whether the cause was a dead key, an exhausted quota or a model
// that no longer exists. daily #240 (2026-09-13) rejected 40+ candidates that
// way, several of them with tooSmall:0 notRelevant:0 — images that may have
// been perfectly good and were never actually looked at. A system that is
// meant to heal itself cannot do it blind.
//
// Diagnostic only. Neither the verdict nor what counts as a real image
// changes: an unjudged candidate is still rejected, exactly as before.
// A per-minute rate limit does not clear in the 4.5 seconds withRetry() waits
// out (1.5s, then 3s). This file's own comment above records the symptom —
// verdicts that work in isolation start failing partway through a real
// multi-candidate run — and rescuePackPhotos() calls the judge far faster than
// a free text tier allows: up to 6 candidates × 3 strategies × 4 slides.
//
// So once a provider answers 429/503/timeout, every later candidate in the
// same run paid 4.5s to ask the same saturated provider the same way before
// the working one was ever tried. daily #240's pre-scan hit its 8-minute
// budget and gave up ("proceeding with whatever each slot currently resolves
// to") with used:0 everywhere.
//
// A provider that just rate-limited is skipped to the BACK of the order for a
// minute rather than dropped: the other provider is asked first, and if it is
// also cooling off both are still tried, because a real attempt is always
// better than rejecting a candidate nothing looked at. Every verdict still
// comes from a real model answering this exact prompt; nothing about what
// counts as relevant, or about rejecting the unjudged, changes.
const PROVIDER_COOLOFF_MS = 60_000;
const coolingUntil = { gemini: 0, groq: 0 };

// The same candidate is judged over and over inside one run. daily-render.mjs
// retries a slot up to 6 times, and each retry re-searches the same topic and
// gets back the same URLs, so the identical question is paid for repeatedly
// against a free per-minute tier. Measured 2026-09-13 (judge-probe run 2):
// after daily #242 spent 40 minutes judging, BOTH providers answered 429 to
// the very first call of an unrelated job — the lesson lane then rejected 8
// good Pexels photos per word, with tooSmall:0 and notRelevant:0, purely for
// want of a verdict.
//
// Only SUCCESSFUL verdicts are remembered. A failure is never cached, so a
// transient outage cannot become a sticky rejection, and a cached answer is
// always a real model's answer to this exact prompt — the gate is unchanged,
// it is just not asked the same question twice.
const verdictCache = new Map();
const VERDICT_CACHE_MAX = 500;

// Confirmed live 2026-09-22 (episode 31, the first scheduled build with Jev
// in the chain): a SUCCESSFUL judge left no trace at all. The provider names
// are printed only inside findRealImage()'s rejection diagnostic, so a build
// whose images all passed gave no evidence of which model answered — exactly
// the question VISUAL_QC_STANDARD asks to be able to answer afterwards.
// One line per provider per process, the first time it answers: at most
// three lines, and it names the whole available chain so "Jev answered" and
// "Gemini/Groq are still behind it" are both readable from the same line.
const judgeAnnounced = new Set();

/** True when every judge provider is inside its cool-off window. */
export function judgesAllCoolingOff(now = Date.now(), cooling = coolingUntil) {
  const configured = [];
  if (GEMINI_KEY) configured.push("gemini");
  if (GROQ_KEY) configured.push("groq");
  if (!configured.length) return true;
  return configured.every((n) => cooling[n] > now);
}
const RATE_LIMITED = /\b(429|503)\b|quota|rate.?limit|timeout|timed out|abort/i;

function noteProviderFailure(name, error) {
  if (RATE_LIMITED.test(String(error?.message || error))) {
    coolingUntil[name] = Date.now() + PROVIDER_COOLOFF_MS;
  }
}

/**
 * Providers to try, in order, with any that is currently cooling off moved to
 * the back. Pure and exported so the ordering can be tested without a network.
 */
export function judgeProviderOrder(available, now = Date.now(), cooling = coolingUntil) {
  return [...available].sort((a, b) => Number(cooling[a] > now) - Number(cooling[b] > now));
}

/**
 * @param {{lane?:"feature"|"vocabulary"}} [opts] which claim is being judged.
 *   Defaults to "feature" — the app/product pipeline this judge was built for —
 *   so every existing caller keeps its exact previous behaviour. Only the
 *   German A1 vocabulary lane (lib/lesson-image.mjs, lib/image-candidates.mjs)
 *   passes "vocabulary", because only it is judging "does this picture show
 *   what this word means" rather than "is this page about this feature".
 */
export async function judgeRelevance(topic, points, candidate, opts = {}) {
  const prompt = opts.lane === "vocabulary"
    ? vocabularyRelevancePrompt(topic, points, candidate)
    : relevancePrompt(topic, points, candidate);
  const cached = verdictCache.get(prompt);
  if (cached) return { ...cached };
  // Owner directive 2026-09-21: Jev judges first where it applies. It ADDS a
  // judge and removes none — if it fails or is unconfigured, the loop falls
  // through to Gemini and Groq exactly as before, so no lesson depends on it.
  // Only the vocabulary lane goes to Jev: the question it was measured on is
  // "does this picture show what this word means". The feature lane still
  // goes to the text judges.
  const ask = {
    jev: () => jevVocabularyVerdict({ concept: topic, meaning: points[0], candidate }),
    gemini: () => askGemini(prompt),
    groq: () => askGroq(prompt),
  };
  const available = [];
  const why = [];
  if (opts.lane === "vocabulary" && jevConfigured()) available.push("jev");
  else if (opts.lane === "vocabulary") why.push("jev: no key");
  if (GEMINI_KEY) available.push("gemini"); else why.push("gemini: no key");
  if (GROQ_KEY) available.push("groq"); else why.push("groq: no key");

  for (const name of judgeProviderOrder(available)) {
    try {
      const verdict = parseVerdict(await ask[name]());
      if (verdict) {
        if (!judgeAnnounced.has(name)) {
          judgeAnnounced.add(name);
          console.log(`   ⚖ judge ${name} answered (chain: ${available.join(", ")})`);
        }
        const answer = { relevant: verdict.relevant, judged: true };
        if (verdictCache.size >= VERDICT_CACHE_MAX) verdictCache.clear();
        verdictCache.set(prompt, answer);
        return { ...answer };
      }
      why.push(`${name}: no parsable verdict`);
    } catch (e) {
      noteProviderFailure(name, e);
      why.push(`${name}: ${String(e?.message || e).slice(0, 60)}`);
    }
  }
  // No model gave a usable verdict — a real image with no relevance
  // confirmation is exactly the failure mode this file exists to prevent,
  // so treat "couldn't judge" the same as "not relevant".
  return { relevant: false, judged: false, why: why.join("; ") };
}

export async function isRelevant(topic, points, candidate, opts = {}) {
  return (await judgeRelevance(topic, points, candidate, opts)).relevant;
}

// Owner directive 2026-09-13 ("Recovery Loop", scoped by the owner to never
// touch the Visual Truth Gate itself or its "real or ai-generated only"
// rule): a single search query is one METHOD, and finding nothing with it is
// not the same as no real image existing. Three genuinely different angles —
// not rewordings of the same phrase — because each finds a different kind of
// source: the official product itself, third-party coverage that actually
// shows the thing in use, and an app-store/marketplace listing. Tried in
// order; a later strategy only runs if the earlier one produced zero
// candidates that passed every check (download/type/size/relevance) — one
// real strategy that already found a valid photo is never second-guessed by
// running the next one anyway.
// The English UI labels a slide names — "Green Screen", "Effects" — pulled out
// of its Persian caption. Owner report 2026-09-13, with three delivered frames
// as evidence: every slide of "green-screen" searched the same phrase (the
// pack id) because the strategies below took ONLY `topic`, so the four slides
// differed solely by which hit had not been used yet. Slide 2 ("در افکت‌ها
// «Green Screen» را انتخاب کن") got a cropped page about Android app reviews;
// slide 3 ("عکس یا اسکرین‌شات دلخواهت را بگذار") got a Figma landing page.
// Neither shows TikTok at all.
//
// Only the Latin spans are used. Appending the whole Persian caption to an
// English query would make results worse, but "Green Screen" and "Effects" are
// exactly the words a real screenshot of that screen is captioned with. A
// slide with no Latin span contributes nothing and the query is unchanged from
// before — strictly more signal, never less.
export function slideSearchCue(slideText) {
  return segment(String(slideText || ""))
    .filter((p) => p.lang === "en" && /[A-Za-z]{2}/.test(p.text))
    .map((p) => p.text.trim())
    .join(" ")
    .slice(0, 60);
}

export const REAL_IMAGE_SEARCH_STRATEGIES = [
  (topic, cue = "") => `${topic}${cue ? ` ${cue}` : ""} official screenshot OR interface OR product page OR press photo`,
  (topic, cue = "") => `${topic}${cue ? ` ${cue}` : ""} review OR hands-on OR walkthrough real screenshot`,
  (topic, cue = "") => `${topic}${cue ? ` ${cue}` : ""} app store OR google play OR product hunt listing screenshot`,
];

/**
 * @param {string} topic
 * @param {string[]} points
 * @returns {Promise<{photo:string, sourceUrl:string, sourceType:string, alt:string}|null>}
 */
// usedImageUrls: images already picked for an earlier slide in the same
// pack, so a caller sourcing one photo per slide (rescuePackPhotos below)
// gets a genuinely different real image each time instead of Exa's same
// top hit for the same topic on every call.
export async function findRealImage(topic, points = [], usedImageUrls = new Set()) {
  // The relevance judgement is not optional — a real image nobody confirmed
  // is about this feature is the exact failure this file exists to prevent —
  // so an LLM key is still required. EXA_KEY no longer is: DuckDuckGo below
  // is keyless, which is what makes a $0 stack possible on this pipeline.
  if (!GEMINI_KEY && !GROQ_KEY) {
    console.error(`   ⚠ findRealImage(${topic}): no GEMINI_API_KEY/GROQ_API_KEY configured — cannot judge relevance, so cannot search`);
    return null;
  }
  mkdirSync("public/user-media", { recursive: true });
  // What THIS slide is about, not just what the pack is about.
  const cue = slideSearchCue(points[0]);
  let anyHits = false;
  for (const [strategyIndex, buildQuery] of REAL_IMAGE_SEARCH_STRATEGIES.entries()) {
    // Two indexes, same query angle, same downstream verification. Exa
    // first while it has credits; DuckDuckGo (keyless, no quota) whenever
    // Exa is unconfigured, broken or empty — which since 2026-09-13 is
    // permanently, at 402. A failed index is not proof this angle has no
    // photo, so the other one is still asked before moving on.
    let hits = [];
    if (exaConfigured()) {
      try {
        hits = await exaSearch(buildQuery(topic, cue));
      } catch (e) {
        console.error(`   ⚠ findRealImage(${topic}): strategy ${strategyIndex + 1}/${REAL_IMAGE_SEARCH_STRATEGIES.length} exaSearch failed — ${e.message}`);
      }
    }
    if (!hits.length) {
      try {
        // Every keyless index, not DuckDuckGo alone — see lib/web-search.mjs.
        // Run #267 (2026-09-14) lost this lane entirely to a DuckDuckGo 403
        // with no second index to fall back to.
        hits = await webImageHits(buildQuery(topic, cue));
        if (hits.length) console.error(`   ℹ findRealImage(${topic}): strategy ${strategyIndex + 1} — ${hits.length} candidate(s) via ${hits.engine} (keyless)`);
        else console.error(`   ⚠ findRealImage(${topic}): strategy ${strategyIndex + 1}/${REAL_IMAGE_SEARCH_STRATEGIES.length} no keyless index answered — tried ${(hits.tried || []).join(", ") || "none"}`);
      } catch (e) {
        console.error(`   ⚠ findRealImage(${topic}): strategy ${strategyIndex + 1}/${REAL_IMAGE_SEARCH_STRATEGIES.length} keyless search failed — ${e.message}`);
      }
    }
    // An ordinary web index can be up yet contain only marketing cards. Add
    // a small, independently licensed catalogue pool rather than treating a
    // non-empty but unusable web result set as proof no lawful image exists.
    try {
      const catalogue = await freeCatalogueImageHits(buildQuery(topic, cue));
      if (catalogue.length) {
        const general = Array.isArray(hits) ? hits : [];
        hits = [...general.slice(0, 3), ...catalogue.slice(0, 3)];
        console.error(`   ℹ findRealImage(${topic}): strategy ${strategyIndex + 1} — added ${catalogue.length} CC0/Public Domain catalogue candidate(s)`);
      }
    } catch (e) {
      console.error(`   ⚠ findRealImage(${topic}): catalogue search failed — ${e.message}`);
    }
    if (!hits.length) continue;
    anyHits = true;
    // Tracks WHY each candidate was rejected — findRealImage() used to fail
    // completely silently, which left "no real photo found" as a dead end with
    // no way to tell a genuinely absent photo apart from every candidate
    // tripping the same fixable bug (a wrong image URL, an undersized image,
    // a relevance-checker outage). One summary line, not one per candidate.
    const rejected = { used: 0, download: 0, type: 0, size: 0, irrelevant: 0, unjudged: 0, upsized: 0, bestSmall: null };
    let judgeStopped = false;
    const examined = hits.slice(0, MAX_CANDIDATES_PER_STRATEGY);
    // Download one URL and put it through the mechanical checks: is it really
    // an image, and does it clear the Visual Truth Gate's floor? Pulled out of
    // the loop below only so the full-size variant of a candidate can be
    // offered the IDENTICAL treatment — no check is skipped for it, and the
    // floor is the same literal comparison visual-proof.mjs makes.
    const verifyUrl = async (url) => {
      let bytes;
      try {
        const res = await fetch(url, withTimeout());
        if (!res.ok) return { fail: "download" };
        bytes = Buffer.from(await res.arrayBuffer());
      } catch { return { fail: "download" }; }

      const id = createHash("sha256").update(url).digest("hex").slice(0, 12);
      const rawFile = `public/user-media/auto-${id}.img`;
      writeFileSync(rawFile, bytes);
      const type = imageType(rawFile);
      if (!type) return { fail: "type" };
      const named = rawFile.replace(/\.img$/, `.${type === "jpeg" ? "jpg" : type}`);
      writeFileSync(named, bytes);

      const size = imageSize(named);
      if (!size || Math.max(size.width, size.height) < 1080 || size.width * size.height < 700000) {
        return { fail: "size", size };
      }
      return { ok: true, named };
    };

    for (const hit of examined) {
      if (usedImageUrls.has(hit.image)) { rejected.used++; continue; }
      // A thumbnail is not evidence that no full-size original exists — it is
      // usually evidence that one does, on the same server, at a derivable
      // URL. Run #257 threw away 867 candidates for being undersized while
      // every near-miss host was serving a WordPress rendition or a social
      // card. Try the derived original FIRST; fall back to the URL the page
      // actually offered, whose accounting below is unchanged. See
      // lib/image-upsize.mjs.
      let accepted = null;
      let upsized = false;
      for (const variant of fullSizeVariants(hit.image)) {
        const attempt = await verifyUrl(variant);
        if (attempt.ok) { accepted = attempt; upsized = true; break; }
      }
      let fate = null;
      if (!accepted) {
        const attempt = await verifyUrl(hit.image);
        if (attempt.ok) accepted = attempt; else fate = attempt;
      }
      // Counted here, before the relevance judge, on purpose: `upsized` means
      // "the derived original cleared the size floor where the thumbnail would
      // not have", which is exactly the thing being measured. Whether the
      // judge then liked the picture is a separate counter.
      if (upsized) rejected.upsized++;

      if (!accepted) {
        if (fate.fail === "download") { rejected.download++; continue; }
        if (fate.fail === "type") { rejected.type++; continue; }
        const size = fate.size;
        rejected.size++;
        // Keep the BEST near-miss, not the last one. Across daily.yml run #232
        // (2026-09-13) this reason alone was 366 of 590 rejections — 62% — and
        // the counter alone cannot say why. Two very different worlds produce
        // it: a 1200×630 Open Graph card (the social preview every article
        // has, sitting just under the area floor) versus a genuine 300×200
        // thumbnail. The first means the rescue is looking at the wrong KIND
        // of image; the second means the search is returning junk. One example
        // per strategy decides it, and costs nothing.
        const area = size ? size.width * size.height : 0;
        if (size && area > (rejected.bestSmall?.area || 0)) {
          let host = "";
          try { host = new URL(hit.image).host; } catch { host = "?"; }
          rejected.bestSmall = { area, label: `${size.width}×${size.height} from ${host}` };
        }
        continue;
      }

      const candidate = { title: String(hit.title || "").slice(0, 160), url: hit.url, snippet: String(hit.text || "").slice(0, 260) };
      let verdict = { relevant: false, judged: false };
      try { verdict = await judgeRelevance(topic, points, candidate); } catch (e) { verdict = { relevant: false, judged: false, why: String(e?.message || e).slice(0, 80) }; }
      if (!verdict.judged && verdict.why) rejected.judgeWhy = verdict.why;
      // Rejected either way — an unjudged image never ships. Only the COUNTER
      // differs, so the log can tell a wrong picture from a judge outage.
      if (!verdict.relevant) {
        rejected[verdict.judged ? "irrelevant" : "unjudged"]++;
        // Same reasoning as lib/image-candidates.mjs: once every provider is
        // rate-limited, the remaining candidates cannot be judged either, and
        // asking anyway only starves every other lane sharing the key. The
        // unreached candidates are still not used — they are reported as
        // unexamined rather than as rejections that never happened.
        if (!verdict.judged && judgesAllCoolingOff()) { judgeStopped = true; break; }
        continue;
      }

      const sourceType = hit.provider === "wikimedia-commons"
        ? "commons-licensed"
        : hit.provider === "openverse"
          ? "openverse-licensed"
          : "labelled-explainer";
      return { photo: accepted.named, sourceUrl: hit.url, sourceType, alt: candidate.title || topic, imageUrl: hit.image };
    }
    // Report what was EXAMINED, not what was found. The loop has always
    // stopped at MAX_CANDIDATES_PER_STRATEGY while this line printed
    // hits.length, so run #459's "8 candidates, none passed" described six
    // that were tried and two that were never opened — and the counters,
    // summing to six, silently disagreed with the headline.
    const suffix = hits.length > examined.length ? ` (of ${hits.length} found)` : "";
    const stopped = judgeStopped ? " · stopped early: every judge is rate-limited" : "";
    const nearMiss = rejected.bestSmall ? ` · largest undersized: ${rejected.bestSmall.label}` : "";
    // An outage names itself. Without this the only honest reading of
    // "judgeUnavailable:5" was "something, somewhere, said no".
    const judgeWhy = rejected.unjudged && rejected.judgeWhy ? ` · judge down: ${rejected.judgeWhy}` : "";
    console.error(`   ⚠ findRealImage(${topic}): strategy ${strategyIndex + 1}/${REAL_IMAGE_SEARCH_STRATEGIES.length} — ${examined.length} candidates examined${suffix}, none passed — used:${rejected.used} download:${rejected.download} badType:${rejected.type} tooSmall:${rejected.size} notRelevant:${rejected.irrelevant} judgeUnavailable:${rejected.unjudged} upsized:${rejected.upsized}${nearMiss}${judgeWhy}${stopped}`);
  }
  if (!anyHits) console.error(`   ⚠ findRealImage(${topic}): no index returned an image across ${REAL_IMAGE_SEARCH_STRATEGIES.length} distinct search strategies (Exa and DuckDuckGo both tried)`);
  return null;
}

/**
 * A generated stand-in image for a slide whose real photo could not be
 * found — ONLY called after findRealImage() has already failed for that
 * exact slide (see rescuePackPhotos below; never a substitute for trying).
 * Marked sourceType "ai-generated" so it is never confused with real
 * evidence downstream (assertVisualProof, any future audit of a pack's
 * sources).
 * @param {string} topic
 * @param {string} slideText
 * @returns {Promise<{photo:string, sourceUrl:string, sourceType:string, alt:string}|null>}
 */
// Attempt 1 names the topic/brand for accuracy; attempt 2 is a genuinely
// different strategy (not a reworded retry) tried ONLY when attempt 1 is
// blocked by a safety filter — dropping the named product/brand is a
// frequent real fix for over-cautious filters on depicting a named product,
// asking for the same underlying concept in general, editorial-illustration
// terms instead. Still real-content rules apply either way: no fake UI, no
// invented logo/text.
function aiImagePrompt(topic, slideText, attempt) {
  if (attempt === 1) {
    return [
      "یک تصویر واقع‌گرایانه، باکیفیت و باورپذیر برای یک اسلاید ویدیوی کوتاه عمودی بساز.",
      `موضوع کلی ویدیو: ${topic}`,
      `این اسلاید مشخصاً همین را نشان می‌دهد: ${slideText}`,
      "بدون هیچ متن، حرف، عدد، لوگو، واترمارک یا رابط کاربری ساختگی روی تصویر.",
      "نورپردازی طبیعی، ترکیب‌بندی تمیز، تک‌سوژه‌ی روشن — نه کلاژ چند تصویر.",
    ].join("\n");
  }
  return [
    "یک تصویر ادیتوریال، ساده و باورپذیر برای یک اسلاید ویدیوی کوتاه عمودی بساز — بدون اشاره به نام تجاری یا محصول خاص.",
    `مفهومی که باید نشان داده شود: ${slideText}`,
    "بدون هیچ متن، حرف، عدد، لوگو، واترمارک، برند قابل‌شناسایی یا رابط کاربری ساختگی روی تصویر.",
    "نورپردازی طبیعی، ترکیب‌بندی تمیز، تک‌سوژه‌ی روشن — نه کلاژ چند تصویر.",
  ].join("\n");
}

// Owner directive 2026-09-15: episode 19's Gemini 429 traced to real,
// verified evidence (news-scan run #323/#324 logs) — not the relevance
// judge (which ran clean, judgeUnavailable:0 on every layer) but the
// image-generation call itself, whose error body named "plan and billing
// details" explicitly. That quota belongs to the Google Cloud project
// behind the key, not the key itself, so rotating the key never clears it.
// Pollinations' image endpoint needs no key/billing and returns image bytes
// directly from a single GET — a plain image/* response, not a JSON/base64
// envelope, so the parsing below is simpler than the Gemini call it replaces.
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || "flux";

// The free Pollinations endpoint sometimes honours a portrait request with a
// 576x1024 image.  That is still a valid 9:16 generation — merely a smaller
// rendition — and throwing it away made the recovery path pay for another
// generation before it could use the already-valid contextual fallback.
//
// Do NOT lower the Visual Truth Gate's 1080px/700k floor to accept it.  The
// runner already installs ffmpeg, so generated images are normalized to the
// delivery resolution first and are verified again afterwards.  A failed
// conversion remains a normal generation failure and falls through to the
// explicitly labelled local fallback; it never ships a small asset.
export function normalizeGeneratedImage(named) {
  const sourceSize = imageSize(named);
  if (sourceSize && Math.max(sourceSize.width, sourceSize.height) >= 1080 && sourceSize.width * sourceSize.height >= 700000) {
    return { named, normalized: false };
  }

  const output = named.replace(/\.[^.]+$/, "-1080.png");
  try {
    execFileSync("ffmpeg", [
      "-y", "-loglevel", "error", "-i", named,
      "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
      "-frames:v", "1", output,
    ], { stdio: "pipe" });
  } catch (error) {
    return { error: `could not normalize generated image — ${error.message}` };
  }

  const normalizedSize = imageSize(output);
  if (!normalizedSize || Math.max(normalizedSize.width, normalizedSize.height) < 1080 || normalizedSize.width * normalizedSize.height < 700000) {
    rmSync(output, { force: true });
    return { error: `normalized image does not meet quality floor (${normalizedSize ? `${normalizedSize.width}x${normalizedSize.height}` : "unreadable"})` };
  }
  return { named: output, normalized: true };
}

async function attemptGenerateAIImage(topic, slideText, prompt, attempt) {
  const seed = createHash("sha256").update(`${slideText}-${attempt}-${Date.now()}-${Math.random()}`).digest("hex").slice(0, 12);
  const params = new URLSearchParams({
    model: POLLINATIONS_MODEL,
    nologo: "true",
    width: "1080",
    height: "1920",
    seed: String(parseInt(seed, 16) % 1_000_000),
  });
  const call = () => fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`, withTimeout({}, IMAGE_GEN_TIMEOUT_MS));
  let response;
  try {
    response = await withRetry(call);
  } catch (e) {
    // A thrown (not merely non-2xx) failure here is a genuine connection-
    // level problem — "The operation was aborted due to timeout", or
    // "terminated" (the peer closed the socket) — confirmed live
    // 2026-09-15 (episode 20, news-scan run #335): Pollinations' free tier
    // hit exactly these two symptoms under load, neither of which is an
    // HTTP status withRetry()'s own 429/503 branch already retries. One
    // extra try after a real pause, narrow to this call site rather than
    // a change to the shared withRetry() other, differently-behaved
    // providers (Gemini, Groq, Wikimedia, Openverse) also use.
    try {
      await new Promise((r) => setTimeout(r, 3000));
      response = await call();
    } catch (e2) {
      return { error: `request failed — ${e2.message}` };
    }
  }
  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    return { error: `Pollinations ${response.status} — ${errBody.slice(0, 300)}` };
  }
  const bytes = Buffer.from(await response.arrayBuffer());

  mkdirSync("public/user-media", { recursive: true });
  const id = createHash("sha256").update(`${slideText}-${attempt}-${Date.now()}-${Math.random()}`).digest("hex").slice(0, 12);
  const rawFile = `public/user-media/ai-${id}.img`;
  writeFileSync(rawFile, bytes);
  const type = imageType(rawFile);
  if (!type) {
    return { error: "downloaded data is not a recognized image type" };
  }
  const named = rawFile.replace(/\.img$/, `.${type === "jpeg" ? "jpg" : type}`);
  writeFileSync(named, bytes);
  rmSync(rawFile, { force: true });

  const normalized = normalizeGeneratedImage(named);
  if (!normalized.named) {
    return { error: `generated image too small (${imageSize(named) ? `${imageSize(named).width}x${imageSize(named).height}` : "unreadable"}); ${normalized.error}` };
  }

  if (normalized.normalized) console.error("   ℹ generated portrait normalized to 1080x1920 before Visual QC");
  return { named: normalized.named };
}

export async function generateAIImage(topic, slideText) {
  const first = await attemptGenerateAIImage(topic, slideText, aiImagePrompt(topic, slideText, 1), 1);
  let named = first.named;
  if (!named) {
    console.error(`   ⚠ generateAIImage(${topic}): attempt 1 — ${first.error} — retrying with a genuinely different, brand-neutral prompt`);
    const second = await attemptGenerateAIImage(topic, slideText, aiImagePrompt(topic, slideText, 2), 2);
    named = second.named;
    if (!named) {
      console.error(`   ⚠ generateAIImage(${topic}): attempt 2 — ${second.error} — giving up on AI generation for this slide`);
      return null;
    }
  }

  return {
    photo: named,
    sourceUrl: `ai-generated:pollinations-${POLLINATIONS_MODEL}`,
    sourceType: "ai-generated",
    alt: `تصویر تولیدشده با هوش مصنوعی برای «${slideText}»`,
  };
}

// Last offline safety net. This is intentionally an honest, local editorial
// illustration — never a fabricated app interface, logo or screenshot. It
// means a temporary search/API outage does not leave a published video with a
// blank slide. Provenance remains explicit in visualEvidence.sourceType.
function fallbackMotif(text) {
  const value = String(text || "").toLowerCase();
  if (/صدا|میکروفون|audio|voice|music/.test(value)) return '<path d="M540 430v300M430 590a110 110 0 00220 0V430a110 110 0 00-220 0v160zm-100 0a210 210 0 00420 0M470 800h140"/>';
  if (/عکس|تصویر|photo|image|camera|ویدیو|video/.test(value)) return '<rect x="270" y="430" width="540" height="390" rx="44"/><circle cx="540" cy="620" r="105"/><path d="M330 510h130l45-65h70l45 65h150"/>';
  if (/ویو|بازدید|آمار|insight|analytics|درآمد|income/.test(value)) return '<path d="M300 800V650m160 150V530m160 270V410m160 390V300"/><path d="M270 610l180-130 150 80 220-250"/>';
  if (/ذخیره|save|bookmark/.test(value)) return '<path d="M365 330h350v510L540 720 365 840V330z"/>';
  if (/متن|subtitle|caption|نوشت/.test(value)) return '<path d="M270 420h540M270 550h400M270 680h490"/><circle cx="770" cy="550" r="72"/>';
  return '<path d="M320 530h440M320 650h290"/><circle cx="735" cy="650" r="78"/><path d="M330 780l130 85 280-310"/>';
}

export function generateLocalFallbackImage(topic, slideText) {
  mkdirSync("public/user-media", { recursive: true });
  const id = createHash("sha256").update(`${topic}|${slideText}|${Date.now()}|${Math.random()}`).digest("hex").slice(0, 12);
  const photo = `public/user-media/fallback-${id}.svg`;
  const motif = fallbackMotif(slideText || topic);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
  <defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#13213b"/><stop offset="1" stop-color="#284f70"/></linearGradient><radialGradient id="g"><stop stop-color="#f8c973" stop-opacity=".42"/><stop offset="1" stop-color="#f8c973" stop-opacity="0"/></radialGradient></defs>
  <rect width="1080" height="1440" fill="url(#b)"/><circle cx="830" cy="250" r="440" fill="url(#g)"/><circle cx="210" cy="1190" r="300" fill="#7bc6dd" opacity=".11"/>
  <g fill="none" stroke="#f8fbff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round">${motif}</g>
  <g fill="#f8c973"><circle cx="250" cy="270" r="16"/><circle cx="810" cy="1020" r="12"/><circle cx="770" cy="1090" r="8"/></g>
</svg>`;
  writeFileSync(photo, svg, "utf8");
  return {
    photo,
    sourceUrl: "generated-fallback:local-contextual-svg",
    sourceType: "generated-fallback",
    alt: `تصویر گرافیکیِ جایگزین و برچسب‌دار برای مفهوم «${slideText || topic}»`,
  };
}

const isRealAsset = (tip) => typeof tip?.photo === "string" && tip.photo.startsWith("public/") && existsSync(tip.photo);

// save-user-photo.mjs writes exactly one file per id here — the direct
// route PROJECT_RULES §14-د/14-ه calls for once an automated search finds
// nothing: the owner sends the real screenshot themselves, captioned with
// the id daily-render.mjs's Visual QC failure message already tells them.
// Checked before any network search below, so a photo the owner already
// supplied is never second-guessed by a worse auto-found substitute.
const USER_PHOTO_DIR = "public/user-photos";
function userSubmittedPhoto(id) {
  if (!id || !existsSync(USER_PHOTO_DIR)) return null;
  const safe = String(id).toLowerCase();
  for (const ext of ["jpg", "jpeg", "png", "webp", "gif"]) {
    const file = `${USER_PHOTO_DIR}/${safe}.${ext}`;
    if (existsSync(file)) return file;
  }
  return null;
}

// Mutates a feature pack in place, filling in a real photo for every
// slide that has none — the daily rotation banks predate the Visual Truth
// Gate (lib/visual-proof.mjs) and most of their entries only ever had a
// guessed `tip.ui` mockup, never a real screenshot.
//
// Used to run ONE shared search for the whole pack and reuse that single
// found photo on every missing slide (a different photoFocus crop each, but
// the same underlying image). Owner report 2026-09-11: TikTok/Instagram
// videos "یک عکس واقعی است و در سلایدها تکرار می‌شود" — one real photo
// repeating across slides. That also reads as a rule-39/45 violation
// (PROJECT_RULES.md: every slide needs its own real evidence; a repeat is
// only allowed with a genuinely different section/action). Fixed the same
// way the German-lesson series already fixes it (lib/lesson-image.mjs:
// "each vocabulary item gets its OWN search") — one real-photo search per
// missing slide, using that slide's own text, with earlier slides' picks
// excluded so a second slide does not just re-land on the same top hit.
//
// The owner also asked, in the same report, for a generated stand-in image
// when a real per-slide photo can't be found. First declined (a real photo
// is what PROJECT_RULES.md rule 39/41 required at the time), then the owner
// explicitly confirmed the rule itself should change — real search first,
// generated image only as a last resort for that one slide, never a repeat
// (real or generated) across slides. PROJECT_RULES.md rule 39/41 was amended
// accordingly (see its "پیوست دوم", 2026-09-11) — this is that amendment
// implemented: generateAIImage() above is only ever called after
// findRealImage() has already failed for that exact slide, and its output is
// tagged sourceType "ai-generated" (added to visual-proof.mjs's
// VALID_SOURCE_TYPES) so it stays distinguishable from real evidence
// downstream, even though a viewer sees no visible difference.
export async function rescuePackPhotos(pack) {
  const slides = pack.tips || pack.steps || [];
  const missing = slides.filter((tip) => !isRealAsset(tip));
  if (!missing.length) return false;
  // Tip text lives under different keys across the rotation banks
  // (`text` in some feature files, `head` in others) — never assume one.
  const textOf = (tip) => String(tip.text || tip.head || tip.label || "").trim();
  // pack.title is often a localized/branded video title ("تدوین از روی
  // متن — GapMedia") that never mentions the actual product name a search
  // needs. A tip's own `brand.name`, when present, is the real signal.
  const brandName = slides.map((tip) => tip?.brand?.name).find(Boolean);
  // pack.searchTopic is the only field here that exists PURELY for this
  // search — pack.name and pack.title are both rendered on screen, so they
  // cannot be edited to suit a query. Owner report 2026-09-13: "green-screen"
  // carries no brand, title or name, so the topic fell through to the bare id
  // and every slide searched the literal string "green-screen" — which is a
  // description of a chroma-key effect, not the product it belongs to, and
  // matched Figma and an Android-reviews page.
  const topic = pack.searchTopic || brandName || pack.title || pack.name || pack.id || "";
  const userPhoto = userSubmittedPhoto(pack.id);
  // "owner-supplied" is already one of VISUAL_SOURCE_TYPES in
  // lib/visual-proof.mjs — exactly this case — but assertVisualProof()
  // requires evidence.sourceUrl to be truthy regardless of type, and a
  // phone screenshot has no URL to cite. Verified live: without a non-empty
  // sourceUrl here QC rejected the rescued pack with "شناسنامهٔ مدرک بصری
  // ناقص است" even though the real photo itself was fine. A short, honest,
  // non-URL description satisfies the field without fabricating a citation.
  //
  // A single owner-sent photo is genuinely one image — there is nothing to
  // diversify per slide, so it still applies to every missing slide, same
  // as before.
  if (userPhoto) {
    const found = { photo: userPhoto, sourceUrl: "ارسال مستقیم صاحب کانال از طریق تلگرام", sourceType: "owner-supplied", alt: `اسکرین‌شات واقعی ${topic} — ارسال‌شده توسط صاحب کانال` };
    const focuses = ["subject-wide", "subject-detail", "subject-action", "subject-result"];
    missing.forEach((tip, i) => {
      tip.photo = found.photo;
      tip.photoFocus = focuses[i % focuses.length];
      tip.visualEvidence = {
        sourceUrl: found.sourceUrl, sourceType: found.sourceType,
        claim: textOf(tip).slice(0, 140), mainVisual: found.photo, whatItProves: found.alt,
        motionAction: "عمل مربوط به همین گام روی تصویر با تمرکز و آشکارسازی نشان داده می‌شود",
        secondaryMotion: "واکنش کنترل یا بخش مرتبط پس از حرکت اصلی",
        ambientMotion: "تغییر نور و عمق بسیار آرام، بدون حواس‌پرتی",
        coverage: 0.55,
      };
    });
    if (!pack.source && !pack.sources?.length) pack.source = found.sourceUrl;
    return true;
  }

  const focuses = ["subject-wide", "subject-detail", "subject-action", "subject-result"];
  const usedImageUrls = new Set();
  let filled = 0;
  for (let i = 0; i < missing.length; i++) {
    const tip = missing[i];
    const slideText = textOf(tip);
    // Real search always runs first. Only when it genuinely finds nothing for
    // THIS slide does a generated image stand in — never the other way round,
    // and never reused: each call (real or generated) produces its own file.
    let found = await findRealImage(topic, [slideText].filter(Boolean), usedImageUrls);
    let generated = false;
    if (found && found.imageUrl) usedImageUrls.add(found.imageUrl);
    if (!found) {
      found = await generateAIImage(topic, slideText || topic);
      generated = !!found;
    }
    if (!found) {
      found = generateLocalFallbackImage(topic, slideText || topic);
      generated = true;
    }
    tip.photo = found.photo;
    tip.photoFocus = focuses[i % focuses.length];
    // A generated image is never native-portrait; force the same crop the
    // German-lesson series already uses for the same reason (see
    // german-lesson-build.mjs's photoAspect comment).
    if (generated) tip.photoAspect = 0.75;
    tip.visualEvidence = {
      sourceUrl: found.sourceUrl,
      sourceType: found.sourceType,
      claim: slideText.slice(0, 140),
      mainVisual: found.photo,
      whatItProves: found.alt,
      motionAction: "عمل مربوط به همین گام روی تصویر با تمرکز و آشکارسازی نشان داده می‌شود",
      secondaryMotion: "واکنش کنترل یا بخش مرتبط پس از حرکت اصلی",
      ambientMotion: "تغییر نور و عمق بسیار آرام، بدون حواس‌پرتی",
      coverage: 0.55,
    };
    filled++;
    if (!generated && !pack.source && !pack.sources?.length && found.sourceUrl) pack.source = found.sourceUrl;
  }
  return filled > 0;
}
