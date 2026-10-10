// Reads what the GEMINI_API_KEY secret can do (model list only; no generation, no cost). The key is never printed.
const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
if (!key) { console.log("NO KEY: add the repository secret GEMINI_API_KEY (Settings > Secrets and variables > Actions)."); process.exit(1); }
let models = [], tok = "";
for (let i = 0; i < 10; i++) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200${tok ? `&pageToken=${tok}` : ""}`, { headers: { "x-goog-api-key": key } });
  if (!r.ok) { console.log(`HTTP ${r.status}: ${(await r.text()).slice(0, 300).replace(key, "***")}`); process.exit(1); }
  const j = await r.json(); models.push(...(j.models || [])); tok = j.nextPageToken || ""; if (!tok) break;
}
console.log(`KEY OK. ${models.length} models visible.`);
const pick = (re) => models.filter((m) => re.test(m.name)).map((m) => `  ${m.name.replace("models/", "")}  [${(m.supportedGenerationMethods || []).join(",")}]`);
for (const [label, re] of [["VIDEO (Veo)", /veo/i], ["IMAGE (Imagen / image models)", /imagen|image/i], ["TEXT/MULTIMODAL (gemini)", /^models\/gemini/i]]) { const l = pick(re); console.log(`\n${label}: ${l.length}`); console.log(l.slice(0, 25).join("\n")); }
console.log("\nNote: a model in the list is not proof that the free tier may use it; billing/limits are shown in Google AI Studio.");
