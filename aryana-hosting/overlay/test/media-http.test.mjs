import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {serveStaticFile} from '../src/media-http.mjs';

test('MP4 browser probing, seeking, and HEAD use correct HTTP byte semantics',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'aryana-http-')),file=join(dir,'clip.mp4');
 const data=Buffer.from(Array.from({length:256},(_,i)=>i));writeFileSync(file,data);
 const server=http.createServer((req,res)=>serveStaticFile(req,res,file,'video/mp4'));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});});
 const url='http://127.0.0.1:'+server.address().port;
 await t.test('Safari two-byte probe returns exactly two bytes',async()=>{const r=await fetch(url,{headers:{Range:'bytes=0-1'}});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),'bytes 0-1/256');assert.equal(r.headers.get('content-length'),'2');assert.deepEqual(Buffer.from(await r.arrayBuffer()),data.subarray(0,2));});
 await t.test('HEAD advertises video length without a body',async()=>{const r=await fetch(url,{method:'HEAD'});assert.equal(r.status,200);assert.equal(r.headers.get('content-length'),'256');assert.equal(r.headers.get('accept-ranges'),'bytes');assert.equal((await r.arrayBuffer()).byteLength,0);});
 await t.test('Open and suffix ranges support MP4 tail seeking',async()=>{for(const [range,start] of [['bytes=224-',224],['bytes=-32',224]]){const r=await fetch(url,{headers:{Range:range}});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),'bytes 224-255/256');assert.deepEqual(Buffer.from(await r.arrayBuffer()),data.subarray(start));}});
 await t.test('Overlong end is clamped to the last byte',async()=>{const r=await fetch(url,{headers:{Range:'bytes=254-999'}});assert.equal(r.status,206);assert.deepEqual(Buffer.from(await r.arrayBuffer()),data.subarray(254));});
 await t.test('Unsatisfiable and malformed ranges return 416',async()=>{for(const range of ['bytes=256-','bytes=8-3','bytes=-0','bytes=0-1,8-9']){const r=await fetch(url,{headers:{Range:range}});assert.equal(r.status,416);assert.equal(r.headers.get('content-range'),'bytes */256');assert.equal((await r.arrayBuffer()).byteLength,0);}});
 await t.test('A stale resume validator receives a complete current file',async()=>{const r=await fetch(url,{headers:{Range:'bytes=2-5','If-Range':'"old-version"'}});assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),data);});
});
