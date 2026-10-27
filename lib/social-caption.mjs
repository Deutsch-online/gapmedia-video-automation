// Social captions for German A1 lessons and the Die Nachbarn series.
// Deterministic: lesson data and local lookups only. No network, no clock, no randomness.
//
// Three lines, exactly:
//   Deutsch lernen leicht gemacht: <German topic>
//   <one short funny Persian/Dari line, at most one emoji>
//   #DeutschLeichtGemacht #DeutschLernen #DeutschFürAnfänger <lesson tag> <Persian tag>
import { EASY_TEXT } from "./easy-titles.mjs";

export const FIXED_HASHTAGS = ["#DeutschLeichtGemacht", "#DeutschLernen", "#DeutschFürAnfänger"];
export const PERSIAN_HASHTAGS = ["#آلمانی_به_دری", "#آموزش_زبان_آلمانی"];
const LESSON_GERMAN_TAGS = ["#Alltagsdeutsch", "#PraktischesDeutsch"];
const BANNED = /#(viral|fyp|learngerman|learn german|foryou|for you|shorts)\b/i;
const EMOJI = /\p{Extended_Pictographic}/gu;

const GENERIC_FUNNY = "این درس را که یاد بگیری، یک جملهٔ روزمره دیگر در گلویت گیر نمی‌کند! 🙂";

// One line per known unit. A unit may also carry captionFa / funnyFa / socialFa;
// that lesson-data line wins over this table.
const FUNNY_BY_ID = {
  "a1-01-greetings": "سلام را که بلد باشی، اولین برخورد دیگر با اشاره تمام نمی‌شود! 👋",
  "a1-02-formal-informal": "تو و شما را که قاطی نکنی، غریبه دیگر اخم نمی‌کند! 🙂",
  "a1-03-politeness": "ببخشید و ممنون را که بگویی، صف نانوایی مهربان‌تر می‌شود! 🙏",
  "a1-04-numbers-1": "تا پنج را که بشماری، سفارش قهوه دیگر با انگشت نیست! ☕",
  "a1-05-numbers-2": "تا ده را که یاد بگیری، دیگر در نانوایی گم نمی‌شوی! 🥖",
  "a1-06-family": "مادر و پدر را که بگویی، معرفی خانواده دیگر لال نمی‌ماند! 😊",
  "a1-07-question-words": "چی و کجا را که بلد باشی، سؤال آلمانی دیگر ترس ندارد! 🔎",
  "a1-08-sein": "«من هستم» را که بگویی، معرفی خودت دیگر گیر نمی‌کند! 🙂",
  "a1-09-colors": "سیب سرخ را که یاد بگیری، رنگ‌ها دیگر قاطی نمی‌شوند! 🍎",
  "a1-10-weekdays": "روزهای هفته را که بدانی، قرار ملاقات دیگر گم نمی‌شود! 📅",
  "a1-11-time": "ساعت را که بپرسی، قطار منتظر حدس تو نمی‌ماند! ⏰",
  "a1-12-haben": "«دارم» را که بگویی، داشتن و نداشتن دیگر قاطی نمی‌شود! 👜",
  "a1-13-food-drink": "نان و آب را که بگویی، گرسنگی دیگر بی‌زبان نمی‌ماند! 🍞",
  "a1-14-cafe": "سفارش کافه را که بلد باشی، قهوه سرد نمی‌شود تا ترجمه کنی! ☕",
  "a1-15-numbers-3": "تا بیست را که بلد باشی، قیمت بلیت دیگر سورپرایز نیست! 🎫",
  "a1-16-weather": "هوا را که بپرسی، حرف زدن با همسایه دیگر سخت نیست! ☔",
  "a1-17-adjectives": "بزرگ و کوچک را که بلد باشی، توصیف چیزها دیگر اشاره نیست! 📏",
  "a1-18-shopping": "قیمت را که بپرسی، خرید دیگر با نگاه به برچسب تمام نمی‌شود! 💳",
  "a1-19-directions": "راه را که بپرسی، ایستگاه دیگر پشت سرت نمی‌ماند! 📍",
  "a1-20-countries": "کشور را که بگویی، «اهل کجایی» دیگر سکوت ندارد! 🌍",
  "a1-21-professions": "شغل را که بگویی، معرفی خودت یک جمله می‌شود! 💼",
  "a1-22-daily-routine": "برنامهٔ روز را که بگویی، روزت دیگر فقط با اشاره پیش نمی‌رود! 🙂",
  "a1-23-common-verbs": "رفتن و آمدن را که بلد باشی، کار روزانه جمله می‌شود! 🚶",
  "a1-24-clothes": "لباس را که اسم ببری، فروشگاه دیگر با اشاره تمام نمی‌شود! 👕",
  "a1-25-modal-verbs": "«می‌توانم» را که بگویی، کمک خواستن دیگر معطل نمی‌ماند! 💪",
  "a1-26-home": "اتاق‌ها را که بشناسی، گشتن دنبال کلید کمتر خنده‌دار می‌شود! 🔑",
  "a1-27-train-station": "قطار را که بپرسی، سکو دیگر حدسی نیست! 🚆",
  "a1-28-tickets": "بلیت را که بخری، کنترل دیگر غافلگیرت نمی‌کند! 🎫",
  "a1-29-appointments": "وقت را که بگیری، پشت در «فردا بیا» نمی‌شنوی! 📆",
  "a1-30-health": "درد را که بگویی، داکتر منتظر ترجمه نمی‌ماند! 🩺",
  "a1-31-small-talk": "احوال‌پرسی کوتاه را که بلد باشی، آسانسور دیگر سکوت محض نیست! 🚪",
  "a1-32-spelling-contact": "اسم را که هجی کنی، فرم دیگر اسمت را قورت نمی‌دهد! ✏️",
  "a1-33-payment": "کارت یا نقد را که بگویی، صندوق دیگر معطل نمی‌شود! 💳",
  "a1-34-accusative": "مفعول را که جا بیندازی، جمله دیگر لنگ نمی‌زند! 🧩",
  "a1-35-separable-verbs": "فعل جداشدنی را که بشناسی، آخر جمله غافلگیرت نمی‌کند! ✂️",
  "a1-36-leisure": "وقت آزاد را که بگویی، «چه کار می‌کنی» جواب دارد! 🎮",
  "a1-37-bottle-deposit": "بطری را که پس بدهی، پول خردت برمی‌گردد! ♻️",
  "a1-38-important-numbers": "شماره‌های ضروری را که بدانی، لحظهٔ عجله گم نمی‌شوی! 📞",
  "a1-39-address": "نشانی را که بگویی، نامه به خانهٔ همسایه نمی‌رود! 📬",
  "a1-40-authorities": "اداره را که با جمله شروع کنی، نوبتت کمتر طول می‌کشد! 🙂",
  "a1-41-what-is-this": "«این چیست» را که بپرسی، شیء گنگ دیگر بی‌نام نمی‌ماند! 🔎",
  "a1-42-possession": "مال خودت را که بگویی، کلیدها دیگر بی‌صاحب نمی‌مانند! 🔑",
  "a1-43-negation-kein": "نه را که درست بگویی، جوابت مؤدبانه می‌شود! 🚫",
  "a1-44-furniture": "مبل و تخت را که بشناسی، آگهی خانه دیگر معما نیست! 🏠",
  "a1-45-times-of-day": "صبح و شب را که جدا کنی، قرار دیگر سر ظهر گم نمی‌شود! ⏰",
  "a1-46-weekend": "آخر هفته را که بگویی، برنامهٔ شنبه دیگر حدسی نیست! 🎉",
  "a1-47-making-plans": "قرار را که بگذاری، «فردا می‌بینمت» واقعی می‌شود! 🤝",
  "a1-48-being-late": "اگر دیر رسیدی، یک جملهٔ معذرت اخم را کوتاه می‌کند! ⏳",
  "a1-49-dream-jobs": "شغل رویایی را که بگویی، معرفی خودت جان می‌گیرد! ✨",
  "a1-50-inside-building": "آسانسور و پله را که بپرسی، طبقهٔ سوم دیگر گم نمی‌شود! 🚪",
  "a1-51-traffic-directions": "چراغ را که بگویی، مسیر دیگر فقط با دست نیست! 📍",
  "a1-52-groceries": "نان و شیر را که اسم ببری، سبد خرید حرف می‌زند! 🥛",
  "a1-53-at-the-counter": "پشت پیشخوان را که جمله بگویی، نوبتت زودتر می‌رسد! 🧀",
  "a1-54-day-trip": "گردش را که پیشنهاد کنی، یکشنبه برنامه دارد! 🌳",
  "a1-55-weather-forecast": "هوای فردا را که بپرسی، بارانی بی‌چتر نمی‌روی! ☔",
  "a1-56-body-parts": "دست و سر را که بگویی، داکتر همان‌جا را نگاه می‌کند! 🦵",
  "a1-57-symptoms": "تب را که بگویی، نسخه دیگر حدسی نوشته نمی‌شود! 🤒",
  "a1-58-pharmacy": "داروخانه را که با جمله شروع کنی، قفسه کمتر گیجت می‌کند! 💊",
  "a1-59-perfekt-haben": "دیروز را که روایت کنی، قصه‌ات زمان پیدا می‌کند! 📖",
  "a1-60-perfekt-sein": "رفتن دیروز را که بگویی، مسیر با امروز قاطی نمی‌شود! 🚶",
  "a1-61-war-hatte": "«بود» و «داشت» را که جدا کنی، خاطره درست روایت می‌شود! 📖",
  "a1-62-where-is-it": "«کجاست» را که بپرسی، نقشه کمتر از جیبت درمی‌آید! 📍",
  "a1-63-in-europe": "کشور همسایه را که بشناسی، سفر کوتاه اسم پیدا می‌کند! 🌍",
  "a1-64-other-countries": "وطن را که بگویی، معرفی خودت یک جملهٔ ساده است! 🌏",
  "a1-65-why-here": "«چرا اینجایی» را که جواب بدهی، سکوت اداره کوتاه‌تر می‌شود! 💬",
  "a1-66-months": "ماه‌ها را که بدانی، تاریخ تولد دیگر عدد گنگ نیست! 🎂",
  "a1-67-seasons": "فصل را که بگویی، لباس پوشیدن دلیل دارد! 🍂",
  "a1-68-dates-birthday": "تاریخ تولد را که بگویی، فرم بالاخره کامل می‌شود! 🎂",
  "a1-69-restaurant-order": "منو را که بخوانی، سفارش دیگر با اشاره به عکس نیست! 🍝",
  "a1-70-invitation": "دعوت را که بگویی، مهمانی فقط با پیام انگلیسی نیست! 🎈",
  "a1-71-feelings": "حالت را که بگویی، «خوبی؟» جواب واقعی دارد! 😊",
  "a1-72-apartment-hunting": "خانه را که بپرسی، آگهی دیگر رمز نیست! 🏠",
  "a1-73-rent-and-bills": "اجاره را که بپرسی، قبض آخر ماه غافلگیرت نمی‌کند! 💳",
  "a1-74-bank": "بانک را که با جمله شروع کنی، باجه کمتر برمی‌گرداندت! 🏦",
  "a1-75-post-office": "پست را که بگویی، بسته سرگردان نمی‌ماند! 📦",
  "a1-76-telephone": "تلفن را که جواب بدهی، «الو» آخر حرف نیست! 📞",
  "a1-77-email-form": "فرم را که پر کنی، اسمت دیگر جا نمی‌ماند! ✏️",
  "a1-78-school-course": "کلاس را که سؤال بپرسی، درس جلوتر از تو نمی‌دود! 🎓",
  "a1-79-children": "بچه‌ها را که معرفی کنی، مهد و مدرسه جواب دارند! 👶",
  "a1-80-sport": "ورزش را که اسم ببری، حرف باشگاه یک کلمه نمی‌ماند! ⚽",
  "a1-81-music-media": "موسیقی را که بگویی، سلیقه‌ات دیگر فقط با زمزمه نیست! 🎵",
  "a1-82-sizes": "اندازه را که بپرسی، لباس کوچک دیگر به خانه نمی‌آید! 👕",
  "a1-83-comparison": "ارزان‌تر را که بگویی، انتخاب بین دو جنس جمله می‌شود! 💳",
  "a1-84-muessen": "«باید» را که بگویی، کار اجباری دیگر اخم خاموش نیست! 📌",
  "a1-85-duerfen": "اجازه را که بپرسی، ورود و پارک معطل نمی‌ماند! 🚪",
  "a1-86-wollen": "«می‌خواهم» را که بگویی، قصدت بالاخره شنیده می‌شود! 🎯",
  "a1-87-imperative": "خواهش مؤدب را که بلد باشی، درخواستت فرمان خشک نیست! 🙏",
  "a1-88-dative": "«به تو» را که جا بیندازی، هدیه سر صاحبش می‌رسد! 🎁",
  "a1-89-possessive": "مال من و تو را که جدا کنی، کلیدها صاحب پیدا می‌کنند! 🔑",
  "a1-90-prepositions-place": "بالا و زیر را که بگویی، «کتاب کجاست» جواب دارد! 📚",
  "a1-91-prepositions-time": "ساعت و روز را که درست بگویی، قرار دقیق می‌شود! ⏰",
  "a1-92-public-transport": "عوض کردن خط را که بپرسی، ایستگاه اشتباه پیاده نمی‌شوی! 🚇",
  "a1-93-taxi-and-car": "مقصد را که بگویی، تاکسی دور اضافه نمی‌زند! 🚕",
  "a1-94-hotel": "اتاق را که رزرو کنی، پذیرش دیگر شانه بالا نمی‌اندازد! 🏨",
  "a1-95-emergency": "کمک را که بلند بگویی، لحظهٔ عجله بی‌کلمه نمی‌ماند! 🚨",
  "a1-96-lost-found": "گم‌شده را که وصف کنی، دفتر اشیاء شانس پیدا می‌کند! 🎒",
  "a1-97-neighbours": "همسایه را که سلام کنی، راه‌پله دیگر سکوت یخ نیست! 🚪",
  "a1-98-job-interview": "تجربه را که بگویی، مصاحبه با سکوت خشک شروع نمی‌شود! 🤝",
  "a1-99-work-day": "پایان کار را که بگویی، روز بالاخره جمع می‌شود! 🏁",
  "a1-100-review": "این دوره را که جمع کنی، مکالمهٔ روزمره دیگر از صفر نیست! 🎉",
};

// Broad fallback when a unit id is new but the topic is recognisable.
const FUNNY_BY_TOPIC = [
  [/اعداد|number|zahlen/i, "عدد را که بلد باشی، قیمت و ساعت دیگر حدسی نیست! 🎫"],
  [/سلام|احوال|greet|höflich|polite/i, "سلام را که بلد باشی، اولین برخورد دیگر با اشاره تمام نمی‌شود! 👋"],
  [/رنگ|color|apfel|سیب/i, "سیب سرخ را که یاد بگیری، رنگ‌ها دیگر قاطی نمی‌شوند! 🍎"],
  [/غذا|کافه|نان|رستوران|food|cafe|restaurant|einkauf|خرید/i, "سفارش را که بلد باشی، صف دیگر با اشاره جلو نمی‌رود! 🍞"],
  [/خانواده|family|کودک|kind/i, "خانواده را که معرفی کنی، حرف خانه دیگر لال نمی‌ماند! 😊"],
  [/قطار|بلیت|تاکسی|راه|bahn|zug|taxi|weg/i, "راه و بلیت را که بپرسی، دیگر لازم نیست مسیر را با دست نشان بدهی! 🚆"],
  [/داکتر|سلامت|دارو|arzt|apotheke|gesund/i, "درد را که بگویی، داکتر منتظر ترجمه نمی‌ماند! 🩺"],
  [/هوا|wetter/i, "هوا را که بپرسی، حرف زدن با همسایه دیگر سخت نیست! ☔"],
];

const SERIES_LINES = {
  "Die Ruhezeit": "یکشنبه که برسد، حتی جاروبرقی هم باید ساکت بماند! 🤫",
  "Der Termin": "وقت اداره را که یادت بماند، نوبت از دستت درنمی‌رود! 📆",
  "Der Arzttermin": "وقت داکتر را که بگویی، درد منتظر ترجمه نمی‌ماند! 🩺",
  "Ein Brötchen, bitte": "یک نان را که سفارش بدهی، نانوایی دیگر با اشاره تمام نمی‌شود! 🥖",
  "Du oder Sie?": "تو و شما را که قاطی نکنی، همسایه اخم نمی‌کند! 🙂",
  "Sonntag: alles zu": "یکشنبه همه‌چیز بسته است؛ این را که بدانی بی‌خود راه نمی‌افتی! 🚪",
  "Der Brief": "نامه را که بخوانی، خبر دیگر غافلگیر و بی‌کلمه نیست! 📬",
  "Das Pfand": "بطری را که پس بدهی، پول خرد از دستگاه درمی‌آید! 🙂",
};

const PRACTICAL = /number|sein|haben|verb|modal|accusative|dative|perfekt|imperativ|preposition|negation|possess|question|adjective|comparison|spelling|muessen|duerfen|wollen|war-hatte|separable|what-is/;

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isGermanTopic(value) {
  const text = clean(value);
  return text.length > 0 && !/[\u0600-\u06FF]/.test(text);
}

function lessonNumber(unit, episodeNo) {
  const given = Number(episodeNo);
  if (Number.isInteger(given) && given > 0) return given;
  const match = /^a1-(\d+)/.exec(String(unit?.id || ""));
  return match ? Number(match[1]) : null;
}

function lessonDataLine(unit) {
  for (const value of [unit?.captionFa, unit?.funnyFa, unit?.socialFa]) {
    if (typeof value === "string" && /[\u0600-\u06FF]/.test(value)) return value;
  }
  return "";
}

export function normalizeFunny(line) {
  let text = clean(String(line || "").replace(/[\r\n]+/g, " "));
  if (!/[\u0600-\u06FF]/.test(text)) return GENERIC_FUNNY;
  const found = text.match(EMOJI) || [];
  if (found.length > 1) {
    let kept = false;
    text = text.replace(EMOJI, (emoji) => {
      if (kept) return "";
      kept = true;
      return emoji;
    });
    text = clean(text);
  }
  return text;
}

export function germanTopicTitle(unit, episodeNo) {
  const fromEasy = unit?.id ? EASY_TEXT[unit.id]?.title : "";
  if (isGermanTopic(fromEasy)) return clean(fromEasy);
  const explicit = unit?.titleDe || unit?.topicDe || unit?.title;
  if (isGermanTopic(explicit)) return clean(explicit);
  const n = lessonNumber(unit, episodeNo);
  return n ? `Deutsch A1 – Lektion ${n}` : "Deutsch A1";
}

export function funnyPersianLine(unit) {
  const fromData = lessonDataLine(unit);
  if (fromData) return normalizeFunny(fromData);
  if (unit?.id && FUNNY_BY_ID[unit.id]) return FUNNY_BY_ID[unit.id];
  const blob = `${unit?.id || ""} ${unit?.topic || ""} ${unit?.title || ""}`;
  for (const [pattern, line] of FUNNY_BY_TOPIC) {
    if (pattern.test(blob)) return line;
  }
  return GENERIC_FUNNY;
}

export function lessonTags(unit) {
  const blob = `${unit?.id || ""} ${unit?.topic || ""}`;
  const practical = PRACTICAL.test(blob);
  return {
    germanTag: practical ? "#PraktischesDeutsch" : "#Alltagsdeutsch",
    persianTag: practical ? "#آموزش_زبان_آلمانی" : "#آلمانی_به_دری",
  };
}

export function buildSocialCaption({ topic, funny, germanTag, persianTag }) {
  const title = clean(topic);
  if (!isGermanTopic(title)) throw new Error("social caption topic must be German");
  const line1 = `Deutsch lernen leicht gemacht: ${title}`;
  const line2 = normalizeFunny(funny);
  const tags = [...FIXED_HASHTAGS, germanTag, persianTag];
  if (tags.length !== 5 || tags.some((tag) => typeof tag !== "string" || !/^#[\p{L}\p{N}_]+$/u.test(tag))) {
    throw new Error("social caption needs exactly 5 hashtag tokens");
  }
  if (new Set(tags).size !== 5) throw new Error("social caption hashtags must be distinct");
  if (!LESSON_GERMAN_TAGS.includes(germanTag)) throw new Error("social caption needs one lesson-relevant German tag");
  if (!PERSIAN_HASHTAGS.includes(persianTag)) throw new Error("social caption needs one Persian tag");
  const line3 = tags.join(" ");
  const caption = `${line1}\n${line2}\n${line3}`;
  if (BANNED.test(caption)) throw new Error("social caption contains a banned hashtag");
  if ((caption.match(/#/g) || []).length !== 5) throw new Error("social caption must contain exactly 5 hashtags");
  if (caption.split("\n").length !== 3) throw new Error("social caption must be exactly 3 lines");
  return caption;
}

export function captionForLesson(unit, episodeNo) {
  return buildSocialCaption({
    topic: germanTopicTitle(unit, episodeNo),
    funny: funnyPersianLine(unit),
    ...lessonTags(unit),
  });
}

function seriesTopic(episode) {
  const title = clean(episode?.title);
  if (isGermanTopic(title)) return title;
  return "Praktische Dialoge";
}

function seriesFunny(episode) {
  const fromData = lessonDataLine(episode);
  if (fromData) return normalizeFunny(fromData);
  if (episode?.title && SERIES_LINES[episode.title]) return SERIES_LINES[episode.title];
  const fa = clean(episode?.titleFa);
  if (fa && /[\u0600-\u06FF]/.test(fa) && fa.length <= 40) {
    return normalizeFunny(`این را که ببینی، «${fa}» دیگر غافلگیرت نمی‌کند! 🙂`);
  }
  return "همسایه‌ها باز یک گرهٔ روزمره را با چند جملهٔ ساده باز می‌کنند! 🙂";
}

export function captionForSeries(episode) {
  return buildSocialCaption({
    topic: seriesTopic(episode),
    funny: seriesFunny(episode),
    germanTag: "#Alltagsdeutsch",
    persianTag: "#آلمانی_به_دری",
  });
}
