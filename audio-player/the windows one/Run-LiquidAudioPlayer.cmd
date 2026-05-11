@echo off
setlocal
pushd "%~dp0"

set "PUBLISHED_EXE=%~dp0artifacts\LiquidAudioPlayer-win-x64\LiquidAudioPlayer.exe"
set "DEBUG_EXE=%~dp0bin\Debug\net10.0-windows\LiquidAudioPlayer.exe"

if exist "%PUBLISHED_EXE%" (
    start "" "%PUBLISHED_EXE%"
    popd
    exit /b 0
)

if exist "%DEBUG_EXE%" (
    start "" "%DEBUG_EXE%"
    popd
    exit /b 0
)

where dotnet >nul 2>nul
if errorlevel 1 (
    echo Liquid Audio Player has not been built yet, and dotnet was not found.
    echo Run Build-Release.cmd on this machine, or install using Install-LiquidAudioPlayer.cmd after a release build exists.
    pause
    popd
    exit /b 1
)

dotnet run --project "%~dp0LiquidAudioPlayer.csproj"
set "EXITCODE=%ERRORLEVEL%"
popd
exit /b %EXITCODE%
