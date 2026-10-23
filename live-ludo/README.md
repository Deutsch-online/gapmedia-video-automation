# لدو لایو کشورها — پنل آنلاین یکپارچه

نسخهٔ آنلاین: https://afgtakrun-ludo-live-nations.hf.space/

بازی و پنل در یک صفحه هستند. لینک خصوصی مدیریت شامل کلید در fragment است؛ آن را در لایو نمایش ندهید. با ورود، پنل کشورها، صف ۱۰ کشور، چهار شناسهٔ گیفت، حساب تیک‌تاک و تنظیم صدا و تصویر فعال می‌شود. دکمهٔ حالت لایو کنترل‌ها را پنهان می‌کند؛ دکمهٔ چرخ‌دنده پنل را برمی‌گرداند. صفحهٔ نمایش اختیاری `/screen` همان برنامه را با پنل بسته باز می‌کند.

ابتدا لایو را در TikTok آغاز کنید؛ در پنل نام حساب را وارد و اتصال را بزنید. هر گیفت نهایی با شناسهٔ یکتا به گوشهٔ مربوط نگاشت می‌شود و نام و پروفایل آخرین فرستنده در قاب آن کشور قرار می‌گیرد. آخرین شناسهٔ دریافتی برای تنظیم گیفت‌های ناشناخته نشان داده می‌شود. گوشهٔ چهارم تا تعیین شناسه غیرفعال است. کشور جایگزین، نگاشت گوشه را به ارث می‌برد و پروفایل قبلی پاک می‌شود. زنجیرهٔ گیفت پس از پایان یک بار ثبت می‌شود.

تنظیمات و بازی از سرور میان مرورگرها همگام می‌شوند. کلید خصوصی فقط در sessionStorage مرورگر مدیر است و داخل snapshot عمومی فرستاده نمی‌شود. تغییر هم‌زمان قدیمی با شمارهٔ revision رد می‌شود. وضعیت در فایل محلی کانتینر نگهداری می‌شود؛ بازسازی یا جایگزینی کانتینر می‌تواند آن را پاک کند.

میزبانی مستقل Hugging Face فقط CPU-basic رایگان است؛ اسکریپت سخت‌افزار پولی یا نامعلوم را رد می‌کند. GitHub Actions در مخزن Deutsch-online/gapmedia-video-automation و مسیر live-ludo منبع اصلی انتشار آنلاین است. کلید مدیریت از secret زمان اجرا ساخته و فقط با کلید عمومی گیرنده رمز می‌شود؛ کلید خام داخل کد یا log نیست. هیچ پیام تلگرام ارسال نمی‌شود.

کتابخانهٔ اتصال tiktok-live-connector غیررسمی است؛ دریافت واقعی گیفت نیازمند لایو بودن حساب و دسترسی تیک‌تاک از میزبان است. این نسخه ورود پنل و WebSocket سرور آنلاین را بررسی کرده است؛ دریافت گیفت واقعی بدون لایو کاربر بررسی نشده است.

## اجرای محلی
Node.js 24 یا جدیدتر؛ npm ci سپس npm start. لینک خصوصی در ترمینال چاپ می‌شود. PORT و LUDO_ADMIN_TOKEN اختیاری‌اند. برای میزبانی عمومی، PUBLIC_URL امن و LUDO_ADMIN_TOKEN لازم‌اند.

## آزمایش
node test.mjs
احراز مدیریت، رد نوشتن ناشناس، همگامی پروفایل و تنظیمات، جلوگیری از تداخل و اعتبار نام حساب بررسی می‌شوند.

## Neon / free comments update
The live display uses English labels and English country or team names. The owner panel can stay Persian. Default input is free comments: 1–4 trigger a dice roll and animated move for the corresponding active slot, with Ludo's six-to-enter, capture, safe-cell and exact-home rules. Actions run sequentially. Request numbers 5–14 belong to waiting entrants, remain stable as ranks change and are separate from gameplay. Each viewer has one current waiting choice; changing it subtracts one request from the previous choice. Percent bars and rank order update from real comment events.

Nine curated one-coin gifts are available; four distinct gifts are preselected (Rose 5655, TikTok 5269, GG 6064, Ice Cream Cone 5827). Gift IDs with higher cost cannot be selected; a received event reporting cost above one coin is rejected. Preset IDs and reference costs were checked against https://gist.github.com/alberand/ce890338db1a97af07802d5d59c72309 . Availability and current platform prices still depend on TikTok's catalogue.

Countries / Teams selector allows a custom English person/team name and locally resized picture in place of the flag. Team pictures are part of the shared snapshot. Supporter profile remains separate: the highest cumulative gift sender is shown, and clicking the frame opens all supporters ranked by gift count. Participant names are user-provided content and are preserved.

In gift-only mode, connected gameplay takes a turn every four seconds and an entrant with zero lifetime gifts is automatically replaced after its second completed turn; the most requested waiting entrant joins. In free comments or both modes, lack of gifts does not eliminate entrants. Waiting list entries never require or show gifts; entrants inherit their active slot's configured gift on promotion.

Automated checks cover model rules, shared authenticated server state, free comment actions and animation metadata, one-coin restrictions, photos and ranked supporters. DOM checks cover English live labels, comment codes, supporter dialog and motion keyframes. Full visual browser review and real TikTok events still require runtime verification.

## One-click demo
The owner panel has a prominent Start demo button and a connection guide. Demo runs automatic sample gifts, requests and pawn animations with no TikTok connection and no spending. Demo state is not saved over real state. Stop demo restores the pre-demo game and request selections; connecting to a real LIVE also stops and restores the demo first. Demo cannot start while LIVE is connected/connecting and expires automatically after roughly 144 seconds.
