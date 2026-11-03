export const FUN_STYLES=['comic','sketch','royal','neon','blueprint','popart','pixel','gold','bubble','duotone','watercolor','electric'];
export const FUN_LABELS={mix:'سبک‌های متنوع',comic:'کمیک رنگی',sketch:'طراحی با قلم',royal:'قهرمان فانتزی',neon:'نئون',blueprint:'طرح آبی',popart:'پاپ‌آرت',pixel:'پیکسلی',gold:'طلایی',bubble:'حباب بامزه',duotone:'دورنگ',watercolor:'آبرنگ',electric:'نور وارونه'};
export const PROFILE_THEMES=['stadium','neon','royal','ice','fire','diamond','aurora','cosmic'];
export function profileTier(points=0){return [0,10,40,100,250,600,1500].reduce((n,t,i)=>points>=t?i:n,0);}
