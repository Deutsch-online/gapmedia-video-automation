// One command parser, shared by the local bot and the cloud listener so the two
// can never drift apart.
//
// Matching is by CONTAINMENT, not prefix. Real messages are phrased naturally —
// "ویدیوی تیک تاک بساز", "یک انستا برام بساز" — and a prefix match silently
// ignored all of them, which looked like the bot was broken.
//
// ORDER IS THE DESIGN. Two rules, learned from getting each one wrong:
//   1. Deleting comes before everything.
//   2. A specific target beats a generic verb: "انستا بساز" builds Instagram
//      only, and a date word beats the platform.
//
// The news/German-Insider command channel (news-scan/news-build/news-draft,
// the "امل"/Amal city shortcuts) was removed by owner request 2026-09-10 —
// German-language content became the A1 lesson series, which shipped on its
// own schedule (german-lesson-build.mjs) alone, with no Telegram command.
//
// Owner request 2026-09-15: a second, manual cycle for the A1 series,
// alongside (not instead of) that automatic schedule — reachable from here
// and from Telegram. "build-german-lesson" below is that manual trigger; see
// .german-manual-build-request.json in news-scan.yml for how it reaches the
// build without touching the automatic gate's own morning/evening/night
// state.

// strip a leading slash and normalise the zero-width non-joiner, so "تیک‌تاک"
// and "تیک تاک" are the same string
export const normalize = (t) =>
  (t || "").trim().replace(/^\//, "").replace(/‌/g, " ").replace(/\s+/g, " ").toLowerCase();

const ANY = (c, ...words) => words.some((w) => c.includes(w));
const DELETE_WORDS = ["پاک کن", "حذف کن", "پاکش کن", "delete", "undo"];
const isDelete = (c) => ANY(c, ...DELETE_WORDS);

export const COMMANDS = [
  // ── deleting: always first ────────────────────────────────────────────────
  {
    action: "undo",
    label: "حذف آخرین ارسال‌ها",
    test: isDelete,
  },

  // ── tutorial approval: this is the only educational render route ─────────
  {
    action: "voice-list",
    label: "فهرست صداهای MiniMax",
    test: (c) => ANY(c, "صداها", "صدا minimax", "minimax voice", "voice list"),
  },
  {
    action: "providers",
    label: "Provider List",
    test: (c) => ANY(c, "پروایدر", "provider", "provider list", "سرویس پروایدر"),
  },
  {
    // "تأیید تصویر <id> <شماره>" — approves one fetch-screens.mjs candidate.
    // Must sit above approved-feature: that pattern only matches a single
    // bare word after «تأیید», so it never collides with this one, but the
    // more specific pattern still goes first on principle.
    action: "approved-screen",
    label: "تصویر واقعی تأییدشده",
    test: (c) => /^(تایید|تأیید|approve)\s+تصویر\s+[a-z0-9-]+\s+[۰-۹0-9]+$/i.test(c.trim()),
  },
  {
    action: "approved-feature",
    label: "موضوع آموزشی تأییدشده",
    test: (c) => /^(تایید|تأیید|approve)\s+[a-z0-9-]+$/i.test(c.trim()),
  },

  // ── the tutorial channel ─────────────────────────────────────────────────
  // Direct commands from Telegram build immediately. Topic planning remains
  // available through the explicit «موضوع فردا» and «برنامه هفته» commands.
  {
    action: "build-tiktok",
    label: "ویدیوی تیک‌تاک",
    test: (c) => ANY(c, "تیک تاک", "تیکتاک", "tiktok", "tik tok") && ANY(c, "بساز", "ساخت", "ویدیو", "make", "build"),
  },
  {
    action: "build-instagram",
    label: "ویدیوی اینستاگرام",
    test: (c) => ANY(c, "انستا", "اینستا", "instagram", "insta") && ANY(c, "بساز", "ساخت", "ویدیو", "make", "build"),
  },
  {
    action: "build-tools",
    label: "ویدیوی اپ و هوش مصنوعی",
    test: (c) => ANY(c, "ابزار", "هوش مصنوعی", "ai", "tool") && ANY(c, "بساز", "ساخت", "ویدیو", "make", "build"),
  },
  {
    // The A1 series' manual cycle (owner request 2026-09-15) — a specific
    // target ("درس"/"آلمانی"/"german") plus a build verb, same shape as the
    // three platform commands above, so it never collides with the bare
    // "بساز" catch-all below. Never advances the curriculum on its own and
    // never marks a batch delivered — same rule .german-correction-request.
    // json's gate branch already follows for a rebuild.
    action: "build-german-lesson",
    label: "درس آلمانی",
    test: (c) => ANY(c, "درس آلمانی", "آلمانی", "german lesson", "german") && ANY(c, "بساز", "ساخت", "ویدیو", "make", "build"),
  },
  {
    action: "build-tomorrow",
    label: "ویدیوهای فردا",
    test: (c) => /^(فردا|برای فردا|فردا بساز)$/.test(c.trim()),
  },
  {
    action: "resend",
    label: "ارسال دوبارهٔ ویدیوهای امروز",
    test: (c) => /^(بفرست|ارسال کن|send)$/.test(c.trim()),
  },
  {
    action: "plan-week",
    label: "برنامهٔ موضوع‌های هفته",
    test: (c) => ANY(c, "برنامه هفته", "موضوعات هفته", "هفته"),
  },
  {
    action: "plan-tomorrow",
    label: "موضوع‌های پیشنهادی فردا",
    test: (c) => ANY(c, "موضوع فردا", "برنامه فردا"),
  },
  {
    action: "plan-tiktok",
    label: "موضوع‌های تیک‌تاک",
    test: (c) => ANY(c, "تیک تاک", "تیکتاک", "tiktok", "tik tok"),
  },
  {
    action: "plan-instagram",
    label: "موضوع‌های اینستاگرام",
    test: (c) => ANY(c, "انستا", "اینستا", "insta"),
  },
  {
    action: "plan-tools",
    label: "موضوع‌های اپ و هوش مصنوعی",
    test: (c) => ANY(c, "ابزار", "tool", "هوش مصنوعی"),
  },
  {
    // the weekly digest of platform features worth turning into tutorials —
    // deliberately NOT reachable by the word "خبر"
    action: "research",
    label: "گزارش قابلیت‌های تازه",
    test: (c) => ANY(c, "تحقیق", "اپدیت", "آپدیت", "قابلیت تازه", "research"),
  },
  {
    // The daily criteria-based, scored shortlist: not merely "what shipped"
    // (research, above) but "of what's out there, which candidate actually
    // clears the bar" — novelty + independent-source corroboration + a
    // clear-message check. "رادار" is a deliberately new word so it never
    // collides with "تحقیق"/"جستجوی محتوا"/etc., which already mean
    // something else.
    action: "content-radar",
    label: "رادار محتوا (گپ‌مدیا)",
    test: (c) => ANY(c, "رادار محتوا", "رادار موضوع", "content radar"),
  },
  { action: "status", label: "وضعیت", test: (c) => ANY(c, "وضعیت", "status") },
  { action: "help", label: "راهنما", test: (c) => ANY(c, "راهنما", "کمک", "help", "start") },
  // catch-all: "بساز" means all three current educational videos
  {
    action: "build-all",
    label: "هر ۳ ویدیوی امروز",
    test: (c) => ANY(c, "بساز", "ساخت", "همه", "هر سه", "make", "build"),
  },
];

// Returns { action, label } or null when nothing matched.
export function parseCommand(text) {
  const c = normalize(text);
  if (!c) return null;
  for (const cmd of COMMANDS) if (cmd.test(c)) return { action: cmd.action, label: cmd.label };
  return null;
}

export const HELP_TEXT =
  "📚 <b>آموزش زبان آلمانی A1</b>\n\n" +
  "• <b>درس آلمانی بساز</b> — درس بعدی را در دو نسخهٔ مستقل TikTok و Instagram می‌سازد\n" +
  "• هر نسخه حداقل یک دقیقه است و واژه، جملهٔ مثال آلمانی و توضیح فارسی دارد\n" +
  "• <b>وضعیت</b> — وضعیت آخرین درس آماده‌شده\n" +
  "• <b>راهنما</b> — همین فهرست\n\n" +
  "⏸ ویدیوهای عمومی تیک‌تاک، اینستاگرام و اپ‌ها فعلاً متوقف‌اند.\n\n" +
  "می‌توانی طبیعی هم بنویسی: «درس بعدی آلمانی را بساز».";

