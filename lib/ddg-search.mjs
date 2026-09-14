// DuckDuckGo as a keyless search index for the app-feature pipeline (owner
// directive 2026-09-13, after Exa died at 402 and the owner asked for a
// $0/no-card stack).
//
// This is the ONE thing that actually lets Exa be replaced on that pipeline.
// The stock-photo providers cannot: a feature slide has to prove "this app
// has this feature and it looks like this", and no photograph of a
// real-world object establishes that. What CAN establish it is the same
// thing Exa was finding — the official newsroom/help/product page about the
// feature — and a search index is all Exa was providing. So this finds the
// pages, and the page's own og:image is the screenshot that page is about.
//
// Nothing downstream is relaxed. Output is deliberately exaSearch-shaped, so
// findRealImage()'s existing loop applies the identical treatment it always
// has: download, type check, the 1080px/700k-pixel floor, and the LLM
// relevance judgement. A keyless index does not mean a weaker bar.
//
// ⚠ UNVERIFIED AGAINST THE LIVE SERVICE. duckduckgo.com and
// lite.duckduckgo.com are both refused by this environment's egress gateway
// ("connect_rejected / gateway answered 403 to CONNECT"), so this parser has
// only ever run against fixtures, never against a real response. It is
// wired as a FALLBACK beneath Exa rather than as a replacement for exactly
// that reason: if the markup assumptions below are wrong, it returns nothing
// and the pipeline behaves as it does today — it cannot fabricate a result.
// The first real CI run is what will confirm or refute it.
// Its own timeout rather than importing image-candidates.mjs's: that module
// imports isRelevant from auto-image.mjs, which now imports this file, and
// the resulting cycle is a needless hazard for two lines of code.
const FETCH_TIMEOUT_MS = 20_000;
export const withTimeout = (init = {}, ms = FETCH_TIMEOUT_MS) => ({ ...init, signal: AbortSignal.timeout(ms) });

const LITE = "https://lite.duckduckgo.com/lite/";

const decodeEntities = (s) => String(s || "")
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&"); // last: an escaped & must not re-trigger the rules above

const stripTags = (s) => decodeEntities(String(s || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

/**
 * DuckDuckGo wraps most result links as //duckduckgo.com/l/?uddg=<encoded>.
 * Returns the real destination, or "" for anything that is not an ordinary
 * external result (DDG's own pages, ad redirects, relative junk).
 */
export function unwrapResultUrl(href) {
  let raw = String(href || "").trim();
  if (!raw) return "";
  if (raw.startsWith("//")) raw = `https:${raw}`;
  let url;
  try {
    url = new URL(raw, LITE);
  } catch {
    return "";
  }
  if (url.pathname === "/l/" || url.searchParams.has("uddg")) {
    const target = url.searchParams.get("uddg");
    if (!target) return "";
    try {
      const inner = new URL(target);
      return inner.protocol === "https:" || inner.protocol === "http:" ? inner.toString() : "";
    } catch {
      return "";
    }
  }
  if (!/^https?:$/.test(url.protocol)) return "";
  // A link back into DuckDuckGo itself is navigation, not a result.
  if (/(^|\.)duckduckgo\.com$/i.test(url.hostname)) return "";
  return url.toString();
}

/**
 * Parse a lite.duckduckgo.com results page.
 * Tolerant by design: attribute order varies and the markup is not a
 * contract. Anything it cannot confidently read becomes zero results, which
 * the caller treats as "this index found nothing" — never a guess.
 * @returns {Array<{title:string,url:string,snippet:string}>}
 */
export function parseLiteResults(html) {
  const text = String(html || "");
  const out = [];
  const seen = new Set();

  // Anchors carrying DDG lite's result-link class, in document order.
  const anchor = /<a\b([^>]*\bclass=["'][^"']*\bresult-link\b[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  const snippet = /<td\b[^>]*\bclass=["'][^"']*\bresult-snippet\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/gi;

  const snippets = [...text.matchAll(snippet)].map((m) => stripTags(m[1]));

  let index = 0;
  for (const match of text.matchAll(anchor)) {
    const href = (match[1].match(/\bhref=["']([^"']+)["']/i) || [, ""])[1];
    const url = unwrapResultUrl(decodeEntities(href));
    const title = stripTags(match[2]);
    if (!url || !title || seen.has(url)) { index++; continue; }
    seen.add(url);
    out.push({ title: title.slice(0, 160), url, snippet: (snippets[index] || "").slice(0, 260) });
    index++;
  }
  return out;
}

/** @returns {Promise<Array<{title:string,url:string,snippet:string}>>} */
export async function ddgSearch(query, { limit = 8 } = {}) {
  const res = await fetch(`${LITE}?q=${encodeURIComponent(query)}`, withTimeout({
    method: "GET",
    headers: {
      // The lite endpoint serves a plain page to an ordinary browser UA;
      // an empty UA is what gets a challenge page instead of results.
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "accept": "text/html",
    },
  }));
  if (!res.ok) throw new Error(`DuckDuckGo ${res.status}`);
  return parseLiteResults(await res.text()).slice(0, limit);
}

/**
 * The image a page is about: its og:image, or twitter:image. Relative
 * values are resolved against the page itself.
 * @returns {string} an absolute http(s) URL, or ""
 */
export function extractPageImage(html, pageUrl) {
  const text = String(html || "");
  const patterns = [
    /<meta\b[^>]*\bproperty=["']og:image(?::secure_url|:url)?["'][^>]*\bcontent=["']([^"']+)["']/i,
    /<meta\b[^>]*\bcontent=["']([^"']+)["'][^>]*\bproperty=["']og:image(?::secure_url|:url)?["']/i,
    /<meta\b[^>]*\bname=["']twitter:image(?::src)?["'][^>]*\bcontent=["']([^"']+)["']/i,
    /<meta\b[^>]*\bcontent=["']([^"']+)["'][^>]*\bname=["']twitter:image(?::src)?["']/i,
  ];
  for (const pattern of patterns) {
    const found = text.match(pattern);
    if (!found) continue;
    try {
      const url = new URL(decodeEntities(found[1]), pageUrl);
      if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
    } catch { /* unusable value — try the next pattern */ }
  }
  return "";
}

// Candidate images INSIDE the page body, for when the social card is not the
// screenshot. Measured on daily.yml run #234 (2026-09-13): og:image alone
// produced 366 undersized rejections out of 590 — 62% of everything the rescue
// threw away — and the sizes name the reason. 1024×576 and 1024×512 are the
// standard widths a social preview card is generated at, 512×512 is a square
// share icon, and 1051×702 missed the gate's 1080px minimum by 29 pixels. None
// of those is the product screenshot the page actually shows; they are the
// thumbnail the page offers to social networks. The real screenshot — the
// thing worth putting on a slide — is in the article body, at full size.
//
// This CANNOT be solved by lowering the bar: the 1080px / 700,000px floor is
// lib/visual-proof.mjs's, the Visual Truth Gate itself, and it is the quality
// promise to the viewer. The answer is to look where the big real image is.
//
// Deliberately conservative about what counts as a candidate. Anything that
// is obviously furniture rather than content — icons, logos, avatars, badges,
// sprites, spacers, tracking pixels, SVGs, inline data: URIs — is dropped by
// name, because a logo that sneaks through wastes a download and a relevance
// call. Everything surviving that is still subject, unchanged, to the byte
// download, the type check, the gate's size floor and the relevance judge.
// This adds candidates; it does not lower a single standard any of them face.
const FURNITURE = /(^|[\/_-])(icon|icons|logo|logos|avatar|avatars|badge|badges|sprite|sprites|spacer|pixel|favicon|placeholder|thumb|thumbs|emoji|banner-ad|ads?)([\/_.-]|$)/i;

function bodyImageCandidates(html, pageUrl) {
  const out = [];
  const seen = new Set();
  for (const m of String(html || "").matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    // srcset's largest entry when present, otherwise src — the largest
    // rendition is exactly the one most likely to clear the size floor.
    let raw = "";
    const srcset = tag.match(/\bsrcset=["']([^"']+)["']/i);
    if (srcset) {
      const best = srcset[1]
        .split(",")
        .map((part) => part.trim().split(/\s+/))
        .map(([u, d]) => ({ u, w: parseInt(d || "0", 10) || 0 }))
        .sort((a, b) => b.w - a.w)[0];
      if (best) raw = best.u;
    }
    if (!raw) {
      const src = tag.match(/\bsrc=["']([^"']+)["']/i);
      if (src) raw = src[1];
    }
    if (!raw || /^data:/i.test(raw)) continue;
    let abs;
    try {
      abs = new URL(decodeEntities(raw), pageUrl);
    } catch { continue; }
    if (abs.protocol !== "https:" && abs.protocol !== "http:") continue;
    if (/\.svg(\?|$)/i.test(abs.pathname)) continue;
    if (FURNITURE.test(abs.pathname)) continue;
    const href = abs.toString();
    if (seen.has(href)) continue;
    seen.add(href);
    out.push(href);
  }
  return out;
}

/**
 * Every image worth trying from one page, best guess first: the social card
 * (cheap, usually correct when the page IS the product), then the body images
 * (where a real screenshot lives when the card is only a thumbnail).
 * @returns {string[]} absolute http(s) URLs
 */
export function extractPageImages(html, pageUrl, { limit = 3 } = {}) {
  const out = [];
  const card = extractPageImage(html, pageUrl);
  if (card) out.push(card);
  for (const href of bodyImageCandidates(html, pageUrl)) {
    if (out.length >= limit) break;
    if (!out.includes(href)) out.push(href);
  }
  return out.slice(0, limit);
}

/**
 * Search, then resolve each result page to the image it is about, producing
 * hits in exactly exaSearch()'s shape so findRealImage()'s existing
 * verification loop can consume them unchanged.
 * @returns {Promise<Array<{image:string,title:string,url:string,text:string}>>}
 */
export async function ddgImageHits(query, { limit = 6 } = {}) {
  const results = await ddgSearch(query, { limit });
  const hits = [];
  const seen = new Set();
  for (const result of results) {
    let images = [];
    try {
      const page = await fetch(result.url, withTimeout({
        headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", accept: "text/html" },
      }));
      if (!page.ok) continue;
      // Two per page, not one: the social card and the best body image. Capped
      // at two so a single page cannot consume the caller's whole candidate
      // budget and starve the other results of a look.
      images = extractPageImages(await page.text(), result.url, { limit: 2 });
    } catch { continue; }
    for (const image of images) {
      if (!image || seen.has(image)) continue;
      seen.add(image);
      hits.push({ image, title: result.title, url: result.url, text: result.snippet });
    }
  }
  return hits;
}
