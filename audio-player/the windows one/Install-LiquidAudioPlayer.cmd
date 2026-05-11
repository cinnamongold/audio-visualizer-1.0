@echo off
setlocal
pushd "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Scripts\Install-LiquidAudioPlayer.ps1"
set "EXITCODE=%ERRORLEVEL%"

popd
exit /b %EXITCODE%
