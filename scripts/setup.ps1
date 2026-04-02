#Requires -Version 7
# Happy Vibecode — Bootstrap Script (Windows, PowerShell 7+)
# Run: irm https://raw.githubusercontent.com/your-org/happy-vibecode/main/scripts/setup.ps1 | iex
[CmdletBinding()]
param(
    [string]$InstallDir = "$env:USERPROFILE\.happy-vibecode",
    [switch]$SkipClone
)
$ErrorActionPreference = 'Stop'

$REPO_URL = "https://github.com/your-org/happy-vibecode.git"

function Write-Header([string]$msg) { Write-Host "`n$msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg)     { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Info([string]$msg)   { Write-Host "  → $msg" -ForegroundColor Blue }
function Write-Warn([string]$msg)   { Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Err([string]$msg)    { Write-Host "  ✗ $msg" -ForegroundColor Red; exit 1 }

Write-Header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Header "  Happy Vibecode — Setup"
Write-Header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Check / install Bun ───────────────────────────────────────────────────────
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Info "Installing Bun..."
    irm bun.sh/install.ps1 | iex
    $env:Path = "$env:USERPROFILE\.bun\bin;$env:Path"
}
$bunVersion = (bun --version 2>&1).Trim()
Write-Ok "Bun $bunVersion"

# ── Clone or update repo ──────────────────────────────────────────────────────
if (-not $SkipClone) {
    if (Test-Path (Join-Path $InstallDir ".git")) {
        Write-Info "Updating repository..."
        Push-Location $InstallDir
        git pull --ff-only
        Pop-Location
    } else {
        Write-Info "Cloning repository to $InstallDir ..."
        git clone $REPO_URL $InstallDir
    }
}

Set-Location $InstallDir

# ── Install dependencies ──────────────────────────────────────────────────────
Write-Info "Installing dependencies..."
bun install --frozen-lockfile
Write-Ok "Dependencies installed"

# ── Safety: check for existing .env ──────────────────────────────────────────
$envFile = Join-Path $InstallDir "apps\web\.env"
if (Test-Path $envFile) {
    Write-Warn "apps\web\.env already exists — setup wizard will NOT overwrite it."
    Write-Warn "Delete it first if you want to reconfigure from scratch."
}

# ── Run setup wizard ──────────────────────────────────────────────────────────
Write-Info "Launching interactive setup wizard..."
bun run packages/cli/src/index.ts setup

Write-Ok "Happy Vibecode is ready! 🚀"
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Cyan
Write-Host "    bun run dev:web                       — start local dev server"
Write-Host "    bun run -F @happy-vibecode/web deploy  — deploy to Cloudflare"
Write-Host ""
