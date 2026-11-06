export const SPEECH_RULE='Never ask or encourage viewers to send gifts, donate, give likes, or tap or double-tap the screen for engagement. Do not set gift or like targets, offer rewards for engagement, or repeat a solicitation as a quotation. You may thank viewers for support already received and invite voluntary questions or comments.';
const normalize=text=>String(text||'').normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f\u0670]/g,'').replaceAll('ي','ی').replaceAll('ك','ک').replace(/[\u200c\u200d]/g,' ').replaceAll('’',"'").replace(/\s+/g,' ');
const english=[
 /\b(?:send|give|drop|buy|donate|leave|offer|bring)\b.{0,45}\b(?:gifts?|roses?|coins?|diamonds?|likes?|hearts?|donations?)\b/gu,
 /\b(?:ask|asking|request|beg|begging)\s+(?:you\s+)?for\s+(?:more\s+|some\s+|a\s+)?(?:gifts?|likes?|donations?)\b/gu,
 /\b(?:like\s+(?:this|the|my|our)\s+(?:live|stream|video)|tap\s+(?:on\s+)?(?:the|your)\s+screen|double[ -]?tap(?:\s+the\s+screen)?|tap[ -]tap)\b/gu,
 /\b(?:need|want|reach|hit|get|raise|boost|increase)\b.{0,35}\b(?:likes?|gifts?|donations?)\b/gu,
 /\b(?:likes?|gifts?|donations?)\b.{0,35}\b(?:welcome|support|help|happy|reward|prize|unlock)\b/gu,
 /\b(?:support|help)\s+(?:me|us|this|the|my|our)\b.{0,40}\b(?:likes?|gifts?|donations?)\b/gu
];
const persian=[
 /(?:گیفت|هدیه|لایک|قلب|گل|کوین|سکه|دونیت|کمک مالی).{0,35}(?:بفرست|ارسال کن|بده|کنید|کنین|کنید|بزن|بالا ببر|زیاد کن|برسان|برسیم|حمایت کن|می خواه)/gu,
 /(?:بفرست|ارسال کن|بده|بزن|درخواست|تقاضا|نیاز دار|می خواه|تشویق).{0,35}(?:گیفت|هدیه|لایک|کوین|دونیت|کمک مالی)/gu,
 /(?:گیفت|هدیه|لایک).{0,30}(?:خوشحال|حمایت|کمک می|جایزه|پاداش)/gu,
 /(?:تپ[ -]*تپ|تپ کن|دوبار.{0,12}صفحه.{0,12}بزن|صفحه.{0,15}(?:تپ|بزن|لمس کن))/gu
];
const negated=prefix=>/(?:do not|don't|never|no need to|do not have to|don't have to|should not|must not)\s+(?:ever\s+)?$/u.test(prefix)||/(?:نباید|هرگز|نه برای|بدون)\s*$/u.test(prefix);
export function hasEngagementRequest(text){const value=normalize(text);for(const pattern of [...english,...persian]){pattern.lastIndex=0;for(const match of value.matchAll(pattern)){const prefix=value.slice(Math.max(0,match.index-65),match.index);if(pattern===english[4]&&/(?:thank you|thanks|grateful|appreciate)[^.!?;]{0,55}$/u.test(prefix))continue;if(pattern===persian[2]&&/(?:تشکر|ممنون|سپاس)/u.test((prefix+match[0]).split(/[.!?؟؛]/u).at(-1)))continue;if(!negated(prefix))return true;}}return false;}
export function assertSpeechAllowed(text){if(hasEngagementRequest(text))throw Error('درخواست گیفت، لایک یا تپ‌تپ در گفتار مجاز نیست.');}
