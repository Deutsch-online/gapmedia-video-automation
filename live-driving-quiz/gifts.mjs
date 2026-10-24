export const GIFT_PRESET_VERSION='owner-rose-tiktok-gg-v1';
export const GIFT_PRESET={
 A:{id:'5655',name:'Rose',label:'گل رز',symbol:'🌹',coins:1,icon:'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.webp'},
 B:{id:'5269',name:'TikTok',label:'تیک‌تاک',symbol:'♪',coins:1,icon:'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/802a21ae29f9fae5abe3693de9f874bd~tplv-obj.webp'},
 C:{id:'6064',name:'GG',label:'GG',symbol:'GG',coins:1,icon:'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/3f02fa9594bd1495ff4e8aa5ae265eef~tplv-obj.webp'}
};
export function presetGifts(username){return {...Object.fromEntries(Object.entries(GIFT_PRESET).map(([k,g])=>[k,{...g,verified:true,source:'owner-preset',bound_username:username}])),ALL:{id:null,name:'هدیهٔ هر سه گزینه',coins:null,verified:false}};}
export function configuredGift(g,username){return g?.verified&&['owner-manual','owner-preset'].includes(g.source)&&g.bound_username===username;}
export function observeGift(configured,observed){const source=['owner-manual','owner-preset'].includes(configured?.source)?configured.source:observed.source;return {...configured,...observed,source,verified:true};}
const avatarDomains=['tiktokcdn.com','tiktokcdn-us.com','tiktokcdn-eu.com','byteimg.com','ibyteimg.com','ibytedtos.com'];
export function safeAvatarURL(value){
 if(typeof value!=='string'||value.length>2048)return null;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hash||u.port||!avatarDomains.some(domain=>u.hostname===domain||u.hostname.endsWith('.'+domain)))return null;return u.href;}catch{return null;}
}
export function profileAvatar(event){
 const u=event.user||{};const models=[u.avatarThumb,u.avatarMedium,u.avatarLarge,u.profilePicture,u.profilePictureMedium,u.profilePictureLarge];
 const candidates=[u.profilePictureUrl,event.profilePictureUrl,...models.flatMap(m=>m?.urlList||m?.url_list||[])];
 return candidates.map(safeAvatarURL).find(Boolean)||null;
}

export function profileUsername(event){
 const value=event.user?.uniqueId||event.user?.displayId||event.uniqueId||'';
 const handle=typeof value==='string'?value.replace(/^@/,''):'';
 return /^[A-Za-z0-9._]{2,24}$/.test(handle)?handle:null;
}
export function profileLink(handle){return typeof handle==='string'&&/^[A-Za-z0-9._]{2,24}$/.test(handle)?'https://www.tiktok.com/@'+handle:null;}
