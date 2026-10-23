import test from 'node:test';
import assert from 'node:assert/strict';
import {hostingConfig} from '../hosting.mjs';
test('local mode binds to loopback and generates a private token',()=>{
 const c=hostingConfig({});assert.equal(c.bind,'127.0.0.1');assert.equal(c.port,4317);assert.equal(c.publicOrigin,null);assert.equal(c.token.length,48);
});
test('public HTTPS hosting requires an explicit private token and a known origin',()=>{
 assert.throws(()=>hostingConfig({PUBLIC_URL:'https://example.hf.space'}),/token/);
 assert.throws(()=>hostingConfig({PUBLIC_URL:'http://example.hf.space',QUIZ_ADMIN_TOKEN:'a'.repeat(64)}),/HTTPS/);
 const c=hostingConfig({PUBLIC_URL:'https://example.hf.space',QUIZ_ADMIN_TOKEN:'a'.repeat(64)});
 assert.equal(c.bind,'0.0.0.0');assert.equal(c.token,'a'.repeat(64));assert.ok(c.allowedHosts.has('example.hf.space'));assert.ok(!c.allowedOrigins.has('https://attacker.example'));
});
test('the Space domain can be inferred without accepting arbitrary forwarding headers',()=>{
 const c=hostingConfig({SPACE_HOST:'owner-quiz.hf.space',QUIZ_ADMIN_TOKEN:'a'.repeat(64)});
 assert.equal(c.base,'https://owner-quiz.hf.space');assert.throws(()=>hostingConfig({QUIZ_BIND_HOST:'0.0.0.0'}),/Public bind/);
});
