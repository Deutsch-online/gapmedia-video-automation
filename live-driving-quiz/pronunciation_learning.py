"""Bounded acoustic rehearsal of vowel spellings, using the assistant's own voice.
This estimates a pronunciation candidate; it neither clones a voice nor trains model weights.
"""
import io,itertools,re,wave
import numpy as np

MARKS=re.compile(r'[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]')

def candidates(word,preferred):
    output=list(dict.fromkeys([preferred,word]));base=MARKS.sub('',preferred)
    positions=[i for i,c in enumerate(base[:-1]) if '\u0621'<=c<='\u06cc' and c not in 'اآویو' and base[i+1] not in 'اآویو ']
    # Short loanwords benefit most. Limit branching and total native synthesis.
    positions=positions[:2]
    for vowels in itertools.product(['','َ','ِ','ُ','ْ'],repeat=len(positions)):
        marks=dict(zip(positions,vowels));value=''.join(c+marks.get(i,'') for i,c in enumerate(base))
        if value not in output:output.append(value)
    return output[:28]

def features(data):
    with wave.open(io.BytesIO(data)) as wav:
        if wav.getframerate()!=22050 or wav.getnchannels()!=1 or wav.getsampwidth()!=2:raise ValueError('Invalid rehearsal PCM')
        x=np.frombuffer(wav.readframes(wav.getnframes()),dtype='<i2').astype(np.float64)/32768
    if len(x)<3307 or len(x)>132300:raise ValueError('Invalid rehearsal length')
    n=512;hop=220;x=np.pad(x,(0,max(0,n-len(x))))
    frames=np.lib.stride_tricks.sliding_window_view(x,n)[::hop];energy=(frames**2).mean(axis=1)
    frames=frames[energy>max(1e-6,float(energy.max())*.01)]
    if len(frames)<4:raise ValueError('No clear speech')
    power=np.abs(np.fft.rfft(frames*np.hanning(n),axis=1))**2
    mel=lambda hz:2595*np.log10(1+hz/700)
    hz=lambda m:700*(10**(m/2595)-1)
    edges=np.floor((n+1)*hz(np.linspace(mel(80),mel(9000),28))/22050).astype(int)
    bank=np.zeros((26,n//2+1))
    for j,(a,b,c) in enumerate(zip(edges[:-2],edges[1:-1],edges[2:])):
        for k in range(a,c):bank[j,k]=max(0,min((k-a)/max(1,b-a),(c-k)/max(1,c-b)))
    logs=np.log(np.maximum(power@bank.T,1e-10));dct=np.cos(np.pi/26*(np.arange(26)+.5)[None,:]*np.arange(1,14)[:,None])
    values=logs@dct.T
    # Cepstral mean/variance normalization reduces speaker and microphone bias.
    values=(values-values.mean(axis=0))/(values.std(axis=0)+.25)
    return values[::2]

def distance(a,b):
    local=((a[:,None,:]-b[None,:,:])**2).mean(axis=2);n,m=local.shape
    dp=np.full((n+1,m+1),np.inf);length=np.zeros((n+1,m+1),dtype=int);dp[0,0]=0
    for i in range(1,n+1):
        for j in range(1,m+1):
            prev=min([(i-1,j),(i,j-1),(i-1,j-1)],key=lambda p:dp[p]);dp[i,j]=local[i-1,j-1]+dp[prev];length[i,j]=length[prev]+1
    return float(dp[n,m]/max(1,length[n,m]))

def learn(module,word,reference,synthesize,fingerprint=None):
    target=features(reference);rank=[];seen=set()
    for spoken in candidates(word,module.speech_text(word,'fa')):
        identity=str(fingerprint(spoken)) if fingerprint else spoken
        if identity in seen:continue
        seen.add(identity)
        try:rank.append((distance(target,features(synthesize(spoken))),spoken))
        except ValueError:continue
    if not rank:raise ValueError('No pronunciation candidates')
    rank.sort();score,spoken=rank[0];gap=rank[1][0]-score if len(rank)>1 else 0
    return {'spoken':spoken,'distance':round(score,4),'margin':round(gap,4),'reviewNeeded':score>.65 or gap<.06,'method':'native_vowel_rehearsal_mfcc_dtw','candidates':len(rank)}
