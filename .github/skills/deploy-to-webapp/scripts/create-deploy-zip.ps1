<#
.SYNOPSIS
  Builds deploy.zip from dist/ with forward-slash zip entry paths.

.DESCRIPTION
  PowerShell's Compress-Archive (and ZipFile.CreateFromDirectory via the
  legacy System.IO.Compression.FileSystem assembly) write zip entry paths
  using the Windows backslash separator. The Linux-based Azure App Service
  Kudu rsync deploy step cannot parse those paths and fails with errors like:
    rsync: [generator] recv_generator: failed to stat
    "/home/site/wwwroot/evening-rsvp\index.html": Invalid argument (22)

  This script creates the zip entry-by-entry with explicit forward-slash
  names to avoid that failure. Run from the repo root after `node build.mjs`
  and after copying server.mjs/package.json into dist/.

.EXAMPLE
  cd C:\Users\joe_c\wedding-website
  node build.mjs
  Copy-Item server.mjs dist\server.mjs -Force
  Copy-Item package.json dist\package.json -Force
  .\.github\skills\deploy-to-webapp\scripts\create-deploy-zip.ps1
#>

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$distPath = Join-Path $repoRoot "dist"
$zipPath = Join-Path $repoRoot "deploy.zip"

if (-not (Test-Path $distPath)) {
    throw "dist/ not found at $distPath. Run 'node build.mjs' first."
}

Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$fs = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)

try {
    Get-ChildItem -Path $distPath -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Substring($distPath.Length + 1) -replace '\\', '/'
        $entry = $archive.CreateEntry($relativePath, [System.IO.Compression.CompressionLevel]::Optimal)
        $entryStream = $entry.Open()
        try {
            $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
            $entryStream.Write($bytes, 0, $bytes.Length)
        }
        finally {
            $entryStream.Close()
        }
    }
}
finally {
    $archive.Dispose()
    $fs.Dispose()
}

Write-Output "Created $zipPath"
