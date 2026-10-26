import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGeminiKey} from './gemini-key-preflight.mjs';
test('read-only model pagination authenticates without generation or secret disclosure',async()=>{
 const key='DO_NOT_DISCLOSE_THIS_KEY',calls=[];
 const report=await inspectGeminiKey({env:{GEMINI_API_KEY:key},probeVideoModels:false,fetchImpl:async(url,options)=>{calls.push(url);assert.equal(options.method,'GET');assert.equal(options.body,undefined);assert.equal(options.headers['x-goog-api-key'],key);assert.ok(url.startsWith('https://generativelanguage.googleapis.com/v1beta/models?'));return Response.json(calls.length===1?{models:[{name:'models/veo-test'}],nextPageToken:'a&b'}:{models:[{name:'models/gemini-test'},{name:'malformed'}]});}});
 assert.equal(calls.length,2);assert.ok(calls[1].includes('a%26b'));assert.equal(report.authentication,'accepted');assert.deepEqual(report.models.video,['veo-test']);assert.equal(report.free_tier_verified,false);assert.equal(report.generation_enabled,false);assert.ok(!JSON.stringify(report).includes(key));
});
test('missing keys do not call the API and rejected keys never expose raw errors',async()=>{
 const missing=await inspectGeminiKey({env:{},fetchImpl:()=>{throw Error('must not call');}});assert.equal(missing.authentication,'missing');
 const secret='HIDDEN_KEY';let bodyRead=false;const failed=await inspectGeminiKey({env:{GOOGLE_API_KEY:secret},fetchImpl:async()=>({ok:false,status:403,text:async()=>{bodyRead=true;return secret;}})});assert.equal(failed.authentication,'rejected');assert.equal(bodyRead,false);assert.ok(!JSON.stringify(failed).includes(secret));
});

test('direct video metadata probing remains GET-only and does not assume a free tier',async()=>{
 const calls=[];const r=await inspectGeminiKey({env:{GEMINI_API_KEY:'private-key'},fetchImpl:async(url,opts)=>{assert.equal(opts.method,'GET');assert.equal(opts.body,undefined);calls.push(url);if(url.includes('?'))return Response.json({models:[]});return url.endsWith('veo-3.1-fast-generate-preview')?Response.json({supportedGenerationMethods:['predictLongRunning']}):new Response('',{status:404});}});
 assert.equal(calls.length,5);assert.deepEqual(r.models.video,['veo-3.1-fast-generate-preview']);assert.equal(r.free_tier_verified,false);assert.equal(r.generation_enabled,false);
});
