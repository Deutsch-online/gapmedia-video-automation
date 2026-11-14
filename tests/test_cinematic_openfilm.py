import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('cinematic_openfilm', Path(__file__).resolve().parents[1] / 'ai-cast/cinematic_openfilm.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class OpenFilmExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.master = Path(self.temp.name) / 'master.mp4'
        self.master.write_bytes(b'test-media-only')
        self.quality = {'width':1080,'height':1920,'duration':45,
                        **dict.fromkeys(('genuine_motion','German_audio','bilingual_subtitles','no_slow_motion','pause_music'), True)}
        self.save_quality()

    def save_quality(self):
        (self.master.parent / 'quality.json').write_text(json.dumps(self.quality))

    def test_nine_silent_picture_cuts_with_one_continuous_mix(self):
        film = module.export_project(self.master)
        html = film.read_text()
        self.assertEqual(html.count('<video '), 9)
        self.assertEqual(html.count(' muted '), 9)
        self.assertEqual(html.count('<audio '), 1)
        self.assertIn('#t=40,45', html)
        self.assertIn('at="40"', html)
        self.assertEqual((film.parent/'assets/master.mp4').read_bytes(), self.master.read_bytes())

    def test_resume_preserves_human_edits(self):
        film = module.export_project(self.master)
        film.write_text(film.read_text() + '<!-- manual edit -->')
        self.assertEqual(module.export_project(self.master), film)
        self.assertIn('manual edit', film.read_text())

    def test_corrupt_bundle_refused_and_new_source_gets_new_folder(self):
        film = module.export_project(self.master)
        (film.parent/'assets/master.mp4').write_bytes(b'corrupt')
        with self.assertRaisesRegex(ValueError, 'modified'):
            module.export_project(self.master)
        self.master.write_bytes(b'different-approved-master')
        self.assertNotEqual(module.export_project(self.master), film)

    def test_reject_preview_and_missing_quality_gates(self):
        for key, value in [('duration',15),('German_audio',False),('width',720)]:
            previous = self.quality[key]
            self.quality[key] = value
            self.save_quality()
            with self.assertRaises(ValueError):
                module.export_project(self.master)
            self.quality[key] = previous


if __name__ == '__main__':
    unittest.main()
