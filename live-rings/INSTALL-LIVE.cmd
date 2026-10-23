@echo off
cd /d "%~dp0"
call npm install --ignore-scripts --no-audit --no-fund
node -e "import('tiktok-live-connector').then(()=>console.log('Live connector is ready.')).catch(()=>{console.error('Installation failed. Check your internet and npm registry.');process.exitCode=1;})"
pause
