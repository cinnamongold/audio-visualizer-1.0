param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('List', 'Rename')]
  [string]$Action,

  [string]$InstanceId,
  [string]$NewName
)

$ErrorActionPreference = 'Stop'

function Get-BluetoothCandidates {
  try {
    $devices = Get-PnpDevice -PresentOnly | Where-Object {
      $_.Class -eq 'Bluetooth' -or $_.InstanceId -like 'BTH*' -or $_.FriendlyName -match 'Bluetooth'
    }

    return $devices |
      Sort-Object FriendlyName, InstanceId -Unique |
      ForEach-Object {
        [PSCustomObject]@{
          name = if ($_.FriendlyName) { $_.FriendlyName } elseif ($_.Name) { $_.Name } else { $_.InstanceId }
          status = $_.Status
          class = $_.Class
          instanceId = $_.InstanceId
        }
      }
  }
  catch {
    $cimDevices = Get-CimInstance Win32_PnPEntity | Where-Object {
      $_.PNPClass -eq 'Bluetooth' -or $_.DeviceID -like 'BTH*' -or $_.Name -match 'Bluetooth'
    }

    return $cimDevices |
      Sort-Object Name, DeviceID -Unique |
      ForEach-Object {
        [PSCustomObject]@{
          name = if ($_.Name) { $_.Name } else { $_.DeviceID }
          status = if ($_.Status) { $_.Status } else { 'Unknown' }
          class = if ($_.PNPClass) { $_.PNPClass } else { 'Unknown' }
          instanceId = $_.DeviceID
        }
      }
  }
}

switch ($Action) {
  'List' {
    $result = [PSCustomObject]@{
      devices = @(Get-BluetoothCandidates)
      note = 'Only devices surfaced by Windows Plug and Play are listed. Some Bluetooth accessories do not expose a user-renamable PnP friendly name.'
    }

    $result | ConvertTo-Json -Depth 4
    break
  }

  'Rename' {
    if ([string]::IsNullOrWhiteSpace($InstanceId) -or [string]::IsNullOrWhiteSpace($NewName)) {
      throw 'InstanceId and NewName are required for rename.'
    }

    try {
      $device = Get-PnpDevice | Where-Object { $_.InstanceId -eq $InstanceId } | Select-Object -First 1
    }
    catch {
      $device = Get-CimInstance Win32_PnPEntity | Where-Object { $_.DeviceID -eq $InstanceId } | Select-Object -First 1
    }

    if (-not $device) {
      throw "Device not found: $InstanceId"
    }

    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$InstanceId"

    try {
      Set-ItemProperty -LiteralPath $regPath -Name 'FriendlyName' -Value $NewName
      $method = 'registry-friendly-name'
    }
    catch {
      throw "Unable to update FriendlyName in registry path $regPath. Try running the server from an elevated PowerShell or Command Prompt. $($_.Exception.Message)"
    }

    try {
      $updated = Get-PnpDevice | Where-Object { $_.InstanceId -eq $InstanceId } | Select-Object -First 1
    }
    catch {
      $updated = Get-CimInstance Win32_PnPEntity | Where-Object { $_.DeviceID -eq $InstanceId } | Select-Object -First 1
    }

    [PSCustomObject]@{
      success = $true
      method = $method
      instanceId = $InstanceId
      requestedName = $NewName
      currentReportedName = if ($updated.FriendlyName) { $updated.FriendlyName } elseif ($updated.Name) { $updated.Name } else { $InstanceId }
      message = 'Rename command completed. You may need to disconnect/reconnect the device or reboot before Windows fully reflects the new label everywhere.'
    } | ConvertTo-Json -Depth 4
    break
  }
}
