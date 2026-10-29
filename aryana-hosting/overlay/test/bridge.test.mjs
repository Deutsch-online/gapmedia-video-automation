import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {WebSocket,WebSocketServer} from 'ws';
import {createBridge} from '../tools/remote-bridge.mjs';

test('remote boundary protects commands/media and uses origin-bound single-use tickets',async()=>{
 const origin='https://studio.example',key='test-only-key-that-is-at-least-24-characters';let commands=0;
 const upstream=http.createServer((req,res)=>{
  res.setHeader('content-type','application/json');
  if(req.url==='/api/session'){res.end(JSON.stringify({key:'internal-command-key'}));return;}
  if(req.url==='/api/say'){assert.equal(req.headers['x-aryana-key'],'internal-command-key');commands++;res.end('{"ok":true}');return;}
  res.end(JSON.stringify({persona:{name:'Aryana'},capabilities:{liveLipSync:false}}));
 });
 const uwss=new WebSocketServer({server:upstream});uwss.on('connection',ws=>ws.send('{"connection":"connected"}'));
 upstream.listen(0,'127.0.0.1');await once(upstream,'listening');let now=1000;
 const bridge=createBridge({key,origins:[origin],upstream:'http://127.0.0.1:'+upstream.address().port,now:()=>now});bridge.server.listen(0,'127.0.0.1');await once(bridge.server,'listening');
 const base='http://127.0.0.1:'+bridge.server.address().port,headers={Origin:origin,Authorization:'Bearer '+key};
 const wsClients=[];
 try{
  assert.equal((await fetch(base+'/api/state')).status,403);
  assert.equal((await fetch(base+'/api/state',{headers:{Origin:origin}})).status,401);
  assert.equal((await fetch(base+'/api/state',{headers:{...headers,Origin:'https://other.example'}})).status,403);
  assert.equal((await fetch(base+'/api/session',{headers})).status,404);
  assert.equal((await fetch(base+'/api/state',{headers})).status,200);
  const preflight=await fetch(base+'/api/say',{method:'OPTIONS',headers:{Origin:origin}});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
  assert.equal((await fetch(base+'/api/say',{method:'POST',headers,body:'{"text":"hello"}'})).status,200);assert.equal(commands,1);
  assert.equal((await fetch(base+'/api/say',{method:'POST',headers,body:'x'.repeat(12001)})).status,413);
  const ticket=async()=>(await(await fetch(base+'/bridge/ticket',{method:'POST',headers})).json()).ticket;
  const denied=async(token,requestOrigin=origin)=>{const client=new WebSocket(base.replace('http:','ws:')+'/events?ticket='+token,{origin:requestOrigin});client.on('error',()=>{});wsClients.push(client);const [,response]=await once(client,'unexpected-response');assert.equal(response.statusCode,403);response.resume();client.terminate();};
  const fresh=await ticket(),client=new WebSocket(base.replace('http:','ws:')+'/events?ticket='+fresh,{origin});wsClients.push(client);const [state]=await once(client,'message');assert.equal(JSON.parse(state).connection,'connected');client.close();
  await denied(fresh);const expired=await ticket();now+=15001;await denied(expired);await denied(await ticket(),'https://other.example');
 }finally{for(const ws of wsClients)ws.terminate();bridge.close();for(const ws of uwss.clients)ws.terminate();uwss.close();upstream.close();}
});
