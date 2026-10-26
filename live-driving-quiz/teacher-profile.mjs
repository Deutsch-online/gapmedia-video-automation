import {createHash} from 'node:crypto';
export const TEACHER_STYLE={pace:1.25,volume:0.78,greeting:'سلام، خوش آمدید. خوشحالیم که همراه ما هستید.',confusion:'نگران نباشید؛ با هم آرام بررسی می‌کنیم.',success:'آفرین، {names}! خوب دقت کردید.',thanks:'تشکر، دوستان گرامی، از همراهی شما.'};
export const normalWord=s=>String(s||'').normalize('NFC').replace(/[يك]/g,c=>c==='ي'?'ی':'ک').replace(/\s+/g,' ').trim();
export function validWord(word){return typeof word==='string'&&word.length>=1&&word.length<=60&&/^[\p{L}\p{M}\u200c -]+$/u.test(word)&&word.split(' ').length<=3;}
export function wordPattern(word){return new RegExp('(?<![\\p{L}\\p{N}_\\u200c])'+word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}\\p{N}_\\u200c])','giu');}
export function validateWordAudio(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<44||bytes.length>240000||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('نمونهٔ کلمه باید WAV کوتاه باشد.');
 let fmt,data;
 for(let offset=12;offset+8<=bytes.length;){const id=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4),end=offset+8+size;if(end>bytes.length)throw Error('فایل صوتی ناقص است.');if(id==='fmt ')fmt=bytes.subarray(offset+8,end);if(id==='data')data=bytes.subarray(offset+8,end);offset=end+(size%2);}
 if(!fmt||fmt.length<16||fmt.readUInt16LE(0)!==1||fmt.readUInt16LE(2)!==1||fmt.readUInt32LE(4)!==22050||fmt.readUInt16LE(14)!==16||!data||data.length%2)throw Error('قالب نمونهٔ کلمه معتبر نیست.');
 const durationMs=Math.round(data.length/44100*1000);if(durationMs<150||durationMs>5000)throw Error('نمونهٔ تلفظ باید بین 0.15 و 5 ثانیه باشد.');
 let peak=0;for(let i=0;i<data.length;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i)));if(peak<120)throw Error('صدای نمونه شنیده نمی‌شود.');
 return {durationMs,sha256:createHash('sha256').update(bytes).digest('hex')};
}
export class TeacherProfile{
 constructor(saved={}){this.revision=Number.isInteger(saved.revision)?saved.revision:0;this.rules=(Array.isArray(saved.rules)?saved.rules:[]).filter(r=>validWord(r.word)&&(typeof r.spoken==='string'||/^[a-f0-9]{64}$/.test(r.sha256||''))).slice(0,50);this.style={...TEACHER_STYLE};for(const k of Object.keys(TEACHER_STYLE))if(typeof saved.style?.[k]===typeof TEACHER_STYLE[k])this.style[k]=saved.style[k];try{this.validateStyle(this.style);}catch{this.style={...TEACHER_STYLE};}this.pendingUntil=0;}
 validateStyle(style){if(!Number.isFinite(style.pace)||style.pace<1.05||style.pace>1.6||!Number.isFinite(style.volume)||style.volume<0.5||style.volume>0.95)throw Error('سرعت یا بلندی صدا معتبر نیست.');for(const k of ['greeting','confusion','success','thanks'])if(typeof style[k]!=='string'||style[k].length>220||!style[k].trim()||/https?:|[<>]/i.test(style[k]))throw Error('متن سبک برخورد معتبر نیست.');if(!style.success.includes('{names}'))throw Error('متن تشویق باید {names} داشته باشد.');}
 setStyle(value){const next={...this.style,...value};this.validateStyle(next);this.style=next;this.revision++;}
 arm(now=Date.now()){this.pendingUntil=now+30000;}
 disarm(){this.pendingUntil=0;}
 pending(now=Date.now()){return now<this.pendingUntil;}
 upsert(rule){const word=normalWord(rule.word);if(!validWord(word))throw Error('کلمهٔ مورد نظر معتبر نیست.');const i=this.rules.findIndex(r=>r.word===word);if(i<0&&this.rules.length>=50)throw Error('حداکثر 50 اصلاح تلفظ قابل ذخیره است.');const next={...rule,word};if(i<0)this.rules.push(next);else this.rules[i]=next;this.revision++;this.disarm();}
 setText(word,spoken){spoken=normalWord(spoken);if(!validWord(spoken))throw Error('تلفظ اصلاح‌شده معتبر نیست.');if(normalWord(word)===spoken)throw Error('برای اصلاح تلفظِ یکسان در نوشتار، نمونهٔ صوتی کلمه را ثبت کنید.');this.upsert({word,spoken,updatedAt:Date.now()});}
 remove(word){this.rules=this.rules.filter(r=>r.word!==word);this.revision++;}
 matches(text){const normalized=normalWord(text);return this.rules.filter(r=>wordPattern(r.word).test(normalized));}
 custom(text){return this.matches(text).length>0||this.style.pace!==TEACHER_STYLE.pace||this.style.volume!==TEACHER_STYLE.volume;}
 export(){return {version:1,revision:this.revision,style:this.style,rules:this.rules};}
 privateState(){return {...this.export(),pendingCorrection:this.pending(),training:'explicit_examples_and_feedback',voiceCloneActive:false};}
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
