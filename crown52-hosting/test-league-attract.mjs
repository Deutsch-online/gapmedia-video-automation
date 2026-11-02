import assert from 'node:assert/strict';
import {Game} from './public/game-engine.mjs';
import {leagueState,leagueView} from './public/football-engine.mjs';
import {processLiveEvent} from './public/live-events.mjs';
for(const seconds of [12,90,180]){
 let t=1000;const g=new Game({now:()=>t});g.s.liveExperience='football';g.presentationSettings({viewMode:'fun',funLayout:'football',leagueSeconds:seconds,leagueIdleSeconds:5});g.tick();const l=leagueState(g.s.fun),deadline=1000+seconds*1000;assert.equal(l.phase,'playing');t=6000;g.tick();assert.ok(l.attract);assert.equal(leagueView(g.s.fun).seconds,seconds);assert.equal(l.deadline,deadline);assert.equal(leagueView(g.s.fun).deadline,deadline);assert.ok(leagueView(g.s.fun).scores.some(x=>x>0));assert.equal(l.scores.reduce((a,b)=>a+b),0);
 t=7000;g.tick();assert.equal(l.deadline,deadline,'idle display must not freeze or extend actual timer');const restored=new Game();restored.restore(g.snapshot());assert.equal(leagueView(restored.s.fun).seconds,seconds);
 t=deadline;g.tick();assert.equal(l.phase,'finished');assert.equal(leagueView(g.s.fun).display,'podium');assert.equal(leagueView(g.s.fun).results.tied,false);assert.equal(l.season.reduce((a,b)=>a+b.points,0),0);assert.equal(l.members.length,0);
 t+=10000;g.tick();assert.equal(leagueView(g.s.fun).display,'standings');t+=10000;g.tick();assert.equal(l.phase,'playing');assert.equal(l.round,2);assert.equal(l.deadline,t+seconds*1000);t+=100;g.tick();assert.equal(leagueView(g.s.fun).seconds,seconds);assert.equal(leagueView(g.s.fun).deadline,l.deadline);
 const r=processLiveEvent(g,{type:'comment',userId:'real',comment:'4',eventId:'real'});assert.equal(r.accepted,true);assert.equal(l.attract,null);assert.equal(l.scores[3],10);assert.equal(leagueView(g.s.fun).seconds,seconds);assert.equal(l.nextVotes.length,0);
 t=l.deadline;assert.equal(processLiveEvent(g,{type:'comment',userId:'real',comment:'4',eventId:'boundary'}).accepted,true);assert.equal(l.phase,'finished');assert.equal(l.nextVotes.length,1);
}
console.log('PASS12/90/180 seconds preserved across public view, idle display and restore; one advancing timer; automatic finish, podium, standings and next round; unique display winner; real10-point votes interrupt idle display; deadline votes queue');
