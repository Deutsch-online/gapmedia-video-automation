import {createHash} from 'node:crypto';
export const TEACHER_STYLE={pace:1.25,volume:0.78,greeting:'سلام، خوش آمدید. خوشحالیم که همراه ما هستید.',confusion:'نگران نباشید؛ با هم آرام بررسی می‌کنیم.',success:'آفرین، {names}! خوب دقت کردید.',thanks:'تشکر، دوستان گرامی، از همراهی شما.'};
export const normalWord=s=>String(s||'').normalize('NFC').replace(/[يك]/g,c=>c==='ي'?'ی':'ک').replace(/\s+/g,' ').trim();
export const pronunciationKey=s=>normalWord(s).replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,'').toLocaleLowerCase('de');
export const MAX_PRONUNCIATIONS=200;
export function validWord(word){return typeof word==='string'&&word.length>=1&&word.length<=60&&/\p{L}/u.test(pronunciationKey(word))&&/^[\p{L}\p{M}\u200c -]+$/u.test(word)&&word.split(' ').length<=3;}
export function wordPattern(word){return new RegExp('(?<![\\p{L}\\p{N}_\\u200c])'+word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}\\p{N}_\\u200c])','giu');}
export function validateTeacherAudio(bytes,{maxBytes=240000,maxDurationMs=5000}={}){
 if(!Buffer.isBuffer(bytes)||bytes.length<44||bytes.length>maxBytes||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('نمونهٔ کلمه باید WAV کوتاه باشد.');
 let fmt,data;
 for(let offset=12;offset+8<=bytes.length;){const id=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4),end=offset+8+size;if(end>bytes.length)throw Error('فایل صوتی ناقص است.');if(id==='fmt ')fmt=bytes.subarray(offset+8,end);if(id==='data')data=bytes.subarray(offset+8,end);offset=end+(size%2);}
 if(!fmt||fmt.length<16||fmt.readUInt16LE(0)!==1||fmt.readUInt16LE(2)!==1||fmt.readUInt32LE(4)!==22050||fmt.readUInt16LE(14)!==16||!data||data.length%2)throw Error('قالب نمونهٔ کلمه معتبر نیست.');
 const durationMs=Math.round(data.length/44100*1000);if(durationMs<150||durationMs>maxDurationMs)throw Error('مدت ضبط باید بین 0.15 و '+maxDurationMs/1000+' ثانیه باشد.');
 let peak=0;for(let i=0;i<data.length;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i)));if(peak<120)throw Error('صدای نمونه شنیده نمی‌شود.');
 return {durationMs,sha256:createHash('sha256').update(bytes).digest('hex')};
}
export const validateWordAudio=bytes=>validateTeacherAudio(bytes);
export const validateSentenceAudio=bytes=>validateTeacherAudio(bytes,{maxBytes:2646044,maxDurationMs:60000});
export const textHash=text=>createHash('sha256').update(text).digest('hex');
export class TeacherProfile{
 constructor(saved={}){this.revision=Number.isInteger(saved.revision)?saved.revision:0;this.rules=(Array.isArray(saved.rules)?saved.rules:[]).filter(r=>validWord(r.word)&&(typeof r.spoken==='string'||/^[a-f0-9]{64}$/.test(r.sha256||''))).slice(0,MAX_PRONUNCIATIONS);this.pendingWords=[...new Set((Array.isArray(saved.pendingWords)?saved.pendingWords:[]).filter(validWord).map(normalWord))].slice(0,500);this.style={...TEACHER_STYLE};for(const k of Object.keys(TEACHER_STYLE))if(typeof saved.style?.[k]===typeof TEACHER_STYLE[k])this.style[k]=saved.style[k];try{this.validateStyle(this.style);}catch{this.style={...TEACHER_STYLE};}this.auditChecks=(Array.isArray(saved.auditChecks)?saved.auditChecks:[]).filter(v=>/^[a-f0-9]{64}$/.test(v)).slice(-400);this.suspected=(Array.isArray(saved.suspected)?saved.suspected:[]).filter(v=>validWord(v?.word)&&validWord(v?.heard)).slice(-500);this.pendingUntil=0;this.voiceReference=/^[a-f0-9]{64}$/.test(saved.voiceReference?.sha256||'')&&saved.voiceReference.durationMs>=5000&&saved.voiceReference.durationMs<=60000?{...saved.voiceReference,enabled:saved.voiceReference.enabled===true}:null;this.questionRecordings=Object.fromEntries(Object.entries(saved.questionRecordings||{}).filter(([id,v])=>/^[A-Za-z0-9.-]{1,80}$/.test(id)&&/^[a-f0-9]{64}$/.test(v?.sha256||'')&&/^[a-f0-9]{64}$/.test(v?.textSha256||'')&&Number.isInteger(v.durationMs)&&v.durationMs>=150&&v.durationMs<=60000).slice(0,400));this.questionEdits=Object.fromEntries(Object.entries(saved.questionEdits||{}).filter(([id,v])=>/^[A-Za-z0-9.-]{1,80}$/.test(id)&&typeof v?.fa==='string'&&v.fa.trim()&&v.fa.length<=600).slice(0,400));}
 validateStyle(style){if(!Number.isFinite(style.pace)||style.pace<1.05||style.pace>1.6||!Number.isFinite(style.volume)||style.volume<0.5||style.volume>0.95)throw Error('سرعت یا بلندی صدا معتبر نیست.');for(const k of ['greeting','confusion','success','thanks'])if(typeof style[k]!=='string'||style[k].length>220||!style[k].trim()||/https?:|[<>]/i.test(style[k]))throw Error('متن سبک برخورد معتبر نیست.');if(!style.success.includes('{names}'))throw Error('متن تشویق باید {names} داشته باشد.');}
 setStyle(value){const next={...this.style,...value};this.validateStyle(next);this.style=next;this.revision++;}
 arm(now=Date.now()){this.pendingUntil=now+30000;}
 disarm(){this.pendingUntil=0;}
 pending(now=Date.now()){return now<this.pendingUntil;}
 upsert(rule){const word=normalWord(rule.word);if(!validWord(word))throw Error('کلمهٔ مورد نظر معتبر نیست.');const i=this.rules.findIndex(r=>pronunciationKey(r.word)===pronunciationKey(word));if(i<0&&this.rules.length>=MAX_PRONUNCIATIONS)throw Error('حداکثر 200 اصلاح تلفظ قابل ذخیره است.');const next={...rule,word};if(i<0)this.rules.push(next);else this.rules[i]=next;this.suspected=this.suspected.filter(v=>pronunciationKey(v.word)!==pronunciationKey(word));this.pendingWords=this.pendingWords.filter(w=>pronunciationKey(w)!==pronunciationKey(word));this.revision++;this.disarm();}
 setText(word,spoken){spoken=normalWord(spoken);if(!validWord(spoken))throw Error('تلفظ اصلاح‌شده معتبر نیست.');if(normalWord(word)===spoken)throw Error('برای اصلاح تلفظِ یکسان در نوشتار، نمونهٔ صوتی کلمه را ثبت کنید.');this.upsert({word,spoken,updatedAt:Date.now()});}
 queueWord(word){word=normalWord(word);if(!validWord(word))throw Error('کلمه باید حداکثر 3 واژه باشد.');if(!this.pendingWords.some(w=>pronunciationKey(w)===pronunciationKey(word))){if(this.pendingWords.length>=500)throw Error('فهرست اصلاح پر است.');this.pendingWords.push(word);this.revision++;}}
 remove(word){this.rules=this.rules.filter(r=>pronunciationKey(r.word)!==pronunciationKey(word));this.revision++;}
 matches(text){const normalized=pronunciationKey(text);return this.rules.filter(r=>wordPattern(pronunciationKey(r.word)).test(normalized));}
 custom(text){return Boolean(this.voiceReference?.enabled)||this.matches(text).length>0||this.style.pace!==TEACHER_STYLE.pace||this.style.volume!==TEACHER_STYLE.volume;}
 questionText(question){return this.questionEdits[question.id]?.fa||question.fa;}
 questionRecording(question){const clip=this.questionRecordings[question.id];return clip?.textSha256===textHash(this.questionText(question))?clip:null;}
 customQuestion(question){return Boolean(this.questionRecording(question)||this.questionEdits[question.id])||this.custom(question.fa);}
 setQuestionRecording(question,info){this.questionRecordings[question.id]={...info,textSha256:textHash(this.questionText(question)),updatedAt:Date.now()};this.revision++;}
 setVoiceReference(info){if(info.durationMs<5000||info.durationMs>60000||!/^[a-f0-9]{64}$/.test(info.sha256))throw Error('نمونهٔ کاپی صدا باید 5 تا 60 ثانیه باشد.');this.voiceReference={...info,enabled:Boolean(this.voiceReference?.enabled),updatedAt:Date.now()};this.revision++;}
 enableVoiceReference(enabled){if(!this.voiceReference||typeof enabled!=='boolean')throw Error('اول یک نمونهٔ صدای خودتان ذخیره کنید.');this.voiceReference.enabled=enabled;this.revision++;}
 removeQuestionRecording(id){delete this.questionRecordings[id];this.revision++;}
 setQuestionText(id,text){if(!/^[A-Za-z0-9.-]{1,80}$/.test(id)||typeof text!=='string'||!text.trim()||text.length>600||/[<>]/.test(text))throw Error('متن اصلاح‌شدهٔ سوال باید بین 1 و 600 نویسه باشد.');this.questionEdits[id]={fa:text.trim().normalize('NFC'),updatedAt:Date.now()};this.revision++;}
 resetQuestionText(id){delete this.questionEdits[id];this.revision++;}
 export(){return {version:1,revision:this.revision,style:this.style,rules:this.rules,pendingWords:this.pendingWords,auditChecks:this.auditChecks,suspected:this.suspected,questionEdits:this.questionEdits,questionRecordings:this.questionRecordings,voiceReference:this.voiceReference};}
 privateState(){return {...this.export(),pendingCorrection:this.pending(),training:'explicit_examples_and_feedback',voiceCloneActive:Boolean(this.voiceReference?.enabled)};}
}
export function parseTeacherCommand(value,{pending=false}={}){
 const text=normalWord(value).replace(/[،؟?!؛.]/g,' ').replace(/\s+/g,' ').trim();
 if(/(?:این )?کلمه (?:را|رو) این\s*(?:طور|طوری|گونه) تلفظ کن/.test(text)||/آموزش تلفظ|ثبت تلفظ/.test(text))return {kind:'arm',silent:true};
 const correction=text.match(/^(.{1,60}?)\s+(?:را|رو)\s+(.{1,60}?)\s+(?:تلفظ کن|بخوان)$/u);if(correction&&validWord(correction[1])&&validWord(correction[2]))return {kind:'text-correction',word:correction[1],spoken:correction[2],silent:true};
 if(pending&&validWord(text)&&text.split(' ').length<=3)return {kind:'word',word:text,silent:true};
 const commands=[[/^(?:دستیار )?(?:سوال|سؤال) بعدی$/,'next'],[/^(?:دستیار )?(?:سوال|سؤال) قبلی$/,'previous'],[/^(?:دستیار )?(?:سوال|سؤال) را تکرار کن$/,'repeat'],[/^(?:دستیار )?تکرار جلسه$/,'repeat-session'],[/^(?:دستیار )?جلسه بعدی$/,'next-lesson'],[/^(?:دستیار )?(?:توقف|درس را متوقف کن)$/,'pause'],[/^(?:دستیار )?(?:جواب|پاسخ) را نشان بده$/,'reveal'],[/^دستیار (?:توضیح بده|تشریح کن)$/,'assistant-explain']];
 for(const [pattern,action] of commands)if(pattern.test(text))return {kind:'action',action};
 if(/^(?:دستیار )?فارسی (?:را )?(?:روشن|فعال) کن$/.test(text))return {kind:'setting',setting:'persian',enabled:true};
 if(/^(?:دستیار )?فارسی (?:را )?(?:خاموش|غیرفعال) کن$/.test(text))return {kind:'setting',setting:'persian',enabled:false};
 if(/^دستیار (?:روشن|فعال) شو$/.test(text))return {kind:'setting',setting:'assistant',enabled:true};
 if(/^دستیار (?:خاموش|غیرفعال) شو$/.test(text))return {kind:'setting',setting:'assistant',enabled:false};
 if(/^دستیار .*?(?:مشکل|خطا|تخنیکی|صدا).*?(?:بررسی|چک|چیست|چرا)/.test(text))return {kind:'diagnose'};
 return {kind:'unknown'};
}
