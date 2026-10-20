import assert from 'node:assert/strict';
import {decision, needsResearchAgent, runResearchAgent} from './src/research-agent.js';
import {handleAssistantTool, githubRunJobs} from './src/assistant-tools.js';

assert.equal(needsResearchAgent('فایل README را پیدا کن و توضیح بده'),true);
assert.equal(needsResearchAgent('فایل را ویرایش کن'),false);
assert.equal(needsResearchAgent('سلام'),false);
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
assert.match(await handleAssistantTool(env,'/jobs 123'),/Install deps/);
await assert.rejects(githubRunJobs(env,'123abc'));

const diagnosis = [
  '{"tool":"github_runs","arg":""}',
  '{"tool":"github_run_jobs","arg":"123"}',
  '{"tool":"final","answer":"اجرا در مرحلهٔ نصب وابستگی شکست خورد."}',
];
const diagnosticEnv = {...env,AI:{run:async()=>({response:diagnosis.shift()})}};
assert.match(await runResearchAgent(diagnosticEnv,'چرا آخرین اجرای GitHub شکست خورد؟'),/نصب وابستگی/);
assert.equal(diagnosis.length,0,'agent inspects the actual failed job before answering');

globalThis.fetch = savedFetch;
console.log('bounded multi-step research and live run lookup hold');
