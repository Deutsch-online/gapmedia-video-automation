// «Die Suppe» (owner, 2026-10-07: a phone call between two funny people, like the reference short, but our OWN characters and story).
// The two characters were drawn (design approved by the owner) and are the references of every shot: the boss (Chefin) in her office
// hallway and the cook (Koch) in his kitchen talk over the phone, one German sentence per shot. The visible person speaks, so every shot is
// lip-synced (LongCat-Video-Avatar on Hugging Face). German sentence with the verb in red and a Persian subtitle. Music bed kitchen-1.
import { L } from "./easy-series.mjs";

export const SUPPE = {
  title: "Die Suppe",
  titleFa: "سوپ",
  characters: {
    chefin: { name: "Chefin", voice: "de-DE-KatjaNeural", speed: 0.97 },
    koch: { name: "Koch", voice: "de-DE-ConradNeural", speed: 1 },
  },
};
export const SUPPE_CAST = {
  chefin: { ref: "public/ai-cast/v2/chefin.jpg", look: "an elegant confident woman in her forties with big voluminous wavy auburn hair, green eyes, black cat-eye glasses, red lipstick, a bordeaux blazer over a white blouse, black pencil skirt, white cartoon gloves, bold 2D cartoon style" },
  koch: { ref: "public/ai-cast/v2/koch.jpg", look: "a cheerful stocky chef in his forties with a tall white chef hat, thick black moustache, a white double-breasted chef jacket with a red neckerchief, white cartoon gloves, bold 2D cartoon style" },
};
export const SUPPE_STYLE = "bold 2D cartoon in the style of a modern adult animated TV comedy series, thick black outlines, flat cel-shaded colours, expressive exaggerated faces, vertical 9:16 frame, clean image with no text, no letters and no watermark";
export const SUPPE_WIDE = "MEDIUM shot from the knees up: the character fills the frame, the face is large and clearly visible with the mouth fully visible, facing the camera, holding a smartphone to one ear with a white-gloved hand, the place visible behind, in exactly the same bold 2D cartoon style as the reference picture, vertical 9:16, no text, no watermark.";

const OFFICE = "standing in a bright modern office hallway with peach walls, ceiling lights, a glass window and a plant";
const KITCHEN = "standing in a professional steel kitchen with white tiles, hanging pans and a steaming pot on the stove behind";
const C = (de, fa, hl, mood, extra = "") => ({ who: "chefin", chars: ["chefin"], loc: "buero", scene: `${OFFICE}, ${mood}${extra}`, motion: `she talks on the phone with lively facial expressions, her mouth moving while speaking`, lines: [L("chefin", de, fa, hl, { emo: "neutral" })] });
const K = (de, fa, hl, mood, extra = "") => ({ who: "koch", chars: ["koch"], loc: "kueche", scene: `${KITCHEN}, ${mood}${extra}`, motion: `he talks on the phone with lively facial expressions, his mouth moving while speaking`, lines: [L("koch", de, fa, hl, { emo: "happy" })] });

export const SUPPE_EPISODES = {
  "s01-suppe": {
    title: "Die Suppe", titleFa: "سوپ",
    next: { de: "Der Anruf", fa: "تماس" },
    endText: { de: "Guten Appetit!", fa: "نوش جان!", small: "Und was kochst du heute?" },
    shots: [
      C("Wo ist die Suppe?", "سوپ کجاست؟", "ist", "she looks impatient with one raised eyebrow, asking a question"),
      K("Die Suppe? Sie ist gleich fertig!", "سوپ؟ الان آماده می‌شود!", "ist", "he looks nervous and sweats, holding a bowl of red soup in the other hand"),
      C("Gleich? Der Gast wartet seit einer Stunde!", "الان؟! مهمان یک ساعت است منتظر است!", "wartet", "she is furious, angry frown, teeth showing, shouting"),
      K("Ich koche so schnell ich kann.", "تا جایی که می‌توانم سریع می‌پزم.", "koche", "he looks worried and sweats, holding the bowl of red soup"),
      C("Probieren Sie die Suppe. Ist sie gut?", "سوپ را امتحان کنید. خوب است؟", "Probieren", "she looks suspicious and smug with one eyebrow raised"),
      K("Hmm. Sie ist ein bisschen kalt.", "هوم. کمی سرد است.", "ist", "he tastes the soup with a spoon and looks unsure, nervous smile, holding the bowl"),
      C("Kalt?! Dann machen Sie sie warm!", "سرد؟! پس گرمش کنید!", "machen", "she is shocked and angry, eyes wide, mouth wide open"),
      K("Chefin, das ist Gazpacho. Man isst ihn kalt!", "خانم رئیس، این گازپاچو است. باید سرد خورد!", "isst", "he grins proudly and holds up the bowl of cold red soup"),
      C("Ach so. Dann bringen Sie ihn sofort!", "آهان. پس فوراً بیاورید!", "bringen", "she looks surprised and slightly embarrassed, then pretends to be cool"),
      K("Sofort, Chefin! Ich bin schon unterwegs.", "فوراً، خانم رئیس! دارم می‌آیم.", "bin", "he smiles happily and relieved, holding the bowl"),
      C("Und lächeln Sie bitte!", "و لطفاً لبخند بزنید!", "lächeln", "she smiles sweetly and smugly with a wink"),
      K("Ich lächle doch die ganze Zeit!", "من که تمام مدت لبخند می‌زنم!", "lächle", "he forces a huge fake smile with sweat on his forehead, holding the bowl"),
    ],
  },
};

export const SUPPE_CFG = {
  key: "suppe", plain: true, faSub: true, bed: "kitchen", bedPick: "kitchen-1", bedGain: 0.28, series: SUPPE, episodes: SUPPE_EPISODES, shotPrefix: "su-", rtl: false, natural: true,
  style: SUPPE_STYLE, wide: SUPPE_WIDE, cast: SUPPE_CAST,
  brand: { title: SUPPE.title, sub: () => "Deutsch im Alltag", logo: false },
  deliverBrand: { label: "Die Suppe", file: "suppe" },
  endCard: (E) => ({ t0: 0, de: E.endText.de, fa: E.endText.fa, small: E.endText.small, smallFa: "" }),
  caption: (E, no) => `📞 ${SUPPE.title}\n${E.titleFa}\n\n#LearnGerman #Deutsch #Alltag #Humor #fyp`,
};
