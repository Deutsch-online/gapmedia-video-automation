# GapMedia — خطاهای گذشته و گیت دائمی کیفیت

این فایل حافظهٔ محلی و نسخهٔ قابل‌ثبت GitHub برای خطاهایی است که کاربر واقعاً
دیده و رد کرده است. این‌ها پیشنهاد نیستند؛ هر مورد معیارِ رد انتشار است.

## گرافیک

1. هر اسلاید فقط یک ادعای روشن، یک تصویر اصلی واقعی و یک عمل بصری دارد. تصویر
   باید بدون متن نیز مفهوم اسلاید را برساند.
2. عکس یا اسکرین واقعیِ محصول/قابلیت، دست‌کم یک‌سوم قاب و باکیفیت است. لوگو یا
   آیکن جای آن را نمی‌گیرد.
3. قاب موبایل فقط برای یک صفحهٔ واقعی و خوانا مجاز است. محیط حدسی، دو صفحهٔ
   کوچک یا تکرار قاب موبایل در همهٔ اسلایدها رد می‌شود.
4. برای «ذخیره»، فقط کنترل Bookmark؛ برای «ارسال»، کنترل Share واقعی؛ برای
   «مدیاکیت»، مدرک رسانه/دوربین/نمونه‌کار واقعی؛ و برای هر عمل دیگر، مدرک همان
   عمل لازم است. تطبیق رنگ یا حدس تصویری کافی نیست.
5. TikTok و Instagram با رنگ متفاوت یک طرح واحد نیستند. قلاب، استعاره، ترتیب
   صحنه، گذار و موسیقی باید جدا طراحی شوند.
6. یک عکس واقعی نباید با crop/focus متفاوت روی چند اسلاید تکرار شود؛ هر
   اسلاید عکس واقعیِ جداگانهٔ خودش را می‌خواهد (گزارش زنده ۲۰۲۶-۰۹-۱۱،
   ویدیوهای تیک‌تاک/انستا). **قانون عوض شد (۲۰۲۶-۰۹-۱۱، تصمیم صریح صاحب
   کانال):** برای هر اسلاید اول جستجوی عکس واقعی اجباری است؛ فقط اگر آن
   جستجو برای همان اسلاید چیزی پیدا نکرد، یک تصویر تولیدشده با هوش
   مصنوعی (`sourceType: "ai-generated"`) جایگزین می‌شود. هیچ عکسی — واقعی
   یا تولیدشده — نباید بین اسلایدها عیناً تکرار شود.

## موشن و موسیقی

1. هر اسلاید حرکت اصلیِ مرتبط با عمل، واکنش ثانویه و حرکت محیطی آرام دارد.
   Fade تنها یا ورود کارت تنها رد است.
2. ورود قلاب سریع و خوانا است؛ پاسخ قلاب در همان سه ثانیه آشکار نمی‌شود.
3. گذار باید معنای اسلاید را ادامه دهد: جستجو = تایپ/نتیجه، ذخیره = Bookmark،
   آپلود = انتخاب/پیشرفت؛ نه Whip یا لرزش تصادفی.
4. موسیقی برای موضوع و انرژی صحنه انتخاب می‌شود. ضربِ تغییر صحنه کوتاه است و
   در نریشن Duck می‌شود؛ صدا هرگز زیر موسیقی گم نمی‌شود.

## نریشن فارسی

1. متن روی تصویر و متن گفتاری جدا هستند. گفتار طبیعی، کوتاه و هم‌معناست؛ متن
   گفتاری نباید URL، هشتگ، HTML یا علائم اجرایی را بخواند.
2. مکث فقط در انتهای فکر یا نشانهٔ نگارشی طبیعی است. داخل نام، رابط انگلیسی،
   اضافه، حرف اضافه با متمم، فعل مرکب، عدد و واحد، یا پسوند مکث ممنوع است.
3. پایان «ی» و «ه»، «می‌خواهید» و نام‌ها کشیده نمی‌شوند. قلاب با انرژی طبیعی
   آغاز می‌شود و تا پایان جمله سرعت یکنواختِ انسانی دارد.
4. خط باید پیش از تغییر اسلاید تمام شود. قطع جمله یا قرار گرفتن دو صدا روی هم
   رد قطعی است.
5. ASR فقط برای یافتن خطاست؛ تصمیم نهایی با شنیدن انسان است. هر تلفظ گزارش‌شده
   با زمان، علت عمومی، اصلاح و نمونهٔ شنیده‌شده در `VOICE-LOG.md` ثبت می‌شود.

## حکم انتشار

اگر یکی از این بخش‌ها ناقص باشد، ویدیو ارسال نمی‌شود. گزارش باید دقیقاً بگوید
کدام اسلاید، کدام مدرک یا کدام خط نریشن رد شده است؛ هیچ‌وقت با تغییر رنگ، آیکن
اضافی یا موسیقی بلند، نقص پنهان نمی‌شود.

## 2026-10-04 — The owner's two reference shorts (measured, not guessed)

The owner sent two German TikTok comedy shorts in the same 3D animated style (an office scene and a
living-room scene, 65-68 s). What they show, measured with ffmpeg:

- **No music bed at all.** In every pause the level is −47 to −91 dB; there is no underscore, no
  whoosh and no sting. The funny comes from the acting and the pace.
- **Dense dialogue.** A pause of 0.25 s or more only every 2-5 s. Integrated loudness −20 to −26 LUFS.
- **Two editing styles.** The office scene cuts about every 1.2 s (close-ups of faces, reaction
  shots); the living-room scene holds 3-7 s takes with continuous acting.
- **Captions.** One keyword at a time, large, neon-glowing, at chest height, a different colour per word.
- The voices, lips and feelings are one performance: that is how a video model with native audio
  (such as Veo 3.x) works. A separate TTS voice on a silent clip cannot reach it.
- The owner's Gemini key lists Veo 3.1 (full, fast, lite) but the one test (2026-10-03) answered
  429 RESOURCE_EXHAUSTED: Veo needs billing on that key.

What was changed in the pipeline: the series (`cfg.natural`) now has no music bed, no whoosh, no
cartoon sounds and no sting; only the sounds of the story stay. Not changed (needs the owner's
decision): the caption look, the cut rate (more shots = more GPU), Veo.
