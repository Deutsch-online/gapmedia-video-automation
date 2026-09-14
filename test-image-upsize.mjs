import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { fullSizeVariants } from "./lib/image-upsize.mjs";

// daily.yml run #257 (2026-09-14, morning) is the reason this exists: 867 of
// the 1314 candidates it examined were rejected for being under the Visual
// Truth Gate's floor — 66% of every rejection — with judgeUnavailable:0
// everywhere, so nothing else was broken. Both tiktok and instagram failed
// with «تصویر واقعیِ همان قابلیت ندارد» and nothing shipped that morning.
//
// The near-miss hosts were serving WordPress renditions and social cards, not
// small photographs. This derives the full-size original those thumbnails come
// from. Like lib/ddg-search.mjs, it could not be tried against a live host
// (the egress gateway refuses zoomit.ir and i0.wp.com alike), so it is shaped
// so that being wrong costs one failed request and nothing else.

// --- WordPress renditions: `name-750x500.jpg` sits beside `name.jpg` ---
{
  assert.deepEqual(
    fullSizeVariants("https://hermax.ir/wp-content/uploads/2024/05/telegram-750x500.jpg"),
    ["https://hermax.ir/wp-content/uploads/2024/05/telegram.jpg"],
    "the rendition suffix must be stripped to reach the original upload",
  );
  assert.deepEqual(
    fullSizeVariants("https://api2.zoomit.ir/media/shot-1024x576.webp"),
    ["https://api2.zoomit.ir/media/shot.webp"],
  );
  assert.deepEqual(
    fullSizeVariants("http://inbo.ir/a/b/c-1024x683.png"),
    ["http://inbo.ir/a/b/c.png"],
    "http is a real scheme here — these are Persian blogs, not a curated CDN",
  );
}

// --- CDN size parameters: the size is in the query string, not the path ---
{
  assert.deepEqual(
    fullSizeVariants("https://i0.wp.com/blog.ir/wp-content/uploads/foo-1024x576.jpg?resize=1024%2C576&ssl=1"),
    ["https://i0.wp.com/blog.ir/wp-content/uploads/foo.jpg?ssl=1"],
    "both rewrites apply at once, and ssl=1 MUST survive — dropping it breaks the URL outright",
  );
  assert.deepEqual(
    fullSizeVariants("https://ph-files.imgix.net/abc.png?w=1024&h=512&fit=crop&auto=format"),
    ["https://ph-files.imgix.net/abc.png?auto=format"],
    "only the size parameters go; auto=format changes how it is served, not how big it is",
  );
}

// --- Nothing to derive: return nothing, never the same URL twice ---
{
  assert.deepEqual(fullSizeVariants("https://example.com/photo.jpg"), [], "a plain URL has no thumbnail to undo");
  assert.deepEqual(fullSizeVariants("https://example.com/photo.jpg?utm_source=x"), [], "a non-size parameter is not a rendition");
  assert.deepEqual(fullSizeVariants("data:image/png;base64,AAAA"), [], "a data: URI is not fetchable");
  assert.deepEqual(fullSizeVariants("not a url"), []);
  assert.deepEqual(fullSizeVariants(""), []);
  assert.deepEqual(fullSizeVariants(null), []);
  assert.deepEqual(fullSizeVariants("https://example.com/photo-7x9.jpg"), [], "one-digit dimensions are a filename, not a rendition");
}

// --- At most ONE extra URL per candidate: the cost of being wrong is bounded ---
{
  for (const url of [
    "https://i0.wp.com/a/b/c-1024x576.jpg?resize=1024%2C576&w=1024&h=576&ssl=1",
    "https://cdn.example.ir/x/y-512x512.png?width=512&height=512&fit=cover",
  ]) {
    assert.equal(fullSizeVariants(url).length, 1, `${url} must cost at most one extra request`);
  }
}

// --- The gate itself is untouched. This adds candidates; it lowers nothing. ---
{
  const proof = readFileSync("lib/visual-proof.mjs", "utf8");
  assert.match(
    proof,
    /Math\.max\(size\.width, size\.height\) < 1080 \|\| size\.width \* size\.height < 700000/,
    "the Visual Truth Gate's size floor must stay exactly as it is — the fix is better candidates, never a lower bar",
  );

  const auto = readFileSync("lib/auto-image.mjs", "utf8");
  // The derived original goes through verifyUrl() — the same function the
  // original URL goes through — so it cannot reach a slide on a weaker check.
  assert.match(auto, /for \(const variant of fullSizeVariants\(hit\.image\)\) \{\s*\n\s*const attempt = await verifyUrl\(variant\);/,
    "the full-size variant must be verified by the same function as every other candidate");
  assert.equal(
    (auto.match(/Math\.max\(size\.width, size\.height\) < 1080 \|\| size\.width \* size\.height < 700000/g) || []).length,
    2,
    "auto-image.mjs must still apply the identical floor, in findRealImage's verifier and in generateAIImage",
  );
  // A candidate's identity for the caller's per-pack dedupe set stays the URL
  // the page offered, not the derived one — otherwise the same page could be
  // picked twice for two slides of one pack.
  assert.match(auto, /imageUrl: hit\.image \}/, "dedupe identity must remain the candidate's own URL");
}

console.log("ok   a thumbnail's full-size original is tried before the thumbnail — and the gate's floor is untouched");
