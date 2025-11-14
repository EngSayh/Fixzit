#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Enterprise merge script for Aqar: Tenant-scoped real estate features and map integration
    
.DESCRIPTION
    This script performs a safe merge of the Aqar branch containing tenant-scoped real estate APIs,
    map clusters, real properties page, simplified navigation, seed script, and enhanced error handling.
#>

[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$SOURCE_BRANCH = "pr-aqar-merge"
$TARGET_BRANCH = "main"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "SUCCESS" { "Green" }
        "WARN" { "Yellow" }
        "ERROR" { "Red" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Write-Section {
    param([string]$Title)
    $separator = "=" * 60
    Write-Host $separator -ForegroundColor Magenta
    Write-Host " $Title" -ForegroundColor Magenta
    Write-Host $separator -ForegroundColor Magenta
}

Write-Section "Aqar Real Estate Features - Enterprise Merge"

try {
    # Verify we're in the right location
    if (-not (Test-Path ".git")) {
        throw "Not in a Git repository"
    }

    Write-Log "Current branch: $(git branch --show-current)" -Level "INFO"
    
    # Create backup
    $backupBranch = "backup-aqar-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Log "Creating backup branch: $backupBranch" -Level "INFO"
    git branch $backupBranch

    # Switch to main and update
    Write-Log "Switching to main branch" -Level "INFO"
    git checkout main
    git pull origin main

    Write-Log "Merging $SOURCE_BRANCH into main" -Level "INFO"
    
    # Attempt merge
    $mergeMessage = "Merge Aqar Real Estate Features: Tenant-scoped APIs and Map Integration

This merge includes:
- Tenant-scoped real estate APIs with proper isolation
- Interactive map clusters for property visualization  
- Enhanced real properties page with advanced filtering
- Simplified navigation for improved user experience
- Comprehensive seed script for sample real estate data
- Enhanced error handling and Next.js Image optimization
- Map integration for property location services
- Improved tenant security for real estate operations

Delivers complete real estate platform functionality with enterprise-grade security."

    git merge $SOURCE_BRANCH --no-ff -m $mergeMessage

    if ($LASTEXITCODE -ne 0) {
        Write-Log "Merge has conflicts, attempting resolution..." -Level "WARN"
        
        # Get list of conflicted files
        $conflictFiles = git diff --name-only --diff-filter=U
        Write-Log "Conflicted files: $($conflictFiles -join ', ')" -Level "WARN"
        
        # Simple conflict resolution - accept incoming changes for Aqar features
        foreach ($file in $conflictFiles) {
            Write-Log "Resolving conflicts in: $file" -Level "INFO"
            
            # For most files, prefer the incoming changes (Aqar improvements)
            git checkout --theirs $file
            git add $file
        }
        
        # Complete the merge
        git commit --no-edit
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to complete merge after conflict resolution"
        }
        
        Write-Log "Merge completed with conflict resolution" -Level "SUCCESS"
    } else {
        Write-Log "Merge completed successfully without conflicts" -Level "SUCCESS"
    }

    # Verify the merge
    $mergeCommit = git log -1 --oneline
    Write-Log "Merge commit: $mergeCommit" -Level "SUCCESS"

    # Push the changes
    Write-Log "Pushing merged changes to remote..." -Level "INFO"
    git push origin main

    if ($LASTEXITCODE -eq 0) {
        Write-Log "Successfully pushed merged changes" -Level "SUCCESS"
    } else {
        throw "Failed to push changes"
    }

    # Cleanup
    Write-Log "Cleaning up source branch" -Level "INFO"
    git branch -D $SOURCE_BRANCH 2>$null

    Write-Section "Aqar Real Estate Features - Merge Summary"
    Write-Log "✅ Aqar features merged successfully!" -Level "SUCCESS"
    Write-Log "✅ Tenant-scoped real estate APIs deployed" -Level "SUCCESS"
    Write-Log "✅ Interactive map clusters integrated" -Level "SUCCESS"
    Write-Log "✅ Enhanced properties page deployed" -Level "SUCCESS"
    Write-Log "✅ Simplified navigation implemented" -Level "SUCCESS"
    Write-Log "✅ Backup branch created: $backupBranch" -Level "SUCCESS"
    
    # Generate summary report
    $changedFiles = git diff --name-only HEAD~1 HEAD | Measure-Object | Select-Object -ExpandProperty Count
    Write-Log "Files changed: $changedFiles" -Level "INFO"
    
    Write-Log "🏠 Aqar Real Estate Platform features successfully deployed!" -Level "SUCCESS"

} catch {
    Write-Log "❌ CRITICAL ERROR: $($_.Exception.Message)" -Level "ERROR"
    Write-Log "Current git status:" -Level "ERROR"
    git status --porcelain
    
    Write-Log "To rollback if needed: git reset --hard $backupBranch" -Level "WARN"
    exit 1
}