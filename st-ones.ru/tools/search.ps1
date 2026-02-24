param(
  [Parameter(Mandatory = $true)]
  [string]$Root,
  [Parameter(Mandatory = $true)]
  [string[]]$Pattern,
  [string[]]$Include = @("*.html", "*.css", "*.js"),
  [int]$First = 200
)

$ErrorActionPreference = "Stop"

$items = Get-ChildItem -Path $Root -Recurse -File -Include $Include
$hits = $items | Select-String -Pattern $Pattern

if ($First -gt 0) {
  $hits = $hits | Select-Object -First $First
}

foreach ($h in $hits) {
  Write-Output ("{0}:{1}: {2}" -f $h.Path, $h.LineNumber, $h.Line.Trim())
}
