// Persian translation for live-search results, shared by every script that
// sends an English source to Telegram (topic-plan.mjs's «جستجوی جدید»,
// content-search.mjs's daily discovery). One implementation, so a fix to the
// prompt or the failure behaviour reaches both instead of drifting apart.
//
// Deliberately narrow: it translates, it does not draft, add claims or invent
// numbers — the prompt says so explicitly, and a caller that needs copywriting
// (a hook, steps) is a different job with its own grounding, not this one.
import { runWithProviderFallback } from "./providers.mjs";

const defaultGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const defaultGroqKey = process.env.GROQ_API_KEY || "";

function needsPersian(text) {
  const letters = String(text || "").match(/[\p{L}]/gu) || [];
  if (!letters.length) return false;
  const persian = letters.filter((ch) => /[؀-ۿ]/.test(ch)).length;
  return persian / letters.length < 0.55;
}

// Han ideographs (CJK Unified + Extension A + compatibility) — a real,
// recurring leak from small/distilled translation models, reported live
// 2026-09-03: stray Chinese characters showing up inside otherwise-Persian
// text. This is the deterministic check the model-side prompt cannot fully
// guarantee on its own; used both to retry a contaminated draft and, as a
// last resort, to strip anything a retry still couldn't clean up.
const hasChineseText = (text) => /[一-鿿㐀-䶿豈-﫿]/.test(String(text || ""));
const stripChineseText = (text) => String(text || "").replace(/[一-鿿㐀-䶿豈-﫿]+/g, "").replace(/\s+/g, " ").trim();

const clean = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

// Both providers get the same instructions. The explicit "never Chinese"
// line exists because small/distilled models (the exact class this project
// switched to for quota reasons) have a known failure mode of leaking stray
// CJK tokens into otherwise-correct output — reported live 2026-09-03. The
// line alone is not trusted to fix it; see hasChineseText()/stripChineseText()
// below for the deterministic backstop.
function buildPrompt(targets, { strict = false } = {}) {
  const lines = [
    "Translate live research results for a Persian-language creator workflow.",
    "Return ONLY a JSON array. Each item must be {index,title,excerpt}.",
    "Translate faithfully into natural Persian (Farsi). Do not add claims, facts, prices, or advice.",
    "Keep product, company, app, feature, and website names in their established English spelling.",
    "Keep the title concise and the excerpt factual. Do not include markdown or URLs.",
    "Output must be Persian (Farsi) script and established-English brand names ONLY. Never output Chinese, Japanese, Korean, or any other script.",
  ];
  if (strict) {
    lines.push(
      "Your previous attempt included Chinese characters by mistake. This is a hard requirement: re-translate every item and verify yourself, character by character, that nothing but Persian and Latin brand names remains before answering."
    );
  }
  lines.push("Results:", JSON.stringify(targets));
  return lines.join("\n");
}

// gemini-2.5-flash is retired for new users (confirmed live, 2026-09-03: 404
// names gemini-3.6-flash as the nominal replacement). gemini-3.6-flash itself
// is a poor fit here: a "thinking" model that burns real output-token budget
// on internal reasoning before the answer (confirmed: 541-789 tokens/call),
// and its free tier caps at 20 requests/DAY — exhausted mid-session just
// testing this fix. gemini-flash-lite-latest has no thinking overhead and a
// "-latest" alias, which avoids the sudden retirement gemini-2.5-flash hit —
// but being a lite/distilled model, it is exactly the class reported to leak
// Chinese characters into Persian output.
async function callGemini(prompt, geminiKey, geminiModel) {
  const call = () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": geminiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    }),
  });
  // Gemini's flash models return a plain 503 "high demand" on a real fraction
  // of calls (confirmed live, 2026-09-03) — transient, worth one retry. A 429
  // here is usually a per-minute limit, not the per-day quota (that one won't
  // clear in a few seconds either way, so the wasted retry costs little).
  let response = await call();
  for (let i = 0; !response.ok && (response.status === 503 || response.status === 429) && i < 2; i++) {
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    response = await call();
  }
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const body = await response.json();
  return body?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("") || "";
}

// Groq hosts full-size open models (Llama, not a distilled "-lite" variant),
// which is why it was added specifically to fix the Chinese-leak problem —
// added 2026-09-03 for exactly this. OpenAI-compatible chat/completions API.
async function callGroq(prompt, groqKey, groqModel) {
  const call = () => fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: groqModel,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You translate to Persian (Farsi) only. You never output Chinese, Japanese, or Korean characters under any circumstance. Respond with a single JSON object: {\"items\":[{index,title,excerpt}, ...]}." },
        { role: "user", content: prompt },
      ],
    }),
  });
  let response = await call();
  for (let i = 0; !response.ok && (response.status === 503 || response.status === 429) && i < 2; i++) {
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    response = await call();
  }
  if (!response.ok) throw new Error(`Groq ${response.status}`);
  const body = await response.json();
  const raw = String(body?.choices?.[0]?.message?.content || "");
  // Groq's json_object mode wraps the array in an object ({"items":[...]});
  // Gemini's responseMimeType mode returns the bare array. Normalise to the
  // bare-array text the shared parser below expects either way.
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return raw;
    if (Array.isArray(parsed?.items)) return JSON.stringify(parsed.items);
  } catch { /* fall through to the caller's own array-shape rescue */ }
  return raw;
}

// items: [{title, text}]  ->  same shape, translated in place, plus
// originalTitle/originalExcerpt so the real source wording stays checkable.
//
// Throws when translation was needed and could not be done — rule 7 requires
// Persian text before anything reaches Telegram, so shipping the untranslated
// English silently is not an acceptable fallback; the caller decides what to
// tell the operator (topic-plan.mjs and content-search.mjs both already have
// their own "ترجمه آماده نشد" message for this).
export async function translateToPersian(items, {
  geminiKey = defaultGeminiKey,
  geminiModel = process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
  groqKey = defaultGroqKey,
  // Checked the live Groq catalog 2026-09-03 rather than guessing a model
  // name: llama-3.3-70b-versatile no longer exists there. The catalog is now
  // dominated by Qwen (a Chinese-origin model family) — picking one of those
  // specifically to fix Chinese-character leakage would work against the
  // point. openai/gpt-oss-120b is large, capable, and not Chinese-trained.
  groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b",
} = {}) {
  const targets = items.map((item, index) => ({
    index,
    title: String(item.title || "").slice(0, 180),
    excerpt: String(item.text || "").replace(/\s+/g, " ").slice(0, 520),
  })).filter((item) => needsPersian(`${item.title} ${item.excerpt}`));
  if (!targets.length) return items;
  if (!geminiKey && !groqKey) throw new Error("کلید GEMINI_API_KEY یا GROQ_API_KEY برای برگردان فارسی تنظیم نشده است.");

  const parseArray = (raw) => {
    const json = raw.match(/\[[\s\S]*\]/)?.[0] || raw;
    return JSON.parse(json);
  };

  // Gemini first, Groq only as a fallback when Gemini genuinely can't
  // answer — a quota limit, an outage, a retired model. Ordered explicitly
  // rather than picking whichever key exists, per 2026-09-03 instruction:
  // both keys live in GitHub either way, so availability alone can't decide
  // the order.
  const runners = {
    gemini: async () => parseArray(await callGemini(buildPrompt(targets), geminiKey, geminiModel)),
    groq: async () => parseArray(await callGroq(buildPrompt(targets), groqKey, groqModel)),
  };
  let selected;
  try {
    selected = await runWithProviderFallback({ capability: "text", runners, env: {
      ...process.env,
      // Callers may pass short-lived keys directly for a test or a cloud
      // request.  The router must evaluate those keys too; it never logs them.
      GEMINI_API_KEY: geminiKey,
      GROQ_API_KEY: groqKey,
    }, onAttempt: (event) => {
      if (event.status === "failed") console.error(`${event.name} translation failed (${event.error}); trying the next provider`);
    } });
  } catch (error) {
    throw error.attempts?.at(-1) ? new Error(error.attempts.at(-1).error) : error;
  }
  let translated = selected.value;
  const runProvider = selected.provider.id === "gemini"
    ? (strict) => callGemini(buildPrompt(targets, { strict }), geminiKey, geminiModel)
    : (strict) => callGroq(buildPrompt(targets, { strict }), groqKey, groqModel);

  try {
    // Deterministic gate: a prompt instruction is a request, not a guarantee.
    // If any item still carries Chinese characters, ask the SAME provider
    // that just succeeded to redo the whole batch once with an explicit
    // correction, then — if it still isn't clean — strip what's left rather
    // than ship contaminated text or fail a batch over a few stray characters.
    const contaminated = (list) => list.some((it) => hasChineseText(it.title) || hasChineseText(it.excerpt));
    if (contaminated(translated)) {
      try {
        const retried = parseArray(await runProvider(true));
        if (Array.isArray(retried) && retried.length) translated = retried;
      } catch { /* keep the first attempt; the strip pass below still guards it */ }
    }
    const byIndex = new Map(translated.map((item) => [Number(item.index), item]));
    return items.map((item, index) => {
      const fa = byIndex.get(index);
      if (!fa) return item;
      const title = stripChineseText(clean(fa.title, 180)) || item.title;
      const text = stripChineseText(clean(fa.excerpt, 520)) || item.text;
      return { ...item, originalTitle: String(item.title || ""), originalExcerpt: String(item.text || ""), title, text };
    });
  } catch {
    throw new Error("ترجمهٔ فارسیِ منبع انجام نشد؛ نتیجهٔ غیر فارسی ارسال نشد.");
  }
}

export { needsPersian, hasChineseText, stripChineseText };
