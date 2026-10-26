# FahrFit LIVE — بانک تصویری رانندگی

نسخهٔ فعال دارای ۲۰۰ سؤال (۱۹۸ سؤال تصویری و ۲ سؤال ویدیویی) با متن آلمانی، سه گزینه و کلید پاسخِ واردشده از بانک، به‌همراه ترجمهٔ فارسی آموزشی است. این مجموعه با سؤال‌های تألیفی قبلی جایگزین شده است؛ آن تمرین‌ها فقط در `data/practice-questions.json` برای آزمون‌های قبلی نگهداری می‌شوند.

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
The public background uses muted sage (`#e6efe9`). Correct responders are determined only after reveal using exact answer-set equality; a partial answer or an extra wrong choice does not qualify. Up to six winner portraits are shown at once and rotate every 2.2 seconds, with an accurate total and no raw TikTok user IDs. The last correct group stays visible with its original question ID until replaced; see badge retirement below.

A distinct original four-note rising victory bell precedes the major-key Web Audio jingle, with a brief golden glow, flowers and sparks around each newly revealed correct portrait. It uses no downloaded/licensed track or paid generation. Music is enabled by default at 20%; the private panel can mute it or change volume. Browser autoplay policies require the source operator to click “فعال‌کردن صدا” once and enable that browser source's audio in OBS/LIVE Studio. Reduced-motion preferences suppress portrait animations.

German and Persian question/answer text have distinct subtle shadows. Source images prefer 480px height on the 1080×1920 canvas, reducing to 390px/290px only when text and winner profiles need room; source images retain `object-fit: contain`. Timer sound has an independent panel toggle: five quiet ticks during the last five response seconds, then a two-note end cue. Manual early reveal and the video-watching phase do not sound a timer-expiry cue.

The public interface is German by default (`showPersian=false`). The owner can add Persian question/answer translations live using the private panel toggle; UI labels remain German. Participant names and original gift names are preserved as received. Language changes do not pause the question or alter its scoring.

The Persian checkbox now applies immediately on change; no separate save step is required. Its request is serialized while saving and rolls the control back to server state on failure. The control token is retained only in same-tab session storage so a refresh does not lose panel authorization. Clients watch the public build ID and reload after a later deployment (the private fragment is restored before an automatic panel reload). The background is a clearly green `#c5ddc8` across the viewport, canvas and cards.

The last successful correct-answer group stays on screen across subsequent questions until a new correct group replaces it, within the current process session. The caption identifies it as the last result and includes its original question ID; it never reveals the current question's answers. One to three winners receive larger 130px portraits. Music only plays for a newly revealed current winner group, never for a prior group during a new answer period. Changing mode or connecting to another LIVE clears the stored celebration. A short German single/multiple-answer label remains visible beside the timer.


## Sessions and activity rail

The private panel configures 50–200 questions per session (default 50), with a shuffled unique plan and an explicit repeat opt-in. A revealed question enters the completed group; completed questions are excluded from later sessions unless repeats are allowed. An insufficient fresh pool blocks a new session instead of silently repeating. Ending a plan stops autoplay. Manual selection is labelled as review, and demo progress never changes the real session history.

Real session plans and completed IDs are stored in a tiny private `fahrfit-quiz-state` Hugging Face Dataset, not a paid persistent disk. Deployments seed it only when absent. `HF_SESSION_REPO` and `HF_SESSION_TOKEN` are server-only; neither private dataset credentials nor progress files are public assets. Loading or saving failures block subsequent real rounds and appear in the panel. The dataset contains only question IDs, progress, timestamps and configuration, never participant profiles. Other settings and participant totals remain per-instance as described above.

The right rail combines recent gift senders (larger portraits with existing coin tiers) and ranked likers, with faint translucent glass cards. Likes use the v3 message `count` sender delta, never the room `total`; duplicate/stale events are rejected. More than 100 likes gets a pink frame; 1000 or more gets a crown. Counts are English compact numbers (`1K`, `1.4K`, `2K`). A gift sender who also likes appears once, with both values. Eight rows are visible; gift rows reserve up to four slots when likers are present. Like counts cover only events received during this connection, not historic TikTok totals. Test buttons generate local demo events only and never send real likes or gifts.

## Stable mobile media, edge reactions and source audio

Two narrow decorative heart/thumb streams rise continuously along the outer edges, without generating or changing real per-user like totals. They stay outside the question and activity columns, ignore pointer input and disappear with reduced-motion preferences. The broadcast canvas remains 1080×1920 (9:16).

Turning Persian on changes the text layout, not the image/video height. Compact and dense text layouts preserve the complete source picture (500px in the centered layout or 420px alongside activity; full video viewing keeps 560px). Dense questions adjust text spacing instead of shrinking media.

Audio tries to start automatically where browser-source autoplay is permitted, with a click/keyboard fallback where a real gesture is required. The screen always exposes `Ton aktivieren` / `Ton testen`, with an audible two-note test. Countdown audio has its own output gain and remains audible when the music slider is zero. Unlock sound inside the actual LIVE Studio Browser source (or OBS Interact), then enable/unmute that source in the audio mixer; activating a different tab or private control page does not unlock the broadcast source.

## Connection recovery and combined comment answers

Online hosting retries anonymous/free connections after startup or network/offline failure, with 15, 30, 60, then 120-second backoff (five minutes after rate limiting). The private panel shows the next attempt and allows disabling automatic reconnect. Manual disconnect or switching to demo stops retry. Profiles and counts survive a temporary disconnect within the same running process and room; a new room/account resets them. Deployment still resets in-memory participants. Connection recovery can display real gifts/likes even while questions remain paused; a session-storage failure does not invalidate a working TikTok connection.

Comments register every distinct valid digit 1, 2 or 3 anywhere in the message. Examples: `12` selects A+B, `13` A+C, `23` or `32` B+C, and `123` selects all three. Persian/Arabic digits also work; other digits are ignored (`14` selects only A). One comment is submitted atomically with one event ID, one voter and at most one portrait per chosen option. Duplicate messages and late/closed-round comments remain rejected. Selecting additional options does not automatically earn a correct-answer score: the exact answer set must match, including single-answer questions. Gift answer rules remain unchanged.

## Manual question controls

Selecting a question opens its answer window with autoplay off. Manual Next reveals/records an open round, advances to a fresh planned question and opens that question without enabling autoplay; during video playback it explicitly skips the unfinished question without marking it completed. A repeated Start on an already open/viewing round is idempotent and preserves votes. Manual Reveal also works from waiting/paused states and scores a round at most once, including pause/reveal repetitions. A manual reveal never schedules the later natural-expiry sound. The private panel marks pending commands and disables repeated manual clicks; Pause and Disconnect can still cancel a pending round transition.

A deployment tagged `[manual-driving-check]` checks real manual controls while leaving autoplay off. It observes received comments only and never sends real chat or gifts or simulates LIVE events. Real reception is only reported as verified when the actual accepted-comment counter increases.

The current bank contains 200 distinct source IDs and 200 verified original images, including the two existing video questions. Session size can be configured up to 200; current plans and completed IDs survive the expansion. The larger decorative reaction stream follows the right edge of the question column, with a clear gutter before the right-side profiles; profile text sizes stay unchanged.

### German question reading

German speech uses the free offline neural **Piper 1.3.0**, voice
`de_DE-thorsten-medium` (Thorsten dataset: CC0). The model and config are pinned
by Hugging Face commit and SHA-256 in `prepare-narration.py`. Piper is GPL-3.0;
see https://github.com/OHF-Voice/piper1-gpl and the upstream MODEL_CARD at
https://huggingface.co/rhasspy/piper-voices/blob/5041a7a49ae5b3a0f30e6837769eb03fdbb231bd/de/de_DE/thorsten/medium/MODEL_CARD .

Docker installs CPU-only Piper and generates complete German sentence WAVs once
at build time. No keys, credits, hosted TTS calls or browser voices are used for
playback. No fallback to the previous robotic espeak waveform. Models, WAVs and
manifest are ignored by Git; wording hashes guard against stale recordings.
For local preparation use a Python venv with `piper-tts==1.3.0`,
`onnxruntime==1.23.2`, `numpy==2.3.4`, then run `prepare-narration.py`.

Reading is enabled by default when the answer window opens, including manual
rounds. Video viewing finishes first. The panel can disable reading or request
a repeat. Pause, reveal or changing questions cancels speech; state updates,
WebSocket reconnects and temporary audio-device suspension never restart the
same sentence. WAVs are fully downloaded and decoded before playback, cached
for repeat, with one bounded free retry on load failure. The shared audio
context uses playback latency and keeps its position through suspension.
Timer beeps are suppressed while speech is loading/playing. The answer window
is at least the selected time or recording length + 5 seconds, whichever is
longer, to avoid cutting a long question at a short configured timer.

Browser autoplay needs a gesture in the actual Browser source: click **Ton
aktivieren**, and unmute that source in LIVE Studio/OBS. The separate private
panel cannot unlock the source. `/health` must report `german_voice` as
`de_DE-thorsten-medium` and `german_recordings` equal to the question count.

### Previous winner badge retirement

When a user submits any accepted answer in a new round, their old winner badge
is removed immediately. Apply this to both correct and incorrect selections so
badge removal cannot expose the answer key before reveal. A rejected/late event
does not remove a badge. Other prior winners who have not answered stay visible
with their original question ID. Exact complete correct answers reappear only
after reveal; wrong or incomplete answers never retain the old badge. Internal
user IDs used for matching are never sent in public celebration payloads.

Current winners receive a brief flower/spark burst and golden portrait glow;
the special victory cue plays once per revealed round under the existing
celebration music enable/volume controls. Regular broadcasts, pagination and
old winner groups do not retrigger the cue. Reduced-motion hides bursts.

### Bank expansion to 200

Added 50 distinct image-based source questions: passenger safety, right of way,
intersection order and traffic warning signs. Each uses the pinned upstream
German wording, option order and answer key, a verified original PNG and a
reviewed educational Persian translation using جاده. No repeated source IDs
or invented questions were added. Existing 150 rows, both videos, session
plans and completed IDs are preserved. Neural German audio is regenerated
for all 200 questions in the free CPU build. Session sizes remain owner
controlled (50–200), with default 50 and explicit repeat opt-in.

### Movable mobile activity rail and gift spotlight

The private panel selects only left/right and vertical position (80–400 design
pixels); there is no free horizontal dragging. The portrait layout remains
1080×1920 and reserves a separate question column on either side. The owner
chooses 1–10 people including the enlarged person. Long lists tour vertically
inside the rail; reduced-motion uses manual scroll instead. Profile font sizes
are preserved. The newest gift gets the large portrait for 60 seconds, then
the actual highest liker gets it. A new final gift replaces the previous one;
without a liker, the last gift remains until someone can take that place.
One person is not duplicated in the list and spotlight. Counts, exact values,
and gift validation remain event based; nothing buys or sends gifts.

Ring rendering and transparent gold/ice/fire artwork are copied from this same
repository's `live-rings/public` (the owner's referenced Rings Studio). The
entire painted ornament slowly rotates, with canvas clouds, ripples, crowns,
embers and flames. Only the enlarged frame uses full ornaments; smaller frames
use the same animated renderer at a lower update rate. The transparent center
keeps the portrait clear. Motion respects reduced-motion and hidden tabs.

The panel can choose decoration by final gift quantity or total event coins
(value × completed repeat count), with strictly increasing custom thresholds
for simple, silver, gold, diamond and VIP. Unknown coin value cannot earn a
higher coin-based tier. Defaults keep the previous thresholds. Layout and gift
threshold settings are saved locally and in the existing free private progress
Dataset, without storing participant data there.

Follow + opens only an actual validated TikTok username received from events.
It never guesses a handle from a display name or silently follows an account.
Following needs TikTok's own account UI. The links are usable in the Browser
source/Interact and private panel; a streamed video image is not clickable for
viewers. Missing usernames show a disabled control instead of a made-up URL.

### Shareable sales demo, original media viewer and operator buttons

`/demo` is a responsive public sales demonstration with an embedded
`/screen?demo=sales` preview. It fetches only a small labelled sample deck at
`/api/demo`; all people, gifts, points and interactions are simulated locally.
It never opens a LIVE socket, calls admin routes, buys/sends gifts, or changes
real question/session history. Same-origin parent messages are restricted to
the parent frame and an explicit command set. Sample answers are disclosed
only for this demonstration, not from the real current round.

Images and videos retain verified source bytes. Tap the media or use ⛶ to move
the same media nodes into a large touch-friendly dialog, zoom 100–400%, drag,
pinch, reset, use native video controls or open the original file. The actual
source dimensions appear beside the media. This does not invent detail, upscale
low-resolution media or claim 4K. Close/Escape restores the original media nodes;
changing questions closes and resets the viewer. The answer timer keeps running.

The private control page provides an owner-only `/screen#TOKEN` link. Four
on-screen buttons execute Previous, Repeat, Pause and Next through authenticated
admin commands in Browser-source Interact. The token is removed from the visible
URL and retained only in that Browser session's sessionStorage for Refresh.
Public fresh sessions have no operator controls; sales preview controls always
remain local, even if an owner has used the same browser. Never share the owner
URL; share `/demo` instead. Controls do not become clickable in a streamed video.

Previous/forward traversal uses the current process's displayed-question trail.
Repeat starts a new answer round and clears the current round's votes, without
enabling bulk session repeats. Completed review is allowed only for explicit
owner Previous/Repeat; ordinary selection keeps the repeat policy. A repeated
Start remains idempotent. Pause stops autoplay. Existing plan progress is retained.

`/rights` and a discreet in-app watermark identify the product's copyright notice.
The notice covers proprietary branding/presentation/promotional material subject
to legal and licence exceptions. It preserves AGPL and upstream rights, attributes
question/media rights to their owners and makes no claim of legal registration
or prevention of screen recording.

### Tight rail and reliable progressive gift display

Both rail positions now have a six-design-pixel gutter beside the question.
The rail moves inward to a 68px outside margin so portraits stay inside mobile
LIVE crops; reaction particles occupy the outside margin. German and Persian
question/answer text use heavier weights and crisp, restrained shadows, without
changing profile text sizes or source media height.

Gift display is independent of quiz gift answers. A combo/streak displays the
sender immediately while `pending`; subsequent cumulative counters replace the
same portrait/count rather than summing updates. Finalization removes the
pending label and never duplicates the completed gift. Zero/empty order/group
sentinels cannot act as universal duplicate IDs. IDs, counts, type and value are
normalized across v3, legacy and extended metadata; positive nested values are
not masked by protobuf zero defaults or empty metadata objects. Existing
avatars/handles survive partial final messages, and known like-profile avatars
can fill a missing donor avatar. Missing prices remain unknown. Guest totals
still apply only once at finalization; quiz answer scoring rules are unchanged.

Actual gift events received during connection setup are held in a bounded
memory queue and processed after room/mode promotion so the reset does not
erase them. Existing connection retry/freshness checks remain in effect.
The private panel separates received events, recorded portraits, updates and
quiz gift answers. `/api/admin/gift-events` keeps the latest 30 enumerated
accept/reject summaries in process memory, requires authentication and exposes
no raw upstream payloads, URLs, cookies or tokens. Demo injections do not enter
this real-event log. Prior unlogged events cannot be reconstructed or claimed
as recovered. The state resets on a new room/process, as the existing LIVE
participant counters do.

### Section sessions, replay and overlay controls

The session selector groups the 300 loaded questions by their original catalogue
prefix (for example `1.2.09`); labels come from the original source URL. Counts
refer to the loaded bank, not the publisher's entire catalogue. General sessions
retain the 50-question minimum; a source section can contain fewer questions and
allows 1 through its displayed count. Selecting settings affects the next session.
`repeat-session` explicitly replays the exact current/finished plan in the same
order without deleting completed history or enabling global repeats. Demo plans
remain isolated from real progress.

The owner sets the post-answer wait from 0–300 seconds independently of the
question timer. Liker and gifter ring styles can be chosen independently, including
automatic tiers or no ring; the artwork and renderer reuse `live-rings/public`.
Floating hearts belong only to the highlighted portrait. Real MEMBER events show
a bounded, transient name toast rising from the lower right; the private panel's
join test is restricted to demo mode. No join history is persisted.


### 300-question bank and native Persian speech

The loaded bank now contains 300 distinct original source IDs with 300 verified
PNGs and two original videos. The additional 100 German questions, option order
and correct keys are preserved from the pinned upstream archive; every added
question and all 300 new options have educational Persian translations. Source
prefix sections and their counts update automatically; active plans and completed
history are retained. This remains a selected archive, not a claim to contain the
complete or current official examination catalogue.

The narration selector supports German, Persian and German followed by Persian.
The native Persian voice is `fa_IR-amir-medium` and the German voice remains
`de_DE-thorsten-medium`; both are Piper voices with CC0 datasets, pinned model
hashes, and local CPU synthesis. No external TTS or paid fallback is used. Symbols
and bracket names are stripped before synthesis, sentence punctuation gives a
pause and Persian decimal numbers preserve their value. All question clips and
the two welcome clips are buffered fully before playback. Audio uses the actual
Browser Source's shared AudioContext; it still requires that source's audio unlock
and an unmuted mixer. Choosing both languages extends the answer window when
needed to fit both recordings and five seconds for an answer.

On an active LIVE connection, the welcome message becomes due after 120 seconds
and repeats every 120 seconds of scheduled playback. It waits until the question,
video and victory jingle finish; autoplay holds the next question until the two
welcome clips finish. Manual next/pause controls retain priority. The private
panel can disable greetings or test one in demo mode. It does not welcome on a
fake timer when TikTok is disconnected. New MEMBER events use the real avatar
when provided, a clear initial otherwise, and bilingual welcome copy; queued
portraits rise from the lower right and disappear. Transient queues are bounded
and are never persisted as participant history.

The Docker build generates and caches speech in a separate layer so unrelated
UI edits do not regenerate all voices. Repeated identical speech text is also
synthesized once per language within a build.


### Compact entry bubbles and panel navigation

The private control panel groups its existing tools into eight horizontal tabs:
questions, LIVE connection, placement/display, gifts, guests, audio, reports and
sales demo. Sections stay mounted so changing tabs does not lose input drafts or
interrupt LIVE updates; the selected tab is remembered only in that browser
session. Arrow keys, Home and End navigate the tablist.

New arrivals are small round glass portraits on the outside right edge, rather
than large name cards. The placement tab controls their side, three small sizes,
vertical start and visibility. The name and welcome remain in the accessible
portrait title; the periodic bilingual voice/banner are unchanged. The combined
liker/gifter rail retains left/right positioning and now offers a wider vertical
range, from 80 through 1200 design units. These preferences are persisted with
presentation settings, never with participant identities.

### Persian LIVE teaching assistant

The private panel's new **دستیار درس** tab controls a native Persian speaking
assistant: read selected Persian comments, answer lesson questions, explain the
current answer, read an owner's custom text, and thank supporters. Replies use
the current bank's exact answer keys, reviewed chapter notes and a driving-term
glossary. They are educational retrieval/rules, not an unrestricted general
language model. A question outside those supported topics asks for clarification.
The chapter note is labelled as a general note; it is not a fabricated translation
of a publisher's question-specific explanation. Correct option numbers are only
spoken after the current answer has been revealed.

Comments are spoken/replied to in the LIVE audio source, with an optional compact
caption. This integration has read-only TikTok events: the voice and overlay are
the response channel. Owner text is explicitly labelled for LIVE broadcast.
Numeric answer comments remain on the quiz scoring path and are not read out.
Reading/replying, automatic explanation, like thanks and gift thanks can each be
disabled. Comment and thanks intervals plus the minimum like threshold are owner
settings. Simultaneous support is grouped; a pending gift streak is never thanked
as a finalized gift, and duplicate or rejected events cannot create thanks.
Non-Persian display names are spoken as «دوست گرامی» while the existing profile
widgets retain the actual name.

`fa-speech-worker.py` keeps the already-pinned native Amir Piper model resident on
CPU and accepts bounded NDJSON over stdin. No shell command interpolation,
external TTS, API credit, GPU or paid fallback is involved. All dynamic audio is
fully buffered, then announced in the shared Browser Source audio context. A
bounded queue schedules speech in question breaks after narration, victory music
and periodic welcomes; autoplay holds the next question until that speech window
ends. Explicit owner controls retain priority. Changing question/mode,
disconnecting, disabling the assistant or pressing stop retires the old speech.
Owner text and unrevealed question hints explicitly pause the question first.

Only authenticated owner POSTs can submit custom text or change assistant
settings. The public audio route is read-only and uses opaque speech IDs; it
cannot start synthesis. Queues, recent texts, supporter batching and generated
WAVs are bounded, process-local and never written to the session Dataset. Only
assistant preferences persist. Comments never grant access to files, command
execution, spending or account actions. Missing local voices report a bounded
error in the panel rather than switching to a paid service.

Twelve common original source IDs also have concise question-specific Persian
reasoning translated from the pinned archive's publisher explanations (including
roundabout exit priority, bicycle protection strips, oil, glare and passing a
road obstruction). Other questions retain the exact correct-option explanation
and a clearly labelled chapter note. Viewer-requested hints never select these
answer-specific explanations before reveal.

### Calm Persian delivery and panel refresh

Persian recordings and resident speech share the same careful profile: length
scale 1.25, volume 0.78 and steadier synthesis variation. German question speed
is unchanged. Speech text preserves half-spaces instead of splitting Persian
suffixes, canonicalizes explicit ه‌ی ezafe spelling, and uses targeted readings
for the requested LIVE/share wording. Explicit شییر/share is distinguished from
the ordinary Persian شیر; ordinary words and displayed bank text are retained.
Versioned narration metadata rejects stale clips from the previous voice profile.

Social messages default to Persian. Selecting Persian question narration forces
the welcome to Persian too, even if a bilingual welcome preference was saved;
lesson explanations and supporter thanks already use Persian. The separate
welcome-language control remains available outside Persian-only narration mode.

Entry portraits now default to size 96, with 112 available in the placement tab;
old small defaults migrate once while later explicit size selections are kept.
They remain circular, on the outside edge, and disappear after their ascent.

The panel's global refresh buttons reload either the display sources via an
owner-authenticated revision broadcast, or the panel itself. Refreshing the
display does not reset the current question, session progress, answers or scores.
Owner Browser-source access is retained in session storage across a reload.

### Thirty-question lesson programme and technical teaching

The owner panel groups upcoming lessons and studied lessons separately. Each new queued lesson has exactly 30 unread source questions, prioritising the technical questions. A short remainder is shown explicitly; it is never filled with repeated questions. Progress and both folders use the existing private Dataset. Starting a queued lesson disables automatic repetition. Archived lessons can be reviewed deliberately. Existing question completion history is retained; old sessions whose individual plans were never recorded cannot be reconstructed.

The bank contains 346 archived source-ID questions: 300 with verified original images and 46 genuinely text-only questions. Fifty technical questions have specific Persian educational explanations. Six original SVG teaching sketches illustrate relevant explanations after reveal; they are labelled as teaching sketches and never substituted for missing examination images. The complete technical booklet is owner-only in the panel. This is an archived bank, not a claim of a complete or current official examination catalogue.

Question WAVs and live assistant WAVs share Afghan vocabulary/pronunciation rules. Reviewed adjacent Persian/German aliases are spoken once; Latin German terms use the native German voice inside the same buffered WAV. The base Persian voice is still the pinned Persian Amir model, not a verified Dari voice or the owner's cloned voice. Cloning requires a separately supplied owner voice recording; the repository has `ai-cast/omnivoice-say.py`, but no clone is activated or paid provider used here.

The studio portrait is a static image requested by the owner, shown below the answers with a private size/visibility setting. It automatically hides if there is insufficient room rather than covering answer choices. Lip-sync, blinking and facial animation are not claimed by this static display. No unrelated speaking loop is played. External face/audio upload for animation remains subject to the owner's specific permission; no upload is triggered by the app or deployment.
