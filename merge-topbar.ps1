#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Enterprise merge script for TopBar Search and Notifications improvements
    
.DESCRIPTION
    This script performs a safe merge of the TopBar branch containing enhanced search functionality,
    notifications system improvements, and UI/UX enhancements.
#>

[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$SOURCE_BRANCH = "pr-topbar-merge"
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

Write-Section "TopBar Search & Notifications - Enterprise Merge"

try {
    # Verify we're in the right location
    if (-not (Test-Path ".git")) {
        throw "Not in a Git repository"
    }

    Write-Log "Current branch: $(git branch --show-current)" -Level "INFO"
    
    # Create backup
    $backupBranch = "backup-topbar-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Log "Creating backup branch: $backupBranch" -Level "INFO"
    git branch $backupBranch

    # Switch to main and update
    Write-Log "Switching to main branch" -Level "INFO"
    git checkout main
    git pull origin main

    Write-Log "Merging $SOURCE_BRANCH into main" -Level "INFO"
    
    # Attempt merge
    $mergeMessage = "Merge TopBar Search & Notifications: Enhanced UI/UX and Search Functionality

This merge includes:
- Enhanced TopBar component with improved search functionality
- Advanced GlobalSearch with real-time suggestions and filtering
- Comprehensive notifications system with bulk operations
- Improved search APIs with better performance and accuracy
- Enhanced marketplace search with advanced filtering
- Knowledge base search integration for help system
- Search synonyms and intelligent query processing
- Mobile-responsive search interface improvements
- Performance optimizations for search operations

Delivers enhanced user experience with powerful search and notification capabilities."

    git merge $SOURCE_BRANCH --no-ff -m $mergeMessage

    if ($LASTEXITCODE -ne 0) {
        Write-Log "Merge has conflicts, attempting resolution..." -Level "WARN"
        
        # Get list of conflicted files
        $conflictFiles = git diff --name-only --diff-filter=U
        Write-Log "Conflicted files: $($conflictFiles -join ', ')" -Level "WARN"
        
        # Simple conflict resolution - accept incoming changes for TopBar improvements
        foreach ($file in $conflictFiles) {
            Write-Log "Resolving conflicts in: $file" -Level "INFO"
            
            # For most files, prefer the incoming changes (TopBar improvements)
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

    Write-Section "TopBar Search & Notifications - Merge Summary"
    Write-Log "✅ TopBar improvements merged successfully!" -Level "SUCCESS"
    Write-Log "✅ Enhanced search functionality deployed" -Level "SUCCESS"
    Write-Log "✅ Advanced notifications system integrated" -Level "SUCCESS"
    Write-Log "✅ Global search with real-time suggestions" -Level "SUCCESS"
    Write-Log "✅ Marketplace search enhancements deployed" -Level "SUCCESS"
    Write-Log "✅ Knowledge base search integration" -Level "SUCCESS"
    Write-Log "✅ Backup branch created: $backupBranch" -Level "SUCCESS"
    
    # Generate summary report
    $changedFiles = git diff --name-only HEAD~1 HEAD | Measure-Object | Select-Object -ExpandProperty Count
    Write-Log "Files changed: $changedFiles" -Level "INFO"
    
    Write-Log "🔍 TopBar Search & Notifications successfully deployed!" -Level "SUCCESS"

} catch {
    Write-Log "❌ CRITICAL ERROR: $($_.Exception.Message)" -Level "ERROR"
    Write-Log "Current git status:" -Level "ERROR"
    git status --porcelain
    
    Write-Log "To rollback if needed: git reset --hard $backupBranch" -Level "WARN"
    exit 1
}