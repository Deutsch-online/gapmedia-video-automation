import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/daily.yml", "utf8");

// GitHub rejects the workflow before it creates any job when a job property
// is nested beneath `runs-on`. This once generated misleading failure emails
// for unrelated correction pushes.
assert.match(workflow, /^ {4}runs-on: ubuntu-latest\r?\n(?: {4}#.*\r?\n)* {4}timeout-minutes: 90\r?\n/m,
  "daily render timeout must align with runs-on");

// Regression guard for the production failure observed on 2026-09-11: a
// failure in the first native format used to stop the second one entirely.
assert.match(workflow, /id: produce/);
assert.match(workflow, /\.daily-delivery-progress\.json/);
assert.match(workflow, /run_slot tiktok\s+run_slot instagram/s);
assert.match(workflow, /run_slot ai-tiktok\s+run_slot ai-instagram/s);
// Each slot runs under its own `timeout`, so a stuck renderer cannot eat the
// job and starve its sibling format. The exact number is NOT pinned here —
// the budget check further down asserts what actually matters, that two
// slots plus setup fit inside the job with margin. Pinning the literal here
// as well only meant the number could not be corrected without editing two
// places, which is how run #260's too-tight 24m survived as long as it did.
assert.match(workflow, /timeout --preserve-status \d+m node daily-render\.mjs --only/);
assert.match(workflow, /Mark incomplete delivery for retry/);

// Regression guard for the production failure observed 2026-09-11 through
// 2026-09-12: the gate was an if/elif chain, so a morning batch stuck on one
// persistently-failing slot (already_sent only flips once BOTH its slots
// succeed) meant the elif for evening was never reached — .daily-batch-sent
// showed no "evening" entry for over a day while ai-tiktok/ai-instagram sat
// completely unattempted. Both thresholds must be checked independently and
// "all" used when both are due, and the delivered-marker must be recorded
// per real slot completion (not the whole run's pass/fail), so a stuck
// morning slot never again blocks evening from ever being marked sent.
assert.match(workflow, /morning_due=true/);
assert.match(workflow, /evening_due=true/);
assert.match(workflow, /if \[ "\$morning_due" = true \] && \[ "\$evening_due" = true \]; then\s*\n\s*echo "go=yes" >> "\$GITHUB_OUTPUT"\s*\n\s*echo "batch=all"/,
  "both thresholds due at once must select the combined \"all\" batch, not just morning");
assert.match(workflow, /REQUIRED = \{ morning: \["tiktok", "instagram"\], evening: \["ai-tiktok", "ai-instagram"\] \}/,
  "the delivered marker must be derived from actual per-slot completion, not the run's overall pass/fail");
assert.match(workflow, /Install Persian narration quality gate/);
// Narration and its ASR check are ON unless a `.silent-render` file is
// committed at the repo root (owner request 2026-09-13, so a paid-TTS outage
// can ship music-only videos instead of nothing). The default must stay
// narrated: a run with no marker has to come out "on" for all three, and
// silence has to be a deliberate, visible, committed act — never something a
// missing file or an unset variable produces by accident.
assert.match(workflow, /VOICE: \$\{\{ steps\.voicemode\.outputs\.voice \}\}/);
assert.match(workflow, /REQUIRE_VOICE: \$\{\{ steps\.voicemode\.outputs\.voice \}\}/);
assert.match(workflow, /NARRATION_QC: \$\{\{ steps\.voicemode\.outputs\.voice \}\}/);
assert.match(workflow, /if \[ -f \.silent-render \]; then\s*\n\s*echo "voice=off"[\s\S]{0,220}else\s*\n\s*echo "voice=on"/,
  "the marker must select silence and its ABSENCE must select narration — never the other way round");
// Deliberately NOT asserted: that .silent-render is absent. Silence is a
// legitimate state the owner asked for, so a test that fails for as long as
// they want it would just be noise they learn to ignore. The safeguard that
// actually works is visibility at the moment it matters — the workflow emits
// a ::warning:: naming the file on every silent run, and the file itself
// explains how to undo it.
assert.match(workflow, /ASR_MODEL: "medium"/);
assert.match(workflow, /group: gapmedia-production/);

const telegramWorkflow = readFileSync(".github/workflows/telegram.yml", "utf8");
assert.match(telegramWorkflow, /group: gapmedia-telegram/);
assert.match(telegramWorkflow, /rerender-feature/);
assert.match(telegramWorkflow, /RENDER_DIAGNOSTIC_FILE/);
assert.match(telegramWorkflow, /line: Number\.isInteger\(x\.line\) \? x\.line : null/,
  "safe render diagnostics retain only the failing narration line number");
assert.match(readFileSync("daily-render.mjs", "utf8"), /REQUIRE_VOICE === "on"[\s\S]{0,180}narration-planning/,
  "a required voice run must not fall back to an unmeasured beat grid");
assert.match(readFileSync("music/voice-qc.mjs", "utf8"), /voice-asr-mismatch/,
  "a rejected narration take must leave a safe, actionable category");
assert.match(readFileSync("music/plan-voice.mjs", "utf8"), /MAX_NARRATION_ATTEMPTS = 3/,
  "narration must use bounded recovery instead of stopping at its first rejected take");
assert.match(readFileSync("daily-render.mjs", "utf8"), /dailyDeliveriesForDate\(date, new Set\(\[\.\.\.avoidIds, \.\.\.triedIds\]\)\)/,
  "a duplicate or failed automatic candidate must seek a different unused topic");
assert.match(readFileSync("daily-render.mjs", "utf8"), /MAX_ATTEMPTS_PER_SLOT = isRerender \? 1 : 6/,
  "only an explicit correction rerender may stay pinned to its original subject");

const germanWorkflow = readFileSync(".github/workflows/news-scan.yml", "utf8");
assert.match(germanWorkflow, /\.german-correction-request\.json/);
assert.match(germanWorkflow, /steps\.gate\.outputs\.unit/);
assert.match(germanWorkflow, /NARRATION_QC: "on"/);

// Regression guard for the production incident observed 2026-09-12: the
// hourly news-scan.yml cron fired while the previous run was still in
// progress in the same "gapmedia-production" concurrency group, queued
// behind it as designed, and actually started executing AFTER that run had
// already pushed episode 17 and advanced nextIndex — but checkout defaults
// to `github.sha`, frozen at the moment the run was QUEUED, not when it
// actually executes, so the queued run silently rebuilt the exact same
// episode all over again instead of seeing the advanced state. Every
// workflow sharing this concurrency group needs an explicit `ref`.
for (const [name, wf] of [["daily.yml", workflow], ["news-scan.yml", germanWorkflow], ["telegram.yml", telegramWorkflow]]) {
  assert.match(wf, /uses: actions\/checkout@v4\s*\n\s*with:\s*\n\s*ref: main/,
    `${name}'s checkout must pin an explicit ref, not the stale github.sha a queued run was frozen at`);
}

// Regression guard for the production incident observed 2026-09-13: a
// German-lesson episode's Persian narration manifest has many independent
// TTS lines (hook + one per vocabulary item + outro), so a single retry (2
// total attempts) was not enough — a1-17-adjectives failed narration QC on
// FOUR separate takes across two runs, each time on a different word. Must
// match the daily pipeline's own bounded local-retry budget instead of
// giving up after one retry.
assert.match(readFileSync("german-lesson-build.mjs", "utf8"), /maxLocalRetries: 3/,
  "a German-lesson narration manifest with many lines needs the same bounded-retry budget as the daily pipeline, not a single retry");

// Regression guard for the owner's 2026-09-13 "Recovery Loop" directive: a
// persistent word failing EVERY local attempt of a cycle (a1-17's «بد» did
// this across 6 independent takes) must escalate to a genuinely different
// strategy (reword the line) instead of a blind Nth identical resynthesis,
// and must never silently end the job — RecoveryExhausted is only thrown
// once that new strategy has also been tried and failed, or none exists.
assert.match(readFileSync("german-lesson-build.mjs", "utf8"), /runWithRecovery/,
  "a persistently failing narration word must escalate to the Recovery Engine, not just retry the identical text");
assert.match(readFileSync("german-lesson-build.mjs", "utf8"), /rewordPersistentWord/,
  "German-lesson narration recovery must actually generate a new strategy (reword the failing line), not just report the failure");

// The free TTS engine is now the default for all three production workflows.
// It speaks Persian with no credentials (proven on a runner, tts-probe.yml run
// #2, 2026-09-13: the real wrapper produced a 5.088s mp3 for a live narration
// line), and needs a FREE HuggingFace token only for spans written in Latin
// script. Every workflow that renders narration must pass that secret through,
// so adding it is a one-click owner action and never a code change. Unset, it
// is an empty string and nothing changes.
for (const [name, wf] of [["daily.yml", workflow], ["news-scan.yml", germanWorkflow], ["telegram.yml", telegramWorkflow]]) {
  // A FREE engine, named as a property rather than a product. pocket was the
  // first; news-scan.yml moved to edge on 2026-09-13 after pocket-tts failed
  // every narration line of episode 18 against music/voice-qc.mjs. Pinning the
  // product name here would have turned that quality finding into a test
  // failure, which is backwards — what must not come back is the paid engine
  // whose exhausted credit stopped the pipeline.
  assert.match(wf, /TTS_ENGINE: "(pocket|edge)"/, `${name} must select a free engine`);
  assert.ok(!/TTS_ENGINE: "minimax"/.test(wf),
    `${name} must not go back to the paid engine by default — its credit running out is what stopped delivery`);
  assert.match(wf, /HF_TOKEN: \$\{\{ secrets\.HF_TOKEN \}\}/,
    `${name} renders narration, so it must pass the free token through — a Latin span otherwise fails the whole build for a secret that costs nothing`);
  assert.match(wf, /POCKET_TTS_FARSI_CONFIG=/,
    `${name} must point the wrapper at the downloaded model — music/pocket-tts.mjs otherwise falls back to a developer's local cache path and exits "model files not found"`);
}

// The classification that decides what the owner is told must stay in the
// tested module. Inline in daily-render.mjs it read the free engine's benign
// "higher rate limits" note as a quota failure.
assert.match(readFileSync("daily-render.mjs", "utf8"), /classifyVoiceFailure\(detail\)/,
  "voice-failure classification belongs to lib/slot-failure-report.mjs, where it is tested");

// Regression guard for the starvation measured 2026-09-13 19:16-19:27: the
// episode-18 rebuild was created three times and executed zero times. GitHub
// keeps one pending run per concurrency group, so while daily.yml held
// "gapmedia-production" for a 30-minute render, every queued lesson build was
// evicted by the next arrival — and telegram.yml's own "*/5" cron guarantees an
// arrival within five minutes. The German lesson therefore could not build at
// all during an evening render, which is how a shipped fix still looked broken.
//
// The two workflows write disjoint state (.german-lesson-* and the lib/ lesson
// sources here; .daily-* there) and both push through a pull --rebase retry, so
// the shared group bought nothing that is not already covered.
assert.match(germanWorkflow, /group: gapmedia-lesson/,
  "the lesson build needs its own concurrency group — queued behind daily renders it was evicted every time");
assert.ok(!/group: gapmedia-production/.test(germanWorkflow),
  "sharing the production group is what starved it; that must not come back");
// Each lane keeps its OWN lock, and nothing else shares the delivery queue.
//
// This assertion used to require the opposite — telegram.yml in
// "gapmedia-production" alongside daily.yml — on the reasoning that the two
// must not render from two stale editorial ledgers at once. Measurement
// retired that reasoning rather than convenience: slowing telegram.yml's cron
// (the previous response to the same starvation) left the hourly
// .trigger-telegram-poll push in the group, and on 2026-09-14 08:19:58 that
// push cancelled daily.yml #259 — carrying the image-upsize fix — 73 seconds
// after it queued, exactly as #239 had been cancelled the day before. The
// serialization also bought less than it looked: the two lanes restore the
// editorial ledger from different stores (git for daily.yml, the Actions
// cache for telegram.yml), so sharing a group never gave either a fresher
// view of the other's picks. Owner-approved 2026-09-14. See telegram.yml's
// concurrency comment for the residual risk and the escalation path.
assert.match(workflow, /group: gapmedia-production/);
assert.ok(!/group: gapmedia-production/.test(telegramWorkflow),
  "the hourly Telegram ping must never sit in the delivery queue again — that is what cancelled #239 and #259 before either ran a step");
assert.match(telegramWorkflow, /group: gapmedia-telegram/,
  "the listener still serializes against ITSELF — its own ledger cache is written by its own previous run");
// And the fix that actually addressed the stale-checkout duplicate stays put —
// asserted for all three above.

// Both slots must fit inside the job, with room to spare.
//
// Run #260 (2026-09-14) is why this is asserted rather than eyeballed:
// tiktok needed 21m00s to exhaust all 6 topics and report a real verdict,
// and instagram was killed at exactly 24m00s — the per-slot `timeout` —
// part-way through attempt 6, reporting nothing. The slot was working, not
// stuck. Meanwhile the comment beside that timeout still justified itself
// against a "60-minute job" the workflow had long since raised to 90, so
// the budget nobody rechecked was both stale and too tight.
{
  const slot = Number(workflow.match(/timeout --preserve-status (\d+)m node daily-render\.mjs/)[1]);
  const job = Number(workflow.match(/timeout-minutes: (\d+)/)[1]);
  const SLOTS = 2;      // morning: tiktok + instagram; evening: the ai- pair
  const SETUP_MINUTES = 5;   // checkout, caches, pocket-tts, system packages
  assert.ok(SLOTS * slot + SETUP_MINUTES <= job - 15,
    `two ${slot}m slots plus ${SETUP_MINUTES}m of setup must leave at least 15m of margin inside the ${job}m job — got ${job - (SLOTS * slot + SETUP_MINUTES)}m`);
  assert.ok(slot >= 30,
    "a slot needs room for all 6 topic attempts to report a verdict — 24m killed a working instagram slot mid-attempt-6 in run #260");
}

console.log("production workflows keep delivery state serialized and correction paths explicit");

// The gap the owner named on 2026-09-13: «بجای منی مکس از سرویس های دیگر
// استفاده کن». Switching the workflows to a free engine was not enough,
// because music/plan-voice.mjs and music/make-voice.mjs only recognised
// "pocket" — so TTS_ENGINE=edge on the daily path silently selected MINIMAX,
// the dead engine, and the replacement that was supposedly already done had
// quietly not happened there at all.
for (const [name, src] of [
  ["plan-voice", readFileSync("music/plan-voice.mjs", "utf8")],
  ["make-voice", readFileSync("music/make-voice.mjs", "utf8")],
]) {
  assert.match(src, /\["pocket", "edge"\]\.includes\(process\.env\.TTS_ENGINE\)/,
    `${name} must recognise every free engine — an unrecognised one falls back to the paid engine silently`);
  assert.match(src, /ENGINE === "edge"\s*\n\s*\? "music\/edge-tts\.mjs"/,
    `${name} must route the edge engine to its own adapter`);
  // music/edge-tts.mjs defaults to a German voice; Persian narration must say so.
  assert.match(src, /EDGE_TTS_VOICE: process\.env\.EDGE_PERSIAN_VOICE \|\| "fa-IR-[A-Za-z]+Neural"/,
    `${name} must name a Persian voice — the adapter's own default is German`);
  assert.match(src, /env: ttsEnv/,
    `${name} must actually pass that voice to the child process`);
}

// Both must choose the SAME engine, or make-voice re-synthesises what
// plan-voice already measured and the take's length drifts into the next slide.
{
  const pick = (src) => src.match(/const ENGINE = .*/)[0];
  assert.equal(pick(readFileSync("music/plan-voice.mjs", "utf8")),
    pick(readFileSync("music/make-voice.mjs", "utf8")),
    "planning and synthesis must select the engine identically — the cache key depends on it");
}

// Regression guard for the starvation measured 2026-09-13 19:16-20:19. GitHub
// keeps ONE pending run per concurrency group. daily.yml and telegram.yml share
// "gapmedia-production", and telegram.yml's cron was "*/5 * * * *" — so during
// a 30-minute evening render a run arrived every five minutes and evicted
// whatever was queued behind it. Three lesson builds and daily.yml #239 (which
// carried the image-rescue fix) were cancelled that way inside one hour, none
// having executed a single step. The work was never failing; it was never
// starting, which is far harder to notice.
//
// The cron was never what made the listener responsive — telegram.yml's own
// header records that it "does not fire anywhere near every 5 minutes", which
// is why the .trigger-telegram-poll push mechanism exists. Slowing it removes
// the evictions without touching delivery state or serialization.
assert.ok(!/cron: "\*\/5 \* \* \* \*"/.test(telegramWorkflow),
  "a 5-minute cron in the shared production group evicts every queued render — that is what stopped three builds from ever starting");
assert.match(telegramWorkflow, /cron: "\d+ \* \* \* \*"/,
  "the listener still polls hourly on its own, independent of the push trigger");
// The push trigger — the half that actually delivers a command promptly —
// must stay.
assert.match(telegramWorkflow, /\.trigger-telegram-poll/,
  "the reliable push trigger is what makes the listener responsive and must remain");

console.log("ok   every narration path recognises the free engines, so none of them can fall back to the dead one by accident");
