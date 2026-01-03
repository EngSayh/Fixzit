# ============================================================================
# Git Wrapper Script - PREVENTS --no-verify bypass
# ============================================================================
# This script intercepts git commands and BLOCKS --no-verify flag usage
# Add to PowerShell profile or run before git commands
# ============================================================================

param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$GitArgs
)

# Check if --no-verify or -n (short form) is being used
$forbiddenFlags = @('--no-verify', '-n')
$hasForbiddenFlag = $false

foreach ($arg in $GitArgs) {
    if ($forbiddenFlags -contains $arg) {
        $hasForbiddenFlag = $true
        break
    }
}

# If attempting to use --no-verify, BLOCK IT
if ($hasForbiddenFlag) {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ⛔ BLOCKED: --no-verify is FORBIDDEN                             ║" -ForegroundColor Red
    Write-Host "╠═══════════════════════════════════════════════════════════════════╣" -ForegroundColor Red
    Write-Host "║                                                                   ║" -ForegroundColor Yellow
    Write-Host "║  You attempted to bypass git hooks with --no-verify.              ║" -ForegroundColor Yellow
    Write-Host "║  This is STRICTLY FORBIDDEN in this repository.                  ║" -ForegroundColor Yellow
    Write-Host "║                                                                   ║" -ForegroundColor Yellow
    Write-Host "║  Git hooks enforce:                                               ║" -ForegroundColor Yellow
    Write-Host "║    • No direct commits to main/master                             ║" -ForegroundColor Yellow
    Write-Host "║    • Agent Token [AGENT-XXXX] required in commit messages         ║" -ForegroundColor Yellow
    Write-Host "║    • TypeScript checks before push                                ║" -ForegroundColor Yellow
    Write-Host "║                                                                   ║" -ForegroundColor Yellow
    Write-Host "║  CORRECT WORKFLOW:                                                ║" -ForegroundColor Cyan
    Write-Host "║    1. Create feature branch: git checkout -b fix/my-feature       ║" -ForegroundColor Cyan
    Write-Host "║    2. Make commits (hooks will validate)                          ║" -ForegroundColor Cyan
    Write-Host "║    3. Push branch: git push origin HEAD                           ║" -ForegroundColor Cyan
    Write-Host "║    4. Create PR: gh pr create                                     ║" -ForegroundColor Cyan
    Write-Host "║    5. Merge via PR (not direct push)                              ║" -ForegroundColor Cyan
    Write-Host "║                                                                   ║" -ForegroundColor Yellow
    Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Otherwise, run git normally
& git $GitArgs
