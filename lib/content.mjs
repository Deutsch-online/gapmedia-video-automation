import { existsSync, readFileSync } from "node:fs";
import { ACTIVE_BANKS } from "./banks-active.mjs";
import { featureFor, featureById, aiFeatureFor } from "./features.mjs";
import { beatPlan, styleFor } from "../music/style.mjs";
import { moodFor } from "../music/mood.mjs";
import { persianNumberWords, breathe } from "./pronounce.mjs";

// A Telegram-approved real screenshot (fetch-screens.mjs downloads
// candidates, approve-screen.mjs marks one verified on "تأیید تصویر <id> <n>")
// stands in for a manually authored f.hookPhoto — so approving from a phone
// is enough to reach the next render, local or cloud, with no source edit.
const SCREENS_MANIFEST = "public/screens/candidates.json";
function verifiedScreenFor(id) {
  if (!existsSync(SCREENS_MANIFEST)) return null;
  try {
    const manifest = JSON.parse(readFileSync(SCREENS_MANIFEST, "utf8"));
    return (manifest[id] || []).find((c) => c.verified)?.file || null;
  } catch { return null; }
}

// The daily rotation (featureFor/aiFeatureFor) used to pick purely by date,
// with no memory of what had already gone out — so a feature already sent to
// Telegram (e.g. "kling-ai") could be picked again on its next turn in the
// cycle. Loading the same publish log topic-plan.mjs already treats as the
// source of truth lets the rotation skip those ids and move to the next
// unpublished one instead.
const CONTENT_HISTORY = ".content-history.json";
function publishedFeatureIds() {
  try {
    const history = JSON.parse(readFileSync(CONTENT_HISTORY, "utf8"));
    return new Set(history.map((h) => String(h.id || "").toLowerCase()).filter(Boolean));
  } catch { return new Set(); }
}
// pickAvoiding() (lib/features.mjs) walks a category's list looking for an id
// not in `exclude`; once EVERY id in the list is excluded (published, or
// failed this run's Visual QC), it used to fall back to the day's raw
// dayIndex-modulo pick — silently ignoring `exclude` and re-serving whatever
// that index landed on, which can be the exact same id on every call the same
// day. Owner report 2026-09-11: "تیک‌تاک و انستا ... هنوزم روی همان موضوع
// ... ساخته می‌شود" (still the same topic every time), despite an earlier
// instruction to diversify — a small category (tiktok/instagram, after the
// Visual Truth Gate excludes anything with no real per-slide photo) is
// exhausted quickly, and the raw fallback then has no memory of history at
// all. This ranks a category's own list by how long ago each id last shipped
// (never-published sorts first) so the exhausted fallback always rotates to
// the least-recently-repeated topic instead of freezing on one.
function publishedAtById() {
  try {
    const history = JSON.parse(readFileSync(CONTENT_HISTORY, "utf8"));
    const map = new Map();
    for (const h of history) {
      const id = String(h.id || "").toLowerCase();
      if (!id) continue;
      const t = Date.parse(h.sentAt || "") || 0;
      if (!map.has(id) || t > map.get(id)) map.set(id, t);
    }
    return map;
  } catch { return new Map(); }
}
// Content library for the GapMedia daily pipeline.
// 4 categories (TikTok / Instagram / social / AI). Each has a BANK of tips; each
// day an 8-tip window is selected with a rotating stride, plus rotating hook,
// title and music — so no two days look the same. Add more tips to grow variety.

const THEMES = {
  tiktok: {
    grad: "linear-gradient(160deg,#1a2a9e 0%,#0c1560 45%,#05081f 100%)",
    gradOutro: "linear-gradient(160deg,#22e0f0 0%,#1e37c9 40%,#0b1560 100%)",
    glow1: "rgba(58,91,255,.55)", glow2: "rgba(34,224,240,.30)",
    emc: "#1732c9", accents: ["#22e0f0", "#ff2d9b", "#ffd23f"],
  },
  instagram: {
    grad: "linear-gradient(160deg,#2E1065 0%,#4C1D95 48%,#111827 100%)",
    gradOutro: "linear-gradient(160deg,#5B21B6 0%,#C026D3 45%,#1F2937 100%)",
    glow1: "rgba(192,38,211,.30)", glow2: "rgba(91,33,182,.34)",
    emc: "#0F6E86", accents: ["#0E7C9B", "#12657A", "#3FA9C4"],
  },
  general: {
    grad: "linear-gradient(160deg,#0ea5a5 0%,#1e5fd0 48%,#061634 100%)",
    gradOutro: "linear-gradient(160deg,#22c55e 0%,#1e5fd0 45%,#0b1e5a 100%)",
    glow1: "rgba(34,197,94,.40)", glow2: "rgba(58,91,255,.34)",
    emc: "#0e7490", accents: ["#22c55e", "#3a5bff", "#22e0f0"],
  },
  ai: {
    grad: "linear-gradient(160deg,#4c1d95 0%,#1e1b4b 46%,#050317 100%)",
    gradOutro: "linear-gradient(160deg,#22d3ee 0%,#7c3aed 42%,#1e1b4b 100%)",
    glow1: "rgba(124,58,237,.50)", glow2: "rgba(34,211,238,.34)",
    emc: "#6d28d9", accents: ["#22d3ee", "#a855f7", "#34d399"],
  },
  tools: {
    grad: "linear-gradient(160deg,#0e7490 0%,#3730a3 48%,#070a24 100%)",
    gradOutro: "linear-gradient(160deg,#22d3ee 0%,#6366f1 42%,#1e1b4b 100%)",
    glow1: "rgba(99,102,241,.48)", glow2: "rgba(34,211,238,.34)",
    emc: "#0e7490", accents: ["#22d3ee", "#a3e635", "#818cf8"],
  },
};

// ---- tip banks (16 each) ----  head = short title (with one <span class="hl">),
//                                 sub  = one clear sentence (with one <b class="em">)
const BANKS_INLINE = {
  tiktok: [
    { icon: "magnet", head: 'قلاب <span class="hl">سه‌ثانیه‌ای</span>', sub: 'در <b class="em">سه ثانیهٔ اول</b> با یک سؤال یا جملهٔ قوی، مخاطب را جذب کن.' },
    { icon: "bolt", head: 'ریتم <span class="hl">تند</span>', sub: 'ویدیو را کوتاه و پرریتم نگه دار؛ <b class="em">هر لحظه</b> باید جذاب باشد.' },
    { icon: "music", head: 'صدای <span class="hl">ترند</span>', sub: 'از <b class="em">صداهای در حال ترند</b> متناسب با موضوعت استفاده کن.' },
    { icon: "hashtag", head: 'هشتگ <span class="hl">هدفمند</span>', sub: '<b class="em">سه تا پنج هشتگ</b> دقیق و مرتبط بگذار، نه هشتگ‌های خیلی کلی.' },
    { icon: "chat", head: 'دعوت به <span class="hl">تعامل</span>', sub: 'از مخاطب بخواه <b class="em">کامنت بگذارد</b> و ویدیو را به اشتراک بگذارد.' },
    { icon: "clock", head: 'زمان <span class="hl">درست</span>', sub: 'وقتی مخاطبانت <b class="em">آنلاین</b> هستند پست بگذار و منظم باش.' },
    { icon: "camera", head: 'تصویر <span class="hl">باکیفیت</span>', sub: 'با <b class="em">نور کافی</b> و تصویر واضح، حرفه‌ای‌تر دیده می‌شوی.' },
    { icon: "chart", head: 'تحلیل و <span class="hl">تست</span>', sub: 'نرخ <b class="em">ماندگاری مخاطب</b> را بررسی کن و فرمت‌های تازه را امتحان کن.' },
    { icon: "play", head: 'فریم اول <span class="hl">قوی</span>', sub: 'همان <b class="em">فریم اول</b> باید چشم را بگیرد تا اسکرول متوقف شود.' },
    { icon: "clock", head: 'طول <span class="hl">مناسب</span>', sub: 'ویدیوهای <b class="em">هفت تا پانزده ثانیه</b> معمولاً بهترین نتیجه را می‌دهند.' },
    { icon: "chat", head: 'پایان با <span class="hl">سؤال</span>', sub: 'ویدیو را با یک <b class="em">سؤال</b> تمام کن تا کامنت‌ها بیشتر شوند.' },
    { icon: "refresh", head: 'بازتولید <span class="hl">موفق‌ها</span>', sub: 'ویدیوهای <b class="em">پربازدید</b> را با ایده و فرمت تازه دوباره بساز.' },
    { icon: "star", head: 'قلاب <span class="hl">متنی</span>', sub: 'یک <b class="em">متن کوتاه و کنجکاوکننده</b> روی ثانیه‌های اول بگذار.' },
    { icon: "trend", head: 'ورود <span class="hl">زودهنگام</span>', sub: 'ترندها را <b class="em">زود</b> اجرا کن؛ دیر رسیدن یعنی از دست دادن موج.' },
    { icon: "users", head: 'تعامل با <span class="hl">هم‌حوزه‌ها</span>', sub: 'با پیج‌های <b class="em">هم‌موضوع</b> تعامل کن تا بیشتر دیده شوی.' },
    { icon: "target", head: 'مخاطب <span class="hl">مشخص</span>', sub: 'دقیق بدان <b class="em">برای چه کسی</b> می‌سازی و محتوا را برایش تنظیم کن.' },
  ],
  instagram: [
    { icon: "user", head: 'پروفایل <span class="hl">حرفه‌ای</span>', sub: 'عکس پروفایل واضح، <b class="em">بایوی کوتاه</b> و لینک فعال داشته باش.' },
    { icon: "play", head: 'قدرت <span class="hl">ریلز</span>', sub: '<b class="em">ریلز</b> بیشترین بازدید ارگانیک را می‌آورد؛ روی آن تمرکز کن.' },
    { icon: "star", head: 'کاور <span class="hl">هماهنگ</span>', sub: 'برای هر پست یک <b class="em">کاور خوانا و هماهنگ</b> با پیجت طراحی کن.' },
    { icon: "heart", head: 'استوری <span class="hl">روزانه</span>', sub: 'هر روز استوری بگذار و از <b class="em">نظرسنجی و سؤال</b> استفاده کن.' },
    { icon: "hashtag", head: 'هشتگ <span class="hl">لایه‌ای</span>', sub: 'ترکیبی از هشتگ‌های <b class="em">پرطرفدار، متوسط و خاص</b> بگذار.' },
    { icon: "layers", head: 'کاروسل <span class="hl">آموزشی</span>', sub: 'پست‌های چندتصویری آموزشی، <b class="em">ذخیره و اشتراک</b> بیشتری می‌گیرند.' },
    { icon: "chat", head: 'پاسخ <span class="hl">سریع</span>', sub: 'به <b class="em">کامنت و دایرکت</b> سریع جواب بده تا تعامل بالا برود.' },
    { icon: "chart", head: 'بهترین <span class="hl">زمان</span>', sub: 'از بخش <b class="em">Insights</b> برای یافتن بهترین زمان انتشار کمک بگیر.' },
    { icon: "play", head: 'ریلز <span class="hl">کوتاه</span>', sub: 'ریلز‌های کوتاه <b class="em">نرخ تماشای دوباره</b> بالاتری دارند.' },
    { icon: "star", head: 'هوک <span class="hl">نوشتاری</span>', sub: 'در <b class="em">دو ثانیهٔ اول</b> با یک متن، کنجکاوی بساز.' },
    { icon: "users", head: 'همکاری <span class="hl">مشترک</span>', sub: 'با پیج‌های هم‌حوزه <b class="em">پست مشترک</b> بگذار تا مخاطب تازه بگیری.' },
    { icon: "calendar", head: 'نظم در <span class="hl">انتشار</span>', sub: '<b class="em">روزها و ساعت‌های ثابت</b> برای پست‌گذاری انتخاب کن.' },
    { icon: "target", head: 'مخاطب <span class="hl">هدف</span>', sub: 'بدان مخاطبت کیست و <b class="em">دقیقاً برای او</b> محتوا بساز.' },
    { icon: "sparkle", head: 'هویت <span class="hl">بصری</span>', sub: '<b class="em">رنگ، فونت و لحن ثابت</b>، پیجت را حرفه‌ای نشان می‌دهد.' },
    { icon: "bulb", head: 'ارزش <span class="hl">واقعی</span>', sub: 'محتوایی بساز که <b class="em">آموزش بدهد، حل مشکل کند یا سرگرم کند</b>.' },
    { icon: "refresh", head: 'تحلیل و <span class="hl">بهبود</span>', sub: 'هفتگی آمار را ببین و <b class="em">بر اساس آن</b> محتوا را بهتر کن.' },
  ],
  general: [
    { icon: "user", head: 'هویت <span class="hl">واحد</span>', sub: 'در همهٔ شبکه‌ها <b class="em">اسم، عکس و لحن</b> یکسان داشته باش.' },
    { icon: "bulb", head: 'محتوای <span class="hl">ارزشمند</span>', sub: 'محتوایی بساز که <b class="em">آموزش، سرگرمی یا راه‌حل</b> ارائه دهد.' },
    { icon: "calendar", head: 'تقویم <span class="hl">محتوا</span>', sub: 'برای هفته <b class="em">برنامه‌ریزی</b> کن تا همیشه محتوای آماده داشته باشی.' },
    { icon: "layers", head: 'بازطراحی <span class="hl">محتوا</span>', sub: 'یک محتوا را برای هر شبکه <b class="em">بازطراحی</b> کن، نه کپی مستقیم.' },
    { icon: "chat", head: 'ساخت <span class="hl">جامعه</span>', sub: 'به مخاطب پاسخ بده تا <b class="em">جامعه‌ای وفادار</b> بسازی.' },
    { icon: "chart", head: 'تصمیم با <span class="hl">داده</span>', sub: 'آمار را بررسی کن و روی چیزی که <b class="em">جواب می‌دهد</b> تمرکز کن.' },
    { icon: "users", head: 'همکاری و <span class="hl">رشد</span>', sub: 'با صفحه‌های مرتبط <b class="em">همکاری</b> کن تا به مخاطب تازه برسی.' },
    { icon: "refresh", head: 'ثبات و <span class="hl">صبر</span>', sub: 'منظم باش و ادامه بده؛ <b class="em">رشد واقعی زمان می‌برد</b>.' },
    { icon: "target", head: 'مخاطب <span class="hl">هدف</span>', sub: 'دقیق مشخص کن <b class="em">برای چه کسی</b> محتوا می‌سازی.' },
    { icon: "sparkle", head: 'ارزش در <span class="hl">چند ثانیه</span>', sub: 'همان ابتدا مشخص کن مخاطب <b class="em">چه چیزی به دست می‌آورد</b>.' },
    { icon: "trend", head: 'سوارشدن بر <span class="hl">ترند</span>', sub: '<b class="em">ترندهای مرتبط</b> با حوزه‌ات را سریع اجرا کن.' },
    { icon: "star", head: 'داستان <span class="hl">برند</span>', sub: 'پشت پیجت یک <b class="em">داستان</b> بساز تا مخاطب با تو ارتباط بگیرد.' },
    { icon: "play", head: 'تنوع <span class="hl">فرمت</span>', sub: '<b class="em">ویدیو، تصویر و متن</b> را ترکیب کن تا محتوا یکنواخت نشود.' },
    { icon: "clock", head: 'ساعت <span class="hl">طلایی</span>', sub: 'در <b class="em">ساعت‌های پرتعامل</b> فعال باش و پاسخ بده.' },
    { icon: "hashtag", head: 'کشف‌<span class="hl">پذیری</span>', sub: 'از <b class="em">کلمات کلیدی و هشتگ درست</b> برای دیده‌شدن استفاده کن.' },
    { icon: "heart", head: 'فراخوان به <span class="hl">اقدام</span>', sub: 'در پایان از مخاطب بخواه <b class="em">دنبال کند یا اشتراک بگذارد</b>.' },
  ],
  ai: [
    { icon: "bulb", head: 'تولید <span class="hl">ایده</span>', sub: 'با هوش مصنوعی در چند ثانیه <b class="em">ده‌ها ایدهٔ محتوا</b> بگیر.' },
    { icon: "pen", head: 'نوشتن <span class="hl">کپشن</span>', sub: '<b class="em">کپشن و متن پست</b> را با ابزارهای هوش مصنوعی سریع بنویس و ویرایش کن.' },
    { icon: "chat", head: 'اسکریپت <span class="hl">ویدیو</span>', sub: '<b class="em">سناریو و متن ویدیو</b> را با هوش مصنوعی آماده کن.' },
    { icon: "wand", head: 'ساخت <span class="hl">تصویر</span>', sub: '<b class="em">کاور و تصویر اختصاصی</b> را با ابزارهای تصویرساز هوش مصنوعی بساز.' },
    { icon: "camera", head: 'ویرایش <span class="hl">ویدیو</span>', sub: '<b class="em">برش، حذف سکوت و تدوین</b> را به ابزارهای هوشمند بسپار.' },
    { icon: "mic", head: 'صدای <span class="hl">مصنوعی</span>', sub: 'برای ویدیوهایت <b class="em">وویس‌اوور طبیعی</b> با هوش مصنوعی بساز.' },
    { icon: "star", head: 'زیرنویس <span class="hl">خودکار</span>', sub: 'با هوش مصنوعی <b class="em">زیرنویس دقیق و هماهنگ</b> بساز.' },
    { icon: "globe", head: 'ترجمهٔ <span class="hl">محتوا</span>', sub: 'محتوا را با هوش مصنوعی <b class="em">به چند زبان</b> برگردان و مخاطب جهانی بگیر.' },
    { icon: "hashtag", head: 'هشتگ <span class="hl">هوشمند</span>', sub: '<b class="em">هشتگ‌های مرتبط و مؤثر</b> را با کمک هوش مصنوعی پیدا کن.' },
    { icon: "calendar", head: 'برنامه‌ریزی <span class="hl">محتوا</span>', sub: '<b class="em">تقویم و زمان انتشار</b> را با هوش مصنوعی بچین.' },
    { icon: "chart", head: 'تحلیل <span class="hl">عملکرد</span>', sub: 'با هوش مصنوعی بفهم <b class="em">کدام پست بهتر بوده</b> و چرا.' },
    { icon: "target", head: 'تحلیل <span class="hl">رقبا</span>', sub: '<b class="em">محتوای رقبا و ترندها</b> را با ابزارهای هوش مصنوعی بررسی کن.' },
    { icon: "refresh", head: 'بازنویسی <span class="hl">چندسکویی</span>', sub: 'یک محتوا را با هوش مصنوعی <b class="em">برای هر پلتفرم</b> بهینه کن.' },
    { icon: "chip", head: 'پاسخ <span class="hl">خودکار</span>', sub: 'با <b class="em">چت‌بات هوشمند</b> به پیام‌ها سریع پاسخ بده.' },
    { icon: "sparkle", head: 'شخصی‌<span class="hl">سازی</span>', sub: 'محتوا را با هوش مصنوعی <b class="em">برای سلیقهٔ مخاطب هدف</b> تنظیم کن.' },
    { icon: "bolt", head: 'صرفه‌جویی در <span class="hl">زمان</span>', sub: '<b class="em">کارهای تکراری</b> را به هوش مصنوعی بسپار و روی خلاقیت تمرکز کن.' },
  ],
  tools: [
    { icon: "camera", head: 'ادیت با <span class="hl">CapCut</span>', sub: 'ویدیوهایت را رایگان با <b class="em">CapCut</b> برش بزن و زیرنویس بگذار.' },
    { icon: "layers", head: 'طراحی با <span class="hl">Canva</span>', sub: 'کاور و پست حرفه‌ای را بدون تخصص با <b class="em">Canva</b> بساز.' },
    { icon: "sparkle", head: 'کیفیت عکس را <span class="hl">بالا ببر</span>', sub: 'با ابزاری مثل <b class="em">Upscayl</b> عکس‌های کم‌کیفیت را واضح‌تر کن.' },
    { icon: "wand", head: 'حذف <span class="hl">پس‌زمینه</span>', sub: 'با <b class="em">remove.bg</b> در چند ثانیه پس‌زمینهٔ عکس را پاک کن.' },
    { icon: "bulb", head: 'ایده با <span class="hl">هوش مصنوعی</span>', sub: 'با <b class="em">ChatGPT</b> ده‌ها ایدهٔ محتوا و کپشن بگیر.' },
    { icon: "star", head: 'زیرنویس <span class="hl">خودکار</span>', sub: 'با <b class="em">CapCut یا Submagic</b> برای ویدیوهایت زیرنویس بساز.' },
    { icon: "mic", head: 'صدای <span class="hl">مصنوعی</span>', sub: 'با <b class="em">ElevenLabs</b> وویس‌اوور طبیعی بساز.' },
    { icon: "magnet", head: 'قلاب <span class="hl">سه‌ثانیه</span>', sub: 'سه ثانیهٔ اول را با یک <b class="em">جمله یا تصویر قوی</b> بساز.' },
    { icon: "trend", head: 'ترندها را <span class="hl">پیدا کن</span>', sub: 'از <b class="em">TikTok Creative Center</b> ترندها و صداهای داغ را ببین.' },
    { icon: "camera", head: 'نور خوب، <span class="hl">تصویر واضح</span>', sub: 'با <b class="em">نور طبیعی</b> و پس‌زمینهٔ ساده، تصویر حرفه‌ای‌تر شود.' },
    { icon: "wand", head: 'تصویر با <span class="hl">متن</span>', sub: 'با <b class="em">Ideogram</b> تصاویری با متن خوانا بساز.' },
    { icon: "calendar", head: 'زمان‌بندی <span class="hl">هوشمند</span>', sub: 'با <b class="em">Meta Business Suite</b> پست‌ها را از قبل زمان‌بندی کن.' },
    { icon: "layers", head: 'کاروسل <span class="hl">آموزشی</span>', sub: 'محتوای چندتصویری آموزشی، <b class="em">ذخیره و اشتراک</b> بیشتری می‌گیرد.' },
    { icon: "chart", head: 'تحلیل <span class="hl">عملکرد</span>', sub: 'با هوش مصنوعی بفهم <b class="em">کدام محتوا</b> بهتر جواب داده.' },
    { icon: "globe", head: 'مخاطب <span class="hl">جهانی</span>', sub: 'با هوش مصنوعی محتوا را <b class="em">به چند زبان</b> برگردان.' },
    { icon: "heart", head: 'پایان با <span class="hl">دعوت</span>', sub: 'آخر ویدیو یک <b class="em">سؤال</b> بپرس تا کامنت بگیری.' },
  ],
};

const BANKS = { ...BANKS_INLINE, ...ACTIVE_BANKS };

const HOOKS = {
  // Hook grammar: open loop / negation — a gap the viewer needs closed.
  // Line 1 is the question, line 2 is the promise. Badge = the payoff count.
  tiktok: [
    { badge: "۸ قابلیت", l1: "این قابلیت‌های", l2: "<span style=\"color:#22e0f0\">تیک‌تاک را بلد نیستی!</span>" },
    { badge: "۸ قابلیت", l1: "تیک‌تاک این‌ها را دارد،", l2: "<span style=\"color:#22e0f0\">تو استفاده نمی‌کنی</span>" },
    { badge: "۸ قابلیت", l1: "قابلیت‌های پنهان", l2: "<span style=\"color:#22e0f0\">تیک‌تاک</span>" },
  ],
  instagram: [
    { badge: "۸ قابلیت", l1: "این قابلیت اینستاگرام را", l2: "<span style=\"color:#ff8a3d\">می‌شناسی؟</span>" },
    { badge: "۸ قابلیت", l1: "اینستاگرام این‌ها را دارد،", l2: "<span style=\"color:#ff8a3d\">تو استفاده نمی‌کنی</span>" },
    { badge: "۸ قابلیت", l1: "قابلیت‌های پنهان", l2: "<span style=\"color:#ff8a3d\">اینستاگرام</span>" },
  ],
  tools: [
    { badge: "۸ ابزار", l1: "هنوز محتوا را", l2: "<span style=\"color:#22d3ee\">دستی می‌سازی؟</span>" },
    { badge: "۸ ابزار", l1: "این ابزارها", l2: "<span style=\"color:#22d3ee\">نصف وقتت را آزاد می‌کند</span>" },
    { badge: "۸ ابزار", l1: "این‌ها را بلد نیستی؟", l2: "<span style=\"color:#22d3ee\">وقتت را هدر می‌دهی</span>" },
  ],
  general: [
    { badge: "۸ اصل", l1: "چرا محتوایت", l2: "<span style=\"color:#22c55e\">دیده نمی‌شود؟</span>" },
    { badge: "۸ اصل", l1: "رشد واقعی با", l2: "<span style=\"color:#22c55e\">این اصل‌ها</span>" },
    { badge: "۸ اصل", l1: "این اشتباه‌ها", l2: "<span style=\"color:#22c55e\">جلوی رشدت را می‌گیرد</span>" },
  ],
  ai: [
    { badge: "۸ ترفند", l1: "هوش مصنوعی را", l2: "<span style=\"color:#22d3ee\">اشتباه استفاده می‌کنی</span>" },
    { badge: "۸ ترفند", l1: "با هوش مصنوعی", l2: "<span style=\"color:#22d3ee\">سریع‌تر بساز</span>" },
    { badge: "۸ ترفند", l1: "این‌ها را با AI", l2: "<span style=\"color:#22d3ee\">در چند دقیقه بساز</span>" },
  ],
};

const TITLES = {
  tiktok: [
    "🚀 رازهای وایرال‌شدن در تیک‌تاک | پیجت را منفجر کن!\n\n#تیک_تاک #وایرال #رشد_پیج #افغان_فالورز",
    "🔥 ترفندهای رشد تیک‌تاک که کسی به تو نمی‌گوید!\n\n#تیک_تاک #وایرال #رشد_پیج #افغان_فالورز",
    "🎬 این‌طوری در تیک‌تاک دیده شو! (نکته‌های طلایی)\n\n#تیک_تاک #وایرال #افغان_فالورز",
  ],
  instagram: [
    "📸 ترفندهای طلایی رشد اینستاگرام | فالوورهایت را چند برابر کن!\n\n#اینستاگرام #ریلز #رشد_پیج #افغان_فالورز",
    "⚡ رشد سریع اینستاگرام، کاملاً رایگان!\n\n#اینستاگرام #ریلز #رشد_پیج #افغان_فالورز",
    "🌟 این‌طوری پیج اینستاگرامت را قوی کن!\n\n#اینستاگرام #رشد_پیج #افغان_فالورز",
  ],
  general: [
    "🌐 اصول طلایی رشد در شبکه‌های اجتماعی\n\n#شبکه_های_اجتماعی #دیجیتال_مارکتینگ #رشد #افغان_فالورز",
    "🔑 کلیدهای رشد در شبکه‌های اجتماعی\n\n#شبکه_های_اجتماعی #رشد #افغان_فالورز",
    "📈 این‌طوری در شبکه‌های اجتماعی رشد کن!\n\n#شبکه_های_اجتماعی #دیجیتال_مارکتینگ #افغان_فالورز",
  ],
  ai: [
    "🤖 هوش مصنوعی برای شبکه‌های اجتماعی | سریع‌تر و حرفه‌ای‌تر بساز!\n\n#هوش_مصنوعی #AI #شبکه_های_اجتماعی #افغان_فالورز",
    "✨ با هوش مصنوعی محتوای پیجت را متحول کن!\n\n#هوش_مصنوعی #AI #رشد_پیج #افغان_فالورز",
    "⚙️ ترفندهای هوش مصنوعی برای تولید محتوا\n\n#هوش_مصنوعی #AI #دیجیتال_مارکتینگ #افغان_فالورز",
  ],
  tools: [
    "🛠️ ترفندها و ابزارهای هوش مصنوعی برای شبکه‌های اجتماعی\n\n#ابزار_هوش_مصنوعی #ترفند #تولید_محتوا #افغان_فالورز",
    "🤖 با این ابزارها محتوایت را حرفه‌ای کن!\n\n#هوش_مصنوعی #ابزار_رایگان #تولید_محتوا #افغان_فالورز",
    "✨ ابزارهایی که تولید محتوا را آسان می‌کنند\n\n#ترفند_محتوا #هوش_مصنوعی #افغان_فالورز",
  ],
};

const OUTRO = {
  tiktok: { tag: 'برای رشد واقعی در تیک‌تاک،<br/>ما را دنبال کن.', follow: "دنبال کنید +" },
  instagram: { tag: 'برای رشد پیج اینستاگرامت،<br/>ما را دنبال کن.', follow: "دنبال کنید +" },
  general: { tag: 'برای رشد در شبکه‌های اجتماعی،<br/>ما را دنبال کن.', follow: "دنبال کنید +" },
  ai: { tag: 'برای محتوای حرفه‌ای با هوش مصنوعی،<br/>ما را دنبال کن.', follow: "دنبال کنید +" },
  tools: { tag: 'برای محتوای حرفه‌ای‌تر،<br/>ما را دنبال کن.', follow: "دنبال کنید +" },
};

const META = {
  tiktok: "ترفندهای رشد در تیک‌تاک — GapMedia",
  instagram: "ترفندهای رشد در اینستاگرام — GapMedia",
  general: "اصول رشد در شبکه‌های اجتماعی — GapMedia",
  ai: "هوش مصنوعی برای شبکه‌های اجتماعی — GapMedia",
  tools: "ترفندها و ابزارهای هوش مصنوعی — GapMedia",
};

export const CATEGORIES = ["tiktok", "instagram", "tools"];
export const MUSIC_VARIANTS = 3;

// BPM of each music variant (must match music/synth.mjs VARIANTS)
const BPMS = { 1: 128, 2: 122, 3: 132 };
// Scene lengths are whole musical BEATS, so every cut lands on the beat.
// SHORT mode targets the 7-15s window where re-watch (and therefore reach) is highest.
const SHORT = process.env.LONG !== "1";
const BEATS_HOOK  = SHORT ? 8  : 8;
const BEATS_TIP   = SHORT ? 5  : 12;
const BEATS_OUTRO = SHORT ? 7  : 16;
const TIPS_PER_VIDEO = SHORT ? 4 : 8;

// Each network carries its own colours so a viewer recognises the platform
// instantly — while the editorial paper style stays consistent as our brand.
// History, so the next edit here doesn't repeat it: 2026-09-06 tried two
// different re-colourings in one day — first each platform's literal brand
// hue (TikTok black/cyan/pink, Instagram's logo gradient), then (a different,
// concurrent session) a dark cosmic/neon treatment built from two reference
// photos the user supplied there. User verdict on BOTH, back here the same
// day: worse than the original values below, still "بد" even with real
// reference photos behind the second attempt. The actual gap was never the
// hex values — a flat two-colour CSS gradient cannot read as "a photo of a
// neon room" no matter which two colours go in it; see the new depth/glow/
// grain layers in lib/build-ink.mjs for the part that was actually missing.
// Restored to the values confirmed working before any of that, then
// deliberately DARKENED further on 2026-09-07 ("پس زمینه اصل مایل به آبی"،
// "تیره تر"، "رنگ مختلط بیشتر") and applied to every lane.
//
// Reversed 2026-09-10: owner reported the (by-then-dark) backgrounds read as
// "خیلی تیره" and asked for "آبی روشن مایل به سفید" instead — the opposite of
// the 2026-09-07 direction. paper now sits near-white with each platform's
// own faint colour cast; lib/build-ink.mjs's paperIsDark switch (already
// built to support both — see its own comments) picks the light GROUND/
// vignette/highlight treatment automatically. pair is correspondingly
// darkened/saturated for legible text and badges on a light ground — the
// old light-on-dark values would wash out on white. `mix` (the bokeh
// circle colours) is left as is: those same hues read as soft pastel
// blobs over white at their existing low alpha, so they did not need
// changing for the background switch.
const INK = {
  // Instagram still reads as violet with a very faint rose accent, just
  // lightened: a near-white violet-tinted paper instead of plum-violet.
  instagram: { pair: ["#7C3AED", "#6D28D9"], paper: "#F4F0FC", tint: "rgba(124,58,237,.10)",
               mix: ["#A855F7", "#8B5CF6", "#7C3AED", "#C084FC", "#F9A8D4"] },
  // TikTok keeps its blue/cyan family, now a near-white sky-blue paper.
  tiktok:    { pair: ["#2563EB", "#0284C7"], paper: "#EAF4FC", tint: "rgba(37,99,235,.10)",
               mix: ["#3B82F6", "#22D3EE", "#2DD4BF", "#A855F7", "#E879F9"] },
  // tools = teal/emerald, ai = indigo/violet, general = green/blue — same
  // distinct hue families as before, each lightened to its own near-white cast.
  tools:     { pair: ["#0D9488", "#0E7490"], paper: "#EAFAF6", tint: "rgba(13,148,136,.10)",
               mix: ["#14B8A6", "#22D3EE", "#10B981", "#3B82F6", "#A855F7"] },
  general:   { pair: ["#16A34A", "#2563EB"], paper: "#EFFAF3", tint: "rgba(22,163,74,.10)",
               mix: ["#22C55E", "#10B981", "#3B82F6", "#22D3EE", "#A855F7"] },
  ai:        { pair: ["#6366F1", "#7C3AED"], paper: "#EEF0FD", tint: "rgba(99,102,241,.10)",
               mix: ["#8B5CF6", "#22D3EE", "#6366F1", "#A855F7", "#38BDF8"] },
};

// Two more looks per category, on the same brand direction as INK above but a
// different hue — so a feature that never sets its own design.ink still gets
// a background that varies with which specific feature it is, not just which
// of the five categories it happens to sit in (see inkForFeature() below).
// Lightened alongside INK above (2026-09-10) — same per-variant hue
// relationships, near-white paper instead of dark, pair darkened for
// contrast on a light ground.
const INK_VARIANTS = {
  instagram: [
    { pair: ["#8B5CF6", "#7C3AED"], paper: "#F6F1FC", tint: "rgba(139,92,246,.10)",
      mix: ["#8B5CF6", "#A855F7", "#6D28D9", "#C084FC", "#F9A8D4"] },
    { pair: ["#9333EA", "#4F46E5"], paper: "#F2ECFB", tint: "rgba(147,51,234,.10)",
      mix: ["#7C3AED", "#8B5CF6", "#6366F1", "#A855F7", "#FBCFE8"] },
  ],
  tiktok: [
    { pair: ["#3B82F6", "#0891B2"], paper: "#E9F5FC", tint: "rgba(8,145,178,.10)",
      mix: ["#3B82F6", "#06B6D4", "#2DD4BF", "#8B5CF6", "#F472B6"] },
    { pair: ["#4F46E5", "#16A34A"], paper: "#ECF3FB", tint: "rgba(79,70,229,.10)",
      mix: ["#6366F1", "#22D3EE", "#10B981", "#A855F7", "#EC4899"] },
  ],
  tools: [
    { pair: ["#0891B2", "#16A34A"], paper: "#E7F7FA", tint: "rgba(8,145,178,.10)",
      mix: ["#06B6D4", "#14B8A6", "#3B82F6", "#10B981", "#818CF8"] },
    { pair: ["#0D9488", "#2563EB"], paper: "#E9F8F4", tint: "rgba(13,148,136,.10)",
      mix: ["#14B8A6", "#22D3EE", "#0EA5E9", "#34D399", "#A855F7"] },
  ],
  general: [
    { pair: ["#22C55E", "#0284C7"], paper: "#EAFAF0", tint: "rgba(34,197,94,.10)",
      mix: ["#22C55E", "#14B8A6", "#3B82F6", "#22D3EE", "#818CF8"] },
    { pair: ["#16A34A", "#6366F1"], paper: "#E9F8EF", tint: "rgba(22,163,74,.10)",
      mix: ["#10B981", "#22C55E", "#6366F1", "#22D3EE", "#A855F7"] },
  ],
  ai: [
    { pair: ["#6366F1", "#0891B2"], paper: "#EEF0FD", tint: "rgba(99,102,241,.10)",
      mix: ["#6366F1", "#22D3EE", "#8B5CF6", "#38BDF8", "#A855F7"] },
    { pair: ["#9333EA", "#0891B2"], paper: "#F1EEFB", tint: "rgba(147,51,234,.10)",
      mix: ["#7C3AED", "#06B6D4", "#6366F1", "#A855F7", "#22D3EE"] },
  ],
};

// Deterministic on the feature's own id, not the render date: the same topic
// always looks the same across re-renders, but "collab" and "hidden-words" no
// longer share instagram's one fixed palette just because they share a category.
export function inkForFeature(cat, id) {
  const base = INK[cat] || INK.tools;
  const variants = INK_VARIANTS[cat];
  if (!variants || !variants.length) return base;
  const str = cat + "|" + id;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  const pool = [base, ...variants];
  return pool[(h >>> 0) % pool.length];
}

const KICKERS = {
  tiktok: "قابلیت تیک‌تاک",
  instagram: "قابلیت اینستاگرام",
  general: "اصل رشد",
  ai: "ترفند هوش مصنوعی",
  tools: "ابزار و ترفند",
};

// Alternate "special" scenes (counter / wrong-vs-right / phone) with the rotating
// skins so ANY 8-tip daily window is structurally mixed, never a run of look-alikes.
function interleaveKinds(bank) {
  const isSpecial = (t) => !!(t.stat || t.bad || t.phone);
  const special = bank.filter(isSpecial);
  const plain = bank.filter((t) => !isSpecial(t));
  const out = [];
  let i = 0, j = 0;
  while (out.length < bank.length) {
    if (j < plain.length) out.push(plain[j++]);
    if (i < special.length) out.push(special[i++]);
  }
  return out;
}

const FA = (n) => String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
// the promise on the badge must match how many items actually ship in the cut
function badgeFor(hook, count) {
  const noun = String(hook.badge || "").replace(/^[۰-۹d]+s*/, "") || "قابلیت";
  return FA(count) + " " + noun.trim();
}

// distinct per category, per feature, per day -> a track no other video shares
function musicSeedFor(cat, id, dayIndex) {
  const str = cat + "|" + id + "|" + dayIndex;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 100000;
}


// ---- opening question -------------------------------------------------
// A fallback must still lead with the viewer's outcome. It must never ship the
// old "let me show you a feature" wording: nobody stops scrolling for a menu,
// but they do stop for a clearly relevant reach / discovery outcome.
const APP_LABEL = { instagram: "اینستاگرام", tiktok: "تیک‌تاک" };
const ASKS_APP = [
  (a) => `آیا می‌خواهید در ${a} بیشتر دیده شوید؟`,
  (a) => `چطور محتوایت در ${a} به مخاطب تازه برسد؟`,
  (a) => `آیا این مسیر ${a} می‌تواند View بیشتری برایت بسازد؟`,
  (a) => `می‌خواهی برای ویدیویت در ${a} مخاطب تازه پیدا کنی؟`,
  (a) => `چطور در ${a} یک ایده را قابل Share کنی؟`,
  (a) => `آیا آماده‌ای View و تعامل ${a} را تست کنی؟`,
];
const ASKS_TOOL = [
  () => "می‌خواهید ویدیوی حرفه‌ای‌تر بسازید تا بیشتر دیده شود؟",
  () => "چطور بدون تجهیزات گران، محتوای قابل‌انتشار بسازیم؟",
  () => "آیا این اپ می‌تواند کیفیت محتوایت را بهتر کند؟",
  () => "می‌خواهید برای ساخت محتوا وقت کمتر و ایدهٔ بیشتر داشته باشید؟",
  () => "چطور یک Edit بهتر، شانس تماشای ویدیویت را بالا ببرد؟",
  () => "آیا یک اپ می‌تواند ظاهر محتوایت را حرفه‌ای‌تر کند؟",
];
// stable per (feature, day) so the same feature does not always get the same
// question, and two videos on one day never open with the same sentence
function askFor(cat, featureId, dayIndex) {
  const app = APP_LABEL[cat];
  const bank = app ? ASKS_APP : ASKS_TOOL;
  // stride 5 is coprime with the bank size, so the opening question walks the
  // whole set day by day; adding the category index guarantees the three videos
  // released on one day never open with the same sentence.
  const i = (dayIndex * 5 + CATEGORIES.indexOf(cat)) % bank.length;
  return bank[i](app);
}

// Older feature records still carry the former channel name in their metadata.
// Apply the current tutorial-channel identity at assembly time instead of
// mutating research/content records.
function currentBrandText(value) {
  return String(value || "")
    .replaceAll("افغان فالورز", "GapMedia")
    .replaceAll("افغان_فالورز", "GapMedia")
    .replaceAll("AfghanFollowers", "GapMedia")
    .replaceAll("AfghanFollower", "GapMedia");
}

// Keep the on-screen and spoken hook equally natural. The TTS voice stretches
// «ریلز» at the beginning of a sentence, so use a benefit-first pain point
// instead and keep the answer for the later slides.
function currentHook(feature) {
  const hook = { ...(feature.hook || {}) };
  if (feature.id === "saved-replies") {
    hook.ask = "دایرکت فروش می‌ماند؛ مشتری می‌رود. چهار مرحله را ببین.";
    hook.l1 = "دایرکت فروش می ماند،";
    hook.l2 = "مشتری می رود";
  }
  if (feature.id === "ig-insights-retention") {
    hook.ask = "افت ویو از یک ثانیه شروع می‌شود؛ نقطه‌اش را پیدا کن.";
    hook.l1 = "ویوت یک دفعه";
    hook.l2 = "می ریزد";
  }
  return hook;
}

function buildFeaturePack(cat, dayIndex, variant, bpm, beat, forced, avoidIds = new Set()) {
  // aiFeatureFor was called here without being imported, which crashed the
  // build; the fix that landed on main just stopped calling it instead of
  // importing it, which silently dropped the "tools" slot back to the same
  // rotation every other category uses — test-daily-program.mjs exists
  // specifically to catch the third daily topic not being a real AI
  // workflow, which is exactly what that regressed to.
  // Skip anything already published (publishedFeatureIds) plus anything the
  // caller has already tried and rejected this run (avoidIds, e.g. a feature
  // whose Visual QC just failed) so the rotation moves on instead of landing
  // on the same id again.
  const exclude = new Set([...publishedFeatureIds(), ...avoidIds]);
  const staleness = publishedAtById();
  const f = forced || (cat === "tools" ? aiFeatureFor(dayIndex, exclude, staleness) : featureFor(cat, dayIndex, exclude, staleness));
  if (!f) return null;
  const steps = f.steps.slice(0, TIPS_PER_VIDEO);
  const seed = musicSeedFor(cat, f.id, dayIndex);
  // A video's identity should come from its own subject, not from which of the
  // three categories it happens to sit in. Until now a feature could not say
  // "my colours are different" — palette, rhythm and art set were all read from
  // the category, which is the structural reason three videos a day looked alike
  // however differently they were written. `design` is where a feature says it.
  const design = f.design || {};
  // the score's identity is read from what this video teaches, same as its art
  const mood = design.mood
    || moodFor({ id: f.id, feature: f.name, hook: f.hook, tips: steps.map((s) => ({ head: s.text })) });
  // "slow" gives a subject that needs weight — money, a contract, a warning —
  // longer cards, by asking the beat planner for a longer video at the same
  // number of scenes.
  const RHYTHM = { slow: 1.35, calm: 1.15, default: 1, brisk: 0.85 };
  const pace = RHYTHM[design.rhythm] || 1;
  const plan = beatPlan(seed, Math.round((SHORT ? 16 : 56) * pace), steps.length, mood);
  const sty = styleFor(seed, mood);
  const hook = currentHook(f);
  return {
    id: f.id,
    platform: cat,
    theme: THEMES[cat],
    title: currentBrandText(f.title),
    feature: f.name,
    // Carried through explicitly. buildFeaturePack() names every field it
    // copies, so a feature-level key nothing here lists is silently dropped —
    // which is how "green-screen"'s searchTopic reached lib/auto-image.mjs as
    // undefined on the first attempt at this fix, and why it is verified
    // against a real pack rather than assumed. Read only by the image search;
    // never rendered.
    searchTopic: f.searchTopic || null,
    hookPhoto: f.hookPhoto || verifiedScreenFor(f.id) || null,
    hook: { badge: f.name, ask: hook.ask || (() => { console.error(`   ⚠ ${f.id} has no benefit hook — using a weak fallback`); return askFor(cat, f.id, dayIndex); })(), l1: hook.l1, l2: hook.l2, benefit: f.benefit || null },
    tgTitle: currentBrandText(f.tgTitle),
    kicker: f.kicker || KICKERS[cat] || "قابلیت",
    ink: design.ink || inkForFeature(cat, f.id),
    design,
    // topic-plan.mjs's catalogueTopics() has set this on every entry since it
    // was written, but nothing downstream ever read it — the mascot character
    // rendered unconditionally in lib/build-ink.mjs regardless. Wiring it
    // through here is what actually makes the flag do anything.
    noCharacters: !!f.noCharacters,
    layoutSeed: 0,
    // each step is a scene: numbered, one short instruction, one illustration
    // A tutorial is a route through the app. Preserve a distinct, explicit
    // screen for every step: a changing iPhone page is clearer than replacing
    // later taps with decorative artwork.
    tips: steps.map((s, i) => ({
      icon: s.icon, step: i + 1, head: s.text, ui: s.ui, path: s.path,
      screen: s.screen, brand: s.brand, photo: s.photo, photoFocus: s.photoFocus, photoAlt: s.photoAlt,
      visualEvidence: s.visualEvidence, video: s.video, videoStart: s.videoStart,
    })),
    payoff: f.payoff,
    outroAsk: f.outroAsk || null,
    source: f.source || null,
    outro: OUTRO[cat],
    bpm: sty.bpm,
    musicStyle: sty.style,
    mood,
    musicVariant: seed,
    musicOutroBars: Math.max(2, Math.round(BEATS_OUTRO / 4)),
    duration: plan.duration,
    hookDuration: +(plan.hook * plan.beat).toFixed(3),
    outroDuration: +(plan.outro * plan.beat).toFixed(3),
    beat: +plan.beat.toFixed(4),
    music: `music/auto/${cat}-${f.id}-s.m4a`,
  };
}

function buildPack(cat, dayIndex, avoidIds = new Set()) {
  const variantEarly = ((dayIndex + CATEGORIES.indexOf(cat)) % MUSIC_VARIANTS) + 1;
  if (SHORT) {
    const fp = buildFeaturePack(cat, dayIndex, variantEarly, BPMS[variantEarly], 60 / BPMS[variantEarly], null, avoidIds);
    if (fp) return fp;
  }
  const bank = interleaveKinds(BANKS[cat]);
  const N = bank.length;
  // stride 7 (coprime with 16) → 16 distinct daily windows, and only ONE tip
  // overlaps between consecutive days, so each day reads as fresh content.
  const start = (dayIndex * 7) % N;
  const tips = Array.from({ length: TIPS_PER_VIDEO }, (_, i) => bank[(start + i) % N]);
  const variant = ((dayIndex + CATEGORIES.indexOf(cat)) % MUSIC_VARIANTS) + 1;
  const bpm = BPMS[variant];
  const beat = 60 / bpm;
  const totalBeats = BEATS_HOOK + TIPS_PER_VIDEO * BEATS_TIP + BEATS_OUTRO;
  return {
    id: cat,
    platform: cat,
    theme: THEMES[cat],
    title: META[cat],
    hook: (function(){ var h = HOOKS[cat][dayIndex % HOOKS[cat].length];
            return Object.assign({}, h, { badge: badgeFor(h, TIPS_PER_VIDEO) }); })(),
    tgTitle: TITLES[cat][dayIndex % TITLES[cat].length],
    kicker: KICKERS[cat] || "نکته",
    // rotates which layout each scene uses, and shifts it day to day
    layoutSeed: (dayIndex + CATEGORIES.indexOf(cat) * 2) % 5,
    tips,
    outro: OUTRO[cat],
    // --- beat-synced timing: every scene is a whole number of bars ---
    bpm,
    musicVariant: musicSeedFor(cat, "long", dayIndex),
    musicOutroBars: Math.max(2, Math.round(BEATS_OUTRO / 4)),
    duration: +(totalBeats * beat).toFixed(3),
    hookDuration: +(BEATS_HOOK * beat).toFixed(3),
    outroDuration: +(BEATS_OUTRO * beat).toFixed(3),
    beat: +beat.toFixed(4),
    music: `music/auto/${cat}-long.m4a`,
  };
}

// Build the pack for one named feature, regardless of whose turn it is. Lets a
// newly researched update ship the day it lands instead of waiting out the
// rotation. dayIndex still seeds the music, so the score stays unique.
export function packForFeature(id, date = new Date(), generated = null) {
  // One-off items written by custom-content.mjs. The generator declares its
  // category; a user-supplied tutorial without one defaults to "tools".
  if (generated) {
    const di = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
    return buildFeaturePack(generated.category || "tools", di, 1, 120, 0.5, generated);
  }
  const hit = featureById(id);
  if (!hit) return null;
  const dayIndex = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  );
  return buildFeaturePack(hit.cat, dayIndex, 1, 120, 0.5, hit.feature);
}

export function packsForDate(date = new Date(), avoidIds = new Set()) {
  const dayIndex = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  );
  const out = { dayIndex };
  for (const c of CATEGORIES) out[c] = buildPack(c, dayIndex, avoidIds);
  return out;
}

// Editorial subject and delivery channel are intentionally separate. A helpful
// AI workflow is one topic, not two recycled ideas, but it needs two native
// packages when it is published to TikTok and Instagram. The first two daily
// slots remain platform-led tutorials; the third is a broader AI/useful-work
// topic whose value does not depend on either platform.
export const DAILY_CONTENT_SLOTS = Object.freeze([
  Object.freeze({ slot: "tiktok", sourceCategory: "tiktok", deliveryChannel: "tiktok", role: "discovery" }),
  Object.freeze({ slot: "instagram", sourceCategory: "instagram", deliveryChannel: "instagram", role: "community" }),
  Object.freeze({ slot: "ai-tiktok", sourceCategory: "tools", deliveryChannel: "tiktok", role: "ai", mirrorOf: null }),
  Object.freeze({ slot: "ai-instagram", sourceCategory: "tools", deliveryChannel: "instagram", role: "ai", mirrorOf: "ai-tiktok" }),
]);

function packForDelivery(base, spec) {
  const isAiMirror = spec.sourceCategory === "tools";
  const channel = spec.deliveryChannel;
  return {
    ...base,
    // Preserve the subject (id/tips/source) while adapting the visual package,
    // first-frame context and CTA to the destination channel.
    platform: channel,
    sourceCategory: spec.sourceCategory,
    deliverySlot: spec.slot,
    deliveryRole: spec.role,
    mirrorOf: spec.mirrorOf,
    theme: THEMES[channel],
    // This used to hard-reset every delivered video to the single fixed
    // INK[channel] value, throwing away the per-feature variant buildFeaturePack
    // had already picked via inkForFeature() — so every tiktok delivery (and
    // every instagram delivery) always rendered the exact same background
    // regardless of topic, which is the bug behind "background is always the
    // same colour" (confirmed live 2026-09-06). inkForFeature(channel, id)
    // keeps the destination platform's own recognisable colour family (still
    // picks only from INK[channel] + INK_VARIANTS[channel]) while varying by
    // the actual feature id, same as the non-delivered pack already did.
    ink: inkForFeature(channel, base.id),
    kicker: isAiMirror
      ? (channel === "tiktok" ? "AI کاربردی برای ویدیو" : "AI کاربردی برای ریلز")
      : base.kicker,
    outro: isAiMirror ? OUTRO.tools : base.outro,
    layoutSeed: (base.layoutSeed + (channel === "instagram" ? 3 : 1)) % 5,
    music: `music/auto/${spec.slot}-${base.id}-s.m4a`,
  };
}

/** The daily programme: three topics, delivered as four platform-native files. */
export function dailyDeliveriesForDate(date = new Date(), avoidIds = new Set()) {
  const selected = packsForDate(date, avoidIds);
  return DAILY_CONTENT_SLOTS.map((spec) => ({
    ...spec,
    pack: packForDelivery(selected[spec.sourceCategory], spec),
  }));
}

// Standalone 60s educational explainer: "What is AI?" (not the social-media tips
// above — this teaches the fundamentals of artificial intelligence itself).
// Reuses THEMES.ai styling and the same buildHTML() builder via a custom pack.
export function aiEducationPack() {
  return {
    id: "ai-education",
    platform: "ai-education",
    theme: THEMES.ai,
    title: "هوش مصنوعی چیست؟ — آموزش در ۶۰ ثانیه",
    kicker: "مفهوم کلیدی",
    hook: {
      l1: 'هوش مصنوعی <span style="color:#22d3ee">AI</span> چیست؟',
      l2: 'و چطور یاد می‌گیرد؟',
    },
    tgTitle: "🤖 هوش مصنوعی چیست؟ | آموزش ساده در ۶۰ ثانیه\n\n#هوش_مصنوعی #AI #آموزش #افغان_فالورز",
    tips: [
      { icon: "chip", head: 'هوش مصنوعی <span class="hl">چیست؟</span>', sub: 'هوش مصنوعی یعنی ماشینی که می‌تواند <b class="em">یاد بگیرد، فکر کند و تصمیم بگیرد</b> — مثل یک مغز دیجیتال.' },
      { icon: "bulb", head: 'یادگیری از <span class="hl">داده‌ها</span>', sub: 'AI مثل یک دانش‌آموز است؛ با دیدن <b class="em">هزاران مثال و داده</b>، الگوها را پیدا می‌کند.' },
      { icon: "refresh", head: '<span class="hl">یادگیری ماشینی</span>', sub: 'در یادگیری ماشینی، برنامه به‌جای دستورهای ثابت، <b class="em">خودش از روی داده</b> یاد می‌گیرد.' },
      { icon: "layers", head: 'شبکه‌های <span class="hl">عصبی</span>', sub: 'شبکه‌های عصبی از <b class="em">ساختار مغز انسان</b> الهام گرفته‌اند؛ نورون‌ها، لایه‌ها و وزن‌ها.' },
      { icon: "sparkle", head: 'یادگیری <span class="hl">عمیق</span>', sub: 'یادگیری عمیق با <b class="em">لایه‌های بسیار زیاد</b>، تصویر، صدا و متن را می‌فهمد.' },
      { icon: "globe", head: 'AI در <span class="hl">زندگی روزمره</span>', sub: 'از <b class="em">دستیار صوتی و ترجمه</b> تا پیشنهاد فیلم و تشخیص عکس؛ هوش مصنوعی همه‌جا هست.' },
      { icon: "target", head: 'محدود یا <span class="hl">عمومی؟</span>', sub: 'AI امروزی <b class="em">محدود</b> است؛ هوش عمومیِ هم‌سطح انسان هنوز ساخته نشده.' },
      { icon: "heart", head: 'آینده و <span class="hl">اخلاق</span>', sub: 'AI آینده را می‌سازد؛ <b class="em">استفاده مسئولانه و انسانی</b> مهم‌ترین مهارت است.' },
    ],
    outro: {
      tag: 'برای آموزش‌های بیشتر درباره AI،<br/>ما را دنبال کن.',
      follow: "دنبال کنید +",
    },
    music: "music/bed-60s-v1.m4a",
    voice: { name: "fa-IR-FaridNeural", rate: "+0%" },
    // Verbatim Persian voiceover, in timeline order: hook, 8 sections, outro.
    narration: [
      "هوش مصنوعی چیست و چطور یاد می‌گیرد؟ بیا با هم ببینیم.",
      "هوش مصنوعی یعنی ماشینی که می‌تواند یاد بگیرد، فکر کند و تصمیم بگیرد؛ مثل یک مغز دیجیتال.",
      "هوش مصنوعی مثل یک دانش‌آموز است؛ با دیدن هزاران مثال و داده، الگوها را پیدا می‌کند.",
      "در یادگیری ماشینی، برنامه به‌جای دستورهای ثابت، خودش از روی داده یاد می‌گیرد.",
      "شبکه‌های عصبی از ساختار مغز انسان الهام گرفته‌اند؛ با نورون‌ها، لایه‌ها و وزن‌ها.",
      "یادگیری عمیق با لایه‌های بسیار زیاد، تصویر، صدا و متن را می‌فهمد.",
      "از دستیار صوتی و ترجمه تا پیشنهاد فیلم و تشخیص عکس؛ هوش مصنوعی همه‌جا هست.",
      "هوش مصنوعی امروزی محدود است؛ هوش عمومیِ هم‌سطح انسان هنوز ساخته نشده.",
      "هوش مصنوعی آینده را می‌سازد؛ استفاده مسئولانه و انسانی مهم‌ترین مهارت است.",
      "برای آموزش‌های بیشتر درباره هوش مصنوعی، ما را دنبال کن.",
    ],
  };
}

// ----------------------------------------------------------------------
// Faceless tool tier-list — the only content this composition builds now.
// No character on screen, matching the reference format ("The Definitive
// Ranking" style): big Persian captions and a tool name popping into a
// pill carry the video. The narrator IS heard — see `narration` below.
//
// A small, real, well-known tool per category — not a ranking of who is
// "best": nothing here is scored, so the list never claims one tool beat
// another, only that it is a common choice for that use.
// capabilities: what these apps actually let you do — well-known, generic
// facts about each mainstream product, not a claim about this project's own
// data. "سه اپ معرفی می‌کنی، فقط یک قابلیتش را می‌گویی، جذاب نیست" — one
// clause for three apps gave no real reason to pick any of them. Two per
// category (not more — each one still has to fit its slot at a natural,
// unhurried pace; see PER_SLIDE).
const TOOL_CATEGORIES = [
  { match: /چت|گفتگو|مکالمه/, nameFa: "برای چت معمولی", tools: ["ChatGPT", "Claude", "Gemini"], capabilities: ["سوال بپرسی", "خلاصه کنی"] },
  { match: /تحقیق|پژوهش|جست ?و ?جو/, nameFa: "برای تحقیق", tools: ["Perplexity", "Claude", "ChatGPT"], capabilities: ["منبع پیدا کنی", "جواب دقیق بگیری"] },
  { match: /تصویر|عکس/, nameFa: "برای ساخت تصویر", tools: ["Midjourney", "Ideogram", "DALL·E"], capabilities: ["عکس بسازی", "پوستر طراحی کنی"] },
  { match: /ویدیو|فیلم/, nameFa: "برای ساخت ویدیو", tools: ["Sora", "Kling AI", "Higgsfield"], capabilities: ["ویدیو بسازی", "افکت بگذاری"] },
  { match: /صدا|موسیقی|آهنگ/, nameFa: "برای صدا و موسیقی", tools: ["Suno", "ElevenLabs"], capabilities: ["آهنگ بسازی", "صدا تولید کنی"] },
  { match: /نوشتن|متن|کپشن/, nameFa: "برای نوشتن متن", tools: ["Claude", "ChatGPT", "Gemini"], capabilities: ["کپشن بنویسی", "متن تبلیغاتی بسازی"] },
  { match: /کد|برنامه ?نویسی/, nameFa: "برای برنامه‌نویسی", tools: ["Claude", "ChatGPT"], capabilities: ["کد بنویسی", "باگ رفع کنی"] },
];

// Two things were tried and rejected, in order:
//   1. Raw Latin passthrough — reported as "unknown language".
//   2. A Persian phonetic respelling ("چت جی پی تی" for ChatGPT) — rejected
//      on listening, "همه‌شان بد و کاملا بد است" — with the explicit request
//      to read the real English name instead.
// The correct mechanism for exactly this — an SSML <lang> switch to en-US
// for one run of text, mid-sentence, then back to the outer Persian voice —
// exists on paper but not on this endpoint: tested directly, both <lang> and
// a nested <voice> switch return 0 bytes of audio with no error from
// speech.platform.bing.com. This is the free consumer "Read Aloud" surface
// edge-tts.mjs talks to, not the full Azure Cognitive Services Speech API,
// and its SSML support is plain text only — confirmed by testing, not
// assumed. A real language switch would need the paid Azure Speech REST API
// with a subscription key, which is a different integration, not this one.
//
// So option 1 (raw Latin) is what ships for brand names — the rest of this
// function applies the same rule set lib/pronounce.mjs's minimaxSpeakable()
// already applies for the daily pipeline. Those rules are about Persian
// phonology and breath placement, not about which engine reads the result,
// so breathe() itself is imported and reused rather than re-implemented:
// hand-copying it once already drifted from the tested version (this
// function used to place commas manually; checked against breathe() and it
// happened to match, but "happened to" is not the same guarantee "reuses
// the tested function" gives for the next narration line written).
//
// Digits are already words at authoring time (persianNumberWords, in
// tierListPack() above) and there are no possessive enclitics or غ/ق words
// in this pack's narration, so those tables have nothing to do here yet —
// they apply the moment a line needs them.
//
// Whether it reads acceptably is still for the user to say; nothing here
// can confirm it without the ability to listen (Whisper is blocked on this
// machine — the OS's Application Control policy blocks a numba DLL, and no
// cloud transcription key is configured in .env).
const NBSP = " ";
// Multi-word English labels this pack can say — protected the same way
// minimaxSpeakable() protects "Add media"/"Trial reel insights": joined so
// breathe() counts it as one token and can never place a breath inside it.
const PROTECTED_LABELS = [...new Set(TOOL_CATEGORIES.flatMap((c) => c.tools))]
  .filter((n) => n.includes(" "))
  .sort((a, b) => b.length - a.length);

export function spokenSSML(text) {
  let out = String(text || "")
    .replace(/\s*[–—]\s*/g, "، ")
    .replace(/؛/g, "،");
  for (const label of PROTECTED_LABELS) {
    out = out.split(label).join(label.split(" ").join(NBSP));
  }
  out = breathe(out);
  return out.split(NBSP).join(" ");
}

/** Whether free text is asking for a tool tier-list rather than a normal topic. */
export function isTierListRequest(text) {
  return /بهترین (?:هوش مصنوعی|ابزار)|ابزار(?:های)? هوش مصنوعی/.test(String(text || ""));
}

/**
 * Builds a tier-list pack from free Persian text like:
 * «بهترین هوش مصنوعی برای چت معمولی، برای تحقیق، برای ساخت تصویر، برای ساخت ویدیو»
 *
 * Each «برای …» clause becomes one slide. A clause matching no known
 * category is dropped rather than guessed — inventing tools for a category
 * nobody curated would be worse than a shorter video.
 */
export function tierListPack(inputText) {
  const clauses = String(inputText || "")
    .split(/برای/).slice(1).map((s) => s.replace(/[،,؛.!؟]+$/, "").trim()).filter(Boolean);
  const categories = [];
  const seen = new Set();
  for (const clause of clauses) {
    const cat = TOOL_CATEGORIES.find((c) => c.match.test(clause));
    if (!cat || seen.has(cat.nameFa)) continue;
    seen.add(cat.nameFa);
    categories.push({ nameFa: cat.nameFa, tools: cat.tools, capabilities: cat.capabilities });
  }
  if (!categories.length) {
    throw new Error("هیچ دستهٔ شناخته‌شده‌ای در متن پیدا نشد — مثال درست: «بهترین هوش مصنوعی برای چت، برای تحقیق»");
  }

  // Named DUR to avoid shadowing the module-level OUTRO text lookup used below.
  // PER_SLIDE widened again, 7 to 8.5 — a second capability clause per
  // category made the line long enough to risk the 1.28x cap at 7s; widen
  // first, then verify against a real MiniMax synthesis before shipping
  // rather than guess a number that happens to work on paper.
  const HOOK_DUR = 4, OUTRO_DUR = 4, PER_SLIDE = 8.5;
  return {
    id: "tier-list",
    platform: "tools",
    tierList: true,
    theme: THEMES.ai,
    title: "بهترین اپلیکیشن هوش مصنوعی برای هر کار",
    kicker: "رتبه‌بندی اپلیکیشن‌ها",
    hook: {
      badge: "🔥 رازهای AI",
      // On-screen hook, in Persian throughout this time (not "ChatGPT" in
      // Latin) — plain white type with two highlighted words, no per-phrase
      // shake or scale. The count is computed from the real pack contents —
      // a 3-category input must not claim "۹ اپلیکیشن" when it only has 6.
      // "بجای ابزار باید اپلیکیشن بگویی" — these are apps a viewer installs,
      // not abstract "tools".
      parts: [
        { text: "چت جی پی تی تموم شد؟ ", cls: "tier-part-plain" },
        { text: `${FA(categories.reduce((n, c) => n + c.tools.length, 0))} اپلیکیشن`, cls: "tier-part-purple" },
        { text: " بهتر ", cls: "tier-part-plain" },
        { text: "رایگان", cls: "tier-part-green" },
      ],
      tail: "",
      // "قلاب را ... انیمیشنی بساز نه یک متن" — real tool marks floating
      // around the phone instead of the hook being typed text alone. Drawn
      // from this pack's own selected categories (one tool each, capped at
      // 4 so they stay readable), never invented: what shows here is what
      // the following slides actually cover, not a curated "best of"
      // claim about products this project has no standing to rank.
      previewTools: categories.map((c) => c.tools[0]).slice(0, 4),
    },
    tgTitle: "🏆 بهترین اپلیکیشن هوش مصنوعی برای هر کار\n\n#هوش_مصنوعی #اپلیکیشن #GapMedia #viral",
    // CONTENT-PRODUCTION-RULES.md: "موسیقی برای هر ویدیو جدا ساخته می‌شود"
    // (music is built separately for each video) — a reused generic bed has
    // no relationship to THIS video's own cut points, which is what made the
    // previous render feel unsynced. render-tiktok-remake.mjs generates the
    // real file at pack.music via music/make-one.mjs, matched to pack.duration
    // exactly, with a beat accent placed at every category cut.
    music: "music/auto/tier-list.m4a",
    mood: "craft", // clean/modern — this video is about creation tools
    musicVariant: 2,
    musicOutroBars: 4,
    outro: OUTRO.tools,
    duration: HOOK_DUR + OUTRO_DUR + categories.length * PER_SLIDE,
    hookDuration: HOOK_DUR,
    outroDuration: OUTRO_DUR,
    tips: categories,
    // Single narrator, no dialogue field — voiceForLine() in
    // render-tiktok-remake.mjs falls back to this for every line.
    // "آهسته... آرام و با احساس خوش" — a calmer pace. There is slack in most
    // slots (line 6 needed no compression at all at +0%) to absorb a slower
    // base rate without the post-hoc atempo speedup fighting it back to the
    // same pace it started at.
    voice: { name: "fa-IR-DilaraNeural", rate: "-5%" },
    // A tool name has no established Persian spoken form the way «تیک‌تاک»
    // does, so it is left in Latin inside the Persian sentence — the
    // verified-by-listening-test treatment in the persian-tts-reading skill
    // for a word with no Persian pronunciation on record (foreign-words.md,
    // "Type C"). Sentences are generated from the same category/tool data
    // already on screen, not written separately — nothing here can drift
    // out of sync with what the viewer is looking at.
    narration: [
      // HOOK — spoken register, softened from the on-screen "ChatGPT تمام
      // شد": said aloud, flat and declarative, that reads as a claim rather
      // than a headline — and ChatGPT is itself one of the tools recommended
      // two sentences later, which the spoken line should not contradict.
      // unwritten-sounds.md: digits are never sent to the engine ("۲۰۰" came
      // back "دو هزار") — the on-screen card keeps them, the spoken copy is
      // converted to words. The semicolon is also written-only: VOICE-LOG.md
      // already found it isn't reliably read as a pause, converted to a
      // comma the same way the daily pipeline's dash/semicolon fix does.
      // "قوی‌ترن" (ZWNJ+تر immediately followed by the enclitic "ن", no
      // boundary) falls outside JOIN_AFTER's suffix table and reads as two
      // broken words — "هستن" as its own word carries the same colloquial
      // predicate without hitting that gap.
      // Trimmed from "... این N تا رایگان و بسیار قوی هستن." — even after
      // dropping "بسیار" this line still ran past the slot at the 1.28x
      // compression cap (measured: needed 1.41x), and atempo compresses the
      // breath pauses along with the words, not just the words — heard as
      // "خیلی تند... تنفس در بین کلمات نیست". Dropping "این" and folding
      // "قوی هستن" into the single-word colloquial predicate "قوین" (same
      // pattern as "خوبن" elsewhere in this file) got it under the cap —
      // measured across a few MiniMax calls at 3.82-4.52s in a 4.00s slot
      // (needs 1.06x-1.26x; MiniMax's own timing varies run to run, but it
      // stayed under the 1.28x cap every time measured) without changing
      // the meaning.
      `ChatGPT کافی نیست، ${persianNumberWords(categories.reduce((n, c) => n + c.tools.length, 0))} تا رایگان و قوین.`,
      // breath-and-rhythm.md: a breath after one or two phrases, never a run
      // of three names in one push. Each tool gets its own comma before the
      // predicate — including the comma right after the last (English) tool
      // name and before "می‌تونی": without it, MiniMax carried the English
      // reading straight into the next Persian word with no reset point,
      // reported as an English word right after an English word ("مثل
      // عالی" — from the earlier "و ChatGPT عالین." draft, which had no
      // punctuation between them). The comma is also the one the earlier
      // "گزینه‌های خوبن." tail already had before it was trimmed away for
      // length — restored here, now doing double duty as the language
      // boundary and the breath-and-rhythm break-before-predicate point.
      //
      // The single-word rotating closers ("خوبن"/"عالین"/"بهترن") that used
      // to fill this slot are gone: they only varied the last word, and a
      // bare "it's good" told the viewer nothing about the apps themselves —
      // "معرفی ... کارکردها را نمی‌گوید". Each category now closes on two
      // capability clauses instead of one — "سه اپ معرفی می‌کنی، فقط یک
      // قابلیتش را می‌گویی" — which is naturally different per category (no
      // rotation needed) and gives the viewer real reasons to pick one.
      ...categories.map((c) => {
        const last = c.tools[c.tools.length - 1];
        const rest = c.tools.slice(0, -1).join("، ");
        const [cap1, cap2] = c.capabilities;
        return `${c.nameFa}، ${rest ? rest + "، و " : ""}${last}، می‌تونی ${cap1} و ${cap2}.`;
      }),
      // "حرفه‌ای‌تر" chains two ZWNJ suffixes JOIN_AFTER doesn't cover and
      // reads as "حرفه ایتر" — reworded to avoid the pattern entirely.
      "برای دیدن اپلیکیشن‌های بیشتر، ما رو دنبال کن.",
    ],
  };
}

export { BANKS, THEMES };
