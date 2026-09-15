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
import { exaSearch, isRelevant, generateAIImage } from "./auto-image.mjs";
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
  // Same broadening shape as LAYER 3's Exa tiers below: the full phrase,
  // then its last two words, then its last one — never a no-op broadening
  // (each step is an actually shorter phrase). Confirmed live 2026-09-15:
  // episode 19's own-asset key "person asking for directions street" is a
  // four-word compound no stock library indexes verbatim (Pexels: 8 of 8
  // candidates rejected as not relevant), while its core two-word subject,
  // "asking directions", is exactly the kind of scene stock photography
  // actually has shots of. Applied to Pexels/Wikimedia too, not just Exa —
  // there was never a reason the single-shot query was layer-specific.
  const uniqueTiers = (list) => {
    const seen = new Set();
    return list.filter((p) => p && !seen.has(p) && seen.add(p));
  };
  const queryTiers = uniqueTiers([words.join(" "), words.slice(-2).join(" "), words.slice(-1).join(" ")]);

  // LAYER 1: Pexels (owner directive 2026-09-13). Primary for vocabulary
  // because it returns real photography under a licence that is actually
  // clear, where web-wide search results are not — and because Exa's
  // credits ran out mid-production and stopped delivery entirely. Tried
  // first, but not trusted more than any other source: its results go
  // through the same download, size and relevance checks below.
  for (const phrase of queryTiers) {
    const fromPexels = await findPexelsImage(phrase, label);
    if (fromPexels) return fromPexels;
  }

  // LAYER 2: Wikipedia/Wikimedia — the only source here that needs no key
  // and has no quota to exhaust, which is exactly why it sits below the two
  // stock libraries but above everything that can run out. German Wikipedia,
  // because the concept is a German word and its article is the one likeliest
  // to carry a photograph of the thing as it looks in German-speaking life.
  for (const phrase of queryTiers) {
    const fromWikimedia = await findWikimediaImage(phrase, label);
    if (fromWikimedia) return fromWikimedia;
  }

  // LAYER 3: Exa. Kept, not deleted — it is a genuinely different index,
  // and a second real-photo source costs nothing when the first found
  // nothing. (On the app-feature pipeline it is not merely a second source
  // but the only one that can prove a UI claim; see lib/pexels-image.mjs.)
  const configured = process.env.EXA_API_KEY
    && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY);

  if (configured) {
    for (const phrase of queryTiers) {
      const found = await attempt(`${phrase} photo`, phrase, label);
      if (found) return found;
    }
  }

  // LAW 7 layer 4 (PROJECT_RULES.md rule 39's exception, restated for the
  // vocabulary pipeline by owner directive 2026-09-15): every real search
  // above genuinely failed — so generate a labelled AI image of the concept
  // rather than stopping the build outright. This layer was already written
  // into PROJECT_RULES.md's Appendix Six (step 4, "Gemini") when LAW 7 was
  // first drafted 2026-09-13, but never actually wired into this function —
  // only own-asset and a hard stop existed in code. That gap is what
  // silently killed episode 19 (a1-19-directions) on 2026-09-15: Pexels and
  // Wikimedia both ran and found nothing relevant for "Wo ist...?", Exa was
  // unconfigured, no own asset existed, and the build stopped even though
  // rule 39's own fallback was always meant to apply here too.
  const ai = await generateAIImage(query, label || query);
  if (ai) {
    console.error(`   ℹ LAW 7 layer 4: no real photo found — using an AI-generated, labelled image for «${query}»`);
    return ai;
  }

  // LAW 7 layer 5 (PROJECT_RULES.md, owner amendment 2026-09-13): AI
  // generation is also unavailable or failed — fall back to one of OUR OWN
  // licensed photographs of the thing this word means. Returns null (→ the
  // caller's hard stop, LAW 7 layer 6) when no verified own asset covers
  // this word either: a missing photo only stops the build once every
  // sanctioned layer — real search, AI generation, and our own licensed
  // archive — has genuinely been tried.
  const own = ownRealAsset(ownAssetKey || query, label);
  if (own) {
    console.error(`   ℹ LAW 7 layer 5: no live image source available — using our own licensed photo for «${ownAssetKey || query}»: ${own.photo}`);
    return own;
  }
  // Every layer above is now loud about its own rejections, but nothing said
  // how FAR a word got before the build stopped. news-scan #254 (2026-09-13)
  // failed on «Was kostet das?» after the narration finally passed, and the
  // only clue was the caller's own «هیچ عکس ... پیدا نشد» — which cannot
  // distinguish "Exa was never configured" from "Exa answered and every photo
  // was refused". This line names the layers that actually ran.
  console.error(`   ✗ findLessonImage(«${query}»): all layers exhausted — Pexels✓ran Wikimedia✓ran Exa${configured ? "✓ran" : "✗skipped (needs EXA_API_KEY + a judge key)"} AI✓ran ownAsset✗none for «${ownAssetKey || query}»`);
  return null;
}
