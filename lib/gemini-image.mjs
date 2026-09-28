// Cartoon stills for EasyDeutsch from the Gemini API image models (the same
// Google key as Veo). Owner, 2026-09-28: "use the other free options you have".
// Veo returns quota 0 for this key; the image models are a separate quota, so
// this checks whether they work before anything is built on them.
//
//   node lib/gemini-image.mjs --prompt "…" --out out/still.png [--model gemini-2.5-flash-image] [--ref in.png]
//
// --ref passes a previous still back in, so the same character can be drawn in
// the next pose (the frames of a limited animation).
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

export async function generateImage({ prompt, key, model = DEFAULT_IMAGE_MODEL, refs = [], fetchImpl = fetch }) {
  if (!key) throw new Error("GOOGLE_VEO_API_KEY is not configured.");
  const parts = [{ text: String(prompt) }, ...refs.map((file) => ({ inlineData: { mimeType: "image/png", data: readFileSync(file).toString("base64") } }))];
  const r = await fetchImpl(`${GEMINI_API}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST", signal: AbortSignal.timeout(120_000),
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"] } }),
  });
  if (!r.ok) throw new Error(`Gemini image request failed: ${r.status} ${String(await r.text()).slice(0, 1500)}`);
  const j = await r.json();
  const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!img) throw new Error(`Gemini returned no image: ${JSON.stringify(j).slice(0, 600)}`);
  return Buffer.from(img.inlineData.data, "base64");
}

const isMain = Boolean(process.argv[1]) && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
if (isMain) {
  const flag = (n, d = "") => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] || d : d; };
  const refs = process.argv.flatMap((a, i) => (a === "--ref" ? [process.argv[i + 1]] : []));
  const out = flag("--out", "out/gemini-still.png");
  const bytes = await generateImage({ prompt: flag("--prompt"), key: process.env.GOOGLE_VEO_API_KEY, model: flag("--model", DEFAULT_IMAGE_MODEL), refs });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, bytes);
  console.log(`Gemini image saved: ${out} (${bytes.length} bytes)`);
}
