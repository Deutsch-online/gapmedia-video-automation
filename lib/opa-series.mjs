// «Was macht Opa?» (owner, 2026-10-07: the Google Vids limit is used up, "build it yourself"). Our own idea, not a copy of another video:
// the granddaughter tells what her funny grandfather does (3rd person singular: Opa schläft, angelt, kocht ...), ten short gags in a sunny
// garden by a lake. One wide shot per sentence made on Hugging Face (picture from the cast pictures, then a motion clip WITHOUT lip-sync, so that
// Opa really does the action); the girl's voice tells it as a narrator (she stands with her back to the camera, so no lips are needed).
// The German sentence is on the picture with the verb in red and a Persian subtitle. Music bed kitchen-1. Built by opa-build.mjs.
import { L } from "./easy-series.mjs";

export const OPA = {
  title: "Was macht Opa?",
  titleFa: "پدربزرگ چه می‌کند؟",
  characters: {
    enkelin: { name: "Enkelin", voice: "de-DE-AmalaNeural", speed: 1 },
    oma: { name: "Oma", voice: "de-DE-KatjaNeural", speed: 0.95 },
  },
};
export const OPA_CAST = {
  opa: { ref: "public/ai-cast/v2/opa.jpg", look: "a cheerful slim grandfather with a bald head and white fringe, a big white curly moustache, a flat green cap, a yellow shirt with green suspenders, brown trousers and brown shoes, 2D storybook illustration" },
  enkelin: { ref: "public/ai-cast/v2/enkelin.jpg", look: "a cute slim girl of nine with blond hair in a messy bun with a red hair tie, a red sweater, cream trousers and white sneakers, 2D storybook illustration" },
};
export const OPA_STYLE = "semi-realistic 2D animation illustration, modern Disney 2D film or children's storybook, natural proportions (not chibi, not chubby), clean outlines, soft flat shading, bright cheerful colours, wide shot with whole bodies visible, vertical 9:16 frame, clean image with no text, no letters and no watermark";

const GARDEN = "in a sunny garden of a small wooden house next to a lake with a wooden jetty, the girl stands in the foreground on the left seen from behind and from the side, looking at her grandfather";
const SH = (say, fa, hl, scene, motion) => ({ who: "enkelin", chars: ["opa", "enkelin"], loc: "garten", scene: `${GARDEN}: ${scene}`, motion, lines: [L("enkelin", say, fa, hl, { emo: "happy" })] });

export const OPA_EPISODES = {
  "p01-opa": {
    title: "Was macht Opa?", titleFa: "پدربزرگ چه می‌کند؟",
    next: { de: "Was macht Oma?", fa: "مادربزرگ چه می‌کند؟" },
    endText: { de: "Unser Opa ist ein Superstar!", fa: "پدربزرگ ما یک ستاره است!", small: "Und was macht dein Opa?" },
    shots: [
      SH("Opa schläft in der Hängematte.", "پدربزرگ توی ننو می‌خوابد.", "schläft", "Opa lies in a hammock between two trees with his flat cap over his eyes, little Z letters float up", "Opa snores, his belly goes up and down and the Z letters float up, the hammock swings gently"),
      SH("Opa angelt einen Fisch.", "پدربزرگ ماهی می‌گیرد.", "angelt", "Opa sits on the wooden jetty holding a fishing rod over the lake", "Opa pulls hard on the rod and lifts an old brown boot out of the water instead of a fish, he stares at it surprised"),
      SH("Opa kocht Suppe.", "پدربزرگ سوپ می‌پزد.", "kocht", "Opa stands at a garden table stirring a big pot of soup with a wooden spoon", "Opa stirs the soup, it bubbles up and foams over the edge of the pot, Opa jumps back"),
      SH("Opa liest die Zeitung.", "پدربزرگ روزنامه می‌خواند.", "liest", "Opa sits in a garden chair holding a newspaper", "Opa holds the newspaper upside down, frowns, turns his head sideways to read it and nods wisely"),
      SH("Opa fährt Fahrrad.", "پدربزرگ دوچرخه سواری می‌کند.", "fährt", "Opa sits on a small bicycle on the garden path", "Opa pedals and wobbles wildly from side to side with his legs sticking out, then rides in a circle"),
      SH("Opa singt laut.", "پدربزرگ بلند آواز می‌خواند.", "singt", "Opa stands under a tree with his mouth wide open, singing", "Opa sings with his arms spread, musical notes fly out of his mouth and the birds flutter away from the tree"),
      SH("Opa tanzt im Garten.", "پدربزرگ توی باغ می‌رقصد.", "tanzt", "Opa dances on the green lawn with a happy golden dog", "Opa dances with funny steps and spins around, the dog jumps and dances along"),
      SH("Opa putzt das Auto.", "پدربزرگ ماشین را تمیز می‌کند.", "putzt", "Opa stands next to a red car with a big sponge, a bucket and a garden hose", "the hose slips out of Opa's hand and sprays water over him from head to toe, he shakes himself like a dog"),
      SH("Opa malt ein Bild.", "پدربزرگ نقاشی می‌کشد.", "malt", "Opa stands at an easel with a brush and a palette of colours", "Opa paints and steps back to look, the picture shows a wobbly smiling sun, he nods proudly"),
      SH("Opa isst ein Eis.", "پدربزرگ بستنی می‌خورد.", "isst", "Opa holds a big ice cream cone with three scoops, the golden dog sits next to him", "the top scoop falls off the cone and the dog catches it happily, Opa looks down at the empty cone and laughs"),
    ],
  },
};

export const OPA_CFG = {
  key: "opa", plain: true, faSub: true, bed: "kitchen", bedPick: "kitchen-1", bedGain: 0.28, series: OPA, episodes: OPA_EPISODES, shotPrefix: "pa-", rtl: false, natural: true,
  style: OPA_STYLE, cast: OPA_CAST,
  brand: { title: OPA.title, sub: () => "Deutsch im Alltag", logo: false },
  deliverBrand: { label: "Was macht Opa", file: "opa" },
  endCard: (E) => ({ t0: 0, de: E.endText.de, fa: E.endText.fa, small: E.endText.small, smallFa: "" }),
  caption: (E, no) => `👴 ${OPA.title}\n${E.titleFa}\n\n#LearnGerman #Deutsch #Verben #Humor #fyp`,
};
