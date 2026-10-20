// Venice is optional. No inference on paid/unknown pricing, gifts or DIEM.
const BASE='https://api.venice.ai/api/v1';
export function zeroPriceModels(catalog) {
  return (catalog?.data||[]).filter(m=>{
    const p=m.model_spec?.pricing;
    return m.type==='text'&&m.model_spec?.offline!==true&&typeof p?.input?.usd==='number'&&p.input.usd===0&&typeof p?.output?.usd==='number'&&p.output.usd===0&&Object.values(p).every(rate=>typeof rate?.usd==='number'&&rate.usd===0);
  }).map(m=>m.id).filter(id=>typeof id==='string'&&/^[\w./-]{1,150}$/.test(id));
}
export function nonBillableFreeTier(account) {
  const data=account?.data;
  const balances=data?.balances;
  // Require an explicit free, non-charged tier AND no spendable balance.
  return data?.accessPermitted===true&&data.apiTier?.id==='free'&&data.apiTier.isCharged===false&&balances&&
    typeof balances.USD==='number'&&balances.USD===0&&typeof balances.DIEM==='number'&&balances.DIEM===0&&
    Object.values(balances).every(value=>typeof value==='number'&&value===0);
}
async function json(path,key) {
  const response=await fetch(BASE+path,{headers:{accept:'application/json',...(key?{authorization:'Bearer '+key}:{})},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Venice metadata HTTP '+response.status);
  return response.json();
}
export async function veniceStatus(env) {
  let catalog;
  try{catalog=await json('/models');}catch{return {configured:Boolean(env.VENICE_API_KEY),status:'unavailable',eligible_models:[],reason:'فهرست زندهٔ Venice خوانده نشد؛ درخواست تولید اجرا نمی‌شود.'};}
  const zero=zeroPriceModels(catalog);
  if(!env.VENICE_API_KEY)return {configured:false,status:'missing_key',catalog_text_models:(catalog.data||[]).filter(m=>m.type==='text').length,zero_price_models:zero.length,eligible_models:[],reason:'کلید VENICE_API_KEY در Secretهای Worker تنظیم نشده است. نشانی API به‌تنهایی کلید نیست.'};
  let account;
  try{account=await json('/api_keys/rate_limits',env.VENICE_API_KEY);}catch{return {configured:true,status:'account_unverified',zero_price_models:zero.length,eligible_models:[],reason:'وضعیت پلن و عدم هزینهٔ حساب تأیید نشد؛ تولید اجرا نمی‌شود.'};}
  if(account.data?.accessPermitted!==true)return {configured:true,status:'access_denied',eligible_models:[],reason:'Venice دسترسی این کلید را تأیید نکرد.'};
  let eligible=zero;
  let basis='zero_published_token_prices';
  if(!eligible.length&&nonBillableFreeTier(account)){
    const allowed=new Set((account.data.rateLimits||[]).filter(m=>(m.rateLimits||[]).some(limit=>typeof limit.amount==='number'&&limit.amount>0)).map(m=>m.apiModelId));
    eligible=(catalog.data||[]).filter(m=>m.type==='text'&&m.model_spec?.offline!==true&&allowed.has(m.id)).map(m=>m.id);
    basis='explicit_non_billed_free_tier_with_zero_balances';
  }
  return {configured:true,status:eligible.length?'eligible_free':'no_verified_free_access',zero_price_models:zero.length,eligible_models:eligible,basis:eligible.length?basis:null,
    reason:eligible.length?'گزینهٔ بدون هزینه تأیید شد؛ فقط به‌عنوان جایگزین بات استفاده می‌شود.':'مدل صفرقیمت یا سهمیهٔ صریحِ بدون هزینه تأیید نشد. اعتبار هدیه، موجودی پولی و DIEM خودکار مصرف نمی‌شود.'};
}
export function formatVeniceStatus(status) {
  return `Venice: ${status.configured?'کلید تنظیم شده':'کلید تنظیم نشده'}.\n${status.reason}\nگزینه‌های مجاز: ${status.eligible_models.length}${status.eligible_models.length?'\n'+status.eligible_models.slice(0,6).join('، '):''}`;
}
export async function runAssistantAI(env,model,request) {
  let primaryError;
  try{return await env.AI.run(model,request);}catch(error){primaryError=error;}
  if(!env.VENICE_API_KEY)throw primaryError;
  const status=await veniceStatus(env);
  for(const selected of status.eligible_models.slice(0,3)){
    try{
      const response=await fetch(BASE+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+env.VENICE_API_KEY,'content-type':'application/json'},
        body:JSON.stringify({model:selected,messages:request.messages,max_tokens:Math.min(1500,request.max_tokens||650),temperature:request.temperature??0.2,stream:false}),signal:AbortSignal.timeout(25000)});
      if(!response.ok)continue;
      const result=await response.json();
      const content=result.choices?.[0]?.message?.content;
      if(typeof content==='string'&&content.trim())return {response:content};
    }catch{/* Try the next verified eligible model, never a paid sibling. */}
  }
  throw new Error('مدل اصلی پاسخ نداد و گزینهٔ رایگان Venice نیز قابل استفاده نبود؛ اعتبار مصرف نشد.');
}
