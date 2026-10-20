import assert from 'node:assert/strict';
import {decision, needsResearchAgent, runResearchAgent} from './src/research-agent.js';
import {handleAssistantTool, githubRunJobs} from './src/assistant-tools.js';

assert.equal(needsResearchAgent('فایل README را پیدا کن و توضیح بده'),true);
assert.equal(needsResearchAgent('فایل را ویرایش کن'),false);
assert.equal(needsResearchAgent('سلام'),true,'all ordinary chat reaches the conversational router');
assert.equal(decision('{"tool":"github_edit","arg":"README.md"}'),null,'agent cannot invent write tools');

const savedFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({url:String(url),init});
  if (String(url).includes('/git/trees/main')) return Response.json({tree:[{type:'blob',path:'README.md'}]});
  if (String(url).includes('/contents/README.md')) return Response.json({encoding:'base64',size:18,sha:'one',content:btoa('Actual project goal')});
  if (String(url).includes('/actions/runs/123/jobs')) return Response.json({jobs:[{name:'Build',status:'completed',conclusion:'failure',steps:[{name:'Install deps',conclusion:'failure'}]}]});
  if (String(url).includes('/actions/runs')) return Response.json({workflow_runs:[{id:123,name:'Build',status:'completed',conclusion:'failure',html_url:'https://github.com/o/r/actions/runs/123'}]});
  throw new Error('unexpected fetch');
};

const plans = [
  '{"tool":"github_find","arg":"README"}',
  '{"tool":"github_read","arg":"README.md"}',
  '{"tool":"final","answer":"این پروژه برای هدف ذکرشده در README است."}',
];
const env = {GITHUB_TOKEN:'test',GITHUB_OWNER:'o',GITHUB_REPO:'r',AI:{run:async()=>({response:plans.shift()})}};
const answer = await runResearchAgent(env,'فایل README را پیدا کن و توضیح بده');
assert.match(answer,/README\.md/);
assert.match(answer,/هدف ذکرشده/);
assert.equal(plans.length,0,'agent takes two read steps then answers');
assert.ok(calls.every(call=>!call.init.method || call.init.method==='GET'),'research agent is read only');
assert.match(await handleAssistantTool(env,'/runs'),/Build/);
const jobReport=await handleAssistantTool(env,'/jobs 123');
assert.match(jobReport,/Install deps/);
assert.match(jobReport,/کمک بیرونی رایگان/);
assert.ok(calls.some(call=>call.url==='https://mcp.exa.ai/mcp'),'failed jobs attempt external keyless consultation');
await assert.rejects(githubRunJobs(env,'123abc'));
const beforeChat=calls.length;
assert.match(await runResearchAgent({AI:{run:async()=>({response:'{"tool":"final","answer":"سلام! چگونه کمک کنم؟"}'})}},'سلام'),/سلام/);
assert.equal(calls.length,beforeChat,'ordinary conversation answers without needless web or repository calls');

const diagnosis = [
  '{"tool":"github_runs","arg":""}',
  '{"tool":"github_run_jobs","arg":"123"}',
  '{"tool":"final","answer":"اجرا در مرحلهٔ نصب وابستگی شکست خورد."}',
];
const diagnosticEnv = {...env,AI:{run:async()=>({response:diagnosis.shift()})}};
assert.match(await runResearchAgent(diagnosticEnv,'چرا آخرین اجرای GitHub شکست خورد؟'),/نصب وابستگی/);
assert.equal(diagnosis.length,0,'agent inspects the actual failed job before answering');

const alternateSteps=['{"tool":"mcp_exa_search","arg":"official GitHub documentation"}','{"tool":"final","answer":"منبع رسمی از جست‌وجوی جایگزین پیدا شد."}'];
let alternateCalled=false;
globalThis.fetch=async(url)=>{
  if(String(url).includes('mcp.exa.ai'))throw new Error('MCP unavailable');
  if(String(url).includes('duckduckgo.com')){alternateCalled=true;return new Response('<a class="result__a" href="https://docs.github.com/en/actions">Official Actions docs</a>');}
  throw new Error('Unexpected request');
};
const alternate=await runResearchAgent({AI:{run:async()=>({response:alternateSteps.shift()})}},'در وب درباره GitHub بررسی کن');
assert.ok(alternateCalled,'unavailable MCP automatically tries the next free web tool');
assert.match(alternate,/جایگزین/);
globalThis.fetch = savedFetch;
console.log('bounded multi-step research and live run lookup hold');
