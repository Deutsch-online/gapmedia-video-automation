"""Teacher audio is training input only; all lesson output is native assistant speech."""
import base64,io,re,wave,unicodedata

MARKS=re.compile(r'[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]')
def pronunciation_key(text):
    return MARKS.sub('',unicodedata.normalize('NFC',text).translate(str.maketrans('يك','یک'))).lower()

def correction_matches(text,rules):
    # Project normalized letters back to the original offsets, preserving vowels
    # and punctuation in every untouched part of the sentence.
    projected=[];offsets=[]
    for i,char in enumerate(text):
        for letter in pronunciation_key(char):projected.append(letter);offsets.append(i)
    by_word={pronunciation_key(r['word']):r for r in rules}
    if not by_word:return []
    pattern=re.compile(r'(?<![\w\u200c])('+'|'.join(re.escape(w) for w in sorted(by_word,key=len,reverse=True))+r')(?![\w\u200c])')
    found=[]
    for match in pattern.finditer(''.join(projected)):
        end=offsets[match.end()-1]+1
        while end<len(text) and MARKS.fullmatch(text[end]):end+=1
        found.append((offsets[match.start()],end,by_word[match[0]]))
    return found


def reading(module,text,voices,output,rules,style):
    from piper.config import SynthesisConfig
    module.PERSIAN_LENGTH_SCALE=float(style.get('pace',1.25));module.PERSIAN_VOLUME=float(style.get('volume',.78))
    if not 1.05<=module.PERSIAN_LENGTH_SCALE<=1.6 or not .5<=module.PERSIAN_VOLUME<=.95:raise ValueError('Invalid style')
    rules=[r for r in (rules or []) if isinstance(r.get('spoken'),str) and r['spoken']]
    if len(rules)>200:raise ValueError('Too many rules')
    by_word={r['word']:r for r in rules}
    for word in by_word:
        if not isinstance(word,str) or not 1<=len(word)<=60:raise ValueError('Invalid word')
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
    for start,end,rule in correction_matches(text,rules):
        native(text[position:start])
        native(rule['spoken'],raw=True)
        position=end
    native(text[position:])
    frames=[]
    for part in parts:
        with wave.open(io.BytesIO(part)) as wav:
            if wav.getframerate()!=22050 or wav.getnchannels()!=1 or wav.getsampwidth()!=2:raise ValueError('Incompatible word sample')
            frames.append(wav.readframes(wav.getnframes()))
    if not frames:raise ValueError('No speech')
    with wave.open(output,'wb') as wav:
        wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(22050);wav.writeframes(b''.join(frames))
