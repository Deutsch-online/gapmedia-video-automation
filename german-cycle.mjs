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
// attempt gives every attempt the same clean start the current design already
// assumes, and leaves the 739-line build path — the part that is actually
// proven in production — untouched.
//
// WHAT THIS DOES NOT DO: it never weakens a gate to get to green. The only two
// decisions it can make are "attempt again" and "stop, and say exactly why".
// Rewording narration stays with the Recovery Engine inside each attempt, under
// the phonological discipline documented there; the Visual Truth Gate, the
// narration QC gate and the duplicate ledger are never touched from here.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { diagnose, shouldRetry } from "./lib/diagnose.mjs";
import { providerPlan, formatProviderReportFa } from "./lib/providers.mjs";
import { loadEnv, telegramConfig, sendMessage } from "./lib/telegram.mjs";

/**
 * The cycle itself, with the attempt runner injected.
 *
 * Kept separate from the process/Telegram/filesystem body below — the same
 * split lib/recovery-chain.mjs uses for decide() — so the loop that decides
 * whether the pipeline keeps trying can be tested without rendering a video
 * or sending anything. That loop is the whole point of this file; leaving it
 * only reachable through a 12-minute build would mean never testing it.
 *
 * @param {{runAttempt:(n:number)=>Promise<{exitCode:number,output:string}>,
 *          maxAttempts:number, onDiagnosis?:Function}} opts
 * @returns {Promise<{outcome:"success"|"failed", attempts:number,
 *                    diagnoses:object[], stopped:string|null}>}
 */
export async function runCycle({ runAttempt, maxAttempts, onDiagnosis, deadlineAt = null, now = () => Date.now() }) {
  const diagnoses = [];
  let lastDuration = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startedAt = now();
    const result = await runAttempt(attempt);
    lastDuration = now() - startedAt;
    // Success is the ONLY path that lets anything reach the channel, and the
    // build script owns that send — it happens after every gate has passed.
    if (result.exitCode === 0) {
      return { outcome: "success", attempts: attempt, diagnoses, stopped: null };
    }
    const d = diagnose(result);
    let verdict = shouldRetry(d, diagnoses, { attempt, maxAttempts });
    // Never START an attempt that cannot finish.
    //
    // Run #345 is why this exists. The job carries timeout-minutes, and a
    // timed-out job is killed outright: GitHub reports it as "cancelled", the
    // final report is never written, and the diagnosis never reaches the
    // owner — which defeats the entire point of the cycle. #345 was killed at
    // exactly 30m15s into a 30-minute job, mid-attempt, having said nothing.
    //
    // The estimate is the duration of the attempt that just ran, not a
    // hardcoded guess: attempts on this pipeline vary from ~12 to ~16 minutes
    // depending on how much recovery each one does, and the run itself is the
    // only honest source for that number.
    if (verdict.again && deadlineAt && now() + lastDuration > deadlineAt) {
      const left = Math.max(0, Math.round((deadlineAt - now()) / 60000));
      verdict = {
        again: false,
        reason: "deadline",
        fa: `تلاش بعدی حدود ${Math.round(lastDuration / 60000)} دقیقه طول می‌کشد و فقط ${left} دقیقه تا سقف زمانی این اجرا مانده است. چرخه به‌جای این‌که وسط کار کشته شود و هیچ گزارشی ندهد، همین‌جا تمیز می‌ایستد و تشخیص را می‌فرستد.`,
      };
    }
    diagnoses.push({ attempt, ...d, decision: verdict.reason });
    await onDiagnosis?.({ attempt, diagnosis: d, verdict });
    if (!verdict.again) {
      return { outcome: "failed", attempts: attempt, diagnoses, stopped: verdict.reason, verdict };
    }
  }
  return { outcome: "failed", attempts: maxAttempts, diagnoses, stopped: "budget-spent" };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
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
    const child = spawn("node", args, {
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
