import assert from "node:assert/strict";
import { DEFAULT_VEO_MODEL, assertVeoReady, startVeo, veoConfig, veoRequest, waitForVeo } from "./lib/google-veo.mjs";

assert.deepEqual(veoConfig({}), { enabled: false, key: "", model: DEFAULT_VEO_MODEL });
assert.throws(() => assertVeoReady(veoConfig({ GOOGLE_VEO_API_KEY: "x" })), /disabled/);
assert.throws(() => veoRequest({ prompt: "", aspectRatio: "9:16" }), /prompt/);
assert.deepEqual(veoRequest({ prompt: "A classroom", aspectRatio: "9:16", resolution: "720p" }), {
  instances: [{ prompt: "A classroom" }], parameters: { aspectRatio: "9:16", resolution: "720p" },
});

const config = veoConfig({ ENABLE_GOOGLE_VEO: "true", GOOGLE_VEO_API_KEY: "test-key" });
const calls = [];
const operation = await startVeo({ prompt: "A real German lesson classroom", config, fetchImpl: async (url, init) => {
  calls.push({ url, init });
  return new Response(JSON.stringify({ name: "operations/demo" }), { status: 200 });
}});
assert.equal(operation.name, "operations/demo");
assert.match(calls[0].url, /veo-3\.1-fast-generate-preview:predictLongRunning/);
assert.equal(JSON.parse(calls[0].init.body).parameters.aspectRatio, "9:16");

let polls = 0;
const done = await waitForVeo({ name: "operations/demo" }, { config, pollMs: 0, fetchImpl: async () => {
  polls++;
  return new Response(JSON.stringify({ done: true, response: { generatedVideos: [{ video: { uri: "https://example.test/video.mp4" } }] } }), { status: 200 });
}});
assert.equal(polls, 1);
assert.equal(done.uri, "https://example.test/video.mp4");
console.log("ok   Google Flow uses the official opt-in Veo API path and never generates while disabled");
