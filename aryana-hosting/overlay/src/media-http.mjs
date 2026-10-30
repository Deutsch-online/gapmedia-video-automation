import {createReadStream,statSync} from 'node:fs';

// Byte-range responses are required by Safari's MP4 probing and seeking.
export function serveStaticFile(req,res,file,contentType){
 const info=statSync(file),size=info.size;
 const etag='"'+size.toString(16)+'-'+Math.trunc(info.mtimeMs).toString(16)+'"';
 const headers={'Content-Type':contentType,'Cache-Control':'no-cache','Accept-Ranges':'bytes','Last-Modified':info.mtime.toUTCString(),'ETag':etag};
 let start=0,end=size-1,status=200,range=req.headers.range;
 const validator=req.headers['if-range'];
 if(validator&&validator!==etag&&!(Number.isFinite(Date.parse(validator))&&Date.parse(validator)>=Math.floor(info.mtimeMs/1000)*1000))range=undefined;
 if(range!==undefined){
  const match=/^bytes=\s*(\d*)-(\d*)$/i.exec(String(range).trim());
  let valid=Boolean(match&&size>0&&(match[1]||match[2]));
  if(valid){
   if(!match[1]){const suffix=Number(match[2]);valid=Number.isSafeInteger(suffix)&&suffix>0;start=Math.max(0,size-suffix);}
   else{start=Number(match[1]);end=match[2]?Number(match[2]):size-1;valid=Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start<size&&end>=start;end=Math.min(end,size-1);}
  }
  if(!valid){res.writeHead(416,{...headers,'Content-Range':'bytes */'+size,'Content-Length':0});res.end();return;}
  status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
 }
 headers['Content-Length']=size?end-start+1:0;res.writeHead(status,headers);
 if(req.method==='HEAD'||!size){res.end();return;}
 const stream=createReadStream(file,{start,end});
 stream.on('error',()=>res.destroy());res.once('close',()=>stream.destroy());stream.pipe(res);
}
