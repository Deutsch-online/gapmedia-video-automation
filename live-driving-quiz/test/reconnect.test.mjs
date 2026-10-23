import test from 'node:test';
import assert from 'node:assert/strict';
import {LiveReconnect} from '../reconnect.mjs';
test('offline retries back off, never overlap an active connection, and continue after a late LIVE starts',()=>{
 let now=1000;const r=new LiveReconnect({enabled:true,now:()=>now}),idle={connecting:false,connected:false};assert.equal(r.due(idle),false);now+=5000;assert.equal(r.due(idle),true);assert.equal(r.due({...idle,connecting:true}),false);assert.equal(r.due({...idle,connected:true}),false);
 for(const wait of [15000,30000,60000,120000,120000]){r.failed('offline');assert.equal(r.nextAt-now,wait);now+=wait;assert.equal(r.due(idle),true);}
 assert.equal(r.connected('room1'),false);assert.equal(r.nextAt,null);assert.equal(r.attempts,0);assert.equal(r.due(idle),false);
 r.failed();assert.equal(r.nextAt-now,15000);assert.equal(r.connected('room1'),false,'temporary reconnect preserves the same LIVE');assert.equal(r.connected('room2'),true,'a new LIVE resets room-specific counts');
});
test('manual disconnect disables retry, explicit enable restores it, and rate limiting delays for five minutes',()=>{
 let now=123;const r=new LiveReconnect({enabled:true,now:()=>now});r.disable();r.failed('offline');now+=10000000;assert.equal(r.due({connecting:false,connected:false}),false);r.enable();assert.equal(r.due({connecting:false,connected:false}),true);r.failed('rate_limit');assert.equal(r.nextAt-now,300000);assert.equal(r.snapshot().autoReconnect,true);
});
