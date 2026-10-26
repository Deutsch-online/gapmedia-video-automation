"""Private teacher examples are spliced into native CPU speech, never sent to external inference."""
import base64,io,re,wave,unicodedata
from piper.config import SynthesisConfig

def reading(module,text,voices,output,rules,style):
    module.PERSIAN_LENGTH_SCALE=float(style.get('pace',1.25));module.PERSIAN_VOLUME=float(style.get('volume',.78))
    if not 1.05<=module.PERSIAN_LENGTH_SCALE<=1.6 or not .5<=module.PERSIAN_VOLUME<=.95:raise ValueError('Invalid style')
    rules=rules or []
    if len(rules)>50:raise ValueError('Too many rules')
    by_word={r['word']:r for r in rules}
    for word in by_word:
        if not isinstance(word,str) or not 1<=len(word)<=60:raise ValueError('Invalid word')
    pattern=re.compile(r'(?<![\w\u200c])('+'|'.join(re.escape(w) for w in sorted(by_word,key=len,reverse=True))+r')(?![\w\u200c])') if by_word else None
    text=module.bilingual_text(unicodedata.normalize('NFC',text).translate(str.maketrans('يك','یک')))
    parts=[];position=0
    def native(value,raw=False):
        if not value.strip() or not re.search(r'\w',value):return
        buffer=io.BytesIO()
        if raw:
            language='de' if re.fullmatch(r'[A-Za-zÄÖÜäöüß +\-]+',value) else 'fa'
            normalized=module.speech_text(value,'de')
            with wave.open(buffer,'wb') as wav:voices[language].synthesize_wav(normalized,wav,syn_config=SynthesisConfig(length_scale=module.PERSIAN_LENGTH_SCALE,volume=module.PERSIAN_VOLUME,noise_scale=.55,noise_w_scale=.65,normalize_audio=True))
        else:module.synthesize_reading(value,'fa',voices,buffer)
        parts.append(buffer.getvalue())
    for match in pattern.finditer(text) if pattern else []:
        native(text[position:match.start()]);rule=by_word[match[0]]
        if rule.get('audio'):parts.append(base64.b64decode(rule['audio'],validate=True))
        else:native(rule['spoken'],raw=True)
        position=match.end()
    native(text[position:])
    frames=[]
    for part in parts:
        with wave.open(io.BytesIO(part)) as wav:
            if wav.getframerate()!=22050 or wav.getnchannels()!=1 or wav.getsampwidth()!=2:raise ValueError('Incompatible word sample')
            frames.append(wav.readframes(wav.getnframes()))
    if not frames:raise ValueError('No speech')
    with wave.open(output,'wb') as wav:
        wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(22050);wav.writeframes(b''.join(frames))
