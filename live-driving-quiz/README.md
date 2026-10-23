# FahrFit LIVE — بانک تصویری رانندگی

نسخهٔ فعال دارای ۱۰۰ سؤال (۹۸ سؤال تصویری و ۲ سؤال ویدیویی) با متن آلمانی، سه گزینه و کلید پاسخِ واردشده از بانک، به‌همراه ترجمهٔ فارسی آموزشی است. این مجموعه با سؤال‌های تألیفی قبلی جایگزین شده است؛ آن تمرین‌ها فقط در `data/practice-questions.json` برای آزمون‌های قبلی نگهداری می‌شوند.

شناسهٔ اصلی، متن آلمانی، ترتیب گزینه‌ها و کلید پاسخ در انتقال حفظ می‌شوند. تصویر همان شناسه، بدون برش، هنگام سؤال و نمایش پاسخ دیده می‌شود. ترجمهٔ فارسی رسمی نیست و این نرم‌افزار تأییدیهٔ TÜV/DEKRA را ادعا نمی‌کند.

داده از `yowmamasita/driving-theory` در commit ثابت `bbdfe728a9c19c427f67bff45ed54780248b1aeb` گرفته شده است؛ این مخزن متعلق به ناشر اصلی نیست. مرجع هر سؤال صفحهٔ متناظر ClickClickDrive است. نسخهٔ کامل و جاری بانک ۲۰۲۶ به‌طور مستقل احراز نشده است. سؤالات عددی و موارد دارای متن ناقص در این واردسازی نیستند.

صاحب پروژه در ۲۰۲۶-۱۰-۲۳ صریحاً اعلام کرد مجوز دارد و درخواست استفاده کرد. این اعلام در `data/bank-manifest.json` ثبت شده؛ تأیید مستقل ناشر نیست. سؤال، متن و رسانهٔ شخص ثالث تحت مجوز AGPL کد پروژه قرار نمی‌گیرند.

تصاویر در build از همان commit ثابت دریافت می‌شوند. نام، شناسهٔ سؤال، ابعاد، حجم و SHA-256 هر تصویر در manifest ثبت است. فایل‌های تصویری در git نیستند؛ server بدون فایل معتبر راه‌اندازی نمی‌شود. مرورگر فقط تصاویر allowlist را از همان میزبان می‌گیرد؛ به سرویس خارجی هنگام پخش وابسته نیست.

برای اجرای محلی، پس از نصب وابستگی‌ها یک بار `npm run prepare:media` را اجرا کنید.

## اجرای محلی

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run prepare:media
npm start
```

نشانی خصوصی پنل همراه رمز در ترمینال محلی چاپ می‌شود. رمز را منتشر نکنید. در نسخهٔ آنلاین لینک پنل فقط به تلگرام خصوصی صاحب پروژه ارسال می‌شود. صفحهٔ نمایش `/screen` و پنل `/control#TOKEN` جدا هستند.

## نمایش و کنترل

صفحهٔ نمایش بوم ثابت 1080×1920 با نسبت ۹:۱۶ دارد و کامل با اندازهٔ پنجرهٔ موبایل سازگار می‌شود. در LIVE Studio یا OBS یک Browser Source با همین ابعاد ایجاد کنید. پنل روی موبایل تک‌ستونه است. تصویر بدون برش و با حفظ نسبت دیده می‌شود؛ برای سؤال‌های بلند چیدمان فشرده می‌شود.

هر سؤال ۳۰ ثانیه برای پاسخ و ۱۲ ثانیه برای نمایش پاسخ دارد. شروع، توقف، سؤال بعد، نمایش جواب و چرخش خودکار در پنل خصوصی‌اند. حالت آزمایشی بدون هدیهٔ واقعی برای بررسی کار می‌کند.

## انتخاب گیفت

در بخش «سه گزینه، سه هدیهٔ متفاوت»، صاحب پروژه هدیهٔ هر گزینهٔ A، B و C را خودش تعیین می‌کند. متن همان پاسخ کنار انتخاب نشان داده می‌شود. هدیه‌ها از رویدادهای لایو شناخته می‌شوند؛ ثبت دستی نام و شناسه هم ممکن است. نام یا قیمت هدیه حدس زده نمی‌شود. هدیهٔ اختیاری ALL برای انتخاب هر سه گزینه در سؤال چندپاسخی است. پیش از تغییر هدایا سؤال را متوقف کنید.

در سؤال چندپاسخی، هدایای گزینه‌ها انتخاب‌ها را جمع می‌کنند. فقط مجموعهٔ دقیق پاسخ‌های درست یک امتیاز دارد. هدیهٔ تکراری، زنجیره‌ای یا دیررس امتیاز اضافه ندارد. قیمت نهایی را TikTok تعیین می‌کند؛ امتیاز آموزشی است و جایزهٔ نقدی وجود ندارد.

## اتصال و میزبانی

لایو را از ابزار رسمی حساب آغاز کنید، سپس نام کاربری را در پنل وصل کنید. اتصال این پروژه با کتابخانهٔ غیررسمی TikTok-Live-Connector و فقط مسیر ناشناس/رایگان است؛ تضمین دسترسی دائمی وجود ندارد و کلید سرویس پولی فعال نمی‌شود. برنامه به رمز، session cookie یا OAuth حساب نیاز ندارد.

انتشار روی Hugging Face فقط با cpu-basic رایگان مجاز است؛ سخت‌افزار پولی یا نامعلوم رد می‌شود. Docker تصاویر را هنگام build دریافت و با manifest تطبیق می‌دهد. اگر یک تصویر خراب یا غایب باشد، برنامه بالا نمی‌آید و سؤال بدون تصویر اجرا نمی‌شود.

نام حساب و نگاشت هدایا در فایل محلی settings.json ذخیره می‌شوند؛ فایل در git نیست و در بازسازی سرور ممکن است از بین برود. امتیازها و پاسخ‌ها در حافظه‌اند و با راه‌اندازی مجدد پاک می‌شوند.

## بررسی و مجوز

```bash
npm run prepare:media
npm test
```

کد این زیرپروژه AGPL-3.0-only است. مجوز کامل کتابخانهٔ اتصال و شرایط تکمیلی آن در THIRD-PARTY-LICENSES نگهداری شده است. فونت محلی Vazirmatn تحت SIL OFL است. مجوز کد شامل بانک و تصاویر شخص ثالث نیست؛ THIRD-PARTY-NOTICES.md را ببینید.

## اصلاح ترجمه، کیفیت و فیلم — ۲۰۲۶-۱۰-۲۳

طبق دستور صاحب پروژه، در متن فارسی «جاده» جایگزین «سواره‌رو» شد و ترجمه‌های مربوط به خط حرکت، جزیرهٔ عبور، مواد خطرناک و دید بازبینی شدند. متن آلمانی و کلید پاسخ حفظ می‌شوند.

دو سؤال تازه با تصاویر اصلی 2400×1440 در آغاز بانک اضافه شده‌اند. با دو تصویر بزرگ قبلی، چهار تصویر بزرگ در مجموعه وجود دارد. سایر تصاویر و دو فیلم فعلی در منبع اصلی عموماً 640×384 هستند؛ تصویرسازی یا بزرگ‌نمایی مولد برای ساخت جزئیات تابلوها به کار نمی‌رود و کیفیت HD برای فایل کم‌وضوح ادعا نمی‌شود. همهٔ فایل‌ها با همان کیفیت اصلی و بدون فشرده‌سازی دوباره از سرور خود برنامه پخش می‌شوند.

دو سؤال فیلمی هرکدام 15.04 ثانیه‌اند. دو ثانیه فرصت آماده‌شدن پخش، سپس تماشای فیلم و پس از آن ۳۰ ثانیه پاسخ است. در مرحلهٔ فیلم، هدیه پاسخ محسوب نمی‌شود. پخش در نمایشگر بی‌صدا و هماهنگ با زمان سرور است؛ هنگام پاسخ آخرین فریم حفظ می‌شود. پنل خصوصی امکان انتخاب مستقیم شناسهٔ سؤال را دارد. برای انتخاب سؤال دیگر ابتدا توقف کنید.

## نگاشت هدایا و عکس پاسخ‌دهندگان — ۲۰۲۶-۱۰-۲۳

طبق تصویر و درخواست صاحب پروژه، تنظیم پیش‌فرض: A = Rose (5655)، B = TikTok (5269)، C = GG (6064). کدها از فهرست هدایای ضبط‌شده و فهرست عمومی کنونی تطبیق داده شدند؛ هیچ هدیهٔ واقعی برای آزمایش خریداری یا ارسال نشده است.

شناسه، نام و نماد/تصویر هر هدیه کنار گزینه دیده می‌شود. این تنظیم پس از اتصال واقعی لایو، بدون انتظار برای دریافت هر سه هدیه آماده است؛ آمادگی پیکربندی به‌تنهایی اتصال حساب نیست. پنل همچنان امکان تغییر هدیه و بازگشت به تنظیم درخواستی را دارد.

عکس پروفایل از رویداد پذیرفته‌شدهٔ همان فرستنده گرفته می‌شود. URL فقط از دامنه‌های HTTPS تصویر TikTok/ByteDance پذیرفته می‌شود، عکس از سرور ما دریافت یا به گیت‌هاب ذخیره نمی‌شود و در صورت نبودن یا خرابی، حرف اول نام جایگزین است. شش پاسخ‌دهندهٔ اخیر هر گزینه دیده می‌شوند؛ شمارنده همهٔ پاسخ‌دهندگان را حساب می‌کند. در سؤال چندپاسخی عکس یک نفر کنار هر گزینهٔ انتخاب‌شدهٔ او می‌آید؛ هدیهٔ تکراری عکس یا امتیاز اضافه ندارد. عکس‌ها با سؤال جدید پاک می‌شوند.

مرجع شناسه‌ها: https://gist.github.com/alberand/ce890338db1a97af07802d5d59c72309
مرجع تصویر هدایا: https://www.eulerstream.com/docs/tiktok-gifts-list

## صفحهٔ ساده و ستون حامیان — اصلاحات صاحب پروژه، ۲۰۲۶-۱۰-۲۳

صفحهٔ عمومی فقط سؤال، تصویر/فیلم، ترجمه، گزینه‌ها، نگاشت هدایا و عکس پاسخ‌دهندگان را نشان می‌دهد. توضیح پاسخ، پاورقی، توصیه‌ها و متن‌های اضافهٔ قبلی نمایش داده نمی‌شوند. نتیجه با رنگ گزینه و علامت صحیح مشخص است. حالت آزمایشی/قطع اتصال و زمان کوتاه حفظ شده‌اند. توضیحات و تنظیمات در پنل خصوصی‌اند.

گیفت‌های خارج از نگاشت پاسخ‌ها در ستون چپِ داخل قاب نمایش داده می‌شوند؛ پاسخ آزمون محسوب نمی‌شوند و به بازبودن سؤال وابسته نیستند. جدیدترین فرستنده بزرگ و قبلی‌ها کوچک‌اند؛ یک حساب با ارسال مجدد به ابتدای ستون برمی‌گردد، نه اینکه چند عکس تکراری بسازد. حداکثر هشت حساب اخیر در این نشست نمایش داده می‌شود.

مرزهای نهایی: تا ۱۰ کوین حباب، ۱۱ تا ۵۰ ساده، ۵۱ تا ۱۰۰ نقره‌ای، ۱۰۱ تا ۴۹۹ طلایی، ۵۰۰ تا ۹۹۹ الماسی، از ۱۰۰۰ VIP با اژدهای آتشی چرخان. معیار، ارزش کوینی هر رویداد نهایی هدیه ضرب در تعداد زنجیره است؛ مجموع کل تاریخچه یا درآمد نقدی حساب نیست. قیمت نامعلوم سطح پایه دارد؛ حدس زده نمی‌شود. رویداد تکراری و زنجیرهٔ ناتمام دوباره شمرده نمی‌شود.

حلقه‌ها با CSS/SVG محلی، نور نئون، حباب، برق‌زدن و چرخش ساخته شده‌اند و سرویس تولید تصویر/ویدیوی پولی استفاده نمی‌کنند. تنظیم کاهش حرکت سیستم رعایت می‌شود. آزمایش سطح‌ها در پنل بدون ارسال هدیه ممکن است؛ فقط حالت آزمایشی اجازه دارد و با ورود به حالت واقعی دادهٔ آزمایش پاک می‌شود.

### Comment answers and guest support
The default response mode is comments: exact `1`, `2`, `3` (also Persian/Arabic digits). Switch to gifts in the private panel; switching pauses the question. Only the selected input source answers. Both sources use the same timing, deduplication, scoring and portrait rules.

Register raised guests by username in the panel. A matching chat/gift user identity resolves their numeric ID, or the owner can enter it. Gifts are assigned only by an explicit matching receiver ID (`receiverUserId`, `giftExtra.toUserId`, or `toUser`). Missing recipient data is never assigned by guesswork. Availability of guest-receiver events depends on TikTok's actual event stream.

Click a guest in the panel or web screen to see supporters, original gift names, quantities, known coin totals and last-event ring tiers. This interaction is on the web page; a captured LIVE video is not clickable by viewers. No new payment or real gift is generated by demo buttons. Guest definitions are saved in local settings; support totals are per process session, cleared on restart or demo/live transition. Container replacement can reset local settings. No durable analytics storage is claimed.

All completed gifts now show their sender in the supporter rail, including Rose/TikTok/GG when comment answering is active. Answer processing still follows the chosen input mode. The rail aligns against the text column with a small gap; names, gift quantity and known coin value are shown. The `[resume-driving-live]` deployment marker reconnects the known LIVE without switching input modes or sending chat/gifts.

### Correct-answer celebration
The public background uses muted sage (`#e6efe9`). Correct responders are determined only after reveal using exact answer-set equality; a partial answer or an extra wrong choice does not qualify. Up to six winner portraits are shown at once and rotate every 2.2 seconds, with an accurate total and no raw TikTok user IDs. Starting the next question hides the celebration.

A short original major-key Web Audio jingle accompanies the animated winner portraits. It uses no downloaded/licensed track or paid generation. Music is enabled by default at 20%; the private panel can mute it or change volume. Browser autoplay policies require the source operator to click “فعال‌کردن صدا” once and enable that browser source's audio in OBS/LIVE Studio. Reduced-motion preferences suppress portrait animations.

German and Persian question/answer text have distinct subtle shadows. Source images prefer 480px height on the 1080×1920 canvas, reducing to 390px/290px only when text and winner profiles need room; source images retain `object-fit: contain`. Timer sound has an independent panel toggle: five quiet ticks during the last five response seconds, then a two-note end cue. Manual early reveal and the video-watching phase do not sound a timer-expiry cue.

The public interface is German by default (`showPersian=false`). The owner can add Persian question/answer translations live using the private panel toggle; UI labels remain German. Participant names and original gift names are preserved as received. Language changes do not pause the question or alter its scoring.

The Persian checkbox now applies immediately on change; no separate save step is required. Its request is serialized while saving and rolls the control back to server state on failure. The control token is retained only in same-tab session storage so a refresh does not lose panel authorization. Clients watch the public build ID and reload after a later deployment (the private fragment is restored before an automatic panel reload). The background is a clearly green `#c5ddc8` across the viewport, canvas and cards.

The last successful correct-answer group stays on screen across subsequent questions until a new correct group replaces it, within the current process session. The caption identifies it as the last result and includes its original question ID; it never reveals the current question's answers. One to three winners receive larger 130px portraits. Music only plays for a newly revealed current winner group, never for a prior group during a new answer period. Changing mode or connecting to another LIVE clears the stored celebration. A short German single/multiple-answer label remains visible beside the timer.


## Sessions and activity rail

The private panel configures 50–100 questions per session (default 50), with a shuffled unique plan and an explicit repeat opt-in. A revealed question enters the completed group; completed questions are excluded from later sessions unless repeats are allowed. An insufficient fresh pool blocks a new session instead of silently repeating. Ending a plan stops autoplay. Manual selection is labelled as review, and demo progress never changes the real session history.

Real session plans and completed IDs are stored in a tiny private `fahrfit-quiz-state` Hugging Face Dataset, not a paid persistent disk. Deployments seed it only when absent. `HF_SESSION_REPO` and `HF_SESSION_TOKEN` are server-only; neither private dataset credentials nor progress files are public assets. Loading or saving failures block subsequent real rounds and appear in the panel. The dataset contains only question IDs, progress, timestamps and configuration, never participant profiles. Other settings and participant totals remain per-instance as described above.

The left rail combines recent gift senders (larger portraits with existing coin tiers) and ranked likers, with faint translucent glass cards. Likes use the v3 message `count` sender delta, never the room `total`; duplicate/stale events are rejected. More than 100 likes gets a pink frame; 1000 or more gets a crown. Counts are English compact numbers (`1K`, `1.4K`, `2K`). A gift sender who also likes appears once, with both values. Eight rows are visible; gift rows reserve up to four slots when likers are present. Like counts cover only events received during this connection, not historic TikTok totals. Test buttons generate local demo events only and never send real likes or gifts.

## Stable mobile media, edge reactions and source audio

Two narrow decorative heart/thumb streams rise continuously along the outer edges, without generating or changing real per-user like totals. They stay outside the question and activity columns, ignore pointer input and disappear with reduced-motion preferences. The broadcast canvas remains 1080×1920 (9:16).

Turning Persian on changes the text layout, not the image/video height. Compact and dense text layouts preserve the complete source picture (500px in the centered layout or 420px alongside activity; full video viewing keeps 560px). Dense questions adjust text spacing instead of shrinking media.

Audio tries to start automatically where browser-source autoplay is permitted, with a click/keyboard fallback where a real gesture is required. The screen always exposes `Ton aktivieren` / `Ton testen`, with an audible two-note test. Countdown audio has its own output gain and remains audible when the music slider is zero. Unlock sound inside the actual LIVE Studio Browser source (or OBS Interact), then enable/unmute that source in the audio mixer; activating a different tab or private control page does not unlock the broadcast source.
