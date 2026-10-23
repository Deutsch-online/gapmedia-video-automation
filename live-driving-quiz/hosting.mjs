import {randomBytes} from 'node:crypto';

export function hostingConfig(env=process.env) {
  const inferred=env.SPACE_HOST?`https://${env.SPACE_HOST}`:'';
  const publicUrl=env.PUBLIC_URL||inferred;
  const port=Number(env.PORT||(publicUrl?7860:4317));
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid PORT');
  let publicOrigin=null;
  if(publicUrl){
    const url=new URL(publicUrl);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('PUBLIC_URL must be a plain HTTPS origin');
    publicOrigin=url.origin;
    if(!/^[A-Za-z0-9_-]{40,128}$/.test(env.QUIZ_ADMIN_TOKEN||''))throw Error('Public hosting requires a private administrative token');
  }
  const bind=env.QUIZ_BIND_HOST||(publicOrigin?'0.0.0.0':'127.0.0.1');
  if(!['127.0.0.1','0.0.0.0'].includes(bind)||(!publicOrigin&&bind!=='127.0.0.1'))throw Error('Public bind requires configured HTTPS hosting');
  const local=`http://127.0.0.1:${port}`;
  const allowedHosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`,...(publicOrigin?[new URL(publicOrigin).host]:[])]);
  const allowedOrigins=new Set([local,`http://localhost:${port}`,...(publicOrigin?[publicOrigin]:[])]);
  return {port,bind,base:publicOrigin||local,publicOrigin,allowedHosts,allowedOrigins,token:publicOrigin?env.QUIZ_ADMIN_TOKEN:randomBytes(24).toString('hex')};
}
