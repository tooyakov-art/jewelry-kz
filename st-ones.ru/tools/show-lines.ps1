param(
  [Parameter(Mandatory = $true)]
  [string]$Path,
  [int]$Start = 1,
  [int]$Count = 80
)

$ErrorActionPreference = "Stop"

$lines = Get-Content -Path $Path
$from = [Math]::Max($Start - 1, 0)
$to = [Math]::Min($from + $Count - 1, $lines.Length - 1)

for ($i = $from; $i -le $to; $i++) {
  Write-Output ("{0}: {1}" -f ($i + 1), $lines[$i])
}
