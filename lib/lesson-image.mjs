// Real, relevant lifestyle photos for the German A1 lesson series — a
// separate search shape from lib/auto-image.mjs's findRealImage(), which is
// tuned for app/product screenshots ("official screenshot OR interface OR
// product page OR press photo"). A vocabulary word like "die Mutter" or
// "Hallo" needs a real photo of the actual thing (a mother, people
// greeting), not a product page, so the search query and the relevance
// check below are written for that instead — same mechanical bar (real
// downloaded file, 1080px/700k-pixel floor) and the same LLM relevance gate
// (exaSearch/isRelevant, reused from lib/auto-image.mjs) as everywhere else
// real images are sourced in this project.
//
// Unlike rescuePackPhotos() (one shared photo for a whole pack), each
// vocabulary item gets its OWN search and its OWN photo — four different
// words need four different pictures, not one screenshot cropped four ways.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { imageType, imageSize } from "./media-guard.mjs";
import { exaSearch, isRelevant } from "./auto-image.mjs";
import { ownRealAsset } from "./own-assets.mjs";
import { findPexelsImage } from "./pexels-image.mjs";
import { findWikimediaImage } from "./wikimedia-image.mjs";

async function attempt(searchQuery, relevanceTopic, label) {
  let hits = [];
  try {
    hits = await exaSearch(searchQuery);
  } catch {
    return null;
  }
  mkdirSync("public/user-media", { recursive: true });
  for (const hit of hits.slice(0, 10)) {
    let bytes;
    try {
      const res = await fetch(hit.image);
      if (!res.ok) continue;
      bytes = Buffer.from(await res.arrayBuffer());
    } catch { continue; }

    const id = createHash("sha256").update(hit.image).digest("hex").slice(0, 12);
    const rawFile = `public/user-media/lesson-${id}.img`;
    writeFileSync(rawFile, bytes);
    const type = imageType(rawFile);
    if (!type) continue;
    const named = rawFile.replace(/\.img$/, `.${type === "jpeg" ? "jpg" : type}`);
    writeFileSync(named, bytes);

    const size = imageSize(named);
    if (!size || Math.max(size.width, size.height) < 1080 || size.width * size.height < 700000) continue;

    const candidate = { title: String(hit.title || "").slice(0, 160), url: hit.url, snippet: String(hit.text || "").slice(0, 260) };
    let relevant = false;
    try { relevant = await isRelevant(relevanceTopic, [label], candidate); } catch { relevant = false; }
    if (!relevant) continue;

    return { photo: named, sourceUrl: hit.url, sourceType: "labelled-explainer", alt: candidate.title || label };
  }
  return null;
}

/**
 * query: a short English/German search phrase for the concept itself
 *   (e.g. "mother and child", "two people shaking hands greeting").
 * label: the Persian meaning, used only for the relevance check's prompt.
 *
 * Tries progressively broader phrasings of the same query — confirmed live
 * 2026-09-08: a 3-word query ("friends waving goodbye") came back empty
 * twice running (once at 6 results checked, again at 3-of-3-words — i.e.
 * unchanged — after a first broadening attempt that only trimmed to the
 * first three words, which is a no-op on an already-3-word query). Genuine
 * broadening needs an actually shorter phrase each step, down to the last
 * one or two words, which tend to be the core, most commonly photographed
 * subject ("goodbye", "wave"). Never loosens the mechanical
 * (1080px/700k-pixel) or relevance bar — only widens what is searched for
 * and how many of Exa's results are checked (10, up from 6).
 */
export async function findLessonImage(query, label, ownAssetKey = "") {
  const words = query.split(/\s+/).filter(Boolean);

  // LAYER 1: Pexels (owner directive 2026-09-13). Primary for vocabulary
  // because it returns real photography under a licence that is actually
  // clear, where web-wide search results are not — and because Exa's
  // credits ran out mid-production and stopped delivery entirely. Tried
  // first, but not trusted more than any other source: its results go
  // through the same download, size and relevance checks below.
  const fromPexels = await findPexelsImage(words.join(" "), label);
  if (fromPexels) return fromPexels;

  // LAYER 2: Wikipedia/Wikimedia — the only source here that needs no key
  // and has no quota to exhaust, which is exactly why it sits below the two
  // stock libraries but above everything that can run out. German Wikipedia,
  // because the concept is a German word and its article is the one likeliest
  // to carry a photograph of the thing as it looks in German-speaking life.
  const fromWikimedia = await findWikimediaImage(words.join(" "), label);
  if (fromWikimedia) return fromWikimedia;

  // LAYER 3: Exa. Kept, not deleted — it is a genuinely different index,
  // and a second real-photo source costs nothing when the first found
  // nothing. (On the app-feature pipeline it is not merely a second source
  // but the only one that can prove a UI claim; see lib/pexels-image.mjs.)
  const configured = process.env.EXA_API_KEY
    && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY);

  if (configured) {
    const tried = new Set();
    const tiers = [words.join(" "), words.slice(-2).join(" "), words.slice(-1).join(" ")];
    for (const phrase of tiers) {
      if (!phrase || tried.has(phrase)) continue;
      tried.add(phrase);
      const found = await attempt(`${phrase} photo`, phrase, label);
      if (found) return found;
    }
  }

  // LAW 7 layer 3 (PROJECT_RULES.md, owner amendment 2026-09-13): live
  // sourcing is gone — Exa out of credits, Gemini out of quota, or neither
  // configured — so fall back to one of OUR OWN licensed photographs of the
  // thing this word means. Only reached after the search above genuinely
  // failed, never instead of it. Returns null (→ the caller's hard stop,
  // LAW 7 layer 4) when no verified own asset covers this word: a missing
  // photo still stops the build, it is never filled with something generic.
  const own = ownRealAsset(ownAssetKey || query, label);
  if (own) {
    console.error(`   ℹ LAW 7 layer 3: no live image source available — using our own licensed photo for «${ownAssetKey || query}»: ${own.photo}`);
    return own;
  }
  // Every layer above is now loud about its own rejections, but nothing said
  // how FAR a word got before the build stopped. news-scan #254 (2026-09-13)
  // failed on «Was kostet das?» after the narration finally passed, and the
  // only clue was the caller's own «هیچ عکس ... پیدا نشد» — which cannot
  // distinguish "Exa was never configured" from "Exa answered and every photo
  // was refused". This line names the layers that actually ran.
  console.error(`   ✗ findLessonImage(«${query}»): all layers exhausted — Pexels✓ran Wikimedia✓ran Exa${configured ? "✓ran" : "✗skipped (needs EXA_API_KEY + a judge key)"} ownAsset✗none for «${ownAssetKey || query}»`);
  return null;
}
