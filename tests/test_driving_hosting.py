import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace

spec=importlib.util.spec_from_file_location('driving_hosting',Path(__file__).parents[1]/'scripts/deploy-driving-live.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


class FreeCPUHostingTests(unittest.TestCase):
    def test_only_verified_cpu_basic_is_accepted(self):
        for current,requested in [('cpu-basic','cpu-basic'),(None,'cpu-basic'),('cpu-basic',None)]:
            runtime=SimpleNamespace(hardware=current,requested_hardware=requested)
            api=SimpleNamespace(get_space_runtime=lambda repo:runtime)
            self.assertIs(module.free_runtime(api,'owner/test'),runtime)

    def test_gpu_upgrades_and_unknown_hardware_are_rejected(self):
        for current,requested in [('cpu-upgrade','cpu-upgrade'),('cpu-basic','t4-small'),(None,None),('zero-a10g','zero-a10g')]:
            runtime=SimpleNamespace(hardware=current,requested_hardware=requested)
            api=SimpleNamespace(get_space_runtime=lambda repo:runtime)
            with self.assertRaisesRegex(RuntimeError,'non-free'):
                module.free_runtime(api,'owner/test')


if __name__=='__main__':unittest.main()

class DeploymentReadinessTests(unittest.TestCase):
    def test_requires_running_exact_space_commit_even_when_build_env_is_new(self):
        import importlib.util
        from pathlib import Path
        from types import SimpleNamespace
        spec=importlib.util.spec_from_file_location('driving_ready',Path(__file__).resolve().parents[1]/'scripts/deploy-driving-live.py')
        mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
        health={'ok':True,'version':'fahrfit-online-v1','build':'new-build'}
        old=SimpleNamespace(stage='RUNNING',raw={'sha':'old-commit'})
        building=SimpleNamespace(stage='BUILDING',raw={'sha':'new-commit'})
        ready=SimpleNamespace(stage='RUNNING',raw={'sha':'new-commit'})
        self.assertFalse(mod.deployment_ready(old,health,'new-build','new-commit'))
        self.assertFalse(mod.deployment_ready(building,health,'new-build','new-commit'))
        self.assertTrue(mod.deployment_ready(ready,health,'new-build','new-commit'))
