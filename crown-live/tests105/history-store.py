import importlib.util,urllib.error
s=importlib.util.spec_from_file_location('history','history-store.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
state={'revision':0,'reserved':[]};races=[True]
def read():return str(state['revision']),{'reserved':list(state['reserved']),'updatedAt':1}
def write(version,ledger):
 if races[0]:
  races[0]=False;state['reserved']=['easy:0'];state['revision']+=1;raise urllib.error.HTTPError('https://example.invalid',409,'conflict',{},None)
 assert version==str(state['revision']);state['revision']+=1;state['reserved']=ledger['reserved']
payload={'used':[],'keep':[],'candidates':{'easy':['easy:'+str(i)for i in range(10)]},'counts':{'easy':2}}
a=m.reserve(payload,read,write);b=m.reserve(payload,read,write);assert len(a['allowed'])==2;assert 'easy:0'not in a['allowed'];assert set(a['allowed']).isdisjoint(b['allowed']);assert 'easy:0'in b['blocked'];print('HISTORY_CAS_CONFLICT_RETRY_AND_RESTART_RESERVATION_OK')
