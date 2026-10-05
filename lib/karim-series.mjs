// «Karim im Amt» — one stand-alone comedy short (owner, 2026-10-05, own script, built on Hugging Face
// ZeroGPU / Inference Providers). Karim is a migrant who knows three German words and is sure he is a
// language master. The characters SPEAK simple German (Karim with the mistakes of a beginner) and the
// owner's Persian lines are the subtitle under every caption. No music bed (natural mode, like the
// family series). Built by karim-build.mjs; manual workflow only (.github/workflows/karim-video.yml).

import { L } from "./easy-series.mjs";

export const KARIM = {
  title: "Karim im Amt",
  titleFa: "کریم در اداره",
  characters: {
    karim: { name: "Karim", voice: "de-DE-KillianNeural", speed: 1.04, pitch: "+4Hz" },
    clerk: { name: "Die Sachbearbeiterin", voice: "de-DE-KatjaNeural", speed: 0.94 },
    boss: { name: "Der Chef", voice: "de-DE-ConradNeural", speed: 0.96, pitch: "-12Hz" },
  },
};

export const KARIM_CAST = {
  karim: { look: "a man of about thirty with short black hair, light stubble, a very confident grin, an oversized baggy suit that is too big for him and dark sunglasses" },
  clerk: { look: "a middle-aged woman clerk with her hair in a tight bun, round glasses, a grey blazer and a completely expressionless serious face" },
  boss: { look: "a tired man of about fifty, thinning hair, a loose crooked tie, dark circles under his eyes, a white shirt and an exhausted look" },
};
export const KARIM_STYLE = "High-end 3D animated feature film still, Pixar-like stylised characters, cold office light, shallow depth of field, rich detailed textures, expressive appealing faces, vertical 9:16 frame, the characters in the lower two thirds of the frame and calm background above them, clean image with no text, no letters and no watermark";

const POSS = { karim: "his", clerk: "her", boss: "his" };
const SH = (who, loc, scene, motion, lines) => ({ who, chars: [who], loc, scene, lines,
  motion: lines.some((l) => l.by === who) ? `${motion}, ${POSS[who]} mouth moving while speaking` : motion });
const AMT = "in a German government office with a counter, filing cabinets and cold ceiling lights";

export const KARIM_EPISODES = {
  "k01-im-amt": {
    title: "Der Neue", titleFa: "کارمند جدید",
    next: { de: "Karims erster Arbeitstag", fa: "اولین روز کاری کریم" },
    endText: { de: "Willkommen in der deutschen Arbeitswelt!", fa: "به دنیای کار در آلمان خوش آمدید!" },
    shots: [
      SH("karim", "amt", `${AMT}, walking in through the door with huge confidence, arms spread wide`, "he strides in proudly and points at himself with both thumbs", [
        L("karim", "Guten Tag! Ich bin Superman!", "گوتن تاگ! ایش بین سوپرمن!", "Superman", { emo: "happy" }),
        L("clerk", "Wie bitte?", "ببخشید؟!", "bitte", { emo: "surprised" }),
        L("karim", "Ich suche Arbeit!", "من آمدم کار پیدا کنم!", "Arbeit", { emo: "happy" })]),
      SH("clerk", "amt", `${AMT}, sitting behind her desk with a deadpan face and folded hands`, "she stares without blinking and raises one eyebrow slightly", [
        L("clerk", "Sprechen Sie Deutsch?", "آیا آلمانی صحبت می‌کنید؟", "Deutsch"),
        L("karim", "Natürlich! Sehr gut!", "البته! من خیلی خوبم!", "Sehr gut", { emo: "happy", cut: true }),
        L("clerk", "Warum sind Sie hier?", "پس بگویید، چرا اینجا آمده‌اید؟", "hier"),
        L("karim", "Google Maps sagt: Amt!", "چون گوگل مپ گفت اینجا اداره است!", "Google Maps", { emo: "happy", joke: true })]),
      SH("clerk", "amt", `${AMT}, taking her glasses off slowly and staring up at the ceiling in despair, a huge form on the desk`, "she removes her glasses and stares at the ceiling with a long sigh", [
        L("clerk", "Bitte füllen Sie das Formular aus.", "لطفاً این فرم را پر کنید.", "Formular")]),
      SH("karim", "amt", `${AMT}, holding up an absurdly long paper form that unrolls from the desk all the way across the floor, shocked wide eyes`, "he holds the endless form up in shock and looks at it from top to bottom", [
        L("karim", "Kaufvertrag für Deutschland?!", "این فرم است یا قرارداد خرید آلمان؟!", "Kaufvertrag", { emo: "surprised" }),
        L("clerk", "Nur persönliche Daten.", "فقط اطلاعات شخصی شماست.", "persönliche"),
        L("karim", "Warum fragen Sie nach Opas Opa?!", "پس چرا درباره پدربزرگِ پدربزرگم هم سؤال دارد؟!", "Opas Opa", { emo: "surprised", joke: true })]),
      SH("boss", "amt", `${AMT}, bursting through the office door with an angry red face, tie crooked`, "he storms in and throws up both arms in anger", [
        L("boss", "Was ist hier los?!", "اینجا چه خبر است؟!", "los", { emo: "angry" }),
        L("karim", "Hitler?!", "هیتلر؟!", "Hitler", { emo: "surprised", gap: 0.7, joke: true })]),
      SH("clerk", "amt", `${AMT}, with both hands pressed over her mouth in horror, eyes huge behind her glasses`, "she gasps and freezes with her hands over her mouth", [
        L("boss", "Ich bin der Chef!", "من رئیس این اداره‌ام!", "Chef", { emo: "angry" }),
        L("karim", "Ich dachte, historische Person!", "فکر کردم شخصیت تاریخی هستید!", "historische", { emo: "happy" }),
        L("boss", "Ich kündige heute.", "من امروز استعفا می‌دهم.", "kündige", { emo: "sad", joke: true })]),
      SH("karim", "amt", `${AMT}, sitting in a chair opposite the exhausted boss in a job interview, relaxed and smug`, "he leans back smugly in the chair and grins", [
        L("boss", "Ihre Stärken?", "نقاط قوت شما چیست؟", "Stärken"),
        L("karim", "Gestern drei Döner!", "دیروز سه تا دونر خوردم!", "Döner", { emo: "happy" }),
        L("boss", "Ihre Schwäche?", "و نقطه‌ضعف شما؟", "Schwäche"),
        L("karim", "Wenn Döner alle: Charakter ändert sich.", "وقتی دونر تمام می‌شود، شخصیت من تغییر می‌کند.", "Charakter", { emo: "sad", joke: true })]),
      SH("clerk", "amt", `${AMT}, putting a contract on the desk with a stiff expression, the tired boss standing beside her`, "she slides the contract forward with a perfectly straight face", [
        L("boss", "Einstellen. Er ist wenigstens ehrlich.", "استخدامش کنید. حداقل صادق است.", "ehrlich", { emo: "sad" }),
        L("clerk", "Sie sind eingestellt!", "شما استخدام شدید!", "eingestellt"),
        L("karim", "Wirklich?!", "واقعاً؟!", "Wirklich", { emo: "surprised" })]),
      SH("karim", "amt", `${AMT}, proudly signing a contract with a big pen, a wide smile that slowly starts to fade`, "he signs proudly, then his smile slowly fades into worry", [
        L("karim", "Was arbeite ich hier?", "اینجا دقیقاً چه کاری انجام می‌دهم؟", "arbeite", { emo: "happy" }),
        L("boss", "Sie sind Übersetzer!", "شما مترجم ما هستید!", "Übersetzer", { emo: "happy", joke: true })]),
      SH("karim", "amt", `${AMT}, throwing the contract on the floor and sprinting towards the door in panic, suit flapping`, "he throws the paper down and runs for the door in panic", [
        L("karim", "Ich kenne nicht mal Guten Morgen!", "من حتی نمی‌دانم Guten Morgen یعنی چی!", "Guten Morgen", { emo: "fearful" }),
        L("boss", "Wie haben Sie bestanden?!", "پس چطور مصاحبه را قبول شدی؟!", "bestanden", { emo: "angry" }),
        L("karim", "Ich habe nur genickt!", "من فقط سر تکان می‌دادم!", "genickt", { emo: "fearful", joke: true })]),
      SH("clerk", "amt", `${AMT}, standing calmly next to the tired boss, both looking straight into the camera with flat faces`, "she turns slowly to the boss, then both stare into the camera without moving", [
        L("clerk", "Chef, uns haben sie genauso eingestellt!", "رئیس، ما هم همین‌طوری استخدام شدیم!", "genauso", { joke: true })]),
    ],
  },
};

export const KARIM_CFG = {
  key: "karim", series: KARIM, episodes: KARIM_EPISODES, shotPrefix: "ka-", rtl: false, natural: true,
  style: KARIM_STYLE, cast: KARIM_CAST,
  brand: { title: KARIM.title, sub: () => "Comedy · Alltag in Deutschland", logo: false },
  deliverBrand: { label: "Karim im Amt", file: "karim" },
  endCard: (E) => ({ t0: 0, de: E.endText.de, fa: E.endText.fa, small: `Nächste Folge: ${E.next.de}`, smallFa: `قسمت بعد: ${E.next.fa}` }),
  caption: (E, no) => `😂 ${KARIM.title} — ${E.title}\n${E.titleFa}\n\n#Comedy #Deutschland #Migration #Alltag #LearnGerman #fyp`,
};
