// One command for the GapMedia daily pipeline: builds + renders + adds
// music for the day's 3 videos (TikTok / Instagram / social).
// Usage:
//   node daily-render.mjs              # today, 1080x1920
//   node daily-render.mjs 2026-08-20   # a specific date
//   node daily-render.mjs --4k         # today, 2160x3840
// This script self-locates the project dir, so a scheduler can call it directly.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { buildHTML } from "./lib/build.mjs";
import { buildInkHTML } from "./lib/build-ink.mjs";
import { buildNeonHTML } from "./lib/build-neon.mjs";
import { buildCartoonHTML } from "./lib/build-cartoon.mjs";
import { packsForDate, packForFeature, CATEGORIES, dailyDeliveriesForDate } from "./lib/content.mjs";
import { sceneArtPlan } from "./lib/scene-art.mjs";
import { creativeBriefFor } from "./lib/creative-brief.mjs";
import { assertVisualProof } from "./lib/visual-proof.mjs";
import { rescuePackPhotos } from "./lib/auto-image.mjs";
import { accentSpec } from "./music/mood.mjs";
import { loadEnv, telegramConfig, sendVideo, sendMessage } from "./lib/telegram.mjs";
import { fingerprint, check, register, hasHistory } from "./lib/dedupe.mjs";
import { summariseSlotFailure, classifyVoiceFailure } from "./lib/slot-failure-report.mjs";
import { engineLedger } from "./lib/web-search.mjs";

const projectDir = dirname(fileURLToPath(import.meta.url));
process.chdir(projectDir);

const args = process.argv.slice(2);
const is4k = args.includes("--4k");
const noTelegram = args.includes("--no-telegram");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null; // e.g. --only tiktok
// The Telegram helper already reads .env, but the subprocesses that generate
// MiniMax narration inherit only process.env.  Promote local .env values once
// here so local renders behave exactly like the GitHub Actions runner.
const localEnv = loadEnv();
Object.assign(process.env, localEnv);
const tg = noTelegram ? { enabled: false } : telegramConfig(localEnv);
const dateArg = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const date = dateArg ? new Date(dateArg + "T12:00:00") : new Date();
const iso = date.toISOString().slice(0, 10);

const HF = "npx --yes hyperframes@0.8.16";
const resFlag = is4k ? "--resolution portrait-4k" : "";

// --feature <id> publishes one named feature immediately, whatever the rotation
// says. A freshly researched update is worth shipping the day it lands.
const featIdx = args.indexOf("--feature");
const featureId = featIdx >= 0 ? args[featIdx + 1] : null;
// A correction is the only legitimate exception to the no-repeat rule. It
// must name the exact failed feature, so a broad daily batch can never bypass
// editorial memory by accident.
const isRerender = args.includes("--rerender");
const diagnosticFile = process.env.RENDER_DIAGNOSTIC_FILE || "";
let lastStage = "started";
function checkpoint(stage, reason = null) {
  lastStage = stage;
  if (!diagnosticFile) return;
  let priorReason = null, priorTiming = null, priorLine = null, priorFaultKind = null, priorWordIndex = null;
  try {
    const prior = JSON.parse(readFileSync(diagnosticFile, "utf8"));
    priorReason = prior.reason || null;
    priorTiming = prior.timing || null;
    priorLine = Number.isInteger(prior.line) ? prior.line : null;
    priorFaultKind = prior.faultKind || null;
    priorWordIndex = Number.isInteger(prior.wordIndex) ? prior.wordIndex : null;
  } catch {}
  writeFileSync(diagnosticFile, JSON.stringify({
    stage,
    featureId: featureId || null,
    rerender: isRerender,
    // Fixed internal labels only — never raw runner output or user copy.
    reason: reason || priorReason || null,
    timing: priorTiming,
    line: priorLine,
    faultKind: priorFaultKind,
    wordIndex: priorWordIndex,
    at: new Date().toISOString(),
  }, null, 2));
}
checkpoint("started");
if (isRerender && !featureId) {
  console.error("✗ --rerender requires --feature <id>; a normal daily batch may never bypass duplicate protection.");
  process.exit(1);
}

const sel = packsForDate(date);
const featIdxEarly = args.indexOf("--feature");
let deliveries = dailyDeliveriesForDate(date);
// Shared across the pre-scan below AND the per-slot retry loop further down:
// an id excluded here (no real screenshot) must stay excluded there too, and
// an id a retry gives up on after this pre-scan must not be handed straight
// back out by a later dailyDeliveriesForDate() call in the same run.
const avoidIds = new Set();
if (featIdxEarly < 0) {
  // Visual QC (below) rejects a pack with no real per-slide screenshot. That
  // used to just kill the slot for the day; now the rotation gets a chance to
  // move on to the next id in its own category instead of reporting failure
  // on the first one it happens to land on. Each round collects every id that
  // is STILL failing across all four slots (not just the first one found) so
  // one exhausted category — every one of its ids already tried — does not
  // stop the others from still swapping to a fresh pick. A round that adds no
  // new id means every category has hit its own wall, so it stops there.
  //
  // Owner report 2026-09-11: a run hung a full 60 minutes (the job's own
  // timeout, "The operation was canceled") stuck alternating between two
  // AI-tools candidates that both lack a committed real photo (rely
  // entirely on live rescuePackPhotos()) while a live-photo pipeline issue
  // meant rescue kept failing for them — the round<60 cap alone did not
  // bound this, because OTHER slots (tiktok/instagram) kept finding
  // genuinely new failing ids each round, so `progressed` stayed true and
  // the loop kept running even though the AI slot itself was stuck. A wall-
  // clock budget bounds the worst case regardless of which slot is stuck or
  // why, so the render step still gets a chance to run with whatever was
  // resolved instead of burning the entire job timeout on pre-scanning.
  const PRE_SCAN_BUDGET_MS = 8 * 60 * 1000;
  const preScanDeadline = Date.now() + PRE_SCAN_BUDGET_MS;
  for (let round = 0; round < 60; round++) {
    if (Date.now() > preScanDeadline) {
      console.error(`   ⚠ pre-scan hit its ${PRE_SCAN_BUDGET_MS / 60000}-minute budget after round ${round} — proceeding with whatever each slot currently resolves to instead of continuing to retry.`);
      break;
    }
    let progressed = false;
    for (const d of deliveries) {
      // The budget above is only checked between ROUNDS; a single slow-but-
      // not-quite-hung rescuePackPhotos() call for one delivery inside this
      // loop could still run the round itself well past the budget before
      // that check runs again. Checking here too bounds the worst case to
      // "one more in-flight rescue attempt", not "one more full round".
      if (Date.now() > preScanDeadline) break; // the round-start check above logs and stops the outer loop next iteration
      // The Visual Truth Gate exists to stop a real screenshot being faked.
      // STYLE=cartoon never claims a real screenshot at all — every scene is
      // an illustrated mascot + a symbolic icon by design (owner-directed
      // pivot, 2026-09-07) — so there is nothing for this gate to check.
      if (process.env.STYLE === "cartoon") continue;
      try { assertVisualProof(d.pack); continue; } catch {
        // Most of the rotation banks predate the Visual Truth Gate and only
        // ever had a guessed `tip.ui` mockup, never a real screenshot. Try
        // to source one automatically before giving up on this id entirely
        // — a real, verified photo is strictly better than skipping to the
        // next candidate and losing this id's turn in the rotation.
        try {
          if (await rescuePackPhotos(d.pack)) { assertVisualProof(d.pack); continue; }
        } catch { /* still fails after rescue attempt — fall through below */ }
      }
      const id = String(d.pack.id).toLowerCase();
      if (!avoidIds.has(id)) { avoidIds.add(id); progressed = true; }
    }
    if (!progressed) break;
    deliveries = dailyDeliveriesForDate(date, avoidIds);
  }
}
let generated = null;
if (featureId) {
  // One-off user-supplied tutorials live in a generated file rather than in
  // the permanent feature banks. The German Insider news channel this used
  // to also cover is retired (owner request 2026-09-11) — its own
  // --news-generated path imported a file that no longer exists.
  if (args.includes("--custom-generated")) {
    const mod = await import("./lib/generated/custom-current.mjs?t=" + Date.now());
    generated = mod.CURRENT_CUSTOM;
  }
  const p = packForFeature(featureId, date, generated);
  if (!p) {
    checkpoint("feature-not-found");
    console.error(`✗ unknown feature "${featureId}".`);
    process.exit(1);
  }
  sel[p.platform] = p;
  checkpoint("feature-resolved");
  deliveries = [{ slot: p.platform, sourceCategory: p.platform, deliveryChannel: p.platform, role: "feature", mirrorOf: null, pack: p }];
}
const compDir = `compositions/daily/${iso}`;
const outDir = `renders/daily/${iso}`;
mkdirSync(compDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const pick = only || (featureId ? deliveries[0].slot : null);
if (pick) deliveries = deliveries.filter((d) => d.slot === pick);
if (!deliveries.length) {
  const choices = featureId ? [packForFeature(featureId, date, generated)?.platform].filter(Boolean) : ["tiktok", "instagram", "ai-tiktok", "ai-instagram"];
  console.error(`✗ unknown daily slot "${pick}". Use one of: ${choices.join(", ")}`);
  process.exit(1);
}

const SENT_LOG = ".telegram-sent.json";
// Unlike the short Telegram delete log, this file is committed by the cloud
// workflow after a successful delivery.  It is the editorial memory used by
// topic research: a subject that has already reached Telegram is not a fresh
// candidate, even if it is still present in a feature bank.
const CONTENT_HISTORY = ".content-history.json";

// A small rolling log of what the bot posted, so "پاک کن" has something to act
// on. Kept to the last 30 entries — anything older is past the delete window.
function recordSent(entry) {
  let log = [];
  try { log = JSON.parse(readFileSync(SENT_LOG, "utf8")); } catch {}
  log.push(entry);
  writeFileSync(SENT_LOG, JSON.stringify(log.slice(-30), null, 2));
}

function recordPublishedTopic(pack, entry) {
  let history = [];
  try { history = JSON.parse(readFileSync(CONTENT_HISTORY, "utf8")); } catch {}
  const topic = String(pack.feature || pack.title || pack.id || "").replace(/<[^>]*>/g, " ").trim();
  history.push({
    id: pack.id,
    platform: pack.platform,
    topic,
    hook: String(pack.hook?.ask || "").replace(/<[^>]*>/g, " ").trim(),
    messageId: entry.messageId || null,
    sentAt: new Date().toISOString(),
  });
  // Editorial memory is intentionally permanent.  A rolling log made an
  // older topic eligible again after 180 posts, which is the opposite of the
  // owner's "never publish the same subject twice" rule.  This small JSON
  // ledger is committed by the runner and is the authoritative publication
  // history for all future topic selection.
  writeFileSync(CONTENT_HISTORY, JSON.stringify(history, null, 2) + "\n");
}

const results = [];
// rule 10: items in one run are compared against each other, not only history
const batchPrints = [];
// A build used to just die on its first failure — a Visual QC reject, a
// duplicate-topic reject, a render/voice crash, a Telegram send error — and
// that slot shipped nothing for the day, with no second attempt on a
// different topic. Requested explicitly: on any of those, try again with a
// FRESH candidate for the same slot before giving up, so a single bad topic
// (missing photo, already covered, a crash specific to its script) does not
// cost the day a video when the category has other untried topics left.
// A direct feature request is still protected from duplicate publication. If
// that subject has already gone out, a normal build now seeks a new verified
// topic in the same slot instead of stopping on a rejection. The one exception
// is `--rerender`: it is a repair of a known video and must never silently turn
// into a different subject.
//
// Verified live 2026-09-08: a duplicate rejection (a full, expensive render
// that only fails at the very last dup-check) can be followed by several
// Visual QC rejections in a row (cheap — they fail before any render work,
// most of a category's older bank entries predate the real-screenshot
// requirement). 6 gives real room to clear a short run of cheap QC misses
// after one expensive miss, without letting a slot stuck on QC failures
// alone eat the whole job's time budget re-rendering repeatedly.
const MAX_ATTEMPTS_PER_SLOT = isRerender ? 1 : 6;
const isRealAsset = (tip) => typeof tip?.photo === "string" && tip.photo.startsWith("public/") && existsSync(tip.photo);
for (const firstDelivery of deliveries) {
  let delivery = firstDelivery;
  const triedIds = new Set();
  // Every attempt's reason, not just the last one. The give-up alert below
  // summarises the whole set — see lib/slot-failure-report.mjs for the real
  // mixed-cause run that made this necessary.
  const slotFailures = [];
  for (let attempt = 1; ; attempt++) {
    const { slot: platform, pack, mirrorOf } = delivery;
    triedIds.add(String(pack.id).toLowerCase());
    try {
      // Reject a known duplicate before any image rescue, TTS charge or video
      // render begins.  The delivery-time check below remains as the final
      // race-condition guard, but this preflight is the normal path: a topic
      // that the 30-day registry already knows about must not spend minutes
      // rendering only to be rejected at the end.
      if (!mirrorOf && !isRerender) {
        const earlyDuplicate = check(fingerprint(pack), { alsoAgainst: batchPrints });
        if (earlyDuplicate.verdict === "DUPLICATE") {
          throw Object.assign(
            new Error(`تکراری (${earlyDuplicate.score}) — همان محتوای «${earlyDuplicate.closest?.id}» در ۳۰ روز اخیر رفته است`),
            { kind: "duplicate", dup: earlyDuplicate },
          );
        }
      }
      // Do this before HTML/audio/render work. A missing real visual is a
      // research failure, not a reason to ship a generic illustration. Most
      // of the older rotation banks predate this gate and were never fitted
      // with a real per-slide screenshot, so this fails often and
      // predictably — a content gap, not a code bug.
      try {
        if (process.env.STYLE !== "cartoon") assertVisualProof(pack);
      } catch (firstErr) {
        // The pre-scan loop above already tried this for the daily rotation;
        // a direct "--feature <id>" build skips that loop entirely, so it
        // gets one rescue attempt of its own here before being reported.
        try {
          if (!(await rescuePackPhotos(pack))) throw firstErr;
          assertVisualProof(pack);
        } catch (stillErr) {
          throw Object.assign(new Error(stillErr.message), { kind: "visualQc" });
        }
      }
      checkpoint("visual-proof-passed");
      // Generate the topic-specific creative contract before any sound, HTML
      // or render work. It is saved beside the composition for review and
      // prevents a generic visual decision from being made after the script
      // is already built.
      const creativeBrief = creativeBriefFor(pack, { date });
  pack.creative = creativeBrief;
  writeFileSync(`${compDir}/${platform}-creative-brief.json`, JSON.stringify(creativeBrief, null, 2));
  // Measure the narration FIRST, then let each scene last as long as its own
  // spoken line (padded, and never shorter than a readable beat). Without this
  // the voice drifts past the caption it belongs to.
      if (process.env.VOICE === "on") {
        checkpoint("narration-planning");
    try {
      const plan = JSON.parse(
        // stderr is PIPED, not inherited: execSync's default sends the child's
        // stderr straight to the runner log, so the thrown error carried only
        // "Command failed: node music/plan-voice.mjs <id> 4" and the real
        // reason underneath it was unreachable from code. On 2026-09-13 that
        // reason was "MiniMax TTS failed: insufficient credit", which is an
        // account-level stop affecting every topic and every slot — and the
        // owner's alert could not say so. It is re-emitted below, so the job
        // log keeps exactly what it had.
        execSync(`node music/plan-voice.mjs ${pack.id} ${pack.tips.length}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim().split(String.fromCharCode(10)).pop()
      );
      if (plan.ok && plan.durs.length === pack.tips.length + 2) {
        // A clear end-breath is better than the last word colliding with the
        // next card. This padding is preserved because make-voice reuses the
        // very files measured above.
        // Leave a full spoken landing before the next card. The voice files
        // themselves are reused by the mixer, so this is a real gap after the
        // sentence — not a guessed visual duration.
        const PAD = 1.15, MIN = 2.5;
        pack.hookDuration = +Math.max(MIN + 0.3, plan.durs[0] + PAD).toFixed(3);
        pack.tipDurations = plan.durs.slice(1, -1).map((d) => +Math.max(MIN, d + PAD).toFixed(3));
        pack.outroDuration = +Math.max(3.6, plan.durs[plan.durs.length - 1] + 1.3).toFixed(3);
        pack.duration = +(
          pack.hookDuration + pack.tipDurations.reduce((a, d) => a + d, 0) + pack.outroDuration
        ).toFixed(3);
        pack.music = pack.music.replace(/.m4a$/, "-vo.m4a");
        console.log(`   timing follows speech: ${pack.duration}s`);
      }
    } catch (e) {
      // Put the child's own output back in the log, unchanged — piping it
      // above is for classification, never to hide it.
      if (e.stderr) process.stderr.write(e.stderr);
      const detail = String(e.stderr || "");
      // An account-level stop is not this topic's problem: the next five topics
      // hit the identical wall and only the owner can clear it. Marked so the
      // give-up alert names the real remedy instead of reporting a generic
      // technical error. The decision lives in lib/slot-failure-report.mjs so
      // it can be tested — in particular, the free engine prints a benign
      // "higher rate limits" note on every unauthenticated run, which a naive
      // substring match reads as a quota failure.
      const verdict = classifyVoiceFailure(detail);
      if (verdict.providerShortage) e.providerShortage = verdict.providerShortage;
      if (verdict.missingToken) e.missingToken = verdict.missingToken;
      console.error("   ✗ voice planning failed:", String(e.message).split(String.fromCharCode(10))[0]);
      // A required narrated delivery may never fall back to an unmeasured beat
      // grid. That was the root of a later timing-guard failure: the real TTS
      // line was longer than a default scene and the video could not be sent.
      // Local music-only design previews may still intentionally continue.
      if (process.env.REQUIRE_VOICE === "on") {
        e.kind = verdict.kind === "missingToken" || verdict.kind === "providerShortage" ? verdict.kind : "narration-planning";
        throw e;
      }
    }
  }

  const comp = `${compDir}/${platform}.html`;
  writeFileSync(comp, (process.env.STYLE === "neon" ? buildNeonHTML : process.env.STYLE === "legacy" ? buildHTML : process.env.STYLE === "cartoon" ? buildCartoonHTML : buildInkHTML)(pack));
  // Beat-synced score: generated at this video's exact length so every cut lands
  // on a bar, and the intro/drop/outro line up with hook/tips/CTA.
  // every scene boundary, so the score can punctuate the picture changing
  const cutTimes = (() => {
    const lens = pack.tipDurations ||
      Array.from({ length: pack.tips.length },
        () => (pack.duration - pack.hookDuration - pack.outroDuration) / pack.tips.length);
    const out = [pack.hookDuration];
    let acc = pack.hookDuration;
    for (const L of lens) { acc += L; out.push(+acc.toFixed(3)); }
    return out;
  })();

  let music = pack.music;
  if (pack.duration && pack.musicVariant) {
    execSync(
      `node music/make-one.mjs ${pack.duration} ${pack.musicVariant} "${pack.music}" ${pack.musicOutroBars || 4}`,
      {
        stdio: "inherit",
        env: {
          ...process.env,
          MUSIC_CUTS: cutTimes.join(","),
          // mood from the video's topic, one accent per slide from that slide's art
          MUSIC_MOOD: pack.mood || "",
          MUSIC_BPM: String(pack.bpm || ""),
          MUSIC_ACCENTS: accentSpec(cutTimes, ["", ...sceneArtPlan(pack.tips)]),
        },
      }
    );
  }
  if (!existsSync(music)) music = "music/bed-60s-v1.m4a";

  // Persian voiceover, laid on the same scene timings, with the music ducked
  // under it so the words stay intelligible. VOICE=off skips it.
  let voice = null;
  if (process.env.VOICE === "on") {
    checkpoint("narration-mixing");
    const tipLen = (pack.duration - pack.hookDuration - pack.outroDuration) / pack.tips.length;
    const tipList = (pack.tipDurations || []).join(",");
    const vFile = `music/voice/${platform}-${pack.id}.m4a`;
    try {
      execSync(
        `node music/make-voice.mjs ${pack.id} ${pack.hookDuration} ${tipLen.toFixed(3)} ` +
        `${tipList ? `--tips ${tipList} ` : ""}` +
        `${pack.tips.length} ${(pack.duration - pack.outroDuration).toFixed(3)} ${pack.duration} "${vFile}"`,
        { stdio: "inherit", env: { ...process.env, VOICE_DIAGNOSTIC_FILE: diagnosticFile } }
      );
      if (existsSync(vFile)) voice = vFile;
      if (!voice && process.env.REQUIRE_VOICE === "on") {
        // "Narration did not render" on its own sent a CI failure back with no
        // way to tell a missing API key from a feature whose lines could not be
        // resolved — the last one took a code read to find. Say which it is.
        const { narrationFor } = await import("./lib/narration.mjs");
        const why = !narrationFor(pack.id)
          ? `no narration resolved for "${pack.id}" — lib/generated/custom-current.mjs is missing or holds a different id`
          : !process.env.MINIMAX_API_KEY
            ? "MINIMAX_API_KEY is not set in this environment"
            : `MiniMax returned no audio for "${pack.id}"`;
        throw new Error(`Narration did not render for voice-required run: ${why}`);
      }
    } catch (e) {
      console.error("   ✗ voice failed, continuing music-only:", String(e.message).split(String.fromCharCode(10))[0]);
      // A requested narrated video must not silently arrive as music-only.
      // Production workflows set REQUIRE_VOICE=on; local design previews can
      // still deliberately fall back to music when that flag is absent.
      if (process.env.REQUIRE_VOICE === "on") throw e;
    }
  }

  const silent = `${outDir}/${platform}-silent.mp4`;
  const final = `${outDir}/gapmedia-${platform}-${iso}.mp4`;
  console.log(`\n=== ${platform} (${pack.id}) — ${is4k ? "4K" : "1080p"} — ${music} ===`);
  checkpoint("video-rendering");
  execSync(`${HF} render -c "${comp}" --quality high --fps 30 ${resFlag} --skill=faceless-explainer -o "${silent}"`, { stdio: "inherit" });
  if (voice) {
    execSync(
      `ffmpeg -y -hide_banner -loglevel error -i "${silent}" -i "${music}" -i "${voice}" ` +
      // `-shortest` can terminate the whole delivery on an encoder-duration
      // discrepancy. The voice scheduler already proves every sentence fits;
      // pad the bed and produce the composition's exact duration instead.
      `-filter_complex "[1:a]volume=0.85[m];[m][2:a]sidechaincompress=threshold=0.02:ratio=20:attack=8:release=260:makeup=1[duck];[duck][2:a]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.5,apad,atrim=duration=${pack.duration}[a]" ` +
      `-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t ${pack.duration} -movflags +faststart "${final}"`,
      { stdio: "inherit" }
    );
  } else {
    execSync(`ffmpeg -y -i "${silent}" -i "${music}" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${final}"`, { stdio: "inherit" });
  }

  let sent = false;
  // Checkpoint 2: the last gate before delivery. The first gate is at topic
  // selection, but two research runs can arrive at the same subject by
  // different routes, and the batch itself has to be checked against its own
  // earlier items — so the decision is made again here, against the registry
  // plus whatever this run has already queued.
  const print = fingerprint(pack);
  // The second AI file is an intentional channel-specific package of the same
  // approved subject. It must not be rejected as a duplicate of its TikTok
  // counterpart, while the first package still checks published history.
  const dup = mirrorOf
    ? { verdict: "MIRROR", score: 0, checked: true, sameSubstance: true, mirrorOf }
    : isRerender
      ? { verdict: "RERENDER", score: 0, checked: true, sameSubstance: true }
      : check(print, { alsoAgainst: batchPrints });
  if (dup.verdict === "DUPLICATE") {
    throw Object.assign(
      new Error(`تکراری (${dup.score}) — همان محتوای «${dup.closest?.id}» در ۳۰ روز اخیر رفته است`),
      { kind: "duplicate", dup },
    );
  }
  if (dup.verdict === "PARTIALLY_OVERLAPPING") {
    console.warn(`   ⚠ هم‌پوشانی ${dup.score}٪ با «${dup.closest?.id}» — بررسی کن که چیز تازه‌ای می‌گوید`);
  }
  if (!dup.checked) console.warn("   ⚠ تاریخچه‌ای برای مقایسه نبود؛ یکتا بودن تأیید نشده است");
  if (!mirrorOf) batchPrints.push(print);

  if (tg.enabled) {
    try {
      checkpoint("telegram-delivery");
      const res = await sendVideo({ token: tg.token, chatId: tg.chatId, file: final, caption: pack.tgTitle });
      console.log(`   ✈ sent to Telegram`);
      sent = true;
      // remember the message so it can be taken back; Telegram allows a bot to
      // delete its own messages for 48 hours and nothing else
      if (res && res.message_id) {
        const delivery = { kind: "daily", platform, packId: pack.id, messageId: res.message_id, at: Date.now() };
        recordSent(delivery);
        // This is the editorial memory for both channels.  A story counts as
        // published only after Telegram confirms a message id; drafts and
        // aborted renders must never suppress a future story.
        // A correction replaces a defective delivery; it must not become a
        // second editorial subject in the anti-repeat history.
        if (!isRerender) {
          recordPublishedTopic(pack, delivery);
          register({ ...print, messageId: res.message_id, kind: delivery.kind, sentAt: new Date().toISOString() });
        }
      }
    } catch (e) {
      console.error(`   ✗ Telegram send failed: ${e.message}`);
      throw e;
    }
  } else if (!noTelegram) {
    throw new Error("Telegram is not configured; refusing to mark a local-only render as delivered.");
  }
      results.push({ platform, packId: pack.id, topicLane: delivery.sourceCategory, mirrorOf, file: resolve(final), telegram: sent });
      checkpoint("complete");
      break; // this attempt succeeded — done with this slot
    } catch (err) {
      // Preserve the last named production stage in the safe diagnostic. Raw
      // runner text can contain user content or paths, but this fixed label is
      // enough to distinguish timing, audio-mix, video-render and delivery.
      checkpoint(`failed-${err.kind || lastStage || "runtime"}`);
      // Every failure mode above (Visual QC, duplicate, voice/render crash,
      // Telegram send) lands here. avoidIds is shared with the pre-scan so a
      // photo-less id excluded there stays excluded; triedIds additionally
      // keeps this run from re-picking an id that JUST failed for this slot.
      avoidIds.add(String(pack.id).toLowerCase());
      slotFailures.push({
        id: pack.id,
        kind: err.kind,
        message: err.message,
        providerShortage: err.providerShortage,
        missingToken: err.missingToken,
        // Captured here, while this attempt's pack is still in scope: by the
        // time the slot gives up, `pack` is whichever topic failed LAST.
        missingSlides: err.kind === "visualQc"
          ? (pack.tips || [])
            .map((t, i) => (isRealAsset(t) ? null : { n: i + 1, text: String(t.text || t.head || "").replace(/<[^>]*>/g, "") }))
            .filter(Boolean)
          : [],
      });
      const canRetry = attempt < MAX_ATTEMPTS_PER_SLOT;
      // featureFor()/aiFeatureFor() (lib/features.mjs) fall back to the day's
      // original, unexcluded pick once every candidate in the category is
      // exhausted — pickAvoiding() returns undefined and `|| list[i]` takes
      // over, ignoring the exclude set entirely. Verified live 2026-09-08:
      // once the category was actually exhausted this alone re-served the
      // exact same failed id three attempts running ("reply-video", "reply-
      // video", "reply-video"). Rejecting an alt already in triedIds is the
      // same "did this round actually make progress" check the pre-scan loop
      // above already uses for the identical reason — treat a repeat as no
      // alternative left, not as a fresh candidate to burn an attempt on.
      const found = canRetry
        ? dailyDeliveriesForDate(date, new Set([...avoidIds, ...triedIds])).find((d) => d.slot === platform)
        : null;
      const alt = found && !triedIds.has(String(found.pack.id).toLowerCase()) ? found : null;
      if (alt) {
        console.error(`   ⚠ ${platform} (${pack.id}) attempt ${attempt}/${MAX_ATTEMPTS_PER_SLOT} failed: ${err.message} — retrying with a new topic (${alt.pack.id})`);
        delivery = alt;
        continue;
      }
      // No attempts left, or no untried candidate left for this slot: give up
      // on it, but — critically — do not throw out of the process. One
      // slot's exhausted failure must never take down the other slots in the
      // same GitHub Actions step (daily.yml runs one `node daily-render.mjs
      // --only <slot>` per platform in one shell step; an uncaught throw here
      // used to abort that whole shell step under `set -e`, so a crash on
      // e.g. tiktok silently skipped instagram too, not just tiktok).
      console.error(`   ✗ ${platform} (${pack.id}) failed after ${attempt} attempt${attempt === 1 ? "" : "s"}, no more topics to try: ${err.message}`);
      if (tg.enabled) {
        try {
          // Summarised from EVERY attempt, not just `err` (the last one) —
          // a slot that lost three topics to a missing screenshot and three
          // to duplicates used to report only whichever came last, hiding
          // the half the owner could actually fix. See
          // lib/slot-failure-report.mjs.
          const label = summariseSlotFailure(slotFailures);
          await sendMessage({
            token: tg.token, chatId: tg.chatId,
            text: `⚠ ویدیوی ${platform} بعد از ${attempt} تلاش (موضوع‌های مختلف) ساخته نشد.\n\nآخرین علت: ${err.message}\n\n${label}`,
          });
        } catch {}
      }
      results.push({ platform, packId: pack.id, topicLane: delivery.sourceCategory, mirrorOf, file: null, sent: false, buildFailed: err.message, attempts: attempt });
      break;
    }
  }
}

writeFileSync(`${outDir}/manifest.json`, JSON.stringify({ date: iso, dayIndex: sel.dayIndex, resolution: is4k ? "2160x3840" : "1080x1920", videos: results }, null, 2));
console.log(`\n✅ ${iso}: ${results.length} videos ready in ${outDir}\n` + results.map((r) => "   " + r.file).join("\n"));

// One line naming each keyless index's FIRST outcome this run. Every earlier
// failure line degrades to "(cooling)" after an index's first refusal, so
// without this the end of a long log cannot say whether an index refused us
// (their side) or answered with markup this module could not parse (ours).
const indexes = engineLedger();
console.log(indexes.length
  ? `   keyless search indexes this run — ${indexes.join("; ")}`
  : "   keyless search indexes this run — none was reached");

// A Telegram-facing failure used to be caught above so the operator received
// a useful Persian explanation, but the process still exited 0. GitHub then
// displayed a green run even though no video had been delivered.  Preserve the
// manifest and the Telegram explanation, then make the job itself truthful so
// dashboards, retries and human checks never mistake a failed send/QC gate for
// a completed delivery.
// `--no-telegram` is intentionally a local preview mode, where a missing
// delivery confirmation is expected rather than an error.
const failedResults = results.filter((r) => r.buildFailed || (!noTelegram && (r.telegram === false || r.sent === false)));
if (failedResults.length) {
  const details = failedResults.map((r) => `${r.platform}/${r.packId}: ${r.buildFailed || "Telegram delivery was not confirmed"}`).join(" | ");
  throw new Error(`Render did not complete delivery for ${failedResults.length} video(s): ${details}`);
}



