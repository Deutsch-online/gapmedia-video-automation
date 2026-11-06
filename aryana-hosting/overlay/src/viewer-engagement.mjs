import {spokenName} from './host.mjs';
import {latinLabel} from '../public/latin-label.js';
export class ActiveViewers{
 constructor({now=()=>Date.now()}={}){this.now=now;this.people=new Map();}
 observe(event,settings){const id=String(event.user?.id??event.user?.userId??event.userId??''),name=spokenName(event.user?.nickname||event.name,settings.names);if(!id||!name)return;const first=name.split(/\s+/)[0];this.people.set(id,{id,name:first,englishName:latinLabel(first),at:this.now(),lastSpoken:this.people.get(id)?.lastSpoken??-Infinity});while(this.people.size>300)this.people.delete(this.people.keys().next().value);}
 fresh(id){const person=this.people.get(id);return Boolean(person&&this.now()-person.at<180000);}
 next(){return [...this.people.values()].filter(person=>this.fresh(person.id)&&this.now()-person.lastSpoken>=600000).sort((a,b)=>a.lastSpoken-b.lastSpoken||b.at-a.at)[0]||null;}
 spoken(id){const person=this.people.get(id);if(person)person.lastSpoken=this.now();}
 clear(){this.people.clear();}
}
