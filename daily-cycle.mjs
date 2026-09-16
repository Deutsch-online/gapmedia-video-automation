// The daily (income) production cycle — one delivery format at a time.
//
// Owner directive 2026-09-16, in the owner's own words:
//   «خطاها را بررسی کن و مثل آموزش المانی بساز به بخش دیاگنوز ببر و
//    اشکالات را بگیر»
//
// So this is german-cycle.mjs's shape applied to daily-render.mjs: provider
// plan first, then render → diagnose → decide, and a failure reaches Telegram
// only once the cycle has genuinely run out of honest options. The loop itself
// is lib/cycle.mjs, shared with the German pipeline so both get the same
// no-progress rule and the same deadline guard.
//
//   node daily-cycle.mjs --only tiktok [--max-attempts 2]
//
// WHY THIS EXISTS, measured not assumed. daily.yml run #280 (2026-09-16) is
// the case it was written for. Both slots were killed at exactly 32m00s by
// the per-slot `timeout` in the workflow's bash — tiktok 09:13:09→09:45:09,
// instagram 09:45:09→10:17:09 — and bash reported one line: "<slot> did not
// complete". The actual causes were in the middle of a 1,200-line log and
// nobody was told them:
//   · Pollinations answered 500 wrapping an upstream 429 on every AI image
//     («Gen Sana request failed with 429»), so LAW 7 layer 4 was dead.
//   · The keyless indexes were down too («no keyless index answered — tried
//     duckduckgo(fetch failed), duckduckgo-html(fetch failed), mojeek(cooling)»).
//   · So every topic failed the Visual Truth Gate, the slot burned all six
//     topics on retries that could not succeed, and hit the wall.
// A killed attempt that says why is worth more than a silent one. The cycle
// owns the kill, names it, and diagnoses it.
//
// WHAT IT DOES NOT DO: it never weakens a gate to get to green. Its only two
// decisions are "attempt again" and "stop, and say exactly why". The Visual
// Truth Gate, the narration gate and the duplicate ledger are untouched from
// here — a failed attempt is reported, never published around.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { runCycle } from "./lib/cycle.mjs";
import { providerPlan, formatProviderReportFa } from "./lib/providers.mjs";
import { loadEnv, telegramConfig, sendMessage } from "./lib/telegram.mjs";

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (!isMain) {
  // Imported for its constants only (test-daily-cycle.mjs) — do not render.
} else {

const localEnv = loadEnv();
Object.assign(process.env, localEnv);
const tg = telegramConfig(localEnv);

const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : "";
};
// --only, not --slot: the same flag daily-render.mjs takes, so the workflow
// line reads the same as the one it replaces.
const slot = argOf("--only");
if (!slot) {
  console.error("daily-cycle.mjs needs --only <tiktok|instagram|ai-tiktok|ai-instagram>");
  process.exit(2);
}

// Two attempts, and the deadline guard below decides whether the second one
// actually starts. That is not theatre: the two failure shapes have very
// different costs. A fast failure — providers refusing in four minutes, a
// duplicate rejection — leaves plenty of room and genuinely deserves a second
// try. A slow one that burns the whole budget does not, and the guard says so
// in the report instead of starting an attempt that would be killed mid-render.
const maxAttempts = Math.max(1, Number(argOf("--max-attempts")) || 2);
// Per-attempt ceiling. 30 minutes, just under the workflow's own 35m per-slot
// `timeout`, so the CYCLE stops the render and writes a diagnosis rather than
// bash killing the cycle with nothing to show — the exact failure mode run
// #345 cost the German pipeline before its deadline guard existed.
const attemptMinutes = Math.max(5, Number(argOf("--attempt-timeout")) || Number(process.env.DAILY_ATTEMPT_MINUTES) || 30);
// The whole-cycle deadline, under the per-slot timeout for the same reason.
const deadlineMinutes = Math.max(5, Number(process.env.DAILY_CYCLE_DEADLINE_MINUTES) || 31);
const deadlineAt = Date.now() + deadlineMinutes * 60_000;

const REPORT = ".daily-cycle-report.json";
const PLAN = ".daily-provider-plan.json";

// ── Stage 1: the provider plan ────────────────────────────────────────────
//
// Every request this render will make, resolved before anything is built:
// which capability, in which order, which provider is ready, which one serves.
//
// voice and delivery are required — daily.yml runs with REQUIRE_VOICE=on, and
// a render nobody can send is not a delivery. search and text are NOT: LAW 7's
// layered fallback ends in a labelled local graphic, so a video can still ship
// honestly when every index and judge is rate-limited. image is listed for
// visibility only; Pollinations is keyless, so there is nothing to be "ready".
const CAPABILITIES = [
  { capability: "voice", required: true, purpose: "نریشن فارسی ویدیو" },
  { capability: "delivery", required: true, purpose: "ارسال ویدیوی آماده به کانال" },
  { capability: "search", required: false, purpose: "یافتن تصویر واقعی هر اسلاید" },
  { capability: "text", required: false, purpose: "داوری ارتباط تصویر با موضوع" },
];

function buildProviderPlan() {
  const plan = CAPABILITIES.map(({ capability, required, purpose }) => {
    const providers = providerPlan(capability).map((p) => ({
      order: p.order, id: p.id, name: p.name, type: p.type,
      ready: p.ready, production: p.production,
    }));
    const usable = providers.filter((p) => p.ready && p.production);
    return { capability, required, purpose, providers, usable: usable.map((p) => p.id), serves: usable[0]?.id || null };
  });
  writeFileSync(PLAN, JSON.stringify({ preparedAt: new Date().toISOString(), slot, plan }, null, 2));
  return plan;
}

function printPlan(plan) {
  console.log(`\n=== لیست دستورات (Provider plan) — ${slot} ===`);
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

// ── Stage 2: one render attempt ───────────────────────────────────────────
//
// Streamed to the job log as it happens AND captured, because the diagnose
// stage reads the real text rather than guessing from an exit code.
function runAttempt(attempt) {
  return new Promise((resolve) => {
    const args = ["daily-render.mjs", "--only", slot];
    console.log(`\n=== تلاش ${attempt}/${maxAttempts} — node ${args.join(" ")} ===\n`);
    const child = spawn("node", args, {
      env: {
        ...process.env,
        // Tells daily-render.mjs that a cycle owns the reporting, so one
        // failed attempt does not send the owner a «ساخته نشد» alert for
        // something the next attempt may fix. The success path (sendVideo)
        // is deliberately untouched — a finished video still goes out the
        // moment it passes every gate.
        DAILY_CYCLE: "on",
        DAILY_CYCLE_ATTEMPT: String(attempt),
      },
      stdio: ["inherit", "pipe", "pipe"],
    });
    let output = "";
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      // The note goes into the captured output, which is what diagnose()
      // reads — so a killed attempt is classified as attempt-timeout instead
      // of arriving as a bare non-zero exit with no explanation.
      const note = `\n   ✗ ${slot}: attempt exceeded its ${attemptMinutes}-minute ceiling and was stopped by the cycle.\n`;
      output += note;
      process.stderr.write(note);
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 20_000).unref();
    }, attemptMinutes * 60_000);
    const tee = (stream, sink) => stream.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      sink.write(text);
    });
    tee(child.stdout, process.stdout);
    tee(child.stderr, process.stderr);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: killed ? 1 : (code ?? 1), output });
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ exitCode: 1, output: `${output}\nspawn failed: ${e.message}` });
    });
  });
}

// ── Stage 3: the cycle ────────────────────────────────────────────────────
const plan = buildProviderPlan();
printPlan(plan);

const missing = plan.filter((row) => row.required && !row.serves);
if (missing.length) {
  // Stopping here costs seconds. Finding the same thing out mid-render costs
  // a whole slot's budget first, and then still fails.
  const names = missing.map((m) => m.capability).join("، ");
  const text = `⚠ چرخهٔ ساخت ${slot} شروع نشد.\n\nهیچ Provider آماده‌ای برای «${names}» وجود ندارد، و بدون آن ویدیوی قابل‌انتشار ساخته نمی‌شود.\n\n${formatProviderReportFa()}`;
  console.error(`✗ provider plan incomplete — no ready production provider for: ${names}`);
  writeFileSync(REPORT, JSON.stringify({ at: new Date().toISOString(), slot, stopped: "provider-plan-incomplete", missing: missing.map((m) => m.capability), plan }, null, 2));
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
    console.error(`\n=== دیاگنوز تلاش ${attempt} (${slot}) ===`);
    console.error(`   نوع خطا: ${d.kind}`);
    console.error(`   علت: ${d.cause}`);
    console.error(`   شاهد: ${d.evidence}`);
    console.error(`   تصمیم: ${verdict.reason} — ${verdict.fa}\n`);
  },
});

if (run.outcome === "success") {
  writeFileSync(REPORT, JSON.stringify({
    at: new Date().toISOString(), slot, outcome: "success",
    attempts: run.attempts, diagnoses: run.diagnoses, plan,
  }, null, 2));
  console.log(`\n✅ ${slot}: چرخه در تلاش ${run.attempts} موفق شد و ویدیو ارسال شد.`);
  process.exit(0);
}

// ── Stage 4: out of honest options ────────────────────────────────────────
//
// Only now does a failure reach Telegram, and it carries the diagnosis instead
// of a bare error: what broke, what was tried, and why the cycle stopped.
const history = run.diagnoses;
const verdict = run.verdict || lastVerdict;
const last = history[history.length - 1];
writeFileSync(REPORT, JSON.stringify({
  at: new Date().toISOString(), slot, outcome: "failed",
  attempts: history.length, stopped: run.stopped, diagnoses: history, plan,
}, null, 2));

const trail = history.map((h) => `${h.attempt}. ${h.kind} — ${h.evidence}`).join("\n");
const text = [
  `⚠ چرخهٔ ساخت ${slot} بعد از ${history.length} تلاش متوقف شد.`,
  "",
  `<b>تشخیص:</b> ${last?.fa || "نامشخص"}`,
  `<b>علت فنی:</b> ${last?.cause || "نامشخص"}`,
  "",
  `<b>سیر تلاش‌ها:</b>\n${trail}`,
  "",
  `<b>چرا ادامه نداد:</b> ${verdict?.fa || "بودجهٔ چرخه تمام شد."}`,
  "",
  "هیچ ویدیویی ارسال نشد — طبق قانون، تا اجرای موفق چیزی به کانال نمی‌رود.",
].join("\n");

console.error(`\n✗ چرخهٔ ${slot} متوقف شد: ${run.stopped} پس از ${history.length} تلاش.`);
if (tg.enabled) { try { await sendMessage({ token: tg.token, chatId: tg.chatId, text }); } catch {} }
process.exit(1);

}
