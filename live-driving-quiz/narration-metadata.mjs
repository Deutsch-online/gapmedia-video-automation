import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
// Ignore stale recordings if the question wording has changed.
export function narrationMetadata(root,questions){
 const path=join(root,'public/narration/manifest.json');if(!existsSync(path))return null;
 const meta=JSON.parse(readFileSync(path,'utf8'));
 if(meta.engine!=='piper-1.3.0'||meta.voice!=='de_DE-thorsten-medium')throw Error('Unknown German voice');
 for(const q of questions){const row=meta.questions?.[q.id];if(!row||row.text_sha256!==createHash('sha256').update(q.de).digest('hex')||!Number.isInteger(row.duration_ms)||row.duration_ms<400)throw Error('German question audio is stale: '+q.id);}
 return meta;
}
