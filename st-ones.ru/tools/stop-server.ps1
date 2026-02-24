param()

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $scriptDir "server.pid"

if (-not (Test-Path -LiteralPath $pidFile -PathType Leaf)) {
  Write-Output "No pid file found."
  exit 0
}

$pidText = [System.IO.File]::ReadAllText($pidFile).Trim()
if ([string]::IsNullOrWhiteSpace($pidText)) {
  Remove-Item -LiteralPath $pidFile -Force
  Write-Output "PID file was empty."
  exit 0
}

$pid = [int]$pidText
$proc = Get-Process -Id $pid -ErrorAction SilentlyContinue

if ($null -ne $proc) {
  Stop-Process -Id $pid -Force
  Write-Output "Stopped process $pid."
} else {
  Write-Output "Process $pid is not running."
}

Remove-Item -LiteralPath $pidFile -Force
