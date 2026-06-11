param(
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$LogDir = Join-Path $Root ".logs"
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$OutLog = Join-Path $LogDir "next-dev.out.log"
$ErrLog = Join-Path $LogDir "next-dev.err.log"
$NodePath = Join-Path $Root ".tools\node-v20.19.5-win-x64\node.exe"
if (!(Test-Path $NodePath)) {
  $NodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if (!$NodeCommand) { throw "Node.js was not found. Install Node.js 20, or keep the bundled .tools runtime." }
  $NodePath = $NodeCommand.Source
}

Write-Host "Checking port 3000..."
$connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
foreach ($connection in $connections) {
  $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
  if ($process -and $process.Path -and $process.Path.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) {
    Write-Host "Stopping stale project service PID $($process.Id)"
    Stop-Process -Id $process.Id -Force
  }
}

Write-Host "Checking database columns..."
& $NodePath "scripts\add-round-reminder-column.mjs" | Out-Host
& $NodePath "scripts\add-reminder-dedupe-key.mjs" | Out-Host

Write-Host "Starting system..."
Start-Process -FilePath $NodePath -ArgumentList ".\node_modules\next\dist\bin\next", "dev", "-H", "127.0.0.1", "-p", "3000" -WorkingDirectory $Root -RedirectStandardOutput $OutLog -RedirectStandardError $ErrLog -WindowStyle Hidden

Write-Host "Waiting for service..."
$ready = $false
for ($i = 0; $i -lt 45; $i++) {
  Start-Sleep -Seconds 1
  try {
    $response = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3000/api/bootstrap" -TimeoutSec 3
    if ($response.StatusCode -eq 200) { $ready = $true; break }
  } catch {}
}

if (!$ready) {
  Write-Host "Startup failed or timed out. Recent logs:"
  if (Test-Path $OutLog) { Get-Content $OutLog -Tail 40 | Out-Host }
  if (Test-Path $ErrLog) { Get-Content $ErrLog -Tail 40 | Out-Host }
  throw "The system did not start within 45 seconds."
}

Write-Host "System is ready: http://127.0.0.1:3000"
if (!$NoBrowser) { Start-Process "http://127.0.0.1:3000" }
