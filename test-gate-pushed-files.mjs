// The gate must learn which files a push carried from something that exists.
//
// Measured live 2026-09-22, on two consecutive pushes: the push payload's
// commit objects carry NO added/modified/removed keys —
//   keys=["author","committer","distinct","id","message","timestamp","tree_id","url"]
// and .head_commit.modified is absent too. The gate read only those keys, so
// `changed` was always empty, pushed() was always false, and every correction
// and manual-build request since that guard landed was silently dropped.
// Episode 31's re-render request hit it twice before the cause was visible.
//
// The guard itself is right and stays: a request left on disk from an earlier
// cycle must never be replayed by an unrelated commit. Only its source of
// truth changes — from a payload field that does not exist to git, which does.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/news-scan.yml", "utf8");

// git has to be able to answer. A depth-1 clone has no parent to diff against,
// and `git show` on a parentless commit lists the whole tree — which would make
// pushed() true for everything, the opposite failure.
assert.match(workflow, /fetch-depth: 2/,
  "the gate diffs the pushed commit against its parent, so the parent must be cloned");

assert.match(workflow, /git diff --name-only HEAD~1 HEAD/,
  "the pushed file list must come from git, not only from payload keys that do not exist");

// The payload read stays first, so the gate recovers by itself if GitHub ever
// restores those keys — but it must not be the only source any more.
const gate = workflow.slice(workflow.indexOf('changed=""'), workflow.indexOf("go=no"));
assert.ok(gate.indexOf("GITHUB_EVENT_PATH") < gate.indexOf("git diff --name-only"),
  "the payload is tried first; git is the fallback that actually works today");
assert.match(gate, /rev-parse --verify --quiet HEAD~1/,
  "a shallow clone with no parent must leave the list empty, never fall back to the whole tree");

// The guard must still be a guard: an empty list starts nothing.
assert.match(workflow, /pushed\(\) \{ printf '%s\\n' "\$changed" \| grep -Fxq "\$1"; \}/,
  "pushed() must still match a whole path from THIS push, not a substring or a file on disk");
for (const request of [".german-correction-request.json", ".german-manual-build-request.json"]) {
  assert.match(workflow, new RegExp(`pushed "${request.replace(/\./g, "\\.")}"`),
    `${request} must still be verified against this push before it starts a build`);
}

console.log("the gate reads the pushed file list from git, and the replay guard still holds");
