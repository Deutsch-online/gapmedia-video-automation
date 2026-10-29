import http from 'node:http';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {WebSocket,WebSocketServer} from 'ws';

// Keep the original application on loopback. Only this authenticated boundary
// belongs behind a public HTTPS reverse proxy.
export function createBridge({key,origins,upstream='http://127.0.0.1:4321',now=()=>Date.now()}={}){
 if(typeof key!=='string'||key.length<24)throw Error('ARYANA_REMOTE_KEY must have at least 24 characters.');
 const target=new URL(upstream);if(target.protocol!=='http:'||target.hostname!=='127.0.0.1'||target.pathname!=='/'||target.search||target.hash||target.username||target.password)throw Error('Upstream must be an HTTP loopback origin.');
 const allow=new Set(origins||[]);if(!allow.size)throw Error('At least one allowed HTTPS studio origin is required.');
 for(const origin of allow){const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin)throw Error('Allowed origins must be exact HTTPS origins.');}
 const expected=createHash('sha256').update('Bearer '+key).digest(),tickets=new Map(),limits=new Map();
 const authenticated=req=>timingSafeEqual(createHash('sha256').update(req.headers.authorization||'').digest(),expected);
 const originOK=req=>allow.has(req.headers.origin);
 const permittedGet=path=>path==='/api/state'||/^\/(audio\/[a-f0-9]{64}\.mp3|video\/[a-f0-9]{64}\.mp4|assets\/introduction\.(mp3|mp4))$/.test(path);
 const permittedPost=new Set(['/api/say','/api/comment','/api/connect','/api/disconnect','/api/intro','/api/stop','/api/settings','/api/correction','/api/name','/api/reset']);
 const respond=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));};
 function limited(req){const ip=req.socket.remoteAddress;let entry=limits.get(ip);if(!entry||entry.until<=now()){entry={count:0,until:now()+60000};limits.set(ip,entry);}return ++entry.count>180;}
 const timer=setInterval(()=>{for(const [t,v] of tickets)if(v.until<=now())tickets.delete(t);for(const [ip,v] of limits)if(v.until<=now())limits.delete(ip);},10000);timer.unref();
 const wss=new WebSocketServer({noServer:true,maxPayload:1024*1024});
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  const path=new URL(req.url,'http://bridge.local').pathname;
  if(path==='/healthz'&&req.method==='GET')return respond(res,200,{ok:true,service:'aryana-authenticated-bridge',gpuProvisioned:false});
  if(!originOK(req))return respond(res,403,{error:'Origin rejected'});
  res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Max-Age','600');res.writeHead(204);res.end();return;}
  if(limited(req))return respond(res,429,{error:'Too many requests'});
  if(!authenticated(req))return respond(res,401,{error:'Authentication required'});
  if(path==='/bridge/ticket'&&req.method==='POST'){
   for(const [t,v] of tickets)if(v.until<=now())tickets.delete(t);
   if(tickets.size>=100)return respond(res,429,{error:'Ticket capacity reached'});
   const ticket=randomBytes(24).toString('hex');tickets.set(ticket,{origin:req.headers.origin,until:now()+15000});return respond(res,200,{ticket,expiresIn:15});
  }
  if(!(req.method==='GET'&&permittedGet(path))&&!(req.method==='POST'&&permittedPost.has(path)))return respond(res,404,{error:'Not found'});
  try{
   let data;const headers={};
   if(req.method==='POST'){
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>12000)return respond(res,413,{error:'Request too large'});chunks.push(chunk);}data=Buffer.concat(chunks);JSON.parse(data.toString()||'{}');
    const session=await fetch(target.origin+'/api/session',{signal:AbortSignal.timeout(5000)});if(!session.ok)throw Error();headers['x-aryana-key']=(await session.json()).key;headers['content-type']='application/json';
   }
   const upstreamResponse=await fetch(target.origin+path,{method:req.method,headers,body:data,signal:AbortSignal.timeout(65000),redirect:'error'});
   const buffer=Buffer.from(await upstreamResponse.arrayBuffer());
   if(buffer.length>25e6)return respond(res,502,{error:'Media exceeds bridge limit'});
   res.writeHead(upstreamResponse.status,{'content-type':upstreamResponse.headers.get('content-type')||'application/octet-stream','content-length':buffer.length,'cache-control':'no-store'});res.end(buffer);
  }catch{return respond(res,502,{error:'Aryana upstream unavailable'});}
 });
 server.on('upgrade',(req,socket,head)=>{
  const url=new URL(req.url,'http://bridge.local'),ticket=url.searchParams.get('ticket'),entry=tickets.get(ticket);tickets.delete(ticket);
  if(url.pathname!=='/events'||!originOK(req)||!entry||entry.origin!==req.headers.origin||entry.until<=now()||wss.clients.size>=10){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  wss.handleUpgrade(req,socket,head,downstream=>{
   const upstreamWS=new WebSocket('ws://'+target.host+'/events',{handshakeTimeout:10000,maxPayload:1024*1024});
   upstreamWS.on('message',(data,isBinary)=>{if(downstream.readyState===WebSocket.OPEN){if(downstream.bufferedAmount>1024*1024){downstream.close(1013);return;}downstream.send(data,{binary:isBinary});}});
   upstreamWS.on('error',()=>downstream.close(1011));upstreamWS.on('close',()=>downstream.close());downstream.on('close',()=>upstreamWS.close());downstream.on('error',()=>upstreamWS.close());
   // A display websocket is read-only. Commands require authenticated HTTP.
   downstream.on('message',()=>downstream.close(1008));
  });
 });
 const close=()=>{clearInterval(timer);for(const client of wss.clients)client.terminate();wss.close();server.close();};
 return {server,close};
}

if(import.meta.url===new URL(process.argv[1],'file:').href){
 const port=Number(process.env.ARYANA_BRIDGE_PORT||4322),host=process.env.ARYANA_BRIDGE_HOST||'127.0.0.1';
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid bridge port');
 const bridge=createBridge({key:process.env.ARYANA_REMOTE_KEY,origins:(process.env.ARYANA_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean),upstream:process.env.ARYANA_UPSTREAM||'http://127.0.0.1:4321'});
 bridge.server.listen(port,host,()=>console.log('Aryana authenticated bridge listening on port '+port));process.on('SIGTERM',bridge.close);process.on('SIGINT',bridge.close);
}
