// User-confirmed rules: a seat is separate from an earned crown.
export const SEAT_POINTS=100;
export const CROWN_RULES={likes:{silver:200,gold:1000,ice:2000},coins:{silver:10,gold:100,ice:500}};
export function crownTier(person={}){if(person.preview||person.showcase||person.isTest)return 'none';const a=person.activity||person,likes=Number(a.likes)||0,coins=Number(a.coins)||0;return likes>=2000||coins>=500?'ice':likes>=1000||coins>=100?'gold':likes>=200||coins>=10?'silver':'none';}
export function seatEligible(points){return Number(points)>=SEAT_POINTS;}
export function crownLabel(tier,language='en'){return(language==='fa'?{none:'بدون تاج',silver:'تاج نقره‌ای',gold:'تاج طلایی',ice:'تاج اژدهای یخی'}:{none:'No crown',silver:'Silver crown',gold:'Gold crown',ice:'Ice dragon crown'})[tier]||'';}
