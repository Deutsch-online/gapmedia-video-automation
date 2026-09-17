// Wikimedia/Wikipedia — the only image source in this project that needs NO
// KEY AT ALL (owner directive 2026-09-13, the "$0 forever, no card" stack).
//
// Endpoint shape is the owner-supplied one, extended from list=search to
// generator=search so the same single request also returns each matching
// article's lead image:
//   https://de.wikipedia.org/w/api.php?action=query&generator=search
//     &gsrsearch=<term>&prop=pageimages&piprop=original&format=json
// One request, no key, no quota to exhaust — which is the whole point after
// Exa died at 402 and Gemini at 429 on the same morning.
//
// Scope, identical to the other stock providers and for the same reason:
// VOCABULARY only. A freely-licensed photograph of bread depicts «Brot» as
// truthfully as any paid one, so it is real evidence for what a word means.
// It is never evidence for an app-feature claim ("this app has this feature
// and it looks like this"), which no photograph of a real-world object can
// establish — that would be the «تصویرسازی عمومی» PROJECT_RULES.md rule 41
// forbids.
//
// German Wikipedia deliberately: the concept being illustrated is a German
// word, and de.wikipedia's article for it is the one most likely to carry a
// photograph of the thing as it actually looks in German-speaking life.
import { firstVerifiedCandidate, dedupe, withTimeout } from "./image-candidates.mjs";

const API = "https://de.wikipedia.org/w/api.php";

/**
 * @returns {Promise<Array<{image:string,title:string,url:string,credit:string}>>}
 * @throws on a non-2xx answer, so a real outage stays visible in the logs
 *   instead of silently looking like "nothing found" — the distinction that
 *   made the Exa 402 diagnosable.
 */
export async function wikimediaSearch(query, { limit = 8 } = {}) {
  const url = `${API}?action=query&generator=search`
    + `&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}&gsrnamespace=0`
    + `&prop=pageimages&piprop=original&format=json&origin=*`;
  const res = await fetch(url, withTimeout({
    // Wikimedia asks every API client to identify itself; an anonymous
    // high-volume caller is the one they rate-limit first.
    headers: { "user-agent": "GapMedia-LessonBuilder/1.0 (github.com/takrun00-hue/afghanfollower-videos)" },
  }));
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  const data = await res.json();
  const pages = Object.values(data?.query?.pages || {});
  return dedupe(pages.map((p) => ({
    // Only the article's own lead image counts. A page with none is not a
    // candidate — there is nothing to show — rather than something to
    // substitute for.
    image: typeof p?.original?.source === "string" ? p.original.source : "",
    title: String(p?.title || "").slice(0, 160),
    url: p?.title ? `https://de.wikipedia.org/wiki/${encodeURIComponent(String(p.title).replace(/ /g, "_"))}` : "",
    credit: "Wikimedia",
  })));
}

/**
 * One verified real photograph for a vocabulary concept, or null.
 * @param {string} query  search phrase for the concept itself
 * @param {string} label  the Persian meaning, for the relevance judgement
 */
export async function findWikimediaImage(query, label, quality) {
  let hits = [];
  try {
    hits = await wikimediaSearch(query);
  } catch (e) {
    console.error(`   ⚠ findWikimediaImage(${query}): ${e.message}`);
    return null;
  }
  return firstVerifiedCandidate(hits, { prefix: "wikimedia", query, label, provider: "Wikipedia", quality });
}
