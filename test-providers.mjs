import assert from "node:assert/strict";
import { formatProviderReportFa, providerPlan, runWithProviderFallback } from "./lib/providers.mjs";

const noKeys = {};
assert.equal(providerPlan("text", noKeys).every((p) => !p.ready), true, "API text providers require a configured key");
assert.equal(providerPlan("voice", noKeys).find((p) => p.id === "edge").ready, true, "free Edge fallback remains available");
assert.equal(providerPlan("voice", { POCKET_TTS_FARSI_CONFIG: "set" }).find((p) => p.id === "pocket-farsi").production, false, "unapproved Pocket voice is visible but never auto-selected");

const order = [];
const result = await runWithProviderFallback({
  capability: "text",
  env: { GEMINI_API_KEY: "set", GROQ_API_KEY: "set" },
  runners: {
    gemini: async () => { order.push("gemini"); throw new Error("temporary outage"); },
    groq: async () => { order.push("groq"); return "translated"; },
  },
});
assert.deepEqual(order, ["gemini", "groq"], "fallback must continue to the next provider");
assert.equal(result.value, "translated");
assert.match(formatProviderReportFa({}), /Provider List/);
assert.doesNotMatch(formatProviderReportFa({ GEMINI_API_KEY: "secret-value" }), /secret-value/);
console.log("✓ provider registry and fallback verified");
