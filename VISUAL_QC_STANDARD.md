# Visual Truth Gate — GapMedia

> **Canonical policy:** [`PROJECT_RULES.md`](PROJECT_RULES.md), sections ۳، ۶، ۷
> and ۱۳. This document supplies implementation detail and cannot override it.

This gate is mandatory for every tutorial, app, update, and news video. It
exists to prevent generic AI illustrations, unrelated icons, and repeated card
layouts from reaching a render.

## 1. Evidence before design

Every slide must have one `visualEvidence` record before HTML is written:

```json
{
  "slide": 2,
  "claim": "Creator Search Insights shows topics people search for",
  "mainVisual": "public/official-ui/tiktok-search-single.png",
  "sourceUrl": "https://newsroom.tiktok.com/creator-search-insights?lang=en",
  "sourceType": "official-ui",
  "whatItProves": "The actual Creator Search Insights interface",
  "motionAction": "search field receives the query, then the result locks"
}
```

No evidence record means no render. A generic microphone, glowing AI orb,
cartoon mascot, random hand, generic chart, or platform-coloured decoration is
**not** evidence. The main visual must occupy at least 34% of the vertical
frame, have a usable source resolution (long edge at least 1080px and at least
700,000 pixels), and remain readable on a phone without zooming.

The record must also name the exact slide claim, one source type
(`official-ui`, `official-asset`, `owner-supplied`, or `labelled-explainer`),
and all three motion layers: `motionAction`, `secondaryMotion`, and
`ambientMotion`. Missing any one is a hard render failure. A phone outline,
device mockup, platform-coloured background, or logo does not make a guessed
screen real.

## 2. Source hierarchy

Use the highest available item in this order:

1. Official product UI, official help centre, official newsroom, or official
   press asset that shows the exact feature.
2. A supplied real screen-recording or screenshot from the channel owner.
3. A clearly labelled original diagram made only to explain a verified claim.

Never use a logo-only image, generic creators banner, unrelated real UI,
duplicate image, search-result thumbnail, or an invented mobile interface as
proof of a feature. If the exact screen cannot be verified, remove the
instructional step or hold the video for research; do not invent the visual.

## 3. Slide-to-meaning contract

Each slide has exactly one action, one main visual, and one visual verb.

| Copy says | Main visual must show | Forbidden substitute |
| --- | --- | --- |
| Search | real search surface and entered query | magnifying-glass decoration |
| Save | recognisable bookmark control | circle, star, heart, or folder |
| Upload | selected media / upload state | camera unrelated to the action |
| Analytics | actual retention/insights evidence or labelled explanatory chart | decorative rising line |
| Security restriction | access boundary / verified notice / labelled diagram | microphone, lock without context, AI orb |
| Income | verified eligibility, dashboard, or honest creator workflow | money rain, unsupported earnings figure |

The image must still explain the sentence if all on-screen text is hidden.

## 4. Hook rule

The hook gets a custom visual from the hook's promise, not the app name or a
recycled feature card. It must show a believable situation, tension, result,
or consequence without revealing the answer. The app/product name, logo and
exact UI appear only after the curiosity gap.

## 5. Platform distinction

TikTok and Instagram can never be the same storyboard with a recoloured
background. For the same researched subject they require different:

- audience promise;
- hook image;
- visual metaphor;
- scene order;
- transition family; and
- music rhythm.

## 6. Motion acceptance

Every slide documents one primary action, one secondary reaction, and one
subtle ambient layer. The primary action must be the action in the sentence:
search types, a bookmark saves, a graph drops, an access boundary closes.
Card-only entrances, opacity-only fades, random whip cuts, and continuous
floating without narrative meaning fail this gate.

## 7. Pre-send review

Before Telegram delivery, inspect early, middle and late frames and answer
every line with YES:

1. Does every slide have a real or explicitly labelled explanatory visual?
2. Does that visual prove the exact sentence on the slide?
3. Is any visual reused in another slide without a new meaning?
4. Is there only one readable app screen per slide?
5. Does the hook image match the hook rather than merely the category?
6. Are TikTok and Instagram visually different beyond colour?
7. Does movement demonstrate the action rather than decorate it?

Any NO blocks delivery. Record the failed slide and replace its evidence; never
hide the failure by recolouring or adding another icon.

## 8. Release score and automatic publishing

Score every proposed video before rendering: audience demand and practical
benefit 25, source accuracy 20, hook 15, real visual evidence 15, readable
motion 10, narration 10, and novelty 5. Minimum score is 90/100. A failed
source, visual-evidence, narration, or duplicate check is an automatic fail
regardless of score. A pass renders and sends automatically; a fail reports the
specific missing evidence or weak criterion instead of asking for approval.

## 9. Performance learning loop

Once per day, review each public TikTok/Instagram URL that can be read without
login: views, likes, comments, shares/saves only when publicly visible, hook
clarity, cover, and comments. Record observed facts, date and URL; never infer
income from views. Revenue, retention, saves, shares and reach require official
Insights/Analytics supplied by the owner or authorised API access. Use the
comparison only to choose the next hypothesis; do not copy a previous layout.

## 10. Permanent rejection patterns

These defects have already reached a review and are permanently rejected:

- a lock, toolbox, circle, microphone, camera, or graph standing in for a
  different action named in the copy;
- the same illustration or a recoloured version repeated across slides;
- two tiny app screens in one slide, or an unreadable guessed phone interface;
- a hook that shows the product name, logo, or UI before its curiosity promise;
- an empty frame filled with decorative lines instead of a relevant visual;
- an Instagram storyboard reused for TikTok with only colours changed; and
- motion that merely moves a card instead of showing the named action.

For every release, inspect frame zero, the action moment, and the final settled
frame of each slide. If the text is hidden, a reviewer must still identify the
action and the real subject. If not, reject the scene.
# تصویربرداری و ویدیو: سیاست اجرای خودکار

برای تصویر و ویدیوی واقعی تأیید دستیِ سازنده لازم نیست. رندر فقط زمانی مجاز است که گیت کیفیت همهٔ شرط‌های زیر را تأیید کند: تصویر یا ویدیو واقعاً همان اپ، محصول، قابلیت یا خبر را نشان دهد؛ منبع آن رسمی، معتبر یا ارسال‌شده توسط سازنده باشد؛ ضلع بلند دست‌کم ۱۰۸۰ پیکسل و مساحت دست‌کم ۷۰۰٬۰۰۰ پیکسل باشد؛ تصویر اصلی حداقل یک‌سوم قاب عمودی را بگیرد؛ و هر اسلاید مدرک بصریِ متفاوت و مرتبط با همان جمله داشته باشد. اگر یکی از این شرط‌ها برقرار نبود، سیستم نباید رابط حدسی یا تصویر عمومی بسازد؛ باید آن خروجی را رد کند و منبع واقعیِ جایگزین پیدا کند.


## قانون قاب تصویر: تصویر ناقص ممنوع است

**دستور صاحب کانال، ۲۰۲۶-۰۹-۱۳، با سه فریم ارسالی به‌عنوان مدرک.**

هیچ تصویری نباید بریده یا ناقص نمایش داده شود. اگر بخشی از تصویر بیرون قاب
بیفتد، آن اسلاید مردود است؛ حتی اگر تصویر کاملاً مرتبط و باکیفیت باشد.

سه فریم رد‌شده، برای اینکه مصداق روشن بماند:

- «دایرکت‌فا» که زیرنویسش از دو طرف بریده شده بود: «...ون هوشمند دایرکت و کامنت این...»
- کارتی که برچسبش («دایرکت») از لبهٔ راست قیچی شده بود
- قلاب که به «...خ آماده و کامنت» و «...که پیام‌ها رباتی شوند.» بریده شده بود

هر سه تصویر **درست و مرتبط** بودند؛ قاب آن‌ها را خراب کرد، نه انتخابشان.

### قاعدهٔ اجرایی

| نوع تصویر | رفتار قاب | چرا |
|---|---|---|
| تصویر زندهٔ جست‌وجوشده (اسکرین‌شات، کارت محصول، رابط کاربری) | **کامل نمایش داده می‌شود** (`contain`) | محتوایش عمدتاً **متن** است و بریدن، معنا را نابود می‌کند |
| تصویری که شکلش عمداً انتخاب شده (عکس واژگان درس آلمانی، تصویر تولیدشده) | به‌اندازهٔ قاب پر می‌شود (`cover`) | عکس صحنه است؛ بریدن حاشیه چیزی از معنا کم نمی‌کند |

مرز میان این دو، وجودِ `photoAspect` است؛ تنها مسیرهایی آن را می‌گذارند که
شکل را آگاهانه انتخاب کرده‌اند.

### آنچه ممنوع است

- اجبار یک تصویر افقی به قاب عمودی و سپس بریدن آن تا جا بیفتد. این دقیقاً
  همان کاری بود که `shapeOf()` می‌کرد و برای یک منبع ۱۶:۹ حدود ۵۸٪ عرض را از
  دو طرف دور می‌ریخت.
- هر zoom یا `transform: scale` روی تصویری که قرار است کامل دیده شود؛ بزرگ‌نمایی
  دوباره آن را می‌بُرد و قانون را بی‌اثر می‌کند.

نوار خالیِ کنار تصویرِ کامل، ایراد نیست؛ پس‌زمینهٔ خودِ قاب است و بخشی از
دستگاه دیده می‌شود. یک کلمهٔ بریده ایراد است.
