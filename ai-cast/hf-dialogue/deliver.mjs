import {readFileSync,writeFileSync,statSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {telegramConfig,verifyDelivery,sendVideo} from '../../lib/telegram.mjs';
const path='.hf-dialogue-telegram-delivery.json';
const state=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{request:'owner-request-2026-11-01-hf-dialogue',platforms:{}};
const tg=telegramConfig(process.env);
if(!tg.enabled)throw Error('Project Telegram credentials unavailable');
const verified=await verifyDelivery({token:tg.token,chatId:tg.reviewChatId,requirePrivate:true});
if(!verified.ok||verified.chat?.type!=='private')throw Error('Private project bot destination could not be verified');
function checkpoint(){
 writeFileSync(path,JSON.stringify(state,null,2)+'\n');
 execFileSync('git',['add',path]);
 execFileSync('git',['commit','-m','Record requested HF dialogue private delivery receipt'],{stdio:'pipe'});
 execFileSync('git',['push','origin','HEAD:codex/hf-dialogue-60s'],{stdio:'pipe'});
}
for(const platform of ['instagram','tiktok']){
 if(state.platforms[platform]?.message_id){console.log(platform+': already confirmed');continue;}
 if(state.platforms[platform]?.status==='dispatching')throw Error('Unresolved earlier upload; do not replay');
 const file='renders/hf-dialogue/'+platform+'-arzttermin-60s.mp4';
 if(statSync(file).size>45*1024*1024)throw Error('Private upload size budget exceeded');
 const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
 const v=info.streams.find(x=>x.codec_type==='video'),a=info.streams.find(x=>x.codec_type==='audio');
 if(Number(info.format.duration)!==60||v.width!==1080||v.height!==1920||v.nb_frames!=='1800'||v.avg_frame_rate!=='30/1'||v.codec_name!=='h264'||a?.codec_name!=='aac')throw Error('Platform output verification failed');
 const sha=createHash('sha256').update(readFileSync(file)).digest('hex');
 state.platforms[platform]={status:'dispatching',file,sha256:sha,duration:60};
 checkpoint();
 const caption=platform==='instagram'
 ? 'Instagram Reels | Beim Arzt: fünf Sätze für deinen Termin.\nHören, nachsprechen und sicherer Deutsch sprechen. Speichere diese Übung für deinen nächsten Arztbesuch.\n\n#DeutschLernen #Alltagsdeutsch #Arzttermin #GermanLearning #DeutschA1'
 : 'TikTok | Ich brauche Termin? So sagst du es richtig!\nFünf typische Fehler beim Arzttermin — hör zu und sprich mit.\n\n#DeutschLernen #LearnGerman #DeutschA1 #Arzttermin #GermanDialog';
 const result=await sendVideo({token:tg.token,chatId:tg.reviewChatId,file,caption,attempts:1});
 if(!result?.message_id)throw Error('Telegram did not confirm upload; intent remains unresolved');
 state.platforms[platform]={...state.platforms[platform],status:'delivered',message_id:result.message_id,confirmed_at:new Date().toISOString()};
 checkpoint();
 writeFileSync('renders/hf-dialogue/delivery-'+platform+'.json',JSON.stringify(state.platforms[platform],null,2));
 console.log(JSON.stringify({platform,message_id:result.message_id,status:'delivered'}));
}
