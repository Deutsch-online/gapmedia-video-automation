import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=mkdtempSync(join(tmpdir(),'mausbot-bridge-test-'));
const hook=join(root,'fixture.mjs');
writeFileSync(hook,`
import cp from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {appendFileSync} from 'node:fs';
const log=(type,value)=>appendFileSync(process.env.FIXTURE_LOG,JSON.stringify({type,value})+'\\n');
globalThis.fetch=async(url,options={})=>{
 if(String(url).endsWith('/tasks'))return Response.json({tasks:[{id:'u0000000000000123',text:'Inspect only; \\'; do not run a shell',created_at:1}]});
 if(String(url).endsWith('/result')){log('result',JSON.parse(options.body));return Response.json({ok:true,message_id:88});}
 if(String(url).endsWith('/heartbeat'))return Response.json({ok:true});
 throw Error('Unexpected network request');
};
cp.spawnSync=(command,args,options)=>{
 if(command!=='fixture-mausbot'||options.shell!==false)throw Error('Unsafe CLI invocation');
 if(args[0]==='send'){
  log('send',args);
  if(process.env.FIXTURE_MODE==='crash')process.exit(97);
  if(process.env.FIXTURE_MODE==='unknown')return {status:1,stdout:'lost'};
  return {status:0,stdout:JSON.stringify({success:true,taskId:'fixture-task'})};
 }
 if(args[0]==='wait')return {status:0,stdout:JSON.stringify({status:'completed',job:{state:'completed'},messages:[{role:'bot',text:'Verified report.'}]})};
 throw Error('Unexpected command');
};syncBuiltinESMExports();
`);
const cli=new URL('./mausbot-telegram-bridge.mjs',import.meta.url).pathname;
function scenario(name,mode){
 const dir=join(root,name);const setup=spawnSync(process.execPath,['-e',`require('fs').mkdirSync(${JSON.stringify(dir)},{recursive:true})`]);assert.equal(setup.status,0);
 writeFileSync(join(dir,'state.json'),JSON.stringify({url:'https://fixture.test',token:'b'.repeat(64)}));
 const log=join(dir,'calls.jsonl');
 const run=current=>spawnSync(process.execPath,['--import',hook,cli,'once'],{encoding:'utf8',env:{...process.env,MAUSBOT_BRIDGE_DIR:dir,MAUSBOT_CLI:'fixture-mausbot',FIXTURE_LOG:log,FIXTURE_MODE:current}});
 let result=run(mode);
 if(mode==='crash'){
  assert.equal(result.status,97);
  assert.notEqual(run('complete').status,0,'existing crashed-listener lock must not be stolen');
  // Simulate an operator checking that the crashed listener is gone and reconciling its lock.
  unlinkSync(join(dir,'listener.lock'));
  result=run('complete');
 }
 assert.equal(result.status,0,result.stderr);
 assert.equal(run('complete').status,0);
 const calls=readFileSync(log,'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(calls.filter(x=>x.type==='send').length,1,'delivery repetition or restart cannot submit the same task again');
 const reports=calls.filter(x=>x.type==='result');assert.equal(reports.length,1);
 assert.equal(reports[0].value.status,mode==='complete'?'completed':'uncertain');
}
try{scenario('completed','complete');scenario('unknown','unknown');scenario('crashed','crash');console.log('Local bridge submission, durable crash intent and repeated queue delivery verified without network or model calls');}
finally{rmSync(root,{recursive:true,force:true});}
