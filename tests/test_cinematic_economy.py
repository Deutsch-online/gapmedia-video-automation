import copy
import importlib.util
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'ai-cast'))
from cinematic_economy import keyframe_anchors, report


class EconomyTests(unittest.TestCase):
    def setUp(self):
        self.plan=copy.deepcopy(json.loads((ROOT/'ai-cast/lina-oma-story-bank.json').read_text())['stories'][1])
        self.plan.update(episode=24,duration_seconds=45)
        self.config={'visual_profile':{'keyframe_economy':{
            'id':'two-speaker-keyframes-v1','from_episode':24,'maximum_generated_stills':2}}}

    def test_pending_episode_keeps_its_individual_signed_images(self):
        self.plan['episode']=23
        self.assertIsNone(keyframe_anchors(self.plan,self.config))
        self.assertEqual(report(self.plan,self.config)['planned_image_submissions'],9)

    def test_two_images_retain_nine_independent_takes_and_all_dialogue(self):
        before=copy.deepcopy(self.plan)
        anchors=keyframe_anchors(self.plan,self.config)
        self.assertEqual(len(set(anchors)),2)
        self.assertEqual(len(anchors),9)
        self.assertEqual(self.plan,before)
        for index,anchor in enumerate(anchors):
            self.assertLessEqual(anchor,index)
            self.assertEqual(self.plan['scenes'][index]['speaker'],self.plan['scenes'][anchor]['speaker'])
        info=report(self.plan,self.config)
        self.assertEqual(info['planned_image_submissions'],2)
        self.assertEqual(info['planned_independent_video_takes'],9)
        self.assertEqual(info['output_seconds'],45)
        self.assertFalse(info['full_episode_quota_guaranteed'])

    def test_new_prop_or_room_is_rejected_instead_of_silently_spending_more(self):
        for field,value in [('visible_objects',['new unseen object']),('location_key','another room')]:
            plan=copy.deepcopy(self.plan);plan['scenes'][4][field]=value
            with self.assertRaises(ValueError):keyframe_anchors(plan,self.config)


if __name__=='__main__':unittest.main()
