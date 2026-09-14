import { EXTRA } from "./features-extra.mjs";
import { pausedTopicIds } from "./paused-topics.mjs";
import { FRESH } from "./features-fresh.mjs";
import { Y2026 } from "./features-2026.mjs";
import { DEMAND } from "./features-demand.mjs";
import { VISUAL } from "./features-visual.mjs";

// ONE feature per video, explained step by step.
// A short video that lists many things teaches nothing; a short video that walks
// through a single capability is genuinely useful — and that is what gets saved
// and shared. Steps are phrased to survive small in-app UI changes.
export const FEATURES = {
  instagram: [
    {
      id: "collab",
      benefit: { key: "viral", fa: "پستت روی دو پیج برود، دو برابر دیده شو" },
      name: "Collab",
      title: "قابلیت Collab اینستاگرام — GapMedia",
      hook: { ask: "پستت را روی دو پیج ببر و دو برابر ویو بگیر", l1: "پستت را روی", l2: "دو پیج نشان بده" },
      payoff: "پست روی هر دو پیج نشان داده می‌شود و به مخاطب هر دو می‌رسد.",
      steps: [
        { icon: "camera", text: "پست یا ریلز را بساز و به صفحهٔ آخر برو" , ui: { screen: "compose", title: "پست جدید", cta: "اشتراک‌گذاری" } },
        { icon: "users", text: "روی «Tag people» بزن" , ui: { screen: "list", title: "پست جدید", rows: ["تگ کردن افراد", "افزودن مکان", "افزودن موسیقی"], hit: 0 } },
        { screen: {"title":"Tag people","rows":["Invite collaborator","Search people"],"hit":0}, icon: "star", text: "«Invite collaborator» را انتخاب کن" , ui: { screen: "list", title: "تگ کردن افراد", rows: ["دعوت از همکار (Collab)", "جستجوی افراد"], hit: 0 } },
        { icon: "heart", text: "پیج طرف را بزن؛ بعد از تأییدش روی هر دو پیج می‌آید" , ui: { screen: "result", title: "منتشر شد" } },
      ],
      tgTitle: "🤝 قابلیت Collab اینستاگرام | پستت را روی دو پیج نشان بده\n\n#instagram #Collab #growth #GapMedia #viral",
    },
    {
      id: "hidden-words",
      benefit: { key: "seen", fa: "کامنت بد را پاک کن تا پیجت سالم بماند" },
      name: "Hidden Words",
      title: "فیلتر کامنت‌های آزاردهنده — GapMedia",
      hook: { ask: "با این قابلیت اینستاگرام، پیجت را از توهین و اسپم امن نگه دار", l1: "کامنت‌های بد را", l2: "خودکار پنهان کن" },
      payoff: "کامنت‌های شامل آن کلمه‌ها دیگر زیر پستت دیده نمی‌شوند.",
      steps: [
        { icon: "chip", text: "به تنظیمات پیج برو" , ui: { screen: "list", title: "تنظیمات", rows: ["حریم خصوصی", "اعلان‌ها", "حساب کاربری"], hit: 0 } },
        { icon: "target", text: "بخش Hidden Words را باز کن" , ui: { screen: "list", title: "حریم خصوصی", rows: ["کلمات پنهان", "محدودکردن", "مسدودشده‌ها"], hit: 0 } },
        { icon: "chat", text: "گزینهٔ پنهان‌کردن کامنت‌های آزاردهنده را روشن کن" , ui: { screen: "list", title: "کلمات پنهان", rows: ["پنهان‌کردن کامنت‌های آزاردهنده", "فیلتر پیام‌ها"], hit: 0 } },
        { icon: "pen", text: "کلمه‌های دلخواهت را هم به لیست اضافه کن" , ui: { screen: "result", title: "فعال شد" } },
      ],
      tgTitle: "🛡️ کامنت‌های آزاردهنده را خودکار پنهان کن (Hidden Words)\n\n#instagram #accountsafety #GapMedia #viral",
    },
    {
      id: "reels-template",
      benefit: { key: "viral", fa: "ریلز حرفه‌ای بساز بدون اینکه تدوین بلد باشی" },
      name: "Reels Templates",
      title: "قالب آمادهٔ ریلز — GapMedia",
      hook: { ask: "با این قابلیت اینستاگرام، در پنج دقیقه ریلز بساز و ویو بگیر", l1: "ریلز حرفه‌ای", l2: "بدون تدوین" },
      payoff: "برش‌ها و صدا خودکار هماهنگ می‌شوند؛ فقط عکس‌هایت را می‌گذاری.",
      steps: [
        { icon: "play", text: "یک ریلز که دوستش داری را باز کن" , ui: { screen: "compose", title: "ریلز", cta: "استفاده از قالب" } },
        { icon: "layers", text: "گزینهٔ «Use template» را بزن" , ui: { screen: "list", title: "ریلز", rows: ["استفاده از قالب", "ذخیره", "اشتراک‌گذاری"], hit: 0 } },
        { icon: "camera", text: "عکس‌ها یا ویدیوهای خودت را انتخاب کن" , ui: { screen: "compose", title: "انتخاب رسانه", cta: "بعدی" } },
        { icon: "sparkle", text: "منتشر کن؛ ریتم و برش‌ها آماده است" , ui: { screen: "result", title: "آمادهٔ انتشار" } },
      ],
      tgTitle: "🎬 ریلز حرفه‌ای بدون تدوین با Reels Templates\n\n#instagram #reels #contentcreator #GapMedia #viral",
    },
  ],
  tiktok: [
    {
      id: "reply-video",
      benefit: { key: "viral", fa: "از هر کامنت یک ویدیوی تازه بساز" },
      name: "Reply with video",
      title: "جواب کامنت با ویدیو — GapMedia",
      hook: { ask: "با این ترفند، از هر کامنت یک ویدیوی وایرال بساز", l1: "به کامنت", l2: "با ویدیو جواب بده" },
      payoff: "کامنت روی ویدیو می‌آید و یک محتوای تازه و رایگان می‌سازی.",
      steps: [
        { icon: "chat", text: "زیر ویدیو، بخش کامنت‌ها را باز کن" , ui: { screen: "comment", title: "کامنت‌ها", rows: ["این را چطور ساختی؟", "خیلی خوب بود!"], hit: 0 } },
        { icon: "camera", text: "کنار کامنت، آیکون دوربین را بزن" , ui: { screen: "comment", title: "کامنت‌ها", rows: ["این را چطور ساختی؟"], hit: 0 } },
        { icon: "play", text: "ویدیوی جوابت را ضبط کن" , ui: { screen: "compose", title: "ضبط جواب", cta: "ضبط" } },
        { icon: "star", text: "کامنت مثل استیکر روی ویدیو نشان داده می‌شود" , ui: { screen: "result", title: "منتشر شد" } },
      ],
      tgTitle: "💬 به کامنت با ویدیو جواب بده | ایدهٔ محتوای رایگان\n\n#tiktok #contentcreator #GapMedia #viral",
    },
    {
      id: "qa",
      benefit: { key: "viral", fa: "بگذار مخاطب سوژه‌ات را بسازد" },
      name: "Q&A",
      title: "قابلیت پرسش و پاسخ تیک‌تاک — GapMedia",
      hook: { ask: "بگذار فالوورهایت سوژهٔ ویدیوی بعدی‌ات را بسازند", l1: "بگذار مخاطب", l2: "برایت سوژه بسازد" },
      payoff: "هر سؤال یک ایدهٔ آمادهٔ ویدیو است؛ دیگر دنبال موضوع نمی‌گردی.",
      steps: [
        { icon: "user", text: "به پروفایل و بخش ابزارهای سازنده برو" , ui: { screen: "list", title: "ابزارهای سازنده", rows: ["پرسش و پاسخ (Q&A)", "تحلیل‌ها", "پروموت"], hit: 0 } },
        { icon: "chat", text: "قابلیت Q&A را روشن کن" , ui: { screen: "list", title: "پرسش و پاسخ", rows: ["فعال‌سازی Q&A"], hit: 0 } },
        { icon: "users", text: "مخاطب‌ها سؤال‌هایشان را می‌فرستند" , ui: { screen: "comment", title: "سؤال‌ها", rows: ["چطور شروع کنم؟", "بهترین ساعت کدام است؟"], hit: 0 } },
        { icon: "play", text: "روی هر سؤال بزن و با ویدیو جواب بده" , ui: { screen: "compose", title: "جواب با ویدیو", cta: "ضبط" } },
      ],
      tgTitle: "❓ با Q&A بگذار مخاطب برایت سوژه بسازد\n\n#tiktok #contentideas #GapMedia #viral",
    },
    {
      id: "photo-mode",
      benefit: { key: "viral", fa: "بدون دوربین محتوا بساز" },
      name: "Photo Mode",
      title: "حالت عکس تیک‌تاک — GapMedia",
      hook: { ask: "بدون دوربین و بدون ادیت، پستِ پرویو بساز", l1: "فقط چند عکس", l2: "و یک آهنگ" },
      payoff: "مخاطب برای دیدن عکس بعدی می‌ماند و زمان تماشا بالا می‌رود.",
      steps: [
        { screen: {"title":"Create","rows":["Photo","Video","LIVE"],"hit":0}, icon: "camera", text: "دکمهٔ + را بزن" , ui: { screen: "list", title: "ساخت", rows: ["عکس (Photo)", "ویدیو", "لایو"], hit: 0 } },
        { icon: "layers", text: "به تب عکس (Photo) برو" , ui: { screen: "compose", title: "حالت عکس", cta: "انتخاب عکس" } },
        { icon: "star", text: "چند عکس مرتبط انتخاب کن" , ui: { screen: "compose", title: "انتخاب عکس‌ها", cta: "بعدی" } },
        { icon: "music", text: "صدا و متن بگذار و منتشر کن" , ui: { screen: "result", title: "منتشر شد" } },
      ],
      tgTitle: "🖼️ با Photo Mode بدون دوربین محتوا بساز\n\n#tiktok #contentcreator #GapMedia #viral",
    },
  ],
  tools: [
    {
      id: "upscayl",
      benefit: { key: "seen", fa: "عکس تار را واضح کن تا قابل انتشار شود" },
      name: "Upscayl",
      title: "بالا بردن کیفیت عکس با Upscayl — GapMedia",
      hook: { ask: "عکس تار قدیمی‌ات را قابل پست کردن کن", l1: "عکس کم‌کیفیت را", l2: "واضح کن" },
      payoff: "عکس قدیمی و تار، تمیز و بزرگ می‌شود — رایگان و آفلاین.",
      steps: [
        { brand: {"name":"Upscayl","url":"upscayl.org","color":"#0EA5E9","tagline":"Upscale images"}, icon: "globe", text: "برنامهٔ رایگان Upscayl را نصب کن" , ui: { screen: "tool", url: "upscayl.org", cta: "دانلود رایگان" } },
        { icon: "camera", text: "عکس کم‌کیفیت را داخلش بگذار" , ui: { screen: "tool", url: "upscayl", cta: "انتخاب عکس" } },
        { icon: "wand", text: "حالت بزرگ‌نمایی را انتخاب کن" , ui: { screen: "tool", url: "upscayl", cta: "بزرگ‌نمایی ۴x" } },
        { icon: "sparkle", text: "خروجی بگیر؛ عکس واضح‌تر و بزرگ‌تر می‌شود" , ui: { screen: "tool", url: "upscayl", cta: "ذخیرهٔ خروجی" } },
      ],
      tgTitle: "✨ عکس کم‌کیفیت را با Upscayl واضح کن (رایگان)\n\n#freeapp #contentcreator #GapMedia #viral",
    },
    {
      id: "removebg",
      benefit: { key: "seen", fa: "پس‌زمینه را پاک کن تا کاورت تمیز و حرفه‌ای شود" },
      name: "remove.bg",
      title: "حذف پس‌زمینهٔ عکس — GapMedia",
      hook: { ask: "بک‌گراند عکست را در چند ثانیه پاک کن، بدون نصب", l1: "پس‌زمینه را", l2: "در چند ثانیه پاک کن" },
      payoff: "برای کاور، لوگو و طرح، عکس بدون پس‌زمینه آماده می‌شود.",
      steps: [
        { brand: {"name":"remove.bg","url":"remove.bg","color":"#54616E","tagline":"Remove background"}, icon: "globe", text: "سایت remove.bg را باز کن" , ui: { screen: "tool", url: "remove.bg", cta: "باز کردن سایت" } },
        { icon: "camera", text: "عکست را بارگذاری کن" , ui: { screen: "tool", url: "remove.bg", cta: "بارگذاری عکس" } },
        { icon: "wand", text: "پس‌زمینه خودکار حذف می‌شود" , ui: { screen: "tool", url: "remove.bg", cta: "حذف پس‌زمینه" } },
        { icon: "layers", text: "خروجی را در طراحی کاورت استفاده کن" , ui: { screen: "tool", url: "remove.bg", cta: "دانلود" } },
      ],
      tgTitle: "✂️ پس‌زمینهٔ عکس را در چند ثانیه پاک کن\n\n#freeapp #design #GapMedia #viral",
    },
    {
      id: "capcut-captions",
      benefit: { key: "seen", fa: "بیشتر مردم بی‌صدا می‌بینند؛ زیرنویس یعنی بازدید" },
      name: "CapCut",
      title: "زیرنویس خودکار با CapCut — GapMedia",
      hook: { ask: "یک‌سوم مردم بی‌صدا می‌بینند، زیرنویس بگذار", l1: "زیرنویس ویدیو را", l2: "خودکار بساز" },
      payoff: "بیشتر مردم ویدیو را بی‌صدا می‌بینند؛ زیرنویس یعنی دیده‌شدن بیشتر.",
      steps: [
        { brand: {"name":"CapCut","url":"capcut.com","color":"#111111","tagline":"Auto captions"}, icon: "camera", text: "ویدیو را در CapCut باز کن" , ui: { screen: "compose", title: "CapCut", cta: "افزودن ویدیو" } },
        { icon: "mic", text: "بخش Captions را انتخاب کن" , ui: { screen: "list", title: "ابزارها", rows: ["زیرنویس (Captions)", "متن", "افکت"], hit: 0 } },
        { icon: "pen", text: "زیرنویس خودکار ساخته می‌شود؛ غلط‌ها را اصلاح کن" , ui: { screen: "list", title: "زیرنویس", rows: ["ساخت خودکار", "ویرایش متن"], hit: 0 } },
        { icon: "star", text: "قلم و رنگ را هماهنگ پیجت کن" , ui: { screen: "result", title: "زیرنویس آماده شد" } },
      ],
      tgTitle: "📝 زیرنویس خودکار ویدیو با CapCut\n\n#editing #freeapp #GapMedia #viral",
    },
  ],
};

// one feature per day, rotating.
// FRESH comes first on purpose: the newest, least-known topics should be what
// goes out next, not what waits eleven days behind the material already posted.
// The rotation is anchored to a fixed day rather than to the raw epoch day
// number, so "day 0 of the cycle" is a date we chose (the day the FRESH pack
// went live) instead of whatever offset the arithmetic happened to land on.
const ROTATION_EPOCH = 20689; // 2026-08-24

// Research-first rotation. Seven of each ten tutorial videos answer a proven
// creator need (reach, search discovery, testing, qualified monetisation or
// shareability). The remaining three keep the feed current with new releases
// and genuinely useful apps. This prevents a daily menu-tour from masquerading
// as a viral-content strategy.
const DEMAND_IDS = {
  tiktok: ["view-jail", "tiktok-pay", "search-insights", "retention-graph", "pin-comment", "tt-media-kit"],
  instagram: ["hashtags-hurt", "ask-dont-beg", "trial-reels", "collab", "ig-insights-retention", "replace-audio"],
  tools: ["hook-17x", "mute-30", "photopea", "capcut-captions", "google-trends", "pexels-broll"],
};

// Every feature in a category, in rotation order.
export function featuresFor(cat) {
  return [
    // what people search for comes before what the platforms shipped
    ...((DEMAND && DEMAND[cat]) || []),
    ...((Y2026 && Y2026[cat]) || []),
    ...((VISUAL && VISUAL[cat]) || []),
    ...((FRESH && FRESH[cat]) || []),
    ...(FEATURES[cat] || []),
    ...((EXTRA && EXTRA[cat]) || []),
  ];
}

// Every id and name already in the content bank, lowercased — the single
// definition of "already covered" for anything that researches new topics.
// research.mjs used to check only Y2026/FRESH/FEATURES/EXTRA and silently
// missed DEMAND/VISUAL, so a feature already sitting in one of those two
// banks could still be reported as "new". featuresFor() already merges all
// six banks per category, so building the set from it fixes that for free.
export function alreadyCovered() {
  const out = new Set();
  for (const cat of Object.keys({ ...DEMAND, ...Y2026, ...VISUAL, ...FRESH, ...FEATURES, ...EXTRA })) {
    for (const f of featuresFor(cat)) {
      out.add(String(f.id).toLowerCase());
      out.add(String(f.name).toLowerCase());
    }
  }
  return out;
}

// A result headline mentioning a bank feature's id or name by title is crude,
// but it is only ever deciding whether to mention something already covered.
export function isFeatureKnown(title, covered = alreadyCovered()) {
  const t = String(title).toLowerCase();
  for (const name of covered) {
    if (name.length >= 5 && t.includes(name)) return true;
  }
  return false;
}

// Look one up by id, so a freshly researched update can be published the day it
// lands instead of waiting for its turn in the rotation.
export function featureById(id) {
  // GitHub Actions turns the terminal newline from jq into a space while it
  // transports a Telegram request through GITHUB_OUTPUT.  IDs are catalogue
  // keys, so surrounding whitespace must never turn an edit/re-render into a
  // false "feature not found" failure.
  const want = String(id ?? "").trim().toLowerCase();
  if (!want) return null;
  for (const cat of Object.keys({ ...DEMAND, ...Y2026, ...VISUAL, ...FRESH, ...FEATURES, ...EXTRA })) {
    const f = featuresFor(cat).find((x) => String(x.id).toLowerCase() === want);
    if (f) return { cat, feature: f };
  }
  return null;
}

// Rotation lands on arr[startIndex] by day; if that id was already published
// (or has already failed this run's Visual QC), walk forward through the rest
// of the same list instead of repeating it. Returns undefined once every
// entry is excluded, so a caller with a wider list to fall back to (see
// featureFor's demand-tier -> full-list chain) gets the chance to use it
// instead of silently repeating the same excluded pick.
function pickAvoiding(arr, startIndex, exclude) {
  for (let step = 0; step < arr.length; step++) {
    const candidate = arr[(startIndex + step) % arr.length];
    if (!exclude.has(String(candidate.id).toLowerCase())) return candidate;
  }
  return undefined;
}

// Once every id in a list is excluded, there is nothing left to pick that
// truly avoids a repeat — but "never published" and "published five months
// ago" are not the same as "published this morning". Ranks by last-published
// time (never-published treated as oldest) so an exhausted category always
// rotates to whichever topic has gone the longest since its last turn,
// instead of freezing on one raw dayIndex-modulo pick. `staleness` is a
// Map<id, epochMs> — optional so any caller that does not pass one keeps the
// old plain-index fallback.
//
// `exclude` MUST still be honoured here too (fixed 2026-09-11): this is the
// fallback pickAvoiding() hands off to once every id is excluded, but the
// old version ignored `exclude` entirely and just returned the globally
// least-recently-published id — including one this very run already
// rejected as a duplicate or a Visual QC failure a moment earlier. Confirmed
// live: the "tools"/AI rotation kept re-selecting the exact id
// (daily-render.mjs's own MAX_ATTEMPTS_PER_SLOT retry loop) that had just
// failed a 30-day duplicate check, burning all 6 retry attempts and ~20
// minutes of render time on the same known-bad pick instead of trying
// anything else. If every candidate is excluded (truly nothing left),
// still return the least-recently-used one rather than nothing — that
// matches every existing caller's expectation of never getting undefined.
// `allowExhaustedFallback` (default true, matches every caller before this
// parameter existed): when the primary exclude-respecting search finds
// nothing, the second loop below picks the globally least-stale item and
// IGNORES exclude — which sounds right ("re-air something old rather than
// build nothing") but a never-published id always has staleness 0, the
// lowest possible value, so it beats every real published timestamp. If the
// only never-published ids left in a category are ones THIS RUN already
// rejected (Visual QC failure, 30-day duplicate — avoidIds/triedIds, folded
// into `exclude` by the caller), this fallback re-serves exactly that
// rejected id forever. Confirmed live 2026-09-12: the "instagram" daily slot
// alternated between two never-published, already-failed ids
// ("pin-posts", "hashtags-hurt") until daily-render.mjs's own triedIds check
// gave up with "no more topics to try", even though MAX_ATTEMPTS_PER_SLOT
// still had attempts left. Pass false for callers that have a real fallback
// of their own to escalate to instead of a guaranteed pick (featureFor() has
// buildPack()'s bank-based content; aiFeatureFor()'s AI_DAILY_IDS does not,
// so it keeps the old guaranteed-pick behavior).
function leastRecentlyUsed(arr, staleness, exclude = new Set(), allowExhaustedFallback = true) {
  let best = null, bestT = Infinity;
  for (const item of arr) {
    if (exclude.has(String(item.id).toLowerCase())) continue;
    const t = staleness.get(String(item.id).toLowerCase()) ?? 0;
    if (t < bestT) { bestT = t; best = item; }
  }
  if (best) return best;
  if (!allowExhaustedFallback) return undefined;
  let fallback = arr[0], fallbackT = Infinity;
  for (const item of arr) {
    const t = staleness.get(String(item.id).toLowerCase()) ?? 0;
    if (t < fallbackT) { fallbackT = t; fallback = item; }
  }
  return fallback;
}

export function featureFor(cat, dayIndex, exclude = new Set(), staleness = null) {
  // Merged at the top so EVERY path below sees it — the demand tier, the
  // category list, and leastRecentlyUsed()'s fallback alike. A paused topic
  // that could still be reached through the fallback would be a pause in
  // name only. See lib/paused-topics.mjs and .topics-paused.json.
  exclude = new Set([...exclude, ...pausedTopicIds()]);
  const list = [
    ...((DEMAND && DEMAND[cat]) || []),
    // What the platforms shipped this year goes out first — an update is only
    // worth telling people about while it is still news to them.
    ...((Y2026 && Y2026[cat]) || []),
    ...((VISUAL && VISUAL[cat]) || []),
    ...((FRESH && FRESH[cat]) || []),
    ...(FEATURES[cat] || []),
    ...((EXTRA && EXTRA[cat]) || []),
  ];
  if (!list.length) return null;
  const cycle = ((dayIndex - ROTATION_EPOCH) % 10 + 10) % 10;
  const demanded = (DEMAND_IDS[cat] || [])
    .map((id) => list.find((f) => f.id === id))
    .filter(Boolean);
  if (cycle < 7 && demanded.length) {
    const i = (((dayIndex - ROTATION_EPOCH) % demanded.length) + demanded.length) % demanded.length;
    const fromDemandTier = pickAvoiding(demanded, i, exclude);
    // The demand tier is a priority, not a cage: once every one of its ids is
    // already published or has failed this run, falling through to the rest
    // of the category's own list is still a real, on-topic path — the
    // alternative is repeating an excluded id or refusing to build at all.
    if (fromDemandTier) return fromDemandTier;
  }
  const i = (((dayIndex - ROTATION_EPOCH) % list.length) + list.length) % list.length;
  // Every id in the category is excluded — nothing left to swap to. Rotate to
  // the least-recently-published one instead of blindly repeating the day's
  // raw pick (see leastRecentlyUsed() above). `false`: unlike aiFeatureFor's
  // AI_DAILY_IDS, this category's caller (buildPack) has a bank-based
  // fallback to fall through to, so this may return undefined rather than
  // guarantee a pick that could be the exact id this very run just rejected.
  return pickAvoiding(list, i, exclude) || (staleness ? leastRecentlyUsed(list, staleness, exclude, false) : list[i]);
}

// The third daily subject is explicitly AI/workflow content, not merely any
// creator utility. These IDs are verified AI workflows with a demonstrable
// outcome (video, voice, editing or ideation); the list is intentionally small
// so a generic tool cannot silently occupy the AI slot.
//
// Widened from the original 5 to 9 on 2026-09-08: with only 5 candidates and
// a 30-day duplicate window, every one of them was guaranteed stale within a
// single rotation (5 ids cycling faster than the 30-day window they're
// checked against) — confirmed live the same day, "adobe-podcast" rejected
// at a 100% duplicate score with no untried alternative left. The four added
// ids (kling-ai, ideogram-text, cleanup-pictures, google-vids-product-demo)
// are not new content — they already exist, already researched, in the
// "tools" bank (features-2026/features-extra/features-fresh/features-visual)
// and already meet this list's own bar: a demonstrable AI-generated outcome
// (kling-ai → video, ideogram-text → image/ideation, cleanup-pictures →
// AI inpainting/editing, google-vids-product-demo → Gemini-drafted video).
//
// "ai-hook-writer" removed 2026-09-11: it has never had a single committed
// real screenshot (all 4 steps only ever carried a guessed `tip.ui` mock),
// so it depends entirely on live rescuePackPhotos() succeeding at build
// time — and step 3 ("ask for 10 hooks") / step 4 ("copy the best") are
// abstract chat-app actions with no distinct real screen to photograph,
// so the live search keeps coming back empty. This is the only candidate
// in this list with no real-asset safety net at all; when every OTHER
// candidate is excluded (published recently / also mid-failure), the
// leastRecentlyUsed() fallback below kept landing back on it, and the
// whole evening ai-tiktok/ai-instagram batch failed outright for several
// runs in a row (2026-09-11, confirmed on both the pre- and post- "News
// pipeline removed" code — unrelated to that change). Put it back once a
// real screenshot exists for all 4 steps (the bot's own failure alert
// already asks the owner to send one via Telegram, captioned
// "ai-hook-writer" — cloud-listen.mjs stores it for the next render).
//
// "upscayl" and "removebg" added 2026-09-11, same day: even after fixing
// the exclude-set bug above (leastRecentlyUsed now genuinely prefers an
// untried candidate), the batch kept failing on "kling-ai" -- traced with
// real .content-history.json data and confirmed this was not a remaining
// code bug: ALL 7 other candidates at the time (adobe-podcast 09-08, suno
// 08-27, elevenlabs 09-02, descript 09-06, ideogram-text 09-08,
// cleanup-pictures 09-09, google-vids-product-demo 09-10) had been
// published MORE recently than kling-ai's own 08-26, so the fallback
// correctly picked the least-stale of a genuinely fully-stale set --
// kling-ai was the "best of a bad lot", still inside dedupe.mjs's 30-day
// window like everything else in the list. The real fix is the same one
// the 2026-09-08 widening already used: more genuine, never-yet-published
// AI-outcome candidates so the list is not simultaneously exhausted.
// upscayl (AI image upscaling) and removebg (AI background removal) meet
// the same bar as the rest, already exist in the "tools" bank
// (lib/features.mjs's own FEATURES.tools), and had never been published
// as of this addition -- immune to both the 30-day duplicate check and
// the all-time publishedFeatureIds() exclusion for a full rotation.
export const AI_DAILY_IDS = Object.freeze([
  "adobe-podcast", "suno", "elevenlabs", "descript",
  "kling-ai", "ideogram-text", "cleanup-pictures", "google-vids-product-demo",
  "upscayl", "removebg",
]);

export function aiFeatureFor(dayIndex, exclude = new Set(), staleness = null) {
  exclude = new Set([...exclude, ...pausedTopicIds()]);
  const byId = new Map(featuresFor("tools").map((feature) => [feature.id, feature]));
  const candidates = AI_DAILY_IDS.map((id) => byId.get(id)).filter(Boolean);
  if (!candidates.length) return null;
  const i = (((dayIndex - ROTATION_EPOCH) % candidates.length) + candidates.length) % candidates.length;
  // AI_DAILY_IDS is deliberately small with no wider list to escalate to — if
  // every one of them is excluded, rotate to the least-recently-published one.
  return pickAvoiding(candidates, i, exclude) || (staleness ? leastRecentlyUsed(candidates, staleness, exclude) : candidates[i]);
}
