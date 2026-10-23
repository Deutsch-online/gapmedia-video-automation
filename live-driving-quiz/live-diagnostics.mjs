// Return only enumerated reasons, route identifiers and numeric HTTP status.
// Never expose upstream URLs, bodies, headers, cookies or raw error messages.
export function liveDiagnostics(error){
 const causes=error?.config?.requestErrs;
 return (Array.isArray(causes)&&causes.length?causes:[error]).slice(0,6).map(e=>{
  const text=String(e?.message||''),name=String(e?.constructor?.name||e?.name||'');
  const status=Number(e?.response?.statusCode??e?.response?.status??e?.statusCode);
  const reason=/offline/i.test(name+' '+text)?'offline':/lack of permission|forbidden|unauthori[sz]ed/i.test(text)||[401,402,403].includes(status)?'access_denied':/rate|quota/i.test(text)||status===429?'rate_limit':/timeout|timed out/i.test(text)?'timeout':/certificate|tls|network|ENOTFOUND|ECONN/i.test(text)?'network':/empty|extract Room ID/i.test(text)?'missing_room_id':'upstream_error';
  const route=String(e?.config?.routeId||'');
  return {reason,...(/^[A-Za-z0-9_-]{1,60}$/.test(route)?{route}:{}),...(Number.isInteger(status)&&status>=100&&status<=599?{httpStatus:status}:{})};
 });
}
