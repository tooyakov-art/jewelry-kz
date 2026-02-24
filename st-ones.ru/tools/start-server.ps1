param(
  [string]$Root = ".",
  [int]$Port = 4173
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $scriptDir "serve-static.ps1"
$rootPath = [System.IO.Path]::GetFullPath($Root)

if (-not (Test-Path -LiteralPath $serverScript -PathType Leaf)) {
  throw "Server script not found: $serverScript"
}

if (-not (Test-Path -LiteralPath $rootPath -PathType Container)) {
  throw "Root path not found: $rootPath"
}

$psExe = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$args = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $serverScript,
  "-Root", $rootPath,
  "-Port", $Port
)

$proc = Start-Process -FilePath $psExe -ArgumentList $args -WindowStyle Hidden -PassThru
$pidFile = Join-Path $scriptDir "server.pid"
[System.IO.File]::WriteAllText($pidFile, $proc.Id.ToString())

Write-Output $proc.Id
