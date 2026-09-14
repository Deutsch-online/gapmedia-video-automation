// The full-size original behind a thumbnail URL.
//
// Why this exists — measured, not guessed. daily.yml run #257 (2026-09-14,
// the morning batch) rejected 867 of the 1314 candidates it examined for
// being under the Visual Truth Gate's 1080px/700,000px floor: 66% of every
// rejection in the whole run, with `judgeUnavailable:0` everywhere, so the
// judge was healthy and this alone is what stopped both tiktok and instagram
// from shipping. The near-miss hosts name the reason:
//
//     1024x1024  nabfollower.com   — over the AREA floor, 56px under the long side
//      945x756   baamardom.ir      — over the area floor, 135px under the long side
//     1024x683   inbo.ir           — 99.9% of the area floor
//     1090x641   ninjapinner.com   — 99.8% of the area floor
//      750x500   hermax.ir, itna.ir, api2.zoomit.ir (three separate hosts, same size)
//
// Those are not photographs that happen to be small. 750×500, 1024×576 and
// 512×512 are WordPress rendition sizes and social-card widths, and the
// Persian blogs this pipeline searches are overwhelmingly WordPress. The
// full-size upload is still on the same server, at a URL derivable from the
// thumbnail's own: WordPress writes `name-750x500.jpg` beside `name.jpg`,
// and Jetpack/Photon (`i0.wp.com`) and friends carry the requested size in
// the query string. We have been asking for the thumbnail and then throwing
// it away for being a thumbnail.
//
// NOTHING HERE LOWERS A BAR. This produces one extra CANDIDATE URL, tried
// before the thumbnail and subject — unchanged — to the same download, the
// same imageType() check, the same 1080px/700,000px floor and the same
// relevance judgement. If the derived URL 404s or is not bigger, the
// original is still tried exactly as it is today. The floor stays in
// lib/visual-proof.mjs at its exact values; the fix is better candidates.
//
// ⚠ UNVERIFIED AGAINST A LIVE HOST, for the same reason lib/ddg-search.mjs
// carries the same warning: this environment's egress gateway refuses
// duckduckgo.com, zoomit.ir and i0.wp.com alike (HTTP 000, connect_rejected),
// so the rewrite rules below have only run against the fixtures in
// test-image-upsize.mjs. They are shaped so that being wrong costs one failed
// request and changes nothing else. The `upsized:` counter in
// findRealImage()'s summary line is what will confirm or refute them on the
// next real run.

// Query parameters that ask a CDN for a specific rendition. Deliberately does
// NOT include `ssl`, `q`/`quality`, `format` or anything else that changes
// how the image is served rather than how big it is — dropping `ssl=1` breaks
// an i0.wp.com URL outright, and a quality parameter is not a size.
const SIZE_PARAMS = new Set([
  "w", "h", "width", "height", "resize", "fit", "crop", "size",
  "maxwidth", "maxheight", "max-w", "max-h", "dpr",
]);

// `name-1024x576.jpg` → `name.jpg`. Two-to-five digits each side so a real
// filename containing a single number is never mangled.
const RENDITION = /^(.*?)-(\d{2,5})x(\d{2,5})(\.(?:jpe?g|png|webp))$/i;

/**
 * The full-size original a thumbnail URL is derived from, if one is
 * derivable. At most one URL, so a candidate can cost at most one extra
 * request.
 *
 * @param {string} rawUrl
 * @returns {string[]} zero or one absolute URL, never `rawUrl` itself
 */
export function fullSizeVariants(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || ""));
  } catch {
    return [];
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return [];

  const rendition = url.pathname.match(RENDITION);
  if (rendition) url.pathname = rendition[1] + rendition[4];

  for (const key of [...url.searchParams.keys()]) {
    if (SIZE_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
  }

  const variant = url.toString();
  return variant === String(rawUrl) ? [] : [variant];
}
