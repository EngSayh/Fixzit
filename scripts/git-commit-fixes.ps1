# Git commit script for TEST-004 and PERF-001 fixes
# Run this to commit all pending changes

# Check for --force flag
param(
    [switch]$Force
)

Write-Host "=== Git Status ===" -ForegroundColor Cyan
git status --short

# Confirm before reset unless --force is provided
if (-not $Force) {
    $confirm = Read-Host "`nReset staging area? This will unstage all files. (y/N)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y' -and $confirm -ne 'yes') {
        Write-Host "Skipping reset. Continuing with current staging area..." -ForegroundColor Yellow
    } else {
        Write-Host "`n=== Resetting staging area ===" -ForegroundColor Cyan
        git restore --staged .
    }
} else {
    Write-Host "`n=== Resetting staging area (--force) ===" -ForegroundColor Cyan
    git restore --staged .
}

Write-Host "`n=== Staging files ===" -ForegroundColor Cyan

# List of files to stage
$filesToStage = @(
    ".vscode/tasks.json",
    "app/api/superadmin/customer-requests/route.ts",
    "app/api/superadmin/tenants/route.ts",
    "app/api/superadmin/tenants/[id]/route.ts",
    "components/superadmin/SuperadminSidebar.tsx",
    "issue-tracker/app/api/issues/route.ts",
    "issue-tracker/app/api/issues/[id]/route.ts"
)

$stagingFailed = $false
foreach ($file in $filesToStage) {
    if (Test-Path $file) {
        git add $file
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to stage $file" -ForegroundColor Red
            $stagingFailed = $true
        } else {
            Write-Host "Staged: $file" -ForegroundColor Green
        }
    } else {
        Write-Host "WARNING: File not found, skipping: $file" -ForegroundColor Yellow
    }
}

if ($stagingFailed) {
    Write-Host "`nERROR: One or more git add operations failed" -ForegroundColor Red
    exit 1
}

# Check if there are any staged changes before committing
$stagedFiles = @(git diff --cached --name-only)
if (-not $stagedFiles -or $stagedFiles.Count -eq 0) {
    Write-Host "`nNo staged changes to commit" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n=== Committing ===" -ForegroundColor Cyan
$commitMessage = @"
fix(api): TEST-004 JSON parse try-catch + PERF-001 maxTimeMS [AGENT-001-A]

TEST-004 Fixes (P2):
- app/api/superadmin/tenants/route.ts: Added try-catch to request.json() in POST
- app/api/superadmin/tenants/[id]/route.ts: Added try-catch to request.json() in PATCH
- issue-tracker/app/api/issues/route.ts: Added try-catch to request.json() in POST
- issue-tracker/app/api/issues/[id]/route.ts: Added try-catch to request.json() in PATCH

PERF-001 Fix (P2):
- app/api/superadmin/customer-requests/route.ts: Added maxTimeMS: 10_000 to aggregate

chore: Updated .vscode/tasks.json with helper tasks
chore: Updated SuperadminSidebar.tsx - removed comingSoon from working modules

Verification: pnpm typecheck (0 errors), pnpm lint (0 warnings)
"@

git commit -m $commitMessage

Write-Host "`n=== Recent commits ===" -ForegroundColor Cyan
git log --oneline -3

Write-Host "`n=== Done! ===" -ForegroundColor Green
