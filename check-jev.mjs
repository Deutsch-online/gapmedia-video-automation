// Connectivity check for the TypeSafe "jev" API.
//
// It answers one question only: does the stored key authenticate?  It never
// prints the key, and it is never part of a lesson build — the German cycle
// does not use this provider at all yet.
//
//   node check-jev.mjs              (reads the key from the environment)
//
// The key is read from the FIRST of these variables that is set, so the
// GitHub secret can carry any of these names:
const NAMES = ["TYPESAFE_API_KEY", "JEV_API_KEY", "TS_API_KEY", "TYPESAFE_KEY"];
const ENDPOINT = process.env.TYPESAFE_ENDPOINT || "https://api.typesafe.ai/v1/chat/completions";
const MODEL = process.env.TYPESAFE_MODEL || "jev";

const name = NAMES.find((n) => (process.env[n] || "").trim());
if (!name) {
  console.error(`✗ no key found. Set one of: ${NAMES.join(", ")}`);
  process.exit(2);
}
const key = process.env[name].trim();
// Shape only — never the value.
console.log(`key source: ${name} (${key.length} characters, starts "${key.slice(0, 3)}")`);
console.log(`endpoint:   ${ENDPOINT}`);
console.log(`model:      ${MODEL}`);

let res;
try {
  res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{
        role: "user",
        content: "کلمه آلمانی: Flughafen - توضیح عکس: airplane on runway. آیا مرتبط است؟ فقط YES یا NO بگو",
      }],
    }),
  });
} catch (e) {
  console.error(`✗ the request did not reach the server: ${e.message}`);
  process.exit(1);
}

const text = await res.text();
console.log(`\nHTTP ${res.status} ${res.statusText}`);
// Redact anything that looks like the key, in case the server echoes it.
console.log(text.slice(0, 1200).split(key).join("[redacted]"));

if (res.status === 200) { console.log("\n✅ 200 — the key authenticates and the model answered."); process.exit(0); }
if (res.status === 401 || res.status === 403) { console.log("\n✗ the key is rejected. Check the key itself."); process.exit(1); }
if (res.status === 404) { console.log("\n✗ the endpoint or the model name is wrong. The key was not the problem."); process.exit(1); }
console.log("\n✗ unexpected status — read the body above.");
process.exit(1);
