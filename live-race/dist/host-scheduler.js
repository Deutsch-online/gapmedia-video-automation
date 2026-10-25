'use strict';
globalThis.PresenterSchedule=class PresenterSchedule{
 constructor(){this.clock=0;this.stage='tap';this.due=1000;this.welcomePending=false;this.welcomeAllowed=0;this.rotation=0;this.options={countryDelaySeconds:60,heartsDelaySeconds:120,cheerIntervalSeconds:120}}
 configure(options){Object.assign(this.options,options)}
 advance(milliseconds){this.clock+=Math.max(0,milliseconds)}
 arrival(){if(this.clock>=this.welcomeAllowed)this.welcomePending=true}
 next(mode='likes'){if(this.stage==='tap')return this.clock>=this.due?'tap':null;if(this.welcomePending&&this.clock>=this.welcomeAllowed)return 'welcome';if(this.clock<this.due)return null;if(this.stage==='country')return 'country';if(this.stage==='hearts')return 'hearts';const clips=mode==='gifts'?['gifts','cheer','giftJoin','countryCheer','closeRace','share','race']:mode==='mixed'?['keepTapping','cheer','mixedSupport','joinActivity','countryCheer','giftInvite','closeRace','freeSupport','likeSprint','share','race']:['keepTapping','cheer','joinActivity','tapTogether','countryCheer','likeSprint','freeSupport','closeRace','share','race'];return clips[this.rotation%clips.length]}
 complete(key){if(/Reply$|Thanks$/.test(key)||key==='winner'||key.startsWith('hype'))return;if(key==='welcome'){this.welcomePending=false;this.welcomeAllowed=this.clock+60000;if(this.stage==='country')this.due=this.clock+this.options.countryDelaySeconds*1000;return}if(key==='tap'){this.stage='country';this.due=this.clock+this.options.countryDelaySeconds*1000}else if(key==='country'){this.stage='hearts';this.due=this.clock+this.options.heartsDelaySeconds*1000}else{this.stage='cheer';this.due=this.clock+this.options.cheerIntervalSeconds*1000;this.rotation++}}
};

globalThis.CrowdCheer=class CrowdCheer{
 constructor(){this.lastCount=null;this.growth=0;this.allowedAt=0;this.followupAt=0;this.rotation=0;this.options={step:1,cooldownSeconds:10}}
 configure(options){Object.assign(this.options,options)}
 observe(count){if(!Number.isSafeInteger(count)||count<0)return;if(this.lastCount===null){this.lastCount=count;return}if(count>this.lastCount)this.growth+=count-this.lastCount;else if(count<this.lastCount)this.growth=0;this.lastCount=count}
 clearPending(){this.growth=0;this.followupAt=0}
 next(now){if(this.lastCount!==null&&this.growth>=this.options.step&&now>=this.allowedAt){const gain=this.growth;this.growth=0;this.allowedAt=now+this.options.cooldownSeconds*1000;this.followupAt=now+10000;return gain>=20?'crowdRoarThanks':gain>=5?'crowdBoostThanks':'crowdThanks'}if(this.followupAt&&now>=this.followupAt){this.followupAt=0;return ['hypeDouble','hypeTap','hypeSupport','hypeTeam'][this.rotation++%4]}return null}
};

globalThis.HostSpeechBurst=class HostSpeechBurst{
 constructor(){this.lines=0;this.restUntil=0;this.justResumed=false;this.options={lines:2,pauseSeconds:180}}
 configure(options){Object.assign(this.options,options)}
 ready(now){if(now<this.restUntil)return false;if(this.restUntil){this.restUntil=0;this.lines=0;this.justResumed=true}return true}
 complete(now){this.lines++;if(this.lines>=this.options.lines){this.restUntil=now+this.options.pauseSeconds*1000;return true}return false}
};
