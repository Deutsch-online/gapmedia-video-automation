// EasyDeutsch dialogue lessons (owner, 2026-10-03): every lesson is a short,
// colloquial two-person conversation in German with a small joke in each scene,
// a spoken English explanation of the phrase, and Persian (Dari) subtitles under
// everything. One scene per curriculum item, in item order. Each scene uses the
// item's own German phrase ("say") in the dialogue; the learner repeats "say".
//
// Shape: { hook: {who, de, fa}, scenes: [{ say, lines: [{who, de, fa}], en, enFa }] }
// who: "lena" | "braun". Lines stay short so the caption card never needs 3 rows.

const L = (de, fa) => ({ who: "lena", de, fa });
const B = (de, fa) => ({ who: "braun", de, fa });

export const DIALOGUES = {
  "a1-46-weekend": {
    hook: B("Lena, du siehst so ausgeschlafen aus!", "لینا، خیلی سرحال معلوم می‌شوی!"),
    scenes: [
      { say: "Am Samstag schlafe ich lange.", lines: [
        L("Am Samstag schlafe ich lange.", "شنبه دیر بیدار می‌شوم."),
        B("Wie lange?", "چقدر دیر؟"),
        L("Bis mein Kaffee kalt ist.", "تا وقتی قهوه‌ام سرد شود."),
      ], en: "\"Am Samstag\" means \"on Saturday\". \"Lange schlafen\" is to sleep in.", enFa: "«Am Samstag» یعنی «روز شنبه». «lange schlafen» یعنی تا دیر خوابیدن." },
      { say: "Am Sonntag koche ich.", lines: [
        B("Und am Sonntag?", "و یکشنبه؟"),
        L("Am Sonntag koche ich.", "یکشنبه آشپزی می‌کنم."),
        B("Dann komme ich am Sonntag!", "پس من یکشنبه می‌آیم!"),
      ], en: "After a time word, the verb comes second: \"Am Sonntag koche ich.\"", enFa: "بعد از کلمهٔ زمان، فعل در جای دوم می‌آید: «Am Sonntag koche ich.»" },
      { say: "Wir treffen Freunde.", lines: [
        L("Heute Abend? Wir treffen Freunde.", "امشب؟ با دوستان می‌بینیم."),
        B("Welche Freunde?", "کدام دوستان؟"),
        L("Sie! Sie sind eingeladen.", "شما را! شما دعوت هستید."),
      ], en: "\"Treffen\" means to meet. \"Wir treffen Freunde\": we meet friends.", enFa: "«treffen» یعنی دیدن و ملاقات کردن. «Wir treffen Freunde» یعنی با دوستان می‌بینیم." },
      { say: "Wie war dein Wochenende?", lines: [
        B("Wie war dein Wochenende?", "آخر هفته‌ات چطور بود؟"),
        L("Zu kurz. Wie immer.", "خیلی کوتاه. مثل همیشه."),
        B("Stimmt. Montag kommt immer zu früh.", "درست است. دوشنبه همیشه زود می‌آید."),
      ], en: "\"Wie war...?\" asks how something was. \"War\" is the past of \"ist\".", enFa: "«Wie war...؟» یعنی «... چطور بود؟». «war» گذشتهٔ «ist» است." },
    ],
  },
  "a1-47-making-plans": {
    hook: B("Lena, ich habe einen Plan!", "لینا، من یک نقشه دارم!"),
    scenes: [
      { say: "Hast du morgen Zeit?", lines: [
        B("Hast du morgen Zeit?", "فردا وقت داری؟"),
        L("Für Sie? Immer.", "برای شما؟ همیشه."),
        B("Super, du hilfst mir beim Umzug!", "عالی، در کوچ‌کشی کمکم می‌کنی!"),
      ], en: "\"Hast du Zeit?\" means \"do you have time?\". \"Morgen\" is tomorrow.", enFa: "«Hast du Zeit?» یعنی «وقت داری؟». «morgen» یعنی فردا." },
      { say: "Wann treffen wir uns?", lines: [
        L("Okay... wann treffen wir uns?", "خوب... کی همدیگر را ببینیم؟"),
        B("Um sechs Uhr.", "ساعت شش."),
        L("Am Abend?", "شام؟"),
        B("Nein, am Morgen!", "نه، صبح!"),
      ], en: "\"Wann treffen wir uns?\" asks for the time of a meeting. \"Wann\" means when.", enFa: "«Wann treffen wir uns?» زمان دیدار را می‌پرسد. «wann» یعنی کی." },
      { say: "Um sieben Uhr passt mir.", lines: [
        L("Um sechs? Das ist zu früh.", "شش؟ خیلی زود است."),
        L("Um sieben Uhr passt mir.", "ساعت هفت برایم مناسب است."),
        B("Gut, um sieben. Mit Kaffee.", "خوب، ساعت هفت. با قهوه."),
      ], en: "\"Das passt mir\" means \"that works for me\". Use it to agree on a time.", enFa: "«Das passt mir» یعنی «برایم مناسب است». برای قبول کردن یک وقت به کار می‌رود." },
      { say: "Abgemacht!", lines: [
        B("Und du bringst den Kuchen.", "و تو کیک را می‌آوری."),
        L("Und Sie den Kaffee.", "و شما قهوه را."),
        B("Abgemacht!", "قبول!"),
      ], en: "\"Abgemacht!\" means \"deal!\". Say it when a plan is fixed.", enFa: "«Abgemacht!» یعنی «قبول! قرارمان همین!». وقتی قرار نهایی شد، آن را می‌گوییم." },
    ],
  },
  "a1-48-being-late": {
    hook: L("Oh nein, schon so spät!", "وای نه، این‌قدر دیر شده!"),
    scenes: [
      { say: "Ich komme zu spät.", lines: [
        L("Hallo? Herr Braun? Ich komme zu spät.", "الو؟ آقای براون؟ دیر می‌رسم."),
        B("Schon wieder?", "باز هم؟"),
        L("Diesmal nur ein bisschen!", "این بار فقط کمی!"),
      ], en: "\"Zu spät\" means too late. \"Ich komme zu spät\": I'm going to be late.", enFa: "«zu spät» یعنی دیر. «Ich komme zu spät» یعنی دیر می‌رسم." },
      { say: "Der Bus hat Verspätung.", lines: [
        B("Was ist passiert?", "چه شده؟"),
        L("Der Bus hat Verspätung.", "بس تأخیر دارد."),
        B("Der Bus oder du?", "بس یا خودت؟"),
      ], en: "\"Die Verspätung\" is the delay. \"Der Bus hat Verspätung\": the bus is late.", enFa: "«die Verspätung» یعنی تأخیر. «Der Bus hat Verspätung» یعنی بس تأخیر دارد." },
      { say: "Entschuldigen Sie die Verspätung.", lines: [
        L("Entschuldigen Sie die Verspätung.", "بابت تأخیر معذرت می‌خواهم."),
        B("Kein Problem. Der Kaffee wartet.", "مشکلی نیست. قهوه منتظر است."),
        L("Der Kaffee ist geduldig.", "قهوه صبور است."),
      ], en: "\"Entschuldigen Sie\" is the polite \"excuse me\" or \"I'm sorry\".", enFa: "«Entschuldigen Sie» شکل مؤدبانهٔ «ببخشید» یا «معذرت می‌خواهم» است." },
      { say: "Ich bin gleich da.", lines: [
        B("Wo bist du jetzt?", "حالا کجا هستی؟"),
        L("Ich bin gleich da.", "همین حالا می‌رسم."),
        B("Das sagst du immer!", "همیشه همین را می‌گویی!"),
      ], en: "\"Gleich\" means in a moment. \"Ich bin gleich da\": I'll be right there.", enFa: "«gleich» یعنی همین الان، به‌زودی. «Ich bin gleich da» یعنی همین حالا می‌رسم." },
    ],
  },
  "a1-49-dream-jobs": {
    hook: B("Lena, ich hatte einen Traum!", "لینا، من یک خواب دیدم!"),
    scenes: [
      { say: "Was möchtest du werden?", lines: [
        B("Was möchtest du werden?", "می‌خواهی چه‌کاره شوی؟"),
        L("Reich.", "پولدار."),
        B("Das ist kein Beruf!", "این که شغل نیست!"),
      ], en: "\"Werden\" means to become. \"Was möchtest du werden?\": what do you want to be?", enFa: "«werden» یعنی شدن. «Was möchtest du werden?» یعنی می‌خواهی چه‌کاره شوی؟" },
      { say: "Ich möchte Ärztin werden.", lines: [
        L("Okay, okay. Ich möchte Ärztin werden.", "خوب، خوب. می‌خواهم داکتر شوم."),
        B("Super! Dann bin ich dein erster Patient.", "عالی! پس من اولین مریضت هستم."),
        L("Nur mit Termin!", "فقط با وقت قبلی!"),
      ], en: "For a woman, add -in: \"Arzt\" becomes \"Ärztin\". No article before the job.", enFa: "برای خانم‌ها «-in» اضافه می‌شود: «Arzt» می‌شود «Ärztin». قبل از نام شغل حرف تعریف نمی‌آید." },
      { say: "Mein Traumberuf ist Pilot.", lines: [
        L("Und Sie, Herr Braun?", "و شما، آقای براون؟"),
        B("Mein Traumberuf ist Pilot.", "شغل رؤیایی‌ام پیلوت است."),
        L("Aber Sie haben Angst vor Höhe!", "ولی شما از ارتفاع می‌ترسید!"),
        B("Deshalb ist es ein Traum.", "برای همین یک رؤیاست."),
      ], en: "\"Der Traumberuf\" is the dream job: \"Traum\" plus \"Beruf\".", enFa: "«der Traumberuf» یعنی شغل رؤیایی: «Traum» (رؤیا) به اضافهٔ «Beruf» (شغل)." },
      { say: "Das finde ich interessant.", lines: [
        L("Ich lerne jetzt Medizin auf YouTube.", "حالا طب را در یوتیوب یاد می‌گیرم."),
        B("Hm. Das finde ich interessant.", "هوم. این برایم جالب است."),
        L("Interessant oder gefährlich?", "جالب یا خطرناک؟"),
      ], en: "\"Ich finde das interessant\" gives your opinion: I find that interesting.", enFa: "«Ich finde das interessant» نظر شما را می‌گوید: به نظرم جالب است." },
    ],
  },
  "a1-50-inside-building": {
    hook: L("So ein großes Gebäude!", "چه ساختمان بزرگی!"),
    scenes: [
      { say: "Wo ist der Aufzug?", lines: [
        L("Entschuldigung, wo ist der Aufzug?", "ببخشید، لفت کجاست؟"),
        B("Der Aufzug ist kaputt.", "لفت خراب است."),
        L("Natürlich. Heute ist Montag.", "البته. امروز دوشنبه است."),
      ], en: "\"Der Aufzug\" is the lift or elevator. \"Wo ist...?\" asks where something is.", enFa: "«der Aufzug» یعنی لفت (آسانسور). «Wo ist...؟» یعنی ... کجاست؟" },
      { say: "Im zweiten Stock.", lines: [
        L("Und wo ist das Büro?", "و دفتر کجاست؟"),
        B("Im zweiten Stock.", "در طبقهٔ دوم."),
        L("Nur zwei? Das schaffe ich!", "فقط دو؟ از پسش برمی‌آیم!"),
      ], en: "\"Der Stock\" is the floor. \"Im zweiten Stock\": on the second floor.", enFa: "«der Stock» یعنی طبقه. «Im zweiten Stock» یعنی در طبقهٔ دوم." },
      { say: "Wo ist die Toilette?", lines: [
        L("Und... wo ist die Toilette?", "و... تشناب کجاست؟"),
        B("Im fünften Stock.", "در طبقهٔ پنجم."),
        L("Ohne Aufzug? Das ist ein Witz!", "بدون لفت؟ شوخی می‌کنید!"),
      ], en: "\"Die Toilette\" is the toilet. Polite: \"Entschuldigung, wo ist die Toilette?\"", enFa: "«die Toilette» یعنی تشناب. مؤدبانه: «ببخشید، تشناب کجاست؟»" },
      { say: "Nehmen Sie die Treppe.", lines: [
        B("Nehmen Sie die Treppe.", "از زینه بروید."),
        L("Fünf Stockwerke?", "پنج طبقه؟"),
        B("Gut für die Beine!", "برای پاها خوب است!"),
      ], en: "\"Nehmen Sie...\" is a polite instruction. \"Die Treppe\" means the stairs.", enFa: "«Nehmen Sie...» یک دستور مؤدبانه است. «die Treppe» یعنی زینه (پله)." },
    ],
  },
  "a1-51-traffic-directions": {
    hook: B("Lena, du siehst verloren aus.", "لینا، معلوم است راه را گم کرده‌ای."),
    scenes: [
      { say: "An der Ampel links.", lines: [
        L("Wo ist das Kino?", "سینما کجاست؟"),
        B("An der Ampel links.", "سر چراغ راهنما به چپ."),
        L("Links ist hier, oder?", "چپ این طرف است، نه؟"),
        B("Das andere Links!", "آن یکی چپ!"),
      ], en: "\"Die Ampel\" is the traffic light. \"Links\" means left.", enFa: "«die Ampel» یعنی چراغ راهنما. «links» یعنی چپ." },
      { say: "Dann geradeaus.", lines: [
        B("Dann geradeaus.", "بعد مستقیم."),
        L("Wie lange geradeaus?", "تا کجا مستقیم؟"),
        B("Bis du das Popcorn riechst.", "تا وقتی بوی پاپ‌کورن را بشنوی."),
      ], en: "\"Geradeaus\" means straight on. \"Dann\" means then.", enFa: "«geradeaus» یعنی مستقیم. «dann» یعنی بعد." },
      { say: "Die zweite Straße rechts.", lines: [
        B("Und dann die zweite Straße rechts.", "و بعد دومین کوچه به راست."),
        L("Die zweite. Nicht die erste.", "دومی. نه اولی."),
        B("Genau. Die erste ist ein Parkplatz.", "دقیقاً. اولی پارکینگ است."),
      ], en: "\"Die zweite Straße rechts\": the second street on the right.", enFa: "«die zweite Straße rechts» یعنی دومین کوچه به راست." },
      { say: "Ist es weit von hier?", lines: [
        L("Ist es weit von hier?", "از اینجا دور است؟"),
        B("Nein, fünf Minuten.", "نه، پنج دقیقه."),
        L("Mit dem Auto?", "با موتر؟"),
        B("Zu Fuß, Lena!", "پیاده، لینا!"),
      ], en: "\"Weit\" means far. \"Ist es weit von hier?\": is it far from here?", enFa: "«weit» یعنی دور. «Ist es weit von hier?» یعنی از اینجا دور است؟" },
    ],
  },
  "a1-52-groceries": {
    hook: L("Der Kühlschrank ist leer!", "یخچال خالی است!"),
    scenes: [
      { say: "das Brot", lines: [
        L("Wir brauchen das Brot.", "ما نان لازم داریم."),
        B("Welches Brot?", "کدام نان؟"),
        L("Egal. Hauptsache frisch!", "فرقی نمی‌کند. مهم این است که تازه باشد!"),
      ], en: "\"Das Brot\" is bread. In Germany there are more than 3,000 kinds!", enFa: "«das Brot» یعنی نان. در آلمان بیشتر از ۳۰۰۰ نوع نان هست!" },
      { say: "die Milch", lines: [
        B("Und die Milch?", "و شیر؟"),
        L("Die Milch ist für den Kaffee.", "شیر برای قهوه است."),
        B("Also brauchen wir viel Milch.", "پس شیر زیاد لازم داریم."),
      ], en: "\"Die Milch\" is milk. It is feminine: die Milch.", enFa: "«die Milch» یعنی شیر. مؤنث است: die Milch." },
      { say: "der Käse", lines: [
        L("Und der Käse?", "و پنیر؟"),
        B("Der Käse ist schon da.", "پنیر هست."),
        L("Wo?", "کجا؟"),
        B("In meinem Bauch.", "در شکم من."),
      ], en: "\"Der Käse\" is cheese. It is masculine: der Käse.", enFa: "«der Käse» یعنی پنیر. مذکر است: der Käse." },
      { say: "die Eier", lines: [
        B("Brauchen wir die Eier?", "تخم‌مرغ لازم داریم؟"),
        L("Ja, für den Kuchen.", "بله، برای کیک."),
        B("Ich liebe diesen Plan!", "عاشق این نقشه هستم!"),
      ], en: "\"Das Ei\" is one egg. Many eggs: \"die Eier\".", enFa: "«das Ei» یعنی یک تخم‌مرغ. چند تا: «die Eier»." },
    ],
  },
  "a1-53-at-the-counter": {
    hook: B("Willkommen in der Bäckerei Braun!", "به نانوایی براون خوش آمدید!"),
    scenes: [
      { say: "Was darf es sein?", lines: [
        B("Guten Tag! Was darf es sein?", "روز خوش! چه میل دارید؟"),
        L("Alles sieht so gut aus!", "همه‌چیز خیلی خوب معلوم می‌شود!"),
        B("Alles? Das ist viel.", "همه‌چیز؟ زیاد است."),
      ], en: "\"Was darf es sein?\" is what a seller says: what would you like?", enFa: "«Was darf es sein?» جملهٔ فروشنده است: چه میل دارید؟" },
      { say: "Ich hätte gern ein Brötchen.", lines: [
        L("Ich hätte gern ein Brötchen.", "یک نان کوچک می‌خواهم."),
        B("Nur eins?", "فقط یکی؟"),
        L("Für heute. Ich bin auf Diät.", "برای امروز. رژیم دارم."),
      ], en: "\"Ich hätte gern...\" is the polite way to order. It means I would like.", enFa: "«Ich hätte gern...» راه مؤدبانهٔ سفارش دادن است. یعنی «... می‌خواهم»." },
      { say: "Sonst noch etwas?", lines: [
        B("Sonst noch etwas?", "چیز دیگری هم؟"),
        L("Ja, ein Stück Schokokuchen.", "بله، یک تکه کیک شکلاتی."),
        B("Und die Diät?", "پس رژیم چه؟"),
        L("Die Diät hat heute frei.", "رژیم امروز رخصت است."),
      ], en: "\"Sonst noch etwas?\" means anything else?", enFa: "«Sonst noch etwas?» یعنی چیز دیگری هم می‌خواهید؟" },
      { say: "Das ist alles, danke.", lines: [
        L("Das ist alles, danke.", "همین کافی است، تشکر."),
        B("Vier Euro fünfzig, bitte.", "لطفاً چهار یورو و پنجاه سنت."),
        L("Für ein Brötchen?!", "برای یک نان؟!"),
        B("Und den Kuchen!", "و کیک!"),
      ], en: "\"Das ist alles\" means that's all. Say it when you finish ordering.", enFa: "«Das ist alles» یعنی همین کافی است. در پایان سفارش آن را می‌گوییم." },
    ],
  },
  "a1-54-day-trip": {
    hook: L("Ich brauche Natur. Sofort!", "به طبیعت نیاز دارم. همین حالا!"),
    scenes: [
      { say: "Wir machen einen Ausflug.", lines: [
        L("Wir machen einen Ausflug.", "ما به گشت می‌رویم."),
        B("Wohin?", "کجا؟"),
        L("In die Berge!", "به کوه!"),
        B("Mit Seilbahn, hoffentlich.", "امیدوارم با تله‌کابین."),
      ], en: "\"Der Ausflug\" is a day trip. \"Einen Ausflug machen\": to go on a trip.", enFa: "«der Ausflug» یعنی گشت یک‌روزه. «einen Ausflug machen» یعنی به گشت رفتن." },
      { say: "Wann fahren wir los?", lines: [
        B("Wann fahren wir los?", "کی حرکت می‌کنیم؟"),
        L("Um fünf Uhr.", "ساعت پنج."),
        B("Fünf Uhr gibt es auch am Morgen?", "ساعت پنج صبح هم داریم؟"),
      ], en: "\"Losfahren\" means to set off. \"Wann fahren wir los?\": when do we leave?", enFa: "«losfahren» یعنی حرکت کردن. «Wann fahren wir los?» یعنی کی حرکت می‌کنیم؟" },
      { say: "Ich nehme etwas zu essen mit.", lines: [
        B("Ich nehme etwas zu essen mit.", "کمی خوراکی با خود می‌برم."),
        L("Etwas? Das ist ein Koffer!", "کمی؟ این یک بکس سفری است!"),
        B("Für Notfälle.", "برای وقت‌های اضطراری."),
      ], en: "\"Mitnehmen\" means to take along. The \"mit\" goes to the end.", enFa: "«mitnehmen» یعنی با خود بردن. «mit» به آخر جمله می‌رود." },
      { say: "Das war ein schöner Tag.", lines: [
        L("Das war ein schöner Tag.", "روز خوبی بود."),
        B("Und der Koffer ist leer.", "و بکس خالی است."),
        L("Perfekt geplant!", "کاملاً حساب‌شده!"),
      ], en: "\"Das war...\" talks about the past. \"Ein schöner Tag\": a lovely day.", enFa: "«Das war...» دربارهٔ گذشته است. «ein schöner Tag» یعنی یک روز خوب." },
    ],
  },
  "a1-55-weather-forecast": {
    hook: B("Lena, warum hast du drei Jacken?", "لینا، چرا سه کرتی داری؟"),
    scenes: [
      { say: "Wie wird das Wetter?", lines: [
        B("Wie wird das Wetter?", "هوا چطور می‌شود؟"),
        L("Das weiß niemand in Deutschland.", "در آلمان هیچ‌کس این را نمی‌داند."),
        B("Wie wahr.", "خیلی درست."),
      ], en: "\"Wie wird das Wetter?\" asks about the weather later. \"Wird\" is future.", enFa: "«Wie wird das Wetter?» دربارهٔ هوای بعدی می‌پرسد. «wird» برای آینده است." },
      { say: "Morgen wird es kalt.", lines: [
        L("Morgen wird es kalt.", "فردا سرد می‌شود."),
        B("Wie kalt?", "چقدر سرد؟"),
        L("Drei-Jacken-kalt.", "به اندازهٔ سه کرتی سرد."),
      ], en: "\"Es wird kalt\" means it's getting cold. \"Es\" is the weather.", enFa: "«Es wird kalt» یعنی هوا سرد می‌شود. «es» اینجا همان هواست." },
      { say: "Es regnet am Nachmittag.", lines: [
        B("Es regnet am Nachmittag.", "بعدازظهر باران می‌بارد."),
        L("Und am Morgen?", "و صبح؟"),
        B("Auch. Das ist Deutschland.", "صبح هم. اینجا آلمان است."),
      ], en: "\"Es regnet\" means it's raining. \"Der Nachmittag\" is the afternoon.", enFa: "«Es regnet» یعنی باران می‌بارد. «der Nachmittag» یعنی بعدازظهر." },
      { say: "Die Sonne scheint.", lines: [
        L("Schau mal! Die Sonne scheint.", "ببین! آفتاب است."),
        B("Schnell, ein Foto!", "زود، یک عکس!"),
        L("Zu spät. Wieder Regen.", "دیر شد. باز باران."),
      ], en: "\"Die Sonne scheint\" means the sun is shining.", enFa: "«Die Sonne scheint» یعنی آفتاب می‌تابد." },
    ],
  },
  "a1-56-body-parts": {
    hook: B("Lena, warum tanzt du so komisch?", "لینا، چرا این‌قدر عجیب می‌رقصی؟"),
    scenes: [
      { say: "der Kopf", lines: [
        L("Das ist Yoga! Erst der Kopf.", "این یوگاست! اول سر."),
        B("Der Kopf nach links?", "سر به چپ؟"),
        L("Und jetzt nach rechts. Langsam!", "و حالا به راست. آهسته!"),
      ], en: "\"Der Kopf\" is the head. Masculine: der Kopf.", enFa: "«der Kopf» یعنی سر. مذکر است: der Kopf." },
      { say: "die Hand", lines: [
        L("Jetzt die Hand nach oben.", "حالا دست بالا."),
        B("Welche Hand?", "کدام دست؟"),
        L("Die Hand mit dem Kaffee nicht!", "نه دستی که قهوه دارد!"),
      ], en: "\"Die Hand\" is the hand. Two hands: \"die Hände\".", enFa: "«die Hand» یعنی دست. دو دست: «die Hände»." },
      { say: "der Rücken", lines: [
        B("Au! Mein Rücken!", "آخ! پشتم!"),
        L("Der Rücken gerade, Herr Braun!", "پشت را راست نگه دارید، آقای براون!"),
        B("Mein Rücken ist sechzig Jahre alt.", "پشت من شصت سال دارد."),
      ], en: "\"Der Rücken\" is the back. \"Mein Rücken tut weh\": my back hurts.", enFa: "«der Rücken» یعنی پشت. «Mein Rücken tut weh» یعنی پشتم درد می‌کند." },
      { say: "der Fuß", lines: [
        L("Zum Schluss: der Fuß hoch.", "در آخر: پا بالا."),
        B("Ein Fuß oder zwei?", "یک پا یا دو تا؟"),
        L("Einer reicht, sonst fallen Sie!", "یکی کافی است، وگرنه می‌افتید!"),
      ], en: "\"Der Fuß\" is the foot. Two feet: \"die Füße\".", enFa: "«der Fuß» یعنی پا. دو پا: «die Füße»." },
    ],
  },
  "a1-57-symptoms": {
    hook: L("Herr Doktor Braun, haben Sie Zeit?", "داکتر براون، وقت دارید؟"),
    scenes: [
      { say: "Ich habe Fieber.", lines: [
        L("Ich habe Fieber.", "تب دارم."),
        B("Wie hoch?", "چقدر؟"),
        L("Sehr hoch. Ich sehe Sterne.", "خیلی بلند. ستاره می‌بینم."),
      ], en: "\"Das Fieber\" is fever. \"Ich habe Fieber\": I have a fever.", enFa: "«das Fieber» یعنی تب. «Ich habe Fieber» یعنی تب دارم." },
      { say: "Mir ist schlecht.", lines: [
        L("Und mir ist schlecht.", "و حالم بد است."),
        B("Was haben Sie gegessen?", "چه خورده‌اید؟"),
        L("Nur drei Pizzas.", "فقط سه پیتزا."),
      ], en: "\"Mir ist schlecht\" means I feel sick. Say \"mir\", not \"ich\".", enFa: "«Mir ist schlecht» یعنی حالم بد است. اینجا «mir» می‌گوییم، نه «ich»." },
      { say: "Ich bin müde.", lines: [
        L("Und ich bin müde.", "و خسته‌ام."),
        B("Wann schlafen Sie?", "کی می‌خوابید؟"),
        L("Nach der Serie. Um drei.", "بعد از سریال. ساعت سه."),
      ], en: "\"Müde\" means tired. \"Ich bin müde\": I'm tired.", enFa: "«müde» یعنی خسته. «Ich bin müde» یعنی خسته‌ام." },
      { say: "Seit wann haben Sie das?", lines: [
        B("Seit wann haben Sie das?", "از کی این‌طور هستید؟"),
        L("Seit gestern Abend.", "از دیشب."),
        B("Also seit der Pizza.", "پس از وقت پیتزا."),
      ], en: "\"Seit wann?\" asks since when. The doctor always asks this.", enFa: "«Seit wann?» یعنی از کی. داکتر همیشه این را می‌پرسد." },
    ],
  },
  "a1-58-pharmacy": {
    hook: B("Apotheke Braun, guten Tag!", "دواخانهٔ براون، روز خوش!"),
    scenes: [
      { say: "Ich brauche ein Medikament.", lines: [
        L("Ich brauche ein Medikament.", "دوا لازم دارم."),
        B("Wogegen?", "برای چه؟"),
        L("Gegen Montag.", "برای دوشنبه."),
      ], en: "\"Das Medikament\" is medicine. \"Ich brauche\" means I need.", enFa: "«das Medikament» یعنی دوا. «ich brauche» یعنی لازم دارم." },
      { say: "Haben Sie etwas gegen Kopfschmerzen?", lines: [
        L("Haben Sie etwas gegen Kopfschmerzen?", "چیزی برای سردردی دارید؟"),
        B("Ja. Und weniger Handy.", "بله. و کمتر موبایل."),
        L("Nur die Tabletten, bitte.", "فقط تابلیت‌ها، لطفاً."),
      ], en: "\"Etwas gegen...\" means something for a problem. \"Kopfschmerzen\": headache.", enFa: "«etwas gegen...» یعنی چیزی برای یک مشکل. «Kopfschmerzen» یعنی سردردی." },
      { say: "Hier ist mein Rezept.", lines: [
        L("Hier ist mein Rezept.", "این نسخهٔ من است."),
        B("Das ist ein Kuchenrezept.", "این دستور پخت کیک است."),
        L("Oh. Falsche Tasche!", "اوه. بکس اشتباهی!"),
      ], en: "\"Das Rezept\" is the prescription. It also means a cooking recipe!", enFa: "«das Rezept» یعنی نسخهٔ داکتر. معنی دستور پخت غذا را هم دارد!" },
      { say: "Wie oft am Tag?", lines: [
        L("Wie oft am Tag?", "روزی چند بار؟"),
        B("Dreimal am Tag, nach dem Essen.", "روزی سه بار، بعد از غذا."),
        L("Dann esse ich dreimal. Gern!", "پس سه بار غذا می‌خورم. با کمال میل!"),
      ], en: "\"Wie oft?\" means how often. \"Dreimal am Tag\": three times a day.", enFa: "«Wie oft?» یعنی چند بار. «dreimal am Tag» یعنی روزی سه بار." },
    ],
  },
  "a1-59-perfekt-haben": {
    hook: B("Lena, du siehst kaputt aus!", "لینا، خیلی خسته معلوم می‌شوی!"),
    scenes: [
      { say: "Ich habe gearbeitet.", lines: [
        L("Ich habe gearbeitet. Zehn Stunden!", "کار کردم. ده ساعت!"),
        B("Zehn Stunden? Respekt!", "ده ساعت؟ آفرین!"),
        L("Na ja, mit Pausen.", "خوب، با وقفه‌ها."),
      ], en: "Past tense: \"haben\" plus the participle at the end: \"habe gearbeitet\".", enFa: "زمان گذشته: «haben» به اضافهٔ صفت مفعولی در آخر جمله: «habe gearbeitet»." },
      { say: "Ich habe Deutsch gelernt.", lines: [
        L("Ich habe Deutsch gelernt.", "آلمانی یاد گرفتم."),
        B("Wie lange?", "چقدر؟"),
        L("Fünf Minuten. Dann habe ich geschlafen.", "پنج دقیقه. بعد خوابیدم."),
      ], en: "\"Lernen\" becomes \"gelernt\": ge- at the start, -t at the end.", enFa: "«lernen» می‌شود «gelernt»: «ge-» در اول و «-t» در آخر." },
      { say: "Wir haben gegessen.", lines: [
        B("Und gestern Abend?", "و دیشب؟"),
        L("Wir haben gegessen. Pizza!", "غذا خوردیم. پیتزا!"),
        B("Schon wieder Pizza?", "باز هم پیتزا؟"),
      ], en: "\"Essen\" becomes \"gegessen\". Some verbs end in -en.", enFa: "«essen» می‌شود «gegessen». بعضی فعل‌ها با «-en» تمام می‌شوند." },
      { say: "Was hast du gemacht?", lines: [
        B("Und was hast du gemacht?", "و تو چه کردی؟"),
        L("Ich habe Kuchen gebacken.", "کیک پختم."),
        B("Und wo ist der Kuchen?", "پس کیک کجاست؟"),
        L("Ich habe ihn gegessen.", "خوردمش."),
      ], en: "\"Was hast du gemacht?\" asks what someone did. \"Machen\" becomes \"gemacht\".", enFa: "«Was hast du gemacht?» می‌پرسد چه کردی. «machen» می‌شود «gemacht»." },
    ],
  },
  "a1-60-perfekt-sein": {
    hook: L("Herr Braun, Sie waren gestern nicht da!", "آقای براون، شما دیروز نبودید!"),
    scenes: [
      { say: "Ich bin nach Hause gegangen.", lines: [
        B("Ich bin nach Hause gegangen.", "به خانه رفتم."),
        L("Um zehn Uhr morgens?", "ساعت ده صبح؟"),
        B("Ich habe den Schlüssel vergessen!", "کلید را فراموش کردم!"),
      ], en: "Verbs of movement use \"sein\": \"ich bin gegangen\", I went.", enFa: "فعل‌های حرکتی با «sein» می‌آیند: «ich bin gegangen» یعنی رفتم." },
      { say: "Wir sind mit dem Zug gefahren.", lines: [
        L("Wir sind mit dem Zug gefahren.", "ما با قطار رفتیم."),
        B("Wohin?", "کجا؟"),
        L("Nach Köln. Und zurück. Ohne Pause.", "به کلن. و برگشتیم. بدون وقفه."),
        B("Ihr wart nur im Zug?", "فقط در قطار بودید؟"),
      ], en: "\"Fahren\" also takes \"sein\": \"wir sind gefahren\", we went by train.", enFa: "«fahren» هم با «sein» می‌آید: «wir sind gefahren» یعنی (با وسیله) رفتیم." },
      { say: "Er ist spät gekommen.", lines: [
        L("Und Ihr Kollege?", "و همکارتان؟"),
        B("Er ist spät gekommen.", "او دیر آمد."),
        L("Wie spät?", "چقدر دیر؟"),
        B("Heute.", "امروز."),
      ], en: "\"Kommen\" becomes \"gekommen\" with \"sein\": \"er ist gekommen\".", enFa: "«kommen» با «sein» می‌شود «gekommen»: «er ist gekommen» یعنی او آمد." },
      { say: "Wo bist du gewesen?", lines: [
        B("Und du, Lena? Wo bist du gewesen?", "و تو، لینا؟ کجا بودی؟"),
        L("Hier. Ich habe auf Sie gewartet.", "همین‌جا. منتظر شما بودم."),
        B("Den ganzen Tag?", "تمام روز؟"),
      ], en: "\"Sein\" itself also uses \"sein\": \"ich bin gewesen\", I have been.", enFa: "خود «sein» هم با «sein» می‌آید: «ich bin gewesen» یعنی بوده‌ام." },
    ],
  },
};

export const dialogueFor = (unitId) => DIALOGUES[unitId] || null;
