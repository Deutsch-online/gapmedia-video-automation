// Connectivity check for TypeSafe's System One model "Jev", via the official
// SDK (@typesafe-ai/sdk). The SDK owns the endpoint, so this cannot repeat the
// first attempt's mistake: /v1/chat/completions returned 404 because TypeSafe
// is not an OpenAI-compatible chat API. It asks typed questions over a state.
//
//   node check-jev.mjs
//
// The key is read from TYPESAFE_API_KEY, which is the SDK's own default and is
// the secret name this repository already holds.
//
// The question mirrors the real use this project would have: VISUAL_QC_STANDARD
// requires every slide image to match its German word, which is a yes/no
// judgment over a caption — exactly what a Noul returns, with a probability.
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";

const key = (process.env.TYPESAFE_API_KEY || "").trim();
if (!key) {
  console.error("✗ TYPESAFE_API_KEY is not set.");
  process.exit(2);
}
// Shape only — never the value.
console.log(`key: TYPESAFE_API_KEY (${key.length} characters, starts "${key.slice(0, 3)}")`);

// One matching pair and one deliberate mismatch. A key that authenticates but
// a model that answers both the same way is not usable for image QC, so the
// check has to test discrimination, not just HTTP 200.
const CASES = [
  { word: "Flughafen", caption: "airplane on runway", expect: true },
  { word: "Flughafen", caption: "a bowl of tomato soup", expect: false },
];

const client = new TypeSafeClient();
let failures = 0;
try {
  for (const { word, caption, expect } of CASES) {
    const response = await client.systemOne({
      state: { german_word: word, image_caption: caption },
      questions: {
        matches: noul(
          "The image described by `image_caption` shows the thing named by the German word in `german_word`.",
          { true: "The picture plainly shows that thing", false: "The picture shows something else" },
        ),
      },
    });
    const answer = response.answers.matches;
    const p = answer.probability ?? answer.value ?? answer;
    console.log(`  ${word} + "${caption}" → ${JSON.stringify(answer)}  (expected ${expect})`);
    if (typeof p === "number" && (p > 0.5) !== expect) failures++;
  }
} catch (e) {
  const status = e?.status ? ` (HTTP ${e.status})` : "";
  console.error(`\n✗ the request failed${status}: ${String(e.message).split(key).join("[redacted]")}`);
  if (e?.status === 401 || e?.status === 403) console.error("  the key is rejected — check the key itself.");
  process.exit(1);
}

if (failures) {
  console.log(`\n✗ the key works, but ${failures} of ${CASES.length} judgments came out wrong.`);
  process.exit(1);
}
console.log(`\n✅ the key works and Jev told the matching image from the mismatching one.`);
