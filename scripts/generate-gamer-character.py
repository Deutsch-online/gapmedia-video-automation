import base64,json,os
from pathlib import Path
from urllib.request import Request,urlopen
from huggingface_hub import HfApi,InferenceClient,CommitOperationAdd,hf_hub_download

out=Path('/tmp/gamer-character');out.mkdir(exist_ok=True)
token=os.environ['HF_TOKEN'];api=HfApi(token=token)
owner=api.whoami()['name'];repo=owner+'/nations-race-gamer-character';image_name='gamer-woman-v1.png'
prompt='''A candid photorealistic DSLR photograph of a fictional adult woman gamer, age 28, seated at her gaming desk, actively playing a car racing video game. Three-quarter side view from beside the monitor, her face clearly visible and her gaze directed at the monitor screen, not the camera. A large real computer monitor is physically in front of her on the desk, showing a vivid car racing circuit. Her right hand naturally operating a gaming mouse and left hand naturally resting on a keyboard. She wears a modest teal long-sleeved sweater and professional over-ear gaming headphones with a small microphone. Dark brown hair, warm confident expression, realistic skin texture, natural facial proportions. Cozy modern gaming room, tasteful violet and cyan ambient RGB lighting, soft natural light on her face, detailed desk, believable cables and computer tower. Camera at eye level, medium-wide portrait framing that shows her face, both hands, keyboard and monitor together. Authentic esports livestream photography, lifelike human anatomy, five fingers on each hand, crisp detail, shallow depth of field, realistic photographic colors. No illustration, no cartoon, no doll, no plastic skin, no branding, no text overlay, no watermark.'''
api.create_repo(repo,repo_type='dataset',private=False,exist_ok=True)
existing=set(api.list_repo_files(repo,repo_type='dataset'))
if image_name in existing:
 image=Path(hf_hub_download(repo,image_name,repo_type='dataset',token=token));generated=False
else:
 # Exactly one paid inference request; no automatic generation retries.
 client=InferenceClient(provider='fal-ai',api_key=token,timeout=120)
 result=client.text_to_image(prompt,model='black-forest-labs/FLUX.1-schnell',width=768,height=1152,num_inference_steps=4,seed=84721)
 image=out/image_name;result.save(image);generated=True
# Reuse the project's existing natural Persian female recording, without a new paid call.
pack=json.loads(Path('live-race/dist/audio/voices.json').read_text())
voice=out/'persian-voice-sample.mp3';voice.write_bytes(base64.b64decode(pack['voices']['persian']['clips']['test'].split(',',1)[1]))
meta=out/'character.json';meta.write_text(json.dumps({'fictional_adult':True,'image_model':'black-forest-labs/FLUX.1-schnell','provider':'fal-ai via Hugging Face Inference Providers','voice':'Dilara, synthetic Persian female voice','voice_source':'existing project recording','single_generation_request':True,'prompt':prompt},ensure_ascii=False,indent=2))
readme=out/'README.md';readme.write_text('---\nlicense: cc-by-4.0\n---\n# Fictional adult gamer character\n\nAI-generated photographic character for Nations Race. The woman is fictional.\n\n![Gamer](gamer-woman-v1.png)\n\n[Persian female voice sample](persian-voice-sample.mp3). The voice is synthetic, not a recording of the pictured person.\n')
api.create_commit(repo,repo_type='dataset',commit_message='Create fictional gamer portrait and Persian voice sample',operations=[CommitOperationAdd(path_in_repo=image_name,path_or_fileobj=str(image)),CommitOperationAdd(path_in_repo='persian-voice-sample.mp3',path_or_fileobj=str(voice)),CommitOperationAdd(path_in_repo='character.json',path_or_fileobj=str(meta)),CommitOperationAdd(path_in_repo='README.md',path_or_fileobj=str(readme))])
base='https://huggingface.co/datasets/'+repo+'/resolve/main/'
report={'image':base+image_name,'audio':base+'persian-voice-sample.mp3','dataset':'https://huggingface.co/datasets/'+repo,'generated_now':generated,'image_requests':int(generated)}
# Deliver only to the owner's previously configured Telegram destination.
bot=os.environ.get('TELEGRAM_BOT_TOKEN');chat=os.environ.get('TELEGRAM_CHAT_ID') or os.environ.get('TELEGRAM_REVIEW_CHAT_ID')
if bot and chat:
 body=json.dumps({'chat_id':chat,'text':'شخصیت خیالی خانم گیمر، تصویر واقع‌گرایانه از Hugging Face\n'+report['image']+'\nنمونهٔ صدای فارسی دلارآ (تولیدشده با هوش مصنوعی)\n'+report['audio']}).encode()
 with urlopen(Request('https://api.telegram.org/bot'+bot+'/sendMessage',data=body,headers={'Content-Type':'application/json'}),timeout=30) as r:report['telegram_delivered']=bool(json.load(r).get('ok'))
print('GAMER_CHARACTER_READY: '+json.dumps(report))
