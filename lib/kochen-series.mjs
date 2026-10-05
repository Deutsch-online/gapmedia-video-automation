// «Ich koche» (owner, 2026-10-05): the content of the owner's second reference short, with our own character (Herr Braun,
// bright cartoon look). One man, one kitchen, six first-person sentences "Ich + Verb": each is said while the action is
// shown in a wide shot and said again in a medium shot of his face and chest (never an extreme close-up). The German sentence
// is the only text on the picture (the verb red), no Persian, no names, no brand, no music. Built on Hugging Face by the
// series engine; manual workflow only (.github/workflows/kochen-video.yml).
import { L } from "./easy-series.mjs";

export const KOCHEN = {
  title: "Ich koche",
  titleFa: "من آشپزی می‌کنم",
  characters: {
    braun: { name: "Herr Braun", voice: "de-DE-ConradNeural", speed: 0.95, pitch: "-8Hz" },
  },
};

export const KOCHEN_CAST = {
  braun: { ref: "public/ai-cast/v2/braun.jpg", look: "a friendly cartoon man with short dark-brown hair, light stubble and a small beard tuft, a blue sweatshirt, dark trousers" },
};
export const KOCHEN_STYLE = "High-end 3D animated feature film still, Pixar-like stylised character, bright cheerful pastel colours, wide shot with the whole body visible, vertical 9:16 frame, clean image with no text, no letters and no watermark";

const KITCHEN = "in a bright sunny modern kitchen with a big window, green plants, wooden shelves and hanging copper pans";
const SH = (loc, scene, motion, lines) => ({ who: "braun", chars: ["braun"], loc, scene, lines, motion });
// one sentence = a wide shot of the action and a medium shot (face and chest) of him saying it again
const SCENE = (say, fa, hl, wide, wideMotion, medium, mediumMotion, closeEmo = "happy") => [
  SH("kueche", `${KITCHEN}, ${wide}`, wideMotion, [L("braun", say, fa, hl, { emo: "neutral" })]),
  SH("kueche", `${KITCHEN}, ${medium}`, mediumMotion, [L("braun", say, fa, hl, { emo: closeEmo })]),
];

export const KOCHEN_EPISODES = {
  "k01-ich-koche": {
    title: "Ich koche", titleFa: "من آشپزی می‌کنم",
    next: { de: "Ich koche weiter", fa: "ادامهٔ آشپزی" },
    endText: { de: "Guten Appetit!", small: "Und du? Was kochst du heute?" },
    shots: [
      ...SCENE("Ich wasche das Gemüse.", "سبزی را می‌شویم.", "wasche",
        "standing at the sink washing fresh green vegetables under the running tap, a cutting board with colourful tomatoes, peppers and cucumber beside him", "he rinses the vegetables under the water with both hands",
        "waist-up, smiling friendly towards the camera while holding a handful of wet green vegetables over the sink", "he smiles warmly and gives a small nod"),
      ...SCENE("Ich schneide die Tomate.", "گوجه را می‌برم.", "schneide",
        "standing at the counter cutting a red tomato with a big knife on a wooden board, a bowl of vegetables beside him", "he slices the tomato slowly with careful strokes",
        "waist-up, smiling towards the camera with a knife in one hand and a tomato slice in the other", "he smiles proudly and lifts the tomato slice a little"),
      ...SCENE("Ich schäle die Kartoffel.", "سیب‌زمینی را پوست می‌کنم.", "schäle",
        "standing at the counter peeling a yellow potato with a peeler, potato peels on the board, a bowl of potatoes and carrots beside him", "he turns the potato and peels long curls of skin",
        "waist-up, smiling towards the camera and holding a peeled potato", "he smiles, tilts his head a little and shows the potato"),
      ...SCENE("Ich lege die Zwiebel in die Pfanne.", "پیاز را در تابه می‌گذارم.", "lege",
        "wearing a grey kitchen apron, standing at the stove putting chopped onion into a black frying pan with a hand, the stove and the pan clearly visible", "he drops the chopped onion into the pan and it sizzles",
        "waist-up in the grey apron, smiling towards the camera with a little steam rising from the pan beside him", "he smiles with satisfaction and nods"),
      ...SCENE("Ich rühre das Essen um.", "غذا را هم می‌زنم.", "rühre",
        "wearing the grey apron, standing at the stove stirring food in a frying pan with a wooden spoon, a bottle of olive oil and tomatoes on the counter", "he stirs the food in slow circles with the wooden spoon",
        "waist-up in the grey apron, smiling gently towards the camera with the wooden spoon in his hand", "he smiles happily and breathes in the smell"),
      ...SCENE("Ich koche die Suppe.", "سوپ را می‌پزم.", "koche",
        "wearing the grey apron, standing at the stove stirring a big steaming pot of soup with a wooden spoon, steam rising", "he stirs the soup and steam curls up past his face",
        "waist-up in the grey apron, a delighted smile towards the camera, steam rising behind him", "he beams, tastes a spoonful and smiles with joy", "happy"),
    ],
  },
};

export const KOCHEN_CFG = {
  key: "kochen", plain: true, series: KOCHEN, episodes: KOCHEN_EPISODES, shotPrefix: "ko-", rtl: false, natural: true,
  style: KOCHEN_STYLE, cast: KOCHEN_CAST,
  brand: { title: KOCHEN.title, sub: () => "Deutsch im Alltag", logo: false },
  deliverBrand: { label: "Ich koche", file: "kochen" },
  endCard: (E) => ({ t0: 0, de: E.endText.de, fa: "", small: E.endText.small, smallFa: "" }),
  caption: (E, no) => `🍲 ${KOCHEN.title} — ${E.title}\n${E.titleFa}\n\n#LearnGerman #Deutsch #Alltag #Kochen #fyp`,
};
