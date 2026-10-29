import {createHash,timingSafeEqual} from 'node:crypto';
export function hostingConfig(env,port){
 const base=env.PUBLIC_URL||(env.SPACE_HOST?'https://'+env.SPACE_HOST:'');
 if(!base)return {hosted:false,bind:'127.0.0.1',token:null,hosts:new Set(['127.0.0.1:'+port,'localhost:'+port]),origins:new Set(['http://127.0.0.1:'+port,'http://localhost:'+port])};
 const url=new URL(base);if(url.protocol!=='https:'||url.origin!==base||url.username||url.password)throw Error('PUBLIC_URL must be an HTTPS origin without a trailing slash.');
 const token=env.ARYANA_ADMIN_TOKEN;if(!/^[a-f0-9]{64}$/.test(token||''))throw Error('Hosted mode requires a 64-character private admin token.');
 return {hosted:true,bind:'0.0.0.0',token,hosts:new Set([url.host,'127.0.0.1:'+port,'localhost:'+port]),origins:new Set([url.origin])};
}
export function tokenMatches(value,expected){return timingSafeEqual(createHash('sha256').update(String(value||'')).digest(),createHash('sha256').update(expected).digest());}
export function publicState(state){return {persona:state.persona,playback:state.playback,focus:state.focus,rows:state.rows,joins:state.joins,connection:state.connection,revision:state.revision,utterances:state.utterances,giftTotal:state.giftTotal,likeTotal:state.likeTotal};}
