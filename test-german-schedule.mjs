// Berlin scheduling contract for the active German A1 production lane.
// GitHub cron is UTC-only, so the workflow must poll and decide against
// Europe/Berlin at runtime.  This protects the actual owner-requested times
// across CET/CEST, including the 17:30 half-hour slot.
//
// Owner request 2026-09-20: exactly two slots a day, 05:00 and 17:30 Berlin.
// One episode per slot — the gate must let a due slot claim the run whatever
// woke the workflow, because the Cloudflare Worker trigger push and the */15
// cron both arrive for the same slot.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/news-scan.yml", "utf8");

assert.match(workflow, /cron: "\*\/15 \* \* \* \*"/,
  "the scheduler must poll often enough to catch the 17:30 Berlin slot");
assert.match(workflow, /TZ=Europe\/Berlin date '\+%H:%M'/,
  "slot decisions must use the Berlin clock, not UTC");

const SLOTS = [["05:00", "0500"], ["17:30", "1730"]];
for (const [time, batch] of SLOTS) {
  assert.match(workflow, new RegExp(`local_hm" > "${time}"[\\s\\S]{0,200}batch=${batch}`),
    `${time} Berlin must have its own delivery slot`);
  assert.match(workflow, new RegExp(`\\$local_date-${batch}`),
    `${time} Berlin must have an independent same-day duplicate marker`);
}
assert.doesNotMatch(workflow, /07:00\/16:30\/20:30 Berlin/,
  "the retired three-slot schedule must not remain in the gate");
assert.doesNotMatch(workflow, /batch=1100|"1100"|11:00/,
  "11:00 Berlin is retired: only 05:00 and 17:30 may deliver a lesson");

// A due slot has to be decided before any manual fallback.  When the push
// branch was tested first, every Worker trigger built a "manual-HHMM" batch
// that no slot marker could match, so the following cron delivered the same
// slot a second time (2026-09-20: 0500 and 1100 each shipped twice).
const gate = workflow.slice(workflow.indexOf("go=no"), workflow.indexOf('echo "go=$go"'));
const firstSlot = gate.indexOf("batch=0500");
const manualFallback = gate.search(/batch="manual-\$\(TZ=Europe\/Berlin date '\+%H%M'\)"\n\s*echo "Forced/);
assert.ok(firstSlot > -1 && manualFallback > firstSlot,
  "a due Berlin slot must claim the run before any manual fallback batch");
assert.doesNotMatch(gate, /GITHUB_EVENT_NAME" == "push"[\s\S]{0,80}go=yes/,
  "a trigger push must not bypass the slot decision — that is what doubled each slot");

// Only the files this push actually carried may start an off-slot build.
assert.match(workflow, /jq -r .*GITHUB_EVENT_PATH/,
  "the gate must read the pushed file list from the event payload");
assert.match(workflow, /grep -Fxq '\.german-manual-build-request\.json'|pushed "\.german-manual-build-request\.json"/,
  "a manual build request must be verified against THIS push");

// Auto Fix dispatches news-scan.yml with force/retry_date/retry_batch; an
// undeclared input makes that API call fail with 422.
for (const input of ["force", "retry_date", "retry_batch"]) {
  assert.match(workflow, new RegExp(`^      ${input}:$`, "m"),
    `workflow_dispatch must declare the "${input}" input Auto Fix sends`);
}
assert.match(workflow, /retry_batch:/,
  "Auto Fix needs an explicit, validated route for retrying the same scheduled slot");
assert.match(workflow, /Selected scheduled slot:/,
  "a failed run must carry its slot identity into the Auto Fix diagnostic");

console.log("German A1 scheduling is locked to 05:00 and 17:30 Europe/Berlin, one episode per slot");
