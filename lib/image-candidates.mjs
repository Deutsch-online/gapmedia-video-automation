// One place where a candidate image from ANY free stock provider is turned
// into a usable slide photo — or refused.
//
// Extracted when Pixabay joined Pexels (owner directive 2026-09-13, "all
// free APIs"): both providers return a list of {image, title, url}, and both
// then need the identical treatment — download, verify it is really an image,
// measure it against the project-wide 1080px/700k-pixel floor, and put it
// through the same LLM relevance judgement every other image source passes.
// Written once so a second provider cannot quietly ship with a weaker bar
// than the first.
//
// "Real photograph" is necessary, not sufficient: a stock library will
// happily return something only loosely associated with the search words,
// and an irrelevant real photo is still the «تصویر نامرتبط» PROJECT_RULES.md
// rule 41 forbids.
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { imageType, imageSize } from "./media-guard.mjs";
import { judgeRelevance, judgesAllCoolingOff } from "./auto-image.mjs";

const FETCH_TIMEOUT_MS = 20_000;
export const withTimeout = (init = {}, ms = FETCH_TIMEOUT_MS) => ({ ...init, signal: AbortSignal.timeout(ms) });

const MIN_LONG_SIDE = 1080;
const MIN_AREA = 700000;

/**
 * Download and verify candidates in order; return the first that passes
 * everything, or null.
 *
 * @param {Array<{image:string,title?:string,url?:string,credit?:string}>} hits
 * @param {{prefix:string, query:string, label:string, provider:string}} ctx
 * @returns {Promise<{photo:string, sourceUrl:string, sourceType:"labelled-explainer", alt:string}|null>}
 */
export async function firstVerifiedCandidate(hits, { prefix, query, label, provider }) {
  if (!hits?.length) {
    console.error(`   ⚠ ${provider}(«${query}»): the search returned no candidates at all`);
    return null;
  }
  mkdirSync("public/user-media", { recursive: true });

  // Why each candidate was refused. Until now this loop `continue`d silently
  // at five different points and returned a bare null, so the lesson build
  // could spend two minutes on four vocabulary words and report only
  // "هیچ عکس واقعی و مرتبطی ... پیدا نشد" — true, and impossible to act on. news-scan
  // #254 (2026-09-13) is exactly that: narration finally passed, then the
  // image layer failed with no output whatsoever from Pexels, Wikipedia or
  // Exa. The same counters findRealImage() already prints, for the same
  // reason. Diagnostic only: every rejection below is unchanged.
  const rejected = { download: 0, type: 0, size: 0, irrelevant: 0, unjudged: 0 };
  let bestSmall = null;
  let judgeWhy = "";
  let examined = 0;
  let judgeStopped = false;

  for (const hit of hits) {
    if (!hit?.image) continue;
    examined++;
    let bytes;
    try {
      const res = await fetch(hit.image, withTimeout());
      if (!res.ok) { rejected.download++; continue; }
      bytes = Buffer.from(await res.arrayBuffer());
    } catch { rejected.download++; continue; }

    const id = createHash("sha256").update(hit.image).digest("hex").slice(0, 12);
    const raw = `public/user-media/${prefix}-${id}.img`;
    writeFileSync(raw, bytes);
    const type = imageType(raw);
    if (!type) { rejected.type++; continue; }
    const named = raw.replace(/\.img$/, `.${type === "jpeg" ? "jpg" : type}`);
    writeFileSync(named, bytes);

    const size = imageSize(named);
    if (!size || Math.max(size.width, size.height) < MIN_LONG_SIDE || size.width * size.height < MIN_AREA) {
      rejected.size++;
      const area = size ? size.width * size.height : 0;
      if (size && area > (bestSmall?.area || 0)) bestSmall = { area, label: `${size.width}×${size.height}` };
      continue;
    }

    let verdict = { relevant: false, judged: false };
    try {
      verdict = await judgeRelevance(query, [label].filter(Boolean), {
        title: hit.title || "",
        url: hit.url || "",
        snippet: hit.title || "",
      });
    } catch (e) { verdict = { relevant: false, judged: false, why: String(e?.message || e).slice(0, 80) }; }
    // Unchanged: an unjudged candidate is rejected exactly like an irrelevant
    // one. Only the COUNTER tells them apart, so a judge outage stops being
    // reported as "the picture was wrong".
    if (!verdict.relevant) {
      rejected[verdict.judged ? "irrelevant" : "unjudged"]++;
      if (!verdict.judged && verdict.why) judgeWhy = verdict.why;
      // A provider that answered 429 a moment ago will answer 429 to the next
      // candidate too. Grinding through the rest of the list cannot produce a
      // verdict — it only pushes the rate limit further out for every other
      // lane sharing the key. judge-probe run 2 measured the cost: 8 doomed
      // calls per word, per layer, on every word.
      //
      // Nothing is accepted that was not accepted before: the candidates not
      // reached are still not used. They are reported as unexamined instead of
      // being counted as rejections that never happened.
      if (!verdict.judged && judgesAllCoolingOff()) { judgeStopped = true; break; }
      continue;
    }

    console.error(`   ℹ ${provider}: «${query}» → ${named}${hit.credit ? ` (photo: ${hit.credit})` : ""}`);
    return { photo: named, sourceUrl: hit.url || "", sourceType: "labelled-explainer", alt: hit.title || label };
  }

  const nearMiss = bestSmall ? ` · largest undersized: ${bestSmall.label}` : "";
  const down = rejected.unjudged && judgeWhy ? ` · judge down: ${judgeWhy}` : "";
  const stopped = judgeStopped ? ` · stopped early: every judge is rate-limited, ${hits.length - examined} candidate(s) left unexamined` : "";
  console.error(`   ⚠ ${provider}(«${query}»): ${examined} candidates examined, none passed — download:${rejected.download} badType:${rejected.type} tooSmall:${rejected.size} notRelevant:${rejected.irrelevant} judgeUnavailable:${rejected.unjudged}${nearMiss}${down}${stopped}`);
  return null;
}

/** Collapse duplicate image URLs and drop entries with no usable URL. */
export function dedupe(entries) {
  const seen = new Set();
  return entries.filter((e) => e?.image && !seen.has(e.image) && seen.add(e.image));
}
