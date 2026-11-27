// Creates an editable tutorial draft from a topic that the creator supplied in
// Telegram. The Worker forwards the raw text; this file turns it into the
// existing editorial-gate format.  Explicit creator steps always win.  If the
// creator sends only a topic, the configured text provider expands it
// into a *reviewable* draft — never a render or publication.
//
// Two input shapes are genuinely supported:
//   1. "title|hook|step1|step2..." — full control, unchanged since this file
//      was written.
//   2. Numbered or dashed steps in one line — "۱. قلاب اینجا ۲. گام اول
//      ۳. گام دوم" — because by the time this script runs, GitHub Actions'
//      own "Read commands" step has already replaced every real newline with
//      a space (`tr '\r\n' ' '`, telegram.yml), so a message the creator typed
//      as separate lines in Telegram is indistinguishable here from one typed
//      as a single line. Numbered markers are the one structural cue that
//      survives that flattening, so they are what this parses.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { replyOnFailure } from "./lib/fail-soft.mjs";
import { loadEnv } from "./lib/telegram.mjs";
import { stripChineseText } from "./lib/translate-fa.mjs";

replyOnFailure();

process.chdir(dirname(fileURLToPath(import.meta.url)));
const clean = (value, max = 180) => String(value || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const raw = process.argv.slice(2).join(" ").trim();
if (!raw) throw new Error("موضوع یا متن ویدیو را بفرستید.");
// GitHub Actions sets process.env directly from repo secrets, so this alone
// was enough in the cloud — but every other script in this project also
// falls back to a locally loaded .env (research.mjs, news-scan.mjs, demand.mjs,
// bot.mjs, content-search.mjs, topic-plan.mjs). This one didn't, so a key
// added only to .env for local testing was invisible to it.
const env = loadEnv();
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_API_KEY || "";

// Splits "متن قلاب ۱. اول ۲) دوم - سوم" into a lead line plus its numbered/
// dashed segments. Matches a digit run (Persian or Latin) followed by one of
// the separators creators actually use, or a plain leading dash for a simple
// bullet list.
const NUMBERED = /(?:^|\s)(?:[0-9۰-۹]+\s*[.\-)、]\s*|-\s+)/gu;

function numberedShape(text) {
  const hits = [...text.matchAll(NUMBERED)];
  if (hits.length < 2) return null; // need at least two real steps
  const steps = [];
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index + hits[i][0].length;
    const end = i + 1 < hits.length ? hits[i + 1].index : text.length;
    const seg = clean(text.slice(start, end));
    if (seg) steps.push(seg);
  }
  if (steps.length < 2) return null;
  // Whatever came before the first marker is the topic line — the natural
  // hook. A list with nothing before its first marker still needs an
  // opening line, so that first step doubles as the hook in that case.
  const lead = clean(text.slice(0, hits[0].index));
  return { hook: lead || steps[0], steps };
}

let parts = raw.split("|").map((x) => clean(x)).filter(Boolean);
let title, hook, stepText;

async function draftWithFreeAi(prompt) {
  const response = await fetch("https://api.apisfreellm.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model: "free-ai",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1200,
      stream: false,
    }),
  }).catch(() => null);
  if (!response?.ok) {
    const code = response ? ` (${response.status})` : "";
    throw new Error(`سرویس free-ai در دسترس نیست${code}. دوباره تلاش کنید یا عنوان | قلاب | گام‌ها را بفرستید.`);
  }
  const body = await response.json();
  return body?.choices?.[0]?.message?.content || "";
}

async function draftWithGemini(prompt) {
  const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  const call = () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": geminiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.25, responseMimeType: "application/json" } }),
  });
  let response = await call();
  for (let i = 0; !response.ok && (response.status === 503 || response.status === 429) && i < 2; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
    response = await call();
  }
  if (!response.ok) throw new Error("پیش‌نویس هوش مصنوعی آماده نشد؛ موضوع را با گام‌ها بفرستید یا دوباره تلاش کنید.");
  const body = await response.json();
  return body?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("") || "";
}

async function draftBareTopic(topic) {
  const prompt = [
    "You prepare a Persian (Farsi) short-video DRAFT for a human creator to review.",
    "Return ONLY valid JSON: {title,hook,steps}.",
    "The creator supplied only this topic: " + JSON.stringify(clean(topic, 300)),
    "Write natural Persian. title: at most 12 words. hook: 7-17 words, spoken, curiosity-led.",
    "The hook must not name the app, product, company, brand, or reveal the answer.",
    "Give 2 to 4 short, practical steps. Do not invent statistics, prices, features, UI paths, or guarantees.",
    "Do not promise views, virality, sales, followers, or income. Keep established product names in English only when essential.",
  ].join("\n");
  const provider = process.env.GAPMEDIA_DRAFT_PROVIDER || env.GAPMEDIA_DRAFT_PROVIDER || "free-ai";
  if (provider !== "free-ai" && provider !== "gemini") throw new Error("GAPMEDIA_DRAFT_PROVIDER must be free-ai or gemini.");
  if (provider === "gemini" && !geminiKey) throw new Error("برای انتخاب Gemini باید GEMINI_API_KEY را تنظیم کنید یا از free-ai استفاده کنید.");
  const answer = provider === "gemini" ? await draftWithGemini(prompt) : await draftWithFreeAi(prompt);
  const json = answer.match(/\{[\s\S]*\}/)?.[0] || answer;
  let drafted;
  try { drafted = JSON.parse(json); }
  catch { throw new Error("پاسخ پیش‌نویس قابل‌خواندن نبود؛ دوباره تلاش کنید."); }
  // gemini-flash-lite-latest is the same class of distilled model reported
  // (2026-09-03) to leak stray Chinese characters into Persian output — a
  // deterministic strip here guarantees it can never reach the draft,
  // regardless of what the model does, the same guard translateToPersian()
  // in lib/translate-fa.mjs applies to search-result translation.
  const nextTitle = stripChineseText(clean(drafted?.title || topic, 160));
  const nextHook = stripChineseText(clean(drafted?.hook, 180));
  const nextSteps = Array.isArray(drafted?.steps)
    ? drafted.steps.map((item) => stripChineseText(clean(item, 180))).filter(Boolean).slice(0, 4)
    : [];
  if (!nextHook || nextSteps.length < 2) throw new Error("پیش‌نویس کامل نبود؛ دوباره تلاش کنید یا گام‌ها را خودتان بفرستید.");
  return { title: nextTitle, hook: nextHook, steps: nextSteps };
}

if (parts.length >= 3) {
  [title, hook, ...stepText] = parts;
} else {
  const shape = numberedShape(raw);
  if (shape) {
    title = shape.hook; hook = shape.hook; stepText = shape.steps;
  } else if (parts.length >= 2) {
    // Exactly one "|" used: read as hook|step, no separate title.
    [hook, ...stepText] = parts; title = hook;
  } else {
    const drafted = await draftBareTopic(raw);
    ({ title, hook, steps: stepText } = drafted);
  }
}
const category = /(انستا|instagram|reels|ریلز|edits)/i.test(title) ? "instagram"
  : /(تیک\s*تاک|tiktok|tik\s*tok)/i.test(title) ? "tiktok" : "tools";
const generated = {
  id: `creator-topic-${Date.now()}`,
  platform: category,
  feature: title,
  title,
  hook: { ask: hook, l1: hook, l2: "تا پایان، گام‌ها را ببین" },
  payoff: "این پیش‌نویس بر اساس موضوعی است که خودت فرستادی؛ قبل از ساخت آن را بررسی و ادیت کن.",
  outroAsk: "دوست داری ویدیوی بعدی دربارهٔ چه موضوعی باشد؟",
  tgTitle: `🎬 ${title}\n\n#viral #ContentCreator`,
  tips: stepText.slice(0, 4).map((head, i) => ({ head, icon: ["target", "play", "chart", "pen"][i] || "target" })),
};
const draft = {
  kind: "tutorial", featureId: generated.id, generated,
  hook: generated.hook.ask, steps: null, updatedAt: new Date().toISOString(),
};
writeFileSync(".content-draft.json", JSON.stringify(draft, null, 2) + "\n");
const result = spawnSync(process.execPath, ["content-draft.mjs", "--preview"], { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
