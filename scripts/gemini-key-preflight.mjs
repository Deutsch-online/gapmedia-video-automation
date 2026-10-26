// Credential/model lookup only. Never performs generation, uploads or billing changes.
import {pathToFileURL} from 'node:url';
export async function inspectGeminiKey({env=process.env,fetchImpl=fetch,probeVideoModels=true}={}){
 const key=env.GEMINI_API_KEY||env.GOOGLE_API_KEY;
 const report={credential_present:Boolean(key),authentication:'not_checked',generation_enabled:false,free_tier_verified:false,billing_verified:false,models:{video:[],image:[],multimodal:[]}};
 if(!key){report.authentication='missing';return report;}
 let token='';
 for(let page=0;page<10;page++){
  let response;
  try{response=await fetchImpl('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100'+(token?'&pageToken='+encodeURIComponent(token):''),{method:'GET',headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(20000)});}
  catch{report.authentication='network_error';return report;}
  report.http_status=response.status;
  // Raw errors may echo credentials or request details; do not log them.
  if(!response.ok){report.authentication=response.status===429?'rate_limited':response.status===401||response.status===403||response.status===400?'rejected':'provider_error';return report;}
  let data;try{data=await response.json();}catch{report.authentication='invalid_response';return report;}
  if(!Array.isArray(data.models)){report.authentication='invalid_response';return report;}
  for(const model of data.models){
   if(!/^models\/[a-z0-9._-]{1,120}$/i.test(model.name||''))continue;
   const name=model.name.slice(7);const group=/veo/i.test(name)?'video':/imagen|image/i.test(name)?'image':/^gemini/i.test(name)?'multimodal':null;
   if(group&&!report.models[group].includes(name))report.models[group].push(name);
  }
  report.authentication='accepted';
  if(!data.nextPageToken)break;
  if(typeof data.nextPageToken!=='string'||data.nextPageToken.length>2000){report.authentication='invalid_response';break;}
  token=data.nextPageToken;
 }
 if(probeVideoModels&&report.authentication==='accepted'){
  report.video_model_checks=[];
  for(const name of ['veo-3.1-lite-generate-preview','veo-3.1-fast-generate-preview','veo-3.1-generate-preview','veo-2.0-generate-001']){
   try{const response=await fetchImpl('https://generativelanguage.googleapis.com/v1beta/models/'+name,{method:'GET',headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(15000)});const check={name,http_status:response.status};if(response.ok){const m=await response.json();check.generation_method_listed=Array.isArray(m.supportedGenerationMethods)&&m.supportedGenerationMethods.includes('predictLongRunning');if(check.generation_method_listed&&!report.models.video.includes(name))report.models.video.push(name);}report.video_model_checks.push(check);}
   catch{report.video_model_checks.push({name,status:'network_error'});}
  }
 }
 report.note='Model visibility is not proof of free quota or generation permission. No content was generated.';
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const report=await inspectGeminiKey();console.log(JSON.stringify(report,null,2));if(report.authentication!=='accepted')process.exitCode=1;}
