import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { parseMojeekResults, webSearch, resetEngineCooldown, engineRefused, ENGINES } from "./lib/web-search.mjs";

// daily.yml run #267 (2026-09-14) is why this exists. The judge was healthy
// (judgeUnavailable: 0) and the size floor was not the obstacle — there was
// simply no index left: Exa 402, DuckDuckGo 403 x136, 114 outright fetch
// failures, and 116 searches ending "no index returned an image". With no
// input, findRealImage() returns null and Visual QC stops the build.
//
// Like lib/ddg-search.mjs, the Mojeek parser could not be tried against the
// live service (the egress gateway refuses mojeek.com), so these fixtures
// carry the whole burden — and the property that makes shipping it safe is
// that a wrong assumption yields ZERO results, never a wrong one.

// --- Mojeek: ordinary result anchors, title + snippet paired ---
{
  const html = `
    <ul class="results-standard">
      <li><h2><a href="https://help.instagram.com/1234/schedule-posts">Schedule posts on Instagram</a></h2>
        <p class="s">You can schedule a post from the Advanced settings screen.</p></li>
      <li><h2><a href="https://www.mojeek.com/about">About Mojeek</a></h2><p class="s">our own index</p></li>
      <li><h2><a href="https://creators.instagram.com/blog/pin-posts">Pin posts to your profile</a></h2>
        <p class="s">Pin up to three posts.</p></li>
    </ul>`;
  const out = parseMojeekResults(html);
  assert.equal(out.length, 2, "the engine's own page is navigation, not a result");
  assert.equal(out[0].url, "https://help.instagram.com/1234/schedule-posts");
  assert.equal(out[0].title, "Schedule posts on Instagram");
  assert.match(out[0].snippet, /Advanced settings/);
  assert.equal(out[1].url, "https://creators.instagram.com/blog/pin-posts");
}

// --- Markup it does not recognise produces nothing, never a guess ---
{
  assert.deepEqual(parseMojeekResults("<html><body><p>no results here</p></body></html>"), []);
  assert.deepEqual(parseMojeekResults(""), []);
  assert.deepEqual(parseMojeekResults(null), []);
  // An anchor with no readable title is dropped rather than invented.
  assert.deepEqual(parseMojeekResults('<h2><a href="https://x.test/a"></a></h2>'), []);
  // A relative or non-http destination is not a result.
  assert.deepEqual(parseMojeekResults('<h2><a href="/settings">Settings</a></h2>'), []);
}

// --- Duplicate destinations collapse ---
{
  const html = `<h2><a href="https://a.test/x">One</a></h2><p>s1</p>
                <h2><a href="https://a.test/x">One again</a></h2><p>s2</p>`;
  assert.equal(parseMojeekResults(html).length, 1);
}

// --- Engine fallback: DuckDuckGo refusing must not take the lane down ---
{
  resetEngineCooldown();
  const calls = [];
  const engines = [
    { name: "dead", url: () => "https://dead.test/", parse: () => [{ title: "t", url: "https://x.test", snippet: "" }] },
    { name: "alive", url: () => "https://alive.test/", parse: () => [{ title: "real", url: "https://help.instagram.com/x", snippet: "s" }] },
  ];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes("dead")) return { ok: false, status: 403, text: async () => "" };
    return { ok: true, status: 200, text: async () => "<html></html>" };
  };
  try {
    const first = await webSearch("pin posts", { engines });
    assert.equal(first.engine, "alive", "a 403 on the first index must fall through to the next");
    assert.equal(first.results.length, 1);

    // ...and the refused engine is not asked again for the rest of the run.
    assert.equal(engineRefused("dead"), true, "403 must put the engine on cooldown");
    const before = calls.length;
    const second = await webSearch("schedule posts", { engines });
    assert.equal(second.engine, "alive");
    assert.ok(!calls.slice(before).some((u) => u.includes("dead")),
      "run #267 sent ~250 requests to an endpoint already answering 403 — that must not repeat");
  } finally {
    globalThis.fetch = realFetch;
    resetEngineCooldown();
  }
}

// --- Every index is asked; none is silently dropped ---
{
  const names = ENGINES.map((e) => e.name);
  assert.ok(names.includes("duckduckgo"), "the existing index stays — its 403 may be temporary");
  assert.ok(names.some((n) => n !== "duckduckgo" && !n.startsWith("duckduckgo")),
    "at least one INDEPENDENT operator, or a DuckDuckGo-wide refusal takes the lane down again");
}

// --- Input only: the gate and its floor are untouched by this change ---
{
  const proof = readFileSync("lib/visual-proof.mjs", "utf8");
  assert.match(proof, /Math\.max\(size\.width, size\.height\) < 1080 \|\| size\.width \* size\.height < 700000/,
    "the Visual Truth Gate's floor must stay exactly as it is — this change restores input, nothing else");

  const auto = readFileSync("lib/auto-image.mjs", "utf8");
  assert.match(auto, /verdict = await judgeRelevance\(topic, points, candidate\)/,
    "every candidate must still go through the relevance judge");

  // Stock photography must never become an input to the app-feature lane:
  // a photo of someone holding a phone cannot prove an app has a feature.
  const search = readFileSync("lib/web-search.mjs", "utf8");
  for (const forbidden of ["api.pexels.com", "pixabay.com"]) {
    assert.ok(!search.includes(forbidden),
      `${forbidden} must not be a search index here — PROJECT_RULES rule 41 / LAW 7's MUST NOT clause`);
  }
  assert.ok(!auto.includes("api.pexels.com") && !auto.includes("pixabay.com"),
    "findRealImage() must not source stock photography");
}

console.log("ok   a refused index no longer takes the lane down, and the gate is untouched");
