import copy,hashlib,importlib.util,json,sys,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'ai-cast'))
import cinematic_staging as staging
import cinematic_design as design
from cinematic_economy import keyframe_anchors
from cinematic_lina import voice_pitch


class StagingTests(unittest.TestCase):
    def setUp(self):
        self.plan=copy.deepcopy(next(p for p in json.loads((ROOT/'ai-cast/lina-oma-story-bank.json').read_text())['stories'] if p['story_id']=='lina-oma-fahrrad-park-human-v2'))
        self.plan.update(episode=29,duration_seconds=45)
        self.config=json.loads((ROOT/'.cinematic-series.json').read_text())

    def test_real_actions_three_distinct_compositions_and_coherent_park(self):
        staging.validate(self.plan,[{'location_description':'a sofa in the living-room'}])
        self.assertEqual(len(set(keyframe_anchors(self.plan,self.config))),3)
        self.assertEqual(len(self.plan['scenes']),9)
        self.assertGreaterEqual(sum('demonstrated_object' in s for s in self.plan['scenes']),5)

    def test_repeated_episode_setting_and_unseen_demo_objects_are_refused(self):
        with self.assertRaisesRegex(ValueError,'repeat'):staging.validate(self.plan,[{'setting_type':'park-path'}])
        broken=copy.deepcopy(self.plan);broken['scenes'][0]['demonstrated_object']='invisible toy'
        with self.assertRaisesRegex(ValueError,'visible prop'):staging.validate(broken)
        broken=copy.deepcopy(self.plan)
        for s in broken['scenes']:
            if s['speaker']=='lina':s['keyframe_group']='one-portrait';s['framing']='medium-wide-action'
        with self.assertRaisesRegex(ValueError,'three distinct'):staging.validate(broken)

    def test_human_identity_is_versioned_and_legacy_reference_is_preserved(self):
        self.assertEqual(staging.reference_spec(self.config,28)['image'],'public/ai-cast/lina-oma/reference.jpg')
        spec=staging.reference_spec(self.config,29)
        self.assertIn('lina-oma-human',spec['image'])
        self.assertEqual(hashlib.sha256((ROOT/spec['image']).read_bytes()).hexdigest(),spec['sha'])
        prompt=design.still_prompt(self.plan,self.plan['scenes'][0])
        self.assertIn('Photorealistic live-action',prompt)
        self.assertIn('real full-size objects',prompt)
        self.assertNotIn('Premium expressive theatrical 3D cartoon',prompt)

    def test_natural_child_pitch_changes_new_audio_without_invalidating_old_cache(self):
        spec=importlib.util.spec_from_file_location('soft_voice_series',ROOT/'ai-cast/cinematic-series.py')
        m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
        scene={'speaker':'lina','de':'Hallo Oma!'}
        self.assertEqual(voice_pitch('lina',28),'+20Hz');self.assertEqual(voice_pitch('lina',29),'+0Hz')
        self.assertEqual(m.narration_signature(scene),m.narration_signature(scene,episode=28))
        self.assertNotEqual(m.narration_signature(scene,episode=28),m.narration_signature(scene,episode=29))
        with patch.object(m,'command') as command,patch.object(m,'seconds',return_value=2),patch.object(Path,'exists',return_value=False),patch.object(Path,'unlink'),patch.object(Path,'write_text'):
            m.measured_narration(scene,Path('/tmp/voice-fixture.mp3'),episode=29)
        self.assertIn('--pitch=+0Hz',command.call_args.args[0])


if __name__=='__main__':unittest.main()
