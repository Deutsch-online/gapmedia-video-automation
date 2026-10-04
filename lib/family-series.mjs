// «خانواده در غربت» — an Afghan family abroad as a daily comedy-drama (owner, 2026-10-04):
// Baba Nasir, Madar Zarmina, their daughter Mina (8) and the toddler Sami (3). Everyday life that
// every family abroad knows (guests, letters from the office, supermarket prices, school), told in
// full-screen AI shots with the four cartoon characters of public/family/*.jpg. The lines are
// Persian, spoken and written on the picture (red punchline word); no lessons, no English.
// Voices: Edge fa-IR (Farid for the father, Dilara for the mother; Mina and Sami are Dilara with a
// higher pitch) — Iranian accent, not Dari: stated to the owner, logged in VOICE-LOG.md.

export const FAMILY = {
  title: "خانواده در غربت",
  characters: {
    baba: { name: "بابا", voice: "fa-IR-FaridNeural", speed: 1.0 },
    madar: { name: "مادر", voice: "fa-IR-DilaraNeural", speed: 1.0 },
    mina: { name: "مینا", voice: "fa-IR-DilaraNeural", speed: 1.05, pitch: "+30Hz" },
    sami: { name: "سامی", voice: "fa-IR-DilaraNeural", speed: 1.05, pitch: "+60Hz" },
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
const S = (who, loc, say, hl, scene, motion, extra = {}) => ({ who, chars: [who], loc, say, hl, scene, motion: `${motion}, ${POSS[who]} mouth moving`, ...extra });
const HOME = "in a cosy small apartment living room with a sofa and a patterned carpet";

export const FAMILY_EPISODES = {
  "f01-guests": {
    title: "مهمان‌های ناخوانده", next: "غذا کم می‌آید؟",
    shots: [
      S("madar", "kueche", "فقط سه مهمان می‌آید. من کمی برنج پختم.", "کمی", `in a small apartment kitchen standing proudly beside an enormous steaming pot that is bigger than she is, ${"wooden spoon in hand"}`, "she stirs the giant pot proudly with a big smile"),
      S("baba", "wohnzimmer", "کمی؟ این دیگ برای یک مهمانی عروسی است!", "عروسی", `${HOME}, looking at something off-screen with wide eyes and open mouth`, "he stares with wide eyes and shakes his head", { joke: true }),
      S("mina", "wohnzimmer", "بابا، من شمردم. دوازده کفش پشت در است!", "دوازده", "in a small apartment hallway pointing at a long row of shoes beside the door, wide eyes", "she points at the shoes and counts with her finger"),
      S("baba", "wohnzimmer", "دوازده؟ سه نفر گفتند!", "سه", `${HOME}, hands on his head in panic`, "he grabs his head in panic and spins around"),
      S("madar", "kueche", "آرام باش. یک مهمان افغان هیچ‌وقت تنها نمی‌آید.", "تنها", "in the kitchen with a calm wise smile and one finger raised, apron on", "she raises a finger wisely and smiles calmly", { joke: true }),
      S("sami", "wohnzimmer", "من گرسنه‌ام! من گرسنه‌ام!", "گرسنه", `${HOME}, a toddler sitting on the carpet banging a spoon on an empty plate, huge cute grin`, "he bangs the spoon on the plate and laughs"),
      S("baba", "wohnzimmer", "مهمان‌ها اول‌ می‌خورند. ما بعداً.", "بعداً", `${HOME}, with a heroic noble expression, one hand on his chest`, "he puts a hand on his chest nobly and nods", { joke: true }),
      S("mina", "wohnzimmer", "پس من چی؟ من هم گرسنه‌ام!", "من هم", `${HOME}, crossing her arms with a pouting face`, "she crosses her arms and pouts"),
      S("madar", "kueche", "فکر نکن! من یک دیگ دیگر هم دارم!", "یک دیگ دیگر", "in the kitchen lifting a second giant pot with a triumphant grin", "she lifts the second pot triumphantly", { sfx: "tada" }),
      S("baba", "tuer", "زنگ در! همه ساکت! بیایند ...", "زنگ در", "standing at an apartment door with his hand on the handle, nervous sweating smile, doorbell glow", "he straightens his shirt nervously and turns the handle", { sfx: "ring" }),
      S("baba", "tuer", "اوه ... بیست نفر!", "بیست", "at the open door staring at something huge off-screen, jaw dropped, eyes wide", "his jaw drops and he slowly steps back", { sfx: "sting" }),
    ],
  },
  "f02-letter": {
    title: "نامه از اداره", next: "ترجمه درست بود؟",
    shots: [
      S("baba", "tuer", "یک نامه آلمانی! از اداره!", "اداره", "standing at the apartment door holding a white official envelope with a stamp, worried frown", "he turns the envelope over nervously and gulps"),
      S("madar", "wohnzimmer", "بخوان! ببین چه نوشته!", "بخوان", `${HOME}, leaning forward curiously with hands clasped`, "she leans forward and urges him on with her hands"),
      S("baba", "wohnzimmer", "من نمی‌فهمم. همه‌اش کلمه‌های بلند است!", "بلند", `${HOME}, holding a letter at arm's length and squinting, confused`, "he squints at the letter and tilts his head", { joke: true }),
      S("mina", "wohnzimmer", "بابا، گوشی را بده. ترجمه می‌کنم.", "ترجمه", `${HOME}, a clever girl holding out her hand for a phone, confident smile`, "she holds out her hand confidently and smiles"),
      S("mina", "wohnzimmer", "نوشته: شما باید زباله‌ را برقصانید.", "برقصانید", `${HOME}, reading a phone screen with a puzzled frown`, "she reads the phone and frowns in puzzlement", { joke: true }),
      S("baba", "wohnzimmer", "برقصانم؟ زباله را؟ در این غربت؟", "زباله", `${HOME}, with a shocked offended face, hand raised`, "he raises his hand in shock and shakes his head"),
      S("madar", "wohnzimmer", "شاید رقص آلمانی است. بیا یاد بگیریم.", "رقص", `${HOME}, shrugging with a hopeful smile, one hand lifted like dancing`, "she shrugs and sways with a hopeful smile", { joke: true }),
      S("sami", "wohnzimmer", "زباله! زباله! می‌رقصم!", "می‌رقصم", `${HOME}, a toddler dancing happily next to a small waste bin, big grin`, "he dances wildly next to the bin and giggles", { sfx: "pop" }),
      S("baba", "tuer", "نه! این ترجمه غلط است! باید پرسید!", "غلط", "at the apartment door with his coat half on, determined face, pointing outside", "he puts his coat on in a rush and points out the door"),
      S("baba", "flur", "همسایه! شما آلمانی بلدید؟ کمک!", "کمک", "in an apartment hallway knocking on a neighbour's door with both fists, desperate smile", "he knocks urgently and waves", { sfx: "ring" }),
      S("mina", "wohnzimmer", "بابا ... نامه می‌گوید: سطل را آبی کنید.", "آبی", `${HOME}, reading a different line on the phone with a giggle, hand over her mouth`, "she giggles with her hand over her mouth", { sfx: "sting" }),
    ],
  },
  "f03-pizza": {
    title: "پیتزا یا قابلی؟", next: "کی پیتزا خورد؟",
    shots: [
      S("mina", "wohnzimmer", "بابا، همه بچه‌های کلاس پیتزا می‌خورند!", "پیتزا", `${HOME}, with big pleading puppy eyes and hands together`, "she pleads with big puppy eyes and clasped hands"),
      S("baba", "wohnzimmer", "پیتزا؟ نان و پنیر! ما قابلی داریم!", "قابلی", `${HOME}, with a proud serious face and one finger raised, patriotic`, "he lifts a finger proudly and shakes his head", { joke: true }),
      S("mina", "wohnzimmer", "اما هر روز قابلی! دیروز هم قابلی!", "هر روز", `${HOME}, spreading her arms in exasperation`, "she spreads her arms in exasperation"),
      S("madar", "kueche", "قابلی غذای قهرمانان است، مینا جان.", "قهرمانان", "in the kitchen holding a plate of rice with raisins and carrots, serene proud smile", "she presents the plate with a serene smile", { joke: true }),
      S("baba", "wohnzimmer", "باشد. فقط یک بار. ولی مثل مرد آمد.", "یک بار", `${HOME}, giving in with a sigh, hands up in surrender`, "he sighs and raises his hands in surrender"),
      S("baba", "pizzeria", "این پیتزا چقدر است؟ پانزده یورو؟!", "پانزده", "in a small pizzeria staring at a price board with shock, hand on his forehead", "he reads the price board and reels back in shock", { joke: true }),
      S("madar", "pizzeria", "با این پول سه دیگ قابلی می‌پزم!", "سه دیگ", "in the pizzeria whispering fiercely into his ear with raised eyebrows", "she whispers fiercely with raised eyebrows"),
      S("mina", "pizzeria", "بابا، لطفاً. یک بار. فقط یک تکه.", "یک تکه", "in the pizzeria hugging a menu to her chest with huge shining eyes", "she hugs the menu and blinks hopefully"),
      S("sami", "pizzeria", "پیتزا! پیتزا! من! من!", "من", "a toddler sitting in a high chair in a pizzeria, grabbing at a slice with both hands, tomato sauce on his cheeks", "he grabs the pizza slice with both hands and giggles", { sfx: "pop" }),
      S("baba", "pizzeria", "خوشمزه است ... فقط کمی. کمی نمک می‌خواهد.", "نمک", "chewing a pizza slice with a thoughtful judging expression, trying to hide his enjoyment", "he chews thoughtfully and nods slowly, trying to hide his pleasure", { joke: true }),
      S("madar", "pizzeria", "بابا ... تو سه تکه خوردی.", "سه تکه", "looking sideways at him in the pizzeria with a knowing smirk and raised eyebrow", "she smirks knowingly and raises an eyebrow", { sfx: "rimshot" }),
    ],
  },
  "f04-supermarket": {
    title: "قیمت‌ها", next: "کدام جنس ارزان‌تر است؟",
    shots: [
      S("baba", "supermarkt", "یک کیلو سیب، دو یورو؟ در کابل ...", "دو یورو", "in a bright supermarket aisle holding a shiny apple and staring at a price label, shocked", "he stares at the apple and the price label in shock"),
      S("baba", "supermarkt", "در کابل با این پول یک باغ می‌خریدم!", "باغ", "in the supermarket aisle with exaggerated dramatic gestures, arms wide", "he spreads his arms dramatically", { joke: true }),
      S("madar", "supermarkt", "اینجا کابل نیست. فقط لیست را بخر.", "لیست", "in the supermarket pushing a shopping cart with a strict patient look and holding a shopping list", "she taps the shopping list firmly and looks at him"),
      S("mina", "supermarkt", "بابا، گوجه با تخفیف است. ۳۰ درصد!", "تخفیف", "in the supermarket pointing to a bright yellow discount sticker, excited", "she points at the sticker excitedly and jumps"),
      S("baba", "supermarkt", "تخفیف؟ پس بیست کیلو می‌خرم!", "بیست کیلو", "in the supermarket with a greedy happy grin rubbing his hands, a cart full of tomatoes behind him", "he rubs his hands with a greedy happy grin", { joke: true }),
      S("madar", "supermarkt", "ما فقط دو نفر بزرگ هستیم!", "دو نفر", "in the supermarket facing the camera with hands on hips and wide disbelieving eyes", "she puts her hands on her hips in disbelief"),
      S("sami", "supermarkt", "شکلات! شکلات! شکلات!", "شکلات", "a toddler sitting in a shopping cart reaching with both hands toward chocolate bars off-screen, huge eyes", "he reaches out with both hands and wriggles in the cart", { sfx: "pop" }),
      S("baba", "kasse", "چرا این‌همه راه تا صندوق است؟", "صندوق", "standing in a long supermarket checkout queue holding a basket, impatient look, tapping his foot", "he taps his foot and looks along the queue"),
      S("baba", "kasse", "اینجا باید کیسه هم خرید؟ پول؟", "کیسه", "at a supermarket checkout holding a plastic bag as if it were a gold bar, offended", "he holds up the bag and stares at it in offence", { joke: true }),
      S("madar", "kasse", "بابا ... من کیسه آوردم. از خانه.", "خانه", "at the checkout lifting a big cloth bag from her shoulder with a smug smile", "she lifts the cloth bag with a smug smile", { sfx: "ding" }),
      S("baba", "kasse", "این زن ... یک وزیر اقتصاد است!", "وزیر", "at the checkout looking at her with admiration and hearts in his eyes, hands clasped", "he gazes at her proudly with clasped hands", { joke: true, sfx: "rimshot" }),
    ],
  },
  "f05-homework": {
    title: "تکلیف مینا", next: "بابا نمره می‌گیرد؟",
    shots: [
      S("mina", "wohnzimmer", "بابا، امروز من معلم شما هستم!", "معلم", `${HOME}, standing proudly with a ruler like a teacher, glasses too big for her face`, "she taps the ruler on her palm like a strict teacher"),
      S("baba", "wohnzimmer", "باشه معلم جان. من شاگرد خوبی هستم.", "شاگرد", `${HOME}, sitting on the carpet like a school pupil with hands folded, obedient grin`, "he folds his hands and nods obediently", { joke: true }),
      S("mina", "wohnzimmer", "این چیست؟ «سیب» به آلمانی؟", "سیب", `${HOME}, holding up a red apple like a lesson prop`, "she holds the apple up and asks with raised eyebrows"),
      S("baba", "wohnzimmer", "اپل! مثل گوشی!", "گوشی", `${HOME}, shouting an answer excitedly, finger up`, "he blurts the answer excitedly with a finger up", { joke: true }),
      S("mina", "wohnzimmer", "نه بابا! آپفل. آ-پ-فل.", "آپفل", `${HOME}, shaking her head patiently and enunciating slowly`, "she shakes her head and enunciates slowly"),
      S("baba", "wohnzimmer", "آ ... پفل. آ ... بفل. آ ... گفل؟", "آ ... گفل", `${HOME}, struggling to pronounce with a twisted funny mouth`, "he twists his mouth struggling with the word", { joke: true }),
      S("madar", "kueche", "کی می‌خواهد چای؟ بدون آپفل.", "چای", "in the kitchen holding a teapot over her shoulder, amused smile watching them", "she holds the teapot and chuckles"),
      S("sami", "wohnzimmer", "نه! نه! نه!", "نه", `${HOME}, a toddler shaking his head with a stubborn frown and arms crossed, cheeks puffed`, "he shakes his head stubbornly and puffs his cheeks", { joke: true }),
      S("mina", "wohnzimmer", "سامی درست گفت! «Nein» یعنی نه!", "نه", `${HOME}, pointing at her little brother proudly with a laugh`, "she points proudly at her brother and laughs"),
      S("baba", "wohnzimmer", "پس سامی از من بهتر است ... و او سه ساله است!", "سه ساله", `${HOME}, slumping dramatically with hand on forehead`, "he slumps dramatically with a hand on his forehead", { joke: true, sfx: "rimshot" }),
      S("mina", "wohnzimmer", "تکلیف برای فردا: صد بار «آپفل».", "صد بار", `${HOME}, holding up a notebook with a stern teacher face and a tiny smile`, "she holds up the notebook sternly and points to it", { sfx: "sting" }),
    ],
  },
  "f06-sunday-quiet": {
    title: "یکشنبه ساکت", next: "طبل سامی کجا رفت؟",
    shots: [
      S("madar", "wohnzimmer", "امروز یکشنبه است. همسایه‌ها خوابیده‌اند.", "یکشنبه", `${HOME}, finger on her lips whispering carefully`, "she puts a finger to her lips and whispers"),
      S("baba", "wohnzimmer", "یواش! یواش! حتی نفس هم یواش!", "یواش", `${HOME}, tiptoeing exaggeratedly with a funny strained face`, "he tiptoes exaggeratedly with a strained face", { joke: true }),
      S("sami", "wohnzimmer", "طبل! طبل! بوم بوم بوم!", "طبل", `${HOME}, a toddler holding a toy drum and sticks with an evil happy grin`, "he lifts the drumsticks with an evil happy grin", { sfx: "pop" }),
      S("baba", "wohnzimmer", "سامی جان! آهسته! بابا قربانت!", "قربانت", `${HOME}, kneeling with praying hands begging his toddler`, "he kneels and begs with praying hands"),
      S("mina", "wohnzimmer", "بابا، همسایه زنگ زد. می‌گوید گوش‌هایم می‌خوابد.", "گوش‌هایم", `${HOME}, holding the phone against her chest and whispering with huge eyes`, "she whispers with huge eyes holding the phone to her chest", { sfx: "ring" }),
      S("baba", "wohnzimmer", "من می‌روم عذرخواهی. با چای و شیرینی!", "عذرخواهی", "putting on his coat in a hurry, grabbing a tray of tea and sweets from the table", "he grabs the tray of sweets and rushes out"),
      S("baba", "flur", "سلام همسایه. ما شیرینی آوردیم. ببخشید ...", "شیرینی", "at a neighbour's door holding a tray with tea glasses and sweets and an apologetic big smile, bowing slightly", "he bows slightly holding the tray with an apologetic smile"),
      S("madar", "wohnzimmer", "او شیرینی را گرفت؟ چه گفت؟", "گرفت", `${HOME}, anxiously twisting a dish towel, hopeful`, "she wrings the towel anxiously and looks at the door"),
      S("baba", "wohnzimmer", "گرفت! و گفت: فردا چای اینجاست!", "چای", `${HOME}, returning with a victorious smile and arms up`, "he raises his arms victoriously", { sfx: "tada" }),
      S("mina", "wohnzimmer", "اما بابا ... سامی دوباره طبل را دارد.", "دوباره", `${HOME}, pointing at something off-screen with wide eyes`, "she points off-screen with wide eyes"),
      S("sami", "wohnzimmer", "بوم! بوم! بوم! بوم! بوم!", "بوم", `${HOME}, the toddler drumming wildly with an angelic grin, cheeks rosy`, "he drums wildly with an angelic grin", { sfx: "sting" }),
    ],
  },
  "f07-keys": {
    title: "کلید گم شد", next: "کلید کجا بود؟",
    shots: [
      S("baba", "tuer", "کلید؟ کلید کجاست؟ همین‌جا بود!", "کلید", "at the apartment door patting all his pockets frantically, sweating", "he pats his pockets frantically and spins"),
      S("madar", "tuer", "باز هم؟ این ماه سومین بار است!", "سومین", "next to him in a coat, arms crossed and one eyebrow raised in a bored accusing look", "she crosses her arms and raises an eyebrow"),
      S("baba", "tuer", "من گم نکردم. کلید خودش رفت!", "خودش رفت", "pointing at nothing with a defensive innocent face", "he points defensively and shrugs", { joke: true }),
      S("mina", "tuer", "شاید از پنجره برویم؟ من می‌توانم.", "پنجره", "looking up at a window above with a mischievous scheming grin", "she looks up at the window with a mischievous grin"),
      S("baba", "tuer", "نه! همسایه‌ها فکر می‌کنند دزد هستیم!", "دزد", "waving both hands in panic, wide eyes, looking around nervously", "he waves his hands in panic and looks around"),
      S("sami", "tuer", "کلید ... بازی! بازی!", "بازی", "a toddler standing at the door holding his small hand behind his back, a guilty giggle", "he hides his hand behind his back and giggles"),
      S("madar", "tuer", "سامی، دستت را نشان بده.", "دستت", "kneeling to the toddler's height with a gentle suspicious smile and an open palm", "she kneels and holds out her palm gently"),
      S("sami", "tuer", "نه! کلید ... در شکم!", "شکم", "the toddler patting his round belly proudly with a huge innocent smile", "he pats his belly proudly and nods", { joke: true, sfx: "pop" }),
      S("baba", "tuer", "در شکم؟! یا خدا! آمبولانس!", "آمبولانس", "grabbing his own head in total panic, mouth wide open", "he grabs his head and shouts in panic", { sfx: "sting" }),
      S("madar", "tuer", "آرام. او دروغ می‌گوید. کلید در جیب توست.", "جیب توست", "pointing calmly at his jacket pocket with a deadpan face", "she points at his pocket with a deadpan face"),
      S("baba", "tuer", "اوه ... خب ... امروز همه خوب بودند!", "خوب", "pulling the keys out of his pocket with an embarrassed laugh, scratching his head", "he pulls out the keys and laughs embarrassed", { joke: true, sfx: "rimshot" }),
    ],
  },
};

export const FAMILY_CFG = {
  key: "family", series: FAMILY, episodes: FAMILY_EPISODES, shotPrefix: "fa-", rtl: true,
  style: FAMILY_STYLE, cast: FAMILY_CAST,
  brand: { title: FAMILY.title, sub: "قسمت ", logo: false },
  deliverBrand: { label: "خانواده در غربت", file: "family" },
  endCard: (E) => ({ t0: 0, de: "ادامه دارد …", fa: "", rtl: true, small: `قسمت بعد: ${E.next}`, smallFa: "" }),
  caption: (E, no) => `😂 ${FAMILY.title} · قسمت ${no} — ${E.title}\n\n#خانواده #افغان #غربت #کمدی #زندگی_در_غربت #Comedy #fyp`,
};
