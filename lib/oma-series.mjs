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

export const OMA_EPISODES = {
  "o01-befehle": {
    title: "Oma sagt", titleFa: "مادربزرگ می‌گوید",
    next: { de: "Oma sagt noch mehr", fa: "مادربزرگ باز هم می‌گوید" },
    endText: { de: "Gut gemacht!", fa: "آفرین!", small: "Und du? Was sagt deine Oma?" },
    shots: [
      SH(`${LIVING}, ${PAIR}: the grandmother points at the open window, the girl stands at the open window and pulls it shut`, "the grandmother speaks and points while the girl reaches out and pulls the window closed", O("Mach das Fenster zu!", "پنجره را ببند!", "Mach")),
      SH(`${LIVING}, dim room, ${PAIR}: the grandmother points at the standing lamp, the girl reaches to the lamp switch and the lamp lights up warmly`, "the grandmother speaks and points while the girl presses the lamp switch and the lamp lights up", O("Mach das Licht an!", "چراغ را روشن کن!", "Mach")),
      SH(`${LIVING}, ${PAIR}: the grandmother points at the green sofa, the girl sits down on the sofa`, "the grandmother speaks and points while the girl sits down on the sofa", O("Setz dich hin!", "بنشین!", "Setz")),
      SH(`${KITCHEN}, ${PAIR}: the grandmother points at the table, the girl carries a white plate to the table and puts it down`, "the grandmother speaks and points while the girl walks to the table and sets the plate down", O("Stell den Teller auf den Tisch!", "بشقاب را روی میز بگذار!", "Stell")),
      SH(`${HALL}, ${PAIR}: the grandmother points at the coat rack, the girl hangs a green jacket on a hook`, "the grandmother speaks and points while the girl hangs the jacket on the hook", O("Häng die Jacke auf!", "کاپشن را آویزان کن!", "Häng")),
      SH(`${HALL}, ${PAIR}: the grandmother points at the floor, the girl sweeps the wooden floor with a broom, a little dust flying`, "the grandmother speaks and points while the girl sweeps the floor with the broom", O("Feg den Boden!", "زمین را جارو کن!", "Feg")),
      SH(`${HALL}, ${PAIR}: the grandmother points at the open front door, the girl carries a black trash bag towards the door`, "the grandmother speaks and points while the girl walks to the door carrying the trash bag", O("Bring den Müll raus!", "زباله را بیرون ببر!", "Bring")),
      SH(`${KITCHEN}, ${PAIR}: the grandmother points at the sink, the girl washes red apples under the running tap`, "the grandmother speaks and points while the girl holds an apple under the running water", O("Wasch die Äpfel!", "سیب‌ها را بشوی!", "Wasch")),
      SH(`${BEDROOM}, ${PAIR}: the grandmother points at the open wardrobe, the girl puts a pile of folded clothes into the wardrobe`, "the grandmother speaks and points while the girl places the folded clothes into the wardrobe", O("Leg die Kleidung in den Schrank!", "لباس‌ها را توی کمد بگذار!", "Leg")),
      SH(`${BEDROOM}, ${PAIR}: the grandmother points at the bed, the girl smooths the blue blanket on the bed`, "the grandmother speaks and points while the girl pulls the blanket smooth", O("Mach dein Bett!", "تختت را مرتب کن!", "Mach")),
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
