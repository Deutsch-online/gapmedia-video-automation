"""Deliver the owner-requested music draft to the existing private Telegram chat."""
import os,json,urllib.request,secrets
from pathlib import Path

def main():
 token=os.environ['TELEGRAM_BOT_TOKEN'];chat=os.environ.get('TELEGRAM_REVIEW_CHAT_ID') or os.environ['TELEGRAM_CHAT_ID']
 base='https://api.telegram.org/bot'+token+'/'
 def api(method,data):
  req=urllib.request.Request(base+method,data=json.dumps(data).encode(),headers={'Content-Type':'application/json'})
  with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
 info=api('getChat',{'chat_id':chat})
 if not info.get('ok') or info.get('result',{}).get('type')!='private':raise RuntimeError('Private owner chat required')
 path=Path(os.environ.get('MUSIC_PREVIEW_FILE','live-race/dist/audio/race-music-preview.mp3'));meta=json.loads(path.with_suffix('.json').read_text()) if path.with_suffix('.json').exists() else {};boundary='RaceDraft'+secrets.token_hex(16)
 caption='پیش‌نمایش موسیقی تازهٔ مسابقه · Neon Team · 129 BPM\nملودی و سازها تازه ساخته شده‌اند؛ از صدای نمونه کپی نشده است.\nلطفاً گوش بدهید و نظر بدهید. هنوز جایگزین موسیقی فعلی بازی نشده است.'
 caption=meta.get('caption',caption)
 fields={'chat_id':str(chat),'title':meta.get('title','Neon Team — Racing Preview'),'performer':'Nations Race · Original synth instrumental','caption':caption,'duration':str(meta.get('duration',61))}
 body=bytearray()
 for name,value in fields.items():body.extend(('--'+boundary+'\r\nContent-Disposition: form-data; name="'+name+'"\r\n\r\n'+value+'\r\n').encode())
 body.extend(('--'+boundary+'\r\nContent-Disposition: form-data; name="audio"; filename="Neon-Team-129-preview.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n').encode());body.extend(path.read_bytes());body.extend(('\r\n--'+boundary+'--\r\n').encode())
 req=urllib.request.Request(base+'sendAudio',data=bytes(body),headers={'Content-Type':'multipart/form-data; boundary='+boundary})
 with urllib.request.urlopen(req,timeout=90) as r:sent=json.load(r)
 if not sent.get('ok'):raise RuntimeError('Telegram delivery failed')
 print('RACE_MUSIC_PREVIEW_READY: '+json.dumps({'delivered':True,'telegram_message_id':sent['result']['message_id'],'title':fields['title'],'current_game_music_changed':False}))
if __name__=='__main__':
 try:main()
 except Exception as exc:
  print('Music preview delivery failed: '+type(exc).__name__);raise SystemExit(1)
