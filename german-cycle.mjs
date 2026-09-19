// The German-lesson production cycle.
//
// Owner directive 2026-09-15, three parts, in the owner's own words:
//   «تمام ساخت ویدیوهای آلمانی را در یک دور چرخشی ایجاد کن»
//   «یک قسمت اجرا خط گرفت باید به بخش دیاگنوز برود و آنجا خطا شناسایی شود»
//   «نباید تا اجرا موفق نشود به تلگرام برود»
//   «پرامپ ویدیو قبل از ساخت باید تمام درخواست‌ها را به بخش پروایدر ارسال کند
//    تا از طریق پروایدر لیست دستورات آماده شود»
//
// So the shape is: provider plan first, then build → diagnose → build again,
// and Telegram only once a build has genuinely succeeded.
//
//   node german-cycle.mjs [--unit a1-20-countries] [--max-attempts 3]
//
// WHY AN ORCHESTRATOR AND NOT A LOOP INSIDE german-lesson-build.mjs: that
// script is one long top-level try block that ends by exiting the process, and
// a build leaves real state behind (synthesised takes, a patched
// lib/narration.mjs, an exhaustion marker). Re-entering it in-process would
// have meant unpicking all of that. Running it as a fresh child process per
// attempt leaves the 739-line build path — the part that is actually proven in
// production — untouched.
//
// KNOWN, MEASURED LIMIT (run #345, 2026-09-15): a fresh PROCESS is not a fresh
// WORKING TREE. german-lesson-build.mjs patches lib/narration.mjs in place via
// patchSourceText(), and those edits survive into the next attempt of the same
// job. In #345, attempt 1 rewrote «مرد، جدا، زن» into a line that then failed
// on «واژه‌ها، خانم‌ها», rewrote again into one that failed on «اصطلاحات، خانم،»
// — and attempt 2 started from that twice-degraded text and failed on those
// same words immediately. Across JOBS this does not happen: a failed build
// never commits the patch, so every new run restarts from the committed text
// (verified — lib/narration.mjs on main still holds a1-21-professions'
// original four lines). So a cycle attempt is NOT yet equivalent to a chained
// run, which is what lib/recovery-chain.mjs's "3 more FULL Recovery Loop
// passes" assumes. Reverting those files between attempts would make them
// equivalent; that changes how the Recovery Engine composes with this cycle,
// so it is the owner's call, not this file's.
//
// WHAT THIS DOES NOT DO: it never weakens a gate to get to green. The only two
// decisions it can make are "attempt again" and "stop, and say exactly why".
// Rewording narration stays with the Recovery Engine inside each attempt, under
// the phonological discipline documented there; the Visual Truth Gate, the
// narration QC gate and the duplicate ledger are never touched from here.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCycle } from "./lib/cycle.mjs";
import { providerPlan, formatProviderReportFa } from "./lib/providers.mjs";
import { loadEnv, telegramConfig, sendMessage, verifyDelivery } from "./lib/telegram.mjs";

// runCycle now lives in lib/cycle.mjs so the daily (income) pipeline runs the
// exact same loop — same diagnose stage, same no-progress rule, same deadline
// guard. Re-exported here because test-german-cycle.mjs imports it from this
// path, and because this is still the file that documents what the cycle is
// for.
export { runCycle };

// `file://${process.argv[1]}` only matches Unix paths. On Windows it becomes
// `file://D:\...`, while import.meta.url is `file:///D:/...`; the cycle then
// silently behaves as an import and no video is built. Normalise both paths.
const isMain = Boolean(process.argv[1]) && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
if (!isMain) {
  // Imported for its logic only (test-german-cycle.mjs) — do not start a build.
} else {

const localEnv = loadEnv();
Object.assign(process.env, localEnv);
const tg = telegramConfig(localEnv);

const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : "";
};
const unit = argOf("--unit");
// Three full attempts, each with its own complete local-retry and
// recovery-cycle budget inside german-lesson-build.mjs — not three identical
// tries. The no-progress rule below usually stops it well before this.
const maxAttempts = Math.max(1, Number(argOf("--max-attempts")) || 3);
// Slightly under the workflow's own timeout-minutes, so the cycle stops itself
// cleanly — with a written report and a sent diagnosis — instead of being
// killed mid-attempt by the job timeout with nothing to show. See the deadline
// check in runCycle() for what run #345 cost without this.
const deadlineMinutes = Math.max(5, Number(process.env.CYCLE_DEADLINE_MINUTES) || 44);
const deadlineAt = Date.now() + deadlineMinutes * 60_000;

const REPORT = ".german-cycle-report.json";
const PLAN = ".provider-plan.json";

// ── Stage 1: the provider plan ────────────────────────────────────────────
//
// "لیست دستورات" — before anything is built, every request the build will make
// is resolved against lib/providers.mjs and written down: which capability, in
// which order, which provider is ready, and which one will actually serve it.
//
// `required` is the honest minimum for a German lesson to be publishable at
// all. voice: the workflow runs with REQUIRE_VOICE=on, so a build with no
// usable TTS cannot produce a shippable episode. delivery: german-lesson-build
// .mjs explicitly refuses to mark a local-only render as delivered.
// search and text are NOT required — LAW 7's layered fallback (lib/lesson-
// image.mjs) ends in a labelled local graphic, so an episode still ships
// honestly when every search and judge provider is rate-limited, which is
// exactly what happened on runs #340 and #342.
const CAPABILITIES = [
  { capability: "voice", required: true, purpose: "نریشن فارسی و تلفظ آلمانی" },
  { capability: "delivery", required: true, purpose: "ارسال ویدیوی آماده" },
  { capability: "search", required: false, purpose: "یافتن تصویر واقعی هر واژه" },
  { capability: "text", required: false, purpose: "داوری ارتباط تصویر با واژه" },
];

function buildProviderPlan() {
  const plan = CAPABILITIES.map(({ capability, required, purpose }) => {
    const providers = providerPlan(capability).map((p) => ({
      order: p.order, id: p.id, name: p.name, type: p.type,
      ready: p.ready, production: p.production,
    }));
    // An audition-only provider is visible but never counted as serving the
    // build — Pocket TTS Farsi is installed and ready, and deliberately not in
    // the production chain because its Persian reading failed this project's
    // own narration gate (see lib/providers.mjs).
    const usable = providers.filter((p) => p.ready && p.production);
    return { capability, required, purpose, providers, usable: usable.map((p) => p.id), serves: usable[0]?.id || null };
  });
  writeFileSync(PLAN, JSON.stringify({ preparedAt: new Date().toISOString(), unit: unit || null, plan }, null, 2));
  return plan;
}

function printPlan(plan) {
  console.log("\n=== لیست دستورات (Provider plan) ===");
  for (const row of plan) {
    const mark = row.serves ? "✅" : row.required ? "❌" : "⚠";
    const chain = row.providers
      .map((p) => `${p.name}${!p.production ? "(آزمایشی)" : ""}${p.ready ? "" : "✗"}`)
      .join(" → ");
    console.log(`  ${mark} ${row.capability} — ${row.purpose}`);
    console.log(`      ${chain}${row.serves ? `   ⟵ ${row.serves}` : "   ⟵ هیچ‌کدام آماده نیست"}`);
  }
  console.log("");
}

// ── Stage 2: one build attempt ────────────────────────────────────────────
//
// Output is streamed to this job's log as it happens AND captured, because the
// diagnose stage reads the real text rather than guessing from an exit code.
function runAttempt(attempt) {
  return new Promise((resolve) => {
    const args = ["german-lesson-build.mjs", ...(unit ? ["--unit", unit] : [])];
    console.log(`\n=== تلاش ${attempt}/${maxAttempts} — node ${args.join(" ")} ===\n`);
    // Keep every attempt on the same Node runtime as the cycle. This matters
    // for local reproduction with Node 22, and avoids silently jumping back
    // to a different globally installed Node when this file is launched via
    // an explicit runtime.
    const child = spawn(process.execPath, args, {
      env: {
        ...process.env,
        // Tells german-lesson-build.mjs that a cycle owns the reporting, so a
        // failed attempt stays inside this loop instead of sending the owner a
        // Telegram alert for something the next attempt may well fix. This is
        // the "نباید تا اجرا موفق نشود به تلگرام برود" half of the directive;
        // the success path (sendVideo) is deliberately left untouched.
        GERMAN_CYCLE: "on",
        GERMAN_CYCLE_ATTEMPT: String(attempt),
      },
      stdio: ["inherit", "pipe", "pipe"],
    });
    let output = "";
    const tee = (stream, sink) => stream.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      sink.write(text);
    });
    tee(child.stdout, process.stdout);
    tee(child.stderr, process.stderr);
    child.on("close", (code) => resolve({ exitCode: code ?? 1, output }));
    child.on("error", (e) => resolve({ exitCode: 1, output: `${output}\nspawn failed: ${e.message}` }));
  });
}

// ── Stage 3: the cycle ────────────────────────────────────────────────────
const plan = buildProviderPlan();
printPlan(plan);

const missing = plan.filter((row) => row.required && !row.serves);
if (missing.length) {
  // Stopping here costs seconds. Discovering the same thing mid-build costs a
  // full render first, and then still fails.
  const names = missing.map((m) => m.capability).join("، ");
  const text = `⚠ چرخهٔ ساخت آلمانی شروع نشد.\n\nهیچ Provider آماده‌ای برای «${names}» وجود ندارد، و بدون آن قسمت قابل‌انتشار ساخته نمی‌شود.\n\n${formatProviderReportFa()}`;
  console.error(`✗ provider plan incomplete — no ready production provider for: ${names}`);
  writeFileSync(REPORT, JSON.stringify({ at: new Date().toISOString(), unit: unit || null, stopped: "provider-plan-incomplete", missing: missing.map((m) => m.capability), plan }, null, 2));
  if (tg.enabled) { try { await sendMessage({ token: tg.token, chatId: tg.chatId, text }); } catch {} }
  process.exit(1);
}

// A ready delivery provider only means both secrets are SET. It cannot mean
// the chat id is one this bot may actually send to — isReady() in
// lib/providers.mjs checks presence, not permission. Run #109 (2026-09-19)
// rendered a full 60s episode three times over and lost every one of them at
// sendVideo to «Forbidden: the bot can't send messages to the bot».
//
// Same reasoning as the provider-plan block above: stopping here costs
// seconds, and discovering it mid-build costs a render first and still fails.
// A network blip returns ok with a warning, so this can never block a build
// for a reason that is not the configuration itself.
if (tg.enabled) {
  // Check the destination the VIDEO will actually use, and hold it to the
  // owner's rule: the bot chat, not the channel.
  const delivery = await verifyDelivery({ token: tg.token, chatId: tg.reviewChatId, requirePrivate: true });
  if (delivery.warning) console.warn(`⚠ ${delivery.warning}`);
  if (!delivery.ok) {
    // Deliberately no Telegram alert here: the destination is the very thing
    // that does not work, so the job log — and the failure e-mail GitHub sends
    // from it — is the only channel that actually reaches the owner.
    console.error(`✗ delivery preflight failed — ${delivery.reason}`);
    console.error("✗ چرخهٔ ساخت آلمانی شروع نشد: مقصد تلگرام قابل ارسال نیست، پس ساختِ ویدیو فقط وقت تلف می‌کند.");
    writeFileSync(REPORT, JSON.stringify({
      at: new Date().toISOString(),
      unit: unit || null,
      stopped: "delivery-unreachable",
      reason: delivery.reason,
      plan,
    }, null, 2));
    process.exit(1);
  }
}

let lastVerdict = null;
const run = await runCycle({
  runAttempt,
  maxAttempts,
  deadlineAt,
  onDiagnosis: ({ attempt, diagnosis: d, verdict }) => {
    lastVerdict = verdict;
    console.error(`\n=== دیاگنوز تلاش ${attempt} ===`);
    console.error(`   نوع خطا: ${d.kind}`);
    console.error(`   علت: ${d.cause}`);
    console.error(`   شاهد: ${d.evidence}`);
    if (d.detail?.before && d.detail?.after) {
      console.error(`   متن پیش از بازنویسی: ${d.detail.before}`);
      console.error(`   متن پس از بازنویسی:  ${d.detail.after}`);
    }
    console.error(`   تصمیم: ${verdict.reason} — ${verdict.fa}\n`);
  },
});

if (run.outcome === "success") {
  writeFileSync(REPORT, JSON.stringify({
    at: new Date().toISOString(), unit: unit || null, outcome: "success",
    attempts: run.attempts, diagnoses: run.diagnoses, plan,
  }, null, 2));
  console.log(`\n✅ چرخه در تلاش ${run.attempts} موفق شد و ویدیو ارسال شد.`);
  process.exit(0);
}

// ── Stage 4: the cycle is genuinely out of honest options ─────────────────
//
// Only now does a failure reach Telegram, and it carries the diagnosis instead
// of a bare error string — the owner is told what broke, what was tried, and
// why the cycle stopped rather than trying a fourth time.
const history = run.diagnoses;
const verdict = run.verdict || lastVerdict;
const last = history[history.length - 1];
writeFileSync(REPORT, JSON.stringify({
  at: new Date().toISOString(), unit: unit || null, outcome: "failed",
  attempts: history.length, stopped: run.stopped, diagnoses: history, plan,
}, null, 2));

const trail = history
  .map((h) => `${h.attempt}. ${h.kind} — ${h.evidence}`)
  .join("\n");
const text = [
  `⚠ چرخهٔ ساخت آلمانی${unit ? ` (${unit})` : ""} بعد از ${history.length} تلاش متوقف شد.`,
  "",
  `<b>تشخیص:</b> ${last?.fa || "نامشخص"}`,
  `<b>علت فنی:</b> ${last?.cause || "نامشخص"}`,
  // Shown inline because it is the whole decision the owner has to make: a
  // reword that broke register is a sentence they need to read, not a log to
  // go and open.
  ...(last?.detail?.before && last?.detail?.after
    ? ["", `<b>متن اصلی:</b> ${last.detail.before}`, `<b>بازنویسی خودکار:</b> ${last.detail.after}`]
    : []),
  "",
  `<b>سیر تلاش‌ها:</b>\n${trail}`,
  "",
  `<b>چرا ادامه نداد:</b> ${verdict?.fa || "بودجهٔ چرخه تمام شد."}`,
  "",
  "هیچ ویدیویی ارسال نشد — طبق قانون، تا اجرای موفق چیزی به کانال نمی‌رود.",
].join("\n");

console.error(`\n✗ چرخه متوقف شد: ${run.stopped} پس از ${history.length} تلاش.`);
if (tg.enabled) { try { await sendMessage({ token: tg.token, chatId: tg.chatId, text }); } catch {} }
process.exit(1);

}
