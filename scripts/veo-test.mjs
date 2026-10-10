// ONE short Veo test (owner approved 2026-10-10: "do a short test"): one 4 s clip, Veo 3.1 Lite, 9:16, from the approved cook/boss picture.
// Prints the status of every step (the key is never printed) so that the access and the result are known. Output: ai-cast/veo-test/test.mp4
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const key = process.env.GEMINI_API_KEY || "";
if (!key) { console.log("NO KEY"); process.exit(1); }
const MODEL = process.env.VEO_MODEL || "veo-3.1-lite-generate-preview", DUR = Number(process.env.VEO_SECONDS || 4);
const API = "https://generativelanguage.googleapis.com/v1beta";
const H = { "x-goog-api-key": key, "content-type": "application/json" };
const redact = (s) => String(s).split(key).join("***");
const img = readFileSync("public/ai-cast/v2/chefin.jpg").toString("base64");
const prompt = process.env.VEO_PROMPT || "A 2D cartoon. The woman from the picture holds a smartphone to her ear in an office hallway. She frowns and says: \"Wo ist die Suppe?\"";
const body = { instances: [{ prompt, image: { bytesBase64Encoded: img, mimeType: "image/jpeg" } }], parameters: { aspectRatio: "9:16", durationSeconds: DUR, resolution: "720p" } };
let r = await fetch(`${API}/models/${MODEL}:predictLongRunning`, { method: "POST", headers: H, body: JSON.stringify(body) });
let t = redact(await r.text());
console.log(`start: HTTP ${r.status} ${t.slice(0, 700)}`);
if (!r.ok) process.exit(1);
const op = JSON.parse(t).name;
let j;
for (let i = 0; i < 60; i++) {
  await new Promise((s) => setTimeout(s, 10000));
  r = await fetch(`${API}/${op}`, { headers: H });
  j = JSON.parse(redact(await r.text()));
  if (j.done) break;
  if (i % 3 === 0) console.log(`  waiting ${(i + 1) * 10}s ...`);
}
if (!j?.done) { console.log("TIMEOUT after 10 minutes"); process.exit(1); }
if (j.error) { console.log(`ERROR: ${JSON.stringify(j.error).slice(0, 600)}`); process.exit(1); }
console.log(`done: ${JSON.stringify(j.response || j).slice(0, 700)}`);
const uri = j.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri || j.response?.videos?.[0]?.uri;
if (!uri) { console.log("NO VIDEO URI in the response"); process.exit(1); }
const v = await fetch(uri, { headers: { "x-goog-api-key": key } });
console.log(`download: HTTP ${v.status}`);
if (!v.ok) { console.log(redact(await v.text()).slice(0, 300)); process.exit(1); }
mkdirSync("ai-cast/veo-test", { recursive: true });
writeFileSync("ai-cast/veo-test/test.mp4", Buffer.from(await v.arrayBuffer()));
console.log("saved ai-cast/veo-test/test.mp4");
