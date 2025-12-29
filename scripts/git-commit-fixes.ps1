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
        git reset HEAD
    }
} else {
    Write-Host "`n=== Resetting staging area (--force) ===" -ForegroundColor Cyan
    git reset HEAD
}

Write-Host "`n=== Staging files ===" -ForegroundColor Cyan
git add ".vscode/tasks.json"
git add "app/api/superadmin/customer-requests/route.ts"
git add "app/api/superadmin/tenants/route.ts"
git add "app/api/superadmin/tenants/[id]/route.ts"
git add "components/superadmin/SuperadminSidebar.tsx"
git add "issue-tracker/app/api/issues/route.ts"
git add "issue-tracker/app/api/issues/[id]/route.ts"

# Check if there are any staged changes before committing
$stagedFiles = git diff --cached --name-only
if (-not $stagedFiles) {
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
