import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hostingConfig,tokenMatches,publicState} from '../src/hosting.mjs';
test('public hosting refuses missing keys and non-HTTPS origins',()=>{
 assert.equal(hostingConfig({},4321).bind,'127.0.0.1');
 assert.throws(()=>hostingConfig({PUBLIC_URL:'https://host.hf.space'},7860),/token/);
 assert.throws(()=>hostingConfig({PUBLIC_URL:'http://host.hf.space',ARYANA_ADMIN_TOKEN:'a'.repeat(64)},7860),/HTTPS/);
 const h=hostingConfig({PUBLIC_URL:'https://host.hf.space',ARYANA_ADMIN_TOKEN:'a'.repeat(64)},7860);
 assert.equal(h.bind,'0.0.0.0');assert(h.hosts.has('host.hf.space'));assert(!h.origins.has('https://attacker.example'));
 assert(tokenMatches('a'.repeat(64),h.token));assert(!tokenMatches('',h.token));
});
test('public output never contains private settings, logs or errors',()=>{
 const state=publicState({settings:{secret:'private'},log:[{text:'private comment'}],lastError:'private path',connection:'connected',rows:[],joins:[],utterances:[]});
 assert.equal(state.connection,'connected');assert(!('settings' in state));assert(!('log' in state));assert(!('lastError' in state));
});
