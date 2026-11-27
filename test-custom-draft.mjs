// custom-draft.mjs is what "محتوا: …" actually runs. By the time it sees the
// text, GitHub Actions' own "Read commands" step has already collapsed every
// real newline to a space (`tr '\r\n' ' '`, telegram.yml) — so a message the
// creator typed as separate lines is byte-for-byte the same as one typed as a
// single line once it gets here. Only "|" and numbered markers survive that.
//
// This checks the three real shapes plus the one that has no shape at all:
//   · title|hook|steps       — unchanged, explicit control
//   · hook|step               — the same separator, shorter
//   · lead line + ۱./۲./… steps — the only structural cue that survives the
//     newline flattening; this is what "خط‌به‌خط" actually has to mean now
//   · a bare sentence         — uses the keyless API, and fails safely if unavailable.
//   node test-custom-draft.mjs
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const DRAFT = ".content-draft.json";
const saved = existsSync(DRAFT) ? readFileSync(DRAFT, "utf8") : null;

function run(text, { freeAiStatus = 200 } = {}) {
  rmSync(DRAFT, { force: true });
  const preload = `
    globalThis.fetch = async (url, options) => {
      if (url !== "https://api.apisfreellm.com/v1/chat/completions") throw new Error("Unexpected request");
      const body = JSON.parse(options.body);
      if (options.method !== "POST" || options.headers.authorization ||
          body.model !== "free-ai" || !body.messages[0].content.includes(${JSON.stringify(text)})) {
        throw new Error("Unexpected request payload");
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
        title: "ساخت ویدیوی کوتاه",
        hook: "چطور در چند ثانیه توجه مخاطب را جلب کنیم؟",
        steps: ["موضوع را روشن کن", "یک نمونه نشان بده"],
      }) } }] }), { status: ${freeAiStatus} });
    };
  `;
  const r = spawnSync(process.execPath, [
    "--import", "data:text/javascript;base64," + Buffer.from(preload).toString("base64"),
    "custom-draft.mjs", text,
  ], {
    encoding: "utf8",
    env: { ...process.env, NO_TELEGRAM: "1", GAPMEDIA_DRAFT_PROVIDER: "free-ai" },
  });
  const draft = existsSync(DRAFT) ? JSON.parse(readFileSync(DRAFT, "utf8")) : null;
  return { status: r.status, out: (r.stdout || "") + (r.stderr || ""), draft };
}

let bad = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label.padEnd(38)} ${detail || ""}`);
  if (!cond) bad++;
};

// 1) full pipe format — unchanged behaviour
{
  const r = run("تیک تاک: ترفند رشد|چطور در ۳۰ روز رشد کنی؟|هر روز پست کن|تحلیل کن");
  check("عنوان | قلاب | گام‌ها", r.draft?.generated?.hook?.ask === "چطور در ۳۰ روز رشد کنی؟", `hook: ${r.draft?.generated?.hook?.ask}`);
  check("  و گام‌ها را می‌گیرد", r.draft?.generated?.tips?.length === 2);
}

// 2) two-part pipe: hook|step, no title
{
  const r = run("چطور مشتری جذب کنی؟|یک نمونهٔ واقعی نشان بده");
  check("قلاب | یک گام", r.draft?.generated?.hook?.ask === "چطور مشتری جذب کنی؟" && r.draft?.generated?.tips?.length === 1);
}

// 3) the shape that actually survives Telegram → GitHub Actions today: a lead
// line the creator wrote, followed by numbered steps, all on one flattened line
{
  const topic = "چگونه با یک ویدیوی کوتاه، مشتری مناسب برای خدماتت جذب کنی؟";
  const flattened = `${topic} ۱. یک نمونهٔ واقعی از قبل و بعد نشان بده ۲. یک پیشنهاد مشخص و قیمت را در همان ویدیو بگو ۳. زیر ویدیو از مخاطب بخواه کامنت بگذارد`;
  const r = run(flattened);
  check("لید + گام‌های شماره‌گذاری‌شده", r.status === 0 && !!r.draft, `exit ${r.status}`);
  check("  لیدِ پیش از ۱. همان قلاب می‌شود", r.draft?.generated?.hook?.ask === topic, r.draft?.generated?.hook?.ask);
  check("  هر سه گام را جدا می‌کند", r.draft?.generated?.tips?.length === 3, `${r.draft?.generated?.tips?.length} تا`);
  check("  متنِ گام‌ها شمارهٔ خودشان را حمل نمی‌کند", !/^[0-9۰-۹]/.test(r.draft?.generated?.tips?.[0]?.head || ""), r.draft?.generated?.tips?.[0]?.head);
}

// 4) numbered list with nothing before the first marker — the first step
// doubles as the hook rather than being silently dropped
{
  const r = run("۱. یک نمونهٔ واقعی نشان بده ۲. دعوت به کامنت بگذار");
  check("بدون لید: گام اول قلاب هم می‌شود", r.draft?.generated?.hook?.ask === "یک نمونهٔ واقعی نشان بده" && r.draft?.generated?.tips?.length === 2);
}

// 5) A bare topic uses the keyless API and writes a reviewable draft.
{
  const topic = "چگونه با یک ویدیوی کوتاه مشتری جذب کنیم؟";
  const r = run(topic);
  check("موضوع خام: پیش‌نویس با free-ai", r.status === 0 && r.draft?.generated?.tips?.length === 2, r.out);
  const failure = run(topic, { freeAiStatus: 429 });
  check("محدودیت API: پیش‌نویس ناقص ذخیره نمی‌شود", failure.draft === null, `exit=${failure.status}; draft=${!!failure.draft}; ${failure.out}`);
}

if (saved !== null) writeFileSync(DRAFT, saved); else rmSync(DRAFT, { force: true });

console.log("");
console.log(bad === 0 ? "custom-draft.mjs handles structured input and uses the keyless API for bare topics" : `${bad} check(s) failed`);
process.exit(bad === 0 ? 0 : 1);
