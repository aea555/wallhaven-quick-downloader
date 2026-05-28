# Builds the Chrome Web Store upload zip.
#
# - Includes only what the extension needs (manifest.json + src/_locales/fonts/icons).
# - Puts manifest.json at the zip root and uses forward-slash entry paths, which
#   the Web Store requires (Windows' Compress-Archive uses backslashes and can
#   make the upload fail).
# - Names the zip from the manifest version.
#
# Run:  powershell -ExecutionPolicy Bypass -File package.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

$version = (Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json).version
$zip = Join-Path $root ("wallhaven-quick-downloader-v{0}.zip" -f $version)
if (Test-Path $zip) { Remove-Item $zip -Force }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$include = @("manifest.json", "src", "_locales", "fonts", "icons")
$files = @()
foreach ($item in $include) {
  $p = Join-Path $root $item
  if (-not (Test-Path $p)) { throw "Missing: $item" }
  if (Test-Path $p -PathType Leaf) { $files += Get-Item $p }
  else { $files += Get-ChildItem $p -Recurse -File }
}

$archive = [System.IO.Compression.ZipFile]::Open($zip, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($root.Length + 1).Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $f.FullName, $rel) | Out-Null
  }
} finally {
  $archive.Dispose()
}

Write-Host ("Built {0} ({1:N0} bytes, {2} files)" -f (Split-Path $zip -Leaf), (Get-Item $zip).Length, $files.Count)
