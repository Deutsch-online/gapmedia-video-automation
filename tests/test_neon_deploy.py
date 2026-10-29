import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace

spec=importlib.util.spec_from_file_location('neon_deploy',Path(__file__).resolve().parents[1]/'scripts'/'deploy-neon-live.py')
deploy=importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)

class ReadinessTests(unittest.TestCase):
    def test_running_previous_build_cannot_trigger_delivery(self):
        runtime=SimpleNamespace(stage='RUNNING',raw={'sha':'space-new'})
        good={'ok':True,'version':'neon-live-arena-v1','build':'github-new'}
        self.assertTrue(deploy.deployment_ready(runtime,good,'github-new','space-new'))
        self.assertFalse(deploy.deployment_ready(runtime,good,'github-new','space-old'))
        self.assertFalse(deploy.deployment_ready(runtime,{**good,'build':'github-old'},'github-new','space-new'))
        self.assertFalse(deploy.deployment_ready(runtime,{**good,'version':'nations-race-v1'},'github-new','space-new'))
        runtime.stage='BUILDING'
        self.assertFalse(deploy.deployment_ready(runtime,good,'github-new','space-new'))

    def test_nonfree_or_unknown_hardware_is_rejected(self):
        for hardware,requested in [('t4-small','t4-small'),('cpu-upgrade','cpu-basic'),(None,None)]:
            api=SimpleNamespace(get_space_runtime=lambda _:SimpleNamespace(hardware=hardware,requested_hardware=requested))
            with self.assertRaises(RuntimeError):deploy.free_runtime(api,'owner/neon-live-arena')
        api=SimpleNamespace(get_space_runtime=lambda _:SimpleNamespace(hardware='cpu-basic',requested_hardware='cpu-basic'))
        self.assertEqual(deploy.free_runtime(api,'owner/neon-live-arena').hardware,'cpu-basic')
