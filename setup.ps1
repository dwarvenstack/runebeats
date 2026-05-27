# setup.ps1 - RuneBeats full setup for Windows
# Run via setup.bat (never directly as Administrator)

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "RuneBeats Setup"

function Write-Header($text) {
    Write-Host ""
    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host "    $text" -ForegroundColor Cyan
    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step($n, $text) {
    Write-Host ""
    Write-Host "[$n/5] $text" -ForegroundColor Yellow
}

function Write-OK($text)   { Write-Host "  > $text" -ForegroundColor Green }
function Write-Warn($text) { Write-Host "  [WARN] $text" -ForegroundColor Yellow }
function Write-Fail($text) { Write-Host "  [ERROR] $text" -ForegroundColor Red }
function Write-Info($text) { Write-Host "  $text" -ForegroundColor Gray }

# -- Helper: refresh PATH from registry so new installs are visible ------------
function Refresh-Path {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path    = "$machinePath;$userPath"
}

# -- Helper: check if a command exists -----------------------------------------
function Has-Command($cmd) {
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

# -----------------------------------------------------------------------------
Write-Header "RuneBeats | Windows Setup"
Write-Info "This script installs: Scoop, Node.js 20, yt-dlp, FFmpeg"
Write-Info "Then configures your .env and starts the bot."
Write-Host ""
Read-Host "  Press Enter to begin"

# Confirm not running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Fail "This script must NOT be run as Administrator."
    Write-Info "Close this window and double-click setup.bat normally."
    Read-Host "Press Enter to exit"
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 1 - Scoop
# -----------------------------------------------------------------------------
Write-Step 1 "Installing Scoop (package manager)..."

if (Has-Command scoop) {
    Write-OK "Scoop already installed. Skipping."
} else {
    try {
        # Allow scripts for current user only
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    } catch {
        # Fine if policy already set or overridden at machine level
    }

    Write-Info "Downloading and running Scoop installer..."
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    $installerUrl = "https://get.scoop.sh"
    Invoke-RestMethod -Uri $installerUrl | Invoke-Expression

    Refresh-Path

    if (-not (Has-Command scoop)) {
        # Scoop installs to %USERPROFILE%\scoop\shims - add manually
        $scoopShims = "$env:USERPROFILE\scoop\shims"
        if (Test-Path $scoopShims) {
            $env:Path += ";$scoopShims"
            Write-OK "Scoop shims added to PATH for this session."
        } else {
            Write-Fail "Scoop installation failed. Check your internet connection and try again."
            Read-Host "Press Enter to exit"
            exit 1
        }
    }

    Write-OK "Scoop installed."
}

# Add extra buckets (needed for some packages)
Write-Info "Adding Scoop buckets..."
scoop bucket add extras  2>$null
scoop bucket add versions 2>$null

# -----------------------------------------------------------------------------
# STEP 2 - Node.js, yt-dlp, FFmpeg
# -----------------------------------------------------------------------------
Write-Step 2 "Installing Node.js 20 LTS, yt-dlp, and FFmpeg..."

# Node.js
if (Has-Command node) {
    $nodeVer = node -v
    Write-OK "Node.js already installed: $nodeVer"
} else {
    Write-Info "Installing Node.js 20 LTS..."
    scoop install nodejs-lts
    Refresh-Path
    if (-not (Has-Command node)) {
        Write-Warn "nodejs-lts not found, trying nodejs..."
        scoop install nodejs
        Refresh-Path
    }
    if (Has-Command node) {
        Write-OK "Node.js installed: $(node -v)"
    } else {
        Write-Fail "Node.js installation failed."
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# yt-dlp
if (Has-Command yt-dlp) {
    Write-OK "yt-dlp already installed."
} else {
    Write-Info "Installing yt-dlp..."
    scoop install yt-dlp
    Refresh-Path
    if (Has-Command yt-dlp) {
        Write-OK "yt-dlp installed: $(yt-dlp --version)"
    } else {
        Write-Warn "yt-dlp not found via Scoop. Attempting direct download..."
        $ytdlpDest = "$env:USERPROFILE\scoop\shims\yt-dlp.exe"
        try {
            Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile $ytdlpDest
            Write-OK "yt-dlp downloaded to $ytdlpDest"
        } catch {
            Write-Warn "yt-dlp direct download also failed. YouTube will not work until yt-dlp is installed."
        }
    }
}

# FFmpeg
if (Has-Command ffmpeg) {
    Write-OK "FFmpeg already installed."
} else {
    Write-Info "Installing FFmpeg..."
    scoop install ffmpeg
    Refresh-Path
    if (Has-Command ffmpeg) {
        Write-OK "FFmpeg installed."
    } else {
        Write-Fail "FFmpeg not found after install. Audio will not work."
        Write-Info "Try manually: scoop install ffmpeg"
    }
}

# -----------------------------------------------------------------------------
# STEP 3 - Verify
# -----------------------------------------------------------------------------
Write-Step 3 "Verifying installations..."
Write-Host ""

$allGood = $true

if (Has-Command node) {
    Write-Host "  Node.js   : $(node -v)" -ForegroundColor Green
} else {
    Write-Host "  Node.js   : NOT FOUND" -ForegroundColor Red
    $allGood = $false
}

if (Has-Command yt-dlp) {
    Write-Host "  yt-dlp    : $(yt-dlp --version)" -ForegroundColor Green
} else {
    Write-Host "  yt-dlp    : NOT FOUND  (YouTube won't work)" -ForegroundColor Yellow
}

if (Has-Command ffmpeg) {
    Write-Host "  FFmpeg    : found" -ForegroundColor Green
} else {
    Write-Host "  FFmpeg    : NOT FOUND  (audio won't work)" -ForegroundColor Red
    $allGood = $false
}

if (-not $allGood) {
    Write-Host ""
    Write-Fail "One or more required tools are missing. Cannot continue."
    Read-Host "Press Enter to exit"
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 4 - .env setup
# -----------------------------------------------------------------------------
Write-Step 4 "Setting up .env credentials..."

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if (-not (Test-Path ".env.example")) {
    Write-Fail ".env.example not found. Make sure you run setup.bat from the runebeats folder."
    Read-Host "Press Enter to exit"
    exit 1
}

if (Test-Path ".env") {
    Write-OK ".env already exists - skipping credential setup."
    Write-Info "Delete .env and re-run if you need to reconfigure."
} else {
    Write-Host ""
    Write-Host "  ----------------------------------------------" -ForegroundColor Cyan
    Write-Host "   HOW TO GET YOUR DISCORD CREDENTIALS:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   DISCORD_TOKEN:" -ForegroundColor White
    Write-Host "     1. Go to discord.com/developers/applications" -ForegroundColor Gray
    Write-Host "     2. Create or select your app -> Bot tab" -ForegroundColor Gray
    Write-Host "     3. Click 'Reset Token' and copy it" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   CLIENT_ID:" -ForegroundColor White
    Write-Host "     Same page -> General Information -> Application ID" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   GUILD_ID (for instant /commands - takes 10 seconds):" -ForegroundColor White
    Write-Host "     1. Discord Settings -> Advanced -> Enable Developer Mode" -ForegroundColor Gray
    Write-Host "     2. Right-click any server you're in -> Copy Server ID" -ForegroundColor Gray
    Write-Host "     3. Or create a free test server with the '+' button" -ForegroundColor Gray
    Write-Host "     Leave blank = global registration (1 hour delay)" -ForegroundColor Gray
    Write-Host "  ----------------------------------------------" -ForegroundColor Cyan
    Write-Host ""

    $token   = Read-Host "  DISCORD_TOKEN"
    $clientId = Read-Host "  CLIENT_ID"
    $guildId  = Read-Host "  GUILD_ID         (press Enter to skip)"
    $scId     = Read-Host "  SOUNDCLOUD_CLIENT_ID  (press Enter to skip)"

    @"
DISCORD_TOKEN=$token
CLIENT_ID=$clientId
GUILD_ID=$guildId
SOUNDCLOUD_CLIENT_ID=$scId
LOG_LEVEL=info
"@ | Set-Content -Path ".env" -Encoding UTF8

    Write-OK ".env created."
}

# -----------------------------------------------------------------------------
# STEP 5 - npm install + deploy commands
# -----------------------------------------------------------------------------
Write-Step 5 "Installing npm packages and registering slash commands..."

Write-Info "Running npm install..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Fail "npm install failed. See output above."
    Read-Host "Press Enter to exit"
    exit 1
}
Write-OK "npm install complete."

Write-Info "Registering slash commands with Discord..."
npm run deploy
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Command registration failed. Check your TOKEN and CLIENT_ID in .env."
    Write-Info "You can retry later by running:  npm run deploy"
} else {
    Write-OK "Slash commands registered."
}

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Green
Write-Host "    Setup Complete!" -ForegroundColor Green
Write-Host "  ==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  To start RuneBeats, double-click:" -ForegroundColor White
Write-Host "      start.bat" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Or run in this window:" -ForegroundColor White
Write-Host "      npm start" -ForegroundColor Cyan
Write-Host ""
Read-Host "  Press Enter to exit setup"