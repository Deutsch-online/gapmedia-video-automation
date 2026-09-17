import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { aiTriage, MAX_AUTO_RETRIES_PER_SLOT, recordDecision, repairPlan, retryDecision, scheduledSlotFromLog } from "./lib/auto-fix.mjs";

const slot = scheduledSlotFromLog("Berlin local time: 2026-09-18 11:04 CEST\nSelected scheduled slot: 2026-09-18-1100");
assert.deepEqual(slot, { date: "2026-09-18", batch: "1100" });
assert.equal(scheduledSlotFromLog("Manual override"), null, "manual builds may never be retried as scheduled slots");

const transient = { kind: "render", fingerprint: "render:a1", cause: "render failed", evidence: "Render failed" };
assert.equal(repairPlan(transient).retry, true, "a transient renderer failure gets a clean retry");
assert.equal(repairPlan({ kind: "config" }).retry, false, "missing credentials may never be retried blindly");
assert.equal(repairPlan({ kind: "narration-qc" }).action, "internal-narration-recovery", "narration repair stays inside its proven recovery engine");

let state = {};
let decision = retryDecision({ state, slot, diagnosis: transient, plan: repairPlan(transient) });
assert.equal(decision.retry, true);
state = recordDecision(state, decision, { slot, diagnosis: transient, plan: repairPlan(transient), runId: "123" });
for (let n = 1; n < MAX_AUTO_RETRIES_PER_SLOT; n++) {
  decision = retryDecision({ state, slot, diagnosis: transient, plan: repairPlan(transient) });
  state = recordDecision(state, decision, { slot, diagnosis: transient, plan: repairPlan(transient), runId: "123" });
}
assert.equal(retryDecision({ state, slot, diagnosis: transient, plan: repairPlan(transient) }).reason, "retry-budget-spent", "a persistent error cannot create an infinite dispatch loop");

const ai = await aiTriage({
  diagnosis: { kind: "unknown", cause: "unknown", evidence: "example" }, output: "example",
  env: { GEMINI_API_KEY: "configured" },
  ask: { gemini: async () => '{"action":"fresh-retry","reason":"خطای موقت رندر"}', groq: async () => "" },
});
assert.deepEqual(ai, { action: "fresh-retry", reason: "خطای موقت رندر", source: "ai" });
const invalid = await aiTriage({
  diagnosis: { kind: "unknown", cause: "unknown", evidence: "example" }, output: "example",
  env: { GEMINI_API_KEY: "configured" },
  ask: { gemini: async () => '{"action":"edit-any-file","reason":"bad"}', groq: async () => "" },
});
assert.equal(invalid.action, "needs-code-review", "AI may not authorize arbitrary file edits");

const workflow = readFileSync(".github/workflows/auto-fix.yml", "utf8");
assert.match(workflow, /workflows: \["German A1 lesson series"\]/, "Auto Fix must observe the German lesson workflow only");
assert.match(workflow, /actions: write/, "Auto Fix needs only the dispatch permission it uses");
assert.match(workflow, /Retry this exact scheduled slot once on a fresh runner/, "Auto Fix must re-dispatch the same slot, not create a bonus episode");
assert.match(workflow, /\.german-autofix-state\.json/, "repair state must persist across runners so its retry budget is real");
console.log("ok   Auto Fix only retries bounded, verified failure classes and constrains AI triage");
