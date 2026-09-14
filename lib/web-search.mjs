// The keyless web index that finds the PAGE a real screenshot lives on.
//
// Why this file exists, measured rather than assumed. daily.yml run #267
// (2026-09-14) could not source a single image, and the reason was not the
// size floor and not the relevance judge — the judge was completely healthy
// that run (judgeUnavailable: 0). Both search indexes were simply gone:
//
//     Exa 402 ............ credits exhausted since 2026-09-13
//     DuckDuckGo 403 ..... 136 refusals, first seen ~11:56 on 2026-09-14
//     DuckDuckGo fetch ... 114 outright connection failures
//     result ............. 116 searches ending "no index returned an image"
//
// With no index there is nothing to download, nothing to measure and nothing
// to judge, so findRealImage() returns null every time and Visual QC stops
// the build — correctly. The fix is to restore INPUT, and only input.
//
// WHAT THIS DOES NOT DO, stated plainly because it was asked for three times:
// it does not introduce stock photography (Pexels/Pixabay) to the app-feature
// pipeline. Those libraries index photographs of the world, not pages about
// software. A picture of someone holding a phone cannot establish "Instagram
// has this button and it looks like this" — it is exactly the «تصویرسازی
// عمومی» PROJECT_RULES.md rule 41 and LAW 7's MUST NOT clause forbid, and
// lib/pexels-image.mjs's own header already records why Pexels is lawful for
// German vocabulary and unlawful here. Nothing downstream of this module
// changes: the same 1080px/700,000px floor, the same judgeRelevance() call,
// the same assertVisualProof().
//
// Two defences against the failure that prompted it:
//
//   1. More than one operator. DuckDuckGo refusing us takes out DuckDuckGo,
//      not the pipeline, because Mojeek is an independent index with its own
//      crawler and its own infrastructure.
//   2. A cooldown. Run #267 sent ~250 requests to an endpoint that had
//      already answered 403 more than a hundred times. That is both futile
//      and the most plausible way to earn a longer block. An engine that
//      refuses us once is now skipped for the rest of the process.
//
// ⚠ UNVERIFIED AGAINST THE LIVE SERVICES, exactly as lib/ddg-search.mjs says
// of itself: this environment's egress gateway refuses duckduckgo.com and
// mojeek.com alike (HTTP 000, connect_rejected), so the Mojeek parser below
// has only ever run against the fixtures in test-web-search.mjs. It is built
// so that being wrong yields ZERO results rather than a wrong one — the
// caller then behaves exactly as it does today. The first real CI run is what
// confirms or refutes it.
import { parseLiteResults, unwrapResultUrl, withTimeout, extractPageImages } from "./ddg-search.mjs";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const headers = { "user-agent": UA, accept: "text/html" };

// Cooling is per-process, not per-call: findRealImage() runs three strategies
// per slide across six topic attempts, so one refusal would otherwise be
// re-learned dozens of times in the same run.
const refused = new Set();
// Every findRealImage() failure prints its own `tried` string, but once an
// engine has been refused ONCE, every later line says only "(cooling)" — so
// a log read from the end (the only part a job log viewer or an API tail
// gives you cheaply) cannot say WHY each index dropped out. Measured on run
// #270, 2026-09-14: the last ~2000 lines showed "duckduckgo(cooling),
// duckduckgo-html(cooling), mojeek(cooling)" and nothing else, and Mojeek's
// first live status — a refusal, or a 200 this module's parser could not
// read, which need opposite fixes — was unrecoverable without downloading
// the whole log. The ledger keeps each engine's FIRST real outcome so one
// line at the end of a run can state it.
const ledger = new Map();
function record(name, outcome) { if (!ledger.has(name)) ledger.set(name, outcome); }
export function resetEngineCooldown() { refused.clear(); ledger.clear(); }
export function engineRefused(name) { return refused.has(name); }
/**
 * Each index's first real outcome this process, oldest first — "mojeek: 403"
 * or "mojeek: 200, 0 parsed — markup not recognised". Empty when no index was
 * ever reached (every strategy had a key-based source answer first).
 * @returns {string[]}
 */
export function engineLedger() { return [...ledger].map(([name, outcome]) => `${name}: ${outcome}`); }

/**
 * Mojeek results are ordinary anchors inside the result list. Parsed with the
 * same tolerance as parseLiteResults(): anything not confidently readable is
 * dropped, and an unrecognised page yields [] rather than a guess.
 */
export function parseMojeekResults(html) {
  const text = String(html || "");
  const out = [];
  const seen = new Set();
  // Titles live in <a href="..."> inside <h2>; the snippet is the <p> that
  // follows. Matched as a pair so a stray navigation anchor cannot become a
  // result on its own.
  const block = /<h2[^>]*>\s*<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h2>([\s\S]{0,600}?)(?=<h2|<\/li>|$)/gi;
  for (const match of text.matchAll(block)) {
    const url = unwrapResultUrl(match[1]);
    if (!url || seen.has(url)) continue;
    let host = "";
    try { host = new URL(url).hostname; } catch { continue; }
    if (/(^|\.)mojeek\.com$/i.test(host)) continue;
    const title = match[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (!title) continue;
    const snippet = (match[3].match(/<p\b[^>]*>([\s\S]*?)<\/p>/i) || [, ""])[1]
      .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    seen.add(url);
    out.push({ title: title.slice(0, 160), url, snippet: snippet.slice(0, 260) });
  }
  return out;
}

// Each engine is {name, url(query), parse(html)}. Order is deliberate:
// DuckDuckGo first because its parser has the most history here, Mojeek
// second so a DuckDuckGo-wide refusal still leaves a working index.
export const ENGINES = [
  {
    name: "duckduckgo",
    url: (q) => `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`,
    parse: parseLiteResults,
  },
  {
    // Same operator, different endpoint. Nearly free to try, and it covers
    // the case where the 403 is specific to the /lite/ path rather than to
    // our address.
    name: "duckduckgo-html",
    url: (q) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
    parse: parseLiteResults,
  },
  {
    name: "mojeek",
    url: (q) => `https://www.mojeek.com/search?q=${encodeURIComponent(q)}`,
    parse: parseMojeekResults,
  },
];

/**
 * Ask each configured index in turn; the first that answers with results
 * wins. Reports which one answered so a log line can name it.
 *
 * @returns {Promise<{results: Array<{title:string,url:string,snippet:string}>, engine: string, tried: string[]}>}
 */
export async function webSearch(query, { limit = 8, engines = ENGINES } = {}) {
  // `tried` records an OUTCOME per engine, not just a name. A bare name was
  // ambiguous in exactly the place it mattered: "tried duckduckgo(403),
  // mojeek" could not distinguish an index that answered and yielded nothing
  // from one that was never reached — and the first of those is a parser bug
  // of ours, the second is a service refusing us. Those need opposite fixes,
  // so the log has to tell them apart on the first read.
  const tried = [];
  for (const engine of engines) {
    if (refused.has(engine.name)) {
      tried.push(`${engine.name}(cooling)`);
      continue;
    }
    tried.push(engine.name);
    let res;
    try {
      res = await fetch(engine.url(query), withTimeout({ method: "GET", headers }));
    } catch (e) {
      // A transport failure is not a refusal — it may be one bad request —
      // so the engine stays eligible for the next strategy.
      tried[tried.length - 1] = `${engine.name}(${String(e?.message || e).slice(0, 40)})`;
      record(engine.name, String(e?.message || e).slice(0, 40));
      continue;
    }
    if (!res.ok) {
      // 403/429 mean "stop asking". Anything else may be a one-off.
      if (res.status === 403 || res.status === 429) refused.add(engine.name);
      tried[tried.length - 1] = `${engine.name}(${res.status})`;
      record(engine.name, String(res.status));
      continue;
    }
    let results = [];
    let parseError = "";
    try { results = engine.parse(await res.text()).slice(0, limit); }
    catch (e) { results = []; parseError = String(e?.message || e).slice(0, 40); }
    if (results.length) {
      tried[tried.length - 1] = `${engine.name}(${results.length})`;
      record(engine.name, `${results.length} result(s)`);
      return { results, engine: engine.name, tried };
    }
    // 200 with nothing parsed is OUR problem, not the service's: the index
    // answered and this module could not read the answer. Said plainly here
    // so it is never reported as a block.
    tried[tried.length - 1] = parseError
      ? `${engine.name}(${res.status}, parse failed: ${parseError})`
      : `${engine.name}(${res.status}, 0 parsed — markup not recognised)`;
    record(engine.name, parseError
      ? `${res.status}, parse failed: ${parseError}`
      : `${res.status}, 0 parsed — markup not recognised`);
  }
  return { results: [], engine: "", tried };
}

/**
 * Search, then resolve each result page to the image it is about, in exactly
 * exaSearch()'s hit shape so findRealImage()'s verification loop consumes it
 * unchanged. This is lib/ddg-search.mjs's ddgImageHits() with the index step
 * made pluggable; the page-to-image half is identical and engine-independent.
 *
 * The returned array carries a non-enumerable `engine` so the caller can name
 * which index actually answered without changing the hit shape itself.
 *
 * @returns {Promise<Array<{image:string,title:string,url:string,text:string}>>}
 */
export async function webImageHits(query, { limit = 6 } = {}) {
  const { results, engine, tried } = await webSearch(query, { limit });
  const hits = [];
  const seen = new Set();
  for (const result of results) {
    let images = [];
    try {
      const page = await fetch(result.url, withTimeout({ headers }));
      if (!page.ok) continue;
      // Two per page — the social card and the best body image — the same cap
      // ddgImageHits() uses, so one page cannot eat the candidate budget.
      images = extractPageImages(await page.text(), result.url, { limit: 2 });
    } catch { continue; }
    for (const image of images) {
      if (!image || seen.has(image)) continue;
      seen.add(image);
      hits.push({ image, title: result.title, url: result.url, text: result.snippet });
    }
  }
  Object.defineProperty(hits, "engine", { value: engine, enumerable: false });
  Object.defineProperty(hits, "tried", { value: tried, enumerable: false });
  return hits;
}
