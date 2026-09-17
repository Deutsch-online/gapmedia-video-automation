// Official Google Flow integration path: Gemini API's Veo endpoint.
// Flow's browser application has no public automation API; this module uses
// the documented, supported API instead. It is opt-in because generation is
// usually billable. No caller may activate it just because a key happens to
// exist — ENABLE_GOOGLE_VEO must be exactly "true" as well.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const VEO_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_VEO_MODEL = "veo-3.1-fast-generate-preview";

export function veoConfig(env = process.env) {
  return {
    enabled: env.ENABLE_GOOGLE_VEO === "true",
    key: String(env.GOOGLE_VEO_API_KEY || ""),
    model: String(env.GOOGLE_VEO_MODEL || DEFAULT_VEO_MODEL),
  };
}

export function assertVeoReady(config) {
  if (!config?.enabled) throw new Error("Google Veo is disabled. Set GitHub Variable ENABLE_GOOGLE_VEO to true before generating a billed clip.");
  if (!config?.key) throw new Error("GOOGLE_VEO_API_KEY is not configured.");
}

export function veoRequest({ prompt, aspectRatio = "9:16", resolution = "720p" } = {}) {
  if (!String(prompt || "").trim()) throw new Error("A Veo prompt is required.");
  if (!new Set(["9:16", "16:9"]).has(aspectRatio)) throw new Error("Veo aspectRatio must be 9:16 or 16:9.");
  if (!new Set(["720p", "1080p", "4k"]).has(resolution)) throw new Error("Veo resolution must be 720p, 1080p or 4k.");
  return { instances: [{ prompt: String(prompt).trim() }], parameters: { aspectRatio, resolution } };
}

export async function startVeo({ prompt, aspectRatio, resolution, config = veoConfig(), fetchImpl = fetch } = {}) {
  assertVeoReady(config);
  const response = await fetchImpl(`${VEO_API_BASE}/models/${encodeURIComponent(config.model)}:predictLongRunning`, {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: { "content-type": "application/json", "x-goog-api-key": config.key },
    body: JSON.stringify(veoRequest({ prompt, aspectRatio, resolution })),
  });
  if (!response.ok) throw new Error(`Google Veo request failed: ${response.status} ${String(await response.text()).slice(0, 240)}`);
  const operation = await response.json();
  if (!operation?.name) throw new Error("Google Veo returned no operation id.");
  return operation;
}

export async function waitForVeo(operation, { config = veoConfig(), fetchImpl = fetch, pollMs = 10_000, maxWaitMs = 15 * 60_000 } = {}) {
  assertVeoReady(config);
  const started = Date.now();
  let current = operation;
  while (!current?.done) {
    if (Date.now() - started > maxWaitMs) throw new Error("Google Veo generation exceeded its 15-minute safety limit.");
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    const response = await fetchImpl(`${VEO_API_BASE}/${current.name}`, {
      signal: AbortSignal.timeout(30_000), headers: { "x-goog-api-key": config.key },
    });
    if (!response.ok) throw new Error(`Google Veo operation lookup failed: ${response.status}`);
    current = await response.json();
  }
  if (current.error) throw new Error(`Google Veo generation failed: ${current.error.message || JSON.stringify(current.error)}`);
  const uri = current?.response?.generatedVideos?.[0]?.video?.uri;
  if (!uri) throw new Error("Google Veo finished without a downloadable video.");
  return { operation: current, uri };
}

export async function downloadVeo({ uri, outFile, config = veoConfig(), fetchImpl = fetch } = {}) {
  assertVeoReady(config);
  if (!uri || !outFile) throw new Error("A generated video URI and output file are required.");
  const response = await fetchImpl(uri, { signal: AbortSignal.timeout(90_000), headers: { "x-goog-api-key": config.key } });
  if (!response.ok) throw new Error(`Google Veo download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 10_000) throw new Error("Google Veo download is unexpectedly small; refusing the file.");
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, bytes);
  return { file: outFile, bytes: bytes.length };
}

function flag(name, fallback = "") {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] || fallback : fallback;
}

const isMain = Boolean(process.argv[1]) && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
if (isMain) {
  const config = veoConfig();
  if (process.argv.includes("--preflight")) {
    console.log(`Google Flow / Veo: ${config.enabled && config.key ? "ready" : "not ready"} · model=${config.model} · key=${config.key ? "configured" : "missing"}`);
  } else {
    const prompt = flag("--prompt");
    const output = flag("--out", "out/google-veo-clip.mp4");
    const operation = await startVeo({ prompt, aspectRatio: flag("--aspect", "9:16"), resolution: flag("--resolution", "720p"), config });
    console.log(`Google Veo operation started: ${operation.name}`);
    const completed = await waitForVeo(operation, { config });
    const saved = await downloadVeo({ uri: completed.uri, outFile: output, config });
    console.log(`Google Veo clip saved: ${saved.file} (${saved.bytes} bytes)`);
  }
}
