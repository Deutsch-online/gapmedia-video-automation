// External consultation uses fixed public queries only: never logs, chat,
// repository contents, credentials or model-selected provider endpoints.
import {mcpExaSearch} from './mcp-tools.js';

const TOPICS = [
  ['kv', /namespace|10041|\bKV\b/i, 'site:developers.cloudflare.com workers KV namespace not found 10041', 'شناسهٔ KV و حساب Cloudflare را تطبیق دهید؛ اجرای دوباره به‌تنهایی این خطا را رفع نمی‌کند.'],
  ['quota', /quota|ZeroGPU|GPU|429|سهمیه/i, 'site:huggingface.co/docs hub spaces zerogpu quotas', 'سهمیه و زمان مجاز اجرای بعد بررسی شود؛ سرویس پولی جایگزین نشود.'],
  ['dependencies', /install|npm|dependenc|نصب/i, 'site:docs.npmjs.com cli npm ci package lock errors', 'همخوانی lockfile و نسخهٔ Node بررسی شود؛ تغییر وابستگی ابتدا باید آزمایش شود.'],
  ['oauth', /oauth|scope|access.token|مجوز/i, 'site:developers.tiktok.com oauth scopes access token errors', 'مجوز و اتصال رسمی حساب بررسی شود؛ توکن یا رمز در گفتگو ارسال نشود.'],
  ['workflow', /./s, 'site:docs.github.com actions troubleshooting workflow failures failed steps', 'مرحله و لاگ واقعی بررسی شود؛ فقط خطای موقت با همان گیت‌ها و بودجهٔ مجاز قابل تکرار است.'],
];
const HOSTS = new Set(['developers.cloudflare.com','huggingface.co','docs.npmjs.com','docs.github.com','developers.tiktok.com','developers.facebook.com']);

export function diagnosticTopic(evidence) {
  const value = String(evidence || 'unknown').slice(0,12000);
  const [id,,query,advice] = TOPICS.find(([,pattern])=>pattern.test(value));
  return {id,query,advice};
}

export function officialReferences(raw) {
  const result=[];
  for(const match of String(raw || '').matchAll(/https:\/\/[^\s<>"')\]]+/g)) {
    try {
      const url=new URL(match[0].replace(/[.,;]+$/,''));
      if(HOSTS.has(url.hostname)&&!url.username&&!url.password&&!url.search&&!url.hash&&!result.includes(url.href))result.push(url.href);
    }catch{}
  }
  return result.slice(0,3);
}

export async function consultFreeTools(evidence,{search=mcpExaSearch,kv,now=Date.now()}={}) {
  const topic=diagnosticTopic(evidence);
  const key='free-diagnosis:'+topic.id;
  try {
    const cached=await kv?.get(key,'json');
    if(cached?.checked_at&&now-Date.parse(cached.checked_at)<6*3600000)return cached;
  }catch{/* Cache failure must not block diagnostics. */}
  let references=[];
  let status='unavailable';
  try {
    references=officialReferences(await search(topic.query));
    status=references.length?'references_found':'no_official_reference';
  }catch{/* No paid or credentialed fallback. */}
  const report={topic:topic.id,status,references,advice:topic.advice,checked_at:new Date(now).toISOString(),source:'keyless-exa-mcp',repair_executed:false};
  try{await kv?.put(key,JSON.stringify(report),{expirationTtl:21600});}catch{}
  return report;
}

export function formatConsultation(report) {
  return '\nکمک بیرونی رایگان: '+(report.status==='references_found'?'مستندات رسمی پیدا شد؛ هنوز علت یا رفع خطا تأیید نشده.':'پاسخ مستند قابل اتکا دریافت نشد؛ جایگزین پولی اجرا نشد.')+'\n'+report.advice+(report.references.length?'\n'+report.references.join('\n'):'');
}
