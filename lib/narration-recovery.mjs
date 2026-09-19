// Bounded, private repairs for words the selected Persian TTS voice has
// already demonstrated it cannot read reliably. This is deliberately a
// small allow-list: the system may clarify a spoken phrasing, but may never
// invent facts, alter a number, or rewrite a user's meaning just to make ASR
// pass. The on-screen text is never changed by this module.
//
// Three independent mechanisms live in this file, tried in this order by
// german-lesson-build.mjs's Recovery Loop (owner directive 2026-09-13:
// check TTS pronunciation before reaching for a wording change):
// - recoverSpokenLine(): the ORIGINAL, production, daily-pipeline repair
// (music/plan-voice.mjs) — a fixed word→word allow-list, single-token,
// no network calls. Do not remove or change its behavior casually; it
// is load-bearing for the daily TikTok/Instagram pipeline.
// - proposePronunciationFix()/patchPronunciationTable(): Tier 1 for the
// German-lesson Recovery Loop. Extends lib/pronounce.mjs's existing,
// already-precedented PERSIAN_TTS_FIXES pattern (10+ entries: «حسابت»→
// «حسابِت», «پیامت»→«پیامِت», …) — an unmarked possessive enclitic ـت on
// a stem this voice reads as a different word. Deterministic, no LLM,
// changes only the SOUND (a diacritic) never the word or its meaning.
// It is a guess about WHY the word fails, not a certainty — a wrong
// guess (a genuine ت-final word that only looks like this pattern)
// just fails Narration QC again and Tier 2 below takes over, so the
// QC gate is what makes trying this safe to automate.
// - rewordPersistentWord()/patchSourceText(): Tier 2, the fallback for
// when no known pronunciation pattern applies (or Tier 1 didn't fix
// it). Production case: a1-17-adjectives' bare word «بد» failed
// Narration QC on every single independent synthesis attempt across
// two full builds — a genuine word-specific TTS/ASR mismatch, not
// synthesis noise. Calls an LLM to reword a whole sentence, so its
// result is validated, not trusted: it must stay Persian, similar
// length, and must no longer contain the failing word. It only ever
// proposes different Persian WORDING for the spoken line — never asked
// to touch a German (`de`) clip's actual vocabulary pronunciation.
import { readFileSync, writeFileSync } from "node:fs";
import { askGemini, askGroq } from "./auto-image.mjs";
import { narrationLineCheck } from "./voice-settings.mjs";

const DIACRITICS = /[ً-ْٰـ]/g;
const EDGE = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

const key = (value) => String(value || "")
 .replace(DIACRITICS, "")
 .replace(/[‌ ]/g, " ")
 .replace(EDGE, "")
 .toLowerCase();

// Each replacement was selected because it keeps the same practical meaning
// while using a shorter, Persian-native phrase. Add an entry only after an
// actual rejected take has been reviewed; broad phonetic guessing is unsafe.
const SAFE_TOKEN_REWRITES = new Map([
  ["نریشن", "صدای خودکار"],
  ["میکروفون", "مایک"],
  ["پریویو", "پیش نمایش"],
  ["پرویو", "پیش نمایش"],
  ["preview", "پیش نمایش"],
  ["microphone", "مایک"],
  ["ریلز", "ریل"],
  // --- German A1-23 hotfix (2026-09-17): FaridNeural misreads these ---
  // QC logs: میسازی→میصدی، فعل→فل/انفه، یعنی→الینی/یانی، رفتن→رفتان، آمدن→اومدن، دیدن→دیدم/ندیده
  ["میسازی", "یاد میگیری"],
  ["می‌سازی", "یاد میگیری"],
  ["فعل", "واژه"],
  ["یعنی", "به معنای"],
  ["رفتن", "حرکت"],
  ["آمدن", "رسیدن"],
  ["دیدن", "نگاه"],
  ["شنیدن", "شنیدن"],
  ["انجام‌دادن", "انجام دادن"],
  ["انجامدادن", "انجام دادن"],
]);

/**
 * Return one conservative spoken-only repair for the ASR-reported word.
 * `wordIndex` is one-based, matching music/voice-qc.mjs's safe diagnostic.
 */
export function recoverSpokenLine(text, wordIndex) {
  const tokens = String(text || "").trim().split(/\s+/).filter(Boolean);
  const index = Number(wordIndex) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= tokens.length) {
    return { changed: false, text: String(text || ""), reason: "no-target-token" };
  }
  const replacement = SAFE_TOKEN_REWRITES.get(key(tokens[index]));
  if (!replacement) {
    return { changed: false, text: String(text || ""), reason: "no-safe-rewrite" };
  }
  tokens[index] = replacement;
  return { changed: true, text: tokens.join(" "), reason: "approved-spoken-rewrite" };
}

const KASRA = "ِ";

export function containsWord(text, word) {
  const bare = (value) => String(value || "").replace(DIACRITICS, "");
  const needle = bare(word).trim();
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`, "u").test(bare(text));
}

export function proposePronunciationFix(word) {
  const w = String(word || "");
  if (w.length < 4 || !w.endsWith("ت") || w.endsWith("‌ت")) return null;
  if (/[ً-ٰ]/.test(w)) return null;
  const stem = w.slice(0, -1);
  if (stem.endsWith("ت")) return null;
  return { pattern: w, fixed: `${stem}${KASRA}ت` };
}

export function patchPronunciationTable(pattern, fixed, file = "lib/pronounce.mjs") {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    return false;
  }
  if (content.includes(`["${pattern}", "${fixed}"]`)) return false;
  const marker = "const PERSIAN_TTS_FIXES = [";
  const at = content.indexOf(marker);
  if (at === -1) return false;
  const insertAt = at + marker.length;
  const line = `\n // Recovery Loop auto-fix: «${pattern}» persistently failed Narration QC — same unmarked-possessive-ـت pattern as the entries above.\n ["${pattern}", "${fixed}"],`;
  writeFileSync(file, content.slice(0, insertAt) + line + content.slice(insertAt));
  return true;
}

export function persistentFaultWords(cycleFailures) {
  const lists = (cycleFailures || []).map((h) => h?.reason?.faultWords || []);
  if (!lists.length) return [];
  const latest = new Set(lists[lists.length - 1]);
  const threshold = Math.ceil(lists.length / 2);
  const counts = new Map();
  for (const list of lists) {
    for (const word of new Set(list)) counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
   .filter(([word, n]) => n >= threshold && latest.has(word))
   .map(([word]) => word);
}

function parseRewordVerdict(raw) {
  try {
    const match = String(raw || "").match(/\{[\s\S]*\}/);
    if (!match) return null;
    const value = JSON.parse(match[0]);
    return typeof value?.rewritten === "string" && value.rewritten.trim() ? value.rewritten.trim() : null;
  } catch {
    return null;
  }
}

function rewordPrompt(sentence, persistentWords, topic) {
  const words = persistentWords.join("، ");
  return `این جملهٔ فارسی، نریشن یک ویدیوی آموزشی است (موضوع: «${topic}»):
«${sentence}»
تشخیص گفتار خودکار (ASR) کلمهٔ «${words}» را در چند تلاش مستقل و جداگانه از سنتز صدای یکسان، هر بار به‌اشتباه شنیده — این یک ناسازگاری بین این صدای مصنوعی و همین کلمهٔ کوتاه است، نه یک تلفظ غلط واقعی در متن.
همین جمله را با معنی دقیقاً یکسان بازنویسی کن، طوری‌که کلمهٔ «${words}» به‌همین شکل کوتاه و مجزا در آن نیاید — شکل بلندتر یا صرف‌شدهٔ همان کلمه، یا مترادف دقیق آن، قابل قبول است. طول و لحن پرانرژی جمله را حفظ کن و هیچ مفهوم آموزشی دیگری را حذف نکن.
فقط یک JSON با همین یک کلید بده، بدون هیچ متن دیگر: {"rewritten": "جملهٔ بازنویسی‌شده"}`;
}

function isPlausibleRewording(original, rewritten, persistentWords) {
  if (!rewritten || rewritten === original) return false;
  if (/[a-zA-Z]/.test(rewritten)) return false;
  if (rewritten.length < original.length * 0.5 || rewritten.length > original.length * 2) return false;
  for (const word of persistentWords) {
    if (containsWord(rewritten, word)) return false;
  }
  if (narrationLineCheck(rewritten).length) return false;
  return true;
}

export async function rewordPersistentWord({ sentence, persistentWords, topic }) {
  const prompt = rewordPrompt(sentence, persistentWords, topic);
  let rewritten = null;
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    try { rewritten = parseRewordVerdict(await askGemini(prompt)); } catch {}
  }
  if (!rewritten && process.env.GROQ_API_KEY) {
    try { rewritten = parseRewordVerdict(await askGroq(prompt)); } catch {}
  }
  if (!isPlausibleRewording(sentence, rewritten, persistentWords)) return null;
  return rewritten;
}

export function patchSourceText(file, oldText, newText) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    return false;
  }
  if (content.split(oldText).length - 1 !== 1) return false;
  writeFileSync(file, content.replace(oldText, newText));
  return true;
}
