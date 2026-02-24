param(
  [string]$Root = ".",
  [int]$Port = 4173
)

$ErrorActionPreference = "Stop"

$rootPath = [System.IO.Path]::GetFullPath($Root)
if (-not (Test-Path -LiteralPath $rootPath -PathType Container)) {
  throw "Root path not found: $rootPath"
}

function Get-ContentType {
  param([string]$Path)
  $ext = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
  switch ($ext) {
    ".html" { "text/html; charset=utf-8" }
    ".htm" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".svg" { "image/svg+xml" }
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".webp" { "image/webp" }
    ".gif" { "image/gif" }
    ".ico" { "image/x-icon" }
    ".woff" { "font/woff" }
    ".woff2" { "font/woff2" }
    ".ttf" { "font/ttf" }
    ".eot" { "application/vnd.ms-fontobject" }
    ".xml" { "application/xml; charset=utf-8" }
    ".txt" { "text/plain; charset=utf-8" }
    default { "application/octet-stream" }
  }
}

function Resolve-RequestPath {
  param([string]$RawUrlPath)

  $decoded = [System.Uri]::UnescapeDataString($RawUrlPath)
  if ([string]::IsNullOrWhiteSpace($decoded)) {
    $decoded = "/"
  }

  if ($decoded.StartsWith("/")) {
    $decoded = $decoded.Substring(1)
  }

  if ([string]::IsNullOrWhiteSpace($decoded)) {
    return "index.html"
  }

  $candidate = $decoded.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
  $fullCandidate = Join-Path $rootPath $candidate

  if (Test-Path -LiteralPath $fullCandidate -PathType Container) {
    return Join-Path $candidate "index.html"
  }

  if ([System.IO.Path]::GetExtension($candidate) -eq "") {
    $asDirectoryIndex = Join-Path $candidate "index.html"
    $fullAsDirectoryIndex = Join-Path $rootPath $asDirectoryIndex
    if (Test-Path -LiteralPath $fullAsDirectoryIndex -PathType Leaf) {
      return $asDirectoryIndex
    }
  }

  return $candidate
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

Write-Host "Serving: $rootPath"
Write-Host "URL: http://localhost:$Port/"

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $relativePath = Resolve-RequestPath -RawUrlPath $request.Url.AbsolutePath
    $fullPath = Join-Path $rootPath $relativePath
    $normalizedFullPath = [System.IO.Path]::GetFullPath($fullPath)

    if (-not $normalizedFullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
      $response.StatusCode = 403
      $response.Close()
      continue
    }

    if (Test-Path -LiteralPath $normalizedFullPath -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($normalizedFullPath)
      $response.StatusCode = 200
      $response.ContentType = Get-ContentType -Path $normalizedFullPath
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $response.StatusCode = 404
      $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $response.ContentType = "text/plain; charset=utf-8"
      $response.ContentLength64 = $notFound.Length
      $response.OutputStream.Write($notFound, 0, $notFound.Length)
    }

    $response.OutputStream.Close()
  } catch {
    if ($listener.IsListening) {
      try {
        $context.Response.StatusCode = 500
        $payload = [System.Text.Encoding]::UTF8.GetBytes("500 Internal Server Error")
        $context.Response.ContentType = "text/plain; charset=utf-8"
        $context.Response.ContentLength64 = $payload.Length
        $context.Response.OutputStream.Write($payload, 0, $payload.Length)
        $context.Response.OutputStream.Close()
      } catch {
      }
    }
  }
}
