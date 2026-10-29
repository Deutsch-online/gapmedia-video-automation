import {spawn,execFile} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,readdirSync,rmSync,statSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function probe(path){return new Promise((resolve,reject)=>execFile('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path],{timeout:10000,maxBuffer:64000},(error,stdout)=>{if(error)return reject(Error('اعتبارسنجی فایل با ffprobe موفق نشد.'));try{resolve(JSON.parse(stdout));}catch{reject(Error('اطلاعات فایل معتبر نیست.'));}}));}
function browserVideo(source,target){return new Promise((resolve,reject)=>execFile('ffmpeg',['-y','-v','error','-i',source,'-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',target],{timeout:120000,maxBuffer:64000},error=>error?reject(Error('تبدیل ویدیو به قالب قابل پخش مرورگر موفق نشد.')):resolve()));}
export function validateAvatarMedia(media,audioDuration){
 const video=media.streams?.find(s=>s.codec_type==='video'),audio=media.streams?.find(s=>s.codec_type==='audio'),duration=Number(media.format?.duration);
 if(!video||video.codec_name!=='h264'||!audio||!Number.isFinite(duration)||!Number.isFinite(audioDuration)||duration<=0||duration>35||Math.abs(duration-audioDuration)>.3||video.width<128||video.height<128)throw Error('قالب یا مدت ویدیو و مسیر صدای آن با جملهٔ اصلی مطابقت ندارد.');
 return duration;
}

// This is an optional offline clip renderer, never a realtime GPU claim.
export class AvatarRenderer{
 constructor({root,privateDir,changed=()=>{},python=process.env.ARYANA_AVATAR_PYTHON,modelRoot=process.env.ARYANA_SADTALKER_ROOT}={}){
  Object.assign(this,{root,privateDir,changed,python,modelRoot});this.child=null;this.generation=0;this.job=null;
  this.configured=Boolean(python&&modelRoot&&existsSync(python)&&existsSync(join(modelRoot,'inference.py')));
 }
 status(){return {configured:this.configured,mode:'offline_clips',job:this.job};}
 cancel(){
  this.generation++;
  const child=this.child;
  if(child?.pid){try{if(process.platform==='win32')spawn('taskkill',['/pid',String(child.pid),'/t','/f'],{stdio:'ignore'});else process.kill(-child.pid,'SIGTERM');}catch{}}
  if(this.job?.status==='rendering'){this.job={...this.job,status:'cancelled'};this.changed();}
 }
 async render(audioPath){
  if(!this.configured)throw Error('موتور محلی حرکت چهره تنظیم نشده است.');
  if(this.child)throw Error('یک پیش‌نمایش در حال ساخت است.');
  const portrait=join(this.root,'public/assets/aryana.png');
  const portraitBytes=readFileSync(portrait),audioBytes=readFileSync(audioPath),hash=createHash('sha256').update('sadtalker-cd4c046-256-full-h264-v2').update(readFileSync(join(this.root,'tools/render-avatar-cpu.py'))).update(portraitBytes).update(audioBytes).digest('hex');
  const directory=join(this.privateDir,'video');mkdirSync(directory,{recursive:true,mode:0o700});
  const target=join(directory,hash+'.mp4'),manifest=join(directory,hash+'.json');
  try{const saved=JSON.parse(readFileSync(manifest,'utf8'));if(saved.identity===hash&&saved.videoSha256===sha(readFileSync(target))){this.job={id:randomUUID(),status:'ready',progress:100,cached:true,finishedAt:Date.now()};this.changed();return '/video/'+hash+'.mp4';}}catch{}
  const id=randomUUID(),work=join(directory,'work-'+id),generation=++this.generation;
  this.job={id,status:'rendering',progress:0,startedAt:Date.now()};this.changed();
  let ownedChild;
  try{
   await new Promise((resolve,reject)=>{
    const child=spawn(this.python,[join(this.root,'tools/render-avatar-cpu.py'),'--sadtalker-root',this.modelRoot,'--portrait',portrait,'--audio',audioPath,'--output-dir',work],{
     stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32',env:{...process.env,OMP_NUM_THREADS:'2',OPENBLAS_NUM_THREADS:'2',MKL_NUM_THREADS:'2',MPLCONFIGDIR:join(this.privateDir,'model-cache','mpl'),TORCH_HOME:join(this.privateDir,'model-cache','torch')},
    });this.child=child;ownedChild=child;
    const timeout=setTimeout(()=>{this.cancel();reject(Error('ساخت کلیپ از مهلت 30 دقیقه گذشت.'));},30*60*1000);
    const progress=chunk=>{
     if(generation!==this.generation)return;
     for(const match of chunk.toString().matchAll(/Face Renderer::\s+(\d+)%/g)){this.job.progress=Number(match[1]);this.changed();}
    };
    child.stdout.on('data',progress);child.stderr.on('data',progress);
    child.once('error',()=>{clearTimeout(timeout);reject(Error('محیط موتور چهره اجرا نشد.'));});
    child.once('exit',code=>{clearTimeout(timeout);code===0&&generation===this.generation?resolve():reject(Error(generation!==this.generation?'ساخت پیش‌نمایش لغو شد.':'ساخت پیش‌نمایش ناموفق بود؛ مدل‌ها و وابستگی‌های موتور بررسی شوند.'));});
   });
   const file=existsSync(work)?readdirSync(work).find(name=>name.endsWith('.mp4')):null;
   if(!file||statSync(join(work,file)).size<1000)throw Error('موتور فایل ویدیوی معتبر تحویل نداد.');
   const output=join(work,file),sourceInfo=await probe(audioPath);await browserVideo(output,target+'.partial.mp4');
   const videoInfo=await probe(target+'.partial.mp4'),duration=validateAvatarMedia(videoInfo,Number(sourceInfo.format?.duration));
   if(generation!==this.generation)throw Error('ساخت پیش‌نمایش لغو شد.');
   renameSync(target+'.partial.mp4',target);
   writeFileSync(manifest+'.partial',JSON.stringify({identity:hash,audioSha256:sha(audioBytes),portraitSha256:sha(portraitBytes),videoSha256:sha(readFileSync(target)),durationSeconds:duration},null,2),{mode:0o600});renameSync(manifest+'.partial',manifest);
   const clips=readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.mp4$/.test(n)).map(n=>({n,at:statSync(join(directory,n)).mtimeMs})).sort((a,b)=>a.at-b.at);
   while(clips.length>8){const old=clips.shift();rmSync(join(directory,old.n),{force:true});rmSync(join(directory,old.n.replace('.mp4','.json')),{force:true});}
   this.job={...this.job,status:'ready',progress:100,finishedAt:Date.now()};this.changed();
   return '/video/'+hash+'.mp4';
  }catch(error){if(generation===this.generation){this.job={...this.job,status:'error'};this.changed();}throw error;}
  finally{if(this.child===ownedChild)this.child=null;rmSync(target+'.partial.mp4',{force:true});rmSync(work,{recursive:true,force:true});}
 }
}
