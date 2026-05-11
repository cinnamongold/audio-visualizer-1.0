@echo off
setlocal
pushd "%~dp0"

where dotnet >nul 2>nul
if errorlevel 1 (
    echo dotnet was not found. Install the .NET SDK, then run this again.
    pause
    popd
    exit /b 1
)

echo Building Liquid Audio Player release...
dotnet publish "%~dp0LiquidAudioPlayer.csproj" /p:PublishProfile=WindowsSelfContained
if errorlevel 1 (
    echo.
    echo Build failed.
    pause
    popd
    exit /b 1
)

echo.
echo Release ready:
echo %~dp0artifacts\LiquidAudioPlayer-win-x64\LiquidAudioPlayer.exe
echo.
echo Run Install-LiquidAudioPlayer.cmd for the installer wizard.
pause
popd
