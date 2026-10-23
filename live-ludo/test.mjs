import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WebSocket} from 'ws';
const cwd=await mkdtemp(join(tmpdir(),'ludo-test-')),token='test-token-123456789',port=3022;
const child=spawn(process.execPath,[new URL('./server.mjs',import.meta.url).pathname],{cwd,env:{...process.env,PORT:String(port),LUDO_ADMIN_TOKEN:token},stdio:['ignore','pipe','inherit']});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function client(){const ws=new WebSocket('ws://127.0.0.1:'+port+'/events');const inbox=[];ws.on('message',raw=>inbox.push(JSON.parse(raw)));return{ws,inbox,async next(type){for(let i=0;i<100;i++){const n=inbox.findIndex(x=>x.type===type);if(n>=0)return inbox.splice(n,1)[0];await pause(20)}throw Error('Timeout '+type)},send:e=>ws.send(JSON.stringify(e))}}
try{await new Promise(r=>child.stdout.once('data',r));const a=client(),screen=client();await a.next('snapshot');await screen.next('snapshot');a.send({type:'demo-gift',corner:0});assert.match((await a.next('error')).message,/کلید/);a.send({type:'auth',token:'wrong'});assert.equal((await a.next('auth')).ok,false);a.send({type:'auth',token});assert.equal((await a.next('auth')).ok,true);a.send({type:'demo-gift',corner:0});let s=await screen.next('snapshot');assert.equal(s.snapshot.state.teams[0].supporter.name,'حامی آزمایشی');assert.equal(s.snapshot.state.teams[0].g,1);assert(!JSON.stringify(s).includes(token));a.send({type:'update',revision:0,snapshot:s.snapshot});assert.match((await a.next('error')).message,/تغییر/);a.send({type:'update',revision:s.revision,snapshot:{...s.snapshot,display:{...s.snapshot.display,bg:'#ff0000'}}});s=await screen.next('snapshot');assert.equal(s.snapshot.display.bg,'#ff0000');a.send({type:'connect',username:'bad/name'});assert.match((await a.next('error')).message,/معتبر/);a.ws.close();screen.ws.close();console.log('Passed: admin authentication, unauthorized writes rejected, cross-client gift/profile and settings sync, revision conflicts, username validation, no token disclosure')}
finally{child.kill();await pause(150);await rm(cwd,{recursive:true,force:true})}
