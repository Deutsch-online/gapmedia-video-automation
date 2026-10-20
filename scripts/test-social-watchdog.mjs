import assert from 'node:assert/strict';
import {checkMonitor} from './social-watchdog.mjs';

const current=new Date().toISOString();
const state={last_attempt:current,last_completed:current,next_due:new Date(Date.now()+3600000).toISOString(),status:'limited_access'};
const result=await checkMonitor({token:'secret',githubToken:'gh',fetchImpl:async(url)=>{
  if(url.endsWith('/health'))return Response.json({worker:true,telegramTokenValid:true,webhookConfigured:true});
  if(url.endsWith('/monitor-health'))return Response.json(state);
  if(url.includes('/jobs?'))return Response.json({jobs:[{steps:[{name:'Make and check episode',conclusion:'failure'}]}]});
  return Response.json({workflow_runs:[{id:123,status:'completed',conclusion:'failure',html_url:'https://github.com/o/r/actions/runs/123'}]});
}});
assert.equal(result.problems.length,1,'missing OAuth alone is not reported as a broken Worker');
assert.match(result.problems[0],/Make and check episode/);
assert.ok(!JSON.stringify(result).includes('secret'));
const down=await checkMonitor({fetchImpl:async()=>{throw new Error('Network unavailable');}});
assert.ok(down.problems.some(item=>item.includes('دسترسی به Worker')));
console.log('independent watchdog distinguishes access blockers from service failure and reports actual failed steps');
