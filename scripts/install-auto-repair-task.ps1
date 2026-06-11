$ErrorActionPreference = "Stop"

$HiddenRunner = Join-Path $PSScriptRoot "run-auto-repair-hidden.vbs"
$TaskName = "IndustrialDesignOpsAutoRepair"
$WScript = "$env:SystemRoot\System32\wscript.exe"

$Action = New-ScheduledTaskAction -Execute $WScript -Argument "`"$HiddenRunner`""
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -MultipleInstances IgnoreNew -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Silently auto repairs Industrial Design Ops local Next.js service when localhost:3000 stops responding." -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host "Auto repair task installed: $TaskName"
Write-Host "It checks http://127.0.0.1:3000 every 5 minutes without flashing a PowerShell window."
