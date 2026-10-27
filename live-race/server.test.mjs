import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import WebSocket from 'ws';

test('authenticated free play rejects paid features and retires prerecorded assets',{timeout:20000},async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'race-http-')),port=17861,token=randomBytes(24).toString('hex');
 const child=spawn(process.execPath,[new URL('./server.mjs',import.meta.url).pathname],{cwd,env:{...process.env,PORT:String(port),PUBLIC_URL:'http://127.0.0.1:'+port,LUDO_ADMIN_TOKEN:token},stdio:'ignore'});let socket,viewer;
 const wait=async fn=>{for(let i=0;i<150;i++){const v=fn();if(v)return v;await new Promise(r=>setTimeout(r,30))}throw Error('Server message timeout')};
 try{
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:'+port+'/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,40))}
  const response=await fetch('http://127.0.0.1:'+port+'/screen');assert.equal(response.status,200);assert.match(await response.text(),/Nations Race/);
  const messages=[];socket=new WebSocket('ws://127.0.0.1:'+port+'/events');socket.on('message',raw=>messages.push(JSON.parse(raw)));await wait(()=>socket.readyState===1);await wait(()=>messages.find(m=>m.type==='snapshot'));
  const action=async(type,data={})=>{messages.length=0;socket.send(JSON.stringify({type,...data}));return await wait(()=>messages.find(m=>m.type==='snapshot'||m.type==='error'))};
  assert.equal((await action('race-settings',{settings:{cars:5}})).type,'error');assert.equal((await action('race-refresh-screen')).type,'error');
  messages.length=0;socket.send(JSON.stringify({type:'auth',token}));assert.equal((await wait(()=>messages.find(m=>m.type==='auth'))).ok,true);
  assert.equal((await action('race-settings',{settings:{cars:5,removeInactive:false,demoOpponents:false,giftMoveIntervalMs:0,giftScoreWindowMs:0}})).snapshot.race.settings.cars,5);
  let controlled=await action('race-control',{action:'stop'});assert.equal(controlled.snapshot.race.settings.running,false);controlled=await action('race-control',{action:'start'});assert.equal(controlled.snapshot.race.settings.running,true);controlled=await action('race-control',{action:'pause'});assert.equal(controlled.snapshot.race.settings.paused,true);controlled=await action('race-control',{action:'resume'});assert.equal(controlled.snapshot.race.settings.paused,false);
  await new Promise(r=>setTimeout(r,3100));
  for(let i=1;i<=7;i++)assert.equal((await action('race-add',{userId:String(i),name:'Player '+i})).type,'snapshot');
  await new Promise(r=>setTimeout(r,3200));
  let m=await action('race-demo',{action:'like',userId:'1',name:'Player 1',count:37});assert.equal(m.snapshot.race.slots[0].distance,30);assert.equal(m.snapshot.race.slots[0].likeRemainder,7);assert.equal(m.snapshot.race.queue.length,2);assert.equal(m.manualTests,true);
  await action('race-settings',{settings:{paused:true}});m=await action('race-demo',{action:'like',userId:'1',name:'Player 1',count:10});assert.equal(m.snapshot.race.slots[0].distance,30);
  await action('race-settings',{settings:{paused:false}});

  for(const path of ['/presenter.js','/host-scheduler.js','/voice-player.js','/video/presenter.mp4','/gifts/5655.png'])assert.equal((await fetch('http://127.0.0.1:'+port+path)).status,404,path);
  assert.equal((await action('race-demo',{action:'gift',userId:'2',giftId:'5655',count:100})).type,'error');
  m=await action('race-settings',{settings:{playMode:'gifts',giftsEnabled:true,winnerCoins:1000,presenterEnabled:true,musicEnabled:true}});assert.equal(m.snapshot.race.settings.giftsEnabled,false);assert.equal(m.snapshot.race.settings.presenterEnabled,false);assert.equal(m.snapshot.race.settings.winnerCoins,0);assert.equal(m.snapshot.race.settings.musicEnabled,false);
  assert.equal('legacyArchive' in m.snapshot.race,false);assert.equal('gifters' in m.snapshot.race,false);assert.equal('state' in m.snapshot,false);assert.equal('giftMap' in m.snapshot.race,false);
  assert.equal((await action('race-slot',{index:0,giftId:'5655'})).type,'error');assert.equal((await action('race-audio-test',{kind:'voice'})).type,'error');
  const before=m.snapshot.race.slots[0].distance;m=await action('race-demo',{action:'drive',userId:'1',name:'Player 1'});assert.equal(m.snapshot.race.slots[0].distance,before+10);
  m=await action('race-demo',{action:'country',userId:'1',name:'Player 1',content:'Germany'});assert.equal(m.snapshot.race.slots[0].countryFlag,'🇩🇪');
  messages.length=0;socket.send(JSON.stringify({type:'race-screen-ready'}));await wait(()=>messages.find(m=>m.type==='race-screen-refresh'));

 }finally{socket?.close();viewer?.close();child.kill('SIGTERM');if(child.exitCode===null)await new Promise(r=>child.once('exit',r));await rm(cwd,{recursive:true,force:true})}
});
