// Read-only credential checks inside GitHub Actions. Never exports the secret.
import {pathToFileURL} from 'node:url';

export async function inspectElevenLabsKey({env=process.env,fetchImpl=fetch}={}) {
  const names=['ELEVENLABS_API_KEY','ELEVEN_LABS_API_KEY','ELEVEN_API_KEY'];
  const source=names.find(name=>typeof env[name]==='string'&&env[name].trim());
  const report={provider:'elevenlabs',credential_present:Boolean(source),credential_source:source||null,
    authentication:'not_checked',generation_enabled:false,paid_requests_sent:0,checks:{}};
  if(!source){report.authentication='missing';return report;}
  const key=env[source].trim();
  for(const [name,path] of [['subscription','/v1/user/subscription'],['image','/v1/flows/image?page_size=1'],['video','/v1/flows/video?page_size=1']]) {
    let response;
    try {
      response=await fetchImpl('https://api.elevenlabs.io'+path,{
        method:'GET',redirect:'error',headers:{'xi-api-key':key},signal:AbortSignal.timeout(20000)});
    } catch {
      report.checks[name]={status:'network_error'};
      continue;
    }
    const check={http_status:response.status,status:response.ok?'accessible':
      response.status===401?'unauthorized':response.status===403?'permission_denied':
      response.status===402?'paid_plan_required':response.status===429?'rate_limited':'provider_error'};
    if(name==='subscription'&&response.ok) {
      try {
        const body=await response.json();
        // Return only a recognised tier, never account identifiers, quota or raw errors.
        const tier=body?.tier;
        if(['free','starter','creator','pro','scale','business','enterprise'].includes(tier))check.tier=tier;
      } catch {check.status='invalid_response';}
    }
    report.checks[name]=check;
  }
  const statuses=Object.values(report.checks);
  report.authentication=statuses.some(check=>check.status==='accessible')?'accepted':
    statuses.some(check=>check.http_status===401)?'rejected':'not_verified';
  report.media_read_access=report.checks.image?.status==='accessible'&&report.checks.video?.status==='accessible';
  report.note='GET-only checks. Media listing does not prove permission to generate, free quota, or remaining credits. GitHub Secrets remain in GitHub Actions, not in the Codex cloud environment.';
  return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const report=await inspectElevenLabsKey();
  console.log(JSON.stringify(report,null,2));
  if(report.authentication!=='accepted'||!report.media_read_access)process.exitCode=1;
}
