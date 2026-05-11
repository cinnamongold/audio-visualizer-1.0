# Liquid Audio Player - Running and Installing

## Easiest development launch

Double-click:

```text
Run-LiquidAudioPlayer.cmd
```

That launcher tries the published app first, then the debug build, then falls back to `dotnet run`.

## Build a reliable release

Double-click:

```text
Build-Release.cmd
```

This creates a self-contained Windows release at:

```text
artifacts\LiquidAudioPlayer-win-x64\LiquidAudioPlayer.exe
```

## Install with the wizard

Double-click:

```text
Install-LiquidAudioPlayer.cmd
```

The wizard installs the app to:

```text
%LOCALAPPDATA%\Programs\LiquidAudioPlayer
```

It can also create Desktop and Start Menu shortcuts. This install path does not require administrator permissions.
