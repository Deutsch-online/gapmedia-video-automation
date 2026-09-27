// Audition single Persian words the owner reported misread, in the exact
// sentence and the exact voice settings of a German-lesson narration.
//
//   node voice-word-probe.mjs        (needs MINIMAX_API_KEY, TELEGRAM_BOT_TOKEN)
//
// Owner report 2026-09-27 (episode 40, «در ادارهٔ دولتی»): «ماندن» and «دردسر»
// are pronounced wrong. lib/pronounce.mjs now marks one short vowel in each
// (candidate B below). CLAUDE.md and NARRATION_STANDARD.md require a
// comparison sample judged by a human ear, so this sends every candidate to the
// bot, numbered, rendered with the lesson's own pitch and speed override —
// the same path german-lesson-build.mjs uses, not the probe defaults.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { loadEnv, telegramConfig, sendAudio, sendMessage } from "./lib/telegram.mjs";
import { GERMAN_LESSON_NARRATION_OVERRIDE } from "./lib/voice-settings.mjs";

const OUT = "renders/voice-probe";
mkdirSync(OUT, { recursive: true });

// One sentence per group; ONLY the reported word changes between candidates.
// Every other part is the exact text lessonSpeakable() sends for episode 40.
const GROUPS = [
  {
    name: "«ماندن» — قلاب قسمت ۴۰",
    candidates: [
      ["A", "پشت باجه ی اداره، ساکت ماندن گران تمام میشود.", "بدون علامت (نسخهٔ ارسال‌شده)"],
      ["B", "پشت باجه ی اداره، ساکت ماندَن گران تمام میشود.", "فتحه روی «د» (اصلاح فعلی)"],
      ["C", "پشت باجه ی اداره، ساکت مانْدَن گران تمام میشود.", "سکون روی «ن» و فتحه روی «د»"],
    ],
  },
  {
    name: "«دردسر» — پایان قسمت ۴۰",
    candidates: [
      ["A", "نفهمیدن عیب نیست، نپرسیدن دردسر میسازد.", "بدون علامت (نسخهٔ ارسال‌شده)"],
      ["B", "نفهمیدن عیب نیست، نپرسیدن دردِسر میسازد.", "کسرهٔ پیوند «دردِ سر» (اصلاح فعلی)"],
      ["C", "نفهمیدن عیب نیست، نپرسیدن دَردِسَر میسازد.", "همهٔ واکه‌ها علامت‌دار"],
    ],
  },
];

const tg = telegramConfig(loadEnv());
if (!tg.enabled) { console.error("✗ Telegram is not configured."); process.exit(1); }

const env = {
  ...process.env,
  MINIMAX_VOICE_PITCH: String(GERMAN_LESSON_NARRATION_OVERRIDE.pitch),
  VOICE_SPEED: String(GERMAN_LESSON_NARRATION_OVERRIDE.speed),
};

let n = 0;
for (const group of GROUPS) {
  console.log(`\n=== ${group.name}`);
  await sendMessage({
    token: tg.token,
    chatId: tg.reviewChatId,
    text: `🎧 <b>${group.name}</b>\n\nهر نمونه را بشنوید و بگویید کدام درست است.`,
  });
  for (const [label, text, why] of group.candidates) {
    n++;
    const file = `${OUT}/word-${String(n).padStart(2, "0")}-${label}.mp3`;
    console.log(`    ${label}: ${text}   — ${why}`);
    execFileSync(process.execPath, ["music/minimax-tts.mjs", text, "-o", file], { stdio: "inherit", env });
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
  text: "برای هر واژه بگویید کدام نمونه درست است (A/B/C). ویدیوی تازه با B ساخته شده است؛ اگر B درست نیست، همان نمونهٔ درست جایگزین می‌شود.",
});
console.log(`\n✅ ${n} samples sent to the bot.`);
