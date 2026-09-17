// Pronunciation fixes for the TTS voice.
// The chosen voice is not Persian-native, so a handful of loanwords come out
// wrong. Respelling them phonetically (in Persian letters) makes the engine say
// them correctly, while the ON-SCREEN text keeps its normal spelling — only the
// spoken copy is rewritten.
//
// Add a pair here whenever a word is reported as mispronounced.
const FIXES = [
  // Brand: keep the written English name, but pronounce it naturally in Persian.
  ["GapMedia", "گپ مدیا"],
  ["گپ مدیا", "گَپ مِدیا"],
  ["پروفایل", "پُروفایْل"],
  ["اپ‌سکیل", "اَپ سْکِیل"],
  ["ریموو بی‌جی", "ریمُوو بی جی"],
  ["کپ‌کات", "کَپ کات"],
  ["ویب‌سایت", "وِب سایت"],
  ["آپلود", "آپ لُود"],
  ["دیزاین", "دیزایْن"],
  ["کلان‌تر", "کَلان تَر"],
  ["کلان‌نمایی", "کَلان نُمایی"],
  ["پس‌منظر", "پَس مَنظَر"],
  ["ریلز", "ریلْس"],
  ["کامنت", "کامِنت"],
  ["کامنت‌ها", "کامِنت ها"],
  ["کامنت‌های", "کامِنت های"],
  ["کامنت‌هاش", "کامِنت هاش"],
  ["استوری", "اِستوری"],
  ["پیج", "پِیج"],
  ["پست", "پُست"],
  ["تگ", "تَگ"],
  ["لایک", "لایْک"],
  ["کولب", "کُلَب"],
  ["کپ‌کات", "کَپ کات"],
  ["زیرنویس", "زیرنِویس"],
  ["دوربین", "دورْبین"],
  ["گزینهٔ", "گُزینه"],
  ["گزینه", "گُزینه"],
  ["صفحهٔ", "صَفحه"],
  ["همکار", "هَمکار"],
  ["مخاطب", "مُخاطَب"],
  ["ابزارهای", "اَبزارهای"],
  ["سازنده", "سازَنده"],
  ["بارگذاری", "بارگُذاری"],
  ["پس‌زمینه", "پَس زَمینه"],
  ["بی‌صدا", "بی صِدا"],
];

// zero-width non-joiner confuses the engine; a plain space reads better aloud
// A zero-width non-joiner separates letters INSIDE one word: «می‌کند» is one
// word, spoken as one. Turning it into a space made it two, and the engine then
// put a gap between «می» and «کند» — the word-by-word delivery that makes
// narration sound like a machine reading rather than a person explaining.
//
// The prefixes and suffixes below are bound morphemes: they are never their own
// word, so joining them is always right. Anything else keeps the space, because
// a ZWNJ also joins genuinely separate words in compounds like «تیک‌تاک», and
// those do want a boundary.
const JOIN_BEFORE = /(می|نمی|بی)‌/g;                       // verb and adjective prefixes
// Persian letters are not word characters for JavaScript's \b, so the old
// suffix pattern never matched. A punctuation/end boundary keeps a bound
// suffix inside its word without joining separate words in a sentence.
// «ای» (nisba/adjectival: حرفه‌ای، منطقه‌ای، سرمایه‌ای — "-al"/"-ic") was
// missing here, so its ZWNJ fell through to the general ZWNJ→space rule and
// the engine read «حرفه‌ای» as two words, «حرفه» + a bare «ای» (reported live
// 2026-09-07: «حرفه‌ای» mispronounced). Anchored the same way as every other
// entry — only a ZWNJ directly followed by «ای» at a word boundary matches,
// so a genuinely separate word ending in the letters ا+ی is never touched.
const JOIN_AFTER = /‌(هایی|هایت|های|ترین|شان|مان|تان|ها|ات|اش|تر|ای)(?=$|[\s،؟!.])/g;

export const normalise = (s) => String(s)
  .replace(JOIN_BEFORE, "$1")
  .replace(JOIN_AFTER, "$1")
  .replace(/‌/g, " ")
  // Ordinary whitespace only. \s also matches the non-breaking space, and
  // collapsing that undid the very marking that keeps «اَد مِدیا» together.
  .replace(/[ \t\r\n\f\v]+/g, " ")
  .trim();

export function sayable(text) {
  let out = normalise(text);
  for (const [from, to] of FIXES) {
    out = out.split(from).join(to);
  }
  return normalise(out);
}

// MiniMax has Persian language support, unlike the old fallback engine. Its
// normal Persian orthography produces better Dari/Persian pronunciation than
// forcing vowel marks and phonetic spellings meant for that older engine.
// Persian numerals as spoken words, for any whole number the narration can
// realistically carry (follower counts, view counts, hours, study sizes).
const ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const TEENS = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const HUNDREDS = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];

function under1000(n) {
  const parts = [];
  if (n >= 100) { parts.push(HUNDREDS[Math.floor(n / 100)]); n %= 100; }
  if (n >= 10 && n < 20) parts.push(TEENS[n - 10]);
  else {
    if (n >= 20) { parts.push(TENS[Math.floor(n / 10)]); n %= 10; }
    if (n > 0) parts.push(ONES[n]);
  }
  return parts.join(" و ");
}

export function persianNumberWords(digits) {
  const n = Number(String(digits).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  if (!Number.isFinite(n)) return String(digits);
  if (n === 0) return "صفر";
  // Past a million the spoken form stops being useful in a 15-second video, and
  // a wrong reading is worse than the digits — leave those alone.
  if (n >= 1_000_000) return String(digits);
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  const words = [];
  if (th === 1) words.push("هزار");
  else if (th > 1) words.push(`${under1000(th)} هزار`);
  if (rest) words.push(under1000(rest));
  return words.join(" و ");
}

// A short breath where a Persian clause turns. Without it the voice runs a whole
// question together in one push — «آیا ویوهایت برای درآمد واجد شرایط» arrives as
// a single unbroken line, which is what makes it sound rushed rather than fast.
//
// A comma, not a pause tag: punctuation is never spoken, while a literal marker
// risks being read aloud. Compound linkers are matched before their bare halves,
// and a sentence-ending mark never takes a breath on top of the one it already
// has.
const NB = "\u00a0";   // joins what must be spoken as one word

// A preposition governs the word after it; a clitic and an ezafe lean on their
// neighbour. Breaking at any of these separates a phrase instead of two.
// «روی» (on/onto) was missing from this set — «روی Creator Center بزن» took a
// breath right after the preposition and before its object, «... روی، Video
// Assistant بزن» — confirmed live 2026-09-06. It governs its object exactly
// like «بر» already in this set; same rule, same fix.
const BOUND_BEFORE = new Set(["به", "از", "در", "با", "برای", "تا", "که", "و", "یا",
  "بر", "روی", "بی", "را", "هم", "این", "آن", "یک", "خودت", "همان", "خیلی"]);
const BOUND_AFTER = new Set(["را", "ها", "های", "هایت", "هم", "و", "که", "تا", "یا"]);
// A Persian compound verb is one act: «نشان بده», «باز کن», «تطبیق بده».
const LIGHT_VERB = new Set(["کن", "بده", "بزن", "ببین", "بخوان", "بساز", "کنی", "دهد", "بودن",
  "شود", "است", "هستند", "بماند", "کرد", "بگیر", "برو", "باش", "دارد", "بفرست",
  "منتشر", "میدهد", "میکند", "میشود", "نرود"]);
const NUMBER_WORD = new Set(["صفر", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت",
  "نه", "ده", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود", "صد",
  "دویست", "سیصد", "چهارصد", "پانصد", "هزار", "ساعت", "روز", "ثانیه", "دقیقه", "درصد"]);

// A sentence adverb comments on what came before it, so the breath goes in
// front of it. «اصلاً» belongs to «برای درآمد», not to the subject.
const BREAK_BEFORE = new Set(["اَصلَن", "اصلا", "اصلاً", "واقعا", "واقعاً", "حتما",
  "حتماً", "دَقیقَن", "مثلا", "مثلاً", "پس", "یعنی", "واجِدِ", "واجد"]);

// The first and last word inside an NBSP-joined unit — the edges a breath
// would land against.
const head = (token) => token.split(NB)[0];
const tail = (token) => token.split(NB).pop();

// Exported so any TTS pipeline can place breaths the same tested way —
// the rule (comma after one or two phrases, never between a preposition
// and its object, an enclitic, a light verb, or a number and its unit) is
// about Persian, not about which engine reads the result.
export function breathe(text) {
  return String(text).split(/([؟!.])/).map((part) => {
    if (!/\S/.test(part) || /^[؟!.]$/.test(part)) return part;
    const w = part.trim().split(/ +/);
    // Short enough to say in one go; a breath here would be a stutter.
    if (w.length < 7) return part;

    const out = [];
    let since = 0;
    for (let i = 0; i < w.length; i++) {
      out.push(w[i]);
      since++;
      // A token joined by NBSP is several words said as one, so the sets have
      // to look at the edge that actually touches the gap: what the previous
      // token ends with, what the next one starts with. Matching the whole
      // token missed «واجِدِ شَرایِط» once it was joined, and the breath that
      // keeps the ezafe from bleeding backwards silently stopped being placed.
      const last = tail(w[i].replace(/،/g, ""));
      const next = head((w[i + 1] || "").replace(/،/g, ""));
      const room = w.length - i - 1;
      // These take a breath in front of them whatever the running count says.
      if (BREAK_BEFORE.has(next) && since >= 2 && !/،$/.test(w[i])) {
        out.push("،"); since = 0; continue;
      }
      // A comma already sitting in the source — written by hand, or just
      // turned from a dash above — is a breath that was already taken. Without
      // this the running count kept climbing straight through it, so a hook
      // with one deliberate pause before «رایگان» came out with two or three
      // more stacked right on top of it: «به‌خاطر، موزیک، حذف نشود،».
      if (/،$/.test(w[i])) since = 0;
      const blocked = BOUND_BEFORE.has(last)
        || BOUND_AFTER.has(next)
        || LIGHT_VERB.has(next)
        || /[ٔـِ]$/.test(last)                                  // ezafe leans forward
        || (NUMBER_WORD.has(last) && NUMBER_WORD.has(next))     // one quantity
        || NUMBER_WORD.has(next)
        || /،$/.test(w[i]);
      // Four to five words is a phrase; the tail needs room for one of its own.
      if (since >= 4 && room >= 4 && !blocked) { out.push("،"); since = 0; }
    }
    return out.join(" ").replace(/ +،/g, "،");
  }).join("");
}

export function minimaxSpeakable(text) {
  let out = normalise(text)
    // The video card can carry labels, URLs and parenthetical guidance.  The
    // narrator should tell the idea naturally, not read page furniture aloud.
    .replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, " ")
    .replace(/(?:https?:\/\/|www\.)\S+/gi, " ")
    .replace(/^\s*[•\-–—]+\s*/g, " ")
    .replace(/[«»*_]/g, " ")
    // These symbols mark a boundary only when the writer intentionally used
    // them. Keep a short natural breath; never let a literal symbol reach TTS.
    .replace(/[<>|"']/g, "،")
    .replace(/\?/g, "؟")
    // Persian heh-with-hamza is an ezafe spelling, not a separate glottal
    // sound. Make the -ye link explicit only in the private spoken copy.
    .replace(/هٔ|ۀ/g, "ه‌ی")
    .replace(/،{2,}/g, "،")
    // A mid-sentence dash is used as a written pause — «... شو — رایگان» —
    // and TTS has no idea what to do with a bare em/en dash or a semicolon: left
    // as a literal character it reads oddly or gets silently dropped, and either
    // way it still occupies a slot in the word array breathe() counts against,
    // which is what put a stray comma inside «سوار ترند شو» in the first place.
    // Converting it to the punctuation the engine already reads correctly turns
    // an ambiguous mark into an intentional breath.
    .replace(/\s*[–—]\s*/g, "، ")
    .replace(/؛/g, "،")
    // A real UI label stays English in the spoken copy. Transliteration makes
    // the narrator pronounce English as Persian; NBSP only prevents a breath
    // from splitting one button label. Brand names are different: TikTok is
    // conventionally spoken in Persian here, while its on-screen label stays
    // Latin in the composition.
    .replace(/\bCreator\s+Search\s+Insights\b/gi, "Creator Search Insights")
    .replace(/\bSearch\s+analytics\b/gi, "Search analytics")
    .replace(/\b(?:TikTok\s+Search|Search\s+TikTok)\b/gi, "TikTok Search")
    .replace(/\bContent\s+gap\b/gi, "Content gap")
    .replace(/\bTikTok\s+Shop\b/gi, "TikTok Shop")
    // A negative lookahead on the NBSP, not just the generic \b — the four
    // labels above already NBSP-joined "TikTok" to the word after it, and a
    // plain \bTikTok\b still matches inside that joined unit (NBSP is not a
    // word character), re-Persianising just the first half and leaving
    // «TikTok Search» as «تیک تاک Search» — a language switch mid label,
    // confirmed live 2026-09-06 in the already-shipped search-insights-real-ui
    // video. Skipping "TikTok" when it is already NBSP-joined to what follows
    // leaves every protected label exactly as that rule wrote it.
    .replace(/\bTikTok\b(?! )/gi, "تیک تاک")
    .replace(/\bInstagram\b/gi, "اینستاگرام")
    .replace(/\bWatch\s+time\b/gi, "واچ تایم")
    .replace(/\bRetention\b/gi, "ریتِنشن")
    // The on-screen UI must retain its real English labels, but the approved
    // MiniMax Persian voice does not pronounce these two labels reliably.
    // They are never product names that a viewer needs to hear verbatim:
    // «Preview» is naturally said as «پیش‌نمایش» and «Microphone» as «مایک».
    // This is deliberately a private narration rewrite only; the real button
    // text shown in the video remains untouched.
    .replace(/\bPreview\b/gi, "پیش نَمایش")
    .replace(/پرویو/g, "پیش نَمایش")
    .replace(/\bMicrophone\b/gi, "مایک")
    .replace(/میکروفون/g, "مایک")
    // Persian platform names are also simplified in the private spoken copy.
    // «ریلز خودت را» is read more fluently as «ریل را» by this voice.
    .replace(/ریلز\s+(?:خودت\s+)?را/g, "ریل را")
    .replace(/ویدیوی\s+خودت\s+را/g, "ویدیو را")
    // Genuine English button labels are NOT transliterated — they are read as
    // English. Transliterating them produced «شِیر» for Share and «نِکست» for
    // Next: a Persian speaker mispronouncing English, which is neither
    // language. Approved by ear on 2026-08-31 against four alternatives.
    //
    // What follows are words that ARE Persian now. A Persian speaker says
    // «ویو» and «ادیت»; leaving those in Latin would be the same mistake
    // pointing the other way.
    // Genuine English button labels are NOT transliterated — they are read as
    // English. Transliterating them produced «شِیر» for Share and «نِکست» for
    // Next: a Persian speaker mispronouncing English, which is neither
    // language. Latin script with the Persian language boost was approved by
    // ear on 2026-08-31 against four alternatives.
    //
    // What follows are words that ARE Persian now. A Persian speaker says
    // «ویو» and «ادیت»; leaving those in Latin would be the same mistake
    // pointing the other way.
    // A two-word English label is one button. breathe() counts words and put a
    // comma inside «Add media», which is the same fault the NBSP rule fixed for
    // Persian pairs — it just never applied to labels left in Latin.
    // A two-word English label is one button. breathe() counts words and put a
    // comma inside «Add media» — the same fault the NBSP rule fixed for Persian
    // pairs, which never applied to labels left in Latin. Longest first, or
    // «Trial reel» would consume the start of «Trial reel insights».
    .replace(/\bTrial reel insights\b/gi, "Trial reel insights")
    .replace(/\bShare with everyone\b/gi, "Share with everyone")
    .replace(/\bCreator Rewards\b/gi, "Creator Rewards")
    .replace(/\bCreator\s+Center\b/gi, "Creator Center")
    .replace(/\bVideo\s+Assistant\b/gi, "Video Assistant")
    .replace(/\bHelp\s+me\s+create\b/gi, "Help me create")
    .replace(/\bReels\s+insights\b/gi, "Reels insights")
    .replace(/\bTrial reels?\b/gi, "Trial reel")
    .replace(/\bAdd media\b/gi, "Add media")
    .replace(/\bView\b/gi, "ویو")
    // Not the Reel inside «Trial reel» — that phrase is an English label and
    // stays English. NBSP keeps a breath out of it; only a lookbehind keeps
    // this rule out of it.
    .replace(/(?<!Trial[ \u00a0])\bReels?\b(?!\u00a0)/gi, "ریل")
    .replace(/\bEdit\b/gi, "ادیت")
    .replace(/\bSave\b/gi, "سیو")
    // «شیر» is milk, or a lion. The kasra separates the loanword from both, and
    // the multi-word buttons are said as one phrase — half-Persian half-Latin
    // ("شیر with everyone") made the voice change language mid-instruction.
    .replace(/\bCaption\b/gi, "کَپشِن")
    // These separators create a brief natural boundary without inserting the
    // long, theatrical pauses that made the previous narration feel stretched.
    .replace(/[؛:]/g, "،")
    .replace(/\s*([؟!.])\s*/g, "$1 ");
  // Speech stays faithful to the written meaning, but common stiff written
  // forms are eased into ordinary Persian delivery. These replacements are
  // intentionally small: they remove robotic formality without inventing new
  // claims or changing an instruction.
  const NATURAL_PERSIAN = [
    ["می‌توانید", "میتونین"],
    ["می توانید", "میتونین"],
    ["میتوانید", "میتونین"],
    ["بروید", "برین"],
    ["بزنید", "بزنین"],
    ["کنید", "کنین"],
    ["خود را", "خودتون رو"],
  ];
  for (const [from, to] of NATURAL_PERSIAN) out = out.split(from).join(to);
  // Keep Afghan/Dari wording on screen, but add only pronunciation marks to
  // the private TTS copy. MiniMax otherwise can misread «دقیق» as «دقیقه».
  // Ordered longest first so «دقیقاً» stays a single spoken word.
  // The engine read «۲۰۰» as «دو هزار». It is guessing at digits in a language
  // it does not natively speak, and a wrong number is the one narration error
  // that changes what the video claims — so numbers are written as words in the
  // spoken copy while the card on screen keeps the digits.
  //
  // Spelled out properly rather than looked up in a table: a table replaces
  // substrings, and «۴۸۹۳» would come out as «چهل و هشت۹۳».
  out = out.replace(/[۰-۹0-9]+/g, (digits) => persianNumberWords(digits));

  const PERSIAN_TTS_FIXES = [
    // «صفر» is /sefr/ in standard Persian.  This voice guesses an incorrect
    // vowel from the bare spelling, so the private spoken copy carries only
    // the missing kasra; the card on screen remains «صفر».
    ["صفر", "صِفر"],
    // «میکروفون» was reported as misread in a shipped TikTok narration.
    // The spoken copy above chooses the common short form «مایک» instead of
    // trying to force an unreliable multi-syllable Arabic-voice reading.
    ["میکروفون", "مایک"],
    // A possessive «ـت» stuck to a word that ends in a vowel is where this voice
    // breaks worst: «ویوهایت» and «ویدیویت» came out as something else entirely.
    // Marking the vowel fixes it; SPLITTING it off does not — a space makes the
    // engine read two words, which is the separated delivery it was meant to cure.
    // «تیک‌تاکِ تو» was auditioned as an alternative and rejected by ear: the
    // marked possessive is the approved form. Do not re-try the two-word rewrite.
    ["تیک تاکت", "تیک تاکِت"],
    ["تیک‌تاکت", "تیک تاکِت"],
    // The bare name, with no possessive, was never in this table — only
    // «تیک‌تاکت» was — so normalise() flattened its ZWNJ to a plain space and
    // left it exactly as open to a mid-word breath as the possessive form was
    // before this table existed. Same fault, same fix: protect the space.
    ["تیک تاک", "تیک تاک"],
    ["تیک‌تاک", "تیک تاک"],
    // Same fault, same fix, for every other compound that is one concept
    // and not a stem-plus-suffix: JOIN_AFTER above only glues the plurals
    // and comparatives; these still need protecting explicitly.
    ["بک‌گراند", "بک گراند"], ["بک گراند", "بک گراند"],
    ["به‌خاطر", "به خاطر"], ["به خاطر", "به خاطر"],
    ["ری‌اکشن", "ری اکشن"], ["ری اکشن", "ری اکشن"],
    ["اسکرین‌شات", "اسکرین شات"], ["پلی‌لیست", "پلی لیست"],
    ["تله‌پرامپتر", "تله پرامپتر"], ["ثبت‌نام", "ثبت نام"],
    ["زمان‌بندی", "زمان بندی"], ["کلین‌آپ", "کلین آپ"],
    ["اینستاگرامت", "اینستاگرامِت"],
    // «نمونه‌کارت» is «نمونه‌کار» plus the possessive — your work samples. Left
    // unmarked it is read as «کارت», a card: a different word and a different
    // sentence.
    ["نمونه‌کارت", "نمونه کارِت"],
    ["نمونه کارت", "نمونه کارِت"],
    ["کارهایت", "کارهایِت"],
    ["پستت", "پُستِت"],
    ["پست‌هایت", "پُستهایِت"],
    // Bare «پست» (post, the English loanword) was only ever fixed in the FIXES
    // table used by sayable() — which the VOICE pipeline does not call; it calls
    // minimaxSpeakable(), this table. So «پست روی هر دو پیج» in the collab
    // payoff went out unmarked and the engine read «پَست» (low/mean), a
    // different word (reported live 2026-09-07). An English word written in
    // Persian keeps its English sound: mark the damma so it says «post». Sorted
    // longest-first below, so «پستت»/«پست‌هایت» still match before this.
    ["پست", "پُست"],
    ["حسابت", "حسابِت"],
    ["مخاطبت", "مُخاطَبِت"],
    ["فالوورهایت", "فالوورهایِت"],
    ["استوریت", "اِستوریِت"],
    // «ات» is one of JOIN_AFTER's suffixes, so normalise() (called before
    // this table ever runs) already strips the ZWNJ and glues «صفحه‌ات» into
    // «صفحهات» — meaning the ZWNJ-spelled key below never actually matches
    // anything at runtime; it has been dead since JOIN_AFTER gained «ات».
    // Confirmed by tracing normalise()/minimaxSpeakable() directly: same
    // root cause reported live 2026-09-10 for «خانواده‌ات» (owner:
    // mispronounced in the a1-06-family episode's hook). The glued form is
    // the real key; kept alongside the ZWNJ form for documentation/safety,
    // same convention as every other duplicate-key pair in this table.
    ["صفحه‌ات", "صَفحه اِت"],
    ["صفحهات", "صَفحه اِت"],
    ["خانواده‌ات", "خانواده اِت"],
    ["خانوادهات", "خانواده اِت"],
    ["ویوهایت", "ویوهایِت"],
    ["پیامت", "پیامِت"],  // «نه لای الگوریتم» proved «نه لای» itself breaks the engine across every take tested; this mark is a smaller, separate fix — the possessive on «پیام» — kept regardless of how the sentence around it is worded.
    ["ویوهای", "ویوهایِ"],
    ["ویدیوهایت", "ویدیوهایِت"],
    ["ویدیوهای", "ویدیوهایِ"],
    ["ویدیویت", "ویدیویِت"],
    ["ریلزت", "ریلزِت"],
    ["پیجت", "پِیجِت"],
    ["کپشنت", "کَپشِنِت"],
    // «خریدت» (your shopping/purchase — خرید + enclitic ـت) came out as
    // «خریده» (has bought, a different word) on every one of 6 independent
    // MiniMax takes across two builds, 2026-09-13 (a1-18-shopping, hook and
    // outro). Same fault as every other enclitic-ـت case above: an
    // unmarked possessive on a consonant-final stem. Same fix, same
    // reasoning — mark the connecting vowel; do not touch the word itself.
    ["خریدت", "خریدِت"],
    // غ and ق are the same sound in Persian, /q/. The engine reads غ as a hard
    // g and says «گیر» for «غیر», which is a different word. Spelling the sound
    // with the letter it reads correctly fixes it without changing the word.
    ["غیر", "قِیر"],
    ["غیرفعال", "قِیر فَعال"],
    ["اصلاً", "اَصلَن"],
    ["واجدشرایط", "واجِدِ شَرایِط"],
    ["واجد شرایط", "واجِدِ شَرایِط"],
    // Ezafe the writing leaves out. Only pairs that actually occur in the
    // narration are listed: a general rule would add the vowel where Persian
    // does not take one, and a wrong ezafe is worse than a missing one.
    ["زمان تماشا", "زمانِ تماشا"],
    ["افت مخاطب", "افتِ مخاطب"],
    ["افت بیننده", "افتِ بیننده"],
    ["نرخ تعامل", "نرخِ تعامل"],
    ["ساعت اوج", "ساعتِ اوج"],
    ["دقیقاً", "دَقیقَن"],
    ["دقیق", "دَقیق"],
    // The NUMBER «ده» (ten) needs a fatha — «دَه», /dah/ — or the engine reads
    // «ده» as /deh/ (village), which is the wrong number (reported live
    // 2026-09-07: «ده دقیقه» in the descript hook). Only the number contexts are
    // marked, never bare «ده»: bare «ده» is also the imperative «ده» (give — as
    // in «نشان ده») which IS /deh/, and blanket-marking would break that. Listed
    // per the occurring collocations, the same convention as the ezafe pairs.
    ["ده دقیقه", "دَه دقیقه"],
    ["ده بار", "دَه بار"],
    ["ده ثانیه", "دَه ثانیه"],
    // Not «ویو اِت». The enclitic is not a word — it is a vowel and a consonant
    // on the end of one — and writing it as a separate token is precisely what
    // made the engine say it separately, in the English way.
    ["ویوَت", "ویوِت"],
    ["ویوت", "ویوِت"],
    // The ع in «تعریف» was going unsounded — it came back as «تریف». Marking
    // the vowel on the first syllable gives the glottal something to sit on.
    ["تعریف", "تَعریف"],
    // «سوءاستفاده» is written as one word but is grammatically «سوءِ استفاده»
    // (misuse — literally "the ill of use"), an ezafe construction with a
    // hamza glottal stop at the seam. Written solid with neither marked, the
    // engine misread it — reported live 2026-09-04. Same fix as «تعریف»
    // above (mark the glottal's vowel) plus the ezafe the writing omits.
    ["سوءاستفاده", "سوءِ استفاده"],
    ["ریتِنشن", "ریتِنشِن"],
    ["ریتنشن", "ریتِنشِن"],
  ];
  {
    // Many of these fixes spell one written word as two spoken ones — «آپلود»
    // as «آپ لُود», «تیک‌تاکت» as «تیک تاکَت». That space is a pronunciation
    // aid, not a phrase boundary, and breathe() was free to drop a comma into
    // it: the listener then hears a gap inside a single word, which is exactly
    // the «تیک تاک ... کَت» fault that kept being reported. Protecting them one
    // at a time missed thirty of them, so the protection is a rule instead.
    //
    // Every space in a replacement value is protected, without exception. Each
    // one is there to shape a sound — a brand read as two syllables, a suffix
    // given its vowel, an ezafe made audible — and none of them marks a place a
    // speaker would draw breath. breathe() still has the whole rest of the
    // sentence to work in.
    const protect = ([key, value]) => [key, value.split(" ").join(NB)];
    const byLength = PERSIAN_TTS_FIXES.map(protect).sort((a, b) => b[0].length - a[0].length);
    const table = new Map(byLength);
    const pattern = new RegExp(
      byLength.map(([k]) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
      "g",
    );
    out = out.replace(pattern, (m) => table.get(m) ?? m);
  }
  // Do not invent breaths after a fixed word count.  Persian connective
  // phrases such as «بدون مایک و بدون صدای خودت» were being split by a comma
  // despite no punctuation or semantic boundary in the script.  The narrator
  // may pause only where the authored sentence carries punctuation; NBSP still
  // protects pronunciation-only spaces before they are restored below.
  return normalise(out).split(NB).join(" ");
}

// German lessons need a conversational Persian delivery, but their on-screen
// copy stays formal and standard.  This private spoken copy supplies only the
// long vowels a Persian reader naturally hears at a question/encouragement
// peak.  It never inserts a space, never touches a suffix and never applies
// to ordinary explanatory sentences — stretching every word was specifically
// rejected by the owner as robotic.  Diacritics remain the first remedy for
// ambiguous vowels; these small «اا/وو/یی» cues are the second, targeted one.
const LESSON_VOICE_CUES = [
  [/^می[‌ ]?خواهی/u, "می‌خوااای"],
  [/^می[‌ ]?خواهید/u, "می‌خواااید"],
  [/^می[‌ ]?توانی/u, "می‌توااانی"],
  [/^می[‌ ]?توانید/u, "می‌توااانید"],
  [/^آماده‌ای/u, "آماده‌ایی"],
  [/^حالا/u, "حالاا"],
];

export function lessonSpeakable(text, engine = "minimax") {
  let spoken = String(text || "").trim();
  for (const [pattern, replacement] of LESSON_VOICE_CUES) spoken = spoken.replace(pattern, replacement);
  return engine === "pocket" ? pocketSpeakable(spoken) : minimaxSpeakable(spoken);
}

// Text preparation for the LOCAL pocket-tts engine (music/pocket-tts.mjs):
// a native-Persian model plus an English model, cloned onto the same
// reference voice for the Latin-script words the Persian model cannot say.
//
// Deliberately does NOT reuse minimaxSpeakable()'s PERSIAN_TTS_FIXES table.
// Those diacritics compensate for MiniMax's Arabic-native voice guessing at
// Persian; pocket-tts-farsi is Persian-native, and the one fix actually
// re-tested cross-engine came out WORSE — «موضوعَت» read as two separated
// words instead of the intended possessive (see memory
// voice_pocket_tts_farsi.md, tested 2026-09-07). Genuine Latin-script words
// are left untouched here on purpose too: music/pocket-tts.mjs splits them
// out and speaks them with the real English model rather than transliterating
// them into Persian letters, which is what actually fixed «Second Space»
// being dropped (confirmed 2026-09-07).
const POCKET_PROTECT = [
  // Same purpose as PERSIAN_TTS_FIXES' identity entries above — stop breathe()
  // from dropping a comma into the middle of a one-concept compound — kept as
  // a separate, smaller list here rather than shared, so a change tuned for
  // one untested engine can never silently drift into the other's output.
  ["تیک‌تاک", "تیک تاک"], ["تیک تاک", "تیک تاک"],
  ["به‌خاطر", "به خاطر"], ["به خاطر", "به خاطر"],
  ["بک‌گراند", "بک گراند"], ["بک گراند", "بک گراند"],
  ["ری‌اکشن", "ری اکشن"], ["ری اکشن", "ری اکشن"],
  ["اسکرین‌شات", "اسکرین شات"],
  ["پلی‌لیست", "پلی لیست"],
  ["تله‌پرامپتر", "تله پرامپتر"],
  ["ثبت‌نام", "ثبت نام"],
  ["زمان‌بندی", "زمان بندی"],
  ["کلین‌آپ", "کلین آپ"],
  // «هوش مصنوعی» (artificial intelligence) is two words with an ordinary
  // space, not a ZWNJ compound — breathe() doesn't know they're one concept
  // and dropped a comma between them, splitting «هوش، مصنوعی،» (reported
  // live 2026-09-07, custom-70d77c52cd/step7). Same fix as the ZWNJ
  // compounds above: protect the space so no breath lands inside it.
  ["هوش مصنوعی", "هوش مصنوعی"],
];

export function pocketSpeakable(text) {
  let out = normalise(text)
    .replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, " ")
    .replace(/(?:https?:\/\/|www\.)\S+/gi, " ")
    .replace(/^\s*[•\-–—]+\s*/g, " ")
    .replace(/[«»*_]/g, " ")
    .replace(/[<>|"']/g, "،")
    .replace(/\?/g, "؟")
    .replace(/هٔ|ۀ/g, "ه‌ی")
    .replace(/،{2,}/g, "،")
    .replace(/\s*[–—]\s*/g, "، ")
    .replace(/[؛:]/g, "،")
    .replace(/\s*([؟!.])\s*/g, "$1 ");

  const NATURAL_PERSIAN = [
    ["می‌خواهید", "میخواین"], ["می خواهید", "میخواین"], ["میخواهید", "میخواین"],
    ["می‌توانید", "میتونین"], ["می توانید", "میتونین"], ["میتوانید", "میتونین"],
    ["بروید", "برین"], ["بزنید", "بزنین"], ["کنید", "کنین"], ["خود را", "خودتون رو"],
  ];
  for (const [from, to] of NATURAL_PERSIAN) out = out.split(from).join(to);

  // narrationLineCheck() rejects raw digits for either engine — pocket-tts-farsi
  // was never tested on them, and MiniMax's proven fix (spell the number out)
  // is not engine-specific, so it is reused as-is.
  out = out.replace(/[۰-۹0-9]+/g, (digits) => persianNumberWords(digits));

  {
    const protect = ([key, value]) => [key, value.split(" ").join(NB)];
    const byLength = POCKET_PROTECT.map(protect).sort((a, b) => b[0].length - a[0].length);
    const table = new Map(byLength);
    const pattern = new RegExp(
      byLength.map(([k]) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
      "g",
    );
    out = out.replace(pattern, (m) => table.get(m) ?? m);
  }

  return breathe(normalise(out)).split(NB).join(" ");
}
