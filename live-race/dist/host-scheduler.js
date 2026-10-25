'use strict';
globalThis.PresenterSchedule=class PresenterSchedule{
 constructor(){this.clock=0;this.stage='tap';this.due=1000;this.welcomePending=false;this.welcomeAllowed=0;this.rotation=0;this.options={countryDelaySeconds:60,heartsDelaySeconds:120,cheerIntervalSeconds:120}}
 configure(options){Object.assign(this.options,options)}
 advance(milliseconds){this.clock+=Math.max(0,milliseconds)}
 arrival(){if(this.clock>=this.welcomeAllowed)this.welcomePending=true}
 next(mode='likes'){if(this.stage==='tap')return this.clock>=this.due?'tap':null;if(this.welcomePending&&this.clock>=this.welcomeAllowed)return 'welcome';if(this.clock<this.due)return null;if(this.stage==='country')return 'country';if(this.stage==='hearts')return 'hearts';const clips=mode==='gifts'?['gifts','cheer','giftJoin','countryCheer','closeRace','share','race']:mode==='mixed'?['keepTapping','cheer','mixedSupport','joinActivity','countryCheer','giftInvite','closeRace','freeSupport','likeSprint','share','race']:['keepTapping','cheer','joinActivity','tapTogether','countryCheer','likeSprint','freeSupport','closeRace','share','race'];return clips[this.rotation%clips.length]}
 complete(key){if(/Reply$|Thanks$/.test(key)||key==='winner')return;if(key==='welcome'){this.welcomePending=false;this.welcomeAllowed=this.clock+60000;if(this.stage==='country')this.due=this.clock+this.options.countryDelaySeconds*1000;return}if(key==='tap'){this.stage='country';this.due=this.clock+this.options.countryDelaySeconds*1000}else if(key==='country'){this.stage='hearts';this.due=this.clock+this.options.heartsDelaySeconds*1000}else{this.stage='cheer';this.due=this.clock+this.options.cheerIntervalSeconds*1000;this.rotation++}}
};
