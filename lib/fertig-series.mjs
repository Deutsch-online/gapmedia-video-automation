// «Lena macht sich fertig» (owner, 2026-10-05, second reference short: one character, one place, six first-person
// sentences "Ich + Verb", each shown twice: a wide shot of the action, then a close-up of the face saying it).
// Own character (Lena), own topic (getting ready for the Amt appointment), own sentences. The German sentence is the
// big caption (the verb in red), no music, the meaning is in the action. Built on Hugging Face by the series engine;
// manual workflow only (.github/workflows/fertig-video.yml).
import { L } from "./easy-series.mjs";

export const FERTIG = {
  title: "Lena macht sich fertig",
  titleFa: "لنا آماده می‌شود",
  characters: {
    lena: { name: "Lena", voice: "de-DE-KatjaNeural", speed: 1.0 },
  },
};

export const FERTIG_CAST = {
  lena: { ref: "public/ai-cast/lena-cu.png", look: "a young woman in her twenties with long wavy dark-brown hair parted in the middle, big warm brown eyes, small silver hoop earrings, a friendly expressive face" },
};
export const FERTIG_STYLE = "High-end 3D animated feature film still, Pixar-like stylised character, warm natural morning light, shallow depth of field, rich detailed textures, expressive appealing face, vertical 9:16 frame, the character in the lower two thirds of the frame and calm background above, clean image with no text, no letters and no watermark";

const SH = (loc, scene, motion, lines) => ({ who: "lena", chars: ["lena"], loc, scene, lines, motion: `${motion}, her mouth moving while speaking` });
// one scene = a wide shot of the action and a close-up of the face saying the sentence again
const SCENE = (loc, say, fa, hl, wide, wideMotion, close, closeMotion, extra = {}) => [
  SH(loc, wide, wideMotion, [L("lena", say, fa, hl, { emo: "neutral" })]),
  SH(loc, close, closeMotion, [L("lena", extra.closeSay || say, extra.closeFa || fa, extra.closeHl || hl, { emo: "happy", joke: !!extra.joke })]),
];

export const FERTIG_EPISODES = {
  "g01-fertig": {
    title: "Ich mache mich fertig", titleFa: "من آماده می‌شوم",
    next: { de: "Lena beim Amt", fa: "لنا در اداره" },
    endText: { de: "Und du? Was machst du morgens?", fa: "و تو؟ صبح‌ها چه می‌کنی؟", small: "Schreib es in die Kommentare.", smallFa: "در کامنت‌ها بنویس." },
    shots: [
      ...SCENE("schlafzimmer", "Ich stehe auf.", "بلند می‌شوم.", "stehe",
        "in a cosy bedroom in the early morning, getting out of bed with messy hair and a blanket slipping off, stretching her arms, a small alarm clock on the nightstand", "she throws the blanket off, sits up and stretches with a big yawn",
        "close-up of her sleepy face with messy hair, eyes half open, a tired but friendly smile", "she blinks, yawns and smiles sleepily at the camera"),
      ...SCENE("bad", "Ich putze mir die Zähne.", "دندان‌هایم را مسواک می‌زنم.", "putze",
        "in a bright small bathroom standing at the sink brushing her teeth, a mirror and a plant on the shelf", "she brushes her teeth with big circular motions and looks at herself in the mirror",
        "close-up of her face with foamy toothpaste at the corner of her smile, a toothbrush in her hand", "she brushes, then gives a foamy grin to the camera"),
      ...SCENE("schlafzimmer", "Ich ziehe mich an.", "لباس می‌پوشم.", "ziehe",
        "in the bedroom in front of an open wardrobe pulling a blazer on over a white blouse, clothes on hangers behind her", "she puts on the blazer, tugs the sleeves straight and checks the wardrobe mirror",
        "close-up of her face with a proud confident smile, the collar of the blazer straightened", "she smooths the collar with both hands and smiles proudly"),
      ...SCENE("kueche", "Ich mache den Kaffee.", "قهوه درست می‌کنم.", "mache",
        "in a sunny kitchen pouring hot coffee from a coffee pot into a mug, steam rising, the window behind her", "she pours the coffee carefully and the steam curls up",
        "close-up of her happy face breathing in the steam of a coffee mug, eyes closed with delight", "she lifts the mug, sniffs the steam and sighs happily"),
      ...SCENE("flur", "Ich nehme die Unterlagen mit.", "مدارک را با خودم می‌برم.", "nehme",
        "in a narrow hallway putting a thick stack of official papers and forms into a bag, a coat rack and keys next to her", "she stuffs the stack of papers into her bag and zips it",
        "close-up of her face, determined and a little nervous, holding the bag strap", "she nods firmly, takes a deep breath and tightens her grip on the strap"),
      ...SCENE("amt", "Ich gehe zum Amt.", "به اداره می‌روم.", "gehe",
        "in front of a grey government office door early in the morning holding her bag, a sign on the closed door, her hand reaching for the handle", "she walks up to the door with confidence and reaches for the handle",
        "close-up of her face, her smile freezing, then turning into disbelief as she reads a notice on the door", "her smile fades slowly, her eyes go wide and she sighs deeply",
        { closeSay: "Ich gehe nach Hause.", closeFa: "به خانه می‌روم.", closeHl: "nach Hause", joke: true }),
    ],
  },
};

export const FERTIG_CFG = {
  key: "fertig", series: FERTIG, episodes: FERTIG_EPISODES, shotPrefix: "fe-", rtl: false, natural: true,
  style: FERTIG_STYLE, cast: FERTIG_CAST,
  brand: { title: FERTIG.title, sub: () => "Deutsch im Alltag", logo: false },
  deliverBrand: { label: "Lena macht sich fertig", file: "fertig" },
  endCard: (E) => ({ t0: 0, de: E.endText.de, fa: E.endText.fa, small: E.endText.small, smallFa: E.endText.smallFa }),
  caption: (E, no) => `😂 ${FERTIG.title} — ${E.title}\n${E.titleFa}\n\n#LearnGerman #Deutsch #Alltag #Routine #Comedy #fyp`,
};
