// A1 German curriculum for the (former "German Insider" news) channel —
// owner request 2026-09-08: replace the news feed with a continuing,
// animated German-lesson series, narrated in Persian with the target
// German word/phrase shown and spoken; then owner corrections the same day:
// (1) the German itself must actually be pronounced, not just shown as
// text — handled in german-lesson-build.mjs/lib/voice-settings.mjs;
// (2) formal (Sie) vs informal (du) register must be taught explicitly,
// not left implicit — every item below that has a register carries it
// directly in `fa`, and a whole unit (a1-02) is now built around the
// distinction, since it is one of the first things a real A1 course
// covers right after greetings; (3) no mascot animation — real, topic-
// matched photos instead (`img`, an English search phrase used by
// lib/lesson-image.mjs), same real-photo bar (assertVisualProof) the rest
// of this project's tutorials already meet, not the cartoon style.
//
// Standard CEFR/Goethe-Institut A1 sequencing: greetings and courtesy
// before grammar, numbers before dates, question words before full
// sentences. Content itself (vocabulary, meaning, register, pronunciation)
// is fixed pedagogical material, not something that needs live research
// the way a news story or app-feature claim does.
//
// Each unit: 4 items (word/phrase, Persian meaning, an English search
// phrase for a real matching photo, and a short bilingual usage example).

export const GERMAN_A1 = [
  {
    id: "a1-01-greetings",
    topic: "سلام و احوال‌پرسی",
    hook: "با یک کلمه، اولین برخوردت به آلمانی حرفه‌ای می‌شود.",
    // 6 items, not 4 — owner request 2026-09-08: cover vocabulary,
    // conversation AND grammar together, and reach at least 60s. Items 5-6
    // add a real mini-dialogue and the underlying grammar pattern; both
    // keep `de` pure German (spoken by the German-language_boost voice —
    // mixing Persian into that field would break the pronunciation), with
    // the explanation carried entirely in `fa` (Persian, narrated).
    items: [
      { de: "Hallo", fa: "سلام (غیررسمی)", img: "two friends waving hello outdoors", example: "Hallo! Wie geht's? — سلام! حالت چطوره؟" },
      { de: "Guten Morgen", fa: "صبح بخیر", img: "good morning sunrise coffee", example: "Guten Morgen, Frau Meyer! — صبح بخیر خانم مایر!" },
      { de: "Guten Tag", fa: "روز بخیر (رسمی)", img: "business handshake formal greeting office", example: "Guten Tag, ich heiße Ali. — روز بخیر، اسم من علی است." },
      { de: "Tschüss", fa: "خداحافظ (غیررسمی)", img: "friends waving goodbye", example: "Tschüss, bis morgen! — خداحافظ، تا فردا!" },
      { de: "Wie geht's? Gut, danke!", fa: "مکالمهٔ کوتاه: «حالت چطوره؟» — «خوبم، مرسی!»", img: "two friends chatting smiling outdoors", example: "Wie geht's? — Gut, danke! Und dir? — حالت چطوره؟ — خوبم، مرسی! تو چطوری؟" },
      { de: "Guten Morgen, Guten Tag, Guten Abend", fa: "نکتهٔ گرامر: «Guten» + زمان روز — صبح، روز، عصر، همیشه همین الگو", img: "clock showing morning afternoon evening times", example: "Guten Abend! — عصر بخیر!" },
    ],
  },
  {
    id: "a1-02-formal-informal",
    topic: "رسمی و غیررسمی: du و Sie",
    hook: "یک اشتباه ساده می‌تواند مؤدبانه یا بی‌ادبانه به نظر برسد؛ تفاوتش را یاد بگیر.",
    items: [
      { de: "Wie heißt du?", fa: "اسم تو چیست؟ (غیررسمی — با دوستان و هم‌سن‌ها)", img: "young friends talking casually", example: "Wie heißt du? — Ich heiße Tom." },
      { de: "Wie heißen Sie?", fa: "اسم شما چیست؟ (رسمی — با غریبه‌ها یا در محیط کار)", img: "formal business meeting introduction", example: "Wie heißen Sie? — Ich heiße Frau Schmidt." },
      { de: "Ich heiße...", fa: "اسم من ... است (برای هر دو حالت)", img: "person introducing themselves smiling", example: "Ich heiße Sara. — اسم من سارا است." },
      { de: "Und du? / Und Sie?", fa: "تو چطور؟ (غیررسمی) / شما چطور؟ (رسمی)", img: "two people having conversation", example: "Ich heiße Ali. Und du? — اسم من علی است. تو چطور؟" },
    ],
  },
  {
    id: "a1-03-politeness",
    topic: "ادب و تعارف",
    // Fixed 2026-09-13 alongside a1-06/a1-07: all three used the exact
    // "این ۴ کلمه ..." opening (a systematic scan for repeated hook
    // templates across the whole curriculum, not just the single a1-17
    // report that prompted it — see test-hook-uniqueness.mjs).
    hook: "با تشکر و ببخشید شروع کن، مکالمه‌ات فوراً مؤدبانه می‌شود.",
    items: [
      { de: "Danke", fa: "متشکرم", img: "person saying thank you smiling", example: "Danke schön! — خیلی متشکرم!" },
      { de: "Bitte", fa: "خواهش می‌کنم / بفرمایید", img: "person offering something politely", example: "Bitte, kein Problem. — خواهش می‌کنم، مشکلی نیست." },
      { de: "Entschuldigung", fa: "ببخشید", img: "person asking for directions on street", example: "Entschuldigung, wo ist der Bahnhof? — ببخشید، ایستگاه قطار کجاست؟" },
      { de: "Es tut mir leid", fa: "متأسفم", img: "person apologizing", example: "Es tut mir leid, ich bin spät. — متأسفم، دیر کردم." },
    ],
  },
  {
    id: "a1-04-numbers-1",
    topic: "اعداد ۰ تا ۵",
    hook: "شمردن به آلمانی را از همین‌جا شروع کن.",
    items: [
      { de: "null, eins", fa: "صفر، یک", img: "number one hand finger counting", example: "eins, zwei — یک، دو" },
      { de: "zwei, drei", fa: "دو، سه", img: "three coffee cups on table", example: "drei Kaffee, bitte. — سه قهوه، لطفاً." },
      { de: "vier", fa: "چهار", img: "family of four", example: "Ich habe vier Kinder. — من چهار فرزند دارم." },
      { de: "fünf", fa: "پنج", img: "clock showing five oclock", example: "Es ist fünf Uhr. — ساعت پنج است." },
    ],
  },
  {
    id: "a1-05-numbers-2",
    topic: "اعداد ۶ تا ۱۰",
    hook: "تا ده به آلمانی بشمار، بدون مکث.",
    items: [
      { de: "sechs, sieben", fa: "شش، هفت", img: "calendar week days", example: "sechs Tage — شش روز" },
      { de: "acht", fa: "هشت", img: "person working at desk clock", example: "Ich arbeite acht Stunden. — من هشت ساعت کار می‌کنم." },
      { de: "neun", fa: "نه", img: "city bus arriving at stop", example: "Der Bus kommt um neun. — اتوبوس ساعت نه می‌آید." },
      { de: "zehn", fa: "ده", img: "euro banknotes and coins", example: "zehn Euro, bitte. — ده یورو، لطفاً." },
    ],
  },
  {
    id: "a1-06-family",
    topic: "خانواده",
    hook: "با مادر، پدر، خواهر و برادر، دربارهٔ خانواده‌ات آلمانی بگو.",
    items: [
      { de: "die Mutter", fa: "مادر", img: "mother and child portrait", example: "Das ist meine Mutter. — این مادر من است." },
      { de: "der Vater", fa: "پدر", img: "father and child portrait", example: "Mein Vater arbeitet viel. — پدرم زیاد کار می‌کند." },
      { de: "der Bruder", fa: "برادر", img: "two brothers together", example: "Ich habe einen Bruder. — من یک برادر دارم." },
      { de: "die Schwester", fa: "خواهر", img: "two sisters together", example: "Meine Schwester ist nett. — خواهرم مهربان است." },
    ],
  },
  {
    id: "a1-07-question-words",
    topic: "کلمات پرسشی",
    hook: "چی، کجا، کی، چطور؟ هر سؤال آلمانی از همین‌ها شروع می‌شود.",
    items: [
      { de: "Was?", fa: "چی؟", img: "person asking question confused", example: "Was ist das? — این چیست؟" },
      { de: "Wo?", fa: "کجا؟", img: "person looking at map location", example: "Wo bist du? — کجا هستی؟" },
      { de: "Wann?", fa: "کی؟", img: "person checking watch time", example: "Wann kommst du? — کی می‌آیی؟" },
      { de: "Wie?", fa: "چطور؟", img: "two people talking asking how", example: "Wie geht's dir? — حالت چطوره؟" },
    ],
  },
  {
    id: "a1-08-sein",
    topic: "فعل sein (بودن)",
    hook: "مهم‌ترین فعل آلمانی را در ۴ جمله یاد بگیر.",
    items: [
      { de: "ich bin", fa: "من هستم", img: "tired person resting", example: "Ich bin müde. — من خسته‌ام." },
      { de: "du bist", fa: "تو هستی", img: "friendly person smiling portrait", example: "Du bist nett. — تو مهربانی." },
      { de: "er/sie ist", fa: "او هست", img: "teacher in classroom", example: "Sie ist Lehrerin. — او معلم است." },
      { de: "wir sind", fa: "ما هستیم", img: "family at home together", example: "Wir sind zu Hause. — ما در خانه هستیم." },
    ],
  },
  // Owner report 2026-09-11: the curriculum bank ran out after 8 units and
  // germanUnitAt()'s modulo wrap silently started RE-teaching a1-01..a1-08
  // under new episode numbers (A1-009 onward), reusing the exact same
  // German/Persian content — a real, confirmed repeat, not a false alarm.
  // Expanded here (a1-09..a1-24) to push that wall much further out; the
  // build now also refuses outright once every unit below is exhausted
  // (see german-lesson-build.mjs) instead of silently wrapping again.
  {
    id: "a1-09-colors",
    topic: "رنگ‌ها",
    hook: "با ۵ رنگ، دنیای اطرافت را به آلمانی توصیف کن.",
    items: [
      { de: "rot", fa: "قرمز", img: "red apple close up", example: "Der Apfel ist rot. — سیب قرمز است." },
      { de: "blau", fa: "آبی", img: "clear blue sky", example: "Der Himmel ist blau. — آسمان آبی است." },
      { de: "grün", fa: "سبز", img: "green leaves plant", example: "Das Blatt ist grün. — برگ سبز است." },
      { de: "gelb", fa: "زرد", img: "yellow lemon fruit", example: "Die Zitrone ist gelb. — لیمو زرد است." },
      { de: "schwarz, weiß", fa: "سیاه، سفید", img: "black and white photo contrast", example: "Die Katze ist schwarz und weiß. — گربه سیاه و سفید است." },
    ],
  },
  {
    id: "a1-10-weekdays",
    topic: "روزهای هفته",
    hook: "برنامهٔ هفته‌ات را به آلمانی بچین.",
    items: [
      { de: "Montag, Dienstag", fa: "دوشنبه، سه‌شنبه", img: "calendar week planner desk", example: "Montag arbeite ich. — دوشنبه کار می‌کنم." },
      { de: "Mittwoch, Donnerstag", fa: "چهارشنبه، پنج‌شنبه", img: "person writing in planner", example: "Donnerstag habe ich frei. — پنج‌شنبه مرخصی دارم." },
      { de: "Freitag", fa: "جمعه", img: "friends meeting evening city", example: "Freitag treffe ich Freunde. — جمعه دوستانم را می‌بینم." },
      { de: "Samstag, Sonntag", fa: "شنبه، یکشنبه (آخر هفته)", img: "family relaxing weekend at home", example: "Am Wochenende bleibe ich zu Hause. — آخر هفته خانه می‌مانم." },
    ],
  },
  {
    id: "a1-11-time",
    topic: "ساعت و زمان",
    hook: "بدون این جمله‌ها، هیچ‌وقت نمی‌فهمی ساعت چند است.",
    items: [
      { de: "Wie spät ist es?", fa: "ساعت چند است؟", img: "person checking wristwatch", example: "Wie spät ist es? — Es ist drei Uhr. — ساعت چنده؟ — ساعت سه است." },
      { de: "Es ist ... Uhr", fa: "ساعت ... است", img: "wall clock close up", example: "Es ist acht Uhr. — ساعت هشت است." },
      { de: "halb, Viertel", fa: "نیم، ربع", img: "analog clock quarter past", example: "Es ist halb neun. — ساعت هشت‌ونیم است." },
      { de: "am Morgen, am Abend", fa: "صبح‌ها، عصرها", img: "sunrise and sunset split scene", example: "Am Morgen trinke ich Kaffee. — صبح‌ها قهوه می‌نوشم." },
    ],
  },
  {
    id: "a1-12-haben",
    topic: "فعل haben (داشتن)",
    hook: "بعد از sein، این فعل را هم باید بلد باشی.",
    items: [
      { de: "ich habe", fa: "من دارم", img: "person relaxing free time no rush", example: "Ich habe Zeit. — من وقت دارم." },
      { de: "du hast", fa: "تو داری", img: "person standing next to parked car", example: "Hast du ein Auto? — ماشین داری؟" },
      { de: "er/sie hat", fa: "او دارد", img: "person holding book reading", example: "Sie hat ein Buch. — او یک کتاب دارد." },
      { de: "wir haben", fa: "ما داریم", img: "hungry person looking at food table", example: "Wir haben Hunger. — ما گرسنه‌ایم." },
    ],
  },
  {
    id: "a1-13-food-drink",
    topic: "غذا و نوشیدنی",
    // Old hook ("اولین سفارشت در آلمان را ...") described ORDERING, but
    // this unit's items are food/drink vocabulary, not ordering phrases —
    // a1-14-cafe is the actual ordering unit. Also fixes the near-duplicate
    // "اولین سفارشت در ..." opening the two units shared.
    hook: "نان، آب، قهوه، میوه: کلمات غذا و نوشیدنی را به آلمانی بلد شو.",
    items: [
      { de: "das Brot", fa: "نان", img: "fresh bread loaf on table", example: "Ich esse Brot. — نان می‌خورم." },
      { de: "das Wasser", fa: "آب", img: "glass of water poured", example: "Ein Wasser, bitte. — یک آب، لطفاً." },
      { de: "der Kaffee, der Tee", fa: "قهوه، چای", img: "coffee and tea cups on table", example: "Ich trinke Kaffee. — من قهوه می‌نوشم." },
      { de: "das Obst, das Gemüse", fa: "میوه، سبزیجات", img: "fresh fruit and vegetables market", example: "Ich mag Obst. — من میوه دوست دارم." },
    ],
  },
  {
    id: "a1-14-cafe",
    topic: "سفارش در کافه",
    hook: "این چند جمله، اولین سفارش در کافهٔ آلمانی را آسان می‌کند.",
    items: [
      { de: "Ich möchte...", fa: "من می‌خواهم... (مؤدبانه)", img: "person ordering at cafe counter", example: "Ich möchte einen Kaffee. — من یک قهوه می‌خواهم." },
      { de: "Die Rechnung, bitte", fa: "صورت‌حساب، لطفاً", img: "restaurant bill on table", example: "Die Rechnung, bitte! — صورت‌حساب، لطفاً!" },
      { de: "Zahlen, bitte", fa: "حساب می‌کنم (محاوره‌ای)", img: "person paying at cafe register", example: "Zahlen, bitte! — می‌خوام حساب کنم!" },
      { de: "Das schmeckt gut", fa: "طعمش خوب است", img: "person enjoying meal smiling", example: "Das schmeckt sehr gut! — طعمش خیلی خوب است!" },
    ],
  },
  {
    id: "a1-15-numbers-3",
    topic: "اعداد ۱۱ تا ۲۰",
    hook: "دومین قدم شمارش به آلمانی؛ تا بیست برو.",
    items: [
      { de: "elf, zwölf", fa: "یازده، دوازده", img: "clock showing twelve oclock", example: "Es ist zwölf Uhr. — ساعت دوازده است." },
      { de: "dreizehn, vierzehn", fa: "سیزده، چهارده", img: "birthday cake with candles", example: "Ich bin vierzehn. — من چهارده سالمه." },
      { de: "fünfzehn, sechzehn", fa: "پانزده، شانزده", img: "person counting on fingers", example: "sechzehn Minuten — شانزده دقیقه" },
      { de: "siebzehn, achtzehn", fa: "هفده، هجده", img: "young adult celebrating birthday", example: "Sie ist achtzehn. — او هجده سالشه." },
      { de: "neunzehn, zwanzig", fa: "نوزده، بیست", img: "group of twenty people crowd", example: "zwanzig Euro — بیست یورو" },
    ],
  },
  {
    id: "a1-16-weather",
    topic: "آب‌وهوا",
    hook: "دربارهٔ هوا حرف زدن، بهترین شروع مکالمهٔ آلمانی است.",
    items: [
      { de: "Wie ist das Wetter?", fa: "هوا چطور است؟", img: "person looking at sky weather", example: "Wie ist das Wetter heute? — امروز هوا چطوره؟" },
      { de: "Es regnet", fa: "باران می‌بارد", img: "rain falling on street umbrella", example: "Es regnet heute. — امروز باران می‌بارد." },
      { de: "Die Sonne scheint", fa: "آفتاب می‌تابد", img: "sunny clear day outdoors", example: "Die Sonne scheint. — آفتاب می‌تابد." },
      { de: "Es ist kalt, es ist warm", fa: "سرد است، گرم است", img: "person wearing warm winter coat", example: "Es ist sehr kalt. — خیلی سرد است." },
    ],
  },
  {
    id: "a1-17-adjectives",
    topic: "صفت‌های پرکاربرد",
    // Owner report 2026-09-13: the old hook ("با این ۴ صفت، هر چیزی را
    // توصیف کن.") reused the exact "با این ۴ X، ..." template already used
    // by a1-06-family and a1-07-question-words. This unit's actual content
    // is 4 opposite-adjective PAIRS (بزرگ/کوچک, خوب/بد, نو/قدیمی,
    // سریع/آهسته), so the new hook names that real angle instead of the
    // generic count-of-words template.
    //
    // Rewritten a third time same day: with the pitch bug (see
    // lib/voice-settings.mjs) fixed, every OTHER word passed cleanly across
    // 3 fresh attempts — only the bare, isolated word «بد» still failed,
    // in both places it appeared (this hook AND lib/narration.mjs's step
    // text), heard as «بعد»/«برد» regardless of sentence position. Not a
    // sentence-final-word problem (this hook already had 5 words after it)
    // — genuinely this specific short word, in this voice. Replaced with
    // «بدیِ» (badness-of, 2 syllables, grammatically attached to the next
    // word) instead of the bare 1-syllable «بد».
    hook: "بزرگ یا کوچک، خوبی یا بدیِ هر چیزی؛ با این صفت‌های پرکاربرد امروز آشنا شو.",
    items: [
      { de: "groß, klein", fa: "بزرگ، کوچک", img: "big and small objects size comparison", example: "Das Haus ist groß. — خانه بزرگ است." },
      { de: "gut, schlecht", fa: "خوب، بد", img: "thumbs up positive reaction", example: "Das ist gut! — این خوب است!" },
      { de: "neu, alt", fa: "نو، قدیمی", img: "old and new buildings contrast", example: "Das Auto ist neu. — ماشین نو است." },
      { de: "schnell, langsam", fa: "سریع، آهسته", img: "fast train moving motion blur", example: "Der Zug ist schnell. — قطار سریع است." },
    ],
  },
  {
    id: "a1-18-shopping",
    topic: "خرید",
    hook: "اولین خرید در آلمان را با همین جمله‌ها انجام بده.",
    items: [
      { de: "Was kostet das?", fa: "این چند است؟", img: "person checking price tag shop", example: "Was kostet das? — این چند است؟" },
      { de: "Das ist zu teuer", fa: "این خیلی گران است", img: "person looking at expensive item shocked", example: "Das ist zu teuer für mich. — این برام خیلی گرونه." },
      { de: "Ich nehme das", fa: "این را برمی‌دارم", img: "person paying at store checkout", example: "Ich nehme das, bitte. — این را برمی‌دارم، لطفاً." },
      { de: "Haben Sie...?", fa: "شما ... دارید؟ (رسمی)", img: "customer asking shop assistant", example: "Haben Sie Milch? — شیر دارید؟" },
    ],
  },
  {
    id: "a1-19-directions",
    topic: "مسیر و آدرس",
    hook: "آدرس را به آلمانی یاد بگیر و راهت را پیدا کن.",
    items: [
      { de: "Wo ist...?", fa: "... کجاست؟", img: "person asking for directions street", example: "Wo ist der Bahnhof? — ایستگاه قطار کجاست؟" },
      { de: "geradeaus", fa: "مستقیم", img: "straight road path forward", example: "Gehen Sie geradeaus. — مستقیم بروید." },
      { de: "links, rechts", fa: "چپ، راست", img: "street sign pointing left right", example: "Dann links. — بعد چپ." },
      { de: "in der Nähe", fa: "نزدیک", img: "nearby location map pin", example: "Es ist in der Nähe. — نزدیک است." },
    ],
  },
  {
    id: "a1-20-countries",
    topic: "کشورها و ملیت‌ها",
    hook: "بگو اهل کجایی؛ به آلمانی.",
    items: [
      { de: "Woher kommst du?", fa: "اهل کجایی؟ (غیررسمی)", img: "two friends meeting greeting outdoors", example: "Woher kommst du? — Ich komme aus Afghanistan." },
      { de: "Ich komme aus...", fa: "من اهل ... هستم", img: "world map with pin location", example: "Ich komme aus Deutschland. — من اهل آلمانم." },
      { de: "Deutschland, Afghanistan", fa: "آلمان، افغانستان", img: "flags of different countries", example: "Ich lebe in Deutschland. — من در آلمان زندگی می‌کنم." },
      { de: "Ich spreche Deutsch", fa: "من آلمانی صحبت می‌کنم", img: "person speaking confidently conversation", example: "Ich spreche ein bisschen Deutsch. — من کمی آلمانی صحبت می‌کنم." },
    ],
  },
  {
    id: "a1-21-professions",
    topic: "شغل‌ها",
    hook: "شغلت را به آلمانی معرفی کن.",
    items: [
      { de: "Was bist du von Beruf?", fa: "شغلت چیست؟", img: "person at job interview office", example: "Was bist du von Beruf? — Ich bin Lehrer." },
      { de: "der Lehrer, die Lehrerin", fa: "معلم (مرد، زن)", img: "teacher in classroom with students", example: "Sie ist Lehrerin. — او معلم است." },
      { de: "der Arzt, die Ärztin", fa: "پزشک (مرد، زن)", img: "doctor in white coat hospital", example: "Er ist Arzt. — او پزشک است." },
      { de: "ich arbeite als...", fa: "من به‌عنوان ... کار می‌کنم", img: "person working at office desk", example: "Ich arbeite als Koch. — من به‌عنوان آشپز کار می‌کنم." },
    ],
  },
  {
    id: "a1-22-daily-routine",
    topic: "برنامهٔ روزانه",
    hook: "یک روز عادی‌ات را به آلمانی تعریف کن.",
    items: [
      { de: "ich stehe auf", fa: "من بیدار می‌شوم", img: "person waking up morning bed", example: "Ich stehe um sieben auf. — ساعت هفت بیدار می‌شوم." },
      { de: "ich gehe zur Arbeit", fa: "من سر کار می‌روم", img: "person commuting to work walking", example: "Ich gehe zur Arbeit. — سر کار می‌روم." },
      { de: "ich esse zu Mittag", fa: "من ناهار می‌خورم", img: "person eating lunch table", example: "Ich esse um zwölf zu Mittag. — ساعت دوازده ناهار می‌خورم." },
      { de: "ich gehe schlafen", fa: "من می‌خوابم", img: "person sleeping bed night", example: "Ich gehe um elf schlafen. — ساعت یازده می‌خوابم." },
    ],
  },
  {
    id: "a1-23-common-verbs",
    topic: "افعال پرکاربرد: رفتن، آمدن، انجام‌دادن",
    hook: "این سه فعل، پایهٔ اکثر جمله‌های آلمانی هستند.",
    items: [
      { de: "ich gehe, du gehst", fa: "من می‌روم، تو می‌روی", img: "person walking city street", example: "Ich gehe nach Hause. — من به خانه می‌روم." },
      { de: "ich komme, du kommst", fa: "من می‌آیم، تو می‌آیی", img: "person arriving greeting friend", example: "Ich komme sofort. — الان می‌آیم." },
      { de: "ich mache, du machst", fa: "من انجام می‌دهم، تو انجام می‌دهی", img: "person doing homework desk", example: "Was machst du? — چیکار می‌کنی؟" },
      { de: "ich sehe, ich höre", fa: "من می‌بینم، من می‌شنوم", img: "person listening music headphones", example: "Ich höre Musik. — به موسیقی گوش می‌دهم." },
    ],
  },
  {
    id: "a1-24-clothes",
    topic: "لباس",
    hook: "لباس‌هایت را به آلمانی نام ببر.",
    items: [
      { de: "die Hose, das Hemd", fa: "شلوار، پیراهن", img: "folded clothes shirt and pants", example: "Ich trage eine Hose. — شلوار می‌پوشم." },
      { de: "die Jacke", fa: "ژاکت / کاپشن", img: "person wearing jacket outdoors", example: "Die Jacke ist warm. — کاپشن گرم است." },
      { de: "die Schuhe", fa: "کفش", img: "pair of shoes on floor", example: "Meine Schuhe sind neu. — کفش‌هایم نو هستند." },
      { de: "ich trage...", fa: "من ... می‌پوشم", img: "person getting dressed mirror", example: "Ich trage heute Schwarz. — امروز مشکی می‌پوشم." },
    ],
  },
  // These topics follow the public A1 sequence in DW's Nicos Weg. The
  // vocabulary and examples are original, short lesson material rather than
  // copied course exercises.
  {
    id: "a1-25-modal-verbs",
    topic: "توانایی با können",
    hook: "می‌توانی بگویی چه کارهایی را بلدی؟ این‌جا شروع کن.",
    items: [
      { de: "Ich kann Deutsch sprechen.", fa: "من می‌توانم آلمانی صحبت کنم", img: "person speaking German in friendly conversation", example: "Ich kann Deutsch sprechen. — من می‌توانم آلمانی صحبت کنم." },
      { de: "Kannst du mir helfen?", fa: "می‌توانی به من کمک کنی؟", img: "two people helping each other indoors", example: "Kannst du mir helfen? — می‌توانی به من کمک کنی؟" },
      { de: "Ich kann nicht kommen.", fa: "من نمی‌توانم بیایم", img: "person cancelling an appointment on phone", example: "Ich kann heute nicht kommen. — من امروز نمی‌توانم بیایم." },
      { de: "Was kannst du?", fa: "چه کاری می‌توانی انجام بدهی؟", img: "friendly job interview asking about skills", example: "Was kannst du gut? — چه کاری را خوب انجام می‌دهی؟" },
    ],
  },
  {
    id: "a1-26-home",
    topic: "خانه و آپارتمان",
    hook: "از درِ آپارتمان تا اتاقت؛ خانه را درست معرفی کن.",
    items: [
      { de: "Ich wohne in ...", fa: "من در ... زندگی می‌کنم", img: "person standing at apartment building entrance", example: "Ich wohne in Berlin. — من در برلین زندگی می‌کنم." },
      { de: "die Wohnung", fa: "آپارتمان", img: "bright modern apartment living room", example: "Die Wohnung ist klein. — آپارتمان کوچک است." },
      { de: "das Zimmer", fa: "اتاق", img: "neat bedroom interior apartment", example: "Das Zimmer ist hell. — اتاق روشن است." },
      { de: "Ich bin zu Hause.", fa: "من در خانه هستم", img: "person relaxing comfortably at home", example: "Heute bin ich zu Hause. — امروز در خانه هستم." },
    ],
  },
  {
    id: "a1-27-train-station",
    topic: "قطار و ایستگاه",
    hook: "تابلوها را نمی‌فهمی؟ با این جمله‌ها سراغ قطارت برو.",
    items: [
      { de: "Wo ist der Bahnhof?", fa: "ایستگاه قطار کجاست؟", img: "traveler asking directions at German train station", example: "Entschuldigung, wo ist der Bahnhof? — ببخشید، ایستگاه قطار کجاست؟" },
      { de: "der Zug", fa: "قطار", img: "modern German train arriving at station", example: "Der Zug kommt gleich. — قطار همین حالا می‌آید." },
      { de: "Ich fahre nach ...", fa: "من به ... می‌روم", img: "traveler looking at train departure board", example: "Ich fahre nach Hamburg. — من به هامبورگ می‌روم." },
      { de: "Wann fährt der Zug?", fa: "قطار چه وقت حرکت می‌کند؟", img: "close view of train timetable at station", example: "Wann fährt der Zug? — قطار چه وقت حرکت می‌کند؟" },
    ],
  },
  {
    id: "a1-28-tickets",
    topic: "خرید بلیت",
    hook: "جلوی دستگاه بلیت مانده‌ای؟ این عبارت‌ها کار را پیش می‌برد.",
    items: [
      { de: "eine Fahrkarte", fa: "یک بلیت سفر", img: "train ticket held near ticket machine", example: "Ich brauche eine Fahrkarte. — من یک بلیت لازم دارم." },
      { de: "Hin und zurück", fa: "رفت و برگشت", img: "round trip train ticket counter", example: "Hin und zurück, bitte. — رفت و برگشت، لطفاً." },
      { de: "Wo kann ich eine Fahrkarte kaufen?", fa: "از کجا می‌توانم بلیت بخرم؟", img: "person using train station ticket kiosk", example: "Wo kann ich eine Fahrkarte kaufen? — از کجا می‌توانم بلیت بخرم؟" },
      { de: "Ich möchte ein Ticket.", fa: "من یک بلیت می‌خواهم", img: "traveler speaking to ticket office clerk", example: "Ich möchte ein Ticket nach Köln. — من یک بلیت به کلن می‌خواهم." },
    ],
  },
  {
    id: "a1-29-appointments",
    topic: "وقت‌گیری",
    hook: "قرار داکتر یا اداره داری؟ زمان دقیق را این‌گونه بپرس.",
    items: [
      { de: "Ich möchte einen Termin.", fa: "من یک وقت می‌خواهم", img: "person arranging appointment at reception desk", example: "Ich möchte einen Termin. — من یک وقت می‌خواهم." },
      { de: "Haben Sie heute Zeit?", fa: "امروز وقت دارید؟", img: "calendar appointment conversation", example: "Haben Sie heute Zeit? — امروز وقت دارید؟" },
      { de: "Um wie viel Uhr?", fa: "ساعت چند؟", img: "close view clock and appointment calendar", example: "Um wie viel Uhr ist der Termin? — وقت ساعت چند است؟" },
      { de: "Ich komme am ...", fa: "من در روز ... می‌آیم", img: "person marking date on paper calendar", example: "Ich komme am Montag. — من دوشنبه می‌آیم." },
    ],
  },
  {
    id: "a1-30-health",
    topic: "داکتر و سلامت",
    hook: "وقتی مریضی، لازم نیست دنبال لغت بگردی.",
    items: [
      { de: "Ich brauche einen Arzt.", fa: "من داکتر لازم دارم", img: "patient speaking to doctor in clinic", example: "Ich brauche einen Arzt. — من داکتر لازم دارم." },
      { de: "Ich habe Schmerzen.", fa: "درد دارم", img: "person describing pain to doctor", example: "Ich habe Schmerzen hier. — من اینجا درد دارم." },
      { de: "die Apotheke", fa: "داروخانه", img: "German pharmacy exterior green sign", example: "Wo ist die Apotheke? — داروخانه کجاست؟" },
      { de: "Ich bin krank.", fa: "من مریض هستم", img: "person resting at home with tea", example: "Ich bin heute krank. — من امروز مریض هستم." },
    ],
  },
  {
    id: "a1-31-small-talk",
    topic: "مکالمهٔ کوتاه",
    hook: "اولین گفت‌وگو را با این جمله‌های کوتاه گرم کن.",
    items: [
      { de: "Wie geht es Ihnen?", fa: "حال شما چطور است؟", img: "two people greeting politely at cafe", example: "Guten Tag, wie geht es Ihnen? — روز خوش، حال شما چطور است؟" },
      { de: "Mir geht es gut.", fa: "حال من خوب است", img: "smiling person in casual conversation", example: "Danke, mir geht es gut. — تشکر، حال من خوب است." },
      { de: "Was machen Sie?", fa: "شما چه کار می‌کنید؟", img: "friendly people talking about work", example: "Was machen Sie beruflich? — شما از نظر کاری چه کار می‌کنید؟" },
      { de: "Schönes Wetter heute.", fa: "امروز هوا خوب است", img: "two people talking outside sunny weather", example: "Schönes Wetter heute. — امروز هوا خوب است." },
    ],
  },
  {
    id: "a1-32-spelling-contact",
    topic: "املا و اطلاعات تماس",
    hook: "نام و ایمیلت را بی‌اشتباه به آلمانی بده.",
    items: [
      { de: "Wie schreibt man das?", fa: "این را چگونه می‌نویسند؟", img: "person writing a name on form", example: "Wie schreibt man das? — این را چگونه می‌نویسند؟" },
      { de: "Mein Name ist ...", fa: "نام من ... است", img: "name badge and registration form close up", example: "Mein Name ist Ali. — نام من علی است." },
      { de: "Meine E-Mail-Adresse ist ...", fa: "نشانی ایمیل من ... است", img: "person entering email address on laptop", example: "Meine E-Mail-Adresse ist ... — نشانی ایمیل من ... است." },
      { de: "Können Sie das bitte buchstabieren?", fa: "لطفاً می‌توانید آن را هجی کنید؟", img: "person spelling name on phone call", example: "Können Sie das bitte buchstabieren? — لطفاً می‌توانید آن را هجی کنید؟" },
    ],
  },
  {
    id: "a1-33-payment",
    topic: "پرداخت در فروشگاه",
    hook: "پای صندوق فروشگاه، این جمله‌ها نجاتت می‌دهد.",
    items: [
      { de: "Wie viel kostet das?", fa: "این چقدر قیمت دارد؟", img: "customer asking price in small shop", example: "Wie viel kostet das? — این چقدر قیمت دارد؟" },
      { de: "Ich möchte mit Karte zahlen.", fa: "من می‌خواهم با کارت پرداخت کنم", img: "contactless card payment terminal close up", example: "Ich möchte mit Karte zahlen. — من می‌خواهم با کارت پرداخت کنم." },
      { de: "bar oder mit Karte?", fa: "نقدی یا با کارت؟", img: "cashier asking payment method at checkout", example: "Bar oder mit Karte? — نقدی یا با کارت؟" },
      { de: "die Quittung", fa: "رسید خرید", img: "paper receipt beside shopping bag", example: "Die Quittung, bitte. — رسید خرید، لطفاً." },
    ],
  },
  {
    id: "a1-34-accusative",
    topic: "مفعول مستقیم",
    hook: "در جمله‌سازی، کلمهٔ آخر گاهی شکلش را عوض می‌کند.",
    items: [
      { de: "Ich sehe den Mann.", fa: "من آن مرد را می‌بینم", img: "person seeing man across city street", example: "Ich sehe den Mann. — من آن مرد را می‌بینم." },
      { de: "Ich kaufe die Tasche.", fa: "من آن کیف را می‌خرم", img: "customer buying handbag in store", example: "Ich kaufe die Tasche. — من آن کیف را می‌خرم." },
      { de: "Ich habe das Buch.", fa: "من آن کتاب را دارم", img: "person holding a book at desk", example: "Ich habe das Buch. — من آن کتاب را دارم." },
      { de: "Einen Kaffee, bitte.", fa: "یک قهوه، لطفاً", img: "coffee order at cafe counter", example: "Einen Kaffee, bitte. — یک قهوه، لطفاً." },
    ],
  },
  {
    id: "a1-35-separable-verbs",
    topic: "فعل‌های جداشدنی",
    hook: "چرا یک فعل آلمانی ناگهان دو تکه می‌شود؟",
    items: [
      { de: "Ich rufe dich an.", fa: "من به تو زنگ می‌زنم", img: "person making a phone call outdoors", example: "Ich rufe dich später an. — من بعدتر به تو زنگ می‌زنم." },
      { de: "Ich kaufe ein.", fa: "من خرید می‌کنم", img: "person shopping with grocery basket", example: "Ich kaufe heute ein. — من امروز خرید می‌کنم." },
      { de: "Kommst du mit?", fa: "تو هم می‌آیی؟", img: "friends inviting another friend to join", example: "Kommst du mit? — تو هم می‌آیی؟" },
      { de: "Mach bitte das Fenster auf.", fa: "لطفاً پنجره را باز کن", img: "person opening window in bright room", example: "Mach bitte das Fenster auf. — لطفاً پنجره را باز کن." },
    ],
  },
  {
    id: "a1-36-leisure",
    topic: "وقت آزاد",
    hook: "برای آخر هفته چه برنامه‌ای داری؟ این‌طور بگو.",
    items: [
      { de: "Ich spiele gern Fußball.", fa: "من فوتبال بازی کردن را دوست دارم", img: "friends playing football in park", example: "Ich spiele gern Fußball. — من فوتبال بازی کردن را دوست دارم." },
      { de: "Ich gehe spazieren.", fa: "من پیاده‌روی می‌کنم", img: "person walking in city park", example: "Am Sonntag gehe ich spazieren. — یکشنبه پیاده‌روی می‌کنم." },
      { de: "Was machst du gern?", fa: "تو چه کاری را دوست داری؟", img: "two friends chatting about hobbies", example: "Was machst du gern? — تو چه کاری را دوست داری؟" },
      { de: "Ich habe heute Zeit.", fa: "من امروز وقت دارم", img: "relaxed person checking free time on calendar", example: "Ich habe heute Zeit. — من امروز وقت دارم." },
    ],
  },
  {
    id: "a1-37-numbers-21-100",
    topic: "اعداد ۲۱ تا ۱۰۰",
    hook: "تا صد بشمار، بدون اینکه وسطش گیر کنی.",
    items: [
      { de: "einundzwanzig", fa: "بیست‌ویک", img: "house number plate twenty one on door", example: "Ich wohne in Nummer einundzwanzig. — من در شمارهٔ بیست‌ویک زندگی می‌کنم." },
      { de: "dreißig", fa: "سی", img: "price tag on shop shelf", example: "Das kostet dreißig Euro. — این سی یورو قیمت دارد." },
      { de: "fünfzig", fa: "پنجاه", img: "person holding euro banknote", example: "Hast du fünfzig Euro dabei? — پنجاه یورو همراهت داری؟" },
      { de: "hundert", fa: "صد", img: "running track distance marking", example: "Das sind ungefähr hundert Meter. — این تقریباً صد متر است." },
    ],
  },
  {
    id: "a1-38-important-numbers",
    topic: "شماره‌های ضروری",
    hook: "یک شماره هست که امیدواری هیچ‌وقت لازمش نشود.",
    items: [
      { de: "Wie ist die Notrufnummer?", fa: "شمارهٔ اورژانس چند است؟", img: "emergency call button on street pole", example: "Weißt du, wie die Notrufnummer ist? — می‌دانی شمارهٔ اورژانس چند است؟" },
      { de: "Wie ist deine Telefonnummer?", fa: "شماره تلفنت چند است؟", img: "two people exchanging phone numbers", example: "Sag mal, wie ist deine Telefonnummer? — بگو ببینم، شماره تلفنت چند است؟" },
      { de: "Ich rufe dich an.", fa: "به تو زنگ می‌زنم", img: "person making a phone call outdoors", example: "Ich rufe dich heute Abend an. — امشب به تو زنگ می‌زنم." },
      { de: "Bitte langsam!", fa: "لطفاً آهسته!", img: "person asking someone to slow down speech", example: "Bitte langsam, ich schreibe mit. — لطفاً آهسته، دارم یادداشت می‌کنم." },
    ],
  },
  {
    id: "a1-39-address",
    topic: "نشانی و آدرس",
    hook: "نشانی‌ات را طوری بگو که پست پیدایش کند.",
    items: [
      { de: "Wie ist Ihre Adresse?", fa: "نشانی شما چیست؟", img: "postal worker at apartment door", example: "Wie ist Ihre Adresse, bitte? — لطفاً نشانی شما چیست؟" },
      { de: "Ich wohne in der Bahnhofstraße.", fa: "من در خیابان بانهوف زندگی می‌کنم", img: "german street sign on building wall", example: "Ich wohne in der Bahnhofstraße, ganz oben. — من در خیابان بانهوف زندگی می‌کنم، طبقهٔ آخر." },
      { de: "Wie ist die Postleitzahl?", fa: "کد پستی چند است؟", img: "envelope with handwritten address", example: "Und wie ist die Postleitzahl von deiner Stadt? — و کد پستی شهر تو چند است؟" },
      { de: "In welcher Stadt wohnst du?", fa: "در کدام شهر زندگی می‌کنی؟", img: "city map with location pin", example: "Und in welcher Stadt wohnst du jetzt? — و حالا در کدام شهر زندگی می‌کنی؟" },
    ],
  },
  {
    id: "a1-40-authorities",
    topic: "در ادارهٔ دولتی",
    hook: "پشت باجهٔ اداره، ساکت ماندن گران تمام می‌شود.",
    items: [
      { de: "Ich habe einen Termin.", fa: "من وقت قبلی دارم", img: "person waiting at public office counter", example: "Guten Tag, ich habe einen Termin um zehn. — روز خوش، من ساعت ده وقت قبلی دارم." },
      { de: "Hier ist mein Ausweis.", fa: "این کارت شناسایی من است", img: "hand showing id card at desk", example: "Hier ist mein Ausweis und das Formular. — این کارت شناسایی من و فرم است." },
      { de: "Ich verstehe das nicht.", fa: "این را نمی‌فهمم", img: "confused person reading official form", example: "Entschuldigung, ich verstehe das Formular nicht. — ببخشید، این فرم را نمی‌فهمم." },
      { de: "Können Sie mir das erklären?", fa: "می‌توانید این را برایم توضیح دهید؟", img: "clerk explaining document to visitor", example: "Können Sie mir das bitte noch einmal erklären? — می‌توانید لطفاً یک بار دیگر این را برایم توضیح دهید؟" },
    ],
  },
  {
    id: "a1-41-what-is-this",
    topic: "این چیست؟ حرف تعریف",
    hook: "نمی‌دانی کدام حرف تعریف را بگذاری؟ یک راه ساده دارد.",
    items: [
      { de: "Was ist das?", fa: "این چیست؟", img: "person pointing at an unfamiliar object", example: "Entschuldigung, was ist das denn? — ببخشید، این دیگر چیست؟" },
      { de: "Das ist ein Stuhl.", fa: "این یک چوکی است", img: "single wooden chair in bright room", example: "Das ist ein Stuhl aus Holz. — این یک چوکی چوبی است." },
      { de: "Das ist eine Tasche.", fa: "این یک بکس است", img: "leather bag on a table", example: "Das ist eine Tasche für den Laptop. — این یک بکس برای لپ‌تاپ است." },
      { de: "Das ist ein Fenster.", fa: "این یک کلکین است", img: "bright window in a plain wall", example: "Das ist ein Fenster zum Hof. — این یک کلکین رو به حویلی است." },
    ],
  },
  {
    id: "a1-42-possession",
    topic: "مال کیست؟",
    hook: "این وسیله مال کیست؟ جوابش کوتاه‌تر از آن است که فکر می‌کنی.",
    items: [
      { de: "Wem gehört das?", fa: "این مال کیست؟", img: "lost item on a bench", example: "Wem gehört das hier auf dem Tisch? — این که روی میز است مال کیست؟" },
      { de: "Das ist mein Schlüssel.", fa: "این کلید من است", img: "hand holding a single key", example: "Warte, das ist mein Schlüssel. — صبر کن، این کلید من است." },
      { de: "Das ist dein Buch.", fa: "این کتاب توست", img: "book handed from one person to another", example: "Ich glaube, das ist dein Buch. — فکر می‌کنم این کتاب توست." },
      { de: "Das gehört mir nicht.", fa: "این مال من نیست", img: "person shaking head at an object", example: "Nein, das gehört mir nicht. — نه، این مال من نیست." },
    ],
  },
  {
    id: "a1-43-negation-kein",
    topic: "نفی با kein",
    hook: "وقتی چیزی را نداری، جمله شکل دیگری می‌گیرد.",
    items: [
      { de: "Ich habe kein Geld.", fa: "من پول ندارم", img: "empty wallet in hands", example: "Heute habe ich kein Geld dabei. — امروز پول همراهم ندارم." },
      { de: "Ich habe keine Zeit.", fa: "من وقت ندارم", img: "busy person looking at watch", example: "Tut mir leid, ich habe keine Zeit. — متأسفم، وقت ندارم." },
      { de: "Das ist kein Problem.", fa: "این مشکلی نیست", img: "two people smiling in agreement", example: "Keine Sorge, das ist kein Problem. — نگران نباش، این مشکلی نیست." },
      { de: "Ich spreche nicht gut Deutsch.", fa: "آلمانی‌ام خوب نیست", img: "learner hesitating in conversation", example: "Entschuldigung, ich spreche noch nicht gut Deutsch. — ببخشید، هنوز آلمانی‌ام خوب نیست." },
    ],
  },
  {
    id: "a1-44-furniture",
    topic: "مبل و اثاث خانه",
    hook: "اسم وسایل خانه را بلد نیستی؟ از همین چهارتا شروع کن.",
    items: [
      { de: "das Sofa", fa: "کاوچ", img: "grey sofa in a living room", example: "Das Sofa steht am Fenster. — کاوچ کنار کلکین است." },
      { de: "der Sessel", fa: "چوکی راحتی", img: "armchair next to a floor lamp", example: "Der Sessel ist sehr bequem. — چوکی راحتی خیلی راحت است." },
      { de: "der Tisch", fa: "میز", img: "wooden dining table in room", example: "Der Tisch ist aus Holz. — میز چوبی است." },
      { de: "das Bett", fa: "بستر", img: "made bed in a simple bedroom", example: "Das Bett steht neben der Tür. — بستر پهلوی دروازه است." },
    ],
  },
  {
    id: "a1-45-times-of-day",
    topic: "بخش‌های روز",
    hook: "قرارت را گذاشتی، ولی صبح بود یا شام؟",
    items: [
      { de: "am Morgen", fa: "صبح", img: "sunrise over quiet city street", example: "Am Morgen trinke ich Tee. — صبح چای می‌نوشم." },
      { de: "am Mittag", fa: "ظهر", img: "midday sun over lunch table", example: "Am Mittag esse ich mit Kollegen. — ظهر با همکاران غذا می‌خورم." },
      { de: "am Abend", fa: "شام", img: "evening city lights from window", example: "Am Abend lerne ich Deutsch. — شام آلمانی یاد می‌گیرم." },
      { de: "in der Nacht", fa: "شب", img: "quiet night street with lamps", example: "In der Nacht ist es ruhig. — شب آرام است." },
    ],
  },
  {
    id: "a1-46-weekend",
    topic: "آخر هفته",
    hook: "آخر هفته‌ات را در چند جملهٔ کوتاه تعریف کن.",
    items: [
      { de: "Am Samstag schlafe ich lange.", fa: "شنبه دیر بیدار می‌شوم", img: "person sleeping in on weekend morning", example: "Am Samstag schlafe ich lange und frühstücke spät. — شنبه دیر بیدار می‌شوم و دیر صبحانه می‌خورم." },
      { de: "Am Sonntag koche ich.", fa: "یکشنبه آشپزی می‌کنم", img: "person cooking in home kitchen", example: "Am Sonntag koche ich für meine Familie. — یکشنبه برای خانواده‌ام آشپزی می‌کنم." },
      { de: "Wir treffen Freunde.", fa: "با دوستان می‌بینیم", img: "friends meeting in a park", example: "Am Wochenende treffen wir Freunde. — آخر هفته با دوستان می‌بینیم." },
      { de: "Wie war dein Wochenende?", fa: "آخر هفته‌ات چطور بود؟", img: "two colleagues chatting on monday", example: "Sag mal, wie war dein Wochenende? — بگو ببینم، آخر هفته‌ات چطور بود؟" },
    ],
  },
  {
    id: "a1-47-making-plans",
    topic: "قرار گذاشتن",
    hook: "می‌خواهی قرار بگذاری ولی نمی‌دانی چطور بپرسی؟",
    items: [
      { de: "Hast du morgen Zeit?", fa: "فردا وقت داری؟", img: "two friends checking phone calendars", example: "Hast du morgen Zeit für einen Kaffee? — فردا برای یک قهوه وقت داری؟" },
      { de: "Wann treffen wir uns?", fa: "کی همدیگر را ببینیم؟", img: "people agreeing on meeting time", example: "Und wann treffen wir uns genau? — و دقیقاً کی همدیگر را ببینیم؟" },
      { de: "Um sieben Uhr passt mir.", fa: "ساعت هفت برایم مناسب است", img: "clock showing seven oclock", example: "Um sieben Uhr passt mir sehr gut. — ساعت هفت برایم خیلی مناسب است." },
      { de: "Abgemacht!", fa: "قبول!", img: "two people shaking hands on a deal", example: "Gut, abgemacht, bis morgen! — خوب، قبول، تا فردا!" },
    ],
  },
  {
    id: "a1-48-being-late",
    topic: "دیر رسیدن",
    hook: "دیر رسیدی؟ این جمله‌ها از عذرخواهی خشک بهترند.",
    items: [
      { de: "Ich komme zu spät.", fa: "دیر می‌رسم", img: "person hurrying along a street", example: "Ich komme leider zu spät zum Termin. — متأسفانه به قرار دیر می‌رسم." },
      { de: "Der Bus hat Verspätung.", fa: "بس تأخیر دارد", img: "passengers waiting at bus stop", example: "Der Bus hat heute zwanzig Minuten Verspätung. — بس امروز بیست دقیقه تأخیر دارد." },
      { de: "Entschuldigen Sie die Verspätung.", fa: "بابت تأخیر معذرت می‌خواهم", img: "person apologising at office reception", example: "Entschuldigen Sie bitte die Verspätung. — لطفاً بابت تأخیر معذرت می‌خواهم." },
      { de: "Ich bin gleich da.", fa: "همین حالا می‌رسم", img: "person texting while walking fast", example: "Warte kurz, ich bin gleich da. — کمی صبر کن، همین حالا می‌رسم." },
    ],
  },
  {
    id: "a1-49-dream-jobs",
    topic: "شغل رؤیایی",
    hook: "شغل رؤیایی‌ات را به زبان خودشان بگو.",
    items: [
      { de: "Was möchtest du werden?", fa: "می‌خواهی چه‌کاره شوی؟", img: "students talking about future careers", example: "Und was möchtest du später werden? — و بعدها می‌خواهی چه‌کاره شوی؟" },
      { de: "Ich möchte Ärztin werden.", fa: "می‌خواهم داکتر شوم", img: "young woman in medical coat smiling", example: "Ich möchte später Ärztin werden. — بعدها می‌خواهم داکتر شوم." },
      { de: "Mein Traumberuf ist Pilot.", fa: "شغل رؤیایی‌ام پیلوت است", img: "pilot standing near aircraft", example: "Mein Traumberuf ist Pilot bei einer Airline. — شغل رؤیایی‌ام پیلوت یک شرکت هوایی است." },
      { de: "Das finde ich interessant.", fa: "این برایم جالب است", img: "person listening with interest", example: "Diese Arbeit finde ich sehr interessant. — این کار برایم خیلی جالب است." },
    ],
  },
  {
    id: "a1-50-inside-building",
    topic: "داخل ساختمان",
    hook: "داخل ساختمان گم شدی؟ طبقه و لفت را این‌طور بپرس.",
    items: [
      { de: "Wo ist der Aufzug?", fa: "لفت کجاست؟", img: "elevator doors in office lobby", example: "Entschuldigung, wo ist hier der Aufzug? — ببخشید، لفت اینجا کجاست؟" },
      { de: "Im zweiten Stock.", fa: "در طبقهٔ دوم", img: "floor number sign in stairwell", example: "Das Büro ist im zweiten Stock. — دفتر در طبقهٔ دوم است." },
      { de: "Wo ist die Toilette?", fa: "تشناب کجاست؟", img: "restroom sign on a corridor wall", example: "Entschuldigung, wo ist die Toilette? — ببخشید، تشناب کجاست؟" },
      { de: "Nehmen Sie die Treppe.", fa: "از زینه بروید", img: "person walking up indoor staircase", example: "Nehmen Sie bitte die Treppe nach oben. — لطفاً از زینه به بالا بروید." },
    ],
  },
  {
    id: "a1-51-traffic-directions",
    topic: "سر چراغ راهنما",
    hook: "سر چراغ راهنما، راست یا چپ؟ این‌طور مسیر بگیر.",
    items: [
      { de: "An der Ampel links.", fa: "سر چراغ راهنما به چپ", img: "traffic light at a street crossing", example: "Gehen Sie an der Ampel links. — سر چراغ راهنما به چپ بروید." },
      { de: "Dann geradeaus.", fa: "بعد مستقیم", img: "straight road ahead in a city", example: "Dann immer geradeaus bis zum Platz. — بعد همیشه مستقیم تا میدان." },
      { de: "Die zweite Straße rechts.", fa: "دومین کوچه به راست", img: "corner of two city streets", example: "Nehmen Sie die zweite Straße rechts. — دومین کوچه به راست را بگیرید." },
      { de: "Ist es weit von hier?", fa: "از اینجا دور است؟", img: "person asking for directions on sidewalk", example: "Entschuldigung, ist es weit von hier? — ببخشید، از اینجا دور است؟" },
    ],
  },
  {
    id: "a1-52-groceries",
    topic: "مواد غذایی",
    hook: "سر قفسهٔ فروشگاه، نام این چیزها را لازم داری.",
    items: [
      { de: "das Brot", fa: "نان", img: "fresh bread loaves in bakery", example: "Ich kaufe jeden Tag Brot. — هر روز نان می‌خرم." },
      { de: "die Milch", fa: "شیر", img: "milk carton in supermarket fridge", example: "Die Milch ist im Kühlschrank. — شیر در یخچال است." },
      { de: "der Käse", fa: "پنیر", img: "cheese counter at grocery store", example: "Dieser Käse schmeckt sehr gut. — این پنیر خیلی مزه‌دار است." },
      { de: "die Eier", fa: "تخم‌مرغ", img: "carton of eggs on kitchen counter", example: "Wir brauchen noch Eier. — هنوز تخم‌مرغ لازم داریم." },
    ],
  },
];

// Curriculum order = teaching order; a resume/restart never skips ahead
// on its own. dayIndex is only used to keep the id deterministic if two
// runs land the same day (mirrors packsForDate's own convention).
// An example earns its place only when it SHOWS the headword in use. 33 of
// this bank's 212 items, across 19 of its 52 units, carry an "example" whose
// German half repeats `de` verbatim — a1-25's «Kannst du mir helfen?» is one.
// The slide then printed the same sentence twice and the voice track spoke the
// same German twice back to back (owner report against episode 25,
// 2026-09-19).
//
// Returns the example's German half, or null when it only repeats the head.
// Case, surrounding space and trailing sentence punctuation are ignored:
// «Ich kann Deutsch sprechen.» and the head's «Ich kann Deutsch sprechen» are
// one sentence to a listener, and the duplicate is just as audible.
export function exampleGermanFor(item) {
  const german = String(item?.example || "").split(" — ")[0].trim();
  if (!german) return null;
  const norm = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[.!?۔؟]+$/u, "")
    .replace(/\s+/g, " ");
  return norm(german) === norm(item?.de) ? null : german;
}

export function germanUnitAt(index) {
  return GERMAN_A1[((index % GERMAN_A1.length) + GERMAN_A1.length) % GERMAN_A1.length];
}
