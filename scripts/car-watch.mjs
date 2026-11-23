import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {webSearch} from '../lib/web-search.mjs';
import {mcpExaSearch} from '../worker/src/mcp-tools.js';
import {sendMessage} from '../lib/telegram.mjs';
import {botChatIdFrom} from '../lib/bot-chat.mjs';

const HEADERS={'user-agent':'Mozilla/5.0 (compatible; FamilyCarWatch/2.0; personal car research)','accept':'text/html,application/xhtml+xml'};
export const REGIONS=['Burg Magdeburg Schönebeck','Stendal Gardelegen Salzwedel','Brandenburg an der Havel Potsdam','Halle Dessau Brehna','Braunschweig Wolfsburg'];

export const MODELS=['Toyota Avensis Kombi 1.8 Benzin','Toyota Avensis Kombi 2.0 Diesel','Toyota Avensis Kombi 2.2 Diesel'];
export function searchQueries(region){
  // The shared Exa client truncates at 250 characters. Keep location first and
  // search each model separately so neither geography nor models disappear.
  return MODELS.map(model=>region+' '+model+' gebraucht bis 6500 Euro ab 2011 bis 200000 km TÜV Scheckheft');
}
export function coverageHealth({searched,discovered,read,outcomes}){
  const parsed=outcomes.filter(x=>x.evaluated).length;
  return {healthy:searched>0&&read>=3&&parsed>=1,parsed,
    reason:read<3?'too few original pages readable':parsed<1?'no original vehicle data parsed':searched<1?'search unavailable':'ok'};
}

const ALLOWED=new Set(['suchen.mobile.de','m.mobile.de','www.autoscout24.de','www.kleinanzeigen.de']);
export function listingUrl(raw){
  try{const u=new URL(raw);if(u.protocol!=='https:'||!ALLOWED.has(u.hostname))return null;
  if(!(/\/auto-inserat\/|\/angebote\/|\/s-anzeige\/|\/fahrzeuge\/details/.test(u.pathname)))return null;
  for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_'))u.searchParams.delete(k);
  return u.href;}catch{return null;}
}

export function discoveryLead(raw){
  // Avensis 2011+ only: raw links cannot bypass year, condition and route gates.
  return null;
}
export function leadMessage(leads){
  return 'لینک آگهی‌های مرتبط برای بررسی اولیه — پیشنهاد خرید نیست\n'+
    'خواندن کامل مشخصات ممکن نشد. قیمت زیر ۶۵۰۰€، کارکرد، سال، زنجیر، HU، وضعیت فروش و فاصلهٔ حداکثر۱۵۰ کیلومتر هنوز تأیید نشده‌اند.\n\n'+
    leads.map((lead,i)=>(i+1)+'. '+lead.title+'\n'+lead.url).join('\n\n');
}

export function objects(html){
  const found=[];
  function walk(v){if(!v||typeof v!=='object')return;if(Array.isArray(v)){v.forEach(walk);return;}
    if([].concat(v['@type']||[]).some(t=>/^(Car|Vehicle)$/.test(t)))found.push(v);
    if(v['@graph'])walk(v['@graph']);}
  for(const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
    try{walk(JSON.parse(m[1]));}catch{}
  return found;
}
const number=v=>{if(typeof v==='object')v=v?.value;const n=Number(v);return Number.isFinite(n)?n:null;};
export function evaluate(v,url,now=new Date()){
  const reject=reason=>({ok:false,reason});
  const offer=Array.isArray(v.offers)?v.offers[0]:v.offers;
  if(!offer||offer.priceCurrency!=='EUR')return reject('unknown full EUR price');
  const price=number(offer.price);if(!(price>0&&price<=6500))return reject('price');
  if(!/InStock|OnlineOnly|LimitedAvailability$/.test(offer.availability||''))return reject('availability unknown');
  const mileage=number(v.mileageFromOdometer);
  if(!(mileage>0&&mileage<=200000)||!/^KMT$|^km$/i.test(v.mileageFromOdometer?.unitCode||v.mileageFromOdometer?.unitText||''))return reject('mileage');
  const name=String(v.name||'');
  const body=String(v.bodyType||'');
  const estate=/kombi|estate|station.?wagon|touring sports|sportswagon|\bcw\b|\bsw\b/i.test(name+' '+body);
  if(v.seatingCapacity!=null&&number(v.seatingCapacity)!==5)return reject('seats');
  const e=v.vehicleEngine||{},power=number(e.enginePower);
  const unit=String(e.enginePower?.unitCode||e.enginePower?.unitText||'');
  const ps=/KWT|kW/i.test(unit)?Math.round(power*1.35962):/PS|hp/i.test(unit)?power:null;
  if(!(ps>=94&&ps<=180))return reject('power');
  const cc=number(e.engineDisplacement);
  const fuel=String(v.fuelType||e.fuelType||'');
  const diesel=/diesel/i.test(fuel),petrol=/benzin|petrol|gasoline|hybrid/i.test(fuel);
  if(!diesel&&!petrol)return reject('fuel unknown');
  if(!diesel&&/turbo|T.?GDI|TSI|TFSI|EcoBoost/i.test(name))return reject('turbo petrol or conflicting title');
  const registration=String(v.dateVehicleFirstRegistered||'');
  if(!/^\d{4}-\d{2}/.test(registration)||new Date(registration)>now)return reject('registration unknown');
  const year=Number(registration.slice(0,4));
  if(year<2011)return reject('year before2011');
  if(!/avensis/i.test(name))return reject('Avensis only');
  if(diesel&&!/avensis/i.test(name))return reject('diesel model outside shortlist');
  const manual=/manual|schalt/i.test(String(v.vehicleTransmission||''));
  const chain=(/corolla/i.test(name)&&estate&&cc===1598&&ps===124)||
    (/jazz/i.test(name)&&cc===1318&&ps===102)||
    (/yaris/i.test(name)&&cc===1329&&ps===99)||
    (/i30/i.test(name)&&estate&&cc===1396&&ps===109)||
    (/cee.?d/i.test(name)&&estate&&cc===1396&&ps===109)||
    (/insight/i.test(name)&&cc===1339&&[98,102].includes(ps)&&/hybrid/i.test(fuel+' '+name))||
    (/swift/i.test(name)&&cc===1242&&ps===94)||
    (/avensis/i.test(name)&&estate&&cc===1798&&ps===147)||
    (/avensis/i.test(name)&&estate&&diesel&&year>=2010&&year<=2015&&((cc===1998&&[124,126].includes(ps))||(cc===2231&&[150,177].includes(ps))));
  if(!chain)return reject('not an allowed chain engine/body/transmission variant');
  const description=String(v.description||'');
  if(!/unfallfrei|keine(?: bekannten)? (?:technischen )?mängel|technisch (?:einwandfrei|mängelfrei)/i.test(description))return reject('no explicit accident-free or fault-free seller claim');
  // Negated defect words are intentionally conservative: false exclusions are preferable to recommending faults.
  if(/motorschaden|getriebeschaden|unfallschaden|unfallwagen|bastler|nicht fahrbereit|ölverbrauch|DPF.{0,30}(voll|defekt)|nur.{0,20}(export|gewerb)|reparierter unfallschaden/i.test(description))return reject('disclosed fault');
  if(!(v.serviceHistory===true||/scheckheft(?:gepflegt)?|serviceheft|service history/i.test(description))||/kein.{0,12}scheckheft|ohne.{0,12}scheckheft/i.test(description))return reject('service book not evidenced');
  const co2=number(v.carbonDioxideEmissions);
  const taxKnown=co2!==null&&co2>0;
  let carbon=0;
  if(year<2021)carbon=Math.max(0,co2-(year<=2011?120:year<=2013?110:95))*2;
  else {let previous=95;for(const [upper,rate] of [[115,2],[135,2.2],[155,2.5],[175,2.9],[195,3.4],[Infinity,4]]){carbon+=Math.max(0,Math.min(co2,upper)-previous)*rate;previous=upper;}}
  const tax=taxKnown?Math.floor(Math.ceil(cc/100)*(diesel?9.5:2)+carbon):null;

  const hu=description.match(/(?:HU|TÜV|AU)[^\d]{0,18}(0[1-9]|1[0-2])[.\/ -](20\d{2})/i);
  if(!hu||Number(hu[2])<2027||new Date(Number(hu[2]),Number(hu[1]),0)<now)return reject('HU unknown or expired');
  if(diesel&&!/(?:plakette|umweltplakette)[^.!\n]{0,35}(?:grün|gruen|green)/i.test(description))return reject('diesel green sticker not evidenced');
  return {ok:true,name,price,mileage,ps,cc,fuel,registration,tax,hu:hu[1]+'/'+hu[2],url,
    gearbox:String(v.vehicleTransmission||'نامعلوم'),address:offer.seller?.address||v.seller?.address,
    seller:offer.seller?.name||v.seller?.name||'نامعلوم'};
}
async function get(url){const r=await fetch(url,{headers:HEADERS,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return r;}
export async function roadDistance(address,fetchJson=async url=>(await get(url)).json()){
  if(!address?.streetAddress||!address?.postalCode||!address?.addressLocality)throw Error('exact seller address missing');
  const query=[address.streetAddress,address.postalCode,address.addressLocality,'Germany'].join(', ');
  const places=await fetchJson('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=de&q='+encodeURIComponent(query));
  const p=places[0];if(!p||!Number.isFinite(Number(p.lon))||!Number.isFinite(Number(p.lat)))throw Error('geocode missing');
  // Burg town centre, NOT the user's unknown street address.
  const route=await fetchJson('https://router.project-osrm.org/route/v1/driving/11.854,52.272;'+p.lon+','+p.lat+'?overview=false');
  if(route.code!=='Ok'||!(route.routes?.[0]?.distance>0))throw Error('route missing');
  return {km:Math.ceil(route.routes[0].distance/1000),source:'OSRM/OSM؛ از مرکز Burg bei Magdeburg تا نشانی فروشنده'};
}
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export async function run(){
  const token=process.env.TELEGRAM_BOT_TOKEN,chatId=botChatIdFrom(process.env);
  if(!token||!chatId)throw Error('Telegram token/private destination missing');
  const chat=await(await get('https://api.telegram.org/bot'+token+'/getChat?chat_id='+encodeURIComponent(chatId))).json();
  if(!chat.ok||chat.result?.type!=='private')throw Error('Private Telegram destination required');
  mkdirSync('.car-watch',{recursive:true});
  const file='.car-watch/sent.json';
  const state=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{sent:{}};
  if(!state.sent||typeof state.sent!=='object')throw Error('Invalid dedupe state');
  const urls=new Set(),leads=new Map(),coverage=[];let searched=0,read=0,leadLinksSent=0;
  state.leads=state.leads||{};
  if(state.profile!=='avensis-only-2011-v1'){
    const result=await sendMessage({token,chatId,disablePreview:true,text:
      'جستجوی بات تغییر کرد: فقط Toyota Avensis کُمبی مدل ۲۰۱۱ به بعد، تا ۶۵۰۰ یورو، حداکثر۲۰۰هزار کیلومتر، فاصلهٔ جاده‌ای تا۱۵۰ کیلومتر از بورگ، موتور زنجیری، HU معتبر حداقل۲۰۲۷ و سابقهٔ سرویس. آگهی دارای عیب اعلام‌شده یا مشخصات ناکافی ارسال نمی‌شود. سلامت واقعی نیاز به معاینه دارد؛ فعلاً گزینهٔ مطابق شرایط تأیید نشده است.'});
    if(!result.ok)throw Error('Profile Telegram delivery failed');
    state.profile='avensis-only-2011-v1';
    console.log('Avensis-only profile delivered to verified private Telegram');
  }
  writeFileSync(file,JSON.stringify(state,null,2));
  for(const region of REGIONS){
    for(const query of searchQueries(region)){
      try{
        const text=await mcpExaSearch(query);
        searched++;coverage.push({region,query,status:'searched'});
        for(const m of text.matchAll(/https:\/\/[^\s<>"\])]+/g)){const u=listingUrl(m[0]);if(u){urls.add(u);const lead=discoveryLead(u);if(lead)leads.set(u,lead);}}
      }catch{coverage.push({region,query,status:'search failed'});}
    }
    const extra=await webSearch(region+' Toyota Avensis Kombi ab 2011 bis 6500 Euro 200000 km unfallfrei',{limit:6});
    for(const hit of extra.results){const u=listingUrl(hit.url);if(u){urls.add(u);const lead=discoveryLead(u);if(lead)leads.set(u,lead);}}
    coverage.push({region,fallback:extra.engine||'unavailable',results:extra.results.length});
  }
  // Deliver useful direct links even when the detail pages block automation.
  // These are explicitly unverified discovery links, never qualified matches.
  const fresh=[...leads.values()].filter(x=>!state.leads[x.url]&&!state.sent[x.url]).slice(0,5);
  if(fresh.length){
    const delivered=await sendMessage({token,chatId,text:escape(leadMessage(fresh)),disablePreview:true});
    if(!delivered.ok)throw Error('Discovery links Telegram delivery failed');
    for(const lead of fresh)state.leads[lead.url]=new Date().toISOString();
    leadLinksSent=fresh.length;
    writeFileSync(file,JSON.stringify(state,null,2));
    console.log(JSON.stringify({event:'discovery_links_delivered',count:leadLinksSent,urls:fresh.map(x=>x.url)}));
  }
  const outcomes=[];
  // Rotate the read window instead of repeatedly spending it on the same old ads.
  const found=[...urls],offset=(Number(state.cursor)||0)%Math.max(1,found.length);
  const window=found.slice(offset).concat(found.slice(0,offset)).slice(0,80);
  state.cursor=(offset+window.length)%Math.max(1,found.length);
  for(const url of window){
    try{
      const response=await get(url);if(!listingUrl(response.url))throw Error('redirected off original listing');
      const html=await response.text();read++;
      const cars=objects(html);if(cars.length!==1){console.log(JSON.stringify({diagnostic:'vehicle-format',host:new URL(url).hostname,types:[...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map(m=>m[1]).slice(0,12),sample:html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,650)}));outcomes.push({url,reason:'missing/ambiguous structured vehicle data'});continue;}
      const car=evaluate(cars[0],url);if(!car.ok){outcomes.push({url,evaluated:true,reason:car.reason});continue;}
      await new Promise(r=>setTimeout(r,1100)); // public geocoder rate limit
      const route=await roadDistance(car.address);if(route.km>150){outcomes.push({url,evaluated:true,reason:'road distance'});continue;}
      const fingerprint=createHash('sha256').update(JSON.stringify([car.price,car.mileage,car.hu,car.gearbox])).digest('hex');
      if(state.sent[url]===fingerprint){outcomes.push({url,evaluated:true,status:'unchanged'});continue;}
      const message='گزینهٔ تازه برای بررسی مدارک؛ تأیید خرید نیست\n'+car.name+'\n'+
        car.price+' € | '+car.mileage+' km | '+car.registration+'\n'+car.cc+' cc | '+car.ps+' PS | '+car.fuel+' | '+car.gearbox+'\n'+
        'زنجیر طبق ترکیب موتور/سال؛ تطبیق VIN لازم است.\nHU طبق متن: '+car.hu+'؛ اصل گزارش دیده نشده\n'+
        'فروشنده: '+car.seller+'\nفاصلهٔ جاده‌ای: '+route.km+' km؛ '+route.source+'\n'+
        'سابقهٔ مالک، سرویس، تصادف و وضعیت فنی نیازمند مدارک است. برچسب سبز دیزل مجوز تمام شهرها نیست.\n'+
        'هزینهٔ سوخت نمونه برای ۱۱۰۰ کیلومتر: بنزینی ۱۳۹–۱۷۸€ (۷–۹L، قیمت فرضی۱٫۸۰€)، دیزل ۹۴–۱۲۲€ (۵–۶٫۵L،۱٫۷۰€). Steuer محاسباتی با CO₂ آگهی (نیازمند تطبیق مدارک): '+car.tax+'€ در سال؛ بیمهٔ غیرالزام‌آور۵۰–۱۰۰€ و ذخیرهٔ تعمیر۱۰۰–۱۶۰€ ماهانه.\n'+url;
      const result=await sendMessage({token,chatId,text:escape(message),disablePreview:true});
      if(!result.ok)throw Error('Telegram send rejected');
      state.sent[url]=fingerprint;writeFileSync(file,JSON.stringify(state,null,2));
      outcomes.push({url,evaluated:true,status:'sent'});
    }catch{outcomes.push({url,reason:'fetch/route/delivery unavailable; not verified'});}
  }
  const health=coverageHealth({searched,discovered:urls.size,read,outcomes});
  const summary={at:new Date().toISOString(),searched,discovered:urls.size,read,health,
    sent:outcomes.filter(x=>x.status==='sent').length,leadLinksSent,coverage,outcomes};
  writeFileSync('.car-watch/report.json',JSON.stringify(summary,null,2));
  console.log(JSON.stringify({searched,discovered:urls.size,read,parsed:health.parsed,sent:summary.sent,leadLinksSent,healthy:health.healthy}));
  // Report outages as outages, never as an empty market. At most one per day.
  const day=summary.at.slice(0,10);
  if(process.env.CAR_WATCH_DIAGNOSTIC==='1'&&!leadLinksSent){
    const message='وضعیت فنی جستجوی خودرو\n'+
      'جستجو: '+searched+' | لینک پیدا شده: '+urls.size+' | صفحه خوانده‌شده: '+read+' | اطلاعات خودرو قابل‌تحلیل: '+health.parsed+' | ارسال گزینه: '+summary.sent+'\n'+
      (health.healthy?'جستجو انجام شد؛ فقط گزینه‌های عبورکرده از شرایط ارسال می‌شوند.':'پوشش جستجو ناقص است؛ محدودیت خواندن آگهی‌ها وجود دارد. این نتیجه به معنی نبود خودروی مناسب نیست.')+'\n'+
      'گزارش اجرا: https://github.com/Deutsch-online/gapmedia-video-automation/actions/runs/'+(process.env.GITHUB_RUN_ID||'');
    const delivery=await sendMessage({token,chatId,text:escape(message),disablePreview:true});
    if(!delivery.ok)throw Error('Diagnostic Telegram delivery failed');
    state.healthNoticeDay=day;
    console.log('Car search diagnostic delivered to verified private chat');
  }
  writeFileSync(file,JSON.stringify(state,null,2));
  if(!health.healthy)throw Error('Insufficient search coverage: '+health.reason);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)run().catch(()=>{console.error('Car search failed. See coverage artifact; no credentials logged.');process.exitCode=1;});
