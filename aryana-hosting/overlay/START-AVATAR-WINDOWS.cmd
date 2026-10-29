@echo off
cd /d "%~dp0"
where ffmpeg >nul 2>nul
if errorlevel 1 (
 echo Install FFmpeg and add it to PATH first: https://ffmpeg.org/download.html
 pause
 exit /b 1
)
set "ARYANA_AVATAR_PYTHON=%~dp0.avatar-env\Scripts\python.exe"
set "ARYANA_SADTALKER_ROOT=%~dp0.avatar-models\SadTalker"
if not exist "%ARYANA_AVATAR_PYTHON%" (
 echo Run SETUP-AVATAR-WINDOWS.cmd first.
 pause
 exit /b 1
)
call START-WINDOWS.cmd
