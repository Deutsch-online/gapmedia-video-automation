import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectElevenLabsKey} from './scripts/elevenlabs-preflight.mjs';

test('missing key performs no request',async()=>{
  const r=await inspectElevenLabsKey({env:{},fetchImpl:()=>{throw Error('must not fetch');}});
  assert.equal(r.authentication,'missing');
  assert.equal(r.paid_requests_sent,0);
});

test('uses an existing secret alias, GET only, without exposing returned media or key',async()=>{
  const calls=[];
  const r=await inspectElevenLabsKey({env:{ELEVEN_LABS_API_KEY:'private-fixture'},fetchImpl:async(url,options)=>{
    calls.push(url);assert.equal(options.method,'GET');assert.equal(options.redirect,'error');
    assert.equal(options.headers['xi-api-key'],'private-fixture');
    return {ok:true,status:200,json:async()=>({tier:'pro',api_key:'private-fixture',generations:[{content_url:'https://private-media.invalid/result'}]})};
  }});
  assert.equal(calls.length,3);assert.equal(r.media_read_access,true);
  assert.equal(r.credential_source,'ELEVEN_LABS_API_KEY');assert.equal(r.checks.subscription.tier,'pro');
  assert.equal(r.generation_enabled,false);
  assert.doesNotMatch(JSON.stringify(r),/private-fixture|private-media/);
});

test('does not print provider error bodies or thrown network errors',async()=>{
  const r=await inspectElevenLabsKey({env:{ELEVENLABS_API_KEY:'private-fixture'},fetchImpl:async()=>{
    throw Error('xi-api-key=private-fixture');
  }});
  assert.equal(r.authentication,'not_verified');
  assert.doesNotMatch(JSON.stringify(r),/private-fixture/);
});

test('valid subscription does not hide missing media permissions',async()=>{
  const r=await inspectElevenLabsKey({env:{ELEVENLABS_API_KEY:'fixture'},fetchImpl:async(url)=>({
    status:url.includes('/subscription')?200:403,ok:url.includes('/subscription'),json:async()=>({tier:'pro'})
  })});
  assert.equal(r.authentication,'accepted');assert.equal(r.media_read_access,false);
  assert.equal(r.checks.video.status,'permission_denied');
});

test('invalid credentials are reported without raw response details',async()=>{
  const r=await inspectElevenLabsKey({env:{ELEVENLABS_API_KEY:'fixture'},fetchImpl:async()=>({ok:false,status:401,json:async()=>{throw Error('must not read');}})});
  assert.equal(r.authentication,'rejected');assert.equal(r.media_read_access,false);
});
