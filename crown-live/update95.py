from pathlib import Path
import sys
root=Path(sys.argv[1])
p=root/'public/math-duel.mjs';s=p.read_text().replace('MATH_VERSION=94','MATH_VERSION=95').replace('s.version!==94','s.version!==95').replace('s.version=94','s.version=95').replace('version:94','version:95')
a=s.index(" if(s.phase!=='playing')return arrivalChanged;const text=rawText.replace")
b=s.index('\n const key=d.eventId',a)
s=s[:a]+" if(s.phase!=='playing'||(s.answered||[]).includes(id)||resolvedAnswer===null)return arrivalChanged;const answer=resolvedAnswer;"+s[b:]
s=s.replace("const rawText=d.comment.trim(),explicit=", "const rawText=d.comment.trim(),resolvedAnswer=s.phase==='playing'&&!(s.answered||[]).includes(id)?resolveAnswer(s,rawText):null,explicit=")
s=s.replace(" if(country){Object.assign(person,country);", " if(country&&resolvedAnswer===null){Object.assign(person,country);")
helper=r'''
function normalizedAnswer(value){return String(value).normalize('NFKC').replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');}
function resolveAnswer(s,value){if(/^(?:country|from|کشور|از)[:\s]/i.test(value))return null;const explicitOption=normalizedAnswer(value).match(/^(?:option|choice|گزینه)\s*([1-4])$/i);if(explicitOption)return Number(explicitOption[1]);const explicitValue=/^(?:(?:the )?answer(?: is)?|جواب|پاسخ)(?:\s*[:=]\s*|\s+)/i.test(value),text=normalizedAnswer(value.replace(/^(?:(?:the )?answer(?: is)?|جواب|پاسخ)(?:\s*[:=]\s*|\s+)/i,'')),options=s.current?.enOptions||[];if(!options.length)return /^\d{1,5}$/.test(text)?Number(text):null;const direct=options.findIndex((option,i)=>[option,s.current?.faOptions?.[i]].some(v=>v!==undefined&&normalizedAnswer(v)===text));const digit=/^[1-4]$/.test(text)?Number(text):null;if(digit&&!explicitValue){if(digit===s.answer)return digit;if(direct+1===s.answer)return direct+1;return digit;}if(direct>=0)return direct+1;const country=profileCountryFromComment(value);if(country){const index=options.findIndex((option,i)=>[option,s.current?.faOptions?.[i]].some(v=>v&&profileCountryFromComment(v)?.countryCode===country.countryCode));if(index>=0)return index+1;}return null;}
'''
pos=s.index('\nfunction resetLikeBaseline');s=s[:pos]+helper+s[pos:]
s=s.replace('Type the option number, one to four. ','Type the option number, one to four, or type the answer. ').replace('شمارهٔ گزینه را از یک تا چهار بنویس. ','شمارهٔ گزینه یا خود پاسخ را بنویس. ').replace('Reply with the option number. To add your flag,','Reply with the option number or the answer. To add your flag,')
p.write_text(s)
p=root/'public/math-duel-ui.mjs';s=p.read_text().replace('v=94','v=95').replace('math94','math95').replace('Reply 1, 2, 3 or 4 in chat.','Reply 1–4, or type the answer.').replace('گزینهٔ درست: کامنت ۱، ۲، ۳ یا ۴','شمارهٔ گزینه یا خود پاسخ را بنویس');p.write_text(s)
p=root/'public/math-duel.html';p.write_text(p.read_text().replace('v=94','v=95'))
p=root/'server.mjs';p.write_text(p.read_text().replace('mathVersion:94','mathVersion:95').replace('mathPanelVersion:94','mathPanelVersion:95').replace('math94','math95'))
print('DIRECT_ANSWER_95_READY')
