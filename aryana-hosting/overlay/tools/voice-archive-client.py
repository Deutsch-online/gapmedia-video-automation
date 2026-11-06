"""Save private media through the official Hub client, including Git LFS."""
import json,os,sys,re
from pathlib import Path

def upload(data):
 from huggingface_hub import HfApi,CommitOperationAdd
 repo=data['repo']
 if repo!='afgtakrun/aryana-live-private-state':raise ValueError('Unexpected voice repository')
 token=os.environ.get('ARYANA_STATE_TOKEN')
 if not token:raise ValueError('Private storage unavailable')
 api=HfApi(token=token)
 if not api.repo_info(repo,repo_type='dataset').private:raise ValueError('Private voice storage required')
 files=data['files']
 if not isinstance(files,list) or not 1<=len(files)<=3:raise ValueError('Invalid batch')
 operations=[]
 for item in files:
  name=item['path'];source=Path(item['source'])
  if not re.fullmatch(r'voice-audio/[a-f0-9]{64}\.mp3|voice-video/[a-f0-9]{64}/[a-f0-9]{64}\.mp4|voice-bank/[a-f0-9]{64}/index\.json',name):raise ValueError('Invalid voice path')
  if not source.is_file() or source.is_symlink() or source.stat().st_size>20_000_000:raise ValueError('Invalid media file')
  operations.append(CommitOperationAdd(path_in_repo=name,path_or_fileobj=str(source)))
 api.create_commit(repo_id=repo,repo_type='dataset',operations=operations,commit_message='Save private Aryana voice and matching mouth video')
 return {'ok':True,'files':len(operations)}

if __name__=='__main__':
 try:
  result=upload(json.loads(sys.stdin.read(16000)));print('ARYANA_VOICE_ARCHIVE '+json.dumps(result),flush=True)
 except Exception as error:
  print('ARYANA_VOICE_ARCHIVE '+json.dumps({'ok':False,'error_type':type(error).__name__}),flush=True);sys.exit(1)
