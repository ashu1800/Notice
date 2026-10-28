[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Version,
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Fail([string]$Message) {
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    $Encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $Encoding)
}

Write-Host "== Notice release preflight ==" -ForegroundColor Cyan

if (-not (Get-Command wails3 -ErrorAction SilentlyContinue)) {
    Fail "wails3 is not in PATH"
}
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Fail "gh is not in PATH"
}
if (-not (Get-Command makensis -ErrorAction SilentlyContinue)) {
    $NsisDir = "C:\Program Files (x86)\NSIS"
    if (Test-Path (Join-Path $NsisDir "makensis.exe")) {
        $env:PATH = "$NsisDir;$env:PATH"
    }
    else {
        Fail "makensis is not in PATH and NSIS was not found at $NsisDir"
    }
}
gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    Fail "gh is not authenticated; run: gh auth login"
}

$Status = git status --porcelain
if ($Status) {
    Fail "working tree is not clean; commit or stash changes first"
}
if ((git branch --show-current) -ne "main") {
    Fail "release must run from the main branch"
}
if (-not (git remote get-url origin 2>$null)) {
    Fail "origin remote is not configured"
}

$CurrentVersion = (Get-Content -Raw (Join-Path $Root "VERSION")).Trim()
if (-not $Version) {
    $Parts = $CurrentVersion.Split(".")
    if ($Parts.Count -ne 3) {
        Fail "VERSION is not semver: $CurrentVersion"
    }
    $Version = "$($Parts[0]).$($Parts[1]).$([int]$Parts[2] + 1)"
}
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Fail "version must be semver without a leading v: $Version"
}
if ([version]$Version -le [version]$CurrentVersion) {
    Fail "new version $Version must be greater than $CurrentVersion"
}
gh release view "v$Version" *> $null
if ($LASTEXITCODE -eq 0) {
    Fail "GitHub Release v$Version already exists"
}

Write-Host "Current: $CurrentVersion"
Write-Host "New:     $Version"
if (-not $Yes) {
    $Answer = Read-Host "Publish GitHub Release v$Version? [y/N]"
    if ($Answer -notmatch '^(y|yes)$') {
        Write-Host "Cancelled."
        exit 0
    }
}

Write-Host "== Running tests ==" -ForegroundColor Cyan
Push-Location (Join-Path $Root "backend")
try {
    go test ./...
    if ($LASTEXITCODE -ne 0) { Fail "backend tests failed" }
}
finally {
    Pop-Location
}

Push-Location (Join-Path $Root "frontend")
try {
    npm test
    if ($LASTEXITCODE -ne 0) { Fail "frontend tests failed" }
}
finally {
    Pop-Location
}

Write-Host "== Updating version ==" -ForegroundColor Cyan
Write-Utf8NoBom (Join-Path $Root "VERSION") "$Version`n"
$ConfigPath = Join-Path $Root "build/config.yml"
$Config = Get-Content -Raw $ConfigPath
$Config = [regex]::Replace($Config, '(?m)^(\s*version:\s*")[^"]+(")', ('${1}' + $Version + '${2}'))
Write-Utf8NoBom $ConfigPath $Config

Write-Host "== Building installer and portable executable ==" -ForegroundColor Cyan
wails3 package
if ($LASTEXITCODE -ne 0) { Fail "wails3 package failed" }

$Portable = Join-Path $Root "bin/Notice-windows-amd64.exe"
$Installer = Join-Path $Root "bin/Notice-amd64-installer.exe"
Copy-Item -LiteralPath (Join-Path $Root "bin/Notice.exe") -Destination $Portable -Force

$ChecksumPath = Join-Path $Root "bin/SHA256SUMS"
$Checksums = @(
    "Notice-windows-amd64.exe",
    "Notice-amd64-installer.exe"
) | ForEach-Object {
    $Path = Join-Path $Root "bin/$_"
    if (-not (Test-Path -LiteralPath $Path)) {
        Fail "missing release asset: $Path"
    }
    $Hash = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    "$Hash  $_"
}
Set-Content -LiteralPath $ChecksumPath -Value $Checksums -Encoding ascii

Write-Host "== Committing and pushing version $Version ==" -ForegroundColor Cyan
git add VERSION build/config.yml
git commit -m "chore: release v$Version"
if ($LASTEXITCODE -ne 0) { Fail "git commit failed" }
git push origin main
if ($LASTEXITCODE -ne 0) { Fail "git push failed" }

Write-Host "== Creating GitHub Release v$Version ==" -ForegroundColor Cyan
gh release create "v$Version" `
    --target main `
    --title "Notice v$Version" `
    --generate-notes `
    $Portable $Installer $ChecksumPath
if ($LASTEXITCODE -ne 0) { Fail "gh release create failed" }

Write-Host "Released v${Version}: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/releases/tag/v${Version}" -ForegroundColor Green
