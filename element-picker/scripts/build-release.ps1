<#
.SYNOPSIS
Builds a store-ready zip for HSN Dev Bridge Design.

.DESCRIPTION
Validates manifest.json, required runtime files, icon dimensions and a
no-remote-code lint, then produces:
    releases/element-picker-<version>.zip
    releases/element-picker-<version>.zip.sha256

The zip contains the extension at its root (manifest.json at top level) and
excludes development-only folders (docs/, demo/, scripts/, releases/).

.EXAMPLE
powershell -ExecutionPolicy Bypass -File scripts/build-release.ps1
#>
param(
    [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem

$ProjectDir = [System.IO.Path]::GetFullPath($ProjectDir)
Write-Host "Project: $ProjectDir"

# ---------------------------------------------------------------- manifest
$manifestPath = Join-Path $ProjectDir 'manifest.json'
if (-not (Test-Path $manifestPath)) { throw "manifest.json not found at $manifestPath" }
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$ver = [string]$manifest.version
if ($ver -notmatch '^\d+\.\d+\.\d+$') { throw "Unsupported version '$ver' - expected semver x.y.z" }
Write-Host "Version : $ver"
Write-Host "Name    : $($manifest.name)"

# ------------------------------------------------------- required file set
$runtimeFiles = @(
    'background.js',
    'content/capture-format.js',
    'content/selector.js',
    'content/picker.js',
    'content/picker.css',
    'content/send.js',
    'popup/popup.html',
    'popup/popup.css',
    'popup/popup.js'
)
foreach ($rel in $runtimeFiles) {
    if (-not (Test-Path (Join-Path $ProjectDir $rel))) { throw "Missing required file: $rel" }
}
Write-Host "Runtime file set: OK ($($runtimeFiles.Count) files)"

# ---------------------------------------------------------------- icons
foreach ($size in @(16, 32, 48, 128)) {
    $rel = "icons/icon$size.png"
    $path = Join-Path $ProjectDir $rel
    if (-not (Test-Path $path)) { throw "Missing icon: $rel" }
    $img = [System.Drawing.Image]::FromFile($path)
    try {
        if ($img.Width -ne $size -or $img.Height -ne $size) {
            throw "Icon $rel is $($img.Width)x$($img.Height), expected ${size}x${size}"
        }
    } finally { $img.Dispose() }
}
Write-Host 'Icons: OK (16/32/48/128 at expected dimensions)'

# ------------------------------------------------------------- no-remote lint
$lintPatterns = @('fetch\s*\(', 'XMLHttpRequest', 'new WebSocket', 'navigator\.sendBeacon', 'importScripts', '\beval\s*\(', 'new Function')
$jsFiles = Get-ChildItem -Path (Join-Path $ProjectDir 'content'), (Join-Path $ProjectDir 'popup'), (Join-Path $ProjectDir '*.js') -Filter '*.js' -ErrorAction SilentlyContinue
foreach ($file in $jsFiles) {
    $text = Get-Content $file.FullName -Raw
    foreach ($pat in $lintPatterns) {
        if ($text -match $pat) {
            throw "Remote-code / network pattern '$pat' found in $($file.FullName)"
        }
    }
}
Write-Host 'Lint: OK (no remote-code or network calls in shipped JS)'

# ------------------------------------------------------------------- stage
$staging = Join-Path ([System.IO.Path]::GetTempPath()) ("dshpc-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $staging | Out-Null
try {
    $copyList = @('manifest.json') + $runtimeFiles + @('icons/icon16.png','icons/icon32.png','icons/icon48.png','icons/icon128.png')
    foreach ($rel in $copyList) {
        $src = Join-Path $ProjectDir $rel
        $dst = Join-Path $staging $rel
        $null = New-Item -ItemType Directory -Path (Split-Path $dst) -Force
        Copy-Item $src $dst -Force
    }
    Write-Host "Staged at: $staging"

    # ----------------------------------------------------------------- zip
    $releaseDir = Join-Path $ProjectDir 'releases'
    $null = New-Item -ItemType Directory -Path $releaseDir -Force
    $zipPath = Join-Path $releaseDir "element-picker-$ver.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    if (Test-Path "$zipPath.sha256") { Remove-Item "$zipPath.sha256" -Force }

    Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -CompressionLevel Optimal
    if (-not (Test-Path $zipPath)) { throw 'Compress-Archive produced no zip' }

    # verify manifest sits at zip root
    $zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
        $names = @($zip.Entries | ForEach-Object { $_.FullName })
        if ($names -notcontains 'manifest.json') { throw 'Zip is missing manifest.json at its root' }
        Write-Host "Zip entries: $($names.Count) (manifest.json at root: yes)"
    } finally { $zip.Dispose() }

    $hash = (Get-FileHash -Algorithm SHA256 -Path $zipPath).Hash
    Set-Content -Path "$zipPath.sha256" -Value "$hash  element-picker-$ver.zip" -NoNewline

    Write-Host ''
    Write-Host "Built     : $zipPath"
    Write-Host "SHA-256   : $hash"
    Write-Host "Checksum  : $zipPath.sha256"
} finally {
    if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
}

