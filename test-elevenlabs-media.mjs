import test from 'node:test';
import assert from 'node:assert/strict';
import {runElevenLabsMedia} from './scripts/elevenlabs-media.mjs';

const requestJson=JSON.stringify({model_id:'gpt-image-1.5',prompt:'private request'});

test('paid submission requires explicit one-request authorisation',async()=>{
  let calls=0;
  await assert.rejects(runElevenLabsMedia({operation:'submit-image',requestJson,execute:async()=>{calls++;}}),/not explicitly/);
  assert.equal(calls,0);
});

test('validation never submits and never prints CLI request previews',async()=>{
  const calls=[];
  const report=await runElevenLabsMedia({requestJson,env:{ELEVEN_API_KEY:'private-key'},execute:async(args,options)=>{
    calls.push(args);assert.equal(options.env.ELEVENLABS_API_KEY,'private-key');
    return {stdout:JSON.stringify({dry_run:true,headers:[['xi-api-key','private-key']],body:{prompt:'private request'}})};
  }});
  assert.equal(calls.length,1);assert.ok(calls[0].includes('--dry-run'));
  assert.doesNotMatch(JSON.stringify(report),/private-key|private request/);
});

test('authorised submission validates once and submits once without retries',async()=>{
  const calls=[];
  const report=await runElevenLabsMedia({operation:'submit-image',requestJson,allowPaid:true,
    env:{ELEVEN_API_KEY:'fixture'},execute:async(args)=>{
      calls.push(args);return {stdout:JSON.stringify(args.includes('--dry-run')?{dry_run:true}:{id:'job_1',status:'pending',content_url:'private-url'})};
    }});
  assert.equal(calls.length,2);assert.ok(calls.every(args=>args.includes('--no-retry')));
  assert.equal(report.generation_id,'job_1');assert.doesNotMatch(JSON.stringify(report),/private-url/);
});

test('uncertain submit is not retried',async()=>{
  let calls=0;
  await assert.rejects(runElevenLabsMedia({operation:'submit-video',requestJson,allowPaid:true,
    env:{ELEVEN_API_KEY:'fixture'},execute:async(args)=>{
      calls++;if(args.includes('--dry-run'))return {stdout:'{}'};throw Error('private-key');
    }}),/uncertain/);
  assert.equal(calls,2);
});

test('status only reads an existing job and omits signed output URLs',async()=>{
  const report=await runElevenLabsMedia({operation:'status-video',generationId:'job_1',env:{ELEVEN_API_KEY:'fixture'},execute:async(args)=>{
    assert.equal(args[2],'get');assert.ok(!args.includes('create'));
    return {stdout:JSON.stringify({id:'job_1',status:'completed',content_url:'https://private-output.invalid'})};
  }});
  assert.equal(report.status,'completed');assert.doesNotMatch(JSON.stringify(report),/private-output/);
});
