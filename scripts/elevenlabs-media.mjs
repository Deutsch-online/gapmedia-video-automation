// Use the repository secret in-place; never print prompts, keys or signed URLs.
import {execFile} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

function runFile(args,options,input) {
  return new Promise((resolve,reject)=>{
    const child=execFile('elevenlabs',args,options,(error,stdout)=>error?reject(error):resolve({stdout}));
    child.stdin.on('error',()=>{});
    child.stdin.end(input);
  });
}
const operations=new Set(['validate-image','validate-video','submit-image','submit-video','status-image','status-video']);

export async function runElevenLabsMedia({operation='validate-image',requestJson='{}',generationId='',allowPaid=false,
  env=process.env,execute=runFile}={}) {
  if(!operations.has(operation))throw Error('Unsupported operation.');
  const [action,modality]=operation.split('-');
  if(action==='submit'&&allowPaid!==true)throw Error('Paid submission was not explicitly enabled; no request was sent.');
  let request;
  if(action==='status') {
    if(!/^[A-Za-z0-9_-]{1,160}$/.test(generationId))throw Error('A valid generation ID is required.');
  } else {
    try{request=JSON.parse(requestJson);}catch{throw Error('request_json must be JSON.');}
    if(!request||typeof request!=='object'||Array.isArray(request)||typeof request.model_id!=='string')throw Error('A model_id is required.');
    if('webhook' in request)throw Error('This manual workflow uses status polling, not webhook delivery.');
  }
  const key=env.ELEVENLABS_API_KEY||env.ELEVEN_API_KEY||env.ELEVEN_LABS_API_KEY;
  if(action!=='validate'&&!key)throw Error('ElevenLabs repository secret is missing.');
  const childEnv={...env,ELEVENLABS_TELEMETRY:'off',DO_NOT_TRACK:'1'};
  if(key)childEnv.ELEVENLABS_API_KEY=key;
  const common=['flows',modality,action==='status'?'get':'create','--no-retry','--format','json'];
  if(action==='status')common.push('--generation-id',generationId);
  // Body goes to stdin via a bounded child, not shell arguments or logs.
  async function call(dryRun) {
    const args=[...common];
    if(dryRun)args.push('--dry-run');
    if(action!=='status')args.push('--json','-');
    try {
      const {stdout}=await execute(args,{env:childEnv,timeout:90000,maxBuffer:4*1024*1024},
        action==='status'?'':JSON.stringify(request));
      return JSON.parse(stdout);
    } catch {
      throw Error(action==='submit'&&!dryRun?
        'Submission outcome is uncertain. Do not retry automatically; check existing generations first.':
        'ElevenLabs check failed. Check account entitlement, key permissions, and model parameters.');
    }
  }
  if(action!=='status') {
    await call(true);
    if(action==='validate')return {provider:'elevenlabs',modality,validated:true,paid_requests_sent:0};
  }
  const result=await call(false);
  // No content URLs, request body, account identifiers or error text enter logs.
  const report={provider:'elevenlabs',modality,operation};
  if(typeof result.id==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(result.id))report.generation_id=result.id;
  if(['pending','generating','completed','failed'].includes(result.status))report.status=result.status;
  if(action==='submit'&&!report.generation_id)throw Error('Submission returned no recognised ID. Do not retry automatically.');
  return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
    const input=event.inputs||{};
    const report=await runElevenLabsMedia({operation:input.operation,requestJson:input.request_json,
      generationId:input.generation_id,allowPaid:input.allow_paid_generation==='true'});
    console.log(JSON.stringify(report,null,2));
  } catch(error) {
    console.error(error.message);
    process.exitCode=1;
  }
}
