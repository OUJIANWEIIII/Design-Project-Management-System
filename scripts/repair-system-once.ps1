$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $Root ".logs"
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$RepairLog = Join-Path $LogDir "auto-repair.log"

function Write-RepairLog($Message) {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Encoding UTF8 -Path $RepairLog -Value "[$stamp] $Message"
}

try {
  $response = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3000/api/bootstrap" -TimeoutSec 8
  if ($response.StatusCode -eq 200) {
    Write-RepairLog "healthy"
    exit 0
  }
} catch {
  Write-RepairLog "unhealthy: $($_.Exception.Message)"
}

try {
  Write-RepairLog "starting repair"
  & powershell.exe -ExecutionPolicy Bypass -NoProfile -File (Join-Path $PSScriptRoot "start-system.ps1") -NoBrowser
  Write-RepairLog "repair finished"
} catch {
  Write-RepairLog "repair failed: $($_.Exception.Message)"
  exit 1
}
