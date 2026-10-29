@echo off
cd /d "%~dp0"
if not exist node_modules (
 echo Run SETUP-WINDOWS.cmd first.
 pause
 exit /b 1
)
start "" http://127.0.0.1:4321
node --env-file-if-exists=.env src/server.mjs
pause
