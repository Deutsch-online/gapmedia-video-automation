// «Oma sagt …» on Hugging Face (owner, 2026-10-06: "make the design more realistic — Hugging Face"): the grandmother gives an
// order, her granddaughter does it. Ten orders (imperatives), one wide shot each with BOTH characters (the whole body, the room
// around them). The grandmother speaks (the lips come from the lip-sync model), the girl acts. The German sentence is on the picture
// with the verb in red and a Persian subtitle under it; no names, no brand. A quiet cheerful music bed (kitchen-1, the owner's choice).
// Built by omaai-build.mjs; manual workflow only (.github/workflows/omaai-video.yml).
import { L } from "./easy-series.mjs";

export const OMA = {
  title: "Oma sagt",
  titleFa: "مادربزرگ می‌گوید",
  characters: {
    oma: { name: "Oma", voice: "de-DE-KatjaNeural", speed: 0.95 },
    enkelin: { name: "Enkelin", voice: "de-DE-AmalaNeural", speed: 1 },
  },
};
export const OMA_CAST = {
  oma: { ref: "public/ai-cast/v2/oma.jpg", look: "a kind slim grandmother with grey hair in a neat bun, red round glasses, a sage-green cardigan over a white blouse, a navy skirt and brown shoes, 2D storybook illustration" },
  enkelin: { ref: "public/ai-cast/v2/enkelin.jpg", look: "a cute slim girl of nine with blond hair in a messy bun with a red hair tie, big blue eyes, a red sweater, cream trousers and white sneakers, 2D storybook illustration" },
};
export const OMA_STYLE = "semi-realistic 2D animation illustration, modern Disney 2D film or children's storybook, natural proportions (not chibi, not chubby), clean outlines, soft flat shading, bright cheerful colours, wide shot with both whole bodies visible, vertical 9:16 frame, clean image with no text, no letters and no watermark";

const SH = (scene, motion, line) => ({ who: "oma", chars: ["oma", "enkelin"], loc: "haus", scene, motion: `${motion}, the grandmother's mouth moving while she speaks`, lines: [line] });
const O = (de, fa, hl) => L("oma", de, fa, hl, { emo: "neutral" });
const LIVING = "in a cosy warm living room with striped wallpaper, a big window with orange curtains, a green sofa and a standing lamp";
const KITCHEN = "in a bright sunny kitchen with green cabinets and a wooden table";
const HALL = "in a warm hallway with a wooden front door, a coat rack on the wall and a red doormat";
const BEDROOM = "in a light bedroom with a big wooden wardrobe, a bed with a blue blanket and a window with blue curtains";
const PAIR = "the grandmother on the left, the girl on the right";

// Each order is TWO shots (owner, 2026-10-06: "she does not do what Oma says — no window closed, no movement"): shot A, Oma says the
// order (lip-synced, she points); shot B, the girl DOES it (a picture-to-video clip without lip-sync, so that the body can move) while
// the sentence stays on the picture. The pictures of shot A keep their names (s0..s9) so that the finished ones stay in the cache.
const ORDER = (i, say, fa, hl, aScene, bScene, bMotion) => [
  { ...SH(aScene, "the grandmother speaks and points while the girl watches her", O(say, fa, hl)), key: `s${i}` },
  { who: "enkelin", chars: ["oma", "enkelin"], loc: "haus", scene: bScene, motion: bMotion, lines: [], hold: 3.4, key: `a${i}` },
];

export const OMA_EPISODES = {
  "o01-befehle": {
    title: "Oma sagt", titleFa: "مادربزرگ می‌گوید",
    next: { de: "Oma sagt noch mehr", fa: "مادربزرگ باز هم می‌گوید" },
    endText: { de: "Gut gemacht!", fa: "آفرین!", small: "Und du? Was sagt deine Oma?" },
    shots: [
      ...ORDER(0, "Mach das Fenster zu!", "پنجره را ببند!", "Mach",
        `${LIVING}, ${PAIR}: the grandmother points at the open window, the girl stands at the open window and pulls it shut`,
        `${LIVING}, ${PAIR}: the grandmother stands smiling, the girl stands at the wide open window with both hands on the window sash`, "the girl pushes the window sash shut with both hands until the window is completely closed, the curtains stop moving, the grandmother nods"),
      ...ORDER(1, "Mach das Licht an!", "چراغ را روشن کن!", "Mach",
        `${LIVING}, dim room, ${PAIR}: the grandmother points at the standing lamp, the girl reaches to the lamp switch and the lamp lights up warmly`,
        `${LIVING}, a dim room with the lamp off, ${PAIR}: the girl reaches her hand to the switch of the standing lamp`, "the girl presses the lamp switch, the lamp turns on and warm yellow light fills the room, the girl smiles"),
      ...ORDER(2, "Setz dich hin!", "بنشین!", "Setz",
        `${LIVING}, ${PAIR}: the grandmother points at the green sofa, the girl sits down on the sofa`,
        `${LIVING}, ${PAIR}: the grandmother stands, the girl stands right in front of the green sofa`, "the girl turns around and sits down on the green sofa, then folds her hands in her lap and smiles"),
      ...ORDER(3, "Stell den Teller auf den Tisch!", "بشقاب را روی میز بگذار!", "Stell",
        `${KITCHEN}, ${PAIR}: the grandmother points at the table, the girl carries a white plate to the table and puts it down`,
        `${KITCHEN}, ${PAIR}: the girl stands next to the wooden table holding a white plate in both hands`, "the girl lowers the white plate and puts it down on the wooden table, then lets go of it and smiles"),
      ...ORDER(4, "Häng die Jacke auf!", "کاپشن را آویزان کن!", "Häng",
        `${HALL}, ${PAIR}: the grandmother points at the coat rack, the girl hangs a green jacket on a hook`,
        `${HALL}, ${PAIR}: the girl stands next to the coat rack holding a green jacket in her hands`, "the girl lifts the green jacket and hangs it on a hook of the coat rack, then lets go and steps back smiling"),
      ...ORDER(5, "Feg den Boden!", "زمین را جارو کن!", "Feg",
        `${HALL}, ${PAIR}: the grandmother points at the floor, the girl sweeps the wooden floor with a broom, a little dust flying`,
        `${HALL}, ${PAIR}: the girl stands holding a broom on a dusty wooden floor`, "the girl sweeps the wooden floor with long strokes of the broom, dust moves across the floor and a small pile forms"),
      ...ORDER(6, "Bring den Müll raus!", "زباله را بیرون ببر!", "Bring",
        `${HALL}, ${PAIR}: the grandmother points at the open front door, the girl carries a black trash bag towards the door`,
        `${HALL}, ${PAIR}: the girl stands holding a black trash bag in front of the open front door`, "the girl walks out through the front door carrying the black trash bag and leaves the house"),
      ...ORDER(7, "Wasch die Äpfel!", "سیب‌ها را بشوی!", "Wasch",
        `${KITCHEN}, ${PAIR}: the grandmother points at the sink, the girl washes red apples under the running tap`,
        `${KITCHEN}, ${PAIR}: the girl stands at the sink holding a red apple under the kitchen tap`, "water runs from the tap over the red apple while the girl turns the apple in her hands to wash it, water splashes in the sink"),
      ...ORDER(8, "Leg die Kleidung in den Schrank!", "لباس‌ها را توی کمد بگذار!", "Leg",
        `${BEDROOM}, ${PAIR}: the grandmother points at the open wardrobe, the girl puts a pile of folded clothes into the wardrobe`,
        `${BEDROOM}, ${PAIR}: the girl stands in front of the open wooden wardrobe holding a pile of folded clothes`, "the girl puts the pile of folded clothes onto the shelf inside the wardrobe and takes her hands away"),
      ...ORDER(9, "Mach dein Bett!", "تختت را مرتب کن!", "Mach",
        `${BEDROOM}, ${PAIR}: the grandmother points at the bed, the girl smooths the blue blanket on the bed`,
        `${BEDROOM}, ${PAIR}: the girl stands next to the bed with a crumpled blue blanket`, "the girl pulls the blue blanket smooth over the bed with both hands until the bed is neat, then steps back smiling"),
    ],
  },
};

export const OMA_CFG = {
  key: "oma", plain: true, faSub: true, bed: "kitchen", bedPick: "kitchen-1", bedGain: 0.28, series: OMA, episodes: OMA_EPISODES, shotPrefix: "om-", rtl: false, natural: true,
  style: OMA_STYLE, cast: OMA_CAST,
  brand: { title: OMA.title, sub: () => "Deutsch im Alltag", logo: false },
  deliverBrand: { label: "Oma sagt", file: "omaai" },
  endCard: (E) => ({ t0: 0, de: E.endText.de, fa: E.endText.fa, small: E.endText.small, smallFa: "" }),
  caption: (E, no) => `👵 ${OMA.title} — ${E.title}\n${E.titleFa}\n\n#LearnGerman #Deutsch #Imperativ #Alltag #fyp`,
};
