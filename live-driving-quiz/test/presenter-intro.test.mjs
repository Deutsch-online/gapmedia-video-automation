import test from 'node:test';
import assert from 'node:assert/strict';
import {PresenterIntro} from '../presenter-intro.mjs';
test('recorded introduction expires at exactly thirty seconds and repeat gets a fresh identity',()=>{
 let now=1000;const c=new PresenterIntro({now:()=>now}),first=c.start();assert.equal(c.busy(),true);assert.equal(first.expiresAt-first.startedAt,30000);now=30999;assert.equal(c.busy(),true);now=31000;assert.equal(c.snapshot().active,null);const next=c.start();assert.notEqual(next.id,first.id);c.stop();assert.equal(c.busy(),false);
});
