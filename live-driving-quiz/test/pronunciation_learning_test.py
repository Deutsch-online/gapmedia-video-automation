import base64,io,sys,types,unittest,wave
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from pronunciation_learning import candidates,features,distance,learn
from runtime_pronunciation import reading

def wav(value=2000,frequency=300):
    x=(value*np.sin(np.arange(22050)*2*np.pi*frequency/22050)).astype('<i2');out=io.BytesIO()
    with wave.open(out,'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(x.tobytes())
    return out.getvalue()

class PronunciationLearningTest(unittest.TestCase):
    def test_candidates_are_bounded_and_include_reviewed_vowels(self):
        values=candidates('موتر','موتَر');self.assertIn('موتُر',values);self.assertIn('موتَر',values);self.assertLessEqual(len(values),28)
        self.assertLessEqual(len(candidates('فاصله و کلاچ','فاصله و کلاچ')),28)
    def test_acoustic_comparison_preserves_reference_and_returns_only_text_metadata(self):
        reference=wav(frequency=300);saved=bytes(reference)
        module=types.SimpleNamespace(speech_text=lambda text,lang:'موتَر')
        result=learn(module,'موتر',reference,lambda spoken:wav(frequency=300 if spoken=='موتُر' else 600))
        self.assertEqual(result['spoken'],'موتُر');self.assertNotIn('audio',result);self.assertEqual(reference,saved)
        self.assertAlmostEqual(distance(features(reference),features(reference)),0)
    def test_lesson_synthesis_ignores_legacy_raw_teacher_audio(self):
        # No native Piper dependency is needed for this waveform leak regression.
        piper=types.ModuleType('piper');config=types.ModuleType('piper.config');config.SynthesisConfig=lambda **kw:kw
        sys.modules['piper']=piper;sys.modules['piper.config']=config
        native=wav(frequency=600);teacher=wav(frequency=300)
        def synth(text,lang,voices,out):out.write(native)
        module=types.SimpleNamespace(bilingual_text=lambda text:text,synthesize_reading=synth,speech_text=lambda text,lang:text)
        out=io.BytesIO();reading(module,'موتر',{},out,[{'word':'موتر','audio':base64.b64encode(teacher).decode()}],{})
        self.assertEqual(out.getvalue(),native);self.assertNotEqual(out.getvalue(),teacher)
        class Voice:
            def synthesize_wav(self,text,wav,syn_config):
                wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(22050)
                with wave.open(io.BytesIO(native)) as source:wav.writeframes(source.readframes(source.getnframes()))
        out=io.BytesIO();reading(module,'موتر',{'fa':Voice()},out,[{'word':'موتر','spoken':'موتَر','audio':base64.b64encode(teacher).decode()}],{})
        self.assertEqual(out.getvalue(),native);self.assertNotEqual(out.getvalue(),teacher)


if __name__=='__main__':unittest.main()

class StandardPersianTest(unittest.TestCase):
    def test_literal_words_keep_their_spelling_and_one_is_not_replaced(self):
        from standard_persian import speech_text
        text=speech_text('یک راننده با خودرو در جاده است. ترمز و کلاچ را بررسی کنید.')
        self.assertIn('یِک',text);self.assertIn('راننده',text);self.assertIn('خودرو',text);self.assertIn('ترمز',text)
        self.assertNotIn('دریور',text);self.assertNotIn('موتَر',text);self.assertNotIn('بک',text)
