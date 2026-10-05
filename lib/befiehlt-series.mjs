// «Frau Krause befiehlt» (owner, 2026-10-05, after a reference short: six scenes, one German imperative each, no
// translation on the picture, no music, the meaning is in the action). Own characters (Frau Krause, Herr Braun), own
// commands and order. The characters speak German, the German line is the big caption, the Persian is a small
// subtitle (owner's earlier choice for the channel). Built on Hugging Face (portraits -> FLUX Kontext stills ->
// Wan motion clips) by the series engine; manual workflow only (.github/workflows/befiehlt-video.yml).
import { L } from "./easy-series.mjs";

export const BEFIEHLT = {
  title: "Frau Krause befiehlt",
  titleFa: "خانم کراوزه فرمان می‌دهد",
  characters: {
    krause: { name: "Frau Krause", voice: "de-DE-AmalaNeural", voices: ["de-DE-ElkeNeural", "de-DE-KlarissaNeural", "de-DE-AmalaNeural"], speed: 0.94, pitch: "-20Hz" },
    braun: { name: "Herr Braun", voice: "de-DE-ConradNeural", speed: 0.96, pitch: "-12Hz" },
  },
};

export const BEFIEHLT_CAST = {
  krause: { ref: "public/ai-cast/krause-cu.png", look: "an elderly woman in her late sixties with short curly silver-grey hair in pink hair curlers, round glasses on a chain, a floral pink bathrobe, sharp curious eyes and a bossy expression" },
  braun: { ref: "public/ai-cast/braun-cu.png", look: "a man in his thirties with short dark-brown hair, light stubble and a small beard tuft under the lower lip, a blue crew-neck sweatshirt, a grumpy suspicious expression" },
};
export const BEFIEHLT_STYLE = "High-end 3D animated feature film still, Pixar-like stylised characters, warm natural light, shallow depth of field, rich detailed textures, expressive exaggerated faces, vertical 9:16 frame, the characters in the lower two thirds of the frame and calm background above them, clean image with no text, no letters and no watermark";

const POSS = { krause: "her", braun: "his" };
const SH = (who, loc, scene, motion, lines) => ({ who, chars: [who], loc, scene, lines,
  motion: lines.some((l) => l.by === who) ? `${motion}, ${POSS[who]} mouth moving while speaking` : motion });
const STAIRS = "in an old apartment building stairwell with a wooden banister and a warm hallway light";
const KITCHEN = "in a cosy old-fashioned kitchen with wooden cupboards and a steaming pot on the stove";
const HALL = "in a narrow apartment hallway with a coat rack and a row of shoes";
const FRONT = "in front of an old apartment building entrance on a snowy winter evening";
const LIVING = "in a cosy living room with an armchair, a patterned carpet and warm lamp light";

export const BEFIEHLT_EPISODES = {
  "b01-komm-her": {
    title: "Komm her!", titleFa: "بیا اینجا!",
    next: { de: "Frau Krause befiehlt noch einmal", fa: "خانم کراوزه دوباره فرمان می‌دهد" },
    endText: { de: "Wer in deiner Familie befiehlt?", fa: "در خانوادهٔ تو چه کسی فرمان می‌دهد؟", small: "Schick das an jemanden, der befiehlt.", smallFa: "برای کسی بفرست که فرمان می‌دهد." },
    shots: [
      SH("krause", "treppenhaus", `${STAIRS}, leaning out of her apartment door and waving her whole arm to call someone over, bossy`, "she waves her arm in big beckoning circles and points at the floor in front of her", [
        L("krause", "Komm her!", "بیا اینجا!", "her", { emo: "angry" }),
        L("krause", "Komm her, sage ich!", "می‌گویم بیا اینجا!", "sage", { emo: "angry" })]),
      SH("braun", "treppenhaus", `${STAIRS}, peeking out of his door with a toaster hidden behind his back, a guilty squint`, "he hides the toaster behind his back and shuffles slowly forward", [
        L("braun", "Ich komme ja schon.", "دارم می‌آیم دیگر.", "schon", { joke: true })]),
      SH("krause", "kueche", `${KITCHEN}, holding a full wooden spoon of soup out towards the camera with a hopeful bossy smile`, "she pushes the spoon forward and nods encouragingly", [
        L("krause", "Probier das!", "این را امتحان کن!", "Probier", { emo: "happy" }),
        L("krause", "Los, probier!", "زود باش، امتحان کن!", "Los", { emo: "angry" })]),
      SH("braun", "kueche", `${KITCHEN}, tasting a spoon of soup with a suspicious frown that slowly turns into wide surprised eyes`, "he sips, frowns, then his eyes go wide and he licks his lips", [
        L("braun", "Noch einmal.", "یک بار دیگر.", "Noch einmal", { joke: true })]),
      SH("krause", "treppenhaus", `${STAIRS}, one finger pressed to her lips while shouting angrily, curlers bouncing`, "she shouts with a finger on her lips and glares", [
        L("krause", "Sei leise!", "ساکت باش!", "leise", { emo: "angry" }),
        L("krause", "Sei leise, es ist Sonntag!", "ساکت باش، یکشنبه است!", "Sonntag", { emo: "angry", joke: true })]),
      SH("braun", "treppenhaus", `${STAIRS}, tiptoeing exaggeratedly down the stairs holding a pile of plates, a nervous grin`, "he tiptoes with huge careful steps, then wobbles as a plate slips", [
        L("braun", "Ich bin leise!", "من ساکتم!", "leise", { emo: "fearful" }),
        L("krause", "Pssst!", "هیس!", "Pssst", { emo: "angry", joke: true })]),
      SH("krause", "flur", `${HALL}, pointing sternly at a huge pile of full rubbish bags by the door`, "she points at the bags, then throws one more bag onto the pile", [
        L("krause", "Trag den Müll raus!", "زباله را ببر بیرون!", "Müll", { emo: "angry" }),
        L("krause", "Und den auch!", "و این را هم!", "auch", { emo: "angry", joke: true })]),
      SH("braun", "flur", `${HALL}, staggering under four rubbish bags with a toaster under one arm, flat tired face`, "he staggers under the bags and sighs heavily", [
        L("braun", "Ich bin kein Esel.", "من الاغ نیستم.", "Esel", { emo: "sad", joke: true })]),
      SH("krause", "tuer", `${FRONT}, holding up one flat hand like a stop sign, bundled in a thick coat over her bathrobe`, "she raises a flat palm firmly and nods once", [
        L("krause", "Warte hier!", "اینجا صبر کن!", "hier", { emo: "angry" })]),
      SH("braun", "tuer", `${FRONT}, standing and shivering with snow piled on his head and shoulders, hands in his armpits`, "he shivers, snow falls off his hat, he checks an invisible watch", [
        L("braun", "Wie lange noch?", "چقدر دیگر؟", "lange", { emo: "sad", joke: true })]),
      SH("krause", "tuer", `${FRONT}, coming back with a big cake on a plate and a soft warm smile`, "she walks up with the cake and holds it out gently", [
        L("krause", "Hier. Für dich.", "بفرما. برای تو.", "Für dich", { emo: "happy" })]),
      SH("braun", "wohnzimmer", `${LIVING}, carrying a tea tray with two cups towards the camera, a proud shy smile`, "he walks in carefully with the tray and points at the armchair", [
        L("braun", "Setz dich!", "بنشین!", "Setz", { emo: "happy" })]),
      SH("krause", "wohnzimmer", `${LIVING}, sitting down in the armchair with surprised wide eyes that turn into a warm smile, holding a cup`, "she sits, blinks in surprise, then smiles warmly", [
        L("krause", "Zu Befehl.", "به روی چشم.", "Befehl", { emo: "happy", joke: true })]),
    ],
  },
};

export const BEFIEHLT_CFG = {
  key: "befiehlt", series: BEFIEHLT, episodes: BEFIEHLT_EPISODES, shotPrefix: "bf-", rtl: false, natural: true,
  style: BEFIEHLT_STYLE, cast: BEFIEHLT_CAST,
  brand: { title: BEFIEHLT.title, sub: () => "Deutsch im Alltag", logo: false },
  deliverBrand: { label: "Frau Krause befiehlt", file: "befiehlt" },
  endCard: (E) => ({ t0: 0, de: E.endText.de, fa: E.endText.fa, small: E.endText.small, smallFa: E.endText.smallFa }),
  caption: (E, no) => `😂 ${BEFIEHLT.title} — ${E.title}\n${E.titleFa}\n\n#LearnGerman #Deutsch #Imperativ #Comedy #Alltag #fyp`,
};
