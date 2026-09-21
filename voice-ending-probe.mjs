// Audition how MiniMax reads a Persian word that ends in ه + ZWNJ + suffix.
//
//   node voice-ending-probe.mjs        (needs MINIMAX_API_KEY, TELEGRAM_BOT_TOKEN)
//
// Owner report 2026-09-21: the end of words like «مانده‌ای» is mispronounced —
// the «ای» is swallowed.
//
// This is NOT a fix. CLAUDE.md forbids changing an approved voice setting on a
// guess, and VOICE-LOG.md's own method is: change one variable, build the SAME
// sample, judge it by ear, then record the result. Only the owner can do the
// listening, so this builds the samples and sends them to the bot, numbered.
//
// What the pipeline does today, and why it is suspect:
//
//   «مانده‌ای»  -> «ماندهای»    the ه+ا creates the letter pair «ها», which is
//                               the Persian PLURAL suffix
//   «غریبه‌ها»  -> «غریبهها»    a double ه — VOICE-LOG.md's 2026-08-31 entry
//                               already judged this form bad («بینندههای») and
//                               reverted it unheard
//   «گرسنه‌ایم» -> «گرسنه ایم»  split into two words, because «ایم» is not in
//                               JOIN_AFTER at all
//
// Same morpheme, three different outcomes. Each candidate below is a real
// Persian spelling; none invents a form.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { loadEnv, telegramConfig, sendAudio, sendMessage } from "./lib/telegram.mjs";
import { sayable } from "./lib/pronounce.mjs";

const OUT = "renders/voice-probe";
mkdirSync(OUT, { recursive: true });

// One sentence per group, changing ONE thing: how the ending is written.
const GROUPS = [
  {
    name: "«مانده‌ای» — the ending the owner reported",
    base: "جلوی دستگاه بلیت مانده‌ای؟",
    candidates: [
      ["A", "جلوی دستگاه بلیت ماندهای؟", "what the pipeline produces today (joined — makes a false «ها»)"],
      ["B", "جلوی دستگاه بلیت مانده‌ای؟", "the source spelling, ZWNJ left alone"],
      ["C", "جلوی دستگاه بلیت مانده ای؟", "split into two words"],
      ["D", "جلوی دستگاه بلیت مانده‌ئی؟", "the ئ spelling of the same ending"],
    ],
  },
  {
    name: "«غریبه‌ها» — the plural after ه",
    base: "با غریبه‌ها رسمی حرف بزن.",
    candidates: [
      ["A", "با غریبهها رسمی حرف بزن.", "what the pipeline produces today (double ه)"],
      ["B", "با غریبه‌ها رسمی حرف بزن.", "the source spelling, ZWNJ left alone"],
      ["C", "با غریبه ها رسمی حرف بزن.", "split into two words"],
    ],
  },
  {
    name: "«گرسنه‌ایم» — the ending that is split today",
    base: "ما گرسنه‌ایم.",
    candidates: [
      ["A", "ما گرسنه ایم.", "what the pipeline produces today (split)"],
      ["B", "ما گرسنه‌ایم.", "the source spelling, ZWNJ left alone"],
      ["C", "ما گرسنهایم.", "joined"],
    ],
  },
];

const tg = telegramConfig(loadEnv());
if (!tg.enabled) { console.error("✗ Telegram is not configured."); process.exit(1); }

let n = 0;
for (const group of GROUPS) {
  console.log(`\n=== ${group.name}`);
  console.log(`    source:   ${group.base}`);
  console.log(`    pipeline: ${sayable(group.base)}`);
  await sendMessage({
    token: tg.token,
    chatId: tg.reviewChatId,
    text: `🎧 <b>${group.name}</b>\n\nمتن اصلی: <code>${group.base}</code>\nآنچه خط لوله امروز می‌سازد: <code>${sayable(group.base)}</code>\n\nهر نمونه را بشنوید و بگویید کدام درست است.`,
  });
  for (const [label, text, why] of group.candidates) {
    n++;
    const file = `${OUT}/probe-${String(n).padStart(2, "0")}-${label}.mp3`;
    console.log(`    ${label}: ${text}   — ${why}`);
    execFileSync(process.execPath, ["music/minimax-tts.mjs", text, "-o", file], { stdio: "inherit" });
    await sendAudio({
      token: tg.token,
      chatId: tg.reviewChatId,
      file,
      title: `${label} — ${why}`,
      caption: `<b>${label}</b> — ${why}\n<code>${text}</code>`,
    });
  }
}

await sendMessage({
  token: tg.token,
  chatId: tg.reviewChatId,
  text: "برای هر گروه بگویید کدام حرف درست خوانده شد (A/B/C/D). تا وقتی نگویید، هیچ تنظیم صدایی عوض نمی‌شود.",
});
console.log(`\n✅ ${n} samples sent to the bot. Nothing was changed — the reading decides.`);
