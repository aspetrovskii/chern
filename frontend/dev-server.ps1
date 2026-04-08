# Minimal static file server for local preview (no Node required).
param(
  [int]$Port = 5174,
  [string]$Root = $PSScriptRoot
)

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".json" = "application/json; charset=utf-8"
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Conce AI frontend: http://localhost:$Port/  (Ctrl+C to stop)"
Write-Host "Serving: $Root"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($req.Url.LocalPath)
      if ($rel -eq "/" -or $rel -eq "") { $rel = "/index.html" }
      $path = [System.IO.Path]::GetFullPath((Join-Path $Root $rel.TrimStart("/")))
      if (-not $path.StartsWith($Root)) { throw "invalid path" }
      if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        $res.StatusCode = 404
        $msg = [Text.Encoding]::UTF8.GetBytes("Not found")
        $res.ContentLength64 = $msg.Length
        $res.OutputStream.Write($msg, 0, $msg.Length)
      } else {
        $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
        $type = $mime[$ext]
        if (-not $type) { $type = "application/octet-stream" }
        $res.ContentType = $type
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      }
    } finally {
      $res.OutputStream.Close()
    }
  }
} finally {
  $listener.Stop()
}
