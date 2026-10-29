@echo off
cd /d "%~dp0"
echo This OPTIONAL setup downloads about 1.2 GB of model assets plus Python packages.
echo It enables slow offline talking clips, not realtime animation.
where git >nul 2>nul
if errorlevel 1 (
 echo Install Git for Windows first: https://git-scm.com/download/win
 pause
 exit /b 1
)
py -3.12 -m venv .avatar-env
if errorlevel 1 goto failed
.avatar-env\Scripts\python.exe -m pip install torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
if errorlevel 1 goto failed
.avatar-env\Scripts\python.exe -m pip install -r requirements-avatar-cpu.txt
if errorlevel 1 goto failed
.avatar-env\Scripts\python.exe tools\setup-avatar-models.py --directory .avatar-models\SadTalker
if errorlevel 1 goto failed
echo Setup complete. Use START-AVATAR-WINDOWS.cmd to enable offline previews.
pause
exit /b 0
:failed
echo Avatar setup did not finish. Check the error above.
pause
exit /b 1
