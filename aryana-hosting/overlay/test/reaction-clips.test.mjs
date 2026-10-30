import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {loadReactionClips} from '../src/reaction-clips.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
test('recorded reactions reject changed faces, corrupt media and unsafe paths, and require the exact sentence',()=>{
 const root=mkdtempSync(join(tmpdir(),'aryana-clips-'));mkdirSync(join(root,'assets'));
 try{
  for(const [file,content] of [['aryana.png','portrait'],['reaction-thanks.mp3','audio'],['reaction-thanks.mp4','video']])writeFileSync(join(root,'assets',file),content);
  const entry={text:'بسیار تشکر!',duration:2.2,audio:'/assets/reaction-thanks.mp3',video:'/assets/reaction-thanks.mp4',audioSha256:hash('audio'),videoSha256:hash('video')};
  const save=(entries=[entry],portraitSha256=hash('portrait'))=>writeFileSync(join(root,'assets/reaction-clips.json'),JSON.stringify({version:1,portraitSha256,entries}));
  save();let clips=loadReactionClips(root);assert.equal(clips.size,1);assert.equal(clips.has('مریم جان، بسیار تشکر!'),false);
  save([entry],hash('other face'));assert.equal(loadReactionClips(root).size,0);
  save([{...entry,audio:'/assets/../private.mp3'}]);assert.equal(loadReactionClips(root).size,0);
  save();writeFileSync(join(root,'assets/reaction-thanks.mp4'),'changed');assert.equal(loadReactionClips(root).size,0);
 }finally{rmSync(root,{recursive:true,force:true});}
});
