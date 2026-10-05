// «Ich koche» (owner, 2026-10-05): the content of the owner's second reference short, with our own character (Herr Braun,
// a slim handsome 2D storybook man). One man, one kitchen, six first-person sentences "Ich + Verb". Each sentence is said
// twice, in two WIDE shots of the same action: the start (the ingredient in his hands) and the result (done, he smiles),
// so the picture itself shows what the sentence says. Never a close-up. The lips are made by the lip-sync model from the
// voice; the motion prompt only says what the body does. The German sentence is the only text on the picture (the verb red),
// no Persian, no names, no brand; a quiet cheerful kitchen music bed under the voice. Built on Hugging Face by the series
// engine; manual workflow only (.github/workflows/kochen-video.yml).
import { L } from "./easy-series.mjs";

export const KOCHEN = {
  title: "Ich koche",
  titleFa: "من آشپزی می‌کنم",
  characters: {
    // owner's choice by ear, 2026-10-05: sample 1 of scripts/voice-audition.mjs (de-DE-ConradNeural, speed 0.95, no pitch change)
    braun: { name: "Herr Braun", voice: "de-DE-ConradNeural", speed: 0.95 },
  },
};

export const KOCHEN_CAST = {
  braun: { ref: "public/ai-cast/v2/braun.jpg", look: "a handsome slim man in his thirties with short dark-brown hair, a kind smile, a blue sweater and dark trousers, 2D storybook illustration" },
};
export const KOCHEN_STYLE = "semi-realistic 2D animation illustration, modern Disney 2D film or children's storybook, handsome slim adult with realistic proportions, clean outlines, soft flat shading, bright cheerful colours, wide shot with the whole body visible, vertical 9:16 frame, clean image with no text, no letters and no watermark";

const KITCHEN = "in a bright sunny modern kitchen with a big window and green plants, the kitchen clearly visible around him";
const SH = (scene, motion, lines) => ({ who: "braun", chars: ["braun"], loc: "kueche", scene: `${KITCHEN}, ${scene}`, lines, motion });
// one sentence = two wide shots of the same action: the start and the result; the sentence is said in each
const SCENE = (say, fa, hl, start, startMotion, done, doneMotion) => [
  SH(start, startMotion, [L("braun", say, fa, hl, { emo: "neutral" })]),
  SH(done, doneMotion, [L("braun", say, fa, hl, { emo: "happy" })]),
];

export const KOCHEN_EPISODES = {
  "k01-ich-koche": {
    title: "Ich koche", titleFa: "من آشپزی می‌کنم",
    next: { de: "Ich koche weiter", fa: "ادامهٔ آشپزی" },
    endText: { de: "Guten Appetit!", small: "Und du? Was kochst du heute?" },
    shots: [
      ...SCENE("Ich wasche das Gemüse.", "سبزی را می‌شویم.", "wasche",
        "standing at the kitchen sink holding a bunch of green salad leaves and a red pepper under the running tap, clear water streaming from the tap over the vegetables into the sink, he looks at the vegetables", "he holds the vegetables under the running water and turns them over slowly",
        "standing at the kitchen sink holding up a bunch of clean wet shiny green salad leaves with water drops, the tap still running, he smiles", "he lifts the wet clean vegetables and shakes off the water drops gently"),
      ...SCENE("Ich schneide die Tomate.", "گوجه را می‌برم.", "schneide",
        "standing at the kitchen counter with a big knife held over a whole red tomato on a wooden cutting board, about to cut it", "he lowers the knife and starts to slice the tomato",
        "standing at the kitchen counter with a tomato neatly cut into slices on the wooden cutting board, the knife in his hand, he smiles", "he nods with satisfaction and pushes the slices aside with the knife"),
      ...SCENE("Ich schäle die Kartoffel.", "سیب‌زمینی را پوست می‌کنم.", "schäle",
        "standing at the kitchen counter holding a yellow potato in one hand and a vegetable peeler in the other, peeling a strip of skin off the potato, potato peels on the wooden board", "he draws the peeler down the potato and a long curl of skin falls",
        "standing at the kitchen counter holding up a fully peeled pale yellow potato, a pile of peels on the board, he smiles", "he turns the peeled potato in his hand and smiles at it"),
      ...SCENE("Ich lege die Zwiebel in die Pfanne.", "پیاز را در تابه می‌گذارم.", "lege",
        "wearing a grey kitchen apron over his blue sweater, standing at the stove holding a wooden cutting board with chopped onion over a black frying pan on the stove, tipping the onion towards the pan", "he tips the chopped onion from the board into the pan",
        "wearing a grey kitchen apron, standing at the stove with the chopped onion lying in the black frying pan, a little steam rising, he smiles at the pan", "he looks at the pan and nods as the onion sizzles"),
      ...SCENE("Ich rühre das Essen um.", "غذا را هم می‌زنم.", "rühre",
        "wearing a grey kitchen apron, standing at the stove with a wooden spoon in the black frying pan full of vegetables, stirring them, steam rising", "he stirs the food in the pan in slow circles with the wooden spoon",
        "wearing a grey kitchen apron, standing at the stove with the wooden spoon resting in the frying pan of colourful cooked vegetables, steam rising, he smiles", "he lifts the spoon, looks at the food and smiles with satisfaction"),
      ...SCENE("Ich koche die Suppe.", "سوپ را می‌پزم.", "koche",
        "wearing a grey kitchen apron, standing at the stove with a wooden spoon in a big silver pot of orange soup, steam rising, ingredients floating in the soup", "he stirs the soup slowly in the big pot with the wooden spoon",
        "wearing a grey kitchen apron, standing at the stove holding a ladle of steaming orange soup above the pot, a happy proud smile", "he lifts the ladle and smiles proudly as the steam rises"),
    ],
  },
};

export const KOCHEN_CFG = {
  key: "kochen", plain: true, bed: "kitchen", bedPick: "kitchen-1", bedGain: 0.28, series: KOCHEN, episodes: KOCHEN_EPISODES, shotPrefix: "ko2-", rtl: false, natural: true,
  style: KOCHEN_STYLE, cast: KOCHEN_CAST,
  brand: { title: KOCHEN.title, sub: () => "Deutsch im Alltag", logo: false },
  deliverBrand: { label: "Ich koche", file: "kochen" },
  endCard: (E) => ({ t0: 0, de: E.endText.de, fa: "", small: E.endText.small, smallFa: "" }),
  caption: (E, no) => `🍲 ${KOCHEN.title} — ${E.title}\n${E.titleFa}\n\n#LearnGerman #Deutsch #Alltag #Kochen #fyp`,
};
