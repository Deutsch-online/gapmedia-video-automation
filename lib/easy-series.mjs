// EasyDeutsch as a comedy series (owner, 2026-10-04, after four reference shorts): NOT a
// lesson any more. Each episode is a short, funny, everyday German situation that people
// recognise and share (waste sorting, quiet hours on Sunday, being on time ...), told as a
// story with a hook in the first seconds, scene changes, punchlines and a cliffhanger, and it
// continues in the next episode. German is spoken by the characters and written on the picture;
// Persian is only a small subtitle. No English, no "what you learned", no photo cards.
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
// hl: the punchline word shown in red on the caption; joke: a comic beat (a rimshot and a
// moment for the laugh); sfx: a sound at the start of the shot ("vacuum", "ring", "drill").
// The episode is not tied to a curriculum unit: the unit id is only the daily slot it fills.
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
};
