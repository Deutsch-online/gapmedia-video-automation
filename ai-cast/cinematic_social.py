"""Bounded authenticated Worker requests using the same Node client as the bot watchdog."""
import json
import os
import subprocess

SCRIPT = """
const {createHash}=require('node:crypto');
const fs=require('node:fs');
(async()=>{
 const input=JSON.parse(fs.readFileSync(0,'utf8'));
 if(!['/internal/creative-feedback','/internal/render-audit'].includes(input.path))throw Error('path');
 const signature=createHash('sha256').update('gapmedia-monitor-v1:'+process.env.TELEGRAM_BOT_TOKEN).digest('hex');
 const response=await fetch('https://afghanfollowers-telegram.afghan-video-bot.workers.dev'+input.path,{
  method:input.payload===null?'GET':'POST',headers:{'X-Project-Authorization':signature,'Content-Type':'application/json'},
  body:input.payload===null?undefined:JSON.stringify(input.payload),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('HTTP '+response.status);
 const text=await response.text();if(text.length>100000)throw Error('size');
 process.stdout.write(JSON.stringify(JSON.parse(text)));
})().catch(()=>{process.exitCode=1;});
"""


def request(path,payload=None):
    if path not in ('/internal/creative-feedback','/internal/render-audit'):
        raise ValueError('Unsupported monitor route')
    if not os.getenv('TELEGRAM_BOT_TOKEN'):
        raise RuntimeError('Monitor credential unavailable')
    result=subprocess.run(['node','-e',SCRIPT],input=json.dumps({'path':path,'payload':payload}),
                          capture_output=True,text=True,timeout=12,check=True)
    if len(result.stdout)>100000:
        raise RuntimeError('Monitor response too large')
    return json.loads(result.stdout)
