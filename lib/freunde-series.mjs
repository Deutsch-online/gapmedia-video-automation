// «Falsche Freunde» (owner, 2026-10-05, third reference short: a girl makes a classic English-speaker's mistake with a
// German word that looks like an English one, the grandfather corrects it gently, the sentence is said again right).
// Own characters and own word pairs: Lena (learning German) and Herr Braun (grumpy, corrects her). Six scenes, each a
// wide-and-close pair of shots: the WRONG sentence, then the RIGHT one. The channel explains in English, so English-
// German false friends are the mistake the audience really makes. The German sentence is the big caption (the key word
// red). No music. Built on Hugging Face by the series engine; manual workflow (.github/workflows/freunde-video.yml).
import { L } from "./easy-series.mjs";

export const FREUNDE = {
  title: "Falsche Freunde",
  titleFa: "دوستان دروغین",
  characters: {
    lena: { name: "Lena", voice: "de-DE-KatjaNeural", speed: 1.0 },
    braun: { name: "Herr Braun", voice: "de-DE-ConradNeural", speed: 0.96, pitch: "-12Hz" },
  },
};

export const FREUNDE_CAST = {
  lena: { ref: "public/ai-cast/v2/lena.jpg", look: "a lovely cartoon young woman with long wavy dark-brown hair, big sparkling brown eyes, a pink hoodie, light blue jeans and white sneakers" },
  braun: { ref: "public/ai-cast/v2/braun.jpg", look: "a friendly cartoon man with short dark-brown hair, light stubble and a small beard tuft, a blue sweatshirt, dark trousers and brown shoes" },
};
export const FREUNDE_STYLE = "High-end 3D animated feature film still, Pixar-like stylised characters, warm natural light, shallow depth of field, bright cheerful pastel colours, wide shot with the whole body visible, vertical 9:16 frame, clean image with no text, no letters and no watermark";

const POSS = { lena: "her", braun: "his" };
// the mouth is not described: a speaking shot is made by the lip-sync model from the voice itself (owner, 2026-10-05: the lips move
// only as much as the text), so the motion prompt only says what the body does
const SH = (who, loc, scene, motion, lines) => ({ who, chars: [who], loc, scene, lines, motion });

export const FREUNDE_EPISODES = {
  "f01-falsche-freunde": {
    title: "Falsche Freunde", titleFa: "دوستان دروغین",
    next: { de: "Noch mehr falsche Freunde", fa: "دوستان دروغین بیشتر" },
    endText: { de: "Welches Wort hat dich reingelegt?", fa: "کدام کلمه تو را گول زد؟", small: "Schick das an jemanden, der Deutsch lernt.", smallFa: "برای کسی بفرست که آلمانی یاد می‌گیرد." },
    shots: [
      SH("lena", "cafe", "at a small round cafe table holding a menu and rubbing her stomach, a proud confident smile, a coffee cup in front of her", "she rubs her stomach and nods proudly while talking", [
        L("lena", "Ich bin müde. Also ich bin hungrig.", "من خسته‌ام. «also» من گرسنه‌ام.", "Also", { emo: "happy" })]),
      SH("braun", "cafe", "sitting across the cafe table with one raised eyebrow and folded hands, patient and dry", "he raises an eyebrow, lifts one finger and corrects her calmly", [
        L("braun", "Auch, nicht also.", "«auch»، نه «also».", "Auch"),
        L("lena", "Ich bin auch hungrig!", "من هم گرسنه‌ام!", "auch", { emo: "happy", cut: true })]),
      SH("lena", "strasse", "standing proudly in front of a big school building with a sports bag over her shoulder, a gym towel around her neck", "she lifts the sports bag proudly and points at the school entrance", [
        L("lena", "Ich gehe ins Gymnasium.", "من به «gymnasium» می‌روم.", "Gymnasium", { emo: "happy" })]),
      SH("braun", "strasse", "standing next to her pointing at the school with a deadpan face, children with schoolbags walking past", "he points at the school, then gestures toward a fitness studio sign across the street", [
        L("braun", "Das ist eine Schule.", "این یک مدرسه است.", "Schule"),
        L("lena", "Ich gehe ins Fitnessstudio.", "من به باشگاه ورزشی می‌روم.", "Fitnessstudio", { emo: "happy", joke: true })]),
      SH("lena", "wohnzimmer", "in a living room holding a graduation certificate high with a dreamy hopeful face, a stethoscope around her neck", "she holds the certificate up and looks dreamily into the distance", [
        L("lena", "Ich bekomme Arzt!", "من «bekomme» پزشک!", "bekomme", { emo: "happy" })]),
      SH("braun", "wohnzimmer", "standing in the living room looking at her with a gentle shake of the head, then a small nod of approval", "he shakes his head slowly, then nods once", [
        L("braun", "Du wirst Arzt.", "تو پزشک می‌شوی.", "wirst"),
        L("lena", "Ich werde Arzt!", "من پزشک می‌شوم!", "werde", { emo: "happy", cut: true })]),
      SH("lena", "museum", "in a quiet art museum standing in front of a big colourful painting with her hands clasped, admiring it with shining eyes", "she sighs happily at the painting and clasps her hands", [
        L("lena", "Ich mag die Art.", "من «art» را دوست دارم.", "Art", { emo: "happy" })]),
      SH("braun", "museum", "in the art museum beside her with a patient half-smile, pointing at the painting frame", "he points at the painting and says it slowly and clearly", [
        L("braun", "Kunst. Das heißt Kunst.", "«Kunst». یعنی «Kunst».", "Kunst"),
        L("lena", "Ich mag die Kunst.", "من هنر را دوست دارم.", "Kunst", { emo: "happy", cut: true })]),
      SH("lena", "park", "in a sunny park stretching one arm out to pat the air at head height with a sweet smile, like praising a good dog, flowers and trees around", "she pats the air happily and smiles sweetly", [
        L("lena", "Herr Braun, Sie sind sehr brav!", "آقای براون، شما خیلی «brav» هستید!", "brav", { emo: "happy" })]),
      SH("braun", "park", "in the park deeply offended with a stiff upright pose and narrowed eyes, arms crossed", "he stiffens, narrows his eyes and straightens his back with dignity", [
        L("braun", "Ich bin kein Hund. Ich bin mutig.", "من سگ نیستم. من شجاعم.", "mutig", { emo: "angry" }),
        L("lena", "Sie sind mutig!", "شما شجاع هستید!", "mutig", { emo: "happy", joke: true })]),
      SH("lena", "kueche", "in a kitchen pointing in panic at the floor next to a kitchen cabinet where a small brown rat sits, her other hand holding a wooden spoon", "she points at the floor with a wide-eyed frightened face and jumps back", [
        L("lena", "Ich habe einen Rat in der Küche!", "من یک «Rat» در آشپزخانه دارم!", "Rat", { emo: "fearful" })]),
      SH("braun", "kueche", "in the kitchen holding a broom calmly and pointing at a small brown rat on the floor with his other hand", "he holds the broom, looks at the rat and then at her with a flat expression", [
        L("braun", "Rat ist ein Tipp. Das ist eine Ratte.", "«Rat» یعنی توصیه. این یک موش است.", "Ratte", { emo: "neutral" }),
        L("lena", "Eine Ratte!", "یک موش!", "Ratte", { emo: "fearful", joke: true })]),
    ],
  },
};

export const FREUNDE_CFG = {
  key: "freunde", plain: true, series: FREUNDE, episodes: FREUNDE_EPISODES, shotPrefix: "fr2-", rtl: false, natural: true,
  style: FREUNDE_STYLE, cast: FREUNDE_CAST,
  brand: { title: FREUNDE.title, sub: () => "Deutsch im Alltag", logo: false },
  deliverBrand: { label: "Falsche Freunde", file: "freunde" },
  // plain (owner, 2026-10-05: exactly like the reference shorts): only the German sentence on the picture, no Persian, no names, no brand
  endCard: (E) => ({ t0: 0, de: E.endText.de, fa: "", small: E.endText.small, smallFa: "" }),
  caption: (E, no) => `😂 ${FREUNDE.title} — ${E.title}\n${E.titleFa}\n\n#LearnGerman #Deutsch #FalseFriends #Comedy #Alltag #fyp`,
};
