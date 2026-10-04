// EasyDeutsch as a comedy series (owner, 2026-10-04, after four reference shorts): NOT a
// lesson any more. Each episode is a short, funny, everyday German situation that people
// recognise and share (waste sorting, quiet hours on Sunday, being on time ...), told as a
// story with a hook in the first seconds, scene changes, punchlines and a cliffhanger, and it
// continues in the next episode. German is spoken by the characters and written on the picture;
// Persian is only a small subtitle. No English, no "what you learned", no photo cards.
//
// Series: «Die Nachbarn» (the neighbours). Lena has just moved into an old apartment building.
// Herr Braun lives downstairs: grumpy, secretive, always carrying a toaster. Frau Krause lives
// opposite: nosy, a bathrobe, curlers, a phone, a cat. Herr Pfeiffer is the strict man from the
// Ordnungsamt. Every episode adds a secret.

export const SERIES = {
  title: "Die Nachbarn",
  titleFa: "همسایه‌ها",
  characters: {
    lena: { name: "Lena", voice: "de-DE-KatjaNeural", speed: 1.0 },
    braun: { name: "Herr Braun", voice: "de-DE-ConradNeural", speed: 0.96, pitch: "-12Hz" },
    // Frau Krause is the old nosy neighbour: a different voice than Lena (a list: the first one the service reads), lower and slower
    krause: { name: "Frau Krause", voice: "de-DE-AmalaNeural", voices: ["de-DE-ElkeNeural", "de-DE-KlarissaNeural", "de-DE-AmalaNeural"], speed: 0.94, pitch: "-20Hz" },
    pfeiffer: { name: "Herr Pfeiffer", voice: "de-DE-KillianNeural", speed: 1.04, pitch: "+8Hz" },
  },
};

// A shot is one line of the story: who says it (voice), who is on the picture (chars), where
// (loc, a change of loc is a cut for the music), the picture (scene) and what moves (motion).
// hl: the punchline word shown in red on the caption; joke: a comic beat (a rimshot and a
// moment for the laugh); sfx: a sound at the start of the shot ("vacuum", "ring", "drill").
// The episode is not tied to a curriculum unit: the unit id is only the daily slot it fills.

// A shot has one character on the picture (who) and one or more lines. A line is spoken by
// its own character: when that is not the one on the picture it is heard from off-screen (a
// reaction shot), so the dialogue runs without dead air. L(by, say, fa, hl, extra): hl is the
// punchline word shown in red; joke: a pause before it and a step back of the music; cut: the
// line cuts in on the one before; as: the name on the caption (a voice on the phone); sfx.
export const L = (by, say, fa, hl, extra = {}) => ({ by, say, fa, hl: hl || undefined, ...extra });
const POSS = { lena: "her", krause: "her", braun: "his", pfeiffer: "his" };
const SH = (who, loc, scene, motion, lines) => ({ who, chars: [who], loc, scene, lines,
  motion: lines.some((l) => l.by === who) ? `${motion}, ${POSS[who]} mouth moving while speaking` : motion });
// the lines of a shot, also for the older shots that carry one line in the shot itself
export const linesOf = (s) => s.lines || [{ by: s.who, say: s.say, fa: s.fa, hl: s.hl, joke: s.joke, sfx: s.sfx }];

export const EPISODES = {
  "a1-54-day-trip": {
    title: "Die Ruhezeit",
    titleFa: "زمان سکوت",
    next: { de: "Wer hat den Müll falsch getrennt?", fa: "چه کسی زباله را اشتباه جدا کرد؟" },
    shots: [
      { who: "lena", chars: ["lena"], loc: "wohnzimmer", say: "Endlich Sonntag! Zeit zum Staubsaugen!", fa: "بالاخره یکشنبه! وقت جاروبرقی کشیدن!", hl: "Staubsaugen", sfx: "vacuum",
        scene: "in a bright modern living room on a sunny Sunday morning, wearing big headphones and dancing happily while holding a vacuum cleaner like a microphone",
        motion: "she dances and sings with the vacuum cleaner like a microphone, grinning, her mouth moving" },
      { who: "krause", chars: ["krause"], loc: "flur", say: "Staubsaugen? Am Sonntag?!", fa: "جاروبرقی؟ روز یکشنبه؟!", hl: "Sonntag",
        scene: "in an old apartment hallway with her ear pressed against a neighbour's door, one hand cupped behind her ear, pink hair curlers, shocked wide eyes",
        motion: "she gasps, pulls her head back from the door in shock and her eyes go wide, her mouth moving" },
      { who: "krause", chars: ["krause"], loc: "flur", say: "Siebenundachtzig Dezibel! Das ist Krieg!", fa: "هشتادوهفت دسی‌بل! این جنگ است!", hl: "Krieg",
        scene: "in an old apartment hallway holding up a smartphone with a glowing red screen in front of her face, outraged expression, pink hair curlers",
        motion: "she shakes the phone angrily at the camera and glares, her mouth moving" },
      { who: "krause", chars: ["krause"], loc: "tuer", say: "Lena! Heute ist Sonntag! Ruhezeit!", fa: "لینا! امروز یکشنبه است! زمان سکوت!", hl: "Ruhezeit",
        scene: "knocking furiously on an apartment door with her fist, furious red face, pink hair curlers, floral bathrobe, hallway light",
        motion: "she knocks on the door with her fist and shouts angrily, her mouth moving" },
      { who: "lena", chars: ["lena"], loc: "tuer", say: "Ruhezeit? Was ist das?", fa: "زمان سکوت؟ این چیست؟", hl: "Ruhezeit",
        scene: "standing in her open apartment doorway holding a vacuum cleaner, headphones around her neck, confused innocent face, hallway behind her",
        motion: "she tilts her head in confusion, shrugs and blinks innocently, her mouth moving" },
      { who: "krause", chars: ["krause"], loc: "tuer", say: "Am Sonntag schweigt Deutschland.", fa: "یکشنبه‌ها آلمان ساکت می‌شود.", hl: "schweigt", joke: true,
        scene: "in the hallway with one hand on her chest and a solemn, holy expression looking up, as if in a movie speech, pink hair curlers",
        motion: "she puts her hand on her chest, looks upward solemnly and speaks dramatically, her mouth moving" },
      { who: "lena", chars: ["lena"], loc: "tuer", say: "Aber mein Staub schweigt nicht!", fa: "ولی گرد و خاک من ساکت نمی‌شود!", hl: "Staub",
        scene: "standing in her doorway holding the vacuum cleaner like a sword, deadpan stubborn expression, one eyebrow raised",
        motion: "she lifts the vacuum cleaner like a sword with a deadpan face and says it firmly, her mouth moving" },
      { who: "krause", chars: ["krause"], loc: "tuer", say: "Moment! Das ist mein Telefon!", fa: "یک لحظه! این تلفن من است!", sfx: "ring",
        scene: "in the hallway in panic, a smartphone in her hand ringing so loudly that she nearly drops it, wide eyes, pink hair curlers",
        motion: "she fumbles with the ringing phone in panic and almost drops it, her mouth moving" },
      { who: "lena", chars: ["lena"], loc: "tuer", say: "Und das Telefon? Ist das Ruhe?", fa: "و تلفن؟ این سکوت است؟", hl: "Ruhe",
        scene: "leaning on the door frame with her arms crossed, a smug smirk and a raised eyebrow, apartment hallway behind her",
        motion: "she crosses her arms, smirks and raises an eyebrow while she asks, her mouth moving" },
      { who: "krause", chars: ["krause"], loc: "tuer", say: "Das ist ... Kultur!", fa: "این ... فرهنگ است!", hl: "Kultur", joke: true,
        scene: "caught in the hallway with a forced nervous smile, holding the phone behind her back, pink hair curlers, sweating slightly",
        motion: "she smiles a forced smile, hides the phone behind her back and stammers, her mouth moving" },
      { who: "braun", chars: ["braun"], loc: "braunTuer", say: "Pst! Ich schlafe!", fa: "هیس! من خوابیده‌ام!", hl: "schlafe",
        scene: "standing in his open apartment doorway in a dressing gown with messy sleepy hair, a large power drill in his hand, a finger to his lips",
        motion: "he puts a finger to his lips and whispers sleepily with the drill in his hand, his mouth moving" },
      { who: "lena", chars: ["lena"], loc: "tuer", say: "Herr Braun, das ist eine Bohrmaschine.", fa: "آقای براون، این یک دریل است.", hl: "Bohrmaschine",
        scene: "staring in disbelief and pointing at something off-screen, mouth half open, apartment hallway behind her",
        motion: "she points at something off-screen with a disbelieving look, her mouth moving" },
      { who: "braun", chars: ["braun"], loc: "braunTuer", say: "Das? Ein Massagegerät!", fa: "این؟ یک ماساژور!", hl: "Massagegerät", joke: true, sfx: "drill",
        scene: "in his doorway in a dressing gown, innocently holding a power drill against his own shoulder like a massager, blissful face",
        motion: "he holds the drill against his shoulder like a massager with a blissful face, his mouth moving" },
      { who: "krause", chars: ["krause"], loc: "treppe", say: "Ich rufe das Ordnungsamt!", fa: "به اداره نظم شهری زنگ می‌زنم!", hl: "Ordnungsamt",
        scene: "in the stairwell with a smartphone to her ear, a dramatic stern face, pink hair curlers and a floral bathrobe",
        motion: "she holds the phone to her ear and speaks sternly with a dramatic nod, her mouth moving" },
      { who: "braun", chars: ["braun"], loc: "braunTuer", say: "Lena ... lauf!", fa: "لینا ... فرار کن!", hl: "lauf",
        scene: "in his doorway in a dressing gown whispering urgently with wide eyes, drill in his hand, looking sideways",
        motion: "he whispers urgently, glances sideways and motions with his head to run, his mouth moving" },
      { who: "lena", chars: ["lena"], loc: "treppe", say: "Jetzt wird es laut!", fa: "حالا سروصدا شروع می‌شود!", hl: "laut",
        scene: "in the stairwell holding the vacuum cleaner like a weapon with a wild mischievous grin and a fierce look, ready for action",
        motion: "she grins wildly, raises the vacuum cleaner like a weapon and runs forward, her mouth moving" },
    ],
  },
  // ---- the daily challenge of a newcomer in Germany (owner, 2026-10-04): every episode is one real
  // situation a migrant knows, played for laughs: setup, escalation in threes, a twist, a button.
  "a1-55-weather-forecast": {
    title: "Der Termin", titleFa: "وقت اداره",
    challenge: "Anmeldung beim Bürgeramt", challengeFa: "ثبت اقامت در اداره شهر",
    next: { de: "Ein Termin beim Arzt", fa: "وقت دکتر" },
    shots: [
      SH("lena", "wohnzimmer", "sitting on a sofa with a laptop on her knees in a bright living room, a stack of official forms beside her, worried frown", "she scrolls on the laptop, frowns and gasps", [
        L("lena", "Ich muss mich anmelden. In vierzehn Tagen!", "باید اقامتم را ثبت کنم. ظرف چهارده روز!", "vierzehn")]),
      SH("lena", "wohnzimmer", "staring at a laptop screen with wide disbelieving eyes and her mouth open, hands on her cheeks", "she stares at the screen, her jaw drops and she slaps her cheeks", [
        L("lena", "Nächster Termin: in sechs Wochen.", "نزدیک‌ترین وقت: شش هفته دیگر.", "sechs Wochen"),
        L("lena", "Sechs Wochen?! Das Gesetz sagt vierzehn Tage!", "شش هفته؟! قانون می‌گوید چهارده روز!", "Gesetz", { joke: true })]),
      SH("krause", "flur", "in the apartment hallway leaning on her door frame in a floral bathrobe with pink hair curlers and a coffee cup, a knowing smirk", "she sips her coffee, smirks knowingly and raises a finger", [
        L("krause", "Ohne Termin? Dann stehst du um fünf Uhr morgens an.", "بدون وقت؟ پس ساعت پنج صبح باید توی صف بایستی.", "fünf Uhr"),
        L("lena", "Um fünf Uhr?!", "ساعت پنج؟!", "fünf", { cut: true }),
        L("krause", "Bring einen Stuhl mit. Und Brötchen.", "یک صندلی بیاور. و نان.", "Stuhl", { joke: true })]),
      SH("lena", "amt", "in the waiting hall of a government office holding a small paper queue ticket and looking up at a red number display, rows of empty chairs behind her", "she looks from the ticket up to the display and back with growing doubt", [
        L("lena", "Meine Nummer ist dreihundertsiebenundvierzig.", "شماره من سیصد و چهل و هفت است.", "dreihundertsiebenundvierzig", { sfx: "ding" }),
        L("pfeiffer", "Wir sind bei Nummer zwölf.", "ما روی شماره دوازده هستیم.", "zwölf", { joke: true, as: "Amt" })]),
      SH("pfeiffer", "amt", "behind a counter in a government office in a grey uniform jacket with round glasses and a thin moustache, a big rubber stamp in his hand, expressionless", "he looks over his glasses without moving a muscle and slowly raises one eyebrow", [
        L("pfeiffer", "Guten Tag. Haben Sie die Wohnungsgeberbestätigung?", "روز بخیر. تأییدیه موجر را دارید؟", "Wohnungsgeberbestätigung"),
        L("lena", "Die ... was?", "آن ... چی؟", "was"),
        L("pfeiffer", "Ihr Vermieter muss sie unterschreiben.", "موجر شما باید آن را امضا کند.", "Vermieter")]),
      SH("braun", "braunTuer", "in his apartment doorway in a dressing gown with messy hair holding a toaster, a suspicious squint", "he squints suspiciously and shakes his head", [
        L("braun", "Unterschrift? Heute nicht. Ich bin im Urlaub.", "امضا؟ امروز نه. من مرخصی‌ام.", "Urlaub"),
        L("lena", "Sie stehen direkt vor mir!", "شما درست جلوی من ایستاده‌اید!", "direkt", { cut: true }),
        L("braun", "Das ist mein Zwillingsbruder.", "این برادر دوقلوی من است.", "Zwillingsbruder", { joke: true })]),
      SH("braun", "braunTuer", "in his doorway with his arms crossed, a thoughtful scheming look and one eyebrow raised", "he rubs his chin, then points a finger sternly", [
        L("braun", "Ich unterschreibe. Aber am Sonntag: Ruhe!", "امضا می‌کنم. ولی یکشنبه‌ها: سکوت!", "Ruhe"),
        L("lena", "Versprochen!", "قول می‌دهم!", "Versprochen"),
        L("krause", "Sie lügt!", "او دروغ می‌گوید!", "lügt", { joke: true, gap: 0.15 })]),
      SH("pfeiffer", "amt", "at his counter raising a large rubber stamp high above a document with a stern expression", "he lifts the stamp high and brings it down firmly", [
        L("pfeiffer", "Pass. Unterschrift. Und ...", "گذرنامه. امضا. و ...", "Und"),
        L("pfeiffer", "Stempel!", "مهر!", "Stempel", { sfx: "stamp", gap: 0.4 })]),
      SH("lena", "amt", "at a counter holding a stamped document up in joy with both arms and a huge relieved smile, bright light", "she waves the document in the air and laughs with joy", [
        L("lena", "Endlich! Ich existiere offiziell!", "بالاخره! رسماً وجود دارم!", "existiere", { joke: true })]),
      SH("pfeiffer", "amt", "leaning forward over the counter with a thin sinister smile holding up a letter", "he leans forward slowly with a thin smile", [
        L("pfeiffer", "Noch etwas: der Rundfunkbeitrag.", "یک چیز دیگر: عوارض رادیو و تلویزیون.", "Rundfunkbeitrag"),
        L("lena", "Was ist das?", "این چیست؟", "das"),
        L("pfeiffer", "Eine Rechnung. Für Radio und Fernsehen.", "یک قبض. برای رادیو و تلویزیون.", "Rechnung")]),
      SH("lena", "amt", "at the counter in utter horror with both hands on her head and wide eyes", "she grabs her head in horror and stares", [
        L("lena", "Aber ich habe weder Radio noch Fernseher!", "ولی من نه رادیو دارم نه تلویزیون!", "weder"),
        L("pfeiffer", "Das ist egal.", "مهم نیست.", "egal", { joke: true, as: "Amt" })]),
    ],
  },
  "a1-56-body-parts": {
    title: "Der Arzttermin", titleFa: "وقت دکتر",
    challenge: "Termin beim Arzt", challengeFa: "وقت گرفتن از دکتر",
    next: { de: "Ein Brötchen, bitte", fa: "یک نان، لطفاً" },
    shots: [
      SH("lena", "wohnzimmer", "lying on a sofa wrapped in a blanket with a thermometer in her mouth and a red nose, tissues around her, miserable", "she sneezes weakly and sniffs miserably", [
        L("lena", "Ich bin krank. Ich rufe den Arzt an.", "من مریضم. به دکتر زنگ می‌زنم.", "krank")]),
      SH("lena", "wohnzimmer", "holding a phone to her ear, hopeful, a blanket on her shoulders and a red nose", "she holds the phone and nods hopefully", [
        L("pfeiffer", "Praxis Doktor Schmidt. Guten Tag.", "مطب دکتر اشمیت. روز بخیر.", "Praxis", { as: "Praxis", sfx: "ring" }),
        L("lena", "Ich brauche einen Termin. Heute!", "وقت می‌خواهم. امروز!", "Heute"),
        L("pfeiffer", "Der nächste Termin ist im Januar.", "نزدیک‌ترین وقت ژانویه است.", "Januar", { as: "Praxis", joke: true })]),
      SH("lena", "wohnzimmer", "on the phone with a stunned face, the blanket slipping off her shoulder, eyes wide", "her eyes go wide and her mouth falls open", [
        L("lena", "Im Januar?! Ich bin heute krank!", "در ژانویه؟! من امروز مریضم!", "heute"),
        L("pfeiffer", "Dann sind Sie im Januar gesund.", "پس در ژانویه سالم هستید.", "gesund", { as: "Praxis", joke: true })]),
      SH("lena", "wohnzimmer", "holding the phone and proudly counting on her fingers, a confident smile despite being sick", "she counts on her fingers with confidence", [
        L("pfeiffer", "Ihr Name, bitte. Buchstabieren Sie.", "اسمتان لطفاً. حروف را بگویید.", "Buchstabieren", { as: "Praxis" }),
        L("lena", "L wie Lampe. E wie Elefant.", "ل مثل لامپ. ا مثل فیل.", "Lampe"),
        L("pfeiffer", "Falsch! L wie Ludwig. E wie Emil.", "اشتباه! ل مثل لودویگ. ا مثل امیل.", "Ludwig", { as: "Praxis", joke: true })]),
      SH("krause", "praxis", "sitting on a waiting room chair in a doctor's practice in a bathrobe and curlers with a magazine, a cough into a tissue", "she coughs into a tissue and nods politely", [
        L("krause", "Guten Morgen!", "صبح بخیر!", "Morgen"),
        L("lena", "Muss man alle begrüßen?", "باید به همه سلام کرد؟", "alle"),
        L("krause", "Pflicht. Auch das Aquarium.", "اجباری است. حتی آکواریوم.", "Aquarium", { joke: true })]),
      SH("krause", "praxis", "glancing at a wall clock with a tired deadpan face, magazine on her knees", "she glances at the clock and sighs wearily", [
        L("krause", "Ich warte seit zwei Stunden.", "من دو ساعت است منتظرم.", "zwei Stunden"),
        L("lena", "Mit Termin?", "با وقت قبلی؟", "Termin"),
        L("krause", "Ja. Ohne Termin: drei.", "بله. بدون وقت: سه.", "drei", { joke: true })]),
      SH("braun", "praxis", "in a white doctor's coat with a stethoscope, a grumpy expression, a toaster on the desk beside him", "he leans in with the stethoscope and frowns", [
        L("braun", "Aha. Hals. Machen Sie: Aaa!", "آها. گلو. بگویید: آآآ!", "Aaa"),
        L("lena", "Aaaaaa!", "آآآآآ!", "Aaaaaa", { cut: true }),
        L("braun", "Zu laut. Das ist Ruhezeit!", "خیلی بلند. این زمان سکوت است!", "Ruhezeit", { joke: true })]),
      SH("braun", "praxis", "writing a prescription at a desk with a very serious expression, glasses low on his nose", "he writes slowly and looks up gravely", [
        L("braun", "Rezept: Tee, Ruhe, drei Tage Bett.", "نسخه: چای، آرامش، سه روز استراحت.", "Tee"),
        L("lena", "Das ist alles?", "همین است؟", "alles"),
        L("braun", "Und kein Staubsauger.", "و جاروبرقی ممنوع.", "Staubsauger", { joke: true })]),
      SH("lena", "wohnzimmer", "standing up on the sofa in perfect health with her arms raised happily, blanket on the floor, sunlight", "she jumps up with her arms raised happily", [
        L("lena", "Ich bin gesund! Danke, Herr Doktor!", "من سالم شدم! ممنون، آقای دکتر!", "gesund"),
        L("pfeiffer", "Ihr Termin im Januar ist bestätigt.", "وقت ژانویه شما تأیید شد.", "bestätigt", { as: "Praxis", sfx: "ring" })]),
      SH("lena", "wohnzimmer", "on the phone in comic outrage, pointing at herself to show she is healthy", "she points at herself and gestures wildly", [
        L("lena", "Aber ich bin schon gesund!", "ولی من الان سالم‌ام!", "schon"),
        L("pfeiffer", "Absagen nur schriftlich.", "لغو فقط کتبی.", "schriftlich", { as: "Praxis", joke: true })]),
    ],
  },
  "a1-57-symptoms": {
    title: "Ein Brötchen, bitte", titleFa: "یک نان، لطفاً",
    challenge: "Beim Bäcker bestellen", challengeFa: "سفارش دادن در نانوایی",
    next: { de: "Du oder Sie?", fa: "تو یا شما؟" },
    shots: [
      SH("lena", "baeckerei", "standing in front of a bakery counter full of bread and rolls with a hungry hopeful smile", "she smiles hopefully and points at the counter", [
        L("lena", "Guten Morgen! Ein Brötchen, bitte.", "صبح بخیر! یک نان کوچک، لطفاً.", "Brötchen")]),
      SH("braun", "baeckerei", "behind a bakery counter in a white baker's apron and cap with flour on his face and a grumpy look, arms crossed", "he stares unimpressed with his arms crossed", [
        L("braun", "Welches?", "کدام؟", "Welches"),
        L("lena", "Ein ... normales?", "یک ... معمولی؟", "normales"),
        L("braun", "Weizen, Roggen, Dinkel, Mehrkorn, Laugen ...", "گندم، چاودار، اسپلت، چنددانه، لوگن ...", "Laugen")]),
      SH("lena", "baeckerei", "overwhelmed in front of a huge shelf with sixty kinds of rolls, eyes spinning, hands on her head", "she looks along the shelf with spinning eyes and clutches her head", [
        L("lena", "Was ist der Unterschied?", "فرقشان چیست؟", "Unterschied"),
        L("braun", "Schrippe. Semmel. Weck. Alles Brötchen.", "شریپه. زمل. وک. همه‌اش نان کوچک.", "Brötchen", { as: "Bäcker" }),
        L("braun", "Anderer Name. Je nach Stadt.", "اسمش فرق دارد. بسته به شهر.", "Stadt", { as: "Bäcker", joke: true })]),
      SH("krause", "baeckerei", "standing in the bakery queue with a handbag, tapping her wristwatch with a huge impatient sigh, curlers", "she taps her watch and sighs hugely", [
        L("krause", "Ich habe Zeit. Ich habe ... viel Zeit.", "من وقت دارم. من ... خیلی وقت دارم.", "viel Zeit", { joke: true }),
        L("lena", "Ein Brötchen mit Körnern!", "یک نان با دانه!", "Körnern", { cut: true })]),
      SH("braun", "baeckerei", "leaning over the counter with a tired deadpan stare, holding a paper bag", "he leans forward with a deadpan stare", [
        L("braun", "Zum Mitnehmen oder hier?", "بیرون‌بر یا همین‌جا؟", "Mitnehmen"),
        L("lena", "Ja!", "بله!", "Ja"),
        L("braun", "Ja was?", "بله چی؟", "was", { joke: true })]),
      SH("lena", "baeckerei", "frozen with a nervous smile and one finger raised, sweating, searching for words", "she freezes with a nervous smile and sweats", [
        L("lena", "Hier ... zum Mitnehmen ... hier!", "همین‌جا ... بیرون‌بر ... همین‌جا!", "hier"),
        L("braun", "Drei Euro vierzig.", "سه یورو و چهل سنت.", "vierzig", { as: "Bäcker" })]),
      SH("lena", "baeckerei", "pulling a bank card out of her wallet with a proud smile, ready to pay", "she pulls out the card proudly", [
        L("lena", "Mit Karte, bitte.", "با کارت، لطفاً.", "Karte"),
        L("braun", "Nur Bargeld.", "فقط نقد.", "Bargeld", { as: "Bäcker", joke: true })]),
      SH("lena", "baeckerei", "staring at the card in her hand with a disbelieving look and one raised eyebrow", "she stares at the card and slowly raises an eyebrow", [
        L("lena", "Nur Bargeld? In diesem Jahrhundert?", "فقط نقد؟ در این قرن؟", "Jahrhundert", { joke: true }),
        L("braun", "Deutschland.", "آلمان.", "Deutschland", { as: "Bäcker" })]),
      SH("krause", "baeckerei", "pulling a wrinkled five euro bill from her handbag with a sly look", "she holds up the bill with a sly look", [
        L("krause", "Ich leihe dir fünf Euro.", "پنج یورو به تو قرض می‌دهم.", "fünf Euro"),
        L("krause", "Zinsen: ein Brötchen.", "بهره‌اش: یک نان.", "Zinsen", { joke: true })]),
      SH("lena", "strasse", "walking along a sunny street happily biting into a bread roll, a paper bag in her hand", "she bites the roll and smiles happily", [
        L("lena", "Mein erstes deutsches Brötchen!", "اولین نان آلمانی من!", "erstes"),
        L("braun", "Morgen kostet es vier Euro.", "فردا چهار یورو می‌شود.", "vier Euro", { as: "Bäcker", joke: true })]),
    ],
  },
  "a1-58-pharmacy": {
    title: "Du oder Sie?", titleFa: "تو یا شما؟",
    challenge: "Du oder Sie?", challengeFa: "تو یا شما؟",
    next: { de: "Geschlossen am Sonntag", fa: "یکشنبه تعطیل است" },
    shots: [
      SH("lena", "flur", "standing in an apartment hallway nervously rehearsing with a small bouquet of flowers, a worried smile", "she mouths words and fidgets with the flowers", [
        L("lena", "Neuer Nachbar. Soll ich du sagen oder Sie?", "همسایه جدید. «تو» بگویم یا «شما»؟", "Sie")]),
      SH("pfeiffer", "flur", "standing very stiffly in the hallway with a suitcase in a grey uniform jacket with round glasses, formal posture", "he stands rigidly and nods once", [
        L("pfeiffer", "Guten Tag. Pfeiffer. Ordnungsamt.", "روز بخیر. پایفر. اداره نظم.", "Ordnungsamt"),
        L("lena", "Hallo! Wie geht's dir?", "سلام! حالت چطور است؟", "dir", { cut: true }),
        L("pfeiffer", "Wir ... kennen uns nicht.", "ما ... همدیگر را نمی‌شناسیم.", "nicht", { joke: true })]),
      SH("lena", "flur", "wincing in embarrassment with a hand over her mouth, the bouquet drooping", "she winces and covers her mouth", [
        L("lena", "Entschuldigung! Wie geht es Ihnen?", "ببخشید! حال شما چطور است؟", "Ihnen"),
        L("pfeiffer", "Besser.", "بهتر.", "Besser", { joke: true })]),
      SH("krause", "flur", "popping out of her door in her bathrobe grinning widely with a cat in her arms", "she pops out of her door grinning and waves", [
        L("krause", "Ach, Lena! Wir sagen hier alle du!", "آه، لینا! ما اینجا همه «تو» می‌گوییم!", "du"),
        L("pfeiffer", "Nicht mit mir.", "با من نه.", "mir", { cut: true })]),
      SH("braun", "braunTuer", "in his doorway with a toaster, speaking sternly", "he lifts the toaster and speaks sternly", [
        L("braun", "Ich sage Sie zu meinem Toaster.", "من به توسترم «شما» می‌گویم.", "Toaster", { joke: true }),
        L("lena", "Wirklich?", "واقعاً؟", "Wirklich"),
        L("braun", "Respekt. Er ist älter als Sie.", "احترام. او از شما بزرگ‌تر است.", "älter")]),
      SH("lena", "flur", "scratching her head, thoughtful, with a puzzled frown", "she scratches her head and frowns thoughtfully", [
        L("lena", "Und wann sagt man du?", "و کی «تو» می‌گویند؟", "wann"),
        L("pfeiffer", "Wenn man es anbietet.", "وقتی که پیشنهادش را بدهند.", "anbietet")]),
      SH("pfeiffer", "flur", "solemnly raising a glass of water as if making a toast, formal and serious", "he raises the glass with solemn dignity", [
        L("pfeiffer", "Nach drei Jahren. Mit Zeremonie.", "بعد از سه سال. با مراسم.", "Zeremonie", { joke: true }),
        L("krause", "Mit Sekt!", "با شامپاین!", "Sekt")]),
      SH("lena", "flur", "bursting with a mischievous idea, grinning and holding up one finger", "she grins mischievously and raises a finger", [
        L("lena", "Okay! Herr Pfeiffer, wir machen die Zeremonie jetzt!", "باشه! آقای پایفر، مراسم را همین الان برگزار می‌کنیم!", "jetzt")]),
      SH("pfeiffer", "flur", "in horror, trembling slightly and pulling at his collar", "he trembles and pulls at his collar", [
        L("pfeiffer", "Heute? Das ist nicht vorgesehen.", "امروز؟ این پیش‌بینی نشده است.", "vorgesehen"),
        L("lena", "Ich bin Lena. Und du?", "من لینا هستم. و تو؟", "du", { cut: true })]),
      SH("pfeiffer", "flur", "slowly pushing his glasses up with a trembling hand, a tiny reluctant smile appearing", "he pushes up his glasses and a tiny smile appears", [
        L("pfeiffer", "... Hans.", "... هانس.", "Hans", { joke: true }),
        L("krause", "Er hat ihr das Du angeboten!", "او «تو» را به او پیشنهاد داد!", "Du", { gap: 0.3 })]),
    ],
  },
  "a1-59-perfekt-haben": {
    title: "Sonntag: alles zu", titleFa: "یکشنبه: همه چیز بسته",
    challenge: "Einkaufen am Sonntag", challengeFa: "خرید در روز یکشنبه",
    next: { de: "Der Brief", fa: "نامه" },
    shots: [
      SH("lena", "kueche", "standing in front of an open empty fridge with a sad face holding an empty milk carton, kitchen in the morning light", "she stares into the empty fridge and sags", [
        L("lena", "Sonntag. Keine Milch. Kein Brot. Nichts.", "یکشنبه. شیر نیست. نان نیست. هیچ.", "Nichts")]),
      SH("lena", "strasse", "standing in front of a closed supermarket with its shutters down, pulling the locked door handle in desperation", "she pulls the door handle and rattles it", [
        L("lena", "Geschlossen? Der Supermarkt ist geschlossen?", "بسته؟ سوپرمارکت بسته است؟", "geschlossen"),
        L("krause", "Sonntag! Das ist Gesetz!", "یکشنبه! این قانون است!", "Gesetz", { gap: 0.15 })]),
      SH("krause", "fenster", "leaning out of a window above with a shopping net bag full of food and a smug superior smile, pink curlers", "she leans out smugly and swings the full bag", [
        L("krause", "Ich kaufe immer am Samstag.", "من همیشه شنبه‌ها خرید می‌کنم.", "Samstag"),
        L("krause", "Für den ganzen Sonntag. Und Montag.", "برای تمام یکشنبه. و دوشنبه.", "Montag", { joke: true })]),
      SH("lena", "strasse", "looking up with narrowed eyes and a determined fierce expression", "she looks up and narrows her eyes", [
        L("lena", "Hast du vielleicht ein bisschen Milch?", "تو شاید کمی شیر داری؟", "Milch"),
        L("krause", "Milch? Das kostet dich einen Gefallen.", "شیر؟ این یک لطف از تو می‌خواهد.", "Gefallen", { joke: true })]),
      SH("braun", "braunTuer", "in his doorway proudly holding a loaf of old dry bread like a treasure", "he holds the bread up like a treasure", [
        L("braun", "Ich habe Brot. Von letzter Woche.", "من نان دارم. از هفته پیش.", "letzter Woche", { joke: true }),
        L("lena", "Danke, nein.", "ممنون، نه.", "nein")]),
      SH("lena", "tankstelle", "inside a bright petrol station shop holding a single cucumber and staring at a price label with wide eyes", "she holds up the cucumber and stares at the price", [
        L("lena", "Die Tankstelle hat offen! Endlich!", "پمپ بنزین باز است! بالاخره!", "offen"),
        L("lena", "Eine Gurke. Fünf Euro?!", "یک خیار. پنج یورو؟!", "Gurke", { joke: true })]),
      SH("pfeiffer", "tankstelle", "behind a petrol station counter in a cap, deadpan, wearing a grey uniform jacket", "he stares deadpan without moving", [
        L("pfeiffer", "Sonntagspreis.", "قیمت یکشنبه.", "Sonntagspreis"),
        L("lena", "Das ist Raub!", "این دزدی است!", "Raub", { cut: true }),
        L("pfeiffer", "Das ist Service.", "این خدمات است.", "Service", { joke: true })]),
      SH("lena", "strasse", "walking home in the evening carrying a paper bag with a cucumber and a milk carton proudly, defeated but smiling", "she walks proudly with the bag and sighs", [
        L("lena", "Gurke und Milch. Zusammen neun Euro.", "خیار و شیر. روی هم نه یورو.", "neun Euro"),
        L("lena", "Morgen kaufe ich für eine Woche!", "فردا برای یک هفته خرید می‌کنم!", "Woche")]),
      SH("lena", "supermarkt", "standing at a supermarket entrance on Monday morning with a huge shopping cart and an excited grin", "she grips the cart and grins excitedly", [
        L("lena", "Montag! Alles ist offen!", "دوشنبه! همه‌چیز باز است!", "Montag"),
        L("krause", "Ich bin schon seit sieben Uhr hier.", "من از ساعت هفت اینجا هستم.", "sieben Uhr", { joke: true })]),
      SH("pfeiffer", "supermarkt", "at the supermarket entrance holding out a white envelope with a grim face", "he holds out the envelope with a grim face", [
        L("pfeiffer", "Frau Lena? Ein Brief. Vom Rundfunk.", "خانم لینا؟ یک نامه. از رادیو و تلویزیون.", "Rundfunk"),
        L("lena", "Nein ...", "نه ...", "Nein", { joke: true })]),
    ],
  },
  "a1-60-perfekt-sein": {
    title: "Der Brief", titleFa: "نامه",
    challenge: "Der Brief vom Amt", challengeFa: "نامه اداری",
    next: { de: "Das Pfand", fa: "پول بطری" },
    shots: [
      SH("lena", "wohnzimmer", "sitting at a table with a big white official letter in front of her, hands trembling around a cup of tea", "she stares at the letter and her hands tremble", [
        L("lena", "Sechs Seiten. Sechs! Für ein Radio.", "شش صفحه. شش! برای یک رادیو.", "Sechs"),
        L("lena", "Ich lese die erste Zeile ...", "خط اول را می‌خوانم ...", "erste Zeile")]),
      SH("lena", "wohnzimmer", "reading with a deeply confused squint, a finger following the line, mouth open", "she follows the line with her finger and squints", [
        L("lena", "Rundfunkbeitragsbefreiungsantragsformular?", "فرم درخواست معافیت از عوارض رادیو و تلویزیون؟", "Rundfunkbeitragsbefreiungsantragsformular"),
        L("lena", "Das ist ein Wort?!", "این یک کلمه است؟!", "Wort", { joke: true })]),
      SH("krause", "flur", "in the hallway holding a letter by one corner like it is contaminated, reading over her glasses, curlers", "she holds the letter at arm's length and peers at it", [
        L("krause", "Gib her. Ich habe das schon gelesen.", "بده. من این را قبلاً خوانده‌ام.", "gelesen"),
        L("lena", "Wann?", "کی؟", "Wann"),
        L("krause", "Gestern. Es lag im Treppenhaus.", "دیروز. توی راه‌پله بود.", "Treppenhaus", { joke: true })]),
      SH("pfeiffer", "flur", "in the hallway standing officially with a clipboard, serious expression", "he taps the clipboard and speaks officially", [
        L("pfeiffer", "Frist: vierzehn Tage. Danach: Mahnung.", "مهلت: چهارده روز. بعد از آن: اخطار.", "Mahnung"),
        L("lena", "Mahnung?", "اخطار؟", "Mahnung"),
        L("pfeiffer", "Danach: Mahnung der Mahnung.", "بعد از آن: اخطارِ اخطار.", "Mahnung der Mahnung", { joke: true })]),
      SH("braun", "braunTuer", "grumpy in his doorway beside a tower of unopened letters taller than himself", "he gestures toward the letter tower grumpily", [
        L("braun", "Ich öffne keine Briefe.", "من هیچ نامه‌ای را باز نمی‌کنم.", "keine"),
        L("lena", "Nie?", "هرگز؟", "Nie"),
        L("braun", "Seit zwölf Jahren. Mir geht es gut.", "از دوازده سال پیش. حالم خوب است.", "zwölf Jahren", { joke: true })]),
      SH("lena", "wohnzimmer", "with a spark of an idea, raising a finger, eyes bright", "she jumps up with a spark in her eyes and raises a finger", [
        L("lena", "Ich rufe an! Es gibt eine Hotline!", "زنگ می‌زنم! یک خط تلفن هست!", "Hotline")]),
      SH("lena", "wohnzimmer", "holding a phone to her ear with a hopeful big smile", "she holds the phone and smiles hopefully", [
        L("pfeiffer", "Ihre Wartezeit beträgt vierzig Minuten.", "زمان انتظار شما چهل دقیقه است.", "vierzig", { as: "Hotline" }),
        L("lena", "Vierzig Minuten?!", "چهل دقیقه؟!", "Vierzig")]),
      SH("lena", "wohnzimmer", "wearing headphones with a phone on her ear, tapping her fingers on the table, bored, a clock behind her", "she taps the table with bored fingers and sighs", [
        L("pfeiffer", "Drücken Sie die Eins für Deutsch.", "یک را برای آلمانی فشار دهید.", "Eins", { as: "Hotline" }),
        L("lena", "Eins!", "یک!", "Eins"),
        L("pfeiffer", "Drücken Sie die Zwei für Deutsch.", "دو را برای آلمانی فشار دهید.", "Zwei", { as: "Hotline", joke: true })]),
      SH("lena", "wohnzimmer", "hopeful, the phone on her ear, her eyes brightening", "her eyes brighten and she sits up", [
        L("pfeiffer", "Guten Tag, hier ist der Rundfunk.", "روز بخیر، اینجا رادیو و تلویزیون است.", "Rundfunk", { as: "Hotline" }),
        L("lena", "Endlich! Ich möchte befreit werden!", "بالاخره! می‌خواهم معاف شوم!", "befreit")]),
      SH("lena", "wohnzimmer", "stunned with the phone slowly sinking from her ear", "she lowers the phone slowly in disbelief", [
        L("pfeiffer", "Dafür brauchen Sie ein Formular.", "برای آن به یک فرم نیاز دارید.", "Formular", { as: "Hotline" }),
        L("lena", "Welches?", "کدام؟", "Welches"),
        L("pfeiffer", "Das steht im Brief.", "در نامه نوشته شده.", "Brief", { as: "Hotline", joke: true })]),
      SH("lena", "wohnzimmer", "staring directly into the camera with a long deadpan stare, the letter in her hand", "she stares at the camera deadpan without blinking", [
        L("lena", "Der Brief steht im Brief.", "نامه در نامه نوشته شده.", "Brief"),
        L("braun", "Willkommen im Club.", "به باشگاه خوش آمدید.", "Club", { joke: true })]),
    ],
  },
  "a1-61-war-hatte": {
    title: "Das Pfand", titleFa: "پول بطری",
    challenge: "Flaschen zurückgeben (Pfand)", challengeFa: "پس دادن بطری (پفند)",
    next: { de: "Die Hausversammlung", fa: "جلسه ساختمان" },
    shots: [
      SH("lena", "kueche", "holding two plastic bottles in the kitchen and smiling hopefully", "she holds the bottles up and smiles", [
        L("lena", "Zwei Flaschen. Pfand: fünfzig Cent!", "دو بطری. پفند: پنجاه سنت!", "fünfzig Cent"),
        L("lena", "Ich bin reich!", "من پولدارم!", "reich", { joke: true })]),
      SH("braun", "keller", "in a basement room filled to the ceiling with towers of empty bottles, standing proudly in a dressing gown", "he spreads his arms proudly in front of the bottles", [
        L("braun", "Zwei? Ich habe vierhundert.", "دو؟ من چهارصد تا دارم.", "vierhundert"),
        L("lena", "Vierhundert?!", "چهارصد؟!", "Vierhundert"),
        L("braun", "Hundert Euro. Mein Rentenplan.", "صد یورو. برنامه بازنشستگی من.", "Rentenplan", { joke: true })]),
      SH("krause", "keller", "pointing at a bottle on a basement shelf angrily with her hands on her hips, curlers", "she points angrily at the bottle and stamps her foot", [
        L("krause", "Die Flasche da ist meine!", "آن بطری مال من است!", "meine"),
        L("braun", "Beweisen Sie das!", "ثابتش کنید!", "Beweisen", { cut: true }),
        L("krause", "Mein Lippenstift ist dran!", "رژ لب من رویش است!", "Lippenstift", { joke: true })]),
      SH("lena", "supermarkt", "standing at a bottle return machine in a supermarket holding a big bag of bottles with a determined smile", "she holds up the bag and smiles confidently", [
        L("lena", "Der Automat nimmt alle Flaschen.", "دستگاه همه بطری‌ها را می‌گیرد.", "Automat"),
        L("lena", "Los geht's!", "شروع کنیم!", "Los")]),
      SH("braun", "supermarkt", "feeding a bottle into a machine looking nervous, a mountain of bottles in several shopping carts beside him", "he pushes a bottle into the machine nervously", [
        L("braun", "Die Maschine mag meine Flaschen nicht.", "دستگاه بطری‌های من را دوست ندارد.", "mag"),
        L("pfeiffer", "Fehler. Flasche nicht erkannt.", "خطا. بطری شناسایی نشد.", "erkannt", { as: "Automat" })]),
      SH("braun", "supermarkt", "kissing a bottle then wiping it on his sleeve and trying again with a hopeful face", "he kisses the bottle, wipes it and tries again", [
        L("braun", "Komm schon ... Mein Schatz.", "بیا دیگه ... عزیزم.", "Schatz", { joke: true }),
        L("pfeiffer", "Fehler.", "خطا.", "Fehler", { as: "Automat" })]),
      SH("krause", "supermarkt", "behind him in the queue with her arms crossed, tapping her foot and looking at her watch, curlers", "she taps her foot and glares at her watch", [
        L("krause", "Es gibt eine Schlange, Herr Braun!", "یک صف هست، آقای براون!", "Schlange"),
        L("braun", "Dann stellen Sie sich an.", "پس شما هم در صف بایستید.", "stellen", { joke: true })]),
      SH("lena", "supermarkt", "watching sideways with a hand over her mouth to hide her laughter", "she hides her laughter behind her hand", [
        L("braun", "Und die Dose?", "و قوطی؟", "Dose"),
        L("lena", "Kein Pfand. Das ist ... Bohnen.", "پفند ندارد. این ... لوبیاست.", "Bohnen", { joke: true })]),
      SH("pfeiffer", "supermarkt", "stepping in with his clipboard and a stern face", "he steps forward and raises his clipboard", [
        L("pfeiffer", "Vierhundert Flaschen? Haben Sie ein Gewerbe?", "چهارصد بطری؟ کسب‌وکار ثبت‌شده دارید؟", "Gewerbe"),
        L("braun", "Das ist ... mein Hobby.", "این ... سرگرمی من است.", "Hobby", { joke: true })]),
      SH("braun", "supermarkt", "grinning triumphantly holding up a printed receipt and cash", "he waves the receipt and the cash triumphantly", [
        L("braun", "Der Automat zahlt! Einhundert Euro!", "دستگاه پول می‌دهد! صد یورو!", "zahlt"),
        L("braun", "Ich kaufe ... einen Toaster.", "من ... یک توستر می‌خرم.", "Toaster", { joke: true, gap: 0.5 })]),
    ],
  },
};
