// EasyDeutsch as a drama-comedy series (owner, 2026-10-04, after four reference shorts):
// the lessons change type. Each episode is a short story with a hook, scene changes, a
// punchline and a cliffhanger, and it continues in the next episode. German is spoken by the
// characters and written big on the picture; Persian is only a small subtitle underneath.
// There is no English narrator and no English text. The lesson's phrases sit inside the story
// and are lit up in neon when they are spoken, then repeated in a short "learned today" card.
//
// Series: «Die Nachbarn» (the neighbours). Lena has just moved into an old apartment building.
// Herr Braun lives downstairs: grumpy, secretive, always carrying a toaster. Frau Krause lives
// opposite: nosy, a bathrobe, curlers, a phone, a cat. Every episode adds a secret.

export const SERIES = {
  title: "Die Nachbarn",
  titleFa: "همسایه‌ها",
  characters: {
    lena: { name: "Lena", voice: "de-DE-KatjaNeural" },
    braun: { name: "Herr Braun", voice: "de-DE-ConradNeural" },
    krause: { name: "Frau Krause", voice: "de-DE-AmalaNeural" },
  },
};

// A shot is one line of the story: who says it (voice), who is on the picture (chars), where
// (loc, a change of loc is a cut for the music), the picture (scene) and what moves (motion).
// hl: the part of the line that is the lesson phrase (lit up in neon); joke: a comic beat.
// finale: shots after the "learned today" card (the cliffhanger).
export const EPISODES = {
  "a1-54-day-trip": {
    title: "Der Ausflug",
    next: { de: "Wer ist die Frau?", fa: "آن خانم کیست؟" },
    shots: [
      { who: "krause", chars: ["krause"], loc: "treppe", say: "Herr Braun? Um fünf Uhr? Mit einem Koffer?!", fa: "آقای براون؟ ساعت پنج؟ با چمدان؟!",
        scene: "in the doorway of her flat in an old narrow apartment building at five in the morning, dim warm hallway light, she peeks out suspiciously with one hand on the door",
        motion: "she squints suspiciously, leans forward and whispers dramatically, eyebrows going up, her mouth moving as she talks" },
      { who: "braun", chars: ["braun"], loc: "treppe", say: "Pst! Guten Morgen, Frau Krause.", fa: "هیس! صبح بخیر، خانم کراوزه.",
        scene: "tiptoeing down a dim apartment stairwell at five in the morning, carrying a huge suitcase and a silver toaster, caught and frozen mid-step with a nervous smile",
        motion: "he freezes, smiles nervously, raises a finger to his lips and whispers, his mouth moving" },
      { who: "krause", chars: ["krause"], loc: "treppe", say: "Und ein Toaster? Er zieht aus!", fa: "و یک توستر؟ دارد اسباب‌کشی می‌کند!", joke: true,
        scene: "gasping in the doorway of her flat, both hands on her cheeks, pink hair curlers, shocked wide eyes, hallway light",
        motion: "she gasps dramatically with both hands on her cheeks and then hurries away, her mouth moving" },
      { who: "krause", chars: ["lena"], loc: "schlafzimmer", say: "Lena! Wach auf! Herr Braun zieht aus!", fa: "لینا! بیدار شو! آقای براون دارد می‌رود!",
        scene: "a young woman asleep in a cozy bedroom in the early morning, startled awake by loud knocking, messy hair, wide eyes, still under the blanket",
        motion: "she jolts awake, sits up with messy hair and looks toward the door, her eyes wide" },
      { who: "lena", chars: ["lena"], loc: "treppe", say: "Herr Braun! Wohin gehen Sie?", fa: "آقای براون! کجا می‌روید؟",
        scene: "standing in pyjamas at the top of an apartment stairwell, hair messy, leaning over the railing and calling downstairs in alarm",
        motion: "she leans over the railing and calls out, her mouth moving, worried eyes" },
      { who: "braun", chars: ["braun"], loc: "haustuer", say: "Wir machen einen Ausflug. Überraschung!", fa: "ما به گشت می‌رویم. سورپرایز!", hl: "Wir machen einen Ausflug",
        scene: "at the front door of an old apartment building in the early morning light, holding a silver toaster up like a trophy with a big proud grin, a suitcase next to him",
        motion: "he beams, lifts the toaster triumphantly above his head, his mouth moving" },
      { who: "lena", chars: ["lena"], loc: "haustuer", say: "Wir? Jetzt? Ich habe einen Pyjama an!", fa: "ما؟ همین حالا؟ من پیژامه پوشیده‌ام!", joke: true,
        scene: "standing in pyjamas with crossed arms and one raised eyebrow in comic disbelief at a building entrance in the morning",
        motion: "she throws up her hands, shakes her head in disbelief, her mouth moving" },
      { who: "lena", chars: ["lena"], loc: "haustuer", say: "Na gut. Wann fahren wir los?", fa: "خیلی خوب. کی حرکت می‌کنیم؟", hl: "Wann fahren wir los?",
        scene: "now dressed in jeans and a pink hoodie with a small backpack, standing at the building entrance in the morning light, curious smile",
        motion: "she shrugs with a smile, adjusts her backpack and asks a question, her mouth moving" },
      { who: "braun", chars: ["braun"], loc: "bahnhof", say: "Jetzt! Der Zug fährt um sechs.", fa: "همین حالا! قطار ساعت شش حرکت می‌کند.",
        scene: "hurrying along a train station platform at dawn, pointing at a big wristwatch in a panic, suitcase in the other hand",
        motion: "he taps his watch in a panic and waves for her to hurry, his mouth moving" },
      { who: "braun", chars: ["braun"], loc: "zug", say: "Ich nehme etwas zu essen mit.", fa: "کمی خوراکی با خود می‌برم.", hl: "Ich nehme etwas zu essen mit.",
        scene: "sitting by the window in a train compartment, opening a huge suitcase packed with bread, cheese, cakes and a toaster, proud smile",
        motion: "he opens the suitcase wide, pulls out a loaf of bread proudly, his mouth moving" },
      { who: "lena", chars: ["lena"], loc: "zug", say: "Etwas? Das ist ein Supermarkt!", fa: "کمی؟ این یک سوپرمارکت است!", joke: true,
        scene: "sitting opposite in a train compartment, staring at an overflowing suitcase of food, mouth open in disbelief",
        motion: "she stares, then looks up and laughs in disbelief, her mouth moving" },
      { who: "lena", chars: ["lena"], loc: "berg", say: "Herr Braun, hier gibt es keinen Strom!", fa: "آقای براون، اینجا برق نیست!",
        scene: "on a sunny mountain top with a grand view, holding a slice of bread next to a silver toaster that is plugged into nothing, exasperated",
        motion: "she waves the slice of bread, points at the toaster and complains, her mouth moving" },
      { who: "braun", chars: ["braun"], loc: "berg", say: "Kalter Toast ist auch Toast.", fa: "توست سرد هم توست است.", joke: true,
        scene: "on a sunny mountain top proudly biting into a cold slice of toast, serene happy face, a wide view behind him",
        motion: "he takes a big bite of toast, chews proudly and nods wisely, his mouth moving" },
      { who: "lena", chars: ["lena"], loc: "berg", say: "Das war ein schöner Tag.", fa: "روز خوبی بود.", hl: "Das war ein schöner Tag.",
        scene: "on a mountain top at sunset in golden hour light, smiling happily and looking at the view, a gentle breeze in her hair",
        motion: "she smiles warmly at the view, the wind moves her hair gently, her mouth moving softly" },
      // — after the "learned today" card: the cliffhanger —
      { finale: true, who: "krause", chars: ["krause"], loc: "treppe2", say: "Herr Braun? Hier ist eine Frau! Sie sucht Sie!", fa: "آقای براون؟ اینجا یک خانم است! سراغ شما را می‌گیرد!",
        scene: "in the doorway of her flat holding a phone to her ear and whispering in excitement, wide eyes, hallway behind her with a mysterious elegant woman with a suitcase standing at the end",
        motion: "she whispers into the phone with wide eyes and glances over her shoulder, her mouth moving" },
      { finale: true, who: "lena", chars: ["lena"], loc: "berg2", say: "Eine Frau?!", fa: "یک خانم؟!",
        scene: "on a mountain top at sunset, turning slowly with narrowed suspicious eyes and crossed arms toward the camera, dramatic close-up",
        motion: "she slowly turns her head, her eyes narrow suspiciously and her eyebrow rises, her mouth moving" },
    ],
  },
};
