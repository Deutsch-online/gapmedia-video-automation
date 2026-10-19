import importlib.util
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import wave

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'ai-cast'))
import wan2gp_worker as worker
import cinematic_speech as speech


class WanGPTests(unittest.TestCase):
    def make_inputs(self, folder, frames=240000):
        image, audio = Path(folder)/'speaker.png', Path(folder)/'aligned.wav'
        image.write_bytes(b'test image')
        with wave.open(str(audio), 'wb') as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(48000)
            wav.writeframes(b'\0\0' * frames)
        return image, audio

    def test_same_final_mix_audio_is_passed_to_avatar_model(self):
        with tempfile.TemporaryDirectory() as tmp:
            image, audio = self.make_inputs(tmp)
            settings = worker.make_settings(image, audio, 'Show the plate', 42)
            self.assertEqual(settings['audio_guide'], str(audio.resolve()))
            self.assertEqual(settings['image_start'], str(image.resolve()))
            self.assertEqual(settings['audio_prompt_type'], 'A')
            self.assertEqual(settings['video_length'] / settings['force_fps'], 5)
            self.assertNotIn('audio_guide2', settings)

    def test_short_or_unaligned_audio_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            image, audio = self.make_inputs(tmp, 192000)
            with self.assertRaises(ValueError):
                worker.make_settings(image, audio, 'Speak', 1)

    def test_backend_cache_identity_changes(self):
        with patch.dict(os.environ, {'CINEMATIC_SPEECH_BACKEND': 'gradio'}):
            old = speech.model_identity()
        with patch.dict(os.environ, {'CINEMATIC_SPEECH_BACKEND': 'wan2gp'}):
            self.assertNotEqual(speech.model_identity(), old)
            self.assertIn(worker.REVISION, speech.model_identity())

    def test_local_backend_calls_isolated_python_without_remote_fallback(self):
        with patch.dict(os.environ, {'CINEMATIC_SPEECH_BACKEND': 'wan2gp',
                                    'WAN2GP_ROOT': '/tmp/WanGP', 'WAN2GP_PYTHON': '/tmp/WanGP/.venv/bin/python'}):
            with patch.object(speech.subprocess, 'run') as run:
                speech.generate('face.png', 'aligned.wav', 'out.mp4', 'Lift plate', 3)
            args = run.call_args.args[0]
            self.assertEqual(args[0], '/tmp/WanGP/.venv/bin/python')
            self.assertEqual(args[args.index('--audio')+1], str(Path('aligned.wav').resolve()))
            self.assertTrue(run.call_args.kwargs['check'])

    def test_unknown_backend_fails_closed(self):
        with patch.dict(os.environ, {'CINEMATIC_SPEECH_BACKEND': 'unsupported'}):
            with self.assertRaises(ValueError):
                speech.model_identity()


if __name__ == '__main__':
    unittest.main()
