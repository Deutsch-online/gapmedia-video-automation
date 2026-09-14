// Narration script per feature — one spoken line per scene.
// Standard (not colloquial) Persian: the engine pronounces full forms far more
// reliably than clipped speech, and it reads as more professional. Commas are
// used sparingly — every comma is a pause, and too many pauses kill the pace.
import { packForFeature } from "./content.mjs";
import { existsSync, readFileSync } from "node:fs";

const VO = {
  collab: {
    hook: "می‌خواهید پست شما روی دو پیج نشان داده شود؟",
    steps: [
      "ابتدا پست یا ریلز خود را بسازید و به صفحهٔ آخر بروید.",
      "روی گزینهٔ تگ کردن افراد بزنید.",
      "سپس دعوت از همکار را انتخاب کنید.",
      "پیج طرف مقابل را بزنید. پس از تأیید او پست روی هر دو پیج می‌آید.",
    ],
    outro: "برای ترفندهای بیشتر گپ مدیا را دنبال کنید.",
  },
  "hidden-words": {
    hook: "کامنت‌های آزاردهنده شما را اذیت می‌کنند؟",
    steps: [
      "به تنظیمات پیج خود بروید.",
      "بخش کلمات پنهان را باز کنید.",
      "گزینهٔ پنهان کردن کامنت‌های آزاردهنده را روشن کنید.",
      "کلمه‌های دلخواه خود را اضافه کنید تا خودکار پنهان شوند.",
    ],
    outro: "برای ترفندهای بیشتر گپ مدیا را دنبال کنید.",
  },
  "reels-template": {
    hook: "می‌خواهید بدون تدوین یک ریلز حرفه‌ای بسازید؟",
    steps: [
      "یک ریلز که می‌پسندید را باز کنید.",
      "گزینهٔ استفاده از قالب را بزنید.",
      "عکس‌ها یا ویدیوهای خود را انتخاب کنید.",
      "منتشر کنید. برش‌ها و ریتم از قبل آماده است.",
    ],
    outro: "برای ترفندهای بیشتر گپ مدیا را دنبال کنید.",
  },
  "reply-video": {
    hook: "می‌خواهید از کامنت‌ها ایدهٔ محتوا بگیرید؟",
    steps: [
      "زیر ویدیو بخش کامنت‌ها را باز کنید.",
      "کنار کامنت آیکون دوربین را بزنید.",
      "ویدیوی پاسخ خود را ضبط کنید.",
      "کامنت مانند استیکر روی ویدیو نشان داده می‌شود.",
    ],
    outro: "برای ترفندهای بیشتر گپ مدیا را دنبال کنید.",
  },
  qa: {
    hook: "می‌خواهید مخاطب برای شما سوژه بسازد؟",
    steps: [
      "به پروفایل و بخش ابزارهای سازنده بروید.",
      "قابلیت پرسش و پاسخ را روشن کنید.",
      "مخاطبان سؤال‌های خود را می‌فرستند.",
      "روی هر سؤال بزنید و با ویدیو پاسخ دهید.",
    ],
    outro: "برای ترفندهای بیشتر گپ مدیا را دنبال کنید.",
  },
  "photo-mode": {
    hook: "بدون دوربین هم می‌توانید محتوا بسازید.",
    steps: [
      "دکمهٔ مثبت را بزنید.",
      "به تب عکس بروید.",
      "چند عکس مرتبط انتخاب کنید.",
      "صدا و متن اضافه کنید و منتشر کنید.",
    ],
    outro: "برای ترفندهای بیشتر گپ مدیا را دنبال کنید.",
  },
  upscayl: {
    hook: "می‌خواهید عکس کم‌کیفیت خود را واضح کنید؟",
    steps: [
      "برنامهٔ رایگان اپ‌سکیل را نصب کنید.",
      "عکس کم‌کیفیت را در آن باز کنید.",
      "حالت کلان‌نمایی را انتخاب کنید.",
      "فایل را ذخیره کنید. عکس واضح‌تر و کلان‌تر می‌شود.",
    ],
    outro: "برای اپ‌های بیشتر گپ مدیا را دنبال کنید.",
  },
  removebg: {
    hook: "می‌خواهید پس‌منظر عکس را زود پاک کنید؟",
    steps: [
      "ویب‌سایت ریموو بی‌جی را باز کنید.",
      "عکس خود را آپلود کنید.",
      "پس‌منظر به شکل خودکار حذف می‌شود.",
      "از همین عکس در دیزاین کاور خود کار بگیرید.",
    ],
    outro: "برای اپ‌های بیشتر گپ مدیا را دنبال کنید.",
  },
  "capcut-captions": {
    hook: "بیشتر مردم ویدیو را بدون صدا می‌بینند.",
    steps: [
      "ویدیو را در کپ‌کات باز کنید.",
      "بخش زیرنویس را انتخاب کنید.",
      "زیرنویس خودکار ساخته می‌شود. سپس غلط‌ها را اصلاح کنید.",
      "قلم و رنگ را با پیج خود هماهنگ کنید.",
    ],
    outro: "برای اپ‌های بیشتر گپ مدیا را دنبال کنید.",
  },

  // German A1 lesson series (replaces the news channel, owner request
  // 2026-09-08). Narration stays deliberately Persian-only, describing each
  // word rather than pronouncing it — the German itself is read by the
  // viewer on screen (lib/german-a1.mjs + german-lesson-build.mjs), not
  // spoken by a Persian TTS voice, which has no verified German pronunciation
  // and per NARRATION_STANDARD.md/VOICE-LOG.md would need real testing
  // before ever being trusted with a second language.
  "a1-01-greetings": {
    hook: "با یک کلمه، اولین برخوردت به آلمانی حرفه‌ای می‌شود.",
    steps: [
      "برای سلام غیررسمی، همین یک کلمه کافی است؛ روی صفحه ببین و با صدای بلند تکرار کن.",
      "صبح‌ها، آلمانی‌زبان‌ها همین عبارت را برای سلام به کار می‌برند.",
      "این نسخهٔ رسمی‌تر است؛ در محیط کار یا با افراد غریبه از همین استفاده کن.",
      "برای خداحافظی غیررسمی، همین کلمه کافی است.",
      "حالا یک مکالمهٔ واقعی: وقتی کسی همین سؤال را می‌پرسد، این‌طور جواب بده.",
      "و نکتهٔ گرامری مهم: هر سه حالت صبح، روز و عصر، همیشه با کلمهٔ Guten شروع می‌شوند؛ فقط زمان روز عوض می‌شود.",
    ],
    outro: "این عبارت‌ها و مکالمه را چند بار با صدای بلند تکرار کن تا در ذهنت بماند.",
  },
  "a1-02-formal-informal": {
    hook: "یک اشتباه ساده می‌تواند مؤدبانه یا بی‌ادبانه به نظر برسد؛ تفاوتش را یاد بگیر.",
    steps: [
      "این سؤال را فقط با دوستان، هم‌سن‌ها یا بچه‌ها به کار ببر؛ غیررسمی است.",
      "این سؤال را با غریبه‌ها، بزرگ‌ترها یا در محیط کار به کار ببر؛ رسمی است.",
      "برای گفتن اسم خودت، همین جمله را در هر دو حالت، رسمی و غیررسمی، به کار می‌بری.",
      "برای پرسیدن همین سؤال از طرف مقابل، بسته به رسمی یا غیررسمی بودن مکالمه، یکی از این دو را انتخاب کن.",
    ],
    outro: "همیشه قبل از حرف زدن به آلمانی، اول تصمیم بگیر: رسمی یا غیررسمی؟",
  },
  "a1-03-politeness": {
    // Kept in sync with lib/german-a1.mjs's GERMAN_A1[id].hook (the on-screen
    // caption) — see that file's 2026-09-13 comment. This is the table
    // ACTUALLY spoken (narrationFor() returns VO[id] directly, never reading
    // GERMAN_A1's hook for a known unit id), so an earlier fix here that only
    // touched lib/german-a1.mjs left the duplicate audio unchanged in
    // production — confirmed live when the "fixed" a1-17 video still spoke
    // the old template. test-narration-sync.mjs guards this pairing now.
    hook: "با تشکر و ببخشید شروع کن، مکالمه‌ات فوراً مؤدبانه می‌شود.",
    steps: [
      "برای تشکر، همین کلمه را به کار ببر.",
      "در جواب تشکر، یا وقتی چیزی تعارف می‌کنی، همین کلمه را بگو.",
      "برای جلب توجه مؤدبانه یا عذرخواهی کوچک، همین کلمه کافی است.",
      "برای عذرخواهی رسمی‌تر، این جمله را به کار ببر.",
    ],
    outro: "این چهار کلمه را همین امروز در یک مکالمهٔ واقعی امتحان کن.",
  },
  "a1-04-numbers-1": {
    hook: "شمردن به آلمانی را از همین‌جا شروع کن.",
    steps: [
      "این دو عدد اول را با صدای بلند تکرار کن.",
      "این دو عدد بعدی را هم تکرار کن.",
      "این عدد را چند بار بخوان تا حفظ شوی.",
      "این عدد آخر را هم تمرین کن.",
    ],
    outro: "حالا از صفر تا پنج را به آلمانی می‌شماری.",
  },
  "a1-05-numbers-2": {
    hook: "تا ده به آلمانی بشمار، بدون مکث.",
    steps: [
      "این دو عدد را با صدای بلند تکرار کن.",
      "این عدد را چند بار بخوان.",
      "این عدد را هم تمرین کن.",
      "و این آخرین عدد این بخش است.",
    ],
    outro: "حالا از صفر تا ده را کامل به آلمانی می‌شماری.",
  },
  "a1-06-family": {
    hook: "با مادر، پدر، خواهر و برادر، دربارهٔ خانواده‌ات آلمانی بگو.",
    steps: [
      "این کلمه برای صدا کردن مادر است.",
      "این کلمه برای صدا کردن پدر است.",
      "این کلمه یعنی برادر.",
      "و این کلمه یعنی خواهر.",
    ],
    outro: "حالا می‌توانی اعضای نزدیک خانواده‌ات را به آلمانی معرفی کنی.",
  },
  "a1-07-question-words": {
    hook: "چی، کجا، کی، چطور؟ هر سؤال آلمانی از همین‌ها شروع می‌شود.",
    steps: [
      "این کلمه را اول جمله بگذار تا بپرسی «چه چیزی» است.",
      "این کلمه را برای پرسیدن مکان به کار ببر.",
      "این کلمه را برای پرسیدن زمان به کار ببر.",
      "و این کلمه را برای پرسیدن روش یا حال کسی به کار ببر.",
    ],
    outro: "با همین چهار کلمه، هر مکالمه‌ای را می‌توانی شروع کنی.",
  },
  "a1-08-sein": {
    hook: "مهم‌ترین فعل آلمانی را در ۴ جمله یاد بگیر.",
    steps: [
      "این شکل فعل برای «من» است.",
      "این شکل برای «تو» است.",
      "این شکل برای «او» است.",
      "و این شکل برای «ما» است.",
    ],
    outro: "این فعل در تقریباً هر جملهٔ آلمانی به کار می‌رود؛ خوب تمرینش کن.",
  },
  "a1-09-colors": {
    hook: "با پنج رنگ، دنیای اطرافت را به آلمانی توصیف کن.",
    steps: [
      "این کلمه یعنی قرمز؛ رنگ سیب یا آتش را یادت بیاور.",
      "این کلمه یعنی آبی؛ رنگ آسمان و دریا.",
      "این کلمه یعنی سبز؛ رنگ برگ و طبیعت.",
      "این کلمه یعنی زرد؛ رنگ لیمو و خورشید.",
      "و این دو کلمه یعنی سیاه و سفید؛ همیشه با هم یاد بگیرشان.",
    ],
    outro: "حالا می‌توانی رنگ هر چیزی را به آلمانی بگویی.",
  },
  "a1-10-weekdays": {
    hook: "برنامهٔ هفته‌ات را به آلمانی بچین.",
    steps: [
      "این دو روز، شروع هفته‌اند؛ دوشنبه و سه‌شنبه.",
      "این دو روز وسط هفته‌اند؛ چهارشنبه و پنج‌شنبه.",
      "این کلمه یعنی جمعه، آخرین روز کاری هفته.",
      "و این دو کلمه، آخر هفته‌اند؛ شنبه و یکشنبه.",
    ],
    outro: "حالا می‌توانی روزهای هفته را کامل به آلمانی بشماری.",
  },
  "a1-11-time": {
    hook: "بدون این جمله‌ها، هیچ‌وقت نمی‌فهمی ساعت چند است.",
    steps: [
      "این سؤال را برای پرسیدن ساعت به کار ببر.",
      "برای جواب دادن، همین الگو را با عدد ساعت پر کن.",
      "این دو کلمه یعنی نیم و ربع؛ برای ساعت‌های بین‌بین.",
      "و این دو عبارت یعنی صبح‌ها و عصرها.",
    ],
    outro: "حالا می‌توانی ساعت را کامل به آلمانی بپرسی و جواب بدهی.",
  },
  "a1-12-haben": {
    // Owner report 2026-09-11: the previous wording here named the German
    // verb "sein" in Latin script inside a PERSIAN sentence — spoken by the
    // Persian voice (no language_boost="German"), so it read with Persian/
    // English phonetics instead of correct German ("زاین", not "ساین"),
    // completely separate from the German-word clip's own voice/speed/vol
    // (already fixed). Every other unit's hook/outro already avoids naming
    // a German word in the Persian narration for exactly this reason
    // (e.g. a1-08-sein's own hook just says "مهم‌ترین فعل آلمانی" — never
    // says "sein" aloud); rewritten here to match that same safe pattern.
    hook: "بعد از فعل قبلی، این فعل را هم باید بلد باشی.",
    steps: [
      "این شکل فعل داشتن برای «من» است.",
      "این شکل برای «تو» است.",
      "این شکل برای «او» است.",
      "و این شکل برای «ما» است.",
    ],
    outro: "این فعل هم مثل فعل قبلی در خیلی از جمله‌ها به کار می‌رود؛ تمرینش کن.",
  },
  "a1-13-food-drink": {
    hook: "نان، آب، قهوه، میوه: کلمات غذا و نوشیدنی را به آلمانی بلد شو.",
    steps: [
      "این کلمه یعنی نان.",
      "این کلمه یعنی آب؛ ساده‌ترین سفارش هر جا.",
      "این دو کلمه یعنی قهوه و چای.",
      "و این دو کلمه یعنی میوه و سبزیجات.",
    ],
    outro: "با همین چهار کلمه، اولین سفارش غذایت را به آلمانی بده.",
  },
  "a1-14-cafe": {
    hook: "این چند جمله، اولین سفارش در کافهٔ آلمانی را آسان می‌کند.",
    steps: [
      "این عبارت، مؤدبانه‌ترین راه برای سفارش‌دادن است؛ بعدش اسم چیزی که می‌خواهی را بگو.",
      "وقتی می‌خواهی حساب کنی، رسمی‌تر همین جمله را بگو.",
      "همین معنی را محاوره‌ای‌تر هم می‌شود گفت؛ در کافه‌های معمولی زیاد می‌شنوی.",
      "و وقتی غذا خوشمزه بود، همین جمله را بگو؛ صاحب کافه خوشحال می‌شود.",
    ],
    outro: "این چهار جمله، یک سفارش کامل در کافه را برایت می‌سازند.",
  },
  "a1-15-numbers-3": {
    hook: "دومین قدم شمارش به آلمانی؛ تا بیست برو.",
    steps: [
      "این دو عدد را با صدای بلند تکرار کن.",
      "این دو عدد بعدی را هم تکرار کن.",
      "این دو عدد را چند بار بخوان.",
      "این دو عدد را هم تمرین کن.",
      "و این دو عدد، آخر این بخش‌اند.",
    ],
    outro: "حالا از صفر تا بیست را کامل به آلمانی می‌شماری.",
  },
  "a1-16-weather": {
    hook: "دربارهٔ هوا حرف زدن، بهترین شروع مکالمهٔ آلمانی است.",
    steps: [
      "این سؤال را برای پرسیدن وضع هوا به کار ببر.",
      "این جمله یعنی باران می‌بارد.",
      "این جمله یعنی آفتاب می‌تابد.",
      "و این دو جمله یعنی سرد است و گرم است.",
    ],
    outro: "حالا می‌توانی دربارهٔ هوای امروز به آلمانی حرف بزنی.",
  },
  "a1-17-adjectives": {
    hook: "بزرگ یا کوچک، خوبی یا بدیِ هر چیزی؛ با این صفت‌های پرکاربرد امروز آشنا شو.",
    steps: [
      "این دو کلمه یعنی بزرگ و کوچک؛ همیشه در تضاد با هم یاد بگیرشان.",
      // Third rewrite, 2026-09-13: with the pitch bug fixed (see
      // lib/voice-settings.mjs), 3 fresh attempts passed on every word
      // EXCEPT the bare «بد» — heard as «بعد»/«برد» in all 3, both here and
      // in the hook above, regardless of sentence position (trailing
      // context alone did not fix it, confirmed live). Genuinely this
      // specific short word in this voice, not a sentence-position issue.
      // Not a same-sound case either (بد/بعد/برد are distinct words with
      // different meanings — folding them in lib/hear.mjs would risk hiding
      // a real word-substitution defect on the actual vocabulary this unit
      // teaches). Replaced the bare word with «بدیِ» (badness-of, 2
      // syllables, grammatically attached to the next word).
      "این دو کلمه یعنی خوبی و بدیِ یک چیز را نشان می‌دهند.",
      "این دو کلمه یعنی نو و قدیمی.",
      "و این دو کلمه یعنی سریع و آهسته.",
    ],
    outro: "این چهار جفت صفت، توصیف هر چیزی را برایت آسان می‌کنند.",
  },
  "a1-18-shopping": {
    hook: "اولین خرید در آلمان را با همین جمله‌ها انجام بده.",
    steps: [
      "این سؤال را برای پرسیدن قیمت به کار ببر.",
      "اگر قیمت زیاد بود، همین جمله را بگو.",
      "وقتی چیزی را می‌خواهی بخری، همین جمله کافی است.",
      // Rewritten 2026-09-13 after the Recovery Loop's chain budget was
      // genuinely spent on this one line (news-scan.yml run #228, attempt
      // 3/3: "no valid reword found for «است» … recovery strategy space
      // exhausted"). The old wording — «و این سؤال، رسمی‌ترین راه برای
      // پرسیدن از فروشنده است که چیزی را دارد یا نه.» — was the longest
      // narration line in this file (19 words, an embedded relative
      // clause), which breaks NARRATION_STANDARD.md's first rule before
      // synthesis: «متن را به جمله‌های کوتاه و کامل تقسیم کن». Its copula
      // sat between a ه-final noun and «که», where connected Persian
      // speech realises «فروشنده است» as [foruʃande-st] and the copula
      // loses its own vowel onset — so ASR heard «از» where «است» was
      // written. That is NOT a same-sound case (ast vs az differ in the
      // final consonant), so lib/hear.mjs is deliberately untouched; the
      // sentence itself is what was wrong. The replacement is imperative
      // like every other step in this unit, keeps the teaching point
      // (the formal register that matches german-a1.mjs's "(رسمی)"), and
      // has no copula left to blur.
      "و با این سؤال رسمی، از فروشنده بپرس که چیزی را دارد یا نه.",
    ],
    outro: "با این چهار جمله، خرید را کامل به آلمانی انجام بده.",
  },
  // Reworded 2026-09-14 after the Recovery Loop spent its full 3/3 chained
  // budget on this episode and stood down for a human ear. Every rejected
  // word was word- or position-specific, and the release gate was right to
  // block each one — none is a same-sound pair, so none belongs in
  // lib/hear.mjs. What changed is the copy, not the gate:
  //   «عبارت» (heard «اباره»/«ابارت») → «جمله», the word the other episodes
  //     already use for the same idea and that has never been rejected;
  //   «یعنی» immediately before a short noun phrase (heard «تیانی» in the
  //     step-4 line, though it passes elsewhere in this same file) → the
  //     meaning is carried by a verb phrase instead;
  //   «مستقیم.» sentence-final (heard «مستبین») → «مستقیم رفتن», so the
  //     word no longer sits on the clipped final syllable;
  //   the hook's «دیگر ... گم نمی‌شوی.» (heard «دیگه» + «بی») → a plain
  //     imperative, the shape this series' other hooks already use.
  "a1-19-directions": {
    hook: "آدرس را به آلمانی یاد بگیر و راهت را پیدا کن.",
    steps: [
      "این سؤال را برای پرسیدن مکان یک جا به کار ببر.",
      "این کلمه مستقیم را نشان می‌دهد؛ بدون پیچیدن به چپ یا راست.",
      "این دو کلمه چپ و راست هستند؛ در هر خیابانی به کارت می‌آیند.",
      "و این جمله برای نزدیک بودن یک جا به کار می‌رود.",
    ],
    outro: "با همین چهار جمله، مسیرت را به آلمانی پیدا می‌کنی.",
  },
  "a1-20-countries": {
    hook: "بگو اهل کجایی؛ به آلمانی.",
    steps: [
      "این سؤال غیررسمی است؛ از یک دوست تازه می‌پرسی اهل کجاست.",
      "برای جواب دادن، همین الگو را با اسم کشورت پر کن.",
      "این دو اسم کشور را یاد بگیر.",
      "و این جمله یعنی من آلمانی صحبت می‌کنم؛ حتی اگر کم باشد بگو.",
    ],
    outro: "حالا می‌توانی خودت و اهل‌کجابودنت را کامل به آلمانی معرفی کنی.",
  },
  "a1-21-professions": {
    hook: "شغلت را به آلمانی معرفی کن.",
    steps: [
      "این سؤال را برای پرسیدن شغل کسی به کار ببر.",
      "این کلمه‌ها یعنی معلم؛ برای مرد و زن جدا است.",
      "این کلمه‌ها یعنی پزشک؛ باز هم برای مرد و زن جدا.",
      "و این الگو را برای گفتن شغل خودت به کار ببر.",
    ],
    outro: "حالا می‌توانی شغلت را به آلمانی بگویی و از دیگران هم بپرسی.",
  },
  "a1-22-daily-routine": {
    hook: "یک روز عادی‌ات را به آلمانی تعریف کن.",
    steps: [
      "این جمله یعنی من بیدار می‌شوم.",
      "این جمله یعنی من سر کار می‌روم.",
      "این جمله یعنی من ناهار می‌خورم.",
      "و این جمله یعنی من می‌خوابم.",
    ],
    outro: "با همین چهار جمله، کل روزت را به آلمانی تعریف کن.",
  },
  "a1-23-common-verbs": {
    hook: "این سه فعل، پایهٔ اکثر جمله‌های آلمانی هستند.",
    steps: [
      "این فعل یعنی رفتن.",
      "این فعل یعنی آمدن.",
      "این فعل یعنی انجام‌دادن؛ خیلی از سؤال‌های روزمره با همین شروع می‌شوند.",
      "و این دو فعل یعنی دیدن و شنیدن.",
    ],
    outro: "با این چند فعل، خیلی از جمله‌های روزمره را می‌سازی.",
  },
  "a1-24-clothes": {
    hook: "لباس‌هایت را به آلمانی نام ببر.",
    steps: [
      "این دو کلمه یعنی شلوار و پیراهن.",
      "این کلمه یعنی ژاکت یا کاپشن.",
      "این کلمه یعنی کفش.",
      "و این الگو را برای گفتن اینکه چه می‌پوشی به کار ببر.",
    ],
    outro: "حالا می‌توانی بگویی امروز چه پوشیده‌ای؛ به آلمانی.",
  },
};

const clean = (s) => String(s || "")
  .replace(/<[^>]*>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// The screen hook may use a compact possessive («ویدیویت») for typography,
// while the selected TTS voice reads that construction inconsistently. The
// spoken copy below preserves the exact meaning in standard Persian, without
// changing the viewer-facing hook or weakening the word-level audio gate.
const SPOKEN_HOOKS = {
  "tts-voice": "بدون ضبط صدا، روی ویدیو صدای خودکار بگذارید.",
};

export function narrationFor(featureId) {
  if (VO[featureId]) return VO[featureId];
  // A fetched bulletin is written immediately before rendering. It is not part
  // of the permanent feature banks, so `packForFeature()` cannot find it. Read
  // the generated JSON here and speak the same headline and cards rendered in
  // this one news video.
  if (String(featureId).startsWith("news-") && existsSync("lib/generated/news-current.mjs")) {
    try {
      const raw = readFileSync("lib/generated/news-current.mjs", "utf8");
      const match = raw.match(/export const CURRENT_NEWS = ([\s\S]*?);\s*export const CURRENT_TOPIC/);
      const item = match ? JSON.parse(match[1]) : null;
      if (item?.id === featureId) {
        return {
          hook: clean(item.hook?.ask),
          steps: (item.steps || []).map((step) => clean(step.text)),
          outro: clean(item.outroAsk || "نظرت دربارهٔ این خبر چیست؟"),
        };
      }
    } catch {}
  }
  // Text supplied through Telegram is stored as a generated feature. Read the
  // same hook and exact four steps so custom videos do not silently become
  // music-only because they are not in the permanent feature bank.
  // Match on the id stored in the file, not on the id's prefix. content-draft.mjs
  // writes a `draft-…` id into custom-current.mjs, so a prefix test missed it,
  // narrationFor returned null, and REQUIRE_VOICE=on turned that into a hard
  // build failure in CI — a naming mismatch surfacing as "Narration did not
  // render". The file names the feature it belongs to; that is what to trust.
  if (existsSync("lib/generated/custom-current.mjs")) {
    try {
      const raw = readFileSync("lib/generated/custom-current.mjs", "utf8");
      const match = raw.match(/export const CURRENT_CUSTOM = ([\s\S]*?);\s*$/);
      const item = match ? JSON.parse(match[1]) : null;
      if (item?.id === featureId) {
        return {
          hook: clean(item.hook?.ask),
          steps: (item.steps || []).map((step) => clean(step.text)),
          outro: clean(item.outroAsk || item.payoff || "دوست دارید ویدیوی بعدی دربارهٔ چه موضوعی باشد؟"),
        };
      }
    } catch {}
  }  // Newly approved, research-driven features do not wait for a manually written
  // duplicate narration block. Their spoken copy follows the same hook and
  // exact in-app steps shown in the video, so audio and screen cannot drift.
  const pack = packForFeature(featureId, new Date());
  if (!pack) return null;
  return {
    hook: SPOKEN_HOOKS[featureId] || clean(pack.hook?.ask),
    steps: (pack.tips || []).map((tip) => clean(tip.head)),
    outro: clean(pack.payoff || pack.outroAsk || "نتیجه را بررسی کنید و روش مناسب پیج خودتان را انتخاب کنید."),
  };
}

