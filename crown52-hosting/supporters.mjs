const key=v=>String(v||'').trim().replace(/^@/,'').toLowerCase();
export function recordSupporter(state,event,now=Date.now()){
 if(!['like','gift'].includes(event.type))return false;
 const u=event.user||{},ids=[event.uniqueId,u.uniqueId,u.displayId,event.userId,u.userId,u.id].map(key).filter(Boolean);if(!ids.length)return false;
 const registered=(state.guests||[]).find(g=>ids.some(id=>g.id===id||g.aliases?.includes(id)));if(registered?.role==='guest')return false;
 if(event.type==='gift'&&Number(event.giftType??event.giftDetails?.giftType??event.gift?.type)===1&&!event.repeatEnd)return false;
 const eventId=String(event.eventId||event.common?.msgId||event.msgId||'');const receipt=event.type==='gift'&&event.groupId?`gift:${event.groupId}:${event.giftId||event.gift?.id}:${ids[0]}`:eventId?event.type+':'+eventId:'';
 state.supporterSeen??=[];if(receipt&&state.supporterSeen.includes(receipt))return false;
 const likes=event.type==='like'?Math.max(1,Math.min(100000,Number(event.likeCount??event.count??1)||1)):0;
 const coins=event.type==='gift'?Number(event.coins??Number(event.diamondCount??event.giftDetails?.diamondCount??event.gift?.diamondCount??0)*Number(event.repeatCount||1)):0;
 if(event.type==='gift'&&(!Number.isSafeInteger(coins)||coins<1||coins>1000000))return false;
 if(receipt){state.supporterSeen.push(receipt);state.supporterSeen=state.supporterSeen.slice(-4000)}
 state.supporters??=[];let person=state.supporters.find(g=>ids.some(id=>g.id===id||g.aliases?.includes(id)));if(!person){person={id:registered?.id||ids[0],name:registered?.name||String(event.nickname||event.nickName||u.nickname||u.nickName||ids[0]).slice(0,50),avatar:registered?.avatar||'',likes:0,coins:0,aliases:ids};state.supporters.push(person)}
 person.likes+=likes;person.coins+=coins;person.lastAt=now;person.lastType=event.type;person.isTest=Boolean(event.isTest);person.aliases=[...new Set([...person.aliases||[],...ids])];
 const photo=event.avatar||event.profilePictureUrl||u.profilePictureUrl||u.avatarThumb?.urlList?.[0]||u.avatarThumb?.url?.[0]||u.profilePicture?.url?.[0];if(typeof photo==='string'&&photo.startsWith('https://'))person.avatar=photo;
 state.supporters=state.supporters.sort((a,b)=>b.lastAt-a.lastAt).slice(0,100);return true;
}

export function personFromEvent(event){const u=event.user||{},ids=[event.uniqueId,u.uniqueId,u.displayId,event.userId,u.userId,u.id].map(key).filter(Boolean),id=ids.find(x=>/^[a-z0-9._-]{1,64}$/.test(x));return {id,name:String(event.nickname||event.nickName||u.nickname||u.nickName||id||'').slice(0,50),avatar:event.avatar||event.profilePictureUrl||u.profilePictureUrl||u.avatarThumb?.urlList?.[0]||u.avatarThumb?.url?.[0]||'',role:'viewer'};}
