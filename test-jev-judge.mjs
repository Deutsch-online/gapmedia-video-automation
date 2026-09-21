// Jev joins the image judges without becoming a single point of failure.
// Owner directive 2026-09-21: "use Jev from now on".
//
//   node test-jev-judge.mjs
//
// No network. It checks the wiring and the contract, because the failure that
// would hurt is not a wrong verdict — it is Jev going down and taking the
// lesson with it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JEV_RELEVANCE_THRESHOLD, jevConfigured } from "./lib/jev.mjs";

const auto = readFileSync("lib/auto-image.mjs", "utf8");
const jev = readFileSync("lib/jev.mjs", "utf8");

// ── it is an EXTRA judge, never a replacement ────────────────────────────
assert.match(auto, /gemini: \(\) => askGemini\(prompt\)/, "Gemini must stay a judge");
assert.match(auto, /groq: \(\) => askGroq\(prompt\)/, "Groq must stay a judge");
assert.match(auto, /jev: \(\) => jevVocabularyVerdict/, "Jev must be wired in as a judge");
// The loop already treats a throwing provider as "did not answer" and moves
// on. That is what keeps a Jev outage from costing a lesson, so the try/catch
// around the provider call must stay.
assert.match(auto, /for \(const name of judgeProviderOrder\(available\)\)[\s\S]{0,120}try \{/,
  "every judge must still be called inside the try that lets the next one run");

// ── only the vocabulary lane, and only with a key ────────────────────────
assert.match(auto, /opts\.lane === "vocabulary" && jevConfigured\(\)/,
  "Jev must be asked only for the lane it was measured on, and only when configured");
assert.doesNotMatch(auto, /available = \["jev"\]/, "Jev must never be the only judge");

// ── the threshold is the measured one ────────────────────────────────────
assert.equal(JEV_RELEVANCE_THRESHOLD, 0.5,
  "the threshold sits in the middle of the measured 0.74/0.27 gap");
assert.match(jev, /0\.74 – 0\.95/, "the measurement behind the threshold must stay recorded");
assert.match(jev, /0\.04 – 0\.27/, "the near-miss range must stay recorded");

// ── the verdict shape the existing parser needs ──────────────────────────
// parseVerdict() finds JSON with a boolean `relevant`. A shape change here
// would make every Jev verdict unparsable, which counts as "not relevant" —
// it would silently reject good pictures instead of failing loudly.
assert.match(jev, /JSON\.stringify\(\{\s*\n?\s*relevant/,
  "Jev must return the same JSON shape parseVerdict already reads");
assert.match(jev, /shows >= JEV_RELEVANCE_THRESHOLD && real >= JEV_RELEVANCE_THRESHOLD/,
  "both the concept question and the real-photograph question must pass");

// ── a missing key is not an error ────────────────────────────────────────
const saved = process.env.TYPESAFE_API_KEY;
delete process.env.TYPESAFE_API_KEY;
assert.equal(jevConfigured(), false, "no key means not configured, not a throw");
process.env.TYPESAFE_API_KEY = "  ";
assert.equal(jevConfigured(), false, "a blank secret must count as absent");
process.env.TYPESAFE_API_KEY = "api-test";
assert.equal(jevConfigured(), true);
if (saved === undefined) delete process.env.TYPESAFE_API_KEY; else process.env.TYPESAFE_API_KEY = saved;

// ── the workflow passes the secret ───────────────────────────────────────
assert.match(readFileSync(".github/workflows/news-scan.yml", "utf8"),
  /TYPESAFE_API_KEY: \$\{\{ secrets\.TYPESAFE_API_KEY \}\}/,
  "the lesson build must receive the key, or Jev never runs in production");
assert.match(readFileSync("package.json", "utf8"), /"@typesafe-ai\/sdk"/,
  "the SDK must be a real dependency, not an undeclared import");

console.log("Jev judges vocabulary images first and costs nothing when it is down");
