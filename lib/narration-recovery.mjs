// Bounded, private repairs for words the selected Persian TTS voice has
// already demonstrated it cannot read reliably.  This is deliberately a
// small allow-list: the system may clarify a spoken phrasing, but may never
// invent facts, alter a number, or rewrite a user's meaning just to make ASR
// pass.  The on-screen text is never changed by this module.
//
// Three independent mechanisms live in this file, tried in this order by
// german-lesson-build.mjs's Recovery Loop (owner directive 2026-09-13:
// check TTS pronunciation before reaching for a wording change):
//   - recoverSpokenLine(): the ORIGINAL, production, daily-pipeline repair
//     (music/plan-voice.mjs) — a fixed word→word allow-list, single-token,
//     no network calls. Do not remove or change its behavior casually; it
//     is load-bearing for the daily TikTok/Instagram pipeline.
//   - proposePronunciationFix()/patchPronunciationTable(): Tier 1 for the
//     German-lesson Recovery Loop. Extends lib/pronounce.mjs's existing,
//     already-precedented PERSIAN_TTS_FIXES pattern (10+ entries: «حسابت»→
//     «حسابِت», «پیامت»→«پیامِت», …) — an unmarked possessive enclitic ـت on
//     a stem this voice reads as a different word. Deterministic, no LLM,
//     changes only the SOUND (a diacritic) never the word or its meaning.
//     It is a guess about WHY the word fails, not a certainty — a wrong
//     guess (a genuine ت-final word that only looks like this pattern)
//     just fails Narration QC again and Tier 2 below takes over, so the
//     QC gate is what makes trying this safe to automate.
//   - rewordPersistentWord()/patchSourceText(): Tier 2, the fallback for
//     when no known pronunciation pattern applies (or Tier 1 didn't fix
//     it). Production case: a1-17-adjectives' bare word «بد» failed
//     Narration QC on every single independent synthesis attempt across
//     two full builds — a genuine word-specific TTS/ASR mismatch, not
//     synthesis noise. Calls an LLM to reword a whole sentence, so its
//     result is validated, not trusted: it must stay Persian, similar
//     length, and must no longer contain the failing word. It only ever
//     proposes different Persian WORDING for the spoken line — never asked
//     to touch a German (`de`) clip's actual vocabulary pronunciation.
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
// while using a shorter, Persian-native phrase.  Add an entry only after an
// actual rejected take has been reviewed; broad phonetic guessing is unsafe.
const SAFE_TOKEN_REWRITES = new Map([
  ["نریشن", "صدای خودکار"],
  ["میکروفون", "مایک"],
  ["پریویو", "پیش نمایش"],
  ["پرویو", "پیش نمایش"],
  ["preview", "پیش نمایش"],
  ["microphone", "مایک"],
  ["ریلز", "ریل"],
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

// Precedent in lib/pronounce.mjs's PERSIAN_TTS_FIXES: 10+ entries, all for
// the enclitic ـت (your ___) landing unmarked on a stem, e.g. «حسابت» →
// «حسابِت», «پیامت» → «پیامِت», «خریدت» → «خریدِت». Other possessive
// enclitics (ش/م/مان/تان/شان) have no such precedent here, so this stays
// scoped to ـت only rather than guessing a pattern nobody has verified.
const KASRA = "ِ";

/**
 * Does `text` contain `word` as a whole word, ignoring diacritics on either
 * side?
 *
 * Why this exists, from production (a1-18-shopping chained attempt 2,
 * 2026-09-13): Narration QC reports the fault word from the SPOKEN copy,
 * which lib/pronounce.mjs has already marked up — it reported «خریدِت», with
 * the kasra. The narration line itself still reads «خریدت», unmarked, because
 * the pronunciation table only ever rewrites the private spoken copy. A plain
 * string match between the two can therefore never succeed, so Tier 2 found
 * no line to reword, returned null, and recovery stopped — with the majority
 * rule having correctly identified a real persistent word moments earlier.
 * The pronunciation fix had silently disabled the reword tier.
 */
export function containsWord(text, word) {
  const bare = (value) => String(value || "").replace(DIACRITICS, "");
  const needle = bare(word).trim();
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`, "u").test(bare(text));
}

/**
 * Propose a Tier-1 (pronunciation-only) fix for a persistently-failing
 * word, following lib/pronounce.mjs's own established convention. Returns
 * null when the word doesn't look like this specific pattern (too short,
 * already diacritized, or doesn't end in the enclitic) — never a forced
 * guess for a shape this convention hasn't actually covered.
 * @returns {{pattern:string, fixed:string}|null}
 */
export function proposePronunciationFix(word) {
  const w = String(word || "");
  // A 2-letter stem is where this breaks: «پست» (post, a loanword — already
  // its own, different, DAMMA fix in PERSIAN_TTS_FIXES) has the same shape
  // as a hypothetical 2-letter stem + enclitic, and there is no way to tell
  // them apart from spelling alone. Every real precedent in this project's
  // PERSIAN_TTS_FIXES has a stem of 3+ letters («پیج» is the shortest), so
  // the length floor is set there rather than guessed narrower or wider.
  if (w.length < 4 || !w.endsWith("ت") || w.endsWith("‌ت")) return null;
  if (/[ً-ٰ]/.test(w)) return null; // already carries a diacritic — not this module's guess to make
  const stem = w.slice(0, -1);
  if (stem.endsWith("ت")) return null; // native Arabic/Persian ت-final word (e.g. «ملت», «دقت») doubling the letter would misspell it, not just mispronounce it
  return { pattern: w, fixed: `${stem}${KASRA}ت` };
}

/**
 * Persist a Tier-1 fix into lib/pronounce.mjs's PERSIAN_TTS_FIXES table so
 * it applies to every future build, not just the one in memory right now.
 * Refuses to guess at the array's shape beyond finding its known opening
 * line; returns false (never throws) if that line isn't found or the
 * pattern is already present, so a caller can fall back to Tier 2 cleanly.
 * @returns {boolean} whether the file was patched
 */
export function patchPronunciationTable(pattern, fixed, file = "lib/pronounce.mjs") {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    return false;
  }
  if (content.includes(`["${pattern}", "${fixed}"]`)) return false; // already there — nothing to add
  const marker = "const PERSIAN_TTS_FIXES = [";
  const at = content.indexOf(marker);
  if (at === -1) return false;
  const insertAt = at + marker.length;
  const line = `\n    // Recovery Loop auto-fix: «${pattern}» persistently failed Narration QC — same unmarked-possessive-ـت pattern as the entries above.\n    ["${pattern}", "${fixed}"],`;
  writeFileSync(file, content.slice(0, insertAt) + line + content.slice(insertAt));
  return true;
}

/**
 * Which word(s) a cycle's failures actually blame, given every attempt in
 * that cycle. Extracted and exported so the rule can be tested against real
 * recorded failure history instead of only inside a live build.
 *
 * The rule was "present in EVERY attempt", and production proved that too
 * strict: a1-18-shopping's chained attempt 1 (2026-09-13,
 * .german-recovery-exhausted.json) recorded
 *   attempt 1: است
 *   attempt 2: خریدِت، میخواهی، است
 *   attempt 3: خریدِت، میخواهی
 * — «خریدِت» and «میخواهی» each failed twice running, «است» twice, and the
 * intersection of all three was empty. recover() therefore called it noise
 * and stopped while a real, repeatedly-failing word was sitting right there.
 * That is the "stopped although a valid recovery path remained" behaviour the
 * owner rejected.
 *
 * So: a majority of the cycle's attempts, AND still failing in the most
 * recent one. The second clause matters — «است» also failed twice, but not
 * in the latest take, so rewording it would change a line that is currently
 * passing. One genuinely flaky attempt no longer hides a persistent word,
 * and a word that has already stopped failing is not touched.
 */
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
  if (/[a-zA-Z]/.test(rewritten)) return false; // must stay Persian
  if (rewritten.length < original.length * 0.5 || rewritten.length > original.length * 2) return false; // degenerate-length guard
  // Diacritic-insensitive for the same reason containsWord() is: the failing
  // word arrives marked up from the spoken copy, the rewriting is plain text.
  for (const word of persistentWords) {
    if (containsWord(rewritten, word)) return false; // the failing word must actually be gone
  }
  // A recovery phrase is not useful when the narrator's own preflight will
  // reject it later. Validate it here, before replacing the live entry or
  // patching a source file, so an LLM cannot turn one pronunciation repair
  // into a fresh build-stopping narration fault.
  if (narrationLineCheck(rewritten).length) return false;
  return true;
}

/**
 * @param {{sentence:string, persistentWords:string[], topic:string}} args
 * @returns {Promise<string|null>} a validated rewording, or null if no
 *   provider is configured, both failed, or the result didn't pass the
 *   plausibility checks above — never a guess presented as confident.
 */
export async function rewordPersistentWord({ sentence, persistentWords, topic }) {
  const prompt = rewordPrompt(sentence, persistentWords, topic);
  let rewritten = null;
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    try { rewritten = parseRewordVerdict(await askGemini(prompt)); } catch { /* fall through to Groq */ }
  }
  if (!rewritten && process.env.GROQ_API_KEY) {
    try { rewritten = parseRewordVerdict(await askGroq(prompt)); } catch { /* no provider answered */ }
  }
  if (!isPlausibleRewording(sentence, rewritten, persistentWords)) return null;
  return rewritten;
}

/**
 * Replace an exact, unique occurrence of `oldText` with `newText` in `file`
 * so a recovered wording survives the next build instead of only fixing the
 * clip in memory for this one render. Refuses to guess: 0 or 2+ occurrences
 * both return false rather than touching the wrong (or every) match.
 * @returns {boolean} whether the file was patched
 */
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
