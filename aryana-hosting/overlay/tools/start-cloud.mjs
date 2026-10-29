import {spawn} from 'node:child_process';
const env={...process.env,ARYANA_PYTHON:process.env.ARYANA_PYTHON||'/opt/venv/bin/python'};
let stopping=false;const children=['src/server.mjs','tools/remote-bridge.mjs'].map(file=>spawn(process.execPath,[file],{env,stdio:'inherit'}));
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');setTimeout(()=>{for(const child of children)child.kill('SIGKILL');process.exit(code);},5000).unref();process.exitCode=code;}
for(const child of children){child.on('error',()=>stop(1));child.on('exit',code=>{if(!stopping)stop(code||1);});}process.on('SIGTERM',()=>stop());process.on('SIGINT',()=>stop());
