from huggingface_hub import HfApi
from pathlib import Path
import os,json,subprocess,concurrent.futures
api=HfApi(token=os.environ['HF_TOKEN']);production='afgtakrun/crown52-question-history-private';testrepo='afgtakrun/crown52-history-self-test'
for repo in [production,testrepo]:
 api.create_repo(repo,repo_type='dataset',private=True,exist_ok=True)
 if not api.repo_info(repo,repo_type='dataset').private:raise SystemExit('Question history repository must be private')
 if 'history.json' not in api.list_repo_files(repo,repo_type='dataset'):
  api.upload_file(repo_id=repo,repo_type='dataset',path_in_repo='history.json',path_or_fileobj=json.dumps({'schema':1,'reserved':[],'updatedAt':0}).encode(),commit_message='Initialize private non-repeating question history')
tag=os.environ.get('CROWN_RUN_TAG','local');payload={'used':[],'keep':[],'candidates':{tier:['fixture:'+tag+':'+tier+':'+str(i)for i in range(32)]for tier in ['easy','medium','hard','general']},'counts':{tier:2 for tier in ['easy','medium','hard','general']}}
env={**os.environ,'CROWN_HISTORY_REPO':testrepo,'CROWN_HISTORY_TOKEN':os.environ['HF_TOKEN']}
def reserve():
 result=subprocess.run(['python3','history-store.py'],input=json.dumps(payload),text=True,capture_output=True,env=env,timeout=180)
 if result.returncode:raise RuntimeError('Private history compare-and-swap write failed')
 return json.loads(result.stdout)
a,b=reserve(),reserve();assert set(a['allowed']).isdisjoint(b['allowed'])
with concurrent.futures.ThreadPoolExecutor(2)as pool:c,d=list(pool.map(lambda _:reserve(),range(2)))
assert set(c['allowed']).isdisjoint(d['allowed']);assert set(c['allowed']).isdisjoint(a['allowed']+b['allowed']);assert set(d['allowed']).isdisjoint(a['allowed']+b['allowed'])
e=reserve();assert set(a['allowed']+b['allowed']+c['allowed']+d['allowed']).issubset(e['blocked'])
print('PRIVATE_HISTORY_ATOMIC_RESERVATION_AND_CONCURRENT_NO_REPEAT_CHECKS_OK',flush=True)
Path('/tmp/crown-history-repo').write_text(production)
