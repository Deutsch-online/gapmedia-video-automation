import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import wave

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('faceless',ROOT/'ai-cast/eleven-faceless-render.py')
render=importlib.util.module_from_spec(spec);spec.loader.exec_module(render)

class NarrationIntegrityTests(unittest.TestCase):
    def fixture(self,folder,seconds=2):
        plan=json.loads((ROOT/'ai-cast/eleven-faceless-60s.json').read_text())
        audio=Path(folder)/'00.mp3'
        # A WAV container is a synthetic timing fixture, never production speech.
        with wave.open(str(audio),'wb') as output:
            output.setparams((1,2,48000,0,'NONE','not compressed'))
            output.writeframes(b'\0\0'*round(seconds*48000))
        (Path(folder)/'00.json').write_text(json.dumps({'signature':render.speech_signature(plan,0),'audio_sha256':hashlib.sha256(audio.read_bytes()).hexdigest()}))
        return plan,audio

    def test_changed_script_cannot_reuse_previously_billed_voice_audio(self):
        with tempfile.TemporaryDirectory() as tmp:
            plan,audio=self.fixture(tmp)
            self.assertEqual(render.verified_narration(plan,tmp,0),(audio,2))
            plan['scenes'][0]['narration']='Andere Worte'
            with self.assertRaisesRegex(ValueError,'Unmatched'):
                render.verified_narration(plan,tmp,0)

    def test_corrupt_cache_cannot_be_presented_as_elevenlabs_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            plan,audio=self.fixture(tmp)
            audio.write_bytes(b'altered')
            with self.assertRaisesRegex(ValueError,'Unmatched'):
                render.verified_narration(plan,tmp,0)

    def test_long_audio_is_rejected_without_speeding_up_or_cutting_words(self):
        with tempfile.TemporaryDirectory() as tmp:
            plan,_=self.fixture(tmp,8)
            with self.assertRaisesRegex(ValueError,'no stretching'):
                render.verified_narration(plan,tmp,0)

if __name__=='__main__':unittest.main()
