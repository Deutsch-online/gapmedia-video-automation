import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAvatarMedia,AvatarRenderer} from '../src/avatar.mjs';
test('a talking clip must contain both audio and video and preserve the original sentence duration',()=>{
 const media={streams:[{codec_type:'video',codec_name:'h264',width:720,height:1280},{codec_type:'audio'}],format:{duration:'4.48'}};
 assert.equal(validateAvatarMedia(media,4.49),4.48);
 assert.throws(()=>validateAvatarMedia({...media,streams:media.streams.slice(0,1)},4.49));
 assert.throws(()=>validateAvatarMedia({...media,format:{duration:'3'}},4.49));
 assert.throws(()=>validateAvatarMedia(media,NaN));
 assert.throws(()=>validateAvatarMedia({...media,streams:[{...media.streams[0],codec_name:'mpeg4'},media.streams[1]]},4.49));
});
test('an unconfigured avatar engine fails explicitly instead of claiming a generated or realtime video',async()=>{
 const renderer=new AvatarRenderer({root:'.',privateDir:'.',python:'',modelRoot:''});
 assert.equal(renderer.status().configured,false);assert.equal(renderer.status().mode,'offline_clips');
 await assert.rejects(()=>renderer.render('/missing/audio.mp3'),/تنظیم نشده/);
});
