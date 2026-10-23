// Offline CPU-only German question speech. No account, quota or paid API.
import {readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('.',import.meta.url));
const questions=JSON.parse(readFileSync(join(root,'data/questions.json'),'utf8'));
const dir=join(root,'public/narration');mkdirSync(dir,{recursive:true});
for(const q of questions){
 if(!/^[A-Za-z0-9.-]+$/.test(q.id)||!q.de)throw Error('Invalid question');
 execFileSync(process.env.ESPEAK_BIN||'espeak-ng',['-v','de','-s','155','-w',join(dir,q.id+'.wav'),'--stdin'],{input:q.de.replace(/[\[\]]/g,''),timeout:15000});
 const audio=readFileSync(join(dir,q.id+'.wav'));
 if(audio.toString('ascii',0,4)!=='RIFF'||audio.length<1024)throw Error('Invalid German speech: '+q.id);
}
console.log(`Prepared ${questions.length} offline German question recordings.`);
