// Additional features, appended to each category's rotation.
// With these the daily cycle runs for weeks before a topic can repeat.
export const EXTRA = {
  instagram: [
    {
      id: "pin-posts",
      benefit: { key: "seen", fa: "اولین چیزی که غریبه می‌بیند را خودت انتخاب کن" },
      hook: { ask: "با این قابلیت اینستاگرام، سه پست اول پیجت را فالوورساز کن", l1: "بهترین پست‌هایت را", l2: "بالای پیج نگه دار" },
      payoff: "اولین چیزی که هر بازدیدکننده می‌بیند، بهترین کار توست.",
      steps: [
        { icon: "star", text: "روی پستی که می‌خواهی برو", ui: { screen: "list", title: "پست", rows: ["سنجاق به پروفایل", "ویرایش", "اشتراک‌گذاری"], hit: 0 } },
        { screen: {"title":"Post options","rows":["Pin to your profile","Archive"],"hit":0}, icon: "target", text: "منوی سه‌نقطه را باز کن", ui: { screen: "list", title: "گزینه‌ها", rows: ["سنجاق به پروفایل", "آرشیو"], hit: 0 } },
        { icon: "layers", text: "«سنجاق به پروفایل» را بزن", ui: { screen: "compose", title: "پروفایل", cta: "سنجاق شد" } },
        { icon: "users", text: "تا سه پست را می‌توانی سنجاق کنی", ui: { screen: "result", title: "انجام شد" } },
      ],
      tgTitle: "📌 سه پست برتر را بالای پیج سنجاق کن\n\n#instagram #growth #GapMedia #viral",
    },
    {
      id: "close-friends",
      benefit: { key: "money", fa: "برای مخاطب خاصت محتوای ویژه بگذار" },
      hook: { ask: "با این قابلیت اینستاگرام، از فالوورت مشتری همیشگی بساز", l1: "برای مخاطب وفادارت", l2: "محتوای ویژه بگذار" },
      payoff: "حس عضویت خاص می‌سازد و مخاطب را نزدیک‌تر نگه می‌دارد.",
      steps: [
        { screen: {"title":"Settings","rows":["Close Friends","Privacy"],"hit":0}, icon: "user", text: "به تنظیمات پیج برو", ui: { screen: "list", title: "تنظیمات", rows: ["دوستان نزدیک", "حریم خصوصی"], hit: 0 } },
        { icon: "users", text: "افرادی را که می‌خواهی اضافه کن", ui: { screen: "list", title: "دوستان نزدیک", rows: ["افزودن افراد", "جستجو"], hit: 0 } },
        { icon: "heart", text: "هنگام استوری، حلقهٔ سبز را انتخاب کن", ui: { screen: "compose", title: "استوری", cta: "دوستان نزدیک" } },
        { icon: "sparkle", text: "فقط همان افراد استوری را می‌بینند", ui: { screen: "result", title: "منتشر شد" } },
      ],
      tgTitle: "💚 با دوستان نزدیک، محتوای ویژه بگذار\n\n#instagram #engagement #GapMedia #viral",
    },
    {
      id: "add-yours",
      benefit: { key: "viral", fa: "مخاطب را وارد محتوایت کن" },
      hook: { ask: "فالوورهایت را وارد ترند خودت کن و وایرال شو", l1: "یک زنجیرهٔ استوری", l2: "راه بینداز" },
      payoff: "هر کسی که شرکت کند، پیج تو را به مخاطبانش نشان می‌دهد.",
      steps: [
        { photo: "public/screens/add-yours-editor.png", photoAlt: "Instagram story editor", icon: "camera", text: "یک استوری بساز", ui: { screen: "compose", title: "استوری", cta: "افزودن استیکر" } },
        { photo: "public/screens/add-yours-stickers.png", photoAlt: "Instagram story sticker tray with Add Yours", screen: {"title":"Stickers","rows":["Add Yours","Poll","Questions"],"hit":0}, icon: "sparkle", text: "استیکر «Add Yours» را انتخاب کن", ui: { screen: "list", title: "استیکرها", rows: ["Add Yours", "نظرسنجی", "سؤال"], hit: 0 } },
        { icon: "pen", text: "یک موضوع جذاب بنویس", ui: { screen: "compose", title: "موضوع", cta: "انتشار" } },
        { photo: "public/screens/add-yours-prompt.png", photoAlt: "Add Yours prompt with responses", icon: "users", text: "دیگران استوری خودشان را اضافه می‌کنند", ui: { screen: "result", title: "زنجیره شروع شد" } },
      ],
      tgTitle: "🔗 با Add Yours یک زنجیرهٔ استوری راه بینداز\n\n#instagram #story #GapMedia #viral",
    },
  ],
  tiktok: [
    {
      id: "playlists",
      benefit: { key: "seen", fa: "کاری کن بیننده ویدیوی بعدی‌ات را هم ببیند" },
      hook: { ask: "با این قابلیت تیک‌تاک، از هر بیننده چند برابر ویو بگیر", l1: "کاری کن بیننده", l2: "پشت‌سرهم تماشا کند" },
      payoff: "بیننده به‌جای یک ویدیو، چند ویدیو را پشت‌سرهم می‌بیند.",
      steps: [
        { screen: {"title":"Profile","rows":["Manage playlists","Settings"],"hit":0}, icon: "layers", text: "به پروفایلت برو", ui: { screen: "list", title: "پروفایل", rows: ["مدیریت پلی‌لیست", "تنظیمات"], hit: 0 } },
        { icon: "star", text: "یک پلی‌لیست جدید بساز", ui: { screen: "compose", title: "پلی‌لیست جدید", cta: "ساختن" } },
        { icon: "play", text: "ویدیوهای هم‌موضوع را داخلش بگذار", ui: { screen: "list", title: "افزودن ویدیو", rows: ["انتخاب ویدیوها"], hit: 0 } },
        { icon: "chart", text: "حالا بیننده زنجیره‌وار تماشا می‌کند", ui: { screen: "result", title: "آماده شد" } },
      ],
      tgTitle: "📚 با پلی‌لیست، بیننده را نگه دار\n\n#tiktok #retention #GapMedia #viral",
    },
    {
      id: "green-screen",
      // Read ONLY by rescuePackPhotos()/findRealImage(); never rendered. This
      // pack carries no photo, brand, title or name, so the image search fell
      // through to the bare id "green-screen" — a description of a chroma-key
      // effect, not the product. Owner report 2026-09-13 with three delivered
      // frames: that query returned a Figma landing page and an Android
      // app-reviews page. Naming the product and the effect is what a real
      // screenshot of this screen is actually captioned with.
      searchTopic: "TikTok Green Screen effect mobile app",
      benefit: { key: "viral", fa: "هر تصویری را پشت خودت بگذار" },
      hook: { ask: "با این قابلیت تیک‌تاک، ویدیوی واکنشی بساز و ویو بگیر", l1: "عکس یا صفحه را", l2: "پشت خودت بگذار" },
      payoff: "توضیح دادن روی یک تصویر، از حرف خالی خیلی گیراتر است.",
      steps: [
        { icon: "camera", text: "دکمهٔ ساخت ویدیو را بزن", ui: { screen: "list", title: "ساخت", rows: ["افکت‌ها", "فیلترها"], hit: 0 } },
        { screen: {"title":"Effects","rows":["Green Screen","Timer","Beauty"],"hit":0}, icon: "wand", text: "در افکت‌ها «Green Screen» را انتخاب کن", ui: { screen: "list", title: "افکت‌ها", rows: ["پرده سبز", "زمان", "زیبایی"], hit: 0 } },
        { icon: "layers", text: "عکس یا اسکرین‌شات دلخواهت را بگذار", ui: { screen: "compose", title: "انتخاب تصویر", cta: "تأیید" } },
        { icon: "mic", text: "روی همان تصویر توضیح بده", ui: { screen: "result", title: "آمادهٔ ضبط" } },
      ],
      tgTitle: "🟢 با پرده سبز، روی تصویر توضیح بده\n\n#tiktok #contentcreator #GapMedia #viral",
    },
    {
      id: "tts-voice",
      source: "https://ads.tiktok.com/resources/help/article/about-capcut?lang=ja",
      benefit: { key: "seen", fa: "بدون ضبط صدا، روی ویدیویت نریشن بگذار" },
      hook: { ask: "می‌خواهی بدون ضبط صدا، روی ویدیویت نریشن بگذاری؟", l1: "بدون ضبط صدا", l2: "نریشن بساز" },
      payoff: "بدون مایک و بدون صدای خودت، ویدیویت نریشن دارد.",
      steps: [
        { icon: "pen", text: "روی ویدیو متن اضافه کن", photo: "public/screens/tiktok-text-to-speech-real.png", photoFocus: "editor-text", visualEvidence: { sourceUrl: "https://ads.tiktok.com/resources/help/article/about-capcut?lang=ja", sourceType: "official-asset", claim: "افزودن متن روی ویدیو", mainVisual: "public/screens/tiktok-text-to-speech-real.png", whatItProves: "محیط واقعی ویرایش متن و انتخاب صدا در محصول ByteDance", motionAction: "تمرکز روی بخش متن در صفحهٔ واقعی", secondaryMotion: "نشانگر انتخاب متن", ambientMotion: "حرکت آرام نور روی قاب گوشی", coverage: 0.58 }, ui: { screen: "compose", title: "افزودن متن", cta: "تأیید" } },
        { icon: "target", text: "روی همان متن بزن", photo: "public/screens/tiktok-text-to-speech-real.png", photoFocus: "text-menu", visualEvidence: { sourceUrl: "https://ads.tiktok.com/resources/help/article/about-capcut?lang=ja", sourceType: "official-asset", claim: "باز کردن گزینه‌های متن", mainVisual: "public/screens/tiktok-text-to-speech-real.png", whatItProves: "منوی واقعی Text-to-Speech در محیط ویرایش", motionAction: "زوم روی منوی متن", secondaryMotion: "هایلایت گزینهٔ تبدیل متن به صدا", ambientMotion: "عمق آرام پس‌زمینهٔ گوشی", coverage: 0.58 }, ui: { screen: "list", title: "متن", rows: ["تبدیل متن به صدا", "ویرایش", "حذف"], hit: 0 } },
        { icon: "mic", text: "«تبدیل متن به صدا» را انتخاب کن", photo: "public/screens/tiktok-text-to-speech-real.png", photoFocus: "voice-picker", visualEvidence: { sourceUrl: "https://ads.tiktok.com/resources/help/article/about-capcut?lang=ja", sourceType: "official-asset", claim: "انتخاب تبدیل متن به صدا", mainVisual: "public/screens/tiktok-text-to-speech-real.png", whatItProves: "فهرست واقعی انتخاب صدا در رابط محصول", motionAction: "تمرکز روی فهرست صداها", secondaryMotion: "نمایش انتخاب صدا", ambientMotion: "تغییر آرام عمق قاب", coverage: 0.58 }, ui: { screen: "list", title: "انتخاب صدا", rows: ["صدای اول", "صدای دوم"], hit: 0 } },
        { icon: "play", text: "صدا خودکار روی ویدیو می‌نشیند", photo: "public/screens/tiktok-text-to-speech-real.png", photoFocus: "voice-result", visualEvidence: { sourceUrl: "https://ads.tiktok.com/resources/help/article/about-capcut?lang=ja", sourceType: "official-asset", claim: "افزودن صدای خودکار به متن", mainVisual: "public/screens/tiktok-text-to-speech-real.png", whatItProves: "نتیجهٔ قابلیت متن به صدا در محیط واقعی محصول", motionAction: "بازگشت به پیش‌نمایش ویدیو", secondaryMotion: "پالس نرم روی متن", ambientMotion: "حرکت بسیار آرام پس‌زمینه", coverage: 0.58 }, ui: { screen: "result", title: "آماده شد" } },
      ],
      tgTitle: "🔊 بدون ضبط صدا، روایت بساز\n\n#tiktok #tips #GapMedia #viral",
    },
  ],
  tools: [
    {
      id: "canva-cover",
      name: "Canva",
      benefit: { key: "seen", fa: "کاوری بساز که در پروفایل کلیک بگیرد" },
      hook: { ask: "کاوری بساز که کلیک بگیرد", l1: "کاور حرفه‌ای", l2: "بدون طراح" },
      payoff: "کاور یکدست، پیج را در یک نگاه حرفه‌ای نشان می‌دهد.",
      steps: [
        { brand: {"name":"Canva","url":"canva.com","color":"#00C4CC","tagline":"Design a cover"}, icon: "globe", text: "سایت کانوا را باز کن", ui: { screen: "tool", url: "canva.com", cta: "شروع رایگان" } },
        { icon: "layers", text: "اندازهٔ کاور اینستاگرام را انتخاب کن", ui: { screen: "tool", url: "canva.com", cta: "انتخاب اندازه" } },
        { icon: "pen", text: "قالب آماده را با رنگ پیجت هماهنگ کن", ui: { screen: "tool", url: "canva.com", cta: "ویرایش قالب" } },
        { icon: "star", text: "خروجی بگیر و روی پست بگذار", ui: { screen: "tool", url: "canva.com", cta: "دانلود" } },
      ],
      tgTitle: "🎨 کاور حرفه‌ای بدون طراح، با Canva\n\n#freeapp #design #GapMedia #viral",
    },
    {
      id: "ideogram-text",
      name: "Ideogram",
      title: "تصویر با متن خوانا — GapMedia",
      benefit: { key: "seen", fa: "متن خوانا روی تصویر یعنی پیامت گم نمی‌شود" },
      hook: { ask: "کاور و پوستر بساز، بدون اینکه دیزاینر باشی", l1: "تصویری بساز", l2: "که متنش خوانا باشد" },
      payoff: "برخلاف بیشتر ابزارها، متن روی تصویر سالم و خوانا می‌ماند.",
      steps: [
        { brand: { name: "Ideogram", url: "ideogram.ai", color: "#111827", tagline: "AI image + text" }, icon: "globe", text: "سایت آیدیوگرام را باز کن", ui: { screen: "tool", url: "ideogram.ai", cta: "ورود رایگان" } },
        { icon: "pen", text: "توضیح تصویر را بنویس", ui: { screen: "tool", url: "ideogram.ai", cta: "نوشتن توضیح" } },
        { icon: "bulb", text: "متن دلخواهت را داخل گیومه بگذار", ui: { screen: "tool", url: "ideogram.ai", cta: "ساختن" } },
        { icon: "sparkle", text: "تصویر با متن خوانا ساخته می‌شود", ui: { screen: "tool", url: "ideogram.ai", cta: "دانلود" } },
      ],
      tgTitle: "🖼️ تصویری بساز که متنش خوانا باشد\n\n#ai #design #GapMedia #viral",
    },
    {
      id: "meta-schedule",
      name: "Meta Business Suite",
      benefit: { key: "seen", fa: "سر ساعت اوج پست کن، حتی وقتی سرت شلوغ است" },
      hook: { ask: "یک شب کار کن، تمام هفته پست داشته باش", l1: "پست‌ها را زمان‌بندی کن", l2: "خودش منتشر می‌کند" },
      payoff: "نظم در انتشار، بدون اینکه هر روز درگیر باشی.",
      steps: [
        { brand: {"name":"Meta Business Suite","url":"business.facebook.com","color":"#0866FF","tagline":"Schedule posts"}, icon: "globe", text: "متا بیزنس سویت را باز کن", ui: { screen: "tool", url: "business.facebook.com", cta: "ورود" } },
        { icon: "calendar", text: "بخش زمان‌بندی را انتخاب کن", ui: { screen: "tool", url: "business.facebook.com", cta: "پست جدید" } },
        { icon: "pen", text: "پست و کپشن را آماده کن", ui: { screen: "tool", url: "business.facebook.com", cta: "نوشتن کپشن" } },
        { icon: "clock", text: "روز و ساعت انتشار را تعیین کن", ui: { screen: "tool", url: "business.facebook.com", cta: "زمان‌بندی" } },
      ],
      tgTitle: "🗓️ پست‌های یک هفته را یک‌جا زمان‌بندی کن\n\n#socialmediatips #apps #GapMedia #viral",
    },
  ],
};
