// Central provider registry.  All provider order lives here so a temporary
// outage never turns into a stalled production run while another configured
// service can complete the same job.  This module deliberately stores only
// capability names and environment-variable *names*; credentials never enter
// reports, logs, commits, or Telegram messages.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const has = (env, ...names) => names.every((name) => Boolean(env[name]));

export const PROVIDERS = Object.freeze({
  search: [
    { id: "exa", name: "Exa", type: "API", requires: ["EXA_API_KEY"], purpose: "جست‌وجوی زندهٔ منبع و تصویر" },
    { id: "google-suggest", name: "Google Suggest", type: "رایگان", requires: [], purpose: "سیگنال تقاضا و عبارت‌های جست‌وجو" },
    { id: "reddit", name: "Reddit", type: "API", requires: ["REDDIT_CLIENT_ID", "REDDIT_SECRET"], purpose: "سیگنال گفت‌وگوی کاربران" },
  ],
  text: [
    { id: "gemini", name: "Gemini", type: "API", requiresAny: ["GEMINI_API_KEY", "GOOGLE_API_KEY"], purpose: "ترجمه و تحلیل منبع" },
    { id: "groq", name: "Groq", type: "API", requires: ["GROQ_API_KEY"], purpose: "ترجمه و تحلیل جایگزین" },
  ],
  voice: [
    // Installed for both local and Cloud auditioning. It is intentionally not
    // in the automatic production chain: its Persian reading failed the
    // project's narration quality gate, so selecting it silently would trade
    // a service outage for mispronounced published speech.
    { id: "pocket-farsi", name: "Pocket TTS Farsi", type: "رایگان / محلی", requires: ["POCKET_TTS_FARSI_CONFIG"], purpose: "مدل فارسیِ نصب‌شده برای آزمون", production: false },
    { id: "minimax", name: "MiniMax", type: "API", requires: ["MINIMAX_API_KEY", "MINIMAX_VOICE_ID"], purpose: "نریشن فارسی طبیعی" },
    { id: "edge", name: "Microsoft Edge TTS", type: "رایگان", requires: [], purpose: "نریشن فارسی جایگزین" },
  ],
  delivery: [
    { id: "telegram", name: "Telegram Bot API", type: "API", requires: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"], purpose: "گزارش و تحویل فایل" },
  ],
});

function isReady(provider, env = process.env) {
  if (provider.requires && !has(env, ...provider.requires)) return false;
  if (provider.requiresAny && !provider.requiresAny.some((key) => Boolean(env[key]))) return false;
  return true;
}

export function providerPlan(capability, env = process.env) {
  return (PROVIDERS[capability] || []).map((provider, index) => ({
    ...provider,
    order: index + 1,
    ready: isReady(provider, env),
    production: provider.production !== false,
  }));
}

export class ProviderExhaustedError extends Error {
  constructor(capability, attempts) {
    super(`No configured ${capability} provider completed the request.`);
    this.name = "ProviderExhaustedError";
    this.capability = capability;
    this.attempts = attempts;
  }
}

// runners is deliberately supplied by the caller: this keeps each API's
// implementation local while enforcing one verified fallback policy.
export async function runWithProviderFallback({ capability, runners, env = process.env, onAttempt }) {
  const attempts = [];
  for (const provider of providerPlan(capability, env)) {
    if (!provider.ready || typeof runners?.[provider.id] !== "function") continue;
    try {
      const value = await runners[provider.id]();
      const event = { provider: provider.id, name: provider.name, status: "completed" };
      attempts.push(event);
      await onAttempt?.(event);
      return { value, provider, attempts };
    } catch (error) {
      const event = { provider: provider.id, name: provider.name, status: "failed", error: String(error?.message || error).slice(0, 160) };
      attempts.push(event);
      await onAttempt?.(event);
    }
  }
  throw new ProviderExhaustedError(capability, attempts);
}

export function providerReport(env = process.env) {
  return Object.entries(PROVIDERS).flatMap(([capability]) => providerPlan(capability, env).map((provider) => ({
    capability,
    id: provider.id,
    name: provider.name,
    type: provider.type,
    purpose: provider.purpose,
    status: provider.production === false ? "audition-only" : provider.ready ? "ready" : "missing-config",
  })));
}

export function formatProviderReportFa(env = process.env) {
  const groups = new Map();
  for (const item of providerReport(env)) {
    const list = groups.get(item.capability) || [];
    const status = item.status === "ready" ? "✅ آماده" : item.status === "audition-only" ? "🧪 آزمایشی؛ در تولید خودکار استفاده نمی‌شود" : "⏳ تنظیم نشده";
    list.push(`• ${item.name} — ${item.type} — ${status}`);
    groups.set(item.capability, list);
  }
  const labels = { search: "جست‌وجو", text: "متن و ترجمه", voice: "صدا", delivery: "ارسال" };
  return ["📡 <b>Provider List</b>", "هر سرویسِ آماده به‌ترتیب امتحان می‌شود؛ اگر پاسخ ندهد، سرویس بعدی خودکار استفاده می‌شود.", ...[...groups].map(([key, lines]) => `\n<b>${labels[key] || key}</b>\n${lines.join("\n")}`)].join("\n");
}

const runtimeFile = process.env.PROVIDER_RUNTIME_REPORT || ".provider-runtime-report.json";

export function recordProviderFile({ capability, provider, file, status = "file-ready", attempts = [] }) {
  const event = { at: new Date().toISOString(), capability, provider, file, status, attempts };
  let events = [];
  try { if (existsSync(runtimeFile)) events = JSON.parse(readFileSync(runtimeFile, "utf8"))?.events || []; } catch { events = []; }
  events = [...events.slice(-39), event];
  writeFileSync(runtimeFile, JSON.stringify({ updatedAt: event.at, events }, null, 2));
  return event;
}

