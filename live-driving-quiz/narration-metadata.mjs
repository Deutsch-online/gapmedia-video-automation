import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export function narrationMetadata(root,questions){
 const path=join(root,'public/narration/manifest.json');if(!existsSync(path))return null;
 const meta=JSON.parse(readFileSync(path,'utf8'));
 if(meta.engine!=='piper-1.3.0'||meta.voice!=='de_DE-thorsten-medium'||meta.persian_voice!=='fa_IR-amir-medium')throw Error('Unknown narration voice');
 const valid=(row,text)=>row?.text_sha256===createHash('sha256').update(text).digest('hex')&&Number.isInteger(row.duration_ms)&&row.duration_ms>=400;
 for(const q of questions)for(const [language,key] of [['de','questions'],['fa','persian_questions']])if(!valid(meta[key]?.[q.id],q[language]))throw Error('Question audio is stale: '+q.id+' '+language);
 const texts=JSON.parse(readFileSync(join(root,'speech-texts.json'),'utf8')).welcome;
 for(const language of ['fa','de'])if(!valid(meta.welcome?.[language],texts[language]))throw Error('Welcome audio is stale: '+language);
 return meta;
}
export function narrationDuration(meta,id,language='de'){
 if(!meta)return 0;const de=meta.questions?.[id]?.duration_ms||0,fa=meta.persian_questions?.[id]?.duration_ms||0;
 return language==='both'?de+fa+300:language==='fa'?fa:de;
}
