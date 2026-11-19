"""Reserve question IDs in a private HF dataset, using compare-and-swap commits."""
import sys,os,json,base64,time,urllib.request,urllib.error,urllib.parse,random

def reserve(payload,read,write):
 for attempt in range(5):
  version,old=read();blocked=set(old.get('reserved',[]))|set(payload.get('used',[]));used=set(payload.get('used',[]));keep=set(payload.get('keep',[]))-used;allowed=set(keep);changed=not set(payload.get('used',[])).issubset(set(old.get('reserved',[])))
  for tier,ids in payload['candidates'].items():
   count=payload['counts'][tier];have=len(allowed.intersection(ids));fresh=[x for x in ids if x not in blocked];random.SystemRandom().shuffle(fresh)
   for value in fresh[:max(0,count-have)]:blocked.add(value);allowed.add(value);changed=True
  ledger={'schema':1,'reserved':sorted(blocked),'updatedAt':int(time.time()*1000)}
  try:
   if changed:write(version,ledger)
   else:ledger['updatedAt']=old.get('updatedAt',ledger['updatedAt'])
   return {'blocked':sorted(blocked-allowed),'allowed':sorted(allowed),'savedAt':ledger['updatedAt']}
  except urllib.error.HTTPError as e:
   if e.code not in (409,412)or attempt==4:raise
 raise RuntimeError('History reservation conflict')

def main():
 class SafeRedirect(urllib.request.HTTPRedirectHandler):
  def redirect_request(self,req,fp,code,msg,headers,newurl):
   redirected=super().redirect_request(req,fp,code,msg,headers,newurl)
   if redirected and urllib.parse.urlparse(newurl).netloc!=urllib.parse.urlparse(req.full_url).netloc:redirected.remove_header('Authorization')
   return redirected
 opener=urllib.request.build_opener(SafeRedirect)
 repo=os.environ['CROWN_HISTORY_REPO'];history_file=os.environ.get('CROWN_HISTORY_FILE','history.json');token=os.environ['CROWN_HISTORY_TOKEN'];base='https://huggingface.co';headers={'Authorization':'Bearer '+token,'User-Agent':'Crown52-Question-History/105','Cache-Control':'no-cache'}
 def request(path,data=None,content_type=None):
  h={**headers};
  if content_type:h['Content-Type']=content_type
  req=urllib.request.Request(base+path,data=data,headers=h)
  with opener.open(req,timeout=25)as r:return json.load(r)
 def read():
  info=request('/api/datasets/'+repo+'/revision/main');sha=info['sha'];value=request('/datasets/'+repo+'/resolve/'+sha+'/'+urllib.parse.quote(history_file,safe='/'));return sha,value
 def write(sha,ledger):
  content=base64.b64encode(json.dumps(ledger,separators=(',',':')).encode()).decode()
  body='\n'.join(json.dumps(x)for x in [{'key':'header','value':{'summary':'Reserve unique quiz questions before broadcast','parentCommit':sha}},{'key':'file','value':{'path':history_file,'encoding':'base64','content':content}}])+'\n'
  request('/api/datasets/'+repo+'/commit/main',body.encode(),'application/x-ndjson')
 payload=json.load(sys.stdin);print(json.dumps(reserve(payload,read,write),separators=(',',':')))
if __name__=='__main__':
 try:main()
 except Exception:
  print('Question history storage unavailable',file=sys.stderr);sys.exit(1)
