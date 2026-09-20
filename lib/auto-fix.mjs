// Controlled auto-repair for the German A1 production lane.
//
// This is intentionally NOT an "AI may edit any file" mechanism.  A failed
// render is untrusted evidence, and blindly applying code suggested from a log
// can create a worse outage or leak a secret.  The AI is allowed to classify an
// *unknown* failure into a tiny, tested action set; only those actions can run.
// Existing recovery engines remain the only writers of narration/pronunciation
// source, and their changes still have to pass the same narration QC gate.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { diagnose } from "./diagnose.mjs";
import { askGemini } from "./auto-image.mjs";

export const MAX_AUTO_RETRIES_PER_SLOT = 2;
export const AUTO_RETRY_KINDS = new Set([
  "attempt-timeout",
  "image-generator-down",
  "provider-exhausted",
  "render",
  "search-index-down",
  "slot-exhausted",
  "visual-proof",
]);

const VALID_AI_ACTIONS = new Set(["fresh-retry", "needs-secret", "needs-code-review", "stand-down"]);

function clean(value, max = 700) {
  return String(value || "")
    .replace(/\bAuthorization\s*:\s*Bearer\s+[^\s,;]+/gi, "Authorization: Bearer [redacted]")
    .replace(/\b(Bearer|x-goog-api-key|api[_-]?key|token|secret)\s*[:=]\s*[^\s,;]+/gi, "$1: [redacted]")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Extracts only a real scheduled slot, never a manual/correction build. */
export function scheduledSlotFromLog(output) {
  const hit = String(output || "").match(/Selected scheduled slot:\s*(\d{4}-\d{2}-\d{2})-(0500|1730)\b/);
  return hit ? { date: hit[1], batch: hit[2] } : null;
}

export function repairPlan(diagnosis) {
  if (AUTO_RETRY_KINDS.has(diagnosis?.kind)) {
    return {
      action: "fresh-retry",
      retry: true,
      fa: "خطای بیرونی یا موقت تشخیص داده شد؛ یک اجرای تازه با همان گیت‌های کیفیت برنامه‌ریزی می‌شود.",
    };
  }
  if (["narration-qc", "narration-preflight", "narration-recovery-exhausted"].includes(diagnosis?.kind)) {
    return {
      action: "internal-narration-recovery",
      retry: false,
      fa: "بازیابی نریشن در همان چرخهٔ ساخت مالک اصلاح متن و تلفظ است؛ Auto Fix آن را دور نمی‌زند.",
    };
  }
  if (["config", "content-exhausted", "duplicate", "narration-register-break", "narration-reword-exhausted"].includes(diagnosis?.kind)) {
    return {
      action: "stand-down",
      retry: false,
      fa: "این مشکل با اجرای دوباره حل نمی‌شود؛ برای جلوگیری از تولید اشتباه، فقط گزارش می‌شود.",
    };
  }
  return { action: "ai-triage", retry: false, fa: "علت ناشناخته است؛ تحلیل محدود هوش مصنوعی انجام می‌شود." };
}

function parseAiPlan(raw) {
  try {
    const json = String(raw || "").match(/\{[\s\S]*\}/)?.[0];
    const parsed = json ? JSON.parse(json) : null;
    if (!VALID_AI_ACTIONS.has(parsed?.action)) return null;
    return { action: parsed.action, reason: clean(parsed.reason, 260) };
  } catch {
    return null;
  }
}

function aiPrompt(diagnosis, output) {
  return `You are a cautious production incident classifier. A Persian German-lesson video failed.\nKnown diagnosis: ${clean(diagnosis?.kind, 80)} — ${clean(diagnosis?.cause, 240)}\nEvidence: ${clean(diagnosis?.evidence, 400)}\nLog excerpt: ${clean(output, 1200)}\nChoose exactly one action: fresh-retry (only temporary provider/render/search outage), needs-secret, needs-code-review, stand-down. Never suggest lowering quality gates, disabling narration, or editing arbitrary files. Return only JSON: {"action":"...","reason":"short Persian reason"}.`;
}

// auto-image.mjs's Groq helper has a deliberately image-specific system
// instruction. Auto Fix needs a separate, equally narrow JSON contract.
async function askGroqAutoFix(prompt, env) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: { "content-type": "application/json", authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: env.GROQ_MODEL || "openai/gpt-oss-120b",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Classify a video-production incident. Return only the requested JSON. Never suggest arbitrary code edits or reduced quality gates." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  return (await res.json())?.choices?.[0]?.message?.content || "";
}

/** AI is a constrained second opinion for an unknown error, never a patch author. */
export async function aiTriage({ diagnosis, output, ask = { gemini: askGemini, groq: askGroqAutoFix }, env = process.env } = {}) {
  const prompt = aiPrompt(diagnosis, output);
  const candidates = [];
  if (env.GEMINI_API_KEY || env.GOOGLE_API_KEY) candidates.push(ask.gemini);
  if (env.GROQ_API_KEY) candidates.push(ask.groq);
  for (const call of candidates) {
    try {
      const parsed = parseAiPlan(await call(prompt, env));
      if (parsed) return { ...parsed, source: "ai" };
    } catch {
      // A failed optional opinion must not block the durable scheduled cycle.
    }
  }
  return { action: "needs-code-review", reason: "هوش مصنوعی پاسخ معتبر نداد؛ اصلاح حدسی انجام نشد.", source: "fallback" };
}

export function retryDecision({ state = {}, slot, diagnosis, plan }) {
  if (!slot || !plan?.retry) return { retry: false, reason: slot ? "not-retryable" : "not-a-scheduled-slot" };
  const key = `${slot.date}-${slot.batch}-${diagnosis.fingerprint}`;
  const prior = Number(state?.attempts?.[key] || 0);
  if (prior >= MAX_AUTO_RETRIES_PER_SLOT) return { retry: false, reason: "retry-budget-spent", key, attempts: prior };
  return { retry: true, key, attempts: prior + 1 };
}

export function recordDecision(state = {}, decision, details) {
  const attempts = { ...(state.attempts || {}) };
  if (decision?.retry && decision.key) attempts[decision.key] = decision.attempts;
  return {
    updatedAt: new Date().toISOString(),
    attempts,
    last: {
      slot: details.slot || null,
      diagnosis: { kind: details.diagnosis.kind, fingerprint: details.diagnosis.fingerprint, evidence: clean(details.diagnosis.evidence, 400) },
      plan: { action: details.plan.action, reason: details.plan.reason || details.plan.fa || "" },
      decision: decision.reason || (decision.retry ? "retry" : "stand-down"),
      runId: String(details.runId || "").replace(/[^0-9]/g, "").slice(0, 30),
    },
  };
}

function loadState(file) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return {}; }
}

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] || "" : "";
}

const isMain = Boolean(process.argv[1]) && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
if (isMain) {
  const logFile = arg("--log");
  const stateFile = arg("--state") || ".german-autofix-state.json";
  const runId = arg("--run-id");
  const output = logFile && existsSync(logFile) ? readFileSync(logFile, "utf8") : "";
  const diagnosis = diagnose({ exitCode: 1, output });
  const slot = scheduledSlotFromLog(output);
  let plan = repairPlan(diagnosis);
  if (plan.action === "ai-triage") {
    const opinion = await aiTriage({ diagnosis, output });
    plan = { action: opinion.action, retry: opinion.action === "fresh-retry", reason: opinion.reason, source: opinion.source };
  }
  const decision = retryDecision({ state: loadState(stateFile), slot, diagnosis, plan });
  const saved = recordDecision(loadState(stateFile), decision, { slot, diagnosis, plan, runId });
  writeFileSync(stateFile, `${JSON.stringify(saved, null, 2)}\n`);

  console.log(`Auto Fix: ${diagnosis.kind} → ${plan.action} → ${decision.retry ? "retry" : decision.reason}`);
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, [
      `retry=${decision.retry ? "yes" : "no"}`,
      `retry_date=${decision.retry ? slot.date : ""}`,
      `retry_batch=${decision.retry ? slot.batch : ""}`,
      `summary=${clean(plan.reason || plan.fa || diagnosis.fa, 300).replace(/[\r\n]/g, " ")}`,
    ].join("\n") + "\n", { flag: "a" });
  }
}
