param(
  [Parameter(Mandatory = $true)]
  [int]$ProcessId
)

$ErrorActionPreference = "Stop"

$proc = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId"

if ($null -eq $proc) {
  Write-Output "Process not found: $ProcessId"
  exit 1
}

Write-Output ("ProcessId: " + $proc.ProcessId)
Write-Output ("Name: " + $proc.Name)
Write-Output ("ExecutablePath: " + $proc.ExecutablePath)
Write-Output ("ParentProcessId: " + $proc.ParentProcessId)
Write-Output ("CommandLine: " + $proc.CommandLine)
