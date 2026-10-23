"""Explicit, bounded live-reception check. Never sends chat, gifts or payments."""
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE='https://afgtakrun-fahrfit-driving-live.hf.space'

def run():
    token=hmac.new(os.environ['TELEGRAM_BOT_TOKEN'].encode(),b'fahrfit-admin-v1:afgtakrun/fahrfit-driving-live',hashlib.sha256).hexdigest()
    def request(path,data=None):
        headers={'Authorization':'Bearer '+token}
        if data is not None:headers['Content-Type']='application/json'
        req=urllib.request.Request(BASE+path,data=None if data is None else json.dumps(data).encode(),headers=headers)
        with urllib.request.urlopen(req,timeout=65) as response:return json.load(response)
    state=request('/api/state')
    if state['connection']['status']!='connected':
        if state['connection']['status']=='connecting':
            for _ in range(10):
                time.sleep(5);state=request('/api/state')
                if state['connection']['status']!='connecting':break
        else:state=request('/api/admin/connect',{'username':state['username'],'startOnConnect':True})['state']
    if state['connection']['status']=='connected' and state['mode']!='live':
        request('/api/admin/pause',{})
        request('/api/admin/mode',{'mode':'live'})
        state=request('/api/admin/autoplay',{'enabled':True})['state']
    baseline=state.get('traffic',{}).copy()
    if state['connection']['status']=='connected':
        print('LIVE_CHECK: connected; listening for real comments and gifts only.',flush=True)
        original_input=state['answerInput']
        def set_input(source):
            request('/api/admin/pause',{})
            request('/api/admin/answer-input',{'input':source})
            return request('/api/admin/autoplay',{'enabled':True})['state']
        try:
            for source in ('comments','gifts'):
                state=set_input(source)
                print('LIVE_CHECK: observing real '+source+' for 45 seconds.',flush=True)
                for _ in range(9):
                    time.sleep(5);state=request('/api/state')
                    if state['connection']['status']!='connected':break
                if state['connection']['status']!='connected':break
        finally:
            if state['connection']['status']=='connected':state=set_input(original_input)
    traffic=state.get('traffic',{})
    report={'connection':state['connection'],'mode':state['mode'],'answerInput':state['answerInput'],
            'traffic':traffic,'baseline':baseline,'simulated_events':False,'paid_operations':False,
            'comment_verified':traffic.get('commentsAccepted',0)>baseline.get('commentsAccepted',0),
            'gift_verified':traffic.get('giftsAccepted',0)>baseline.get('giftsAccepted',0)}
    Path('/tmp/driving-live-reception.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print('LIVE_CHECK: '+json.dumps(report,ensure_ascii=False),flush=True)

if __name__=='__main__':
    try:run()
    except Exception:
        # Do not print request objects or exception URLs that may contain secrets.
        print('LIVE_CHECK: request failed; no real reception verification claimed.',flush=True)
        raise SystemExit(1)
