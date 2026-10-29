# آریانا — برنامهٔ مستقل مجری مجازی

این برنامه هیچ وابستگی اجرایی به برنامهٔ رانندگی ندارد. پوشه، تنظیمات، صداها، سرور و صفحهٔ پخش آن جدا هستند. چهرهٔ آریانا یک شخصیت خیالیِ بزرگسال است و از چهرهٔ زنِ ویدیوهای نمونه کپی نشده است.

## وضعیت واقعی این نسخه

- چهرهٔ اختصاصی، صدای معرفی فارسی و کلیپ متحرک ۴٫۴۸ثانیه‌ای آریانا تولید شده است.
- متن‌های فارسی با دیلارا و انگلیسی با Ava خوانده می‌شوند؛ تولید جملهٔ جدید اینترنت می‌خواهد. صدای دیلارا فارسی ایران است؛ لهجهٔ دری تأیید نشده است.
- نام‌های عددی و نامطمئن خوانده نمی‌شوند؛ فهرست نام‌های پذیرفته‌شده قابل تکمیل است. این فهرست هویت واقعی افراد را اثبات نمی‌کند.
- کد اتصال کامنت، لایک، گیفت و ورود تیک‌تاک موجود است؛ روی حساب واقعی شما هنوز آزمایش نشده است. امضای پولی فعال نمی‌شود.
- شمارش مجموع حمایت همان جلسه، گردش ۶۰ثانیه‌ای گیفتر/لایکر و اعلان ورود از چپ تا وسط پیاده‌سازی شده‌اند.
- اطلاعات خوش‌آمد ویژه فقط از `user.payGrade.level` گرفته می‌شود؛ بالاتر از ۲۵. اگر رویداد سطح را ندهد، حدس زده نمی‌شود.
- اصلاح اعراب مستقیماً روی متنی اعمال می‌شود که خود دیلارا می‌خواند؛ صدای دیگری معیار انتخاب تلفظ نیست. آموزش وزن‌های مدل، یادگیری خودکار لهجه یا کلون دیلارا انجام نمی‌شود.
- پاسخ آزاد به کامنت‌ها نیازمند مدل گفتگو است. بدون مدل، پاسخ عمومی و کوتاه داده می‌شود؛ فهم آزاد گفتگو ادعا نمی‌شود.

**کلیپ معرفی متحرک آماده است؛ حرکت پیوسته و زنده مشابه نمونه‌ها هنوز آماده نیست.** کلیپ داخل بسته با SadTalker روی CPU و از روی همان صدای معرفی ساخته شده است. لب و صورت حرکت می‌کنند؛ بدن و دست‌ها در این نسخه ثابت‌اند. پخش کلیپ با دکمهٔ معرفی انجام می‌شود. متن‌های تازه به‌صورت صوت روی تصویر ثابت خوانده می‌شوند؛ برای ساخت ویدیوی همان جمله، گزینهٔ جداگانهٔ کلیپ آفلاین وجود دارد.

در محیط آزمایش با ۳ CPU مجازی و بدون CUDA، ساخت ۴٫۴۸ ثانیه ویدیو حدود ۹۴۳ ثانیه (۱۵ دقیقه و ۴۳ ثانیه) طول کشید؛ این نتیجه بنچمارک لپ‌تاپ Dell شما نیست. مدل، صورت را در وضوح داخلی ۲۵۶ پردازش کرده و خروجی نهایی ۹۴۰×۱۶۷۲ با ۲۵ فریم در ثانیه است. فایل برای مرورگر به H.264/AAC تبدیل شده است. طبیعی‌بودن لهجه و حرکت نیازمند قضاوت شماست؛ کیفیت مشابه نمونه‌ها یا سرعت زنده تأیید نشده است.

آزمایش سرویس‌های عمومی LongCat به محدودیت زمان GPU و خطای بارگذاری برخورد کرد؛ پیش‌نمایش نهایی کاملاً محلی ساخته شد. هیچ اعتبار یا سرور پولی فعال نشد. اسکریپت `src/portrait-preview.py` صرفاً مسیر اختیاری ساخت در Space عمومی را نشان می‌دهد و از داخل برنامه خودکار اجرا نمی‌شود.

## اجرای ویندوز روی لپ‌تاپ شما

۱. Node.js نسخهٔ ۲۲ یا جدیدتر و Python نسخهٔ ۳٫۱۱ یا جدیدتر نصب باشد.
۲. یک بار `SETUP-WINDOWS.cmd` را اجرا کنید؛ وابستگی‌ها از اینترنت دریافت می‌شوند.
۳. `START-WINDOWS.cmd` را باز کنید.
۴. پنل: `http://127.0.0.1:4321`
۵. صفحهٔ پخش: `http://127.0.0.1:4321/live`

در TikTok LIVE Studio منبع Link/Browser را با نشانی صفحهٔ پخش و اندازهٔ ۱۰۸۰×۱۹۲۰ اضافه کنید؛ اگر نسخهٔ شما منبع وب ندارد، همان پنجره را Capture کنید. صدا را با دکمهٔ داخل صفحهٔ پخش فعال کنید. صدای دو پیش‌نمایش را هم‌زمان فعال نکنید.

در لینوکس/macOS:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
npm ci --ignore-scripts
npm start
```

## اتصال مدل گفتگو

کپی `.env.example` را با نام `.env` ذخیره کنید و نشانی HTTPS سازگار با Chat Completions، نام مدل و کلید حساب خود را وارد کنید. فقط پس از انتخاب سرویس و هزینه‌هایش `ARYANA_LLM_ENABLED=true` را تنظیم کنید. کلیدها در مرورگر یا مخزن نوشته نشوند. با `node --env-file-if-exists=.env src/server.mjs` اجرا کنید. برنامه بدون این تنظیمات هم برای پیش‌نمایش و گفتار کار می‌کند.

## صدا، کلون و نگهداری اطلاعات

صدای معرفی فایل تولیدشده با هوش مصنوعی است؛ صدای زنِ نمونه‌ها یا شخص دیگری کلون نشده است. ابزارهای مستقل کلون/رندر در `tools/` صرفاً به‌عنوان مسیر اختیاری موجودند؛ نصب مدل یا فعال‌بودن کلون ادعا نمی‌شود. برای کلون، نمونهٔ خودتان یا صاحب صدایی که رضایت داده است لازم است.

تنظیمات و کش گفتار در `.private/` ذخیره می‌شوند؛ آن پوشه را منتشر نکنید. کش تا ۶۴ فایل محدود است. رویدادها و مجموع حمایت‌ها حافظه‌ای هستند و با راه‌اندازی دوباره یا اتصال جدید پاک می‌شوند. سرور فقط روی `127.0.0.1` گوش می‌دهد. پنل برای فرمان‌ها کلید نشست می‌خواهد و Origin بررسی می‌شود. فایل‌های خصوصی و `.env` از مسیر وب قابل دریافت نیستند.

## بررسی و مجوز

`npm test` قواعد نام، مرز سطح ۲۵، مجموع گیفت، زنجیره‌ها، گردش دقیقه‌ای، اصلاح تلفظ و اعتبارسنجی مدت/مسیر صدای کلیپ را بررسی می‌کند. رابط پنل و صفحهٔ پخش در مرورگر دسکتاپ و موبایل آزمایش شده‌اند. اجرای Windows و حساب واقعی تیک‌تاک در این محیط آزمایش نشده‌اند.

مجوز فونت کنار آن است. اتصال تیک‌تاک غیررسمی است؛ مجوز `TikTok-Live-Connector-LICENSE.txt` و وابستگی‌های نصب‌شده را نگه دارید. تصویر تولیدشدهٔ آریانا در `public/assets/aryana.png` قرار دارد. این بسته شامل ویدیوهای ارسالی شما نیست.

## ساخت کلیپ متحرک از داخل پنل

این حالت جدا از حرکت لب زنده است. برای نصب اختیاری موتور CPU روی ویندوز، Python 3.12، Git و FFmpeg لازم است. `SETUP-AVATAR-WINDOWS.cmd` را اجرا کنید؛ حدود ۱٫۲ گیگابایت فایل مدل و وابستگی‌های Python دریافت می‌شوند. سپس `START-AVATAR-WINDOWS.cmd` پنل را با موتور آفلاین باز می‌کند. نصب معمول برنامه همچنان با دو فایل اصلیِ setup/start انجام می‌شود و این مدل‌ها را دریافت نمی‌کند.

در پنل یک جملهٔ کوتاه تا ۱۰۰ نویسه بنویسید و «ساخت کلیپ متحرک» را بزنید. ساخت روی CPU ممکن است چندین دقیقه طول بکشد. درصد پیشرفت نمایش داده می‌شود. دکمهٔ توقف، گفتار و کار رندرِ شروع‌شده از پنل را لغو می‌کند. مدل‌ها در مسیر خصوصی `.avatar-models/` می‌مانند و وارد بستهٔ منتشرشده نمی‌شوند.

موتور مدل بر پایهٔ همان صدای تولیدشده کار می‌کند. خروجی باید هم تصویر و هم صدا داشته باشد و مدت آن حداکثر ۰٫۳ ثانیه با صدای ورودی اختلاف داشته باشد. هویت کش به عکس، صدا و نسخهٔ مدل وابسته است؛ ویدیوی یک جمله برای جملهٔ متفاوت استفاده نمی‌شود. حداکثر ۸ کلیپ خصوصی نگهداری می‌شود.

برچسب محتوای هوش مصنوعی را در تنظیمات خود TikTok نیز فعال کنید.


## Hosted Aryana and custom voice

PUBLIC_URL enables an independent public HF Space. The /live output needs no ChatGPT login; the management panel requires ARYANA_ADMIN_TOKEN supplied privately as a URL fragment and removed from the address after use. Public websockets exclude settings, logs and errors.

When ARYANA_VOICE_PROFILE_B64 is configured as a hosted secret, complete Persian/English base speech is converted through OpenVoice V2 to the private target tone. The original voice reference is never copied into the public source or container. A 10-second Persian runtime sample was generated locally and recognized as intelligible Persian; likeness still needs human listening. This is tone conversion, not a claim of identical voice, accent, or real-time video generation.


## LIVE reliability update

The hosted service now retries broken TikTok connections with bounded backoff while preserving session totals. Manual disconnection and stream end cancel retries. Speech is bounded and prioritized: operator commands, VIP welcomes and gifts precede likes. Emergency stop cancels queued speech, in-flight synthesis and local conversation. New audio files are validated and atomically published so cancellation cannot leave a truncated cache entry.

The owner panel controls output volume, mute and captions, includes a comment rehearsal and shows actual readiness. Public display clients receive only display-safe state. A private HF dataset stores approved names, pronunciation corrections, playback preferences and current session counts; raw voice recordings, voice profiles and comment history are not included in that dataset. The last pending checkpoint may not survive an abrupt container shutdown.

A pinned Qwen3-4B quantized CPU model supplies experimental bilingual conversation without paid API calls. It is not ChatGPT hosting and does not require a viewer account. Response quality and latency are limited by the small CPU model. AI-generated text may be imperfect. Full audio-driven lip and body motion still requires a separate realtime renderer; prerecorded introduction is identified separately. No real TikTok account reception or real three-hour broadcast has been tested without a supplied active account.
