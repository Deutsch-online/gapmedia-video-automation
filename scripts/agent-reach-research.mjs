// Topic research with Agent Reach's channels that need no login (owner, 2026-10-04: "install it separately").
// YouTube search (yt-dlp) and Exa web search (mcporter); every result keeps its link and date. A result is a signal to
// check, not a fact (CLAUDE.md, "Agent Reach"). Writes research/agent-reach/<date>-<slug>.md and sends a digest to the bot chat.
// Usage: node scripts/agent-reach-research.mjs "<query>" [days]
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { loadEnv, telegramConfig, sendMessage } from "../lib/telegram.mjs";

const query = process.argv[2], days = Number(process.argv[3]) || 7;
if (!query) { console.error('usage: node scripts/agent-reach-research.mjs "<query>" [days]'); process.exit(1); }
const venv = `${homedir()}/.agent-reach-venv/bin`;
const today = new Date().toISOString().slice(0, 10);
const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10).replaceAll("-", "");
const out = [`# Research: ${query}`, `Date: ${today} · last ${days} days · signals to check, not facts · channels without login only`, ""];
const digest = [];

// 1. YouTube: what people published about it, with views and dates
try {
  const raw = execFileSync(`${venv}/yt-dlp`, ["--dump-json", "--skip-download", "--no-warnings", `ytsearch12:${query}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 240000 });
  const items = raw.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
    .filter((v) => (v.upload_date || "0") >= cutoff)
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 8);
  out.push(`## YouTube (${items.length})`, ...items.map((v) => `- ${v.upload_date} · ${(v.view_count || 0).toLocaleString("en")} views · [${v.title}](${v.webpage_url}) — ${v.channel || ""}`), "");
  digest.push(`YouTube: ${items.length}`, ...items.slice(0, 5).map((v) => `• ${v.upload_date} · ${v.view_count || 0} · ${v.title}\n${v.webpage_url}`));
} catch (e) { out.push(`## YouTube\nnot available: ${String(e.message).split("\n")[0]}`, ""); }

// 2. Exa web search through mcporter (free MCP, no key); best effort
try {
  execFileSync("mcporter", ["config", "add", "exa", "https://mcp.exa.ai/mcp", "--scope", "home"], { stdio: "ignore", timeout: 60000 });
  const r = execFileSync("mcporter", ["call", "exa.web_search_exa", `query=${query}`, "numResults=6"], { encoding: "utf8", timeout: 120000 });
  out.push("## Web search (Exa)", "```", r.trim().slice(0, 6000), "```", "");
  digest.push("Web: see the file");
} catch (e) { out.push(`## Web search (Exa)\nnot available: ${String(e.message).split("\n")[0]}`, ""); }

const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "topic";
mkdirSync("research/agent-reach", { recursive: true });
const file = `research/agent-reach/${today}-${slug}.md`;
writeFileSync(file, out.join("\n"));
console.log(out.join("\n"));
const tg = telegramConfig(loadEnv());
if (tg.enabled) await sendMessage({ token: tg.token, chatId: tg.reviewChatId, text: `Research: ${query} (${days} d)\n\n${digest.join("\n")}`.slice(0, 3900), disablePreview: true });
console.log(`written ${file}`);
