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
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { imageType, imageSize } from "./media-guard.mjs";
import { segment } from "./tts-segments.mjs";
import { ddgImageHits } from "./ddg-search.mjs";

const EXA_KEY = process.env.EXA_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
// Confirmed live via Google's own docs, 2026-09-11: the Gemini API's image-
// generation model + REST shape (generateContent, generationConfig.
// responseModalities: ["IMAGE"], image bytes back as base64 in
// candidates[0].content.parts[].inlineData.data). Separate from GEMINI_MODEL
// above, which is a text-only model and cannot do this.
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
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

export async function exaSearch(query) {
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

export async function isRelevant(topic, points, candidate) {
  const prompt = relevancePrompt(topic, points, candidate);
  if (GEMINI_KEY) {
    try {
      const verdict = parseVerdict(await askGemini(prompt));
      if (verdict) return verdict.relevant;
    } catch { /* fall through to Groq */ }
  }
  if (GROQ_KEY) {
    try {
      const verdict = parseVerdict(await askGroq(prompt));
      if (verdict) return verdict.relevant;
    } catch { /* no provider answered */ }
  }
  // Neither model gave a usable verdict — a real image with no relevance
  // confirmation is exactly the failure mode this file exists to prevent,
  // so treat "couldn't judge" the same as "not relevant".
  return false;
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
    if (EXA_KEY) {
      try {
        hits = await exaSearch(buildQuery(topic, cue));
      } catch (e) {
        console.error(`   ⚠ findRealImage(${topic}): strategy ${strategyIndex + 1}/${REAL_IMAGE_SEARCH_STRATEGIES.length} exaSearch failed — ${e.message}`);
      }
    }
    if (!hits.length) {
      try {
        hits = await ddgImageHits(buildQuery(topic, cue));
        if (hits.length) console.error(`   ℹ findRealImage(${topic}): strategy ${strategyIndex + 1} — ${hits.length} candidate(s) via DuckDuckGo (keyless)`);
      } catch (e) {
        console.error(`   ⚠ findRealImage(${topic}): strategy ${strategyIndex + 1}/${REAL_IMAGE_SEARCH_STRATEGIES.length} DuckDuckGo failed — ${e.message}`);
      }
    }
    if (!hits.length) continue;
    anyHits = true;
    // Tracks WHY each candidate was rejected — findRealImage() used to fail
    // completely silently, which left "no real photo found" as a dead end with
    // no way to tell a genuinely absent photo apart from every candidate
    // tripping the same fixable bug (a wrong image URL, an undersized image,
    // a relevance-checker outage). One summary line, not one per candidate.
    const rejected = { used: 0, download: 0, type: 0, size: 0, irrelevant: 0 };
    for (const hit of hits.slice(0, 6)) {
      if (usedImageUrls.has(hit.image)) { rejected.used++; continue; }
      let bytes;
      try {
        const res = await fetch(hit.image, withTimeout());
        if (!res.ok) { rejected.download++; continue; }
        bytes = Buffer.from(await res.arrayBuffer());
      } catch { rejected.download++; continue; }

      const id = createHash("sha256").update(hit.image).digest("hex").slice(0, 12);
      const rawFile = `public/user-media/auto-${id}.img`;
      writeFileSync(rawFile, bytes);
      const type = imageType(rawFile);
      if (!type) { rejected.type++; continue; }
      const named = rawFile.replace(/\.img$/, `.${type === "jpeg" ? "jpg" : type}`);
      writeFileSync(named, bytes);

      const size = imageSize(named);
      if (!size || Math.max(size.width, size.height) < 1080 || size.width * size.height < 700000) { rejected.size++; continue; }

      const candidate = { title: String(hit.title || "").slice(0, 160), url: hit.url, snippet: String(hit.text || "").slice(0, 260) };
      let relevant = false;
      try { relevant = await isRelevant(topic, points, candidate); } catch { relevant = false; }
      if (!relevant) { rejected.irrelevant++; continue; }

      return { photo: named, sourceUrl: hit.url, sourceType: "labelled-explainer", alt: candidate.title || topic, imageUrl: hit.image };
    }
    console.error(`   ⚠ findRealImage(${topic}): strategy ${strategyIndex + 1}/${REAL_IMAGE_SEARCH_STRATEGIES.length} — ${hits.length} candidates, none passed — used:${rejected.used} download:${rejected.download} badType:${rejected.type} tooSmall:${rejected.size} notRelevant:${rejected.irrelevant}`);
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

async function attemptGenerateAIImage(topic, slideText, prompt, attempt) {
  const call = () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_IMAGE_MODEL)}:generateContent`, withTimeout({
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": GEMINI_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  }, IMAGE_GEN_TIMEOUT_MS));
  let response;
  try {
    response = await withRetry(call);
  } catch (e) {
    return { error: `request failed — ${e.message}` };
  }
  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    return { error: `Gemini ${response.status} — ${errBody.slice(0, 300)}` };
  }
  const body = await response.json().catch(() => null);
  const part = body?.candidates?.[0]?.content?.parts?.find((p) => p?.inlineData?.data);
  const b64 = part?.inlineData?.data;
  if (!b64) {
    // A frequent, distinct cause: the prompt itself was blocked (safety
    // filters), which returns 200 OK with no image part rather than an
    // error status — worth naming separately from "no image data at all".
    const blockReason = body?.promptFeedback?.blockReason || body?.candidates?.[0]?.finishReason;
    return { blocked: true, blockReason };
  }

  mkdirSync("public/user-media", { recursive: true });
  const id = createHash("sha256").update(`${slideText}-${attempt}-${Date.now()}-${Math.random()}`).digest("hex").slice(0, 12);
  const rawFile = `public/user-media/ai-${id}.img`;
  const bytes = Buffer.from(b64, "base64");
  writeFileSync(rawFile, bytes);
  const type = imageType(rawFile);
  if (!type) {
    return { error: "downloaded data is not a recognized image type" };
  }
  const named = rawFile.replace(/\.img$/, `.${type === "jpeg" ? "jpg" : type}`);
  writeFileSync(named, bytes);

  const size = imageSize(named);
  if (!size || Math.max(size.width, size.height) < 1080 || size.width * size.height < 700000) {
    return { error: `generated image too small (${size ? `${size.width}x${size.height}` : "unreadable"})` };
  }

  return { named };
}

export async function generateAIImage(topic, slideText) {
  if (!GEMINI_KEY) {
    console.error(`   ⚠ generateAIImage(${topic}): no GEMINI_API_KEY/GOOGLE_API_KEY configured`);
    return null;
  }
  const first = await attemptGenerateAIImage(topic, slideText, aiImagePrompt(topic, slideText, 1), 1);
  if (first.error) {
    console.error(`   ⚠ generateAIImage(${topic}): attempt 1 — ${first.error}`);
    return null;
  }
  let named = first.named;
  if (!named) {
    if (!first.blocked) return null; // unreachable given the branches above, kept defensive
    console.error(`   ⚠ generateAIImage(${topic}): attempt 1 blocked${first.blockReason ? ` (${first.blockReason})` : ""} — retrying with a genuinely different, brand-neutral prompt`);
    const second = await attemptGenerateAIImage(topic, slideText, aiImagePrompt(topic, slideText, 2), 2);
    if (second.error) {
      console.error(`   ⚠ generateAIImage(${topic}): attempt 2 — ${second.error}`);
      return null;
    }
    if (!second.named) {
      console.error(`   ⚠ generateAIImage(${topic}): attempt 2 also blocked${second.blockReason ? ` (${second.blockReason})` : ""} — giving up on AI generation for this slide`);
      return null;
    }
    named = second.named;
  }

  return {
    photo: named,
    sourceUrl: `ai-generated:${GEMINI_IMAGE_MODEL}`,
    sourceType: "ai-generated",
    alt: `تصویر تولیدشده با هوش مصنوعی برای «${slideText}»`,
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
    if (!found) continue; // neither a real photo nor a generated one — left empty
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
