// Berlin scheduling contract for the active German A1 production lane.
// GitHub cron is UTC-only, so the workflow must poll and decide against
// Europe/Berlin at runtime.  This protects the actual owner-requested times
// across CET/CEST, including the 17:30 half-hour slot.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/news-scan.yml", "utf8");

assert.match(workflow, /cron: "\*\/15 \* \* \* \*"/,
  "the scheduler must poll often enough to catch the 17:30 Berlin slot");
assert.match(workflow, /TZ=Europe\/Berlin date '\+%H:%M'/,
  "slot decisions must use the Berlin clock, not UTC");

for (const [time, batch] of [["05:00", "0500"], ["11:00", "1100"], ["17:30", "1730"]]) {
  assert.match(workflow, new RegExp(`local_hm" > "${time}"[\\s\\S]{0,200}batch=${batch}`),
    `${time} Berlin must have its own delivery slot`);
  assert.match(workflow, new RegExp(`\\$local_date-${batch}`),
    `${time} Berlin must have an independent same-day duplicate marker`);
}
assert.doesNotMatch(workflow, /07:00\/16:30\/20:30 Berlin/,
  "the retired three-slot schedule must not remain in the gate");
assert.match(workflow, /retry_batch:/,
  "Auto Fix needs an explicit, validated route for retrying the same scheduled slot");
assert.match(workflow, /Selected scheduled slot:/,
  "a failed run must carry its slot identity into the Auto Fix diagnostic");

console.log("German A1 scheduling is locked to 05:00, 11:00 and 17:30 Europe/Berlin");
