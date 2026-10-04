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
    lena: { name: "Lena", voice: "de-DE-KatjaNeural" },
    braun: { name: "Herr Braun", voice: "de-DE-ConradNeural" },
    krause: { name: "Frau Krause", voice: "de-DE-AmalaNeural" },
    pfeiffer: { name: "Herr Pfeiffer", voice: "de-DE-KillianNeural" },
  },
};

// A shot is one line of the story: who says it (voice), who is on the picture (chars), where
// (loc, a change of loc is a cut for the music), the picture (scene) and what moves (motion).
// hl: the punchline word shown in red on the caption; joke: a comic beat (a rimshot and a
// moment for the laugh); sfx: a sound at the start of the shot ("vacuum", "ring", "drill").
// The episode is not tied to a curriculum unit: the unit id is only the daily slot it fills.

// compact shot builder: S(who, loc, say, fa, hl, scene, motion, extra)
const S = (who, loc, say, fa, hl, scene, motion, extra = {}) => ({ who, chars: [who], loc, say, fa, hl, scene, motion: `${motion}, ${who === "lena" ? "her" : who === "krause" ? "her" : "his"} mouth moving`, ...extra });
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
  "a1-55-weather-forecast": {
    title: "Der Beamte", titleFa: "مأمور",
    next: { de: "Was ist in der Mülltonne?", fa: "داخل سطل زباله چیست؟" },
    shots: [
      S("krause", "treppe", "Er kommt! Der Mann vom Ordnungsamt!", "او می‌آید! مرد اداره نظم!", "Ordnungsamt", "on the stairs of an old apartment building, whispering excitedly with a hand beside her mouth, pink hair curlers, floral bathrobe", "she whispers excitedly and looks down the stairs"),
      S("pfeiffer", "tuer", "Guten Tag. Ich bin Herr Pfeiffer.", "روز بخیر. من آقای پایفر هستم.", "Pfeiffer", "standing very straight in an apartment hallway in a grey uniform jacket with a clipboard, stern face, thin moustache, small round glasses", "he nods stiffly and adjusts his glasses"),
      S("pfeiffer", "tuer", "Es gibt eine Beschwerde. Wegen Lärm.", "یک شکایت هست. درباره سروصدا.", "Lärm", "holding up a clipboard with a serious face in a hallway, one eyebrow raised", "he taps the clipboard with a pen and frowns"),
      S("lena", "tuer", "Lärm? Ich? Nie!", "سروصدا؟ من؟ هرگز!", "Nie", "standing in her apartment doorway with an angelic innocent smile, hands behind her back, vacuum cleaner hidden behind the door", "she smiles sweetly and shakes her head", {joke: true}),
      S("krause", "treppe", "Siebenundachtzig Dezibel, Herr Pfeiffer!", "هشتادوهفت دسی‌بل، آقای پایفر!", "Siebenundachtzig", "on the stairs holding up her smartphone proudly like evidence, pink hair curlers", "she holds up the phone proudly and nods"),
      S("pfeiffer", "tuer", "Ich messe. Bitte seien Sie leise.", "من اندازه می‌گیرم. لطفاً ساکت باشید.", "leise", "in the hallway holding a small noise meter device in front of him, stern concentrated face", "he holds the meter out and listens very seriously"),
      S("lena", "tuer", "Ich sage nichts. Gar nichts.", "من چیزی نمی‌گویم. هیچ چیز.", "nichts", "standing in the doorway pressing both lips together tightly, wide innocent eyes", "she presses her lips together and slowly nods"),
      S("braun", "braunTuer", "Pst! Keine Panik! Ich habe einen Plan!", "هیس! وحشت نکنید! من نقشه دارم!", "Plan", "peeking out of his apartment door with a toaster under one arm, messy hair, suspicious look", "he peeks out and whispers with a conspiratorial look", {sfx: "tick"}),
      S("pfeiffer", "tuer", "Was ist das? Ein Toaster?", "این چیست؟ یک توستر؟", "Toaster", "in the hallway squinting at something off-screen, leaning forward with his clipboard", "he leans forward and squints suspiciously"),
      S("braun", "braunTuer", "Das ist ... Kunst!", "این ... هنر است!", "Kunst", "in his doorway holding the toaster proudly above his head like a trophy, serious face", "he lifts the toaster like a trophy with a proud face", {joke: true}),
      S("pfeiffer", "tuer", "Morgen komme ich wieder.", "فردا دوباره می‌آیم.", "wieder", "in the hallway turning away with his clipboard under his arm, one last stern look over his shoulder", "he turns on his heel and glances back sternly", {sfx: "sting"}),
    ],
  },
  "a1-56-body-parts": {
    title: "Die Mülltonne", titleFa: "سطل زباله",
    next: { de: "Wem gehört das Paket?", fa: "این بسته مال کیست؟" },
    shots: [
      S("pfeiffer", "hof", "Guten Morgen. Ich kontrolliere den Müll.", "صبح بخیر. من زباله را بررسی می‌کنم.", "Müll", "in a courtyard next to a row of colourful waste bins, wearing grey uniform jacket and gloves, holding a clipboard", "he snaps on a glove and looks into a bin sternly"),
      S("pfeiffer", "hof", "Gelb, blau, grün, braun. Alles muss stimmen.", "زرد، آبی، سبز، قهوه‌ای. همه چیز باید درست باشد.", "stimmen", "pointing at four coloured bins one after another with a pen, strict expression", "he points along the bins with his pen"),
      S("lena", "hof", "Welche Tonne ist für Pizzakartons?", "کارتن پیتزا مال کدام سطل است؟", "Pizzakartons", "standing in the courtyard holding a greasy pizza box in both hands, confused honest face", "she holds up the pizza box and tilts her head"),
      S("pfeiffer", "hof", "Pizzakarton? Das ist Restmüll!", "کارتن پیتزا؟ این زباله باقی‌مانده است!", "Restmüll", "in the courtyard gasping dramatically with a hand on his chest as if hearing a crime", "he gasps and clutches his chest", {joke: true}),
      S("krause", "fenster", "Ich sehe alles! Von hier oben!", "من همه چیز را می‌بینم! از اینجا بالا!", "alles", "leaning out of an apartment window with binoculars, pink hair curlers, floral bathrobe, a cat beside her", "she looks through the binoculars and points downward"),
      S("krause", "fenster", "Herr Braun wirft ein Brot in die Tonne!", "آقای براون یک نان را در سطل می‌اندازد!", "Brot", "at the window pointing with a shocked face, binoculars hanging around her neck", "she points down in outrage", {sfx: "ring"}),
      S("braun", "hof", "Das ist kein Brot. Das ist ... Dünger.", "این نان نیست. این ... کود است.", "Dünger", "standing at the waste bins in a dressing gown holding a loaf of bread behind his back, shifty eyes", "he hides the bread behind his back and looks around shiftily"),
      S("pfeiffer", "hof", "Dünger? In der gelben Tonne?", "کود؟ در سطل زرد؟", "gelben", "in the courtyard lifting the lid of a yellow bin with two fingers, disgusted frown", "he lifts the lid slowly and recoils"),
      S("lena", "hof", "Ich glaube, da ist noch was drin.", "فکر می‌کنم چیز دیگری هم آنجاست.", "drin", "looking down into a waste bin, curious, leaning over the rim, one hand on the lid", "she leans over the bin and peers inside"),
      S("braun", "hof", "Nicht anfassen! Das ist mein Toaster!", "دست نزنید! این توستر من است!", "Toaster", "in the courtyard lunging forward with outstretched arms in panic, wide eyes", "he lunges forward with outstretched arms in panic", {joke: true, sfx: "pop"}),
    ],
  },
  "a1-57-symptoms": {
    title: "Das Paket", titleFa: "بسته",
    next: { de: "Wer kommt zu spät?", fa: "چه کسی دیر می‌رسد؟" },
    shots: [
      S("lena", "tuer", "Ein Paket! Für Herrn Braun? Wieder?", "یک بسته! برای آقای براون؟ دوباره؟", "Paket", "in her apartment doorway holding a big brown cardboard parcel with both arms, curious surprised face", "she shakes the parcel gently next to her ear and frowns"),
      S("lena", "tuer", "Es tickt. Es tickt wirklich.", "تیک‌تیک می‌کند. واقعاً تیک‌تیک می‌کند.", "tickt", "holding the parcel close to her ear with wide worried eyes", "she freezes and her eyes grow wide", {sfx: "tick"}),
      S("krause", "flur", "Eine Bombe! Ich rufe die Polizei!", "یک بمب! به پلیس زنگ می‌زنم!", "Bombe", "in the hallway in panic with both hands on her cheeks and a phone, pink hair curlers", "she screams silently with hands on her cheeks and wide eyes"),
      S("lena", "tuer", "Frau Krause, ruhig! Wir fragen ihn.", "خانم کراوزه، آرام! از او می‌پرسیم.", "ruhig", "calmly holding up one hand in a stop gesture, the parcel under her other arm, hallway behind her", "she raises a calming hand and nods"),
      S("braun", "braunTuer", "Mein Paket! Endlich!", "بسته من! بالاخره!", "Endlich", "in his open doorway in a dressing gown with a huge happy smile and open arms, rare joy", "he opens his arms with a huge happy smile"),
      S("lena", "tuer", "Herr Braun, was ist da drin?", "آقای براون، داخلش چیست؟", "drin", "holding the parcel out towards the camera with a suspicious look and one raised eyebrow", "she holds the parcel forward and raises an eyebrow"),
      S("braun", "braunTuer", "Ein Wecker. Für die Pünktlichkeit.", "یک ساعت زنگ‌دار. برای وقت‌شناسی.", "Wecker", "in his doorway holding a big old alarm clock and showing it proudly, serious expression", "he shows the alarm clock proudly and nods gravely"),
      S("krause", "flur", "Ein Wecker? Und die Bombe?", "یک ساعت زنگ‌دار؟ و بمب؟", "Bombe", "in the hallway lowering her phone, confused and embarrassed, one hand on her curlers", "she slowly lowers the phone with an embarrassed look"),
      S("braun", "braunTuer", "Dieser Wecker klingelt um drei Uhr nachts.", "این ساعت ساعت سه شب زنگ می‌زند.", "drei", "in his doorway with a sly grin holding the alarm clock up, dark circles under his eyes", "he grins slyly and holds the clock up", {joke: true, sfx: "ring"}),
      S("lena", "tuer", "Um drei Uhr? Warum?!", "ساعت سه؟ چرا؟!", "Warum", "in her doorway with her mouth open in disbelief and both arms spread", "she spreads her arms in disbelief"),
      S("braun", "braunTuer", "Damit ich nie zu spät komme. Zum Schlafen.", "تا هیچ وقت دیر نکنم. برای خوابیدن.", "Schlafen", "in his doorway with a deadpan serious face and the alarm clock under his arm", "he shrugs deadpan and says it seriously", {joke: true, sfx: "sting"}),
    ],
  },
  "a1-58-pharmacy": {
    title: "Pünktlich!", titleFa: "سر وقت!",
    next: { de: "Wer sammelt hier Flaschen?", fa: "چه کسی اینجا بطری جمع می‌کند؟" },
    shots: [
      S("lena", "wohnzimmer", "Heute Abend ist die Hausversammlung!", "امشب جلسه ساختمان است!", "Hausversammlung", "in a bright living room checking a big wall clock with a cup of coffee in her hand, relaxed smile", "she sips her coffee and glances at the clock"),
      S("lena", "wohnzimmer", "Um acht Uhr. Ich habe noch Zeit.", "ساعت هشت. هنوز وقت دارم.", "noch Zeit", "sitting relaxed on a sofa and putting her feet up with a slice of cake, smug", "she leans back and takes a bite of cake", {joke: true}),
      S("krause", "flur", "Es ist drei vor acht! Wo ist Lena?", "سه دقیقه به هشت است! لینا کجاست؟", "drei vor acht", "in the hallway tapping her wristwatch impatiently, pink hair curlers, stern look", "she taps her wristwatch impatiently"),
      S("lena", "treppe", "Ich komme! Eine Minute!", "می‌آیم! یک دقیقه!", "Minute", "running down the stairs with a coat half on, hair messy, one shoe in her hand", "she hops on one foot while pulling on her shoe", {sfx: "pop"}),
      S("pfeiffer", "saal", "Acht Uhr. Die Tür ist zu.", "ساعت هشت. در بسته است.", "zu", "standing in a meeting room doorway with a stopwatch in his hand, strict face, door half closed behind him", "he checks the stopwatch and closes the door slowly"),
      S("lena", "saal", "Aber es ist erst acht Uhr eins!", "ولی تازه هشت و یک دقیقه است!", "eins", "at a closed door pleading with her hands together, out of breath", "she pleads with her hands together and pants"),
      S("pfeiffer", "saal", "Pünktlich ist pünktlich. Das ist Deutschland.", "وقت‌شناسی یعنی وقت‌شناسی. این آلمان است.", "Deutschland", "behind the half-open door raising a finger solemnly like a teacher, stern face", "he raises a finger solemnly and shakes his head", {joke: true}),
      S("braun", "saal", "Ich bin seit sechs Uhr hier.", "من از ساعت شش اینجا هستم.", "sechs Uhr", "sitting alone on a chair in an empty meeting room with a suitcase, a proud face, many cups of coffee on the table", "he nods proudly with his arms crossed", {joke: true}),
      S("krause", "saal", "Das ist Streber! Wo ist mein Platz?", "این خودنمایی است! جای من کجاست؟", "Streber", "in the meeting room looking around for a seat, offended, with her handbag", "she looks around offended and clutches her handbag"),
      S("pfeiffer", "saal", "Tagesordnung eins: Wer hat das Paket geschickt?", "دستور جلسه یک: چه کسی آن بسته را فرستاد؟", "Paket", "at a podium in the meeting room holding up a small card, stern, glasses glinting", "he raises the card and scans the room with a stern look", {sfx: "sting"}),
    ],
  },
  "a1-59-perfekt-haben": {
    title: "Das Pfand", titleFa: "بطری‌های پس‌دادنی",
    next: { de: "Ein Brief vom Amt", fa: "یک نامه از اداره" },
    shots: [
      S("lena", "kueche", "Ich habe zwei Flaschen. Zwei Euro, oder?", "من دو بطری دارم. دو یورو، درسته؟", "zwei Flaschen", "in a kitchen holding two empty plastic bottles and smiling hopefully", "she holds up the bottles and counts on her fingers"),
      S("braun", "keller", "Zwei? Ich habe vierhundert.", "دو؟ من چهارصد تا دارم.", "vierhundert", "in a basement room full of stacked empty bottles up to the ceiling, standing proudly in a dressing gown with arms spread", "he spreads his arms proudly in front of the bottle towers", {joke: true}),
      S("lena", "keller", "Vierhundert Flaschen! Warum?", "چهارصد بطری! چرا؟", "Warum", "stepping into a basement full of bottles with her mouth open, wide eyes", "she looks up at the bottle towers with wide eyes"),
      S("braun", "keller", "Pfand ist Geld. Geld ist Freiheit.", "پول بطری، پول است. پول، آزادی است.", "Freiheit", "in the basement holding a bottle up like a trophy, dramatic lighting, philosophical expression", "he holds the bottle up and gazes at it dreamily", {joke: true}),
      S("krause", "keller", "Das ist meine Flasche! Die habe ich gekauft!", "این بطری من است! من آن را خریده‌ام!", "meine", "in the basement pointing angrily at a bottle on a shelf, hair curlers, hand on hip", "she points angrily at a bottle and stamps her foot"),
      S("braun", "keller", "Beweisen Sie es!", "ثابت کنید!", "Beweisen", "folding his arms with a defiant stare in the basement, one eyebrow raised", "he folds his arms and lifts his chin defiantly"),
      S("krause", "keller", "Da ist mein Name drauf! Krause!", "اسم من روی آن است! کراوزه!", "Krause", "holding a bottle close to the camera showing a name written on the label, triumphant grin", "she holds the bottle up triumphantly and grins", {sfx: "ding"}),
      S("lena", "supermarkt", "Der Automat nimmt alle Flaschen. Los!", "دستگاه همه بطری‌ها را می‌گیرد. بریم!", "Automat", "standing in front of a bottle return machine in a supermarket with a big bag of bottles, determined smile", "she feeds a bottle into the machine and smiles", {sfx: "tick"}),
      S("braun", "supermarkt", "Der Automat ... mag mich nicht.", "دستگاه ... مرا دوست ندارد.", "mag mich nicht", "at the bottle machine looking sadly at the screen, a huge pile of bottles beside him", "he stares sadly at the screen and sighs", {joke: true}),
      S("pfeiffer", "supermarkt", "Vierhundert Flaschen? Haben Sie einen Gewerbeschein?", "چهارصد بطری؟ جواز کسب‌وکار دارید؟", "Gewerbeschein", "behind Braun in the supermarket, clipboard raised, stern glasses glint, grey uniform", "he steps forward and lifts his clipboard slowly", {sfx: "sting"}),
    ],
  },
  "a1-60-perfekt-sein": {
    title: "Der Brief", titleFa: "نامه",
    next: { de: "Grillabend im Hof", fa: "شب کباب در حیاط" },
    shots: [
      S("lena", "flur", "Ein Brief! Vom Amt! Für Herrn Braun!", "یک نامه! از اداره! برای آقای براون!", "Brief", "in the hallway holding a white official envelope with a stamp, curious face", "she turns the envelope over and studies it"),
      S("krause", "flur", "Nicht öffnen! Das ist ein Staatsgeheimnis!", "باز نکن! این یک راز دولتی است!", "Staatsgeheimnis", "popping up beside her in the hallway with wide eyes, whispering, pink hair curlers", "she leans in close and whispers dramatically", {joke: true}),
      S("lena", "braunTuer", "Herr Braun? Sie haben Post.", "آقای براون؟ شما نامه دارید.", "Post", "knocking on a door and waiting, envelope in her other hand", "she knocks and waits with the envelope raised"),
      S("braun", "braunTuer", "Post? Nein. Ich bin nicht zu Hause.", "نامه؟ نه. من خانه نیستم.", "nicht zu Hause", "opening his door just a crack, one eye visible, dressing gown, shifty", "he peeks through a crack in the door with one eye", {joke: true}),
      S("lena", "braunTuer", "Sie stehen aber vor mir.", "ولی شما جلوی من ایستاده‌اید.", "vor mir", "deadpan with arms crossed and eyebrow raised in front of a half-open door", "she crosses her arms with a deadpan face"),
      S("braun", "braunTuer", "Das ist ... mein Zwillingsbruder.", "این ... برادر دوقلوی من است.", "Zwillingsbruder", "in his doorway pointing at himself with a fake innocent smile", "he points at himself with a fake innocent smile", {joke: true, sfx: "rimshot"}),
      S("braun", "braunTuer", "Ach, gib her. Ich lese es.", "آه، بده. می‌خوانمش.", "lese", "in his doorway taking the envelope with a resigned sigh, a nervous sweat drop", "he takes the envelope and sighs nervously"),
      S("braun", "braunTuer", "Ich muss ... ausziehen?", "من باید ... اسباب‌کشی کنم؟", "ausziehen", "reading a letter with his eyes wide and his face turning pale, hand trembling", "his hand trembles and his face drains of colour", {sfx: "sting"}),
      S("krause", "flur", "Raus?! Aus dem Haus?!", "بیرون؟! از ساختمان؟!", "Raus", "in the hallway gasping with both hands on her mouth, shocked, curlers", "she gasps with both hands over her mouth"),
      S("lena", "flur", "Das lassen wir nicht zu!", "ما اجازه نمی‌دهیم!", "nicht zu", "standing firm in the hallway with a fist raised, determined fierce look", "she raises her fist with a fierce look and nods"),
      S("pfeiffer", "treppe", "Das Amt hat entschieden.", "اداره تصمیم گرفته است.", "entschieden", "on the stairs with his clipboard held to his chest, expressionless, a sinister half-smile", "he looks down at them coldly and closes the clipboard", {sfx: "sting"}),
    ],
  },
};
