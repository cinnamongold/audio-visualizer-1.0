Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$projectFile = Join-Path $repoRoot "LiquidAudioPlayer.csproj"
$publishDir = Join-Path $repoRoot "artifacts\LiquidAudioPlayer-win-x64"
$publishedExe = Join-Path $publishDir "LiquidAudioPlayer.exe"
$defaultInstallDir = Join-Path $env:LOCALAPPDATA "Programs\LiquidAudioPlayer"
$desktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "Liquid Audio Player.lnk"
$startMenuDir = Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs\Liquid Audio Player"
$startMenuShortcut = Join-Path $startMenuDir "Liquid Audio Player.lnk"

function New-Label {
    param(
        [string]$Text,
        [int]$X,
        [int]$Y,
        [int]$Width,
        [int]$Height,
        [float]$Size = 10,
        [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular
    )

    $label = New-Object System.Windows.Forms.Label
    $label.Text = $Text
    $label.Location = New-Object System.Drawing.Point($X, $Y)
    $label.Size = New-Object System.Drawing.Size($Width, $Height)
    $label.Font = New-Object System.Drawing.Font("Segoe UI", $Size, $Style)
    $label.ForeColor = [System.Drawing.Color]::FromArgb(232, 242, 245)
    return $label
}

function Set-Page {
    param([int]$Index)

    $script:pageIndex = $Index
    $welcomePanel.Visible = $Index -eq 0
    $optionsPanel.Visible = $Index -eq 1
    $installPanel.Visible = $Index -eq 2
    $backButton.Enabled = $Index -gt 0 -and -not $script:isInstalling
    $nextButton.Text = if ($Index -eq 2) { "Install" } else { "Next" }
    $nextButton.Enabled = -not $script:isInstalling
}

function Write-Status {
    param([string]$Message)

    $statusBox.AppendText("$Message`r`n")
    $statusBox.SelectionStart = $statusBox.Text.Length
    $statusBox.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
}

function Invoke-ReleaseBuild {
    Write-Status "Checking release build..."
    if (Test-Path $publishedExe) {
        Write-Status "Release build already exists."
        return
    }

    Write-Status "No release build found. Publishing self-contained win-x64 build..."
    $dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
    if (-not $dotnet) {
        throw "dotnet was not found. Run Build-Release.cmd on a machine with the .NET SDK."
    }

    $publish = Start-Process -FilePath $dotnet.Source `
        -ArgumentList @("publish", $projectFile, "/p:PublishProfile=WindowsSelfContained") `
        -WorkingDirectory $repoRoot `
        -Wait `
        -PassThru `
        -NoNewWindow

    if ($publish.ExitCode -ne 0 -or -not (Test-Path $publishedExe)) {
        throw "The release build failed. Try Build-Release.cmd to see the full build output."
    }

    Write-Status "Release build created."
}

function New-Shortcut {
    param(
        [string]$ShortcutPath,
        [string]$TargetPath,
        [string]$WorkingDirectory
    )

    $parent = Split-Path -Parent $ShortcutPath
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($ShortcutPath)
    $shortcut.TargetPath = $TargetPath
    $shortcut.WorkingDirectory = $WorkingDirectory
    $shortcut.IconLocation = "$TargetPath,0"
    $shortcut.Description = "Liquid Audio Player"
    $shortcut.Save()
}

function Write-Uninstaller {
    param([string]$InstallDir)

    $uninstaller = Join-Path $InstallDir "Uninstall-LiquidAudioPlayer.cmd"
    $content = @"
@echo off
setlocal
echo Uninstalling Liquid Audio Player...
del "$desktopShortcut" >nul 2>nul
del "$startMenuShortcut" >nul 2>nul
rmdir "$startMenuDir" >nul 2>nul
cd /d "%TEMP%"
rmdir /s /q "$InstallDir"
echo Done.
pause
"@
    Set-Content -LiteralPath $uninstaller -Value $content -Encoding ASCII
}

function Install-App {
    $script:isInstalling = $true
    Set-Page 2
    $statusBox.Clear()

    try {
        Invoke-ReleaseBuild

        $installDir = $installPathBox.Text.Trim()
        if ([string]::IsNullOrWhiteSpace($installDir)) {
            throw "Choose an install folder."
        }

        Write-Status "Installing to $installDir"
        New-Item -ItemType Directory -Force -Path $installDir | Out-Null
        Copy-Item -Path (Join-Path $publishDir "*") -Destination $installDir -Recurse -Force

        $targetExe = Join-Path $installDir "LiquidAudioPlayer.exe"
        if (-not (Test-Path $targetExe)) {
            throw "The app executable was not copied correctly."
        }

        if ($desktopCheck.Checked) {
            Write-Status "Creating desktop shortcut..."
            New-Shortcut -ShortcutPath $desktopShortcut -TargetPath $targetExe -WorkingDirectory $installDir
        }

        if ($startMenuCheck.Checked) {
            Write-Status "Creating Start Menu shortcut..."
            New-Shortcut -ShortcutPath $startMenuShortcut -TargetPath $targetExe -WorkingDirectory $installDir
        }

        Write-Uninstaller -InstallDir $installDir
        Write-Status "Install complete."

        if ($launchCheck.Checked) {
            Write-Status "Launching Liquid Audio Player..."
            Start-Process -FilePath $targetExe -WorkingDirectory $installDir
        }

        $nextButton.Text = "Finish"
        $nextButton.Enabled = $true
        $cancelButton.Text = "Close"
    }
    catch {
        Write-Status ""
        Write-Status "Install failed: $($_.Exception.Message)"
        $nextButton.Text = "Try Again"
        $nextButton.Enabled = $true
        $backButton.Enabled = $true
    }
    finally {
        $script:isInstalling = $false
    }
}

$script:pageIndex = 0
$script:isInstalling = $false

$form = New-Object System.Windows.Forms.Form
$form.Text = "Liquid Audio Player Setup"
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.ClientSize = New-Object System.Drawing.Size(680, 440)
$form.BackColor = [System.Drawing.Color]::FromArgb(12, 16, 18)

$header = New-Object System.Windows.Forms.Panel
$header.Location = New-Object System.Drawing.Point(0, 0)
$header.Size = New-Object System.Drawing.Size(680, 82)
$header.BackColor = [System.Drawing.Color]::FromArgb(20, 29, 32)
$form.Controls.Add($header)

$title = New-Label "Liquid Audio Player Setup" 28 16 520 30 16 ([System.Drawing.FontStyle]::Bold)
$subtitle = New-Label "Install the self-contained Windows app and create reliable launch shortcuts." 29 48 560 22 9
$header.Controls.Add($title)
$header.Controls.Add($subtitle)

$welcomePanel = New-Object System.Windows.Forms.Panel
$welcomePanel.Location = New-Object System.Drawing.Point(28, 106)
$welcomePanel.Size = New-Object System.Drawing.Size(624, 248)
$welcomePanel.BackColor = $form.BackColor
$form.Controls.Add($welcomePanel)

$welcomePanel.Controls.Add((New-Label "This wizard installs Liquid Audio Player without requiring admin rights." 0 0 600 26 11 ([System.Drawing.FontStyle]::Bold)))
$welcomePanel.Controls.Add((New-Label "It will use a self-contained release build so launching the app does not depend on CMD being in the correct folder. If the release build does not exist yet, the wizard will try to create it with dotnet publish." 0 42 600 70 10))
$welcomePanel.Controls.Add((New-Label "Install location defaults to your local user profile: %LOCALAPPDATA%\Programs\LiquidAudioPlayer" 0 128 600 32 9))
$welcomePanel.Controls.Add((New-Label "You can still use Run-LiquidAudioPlayer.cmd from the project folder for quick development launches." 0 174 600 32 9))

$optionsPanel = New-Object System.Windows.Forms.Panel
$optionsPanel.Location = New-Object System.Drawing.Point(28, 106)
$optionsPanel.Size = New-Object System.Drawing.Size(624, 248)
$optionsPanel.BackColor = $form.BackColor
$optionsPanel.Visible = $false
$form.Controls.Add($optionsPanel)

$optionsPanel.Controls.Add((New-Label "Choose install options" 0 0 600 26 12 ([System.Drawing.FontStyle]::Bold)))
$optionsPanel.Controls.Add((New-Label "Install folder" 0 44 180 24 9))

$installPathBox = New-Object System.Windows.Forms.TextBox
$installPathBox.Location = New-Object System.Drawing.Point(0, 72)
$installPathBox.Size = New-Object System.Drawing.Size(510, 26)
$installPathBox.Text = $defaultInstallDir
$installPathBox.BackColor = [System.Drawing.Color]::FromArgb(25, 34, 37)
$installPathBox.ForeColor = [System.Drawing.Color]::White
$installPathBox.BorderStyle = "FixedSingle"
$optionsPanel.Controls.Add($installPathBox)

$browseButton = New-Object System.Windows.Forms.Button
$browseButton.Text = "Browse"
$browseButton.Location = New-Object System.Drawing.Point(522, 70)
$browseButton.Size = New-Object System.Drawing.Size(90, 30)
$browseButton.FlatStyle = "Flat"
$browseButton.BackColor = [System.Drawing.Color]::FromArgb(42, 58, 62)
$browseButton.ForeColor = [System.Drawing.Color]::White
$browseButton.Add_Click({
    $folder = New-Object System.Windows.Forms.FolderBrowserDialog
    $folder.Description = "Choose where to install Liquid Audio Player"
    $folder.SelectedPath = $installPathBox.Text
    if ($folder.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $installPathBox.Text = $folder.SelectedPath
    }
})
$optionsPanel.Controls.Add($browseButton)

$desktopCheck = New-Object System.Windows.Forms.CheckBox
$desktopCheck.Text = "Create desktop shortcut"
$desktopCheck.Location = New-Object System.Drawing.Point(0, 128)
$desktopCheck.Size = New-Object System.Drawing.Size(260, 28)
$desktopCheck.Checked = $true
$desktopCheck.ForeColor = [System.Drawing.Color]::FromArgb(232, 242, 245)
$desktopCheck.BackColor = $form.BackColor
$optionsPanel.Controls.Add($desktopCheck)

$startMenuCheck = New-Object System.Windows.Forms.CheckBox
$startMenuCheck.Text = "Create Start Menu shortcut"
$startMenuCheck.Location = New-Object System.Drawing.Point(0, 162)
$startMenuCheck.Size = New-Object System.Drawing.Size(280, 28)
$startMenuCheck.Checked = $true
$startMenuCheck.ForeColor = [System.Drawing.Color]::FromArgb(232, 242, 245)
$startMenuCheck.BackColor = $form.BackColor
$optionsPanel.Controls.Add($startMenuCheck)

$launchCheck = New-Object System.Windows.Forms.CheckBox
$launchCheck.Text = "Launch after install"
$launchCheck.Location = New-Object System.Drawing.Point(0, 196)
$launchCheck.Size = New-Object System.Drawing.Size(220, 28)
$launchCheck.Checked = $true
$launchCheck.ForeColor = [System.Drawing.Color]::FromArgb(232, 242, 245)
$launchCheck.BackColor = $form.BackColor
$optionsPanel.Controls.Add($launchCheck)

$installPanel = New-Object System.Windows.Forms.Panel
$installPanel.Location = New-Object System.Drawing.Point(28, 106)
$installPanel.Size = New-Object System.Drawing.Size(624, 248)
$installPanel.BackColor = $form.BackColor
$installPanel.Visible = $false
$form.Controls.Add($installPanel)

$installPanel.Controls.Add((New-Label "Installing" 0 0 600 26 12 ([System.Drawing.FontStyle]::Bold)))
$statusBox = New-Object System.Windows.Forms.TextBox
$statusBox.Location = New-Object System.Drawing.Point(0, 42)
$statusBox.Size = New-Object System.Drawing.Size(624, 190)
$statusBox.Multiline = $true
$statusBox.ReadOnly = $true
$statusBox.ScrollBars = "Vertical"
$statusBox.BackColor = [System.Drawing.Color]::FromArgb(5, 8, 9)
$statusBox.ForeColor = [System.Drawing.Color]::FromArgb(220, 246, 241)
$statusBox.BorderStyle = "FixedSingle"
$installPanel.Controls.Add($statusBox)

$divider = New-Object System.Windows.Forms.Panel
$divider.Location = New-Object System.Drawing.Point(0, 370)
$divider.Size = New-Object System.Drawing.Size(680, 1)
$divider.BackColor = [System.Drawing.Color]::FromArgb(50, 72, 76)
$form.Controls.Add($divider)

$backButton = New-Object System.Windows.Forms.Button
$backButton.Text = "Back"
$backButton.Location = New-Object System.Drawing.Point(382, 390)
$backButton.Size = New-Object System.Drawing.Size(82, 30)
$backButton.Enabled = $false
$backButton.FlatStyle = "Flat"
$backButton.BackColor = [System.Drawing.Color]::FromArgb(42, 58, 62)
$backButton.ForeColor = [System.Drawing.Color]::White
$backButton.Add_Click({
    if ($script:pageIndex -gt 0) {
        Set-Page ($script:pageIndex - 1)
    }
})
$form.Controls.Add($backButton)

$nextButton = New-Object System.Windows.Forms.Button
$nextButton.Text = "Next"
$nextButton.Location = New-Object System.Drawing.Point(474, 390)
$nextButton.Size = New-Object System.Drawing.Size(82, 30)
$nextButton.FlatStyle = "Flat"
$nextButton.BackColor = [System.Drawing.Color]::FromArgb(72, 197, 151)
$nextButton.ForeColor = [System.Drawing.Color]::FromArgb(8, 18, 14)
$nextButton.Add_Click({
    if ($script:pageIndex -eq 0) {
        Set-Page 1
        return
    }

    if ($script:pageIndex -eq 1) {
        Set-Page 2
        Install-App
        return
    }

    if ($nextButton.Text -eq "Finish") {
        $form.Close()
        return
    }

    Install-App
})
$form.Controls.Add($nextButton)

$cancelButton = New-Object System.Windows.Forms.Button
$cancelButton.Text = "Cancel"
$cancelButton.Location = New-Object System.Drawing.Point(568, 390)
$cancelButton.Size = New-Object System.Drawing.Size(82, 30)
$cancelButton.FlatStyle = "Flat"
$cancelButton.BackColor = [System.Drawing.Color]::FromArgb(58, 42, 45)
$cancelButton.ForeColor = [System.Drawing.Color]::White
$cancelButton.Add_Click({ $form.Close() })
$form.Controls.Add($cancelButton)

[void]$form.ShowDialog()
