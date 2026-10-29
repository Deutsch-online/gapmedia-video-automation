@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22 or newer from https://nodejs.org first.
 pause
 exit /b 1
)
py -3 -m venv .venv
if errorlevel 1 (
 echo Install Python 3.11 or newer from https://python.org first.
 pause
 exit /b 1
)
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto failed
call npm ci --ignore-scripts --no-audit --no-fund
if errorlevel 1 goto failed
echo Setup complete. Open START-WINDOWS.cmd to launch Aryana.
pause
exit /b 0
:failed
echo Setup did not finish. Check the error above and try again.
pause
exit /b 1
