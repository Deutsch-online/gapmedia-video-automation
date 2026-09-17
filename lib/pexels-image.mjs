// Pexels as the primary real-photo source for the German A1 vocabulary
// series (owner directive 2026-09-13, after Exa hit 402 / credits exhausted
// and stopped delivery repo-wide).
//
// Why Pexels is lawful HERE and not everywhere:
//   A vocabulary slide has to prove what a WORD MEANS. A real photograph of
//   a supermarket checkout genuinely depicts «Ich nehme das» regardless of
//   who took it, so real stock photography is real evidence for this claim —
//   the same reasoning that already admits LAW 7's own licensed photos.
//   Pexels is additionally licence-clean (free for commercial use, no
//   attribution required), which web-wide search results are not.
//
//   It is NOT a replacement for lib/auto-image.mjs's findRealImage() on the
//   app-feature pipeline. There the claim is "this app has this feature and
//   it looks like this", and no stock photograph can establish that — a
//   photo of someone holding a phone is precisely the «تصویرسازی عمومی»
//   PROJECT_RULES.md rule 41 and LAW 7's MUST NOT clause forbid. Those
//   videos keep their official-screenshot sourcing.
//
// Deliberate differences from the snippet this was specified from:
//   · orientation=portrait, not landscape. These are 9:16 videos and
//     german-lesson-build.mjs frames vocabulary photos at photoAspect 0.75.
//     Asking for landscape would fetch the wrong shape for every slide.
//   · the largest available src, not `src.large`. Every image still has to
//     clear the project-wide 1080px/700k-pixel floor, and the mid-size
//     renditions are narrower than that — selecting `large` would have
//     failed Visual QC on essentially every photo it fetched.
//   · candidates are checked, not assumed: photos[0] is not taken on faith.
//     Each is downloaded, type- and size-verified, and put through the same
//     LLM relevance gate every other image source in this project passes.
//   · no key means no call. An absent PEXELS_KEY returns null rather than
//     sending `Authorization: undefined` and reading a 401 as "no results".
import { firstVerifiedCandidate, dedupe, withTimeout } from "./image-candidates.mjs";

// Largest first: whichever the API actually returns, the biggest rendition
// is the one with a chance of clearing the floor above. Measured after
// download either way, so an unexpected shape here cannot let a small image
// through — it just falls to the next candidate.
const SRC_PREFERENCE = ["original", "large2x", "large", "medium"];

const pickSource = (src) => {
  if (!src || typeof src !== "object") return null;
  for (const key of SRC_PREFERENCE) {
    if (typeof src[key] === "string" && src[key]) return src[key];
  }
  return null;
};

/**
 * Search Pexels for real photographs of a concept.
 * @returns {Promise<Array<{image:string, title:string, url:string, credit:string}>>}
 * @throws when the API answers non-2xx, so the caller can log the real
 *   status (402/429/401) instead of a silent empty result.
 */
export async function pexelsSearch(query, { perPage = 8 } = {}) {
  const key = process.env.PEXELS_KEY || process.env.PEXELS_API_KEY || "";
  if (!key) return [];
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`;
  const res = await fetch(url, withTimeout({ headers: { Authorization: key } }));
  if (!res.ok) throw new Error(`Pexels ${res.status}`);
  const data = await res.json();
  return dedupe((data?.photos || []).map((p) => ({
    image: pickSource(p?.src),
    title: String(p?.alt || "").slice(0, 160),
    url: String(p?.url || ""),
    credit: String(p?.photographer || ""),
  })));
}

/**
 * One verified real photograph for a vocabulary concept, or null.
 *
 * @param {string} query   English search phrase for the concept itself
 * @param {string} label   the Persian meaning, for the relevance judgement
 * @returns {Promise<{photo:string, sourceUrl:string, sourceType:"labelled-explainer", alt:string}|null>}
 */
export async function findPexelsImage(query, label, quality) {
  let hits = [];
  try {
    hits = await pexelsSearch(query);
  } catch (e) {
    console.error(`   ⚠ findPexelsImage(${query}): ${e.message}`);
    return null;
  }
  return firstVerifiedCandidate(hits, { prefix: "pexels", query, label, provider: "Pexels", quality });
}
