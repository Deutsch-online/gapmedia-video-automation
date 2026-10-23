export function serveMedia(req,res,bytes,type){
 const headers={'Content-Type':type,'Accept-Ranges':'bytes','Cache-Control':'no-cache'};
 const range=req.headers.range;
 if(!range){res.writeHead(200,{...headers,'Content-Length':bytes.length});return res.end(req.method==='HEAD'?undefined:bytes);}
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);let start,end;
 if(match&&(match[1]||match[2])){
  if(!match[1]){const suffix=Number(match[2]);start=Math.max(0,bytes.length-suffix);end=bytes.length-1;if(suffix===0)start=bytes.length;}
  else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),bytes.length-1):bytes.length-1;}
 }
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=bytes.length||end<start){res.writeHead(416,{...headers,'Content-Range':`bytes */${bytes.length}`});return res.end();}
 res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${bytes.length}`});return res.end(req.method==='HEAD'?undefined:bytes.subarray(start,end+1));
}
