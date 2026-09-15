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
];

// Curriculum order = teaching order; a resume/restart never skips ahead
// on its own. dayIndex is only used to keep the id deterministic if two
// runs land the same day (mirrors packsForDate's own convention).
export function germanUnitAt(index) {
  return GERMAN_A1[((index % GERMAN_A1.length) + GERMAN_A1.length) % GERMAN_A1.length];
}
