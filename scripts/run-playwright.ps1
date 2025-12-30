# Wrapper to run Playwright tests on Windows (native PowerShell)
# Equivalent to run-playwright.sh for non-WSL environments

param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$TestArgs
)

$ErrorActionPreference = "Stop"

# Allow explicit skip for environments without running app/DB
if ($env:SKIP_PLAYWRIGHT -eq "true" -or $env:PW_SKIP_E2E -eq "true") {
    Write-Host "Skipping Playwright E2E tests (SKIP_PLAYWRIGHT/PW_SKIP_E2E=true)."
    exit 0
}

function Cleanup {
    if (Test-Path "tests/playwright-artifacts") {
        Remove-Item -Recurse -Force "tests/playwright-artifacts" -ErrorAction SilentlyContinue
    }
}

# Start with clean slate
Cleanup

# Register cleanup on exit
$null = Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

# Ensure auth secrets exist for Auth.js JWT encoding in Playwright helpers
if (-not $env:AUTH_SECRET) {
    $env:AUTH_SECRET = (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    Write-Host "[OK] Generated ephemeral AUTH_SECRET for Playwright run." -ForegroundColor Yellow
}

if (-not $env:NEXTAUTH_SECRET) {
    $env:NEXTAUTH_SECRET = $env:AUTH_SECRET
}

if (-not $env:AUTH_SALT) {
    $env:AUTH_SALT = "authjs.session-token"
}

$RootDir = Split-Path -Parent $PSScriptRoot
$DefaultHost = "127.0.0.1"

$env:HOSTNAME = $DefaultHost
$env:PW_HOSTNAME = $DefaultHost
$env:PW_USE_BUILD = "false"
$env:PW_SKIP_BUILD = "true"

# Default to dev-server mode
if (-not $env:PORT) { $env:PORT = "3100" }

$env:PLAYWRIGHT_TESTS = "true"
$env:SKIP_ENV_VALIDATION = "true"
$env:NEXT_PUBLIC_PLAYWRIGHT_TESTS = "true"
$env:PLAYWRIGHT_GLOBAL = "true"

$ConfigFile = if ($env:PLAYWRIGHT_CONFIG) { $env:PLAYWRIGHT_CONFIG } else { "tests/playwright.config.ts" }
$Workers = if ($env:PLAYWRIGHT_WORKERS) { $env:PLAYWRIGHT_WORKERS } else { "1" }

$cmdArgs = @("playwright", "test", "--config=$ConfigFile", "--workers=$Workers")

if ($TestArgs.Count -gt 0) {
    $cmdArgs += $TestArgs
}

Write-Host "Running: npx $($cmdArgs -join ' ')" -ForegroundColor Cyan
& npx @cmdArgs

$exitCode = $LASTEXITCODE

# Cleanup on completion
Cleanup

exit $exitCode
