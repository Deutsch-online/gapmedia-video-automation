// «Chai & Chaos» (چای و آشوب) — an Afghan family abroad as a daily comedy-drama (owner, 2026-10-04):
// Baba Nasir, Madar Zarmina, their daughter Mina (8) and the toddler Sami (3). Everyday life that
// every family abroad knows (guests, letters from the office, supermarket prices, school), told in
// full-screen AI shots with the four cartoon characters of public/family/*.jpg. The lines are
// Persian, spoken and written on the picture (red punchline word); no lessons, no English.
// Voices: Edge fa-IR (Farid for the father, Dilara for the mother; Mina and Sami are Dilara with a
// higher pitch) — Iranian accent, not Dari: stated to the owner, logged in VOICE-LOG.md.

import { L } from "./easy-series.mjs";

export const FAMILY = {
  title: "Chai & Chaos",
  titleFa: "چای و آشوب",
  characters: {
    baba: { name: "Baba", voice: "en-US-GuyNeural", speed: 1.0, mm: { voices: ["English_Trustworth_Man", "English_Gentle-voiced_man", "English_Diligent_Man"], mod: { pitch: -30, intensity: 25, timbre: -15 } } },
    madar: { name: "Mama", voice: "en-US-JennyNeural", speed: 1.0, mm: { voices: ["English_Graceful_Lady", "English_CalmWoman", "English_SentimentalLady"], mod: { pitch: 10, intensity: 10, timbre: 25 } } },
    mina: { name: "Mina", voice: "en-US-AnaNeural", speed: 1.0, mm: { voices: ["English_PlayfulGirl", "English_LovelyGirl", "English_Kind-heartedGirl"], speed: 1.05, pitch: 1, mod: { pitch: 40, intensity: 15, timbre: 35 } } },
    sami: { name: "Sami", voice: "en-US-AnaNeural", speed: 1.05, pitch: "+18Hz", mm: { voices: ["English_Strong-WilledBoy", "English_PlayfulGirl"], speed: 1.05, pitch: 3, mod: { pitch: 75, intensity: 20, timbre: 45 } } },
  },
};

export const FAMILY_CAST = {
  baba: { ref: "public/family/baba.jpg", look: "a friendly chubby man in his forties, short black hair with a receding hairline, warm brown eyes, small moles on his cheeks, light stubble, dark blue henley shirt" },
  madar: { ref: "public/family/madar.jpg", look: "a warm woman in her thirties, long wavy dark brown curly hair, brown eyes, freckles, magenta t-shirt" },
  mina: { ref: "public/family/mina.jpg", look: "an eight year old girl with long straight black hair and bangs, big brown eyes, light freckles, lavender sweatshirt with a pink flower pin" },
  sami: { ref: "public/family/sami.jpg", look: "a three year old toddler boy with short black curly hair, big brown eyes, rosy cheeks, grey and navy t-shirt with a teddy bear wearing a crown" },
};
export const FAMILY_STYLE = "High-end 3D animated feature film still, Pixar-like stylised family, warm natural light, shallow depth of field, rich detailed textures, expressive appealing faces, vertical 9:16 frame, the characters in the lower two thirds of the frame and calm background above them, clean image with no text, no letters and no watermark";

const POSS = { baba: "his", madar: "her", mina: "her", sami: "his" };
// SH(who, loc, scene, motion, lines): one character on the picture, one or more lines (see lib/easy-series.mjs)
const SH = (who, loc, scene, motion, lines) => ({ who, chars: [who], loc, scene, lines,
  motion: lines.some((l) => l.by === who) ? `${motion}, ${POSS[who]} mouth moving while speaking` : motion });
const HOME = "in a cosy small apartment living room with a sofa and a patterned carpet";


export const FAMILY_EPISODES = {
  "f01-guests": {
    title: "Surprise Guests", titleFa: "مهمان‌های ناخوانده",
    next: { en: "Is There Enough Food?", fa: "غذا کم می‌آید؟" },
    shots: [
      SH("madar", "kueche", "in a small apartment kitchen standing proudly beside an enormous steaming pot that is bigger than she is, wooden spoon in hand", "she stirs the giant pot proudly with a big smile", [
        L("madar", "Only three guests are coming. I cooked just a little rice.", "فقط سه مهمان می‌آید. من کمی برنج پختم.", "little", { emo: "happy" }),
        L("baba", "A little? This pot could feed a wedding!", "کمی؟ این دیگ برای یک عروسی است!", "wedding", { emo: "surprised", joke: true })]),
      SH("mina", "flur", "in a small apartment hallway pointing at a long row of shoes beside the front door, wide eyes", "she points at the shoes and counts with her finger", [
        L("mina", "Baba, I counted. Twelve pairs of shoes at the door!", "بابا، من شمردم. دوازده جفت کفش پشت در است!", "Twelve", { emo: "surprised" }),
        L("baba", "Twelve?! They said three!", "دوازده؟ سه نفر گفتند!", "three", { emo: "fearful", cut: true })]),
      SH("madar", "kueche", "in the kitchen with a calm wise smile and one finger raised, apron on", "she raises a finger wisely and smiles calmly", [
        L("madar", "Relax. An Afghan guest never comes alone.", "آرام باش. یک مهمان افغان هیچ‌وقت تنها نمی‌آید.", "alone", { emo: "happy", joke: true })]),
      SH("baba", "wohnzimmer", `${HOME}, pouring tea from a teapot into small glasses with a hopeful smile`, "he pours tea carefully and smiles", [
        L("baba", "While we wait: tea. Always tea first.", "تا منتظریم: چای. همیشه اول چای.", "tea", { emo: "happy" }),
        L("madar", "Twenty guests means forty cups!", "بیست مهمان یعنی چهل استکان!", "forty", { emo: "surprised", cut: true })]),
      SH("sami", "wohnzimmer", `${HOME}, a toddler sitting on the carpet banging a spoon on an empty plate, huge cute grin`, "he bangs the spoon on the plate and laughs", [
        L("sami", "I'm hungry! I'm hungry!", "من گرسنه‌ام! من گرسنه‌ام!", "hungry", { emo: "happy" }),
        L("baba", "Sami, wait for the guests.", "سامی، منتظر مهمان‌ها باش.", "wait", { emo: "neutral" }),
        L("sami", "No wait!", "نه صبر!", "No wait", { emo: "angry", joke: true })]),
      SH("baba", "wohnzimmer", `${HOME}, with a heroic noble expression, one hand on his chest`, "he puts a hand on his chest nobly and nods", [
        L("baba", "Guests eat first. We eat later.", "مهمان‌ها اول می‌خورند. ما بعداً.", "later", { emo: "neutral" }),
        L("mina", "And when do WE eat?", "پس ما کی بخوریم؟", "WE", { emo: "sad", cut: true }),
        L("baba", "In the next life.", "در زندگی بعدی.", "next life", { emo: "sad", joke: true })]),
      SH("madar", "kueche", "in the kitchen lifting a second giant pot with a triumphant grin", "she lifts the second pot triumphantly", [
        L("madar", "Don't panic. I have a second pot.", "نگران نباش. من یک دیگ دیگر هم دارم.", "second pot", { emo: "happy", sfx: "tada" }),
        L("baba", "A second pot?!", "یک دیگ دیگر؟!", "second", { emo: "surprised" }),
        L("madar", "I always have a second pot.", "من همیشه یک دیگ دیگر دارم.", "always", { emo: "happy", joke: true })]),
      SH("baba", "tuer", "standing at an apartment door with his hand on the handle, a nervous sweating smile, soft doorbell glow", "he straightens his shirt nervously and turns the handle", [
        L("baba", "Everyone smile. Here we go.", "همه لبخند بزنید. شروع می‌کنیم.", "smile", { emo: "happy", sfx: "ring" })]),
      SH("baba", "tuer", "at the open door staring at something huge off-screen, jaw dropped, eyes wide", "his jaw drops and he slowly steps back", [
        L("baba", "Oh no ... twenty people.", "وای نه ... بیست نفر.", "twenty", { emo: "fearful" }),
        L("mina", "Baba, there's a bus outside!", "بابا، بیرون یک اتوبوس هست!", "bus", { emo: "surprised", joke: true })]),
    ],
  },
  "f02-letter": {
    title: "A Letter From the Office", titleFa: "نامه از اداره",
    next: { en: "Was the Translation Right?", fa: "ترجمه درست بود؟" },
    shots: [
      SH("baba", "tuer", "standing at the apartment door holding a white official envelope with a stamp, a worried frown", "he turns the envelope over nervously and gulps", [
        L("baba", "A letter from the government office. In another language.", "یک نامه از اداره دولتی. به زبان دیگر.", "government", { emo: "fearful" }),
        L("madar", "Open it. Slowly.", "بازش کن. آهسته.", "Slowly", { emo: "fearful", cut: true })]),
      SH("baba", "wohnzimmer", `${HOME}, holding a letter at arm's length and squinting, confused`, "he squints at the letter and tilts his head", [
        L("baba", "I don't understand. Every word is huge!", "نمی‌فهمم. همه‌اش کلمه‌های بلند است!", "huge", { emo: "surprised", joke: true }),
        L("madar", "Then ask the phone.", "پس از گوشی بپرس.", "phone", { emo: "neutral" })]),
      SH("mina", "wohnzimmer", `${HOME}, a clever girl holding a phone and reading its screen with a puzzled frown`, "she reads the phone and frowns in puzzlement", [
        L("mina", "Baba, I'll translate it. It says: you must dance the trash.", "بابا، ترجمه می‌کنم. نوشته: باید زباله را برقصانید.", "dance", { emo: "surprised", joke: true })]),
      SH("baba", "wohnzimmer", `${HOME}, with a shocked offended face, hand raised`, "he raises his hand in shock and shakes his head", [
        L("baba", "Dance the trash? In a foreign country?", "زباله را برقصانم؟ در غربت؟", "Dance", { emo: "angry" }),
        L("madar", "Maybe it's a local tradition.", "شاید یک رسم محلی است.", "tradition", { emo: "happy", joke: true })]),
      SH("sami", "wohnzimmer", `${HOME}, a toddler dancing happily next to a small waste bin, big grin`, "he dances wildly next to the bin and giggles", [
        L("sami", "Trash dance! Trash dance!", "رقص زباله! رقص زباله!", "Trash dance", { emo: "happy", joke: true, sfx: "pop" }),
        L("baba", "Sami, stop. That's the bin!", "سامی، بس کن. این سطل زباله است!", "bin", { emo: "angry", cut: true })]),
      SH("baba", "wohnzimmer", `${HOME}, pressing a phone to his ear with a tired face`, "he holds the phone and rolls his eyes", [
        L("baba", "Hello? Hello? Why is there music?", "الو؟ الو؟ چرا موسیقی است؟", "music", { emo: "angry" }),
        L("madar", "They put you on hold. Dance.", "منتظرت گذاشتند. برقص.", "Dance", { emo: "happy", joke: true })]),
      SH("madar", "wohnzimmer", `${HOME}, with a confident smile holding up a phone`, "she holds up the phone confidently", [
        L("madar", "Call my cousin. He knows everything.", "به پسرخاله‌ام زنگ بزن. او همه‌چیز می‌داند.", "cousin", { emo: "happy" }),
        L("baba", "Your cousin says the earth is flat.", "پسرخاله‌ات می‌گوید زمین صاف است.", "flat", { emo: "disgusted", cut: true, joke: true })]),
      SH("mina", "wohnzimmer", `${HOME}, a clever girl holding a second phone with a proud grin`, "she scrolls on the phone and grins proudly", [
        L("mina", "The second app says: congratulations, you have won a bin.", "اپلیکیشن دوم می‌گوید: تبریک، شما یک سطل زباله برنده شدید.", "bin", { emo: "happy" }),
        L("baba", "Finally, I win something!", "بالاخره من چیزی برنده شدم!", "win", { emo: "happy", joke: true })]),
      SH("mina", "wohnzimmer", `${HOME}, reading a different line on the phone with a giggle, hand over her mouth`, "she giggles with her hand over her mouth", [
        L("mina", "Wait ... it says: paint the bin blue.", "صبر کنید ... نوشته: سطل را آبی کنید.", "blue", { emo: "happy" }),
        L("baba", "Blue?!", "آبی؟!", "Blue", { emo: "surprised", joke: true })]),
      SH("madar", "wohnzimmer", `${HOME}, standing with her arms crossed and a decided look, a coat over her arm`, "she puts on her coat decisively and points at the door", [
        L("madar", "Enough apps. We go to the office and ask.", "بس است اپلیکیشن. به اداره می‌رویم و می‌پرسیم.", "ask", { emo: "angry" }),
        L("baba", "In person? With my face?", "حضوری؟ با همین صورتم؟", "face", { emo: "fearful", cut: true, joke: true })]),
    ],
  },
  "f03-pizza": {
    title: "Pizza or Qabuli?", titleFa: "پیتزا یا قابلی؟",
    next: { en: "Who Ate the Pizza?", fa: "چه کسی پیتزا خورد؟" },
    shots: [
      SH("mina", "wohnzimmer", `${HOME}, with big pleading puppy eyes and hands together`, "she pleads with big puppy eyes and clasped hands", [
        L("mina", "Baba, everyone in my class eats pizza!", "بابا، همه بچه‌های کلاس پیتزا می‌خورند!", "pizza", { emo: "sad" }),
        L("baba", "Pizza? We have qabuli!", "پیتزا؟ ما قابلی داریم!", "qabuli", { emo: "angry", joke: true })]),
      SH("mina", "wohnzimmer", `${HOME}, spreading her arms in exasperation`, "she spreads her arms in exasperation", [
        L("mina", "But it's qabuli every day! Even yesterday!", "ولی هر روز قابلی! دیروز هم قابلی!", "yesterday", { emo: "angry" }),
        L("madar", "Qabuli is food for champions, Mina.", "قابلی غذای قهرمانان است، مینا جان.", "champions", { emo: "happy", joke: true })]),
      SH("baba", "wohnzimmer", `${HOME}, giving in with a sigh, hands up in surrender`, "he sighs and raises his hands in surrender", [
        L("baba", "Fine. One time. But we go like men.", "باشد. فقط یک بار. ولی مثل مرد می‌رویم.", "One time", { emo: "sad" }),
        L("mina", "Yes! Yes! Yes!", "آره! آره! آره!", "Yes", { emo: "happy", cut: true })]),
      SH("baba", "strasse", "standing outside a pizzeria on a street with his nose toward the open door, a dreamy hungry look, his hand on his stomach", "he sniffs the air dreamily and swallows", [
        L("baba", "Remember: we are only looking. Only looking.", "یادتان باشد: فقط نگاه می‌کنیم. فقط نگاه.", "looking", { emo: "neutral" }),
        L("mina", "Baba, you're drooling.", "بابا، آب دهانت راه افتاده.", "drooling", { emo: "happy", cut: true, joke: true })]),
      SH("baba", "pizzeria", "in a small pizzeria staring at a price board with shock, hand on his forehead", "he reads the price board and reels back in shock", [
        L("baba", "Fifteen for bread and cheese?!", "پانزده برای نان و پنیر؟!", "Fifteen", { emo: "surprised", joke: true }),
        L("madar", "For that money I can cook three pots of qabuli.", "با این پول سه دیگ قابلی می‌پزم.", "three pots", { emo: "angry" })]),
      SH("sami", "pizzeria", "a toddler sitting in a high chair in a pizzeria grabbing at a slice with both hands, tomato sauce on his cheeks", "he grabs the pizza slice with both hands and giggles", [
        L("sami", "Pizza! Me! Me!", "پیتزا! من! من!", "Me", { emo: "happy", sfx: "pop" }),
        L("mina", "Please, Baba. Just one slice.", "لطفاً بابا. فقط یک تکه.", "one slice", { emo: "sad" })]),
      SH("baba", "pizzeria", "chewing a pizza slice with a thoughtful judging expression, trying to hide his enjoyment", "he chews thoughtfully and nods slowly, trying to hide his pleasure", [
        L("baba", "It's okay. Needs salt.", "بد نیست. نمک می‌خواهد.", "salt", { emo: "neutral", joke: true }),
        L("madar", "Baba, that's your third slice.", "بابا، این تکهٔ سوم توست.", "third", { emo: "happy", cut: true })]),
      SH("baba", "pizzeria", "mouth full, caught red-handed holding a fourth slice, an innocent face", "he freezes holding the slice with an innocent face", [
        L("baba", "I'm not eating. I'm testing.", "من نمی‌خورم. دارم آزمایش می‌کنم.", "testing", { emo: "fearful" }),
        L("mina", "You're on slice four.", "تو الان تکهٔ چهارمی.", "four", { emo: "happy", joke: true })]),
      SH("madar", "pizzeria", "with a sly smile leaning forward as if sharing a secret, tomato sauce on her chin", "she smiles slyly and wipes her chin", [
        L("madar", "Next week we make pizza at home.", "هفتهٔ بعد در خانه پیتزا می‌پزیم.", "home", { emo: "happy" }),
        L("madar", "With qabuli on top.", "با قابلی رویش.", "qabuli", { emo: "happy", joke: true })]),
      SH("baba", "wohnzimmer", `${HOME}, presenting a tray with a proud grin, a pizza with rice and raisins on it`, "he presents the tray proudly with a big grin", [
        L("baba", "Behold! Qabuli pizza!", "ببینید! پیتزای قابلی!", "Qabuli pizza", { emo: "happy" }),
        L("mina", "Baba ... no.", "بابا ... نه.", "no", { emo: "sad", joke: true })]),
    ],
  },
  "f04-supermarket": {
    title: "Prices", titleFa: "قیمت‌ها",
    next: { en: "Which One Is Cheaper?", fa: "کدام ارزان‌تر است؟" },
    shots: [
      SH("baba", "supermarkt", "in a bright supermarket aisle holding a shiny apple and staring at a price label, shocked", "he stares at the apple and the price label in shock", [
        L("baba", "How much?! For ONE apple?!", "چقدر؟! برای یک سیب؟!", "ONE", { emo: "surprised" }),
        L("baba", "Back home this money buys an orchard!", "در وطن با این پول یک باغ می‌خریدم!", "orchard", { emo: "angry", joke: true })]),
      SH("madar", "supermarkt", "in the supermarket pushing a shopping cart with a strict patient look and holding a shopping list", "she taps the shopping list firmly and looks at him", [
        L("madar", "We're not back home. Just follow the list.", "اینجا وطن نیست. فقط لیست را بخر.", "list", { emo: "angry" }),
        L("baba", "The list is a suggestion.", "لیست فقط یک پیشنهاد است.", "suggestion", { emo: "happy", cut: true, joke: true })]),
      SH("baba", "supermarkt", "in the supermarket holding a small calculator and a cucumber, his brows deeply furrowed, counting", "he taps the calculator and winces at the result", [
        L("baba", "In afghanis, this cucumber is a month of salary!", "به افغانی، این خیار حقوق یک ماه است!", "cucumber", { emo: "fearful", joke: true }),
        L("madar", "Stop converting. It hurts.", "تبدیل نکن. درد دارد.", "hurts", { emo: "sad", cut: true })]),
      SH("mina", "supermarkt", "in the supermarket pointing to a bright yellow discount sticker, excited", "she points at the sticker excitedly and jumps", [
        L("mina", "Baba, tomatoes are thirty percent off!", "بابا، گوجه سی درصد تخفیف دارد!", "thirty percent", { emo: "happy" }),
        L("baba", "Thirty off? Then I'm buying twenty kilos!", "سی درصد؟ پس بیست کیلو می‌خرم!", "twenty kilos", { emo: "happy", joke: true })]),
      SH("madar", "supermarkt", "in the supermarket facing the camera with hands on hips and wide disbelieving eyes", "she puts her hands on her hips in disbelief", [
        L("madar", "There are two adults and one toddler!", "ما دو بزرگسال و یک کودک هستیم!", "two adults", { emo: "angry" }),
        L("sami", "Chocolate! Chocolate! Chocolate!", "شکلات! شکلات! شکلات!", "Chocolate", { emo: "happy", cut: true })]),
      SH("baba", "supermarkt", "at a free-sample table in the supermarket holding a tiny paper cup with a greedy happy grin", "he grabs another sample with a greedy grin", [
        L("baba", "Free samples? I'll take five.", "نمونهٔ رایگان؟ پنج‌تا می‌گیرم.", "five", { emo: "happy", joke: true }),
        L("madar", "Baba, that's the same cup.", "بابا، این همان لیوان است.", "same cup", { emo: "angry", cut: true })]),
      SH("baba", "kasse", "at a supermarket checkout holding a plastic bag as if it were a gold bar, offended", "he holds up the bag and stares at it in offence", [
        L("baba", "Wait. The bag costs money?", "صبر کن. کیسه هم پول دارد؟", "bag", { emo: "surprised" }),
        L("madar", "I brought one from home.", "من یکی از خانه آوردم.", "home", { emo: "happy", sfx: "ding", joke: true })]),
      SH("baba", "kasse", "at the checkout looking at his wife with admiration and hearts in his eyes, hands clasped", "he gazes at her proudly with clasped hands", [
        L("baba", "My wife. The finance minister.", "همسرم. وزیر اقتصاد.", "minister", { emo: "happy", joke: true })]),
      SH("mina", "kasse", "next to a cart full of vegetables, whispering with wide eyes", "she whispers and glances around", [
        L("mina", "Mama ... Baba put twenty kilos of tomatoes in the cart.", "مامان ... بابا بیست کیلو گوجه در گاری گذاشته.", "twenty kilos", { emo: "fearful" }),
        L("madar", "Baba! Put them back!", "بابا! برشان گردان!", "back", { emo: "angry", cut: true, joke: true })]),
      SH("baba", "kasse", "at the checkout holding a long receipt that reaches the floor, staring at it in disbelief", "he holds up the long receipt and stares at it", [
        L("baba", "Why is the receipt longer than the shopping?", "چرا رسید از خرید بلندتر است؟", "receipt", { emo: "surprised" }),
        L("madar", "Because you bought twenty kilos.", "چون بیست کیلو خریدی.", "twenty", { emo: "angry", joke: true })]),
    ],
  },
  "f05-homework": {
    title: "Mina's Homework", titleFa: "تکلیف مینا",
    next: { en: "Does Baba Pass?", fa: "بابا قبول می‌شود؟" },
    shots: [
      SH("mina", "wohnzimmer", `${HOME}, standing proudly with a ruler like a teacher, glasses too big for her face`, "she taps the ruler on her palm like a strict teacher", [
        L("mina", "Baba, today I'm your teacher!", "بابا، امروز من معلم شما هستم!", "teacher", { emo: "happy" }),
        L("baba", "Yes, teacher. I'm a good student.", "بله معلم. من شاگرد خوبی هستم.", "good student", { emo: "happy", joke: true })]),
      SH("mina", "wohnzimmer", `${HOME}, holding up a picture of a squirrel like a lesson prop`, "she holds the picture up and asks with raised eyebrows", [
        L("mina", "Repeat after me: squirrel.", "بعد از من تکرار کن: سنجاب.", "squirrel", { emo: "neutral" }),
        L("baba", "Skwi ... rel? Skurrel? Squirt?", "اسکوی ... رل؟ اسکرل؟ اسکوِرت؟", "Squirt", { emo: "surprised", joke: true })]),
      SH("madar", "kueche", "in the kitchen holding a teapot over her shoulder, amused smile watching them", "she holds the teapot and chuckles", [
        L("madar", "Who wants tea? Not squirrel tea.", "چه کسی چای می‌خواهد؟ نه چای سنجاب.", "squirrel tea", { emo: "happy", joke: true }),
        L("sami", "No! No! No!", "نه! نه! نه!", "No", { emo: "angry", cut: true })]),
      SH("mina", "wohnzimmer", `${HOME}, pointing at her little brother proudly with a laugh`, "she points proudly at her brother and laughs", [
        L("mina", "Sami said 'no' perfectly!", "سامی «نه» را عالی گفت!", "perfectly", { emo: "happy" }),
        L("baba", "So Sami is better than me. And he's three!", "پس سامی از من بهتر است. و او سه ساله است!", "three", { emo: "sad", joke: true })]),
      SH("madar", "kueche", "in the kitchen reading a calendar with a confused frown, wooden spoon in hand", "she squints at the calendar and frowns", [
        L("madar", "Why do they write Wednesday and say Wensday?", "چرا Wednesday می‌نویسند و «ونزدی» می‌گویند؟", "Wednesday", { emo: "angry" }),
        L("mina", "Nobody knows, Mama.", "هیچ‌کس نمی‌داند، مامان.", "Nobody", { emo: "sad", joke: true })]),
      SH("madar", "kueche", "in the kitchen trying hard to say a word, lips pursed and a wooden spoon raised like a microphone", "she purses her lips and tries to say the word", [
        L("madar", "Squirrel ... squirl ... skwerl. Forget it. Rat with a tail.", "سنجاب ... اسکوِرل ... فراموشش کن. موش دم‌دار.", "Rat with a tail", { emo: "angry", joke: true }),
        L("mina", "That's not nice to the squirrel!", "این برای سنجاب خوب نیست!", "nice", { emo: "angry", cut: true })]),
      SH("baba", "wohnzimmer", `${HOME}, sitting up proudly with a hand on his chest like a poet`, "he sits up proudly and puts a hand on his chest", [
        L("baba", "In my language, I'm a poet.", "به زبان خودم من شاعرم.", "poet", { emo: "happy" }),
        L("mina", "Then say it in English.", "پس به انگلیسی بگو.", "English", { emo: "neutral", cut: true }),
        L("baba", "Um ... tea.", "ام ... چای.", "tea", { emo: "sad", joke: true })]),
      SH("mina", "wohnzimmer", `${HOME}, holding up a notebook with a stern teacher face and a tiny smile`, "she holds up the notebook sternly and points to it", [
        L("mina", "Homework: say squirrel one hundred times.", "تکلیف: صد بار بگو سنجاب.", "one hundred", { emo: "happy" }),
        L("baba", "I'll go to the park and ask a real squirrel.", "به پارک می‌روم و از یک سنجاب واقعی می‌پرسم.", "real squirrel", { emo: "happy", joke: true })]),
      SH("baba", "wohnzimmer", `${HOME}, standing in front of a mirror practicing with a serious face`, "he practices in the mirror with a serious face", [
        L("baba", "Squirrel. Squirrel. Squirrel.", "سنجاب. سنجاب. سنجاب.", "Squirrel", { emo: "neutral" }),
        L("sami", "Skwirl!", "اسکوِرل!", "Skwirl", { emo: "happy", cut: true }),
        L("baba", "He said it perfectly. I quit.", "او عالی گفت. من تسلیم.", "quit", { emo: "sad", joke: true })]),
    ],
  },
  "f06-sunday-quiet": {
    title: "Quiet Sunday", titleFa: "یکشنبه ساکت",
    next: { en: "Where Is Sami's Drum?", fa: "طبل سامی کجا رفت؟" },
    shots: [
      SH("madar", "wohnzimmer", `${HOME}, finger on her lips whispering carefully`, "she puts a finger to her lips and whispers", [
        L("madar", "Today is Sunday. The neighbors are sleeping.", "امروز یکشنبه است. همسایه‌ها خوابیده‌اند.", "sleeping", { emo: "fearful" }),
        L("baba", "Quiet! Even breathe quietly!", "یواش! حتی نفس هم یواش!", "breathe", { emo: "fearful", cut: true, joke: true })]),
      SH("sami", "wohnzimmer", `${HOME}, a toddler holding a toy drum and sticks with an evil happy grin`, "he lifts the drumsticks with an evil happy grin", [
        L("sami", "Drum! Boom boom boom!", "طبل! بوم بوم بوم!", "Boom", { emo: "happy", sfx: "pop" }),
        L("baba", "Sami, softly! Baba loves you!", "سامی، آهسته! بابا قربانت!", "softly", { emo: "fearful" })]),
      SH("madar", "kueche", "in the kitchen tiptoeing with a tray of cookies, a finger on her lips, cautious steps", "she tiptoes with the tray of cookies", [
        L("madar", "I'll bake cookies. Silent cookies.", "کلوچه می‌پزم. کلوچهٔ بی‌صدا.", "Silent", { emo: "fearful" }),
        L("baba", "Is there a silent oven?", "مگر فر بی‌صدا هم هست؟", "silent oven", { emo: "surprised", cut: true, joke: true })]),
      SH("mina", "wohnzimmer", `${HOME}, holding the phone against her chest and whispering with huge eyes`, "she whispers with huge eyes holding the phone to her chest", [
        L("mina", "Baba, the neighbor called. His ceiling is shaking.", "بابا، همسایه زنگ زد. سقفش می‌لرزد.", "shaking", { emo: "fearful", sfx: "ring" }),
        L("baba", "I'll apologize. With tea and sweets!", "می‌روم عذرخواهی. با چای و شیرینی!", "sweets", { emo: "happy", cut: true })]),
      SH("baba", "flur", "at a neighbour's door holding a tray with tea glasses and sweets and an apologetic big smile, bowing slightly", "he bows slightly holding the tray with an apologetic smile", [
        L("baba", "Hello neighbor. We brought sweets. Sorry, sorry, sorry.", "سلام همسایه. شیرینی آوردیم. ببخشید، ببخشید.", "sorry", { emo: "happy", joke: true })]),
      SH("madar", "wohnzimmer", `${HOME}, anxiously twisting a dish towel, hopeful`, "she wrings the towel anxiously and looks at the door", [
        L("madar", "Did he accept?", "پذیرفت؟", "accept", { emo: "fearful" }),
        L("baba", "He did! And he invited us for tea tomorrow!", "پذیرفت! و ما را فردا به چای دعوت کرد!", "tomorrow", { emo: "happy", sfx: "tada", cut: true })]),
      SH("baba", "wohnzimmer", `${HOME}, hugging a wardrobe door with a sneaky grin, drum on top of the wardrobe`, "he pushes the drum high on the wardrobe with a sneaky grin", [
        L("baba", "Problem solved. I hid the drum on the wardrobe.", "مشکل حل شد. طبل را روی کمد قایم کردم.", "wardrobe", { emo: "happy" }),
        L("mina", "Baba ... Sami is climbing.", "بابا ... سامی دارد بالا می‌رود.", "climbing", { emo: "fearful", joke: true })]),
      SH("mina", "tuer", "at the front door with her ear against it, freezing with wide eyes and one hand raised", "she freezes with her ear to the door", [
        L("mina", "Someone is knocking! Everybody freeze!", "کسی در می‌زند! همه بایستید!", "freeze", { emo: "fearful", sfx: "tick" }),
        L("baba", "Don't move. Don't breathe. Hide the drum!", "تکان نخورید. نفس نکشید. طبل را قایم کنید!", "Hide", { emo: "fearful", cut: true }),
        L("sami", "Boom!", "بوم!", "Boom", { emo: "happy", joke: true })]),
      SH("sami", "wohnzimmer", `${HOME}, the toddler drumming wildly with an angelic grin, cheeks rosy`, "he drums wildly with an angelic grin", [
        L("sami", "Boom! Boom! Boom! Boom! Boom!", "بوم! بوم! بوم! بوم! بوم!", "Boom", { emo: "happy", sfx: "sting" })]),
    ],
  },
  "f07-keys": {
    title: "Lost Keys", titleFa: "کلید گم شد",
    next: { en: "Where Were the Keys?", fa: "کلید کجا بود؟" },
    shots: [
      SH("baba", "tuer", "at the apartment door patting all his pockets frantically, sweating", "he pats his pockets frantically and spins", [
        L("baba", "Keys? Where are the keys?", "کلید؟ کلید کجاست؟", "keys", { emo: "fearful" }),
        L("madar", "Again? Third time this month.", "باز هم؟ این ماه سومین بار است.", "Third", { emo: "angry", cut: true, joke: true })]),
      SH("baba", "tuer", "pointing at nothing with a defensive innocent face", "he points defensively and shrugs", [
        L("baba", "I didn't lose them. The keys left.", "من گم نکردم. کلید خودش رفت.", "left", { emo: "angry", joke: true }),
        L("mina", "Maybe I can climb in through the window?", "شاید از پنجره بالا بروم؟", "window", { emo: "happy" })]),
      SH("baba", "tuer", "waving both hands in panic, wide eyes, looking around nervously", "he waves his hands in panic and looks around", [
        L("baba", "No! The neighbors will think we're thieves!", "نه! همسایه‌ها فکر می‌کنند دزد هستیم!", "thieves", { emo: "fearful" })]),
      SH("baba", "tuer", "holding a phone to his ear with a shocked face", "he holds the phone and his eyes bulge", [
        L("baba", "A locksmith costs HOW much?!", "قفل‌ساز چقدر می‌گیرد؟!", "HOW much", { emo: "surprised", joke: true }),
        L("mina", "Told you. Window.", "گفتم. پنجره.", "Window", { emo: "happy", cut: true })]),
      SH("mina", "fenster", "climbing in through a window with one leg inside, a triumphant grin, hair a bit messy", "she swings a leg in through the window triumphantly", [
        L("mina", "I'm in! Opening the door!", "من داخل شدم! در را باز می‌کنم!", "in", { emo: "happy", sfx: "pop" }),
        L("baba", "Mina! Get down! The neighbors are watching!", "مینا! پایین بیا! همسایه‌ها نگاه می‌کنند!", "watching", { emo: "angry", cut: true, joke: true })]),
      SH("sami", "tuer", "a toddler standing at the door holding his small hand behind his back, a guilty giggle", "he hides his hand behind his back and giggles", [
        L("sami", "Keys ... game! Game!", "کلید ... بازی! بازی!", "game", { emo: "happy" }),
        L("madar", "Sami, show Mama your hand.", "سامی، دستت را به مامان نشان بده.", "hand", { emo: "neutral" })]),
      SH("sami", "tuer", "the toddler patting his round belly proudly with a huge innocent smile", "he pats his belly proudly and nods", [
        L("sami", "No! Keys in tummy!", "نه! کلید در شکم!", "tummy", { emo: "happy", joke: true, sfx: "pop" }),
        L("baba", "In his tummy?! Ambulance!", "در شکمش؟! آمبولانس!", "Ambulance", { emo: "fearful", cut: true })]),
      SH("madar", "tuer", "pointing calmly at her husband's jacket pocket with a deadpan face", "she points at his pocket with a deadpan face", [
        L("madar", "He's lying. The keys are in your pocket.", "او دروغ می‌گوید. کلید در جیب توست.", "pocket", { emo: "neutral" })]),
      SH("baba", "tuer", "pulling the keys out of his pocket with an embarrassed laugh, scratching his head", "he pulls out the keys and laughs embarrassed", [
        L("baba", "Oh. Well. Everyone behaved well today!", "اوه. خب. امروز همه خوب بودند!", "behaved", { emo: "happy", joke: true, sfx: "rimshot" })]),
      SH("madar", "tuer", "holding a small flowerpot and lifting it to show a spare key under it, a wise smile", "she lifts the flowerpot to show the spare key", [
        L("madar", "Next time: a spare key under the flowerpot.", "دفعهٔ بعد: یک کلید یدکی زیر گلدان.", "flowerpot", { emo: "happy" }),
        L("baba", "Everyone knows the flowerpot.", "همه گلدان را می‌دانند.", "Everyone", { emo: "surprised" }),
        L("madar", "Exactly. Even the thieves.", "دقیقاً. حتی دزدها.", "thieves", { emo: "happy", joke: true })]),
    ],
  },
};

export const FAMILY_CFG = {
  key: "family", series: FAMILY, episodes: FAMILY_EPISODES, shotPrefix: "fa-", rtl: false,
  style: FAMILY_STYLE, cast: FAMILY_CAST,
  brand: { title: FAMILY.title, sub: (E, no) => `Afghan family abroad · Ep. ${no}`, logo: false },
  deliverBrand: { label: "Chai & Chaos", file: "family" },
  endCard: (E) => ({ t0: 0, de: "To be continued …", fa: "ادامه دارد …", small: `Next: ${E.next.en}`, smallFa: `قسمت بعد: ${E.next.fa}` }),
  caption: (E, no) => `😂 ${FAMILY.title} · Ep. ${no} — ${E.title}\n${E.titleFa}\n\n#AfghanFamily #FamilyComedy #ImmigrantLife #Chai #Comedy #fyp`,
};
