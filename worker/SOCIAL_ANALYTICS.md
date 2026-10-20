# پایش و یادگیری easydeutsches

حساب‌های هدف: https://www.tiktok.com/@easydeutsches و https://www.instagram.com/easydeutsches/ . اتصال فقط‌خواندنی است؛ ارسال یا حذف پست، خرید سرویس و مصرف اعتبار جدید از این مسیر انجام نمی‌شود. ایمیل، رمز و کوکی دریافت نمی‌شود. آمار و اتصال‌ها در KV خصوصی می‌مانند؛ توکن‌ها با AES-GCM و کلیدی مشتق از Secret موجود بات رمز می‌شوند. تغییر توکن بات نیازمند اتصال مجدد است.

## زمان‌بندی و محدودیت

Cron پنج‌دقیقه‌ای Worker، موعد جمع‌آوری ساعتی را بررسی می‌کند. جست‌وجوی Exa MCP و پیشنهاد آزمایش با مدل موجود Workers AI حداکثر روزانه‌اند. نبود سهمیه یا خطای مدل به آزمایش‌های پایه برمی‌گردد؛ سرویس پولی جایگزین ندارد. GitHub workflow مستقل `social-watchdog.yml` ساعتی سلامت Worker، تازگی پایش و مرحلهٔ ناموفق آخرین تولید را بررسی می‌کند. هشدار یکسان حداکثر هر شش ساعت است. این دو زمان‌بند تضمین بدون‌وقفه‌بودن نیستند.

نبود OAuth به‌صورت `limited_access` گزارش می‌شود؛ نبود داده به معنی نبود پست یا شکست محتوا نیست. `/review` بررسی تازه را برای نزدیک‌ترین نوبت پنج‌دقیقه‌ای ثبت می‌کند (فاصلهٔ حداقل ۱۵ دقیقه). `/insights` گزارش، `/strategy` آزمایش بعدی، `/references` نامزدهای جست‌وجو و `/monitor` سلامت اجرا را می‌دهد.

## اتصال رسمی

برنامهٔ توسعه‌دهنده و مجوزهای آن باید نزد خود پلتفرم آماده شوند؛ لینک پروفایل یا رمز حساب این مجوز را ایجاد نمی‌کند. Secretهای GitHub Actions در Worker قابل‌خواندن نیستند. مقدار Secret در چت یا مخزن قرار نمی‌گیرد.

TikTok:

- Worker Secrets: `TIKTOK_CLIENT_KEY` و `TIKTOK_CLIENT_SECRET`.
- Login Kit redirect: `https://afghanfollowers-telegram.afghan-video-bot.workers.dev/social/callback/tiktok`
- Scopes: `user.info.basic,user.info.profile,video.list`.
- در چت خصوصی `/connect tiktok`؛ حساب باید دقیقاً easydeutsches باشد.
- آخرین ۲۰ ویدیو و شمارنده‌های ارائه‌شدهٔ Display API خوانده می‌شوند؛ این API نمودار retention یا زمان تماشا نمی‌دهد.

Instagram:

- حساب Creator/Business و برنامهٔ مجاز Instagram لازم است.
- Worker Secrets: `INSTAGRAM_APP_ID` و `INSTAGRAM_APP_SECRET`.
- Worker variable: `INSTAGRAM_GRAPH_VERSION` برابر نسخهٔ فعال و پشتیبانی‌شدهٔ برنامه (مثلاً `v24.0` فقط در صورت فعال‌بودن همین نسخه).
- Redirect: `https://afghanfollowers-telegram.afghan-video-bot.workers.dev/social/callback/instagram`
- Scopes: `instagram_business_basic,instagram_business_manage_insights`.
- در چت خصوصی `/connect instagram` و تأیید رسمی برای حساب easydeutsches.
- از ۱۲ رسانهٔ اخیر حداکثر شش ویدیو بررسی می‌شود؛ metric ارائه‌نشده نامعلوم می‌ماند.

OAuth لینک ده‌دقیقه‌ای، state تصادفی، کوکی امن HttpOnly و کنترل تطابق حساب دارد. TikTok با refresh token و Instagram با long-lived token و refresh پیش از انقضا کار می‌کند. خطای refresh به اتصال مجدد هدایت می‌شود. پیاده‌سازی connector به معنی آزمون زندهٔ موفق نیست: تا تنظیم برنامه و تأیید صاحب حساب، scope و metricهای واقعی تأیید نشده‌اند. `/disconnect tiktok` یا `/disconnect instagram` اتصال محلی را برمی‌دارد؛ لغو مجوز در خود پلتفرم جداست.

## تحلیل و بازخورد

حداکثر ۱۰۰ ویدیوی اخیر با هشت مشاهدهٔ آخر و benchmark نزدیک ساعت ۲۴ نگهداری می‌شود. مقایسه به سه ویدیو در یک پلتفرم، بازهٔ طول یکسان، وضعیت تبلیغ یکسان و مشاهدهٔ ۱۸ تا ۳۰ ساعت پس از انتشار نیاز دارد. نامعلوم‌ها صفر نمی‌شوند. بازدید، رابطهٔ آماری یا جست‌وجوی «وایرال» علت قطعی یا کیفیت گرافیک را ثابت نمی‌کند. جست‌وجو فقط نامزد می‌دهد؛ بدون دیدن فریم‌ها، سبک بصری و کیفیت موشن تأیید نمی‌شوند. بازبینی کامل ویدیوهای حساب هنوز به دسترسی رسانه نیاز دارد.

در نبود OAuth می‌توان با `/metrics` یک شیء JSON آمار واقعی فرستاد. کلیدهای لازم: `platform`، `id`، `url`، `published_at` و اعداد واقعی مثل `views`، `likes`، `duration_seconds`، `average_watch_seconds`، `completion_rate`. نرخ‌ها بین صفر و یک‌اند؛ مقدار نامعلوم `null` است. `observed_at` زمان اندازه‌گیری است. این داده با `owner-reported` برچسب می‌خورد، نه `official-api`.

برنامه‌ریز تولید و پیش‌نویس‌های بات، آزمایش‌های اخیر را با endpoint خصوصی می‌خوانند؛ این آزمایش‌ها اجازهٔ تغییر اعتبار، مدت، منبع رسمی یا گیت کیفیت نیستند. پس از کنترل کیفیت خروجی محلی، اندازه و زمان فریم ثابتِ اندازه‌گیری‌شده برای پایش فرستاده می‌شود؛ این اندازه‌گیری فنی، آمار انتشار یا بازبینی بصری کامل نیست. دادهٔ خصوصی در مخزن عمومی commit نمی‌شود.

## قراردادهای API

- https://developers.tiktok.com/doc/login-kit-web/
- https://developers.tiktok.com/docs/en/tiktok-api-v2-video-list
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/insights/
