import {TelegramTeacher} from './telegram-teacher.mjs';
// Social's Cloudflare webhook remains the only Telegram receiver. This bridge
// receives authenticated owner updates and never installs a competing webhook.
export class SocialTeacher extends TelegramTeacher{
 constructor({secret=process.env.SOCIAL_TEACHER_SECRET,owner=process.env.SOCIAL_TEACHER_OWNER,callbackSecret=process.env.SOCIAL_CALLBACK_SECRET,callbackOrigin='https://afghanfollowers-telegram.afghan-video-bot.workers.dev',...options}={}){
  super({...options,token:secret,owner});this.secret=secret||'';this.callbackSecret=callbackSecret;this.callbackOrigin=callbackOrigin;
  if(!callbackSecret)this.state='not_configured';
 }
 status(){return {...super.status(),expectedBot:'afgsocial_bot',requiresSecret:'SOCIAL_TEACHER_SECRET',section:'teacher',transport:'existing_social_webhook'};}
 async start(){if(this.state==='not_configured'||this.state==='ready')return;this.state='ready';this.timer=setInterval(()=>void this.drain(),1000);this.timer.unref();}
 async api(method,payload){
  if(method!=='sendMessage'||String(payload.chat_id)!==this.owner)throw Error('Unsupported teaching transport');
  const response=await this.fetcher(this.callbackOrigin+'/internal/teacher-result',{method:'POST',headers:{'content-type':'application/json','X-Project-Authorization':this.callbackSecret},body:JSON.stringify({chatId:this.owner,text:payload.text}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('ارسال نتیجه به بات سوشل ناموفق بود.');return {ok:true};
 }
}
