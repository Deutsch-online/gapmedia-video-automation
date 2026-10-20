import assert from 'node:assert/strict';
import {mcpTools,mcpExaSearch,mcpExaFetch} from './src/mcp-tools.js';
import {handleAssistantTool} from './src/assistant-tools.js';
import {runResearchAgent} from './src/research-agent.js';

const saved = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  assert.equal(String(url),'https://mcp.exa.ai/mcp');
  const body = JSON.parse(init.body);
  calls.push(body);
  if (body.method === 'tools/list') return new Response('event: message\ndata: '+JSON.stringify({jsonrpc:'2.0',id:1,result:{tools:[
    {name:'web_search_exa',annotations:{readOnlyHint:true,destructiveHint:false}},
    {name:'web_fetch_exa',annotations:{readOnlyHint:true,destructiveHint:false}},
    {name:'dangerous_write',annotations:{readOnlyHint:false,destructiveHint:true}},
  ]}})+'\n\n',{headers:{'content-type':'text/event-stream'}});
  if (body.method === 'tools/call') return new Response('event: message\ndata: '+JSON.stringify({jsonrpc:'2.0',id:1,result:{content:[{type:'text',text:'Official source: https://example.org/a'}]}})+'\n\n',{headers:{'content-type':'text/event-stream'}});
  throw new Error('unexpected MCP request');
};

assert.deepEqual((await mcpTools()).map(tool=>tool.name),['web_search_exa','web_fetch_exa']);
assert.match(await mcpExaSearch('German Anmeldung'),/Official source/);
assert.equal(calls.at(-1).params.arguments.numResults,4);
assert.match(await mcpExaFetch('https://example.org/a'),/Official source/);
await assert.rejects(mcpExaFetch('http://localhost/secret'));
await assert.rejects(mcpExaFetch('https://127.0.0.1/secret'));
assert.match(await handleAssistantTool({},'/mcp'),/web_search_exa/);
assert.match(await handleAssistantTool({},'/mcp_search German Anmeldung'),/Official source/);
const decisions=['{"tool":"mcp_exa_fetch","arg":"https://example.org/a"}','{"tool":"final","answer":"طبق صفحهٔ خوانده‌شده، منبع رسمی پیدا شد."}'];
assert.match(await runResearchAgent({AI:{run:async()=>({response:decisions.shift()})}},'این صفحه را بخوان: https://example.org/a'),/منبع رسمی/);
assert.equal(decisions.length,0);
assert.ok(calls.filter(call=>call.method==='tools/call').every(call=>['web_search_exa','web_fetch_exa'].includes(call.params.name)));
globalThis.fetch = saved;
console.log('Exa MCP read-only tools and SSE transport hold');
