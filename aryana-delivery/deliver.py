"""Two-phase, owner-only Telegram delivery; package stays encrypted in GitHub."""
import base64
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import urllib.error
import urllib.request
import uuid
import zipfile

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ROOT=Path('aryana-delivery')
REQUEST=json.loads((ROOT/'request.json').read_text())
REQUEST_ID=REQUEST['request_id']
BOT=os.environ['TELEGRAM_BOT_TOKEN'].strip()
REPO=os.environ['GITHUB_REPOSITORY']
BRANCH=os.environ['GITHUB_REF_NAME']

def b64(data):return base64.b64encode(data).decode()
def un64(text):return base64.b64decode(text,validate=True)
def tg(method,payload):
    request=urllib.request.Request('https://api.telegram.org/bot'+BOT+'/'+method,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=40) as response:result=json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError('Telegram HTTP '+str(error.code)) from None
    except Exception as error:
        raise RuntimeError('Telegram transport '+type(error).__name__) from None
    if not result.get('ok'):raise RuntimeError('Telegram request rejected')
    return result['result']

def commit_json(name,payload):
    url='https://api.github.com/repos/'+REPO+'/contents/aryana-delivery/'+name
    headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':'application/json','User-Agent':'Aryana-private-delivery'}
    previous=None
    try:
        request=urllib.request.Request(url+'?ref='+BRANCH,headers=headers)
        with urllib.request.urlopen(request,timeout=25) as response:previous=json.load(response)['sha']
    except urllib.error.HTTPError as error:
        if error.code!=404:raise RuntimeError('Receipt read HTTP '+str(error.code)) from None
    body={'message':'Aryana private delivery: '+name,'branch':BRANCH,'content':b64((json.dumps(payload,ensure_ascii=False,indent=2)+'\n').encode())}
    if previous:body['sha']=previous
    request=urllib.request.Request(url,data=json.dumps(body).encode(),headers=headers,method='PUT')
    try:
        with urllib.request.urlopen(request,timeout=25) as response:json.load(response)
    except urllib.error.HTTPError as error:raise RuntimeError('Receipt save HTTP '+str(error.code)) from None

def upload(method,field,name,data,chat,caption,extra=None):
    boundary='aryana-'+uuid.uuid4().hex
    chunks=[]
    values={'chat_id':chat,'caption':caption,**(extra or {})}
    for key,value in values.items():
        chunks.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="'+key+'"\r\n\r\n'+str(value)+'\r\n').encode())
    mime='video/mp4' if field=='video' else 'application/zip'
    chunks.extend([('--'+boundary+'\r\nContent-Disposition: form-data; name="'+field+'"; filename="'+name+'"\r\nContent-Type: '+mime+'\r\n\r\n').encode(),data,('\r\n--'+boundary+'--\r\n').encode()])
    request=urllib.request.Request('https://api.telegram.org/bot'+BOT+'/'+method,data=b''.join(chunks),headers={'Content-Type':'multipart/form-data; boundary='+boundary})
    try:
        with urllib.request.urlopen(request,timeout=90) as response:result=json.load(response)
    except urllib.error.HTTPError as error:raise RuntimeError('Telegram upload HTTP '+str(error.code)) from None
    except Exception as error:raise RuntimeError('Telegram upload transport '+type(error).__name__) from None
    if not result.get('ok'):raise RuntimeError('Telegram upload rejected')
    return result['result']

def main():
    if not BOT:raise RuntimeError('Existing Telegram bot is not configured')
    if tg('getMe',{}).get('username','').lower()!='afgsocial_bot':raise RuntimeError('Established bot identity mismatch')
    chat=os.environ.get('TELEGRAM_REVIEW_CHAT_ID') or os.environ.get('TELEGRAM_CHAT_ID')
    if not chat:raise RuntimeError('Existing private owner destination missing')
    target=tg('getChat',{'chat_id':chat})
    if target.get('type')!='private':raise RuntimeError('Only the established private owner chat is permitted')
    chat=str(target['id'])
    aad=(REPO+':'+BRANCH+':'+REQUEST_ID).encode()
    wrap_key=hashlib.sha256(b'aryana-private-wrap-v1\0'+BOT.encode()).digest()

    if REQUEST['phase']=='advice':
        receipt_path=ROOT/'advice-receipt.json'
        if receipt_path.exists() and json.loads(receipt_path.read_text()).get('request_id')==REQUEST_ID:
            print('ARYANA_ADVICE_ALREADY_DELIVERED')
            return
        text="آریانا — لینک آنلاین آماده شد\n\nپنل استودیو:\nhttps://aryana-live-player.navyhippo25.chatgpt.site/\n\nنمای پخش عمودی:\nhttps://aryana-live-player.navyhippo25.chatgpt.site/live/\n\nبرای این نسخه نیازی به دانلود برنامه نیست. لینک را در مرورگر لپ‌تاپ باز کنید و با همان حساب ChatGPT مالک وارد شوید؛ سایت خصوصی است. در نمای پخش یک بار برای فعال‌کردن صدا کلیک کنید و پنل را باز نگه دارید.\n\nبرای نمایش در TikTok LIVE Studio، از Window Capture همان پنجرهٔ مرورگر استفاده کنید. منبع مرورگر داخلی ممکن است ورود حساب و ارتباط پنل را به اشتراک نگذارد. اندازهٔ خروجی: 1080 × 1920.\n\nآماده: کلیپ معرفی با حرکت لب، نمونهٔ صدای فارسی و انگلیسی، آزمایش ورود/گیفت/لایک و نمایش نفر اول. نام عددی فقط تشکر عمومی می‌گیرد. این آزمایش‌ها رویداد واقعی تیک‌تاک نیستند.\n\nهنوز آماده نیست: حرکت و گفت‌وگوی پیوستهٔ زنده و اتصال واقعی رویدادهای تیک‌تاک در این سایت. ورودی اتصال امن به سرور ساخته شده، اما سرور پردازش GPU هنوز تأمین و متصل نشده است. هیچ سرویس پولی فعال نشده.\n\nگفتار متن دلخواه بدون سرور، فقط با صدای مناسب نصب‌شدهٔ مرورگر کار می‌کند؛ نمونهٔ آمادهٔ فارسی با دیلارا پخش می‌شود."
        result=tg('sendMessage',{'chat_id':chat,'text':text,'link_preview_options':{'is_disabled':True}})
        receipt={'request_id':REQUEST_ID,'destination_type':'private','messages':[{'kind':'advice','message_id':result['message_id']}]}
        receipt_path.write_text(json.dumps(receipt,indent=2))
        commit_json('advice-receipt.json',receipt)
        print('ARYANA_ADVICE_DELIVERED '+str(result['message_id']))
        return

    if REQUEST['phase']=='prepare':
        if (ROOT/'key.json').exists():raise RuntimeError('Encryption key already prepared for this request')
        private=rsa.generate_private_key(public_exponent=65537,key_size=2048)
        secret={'private_pem':private.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()).decode(),'chat_id':chat}
        nonce=os.urandom(12)
        envelope={'request_id':REQUEST_ID,'created_at':datetime.now(timezone.utc).isoformat(),'public_pem':private.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo).decode(),'wrap_nonce':b64(nonce),'wrapped_private':b64(AESGCM(wrap_key).encrypt(nonce,json.dumps(secret).encode(),aad))}
        commit_json('key.json',envelope)
        print('ARYANA_PRIVATE_KEY_PREPARED')
        return

    if REQUEST['phase']!='send':raise RuntimeError('Unknown delivery phase')
    key=json.loads((ROOT/'key.json').read_text())
    if key['request_id']!=REQUEST_ID:raise RuntimeError('Delivery key request mismatch')
    age=(datetime.now(timezone.utc)-datetime.fromisoformat(key['created_at'])).total_seconds()
    if not 0<=age<=86400:raise RuntimeError('One-day delivery key expired')
    secret=json.loads(AESGCM(wrap_key).decrypt(un64(key['wrap_nonce']),un64(key['wrapped_private']),aad))
    if secret['chat_id']!=chat:raise RuntimeError('Private owner destination changed')
    private=serialization.load_pem_private_key(secret['private_pem'].encode(),password=None)
    sealed=json.loads((ROOT/'package.json').read_text())
    session_key=private.decrypt(un64(sealed['sealed_key']),padding.OAEP(mgf=padding.MGF1(hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
    encrypted=(ROOT/'package.enc').read_bytes()
    if hashlib.sha256(encrypted).hexdigest()!=sealed['cipher_sha256']:raise RuntimeError('Encrypted package integrity failed')
    archive_bytes=AESGCM(session_key).decrypt(un64(sealed['nonce']),encrypted,aad)
    if hashlib.sha256(archive_bytes).hexdigest()!=sealed['plain_sha256']:raise RuntimeError('Package integrity failed')
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        if archive.testzip():raise RuntimeError('Package ZIP validation failed')
        if any('/.private/' in name or name.endswith('/.env') for name in archive.namelist()):raise RuntimeError('Private runtime files cannot be delivered')
        video=archive.read('aryana-live/public/assets/introduction.mp4')

    receipt={'request_id':REQUEST_ID,'destination_type':'private','messages':[]}
    if (ROOT/'receipt.json').exists():
        old=json.loads((ROOT/'receipt.json').read_text())
        if old.get('request_id')==REQUEST_ID:receipt=old
    def sent(kind,result):
        receipt['messages'].append({'kind':kind,'message_id':result['message_id']})
        (ROOT/'receipt.json').write_text(json.dumps(receipt,indent=2))
        print('ARYANA_DELIVERED '+json.dumps(receipt['messages'][-1]),flush=True)
        commit_json('receipt.json',receipt)
    done={entry['kind'] for entry in receipt['messages']}
    if 'package' not in done:
        sent('package',upload('sendDocument','document','Aryana-Live-Windows-Preview.zip',archive_bytes,chat,'بستهٔ مستقل آریانا برای ویندوز؛ شامل برنامه، چهره، صدای فارسی و انگلیسی، کلیپ معرفی و راهنمای نصب. نسخهٔ پیش‌نمایش آفلاین.'))
    if 'video' not in done:
        sent('video',upload('sendVideo','video','Aryana-introduction.mp4',video,chat,'پیش‌نمایش متحرک آریانا با صدای فارسی · ۴٫۴۸ ثانیه',{'supports_streaming':'true','duration':'5','width':'940','height':'1672'}))
    if 'guide' not in done:
        text='آریانا — راه‌اندازی در TikTok LIVE Studio\n\nبرای نسخهٔ فعلی، دانلود و اجرای برنامه روی لپ‌تاپ بهتر است.\n\n۱. فایل ZIP بالا را در لپ‌تاپ دانلود و استخراج کنید.\n۲. Node.js نسخهٔ ۲۲ یا جدیدتر و Python نصب باشد؛ یک بار SETUP-WINDOWS.cmd را اجرا کنید.\n۳. START-WINDOWS.cmd را باز کنید.\n\nپنل مدیریت:\nhttp://127.0.0.1:4321\n\nخروجی مخصوص TikTok LIVE Studio:\nhttp://127.0.0.1:4321/live\n\nدر LIVE Studio، منبع Link/Browser را با لینک خروجی و اندازهٔ 1080 × 1920 اضافه کنید. اگر منبع وب در نسخهٔ شما نیست، پنجرهٔ صفحهٔ پخش را Capture کنید. صدای آریانا را داخل همان صفحه فعال کنید.\n\nاین لینک محلی فقط روی همان لپ‌تاپ و هنگام اجرای برنامه کار می‌کند. لینک دانلود فایل تلگرام، منبع پخش زندهٔ برنامه نیست.\n\nکلیپ معرفی آماده است؛ حرکت پیوسته و زندهٔ چهره، حرکت کامل بدن و لهجهٔ دقیق دری هنوز تکمیل نشده‌اند. ساخت کلیپ‌های تازه روی CPU آفلاین و کند است. هیچ سرور پولی فعال نشده است.'
        sent('guide',tg('sendMessage',{'chat_id':chat,'text':text,'link_preview_options':{'is_disabled':True}}))
    print('ARYANA_PRIVATE_DELIVERY_COMPLETE')

if __name__=='__main__':
    main()
