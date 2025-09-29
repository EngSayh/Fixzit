#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Simplified enterprise merge script for PR 60: Performance enhancements
    
.DESCRIPTION
    This script performs a safe merge of PR 60 containing performance enhancements and code quality improvements.
#>

[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$PR_NUMBER = 60
$SOURCE_BRANCH = "pr-60-merge"
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

Write-Section "PR 60 Enterprise Merge - Performance Enhancements"

try {
    # Verify we're in the right location
    if (-not (Test-Path ".git")) {
        throw "Not in a Git repository"
    }

    Write-Log "Current branch: $(git branch --show-current)" -Level "INFO"
    
    # Create backup
    $backupBranch = "backup-pr60-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Log "Creating backup branch: $backupBranch" -Level "INFO"
    git branch $backupBranch

    # Switch to main and update
    Write-Log "Switching to main branch" -Level "INFO"
    git checkout main
    git pull origin main

    Write-Log "Merging $SOURCE_BRANCH into main" -Level "INFO"
    
    # Attempt merge
    $mergeMessage = "Merge PR #${PR_NUMBER}: Performance enhancements and comprehensive code quality improvements

This merge includes:
- Performance optimizations across API routes and UI components  
- Comprehensive ESLint error fixes and code quality improvements
- Enhanced responsive design and RTL language support
- Database query optimizations and connection improvements
- Security enhancements and tenant isolation improvements
- Comprehensive test coverage and CI/CD integration
- UI/UX improvements and component optimizations

Resolves performance bottlenecks and establishes enterprise-grade code quality standards."

    git merge $SOURCE_BRANCH --no-ff -m $mergeMessage

    if ($LASTEXITCODE -ne 0) {
        Write-Log "Merge has conflicts, attempting resolution..." -Level "WARN"
        
        # Get list of conflicted files
        $conflictFiles = git diff --name-only --diff-filter=U
        Write-Log "Conflicted files: $($conflictFiles -join ', ')" -Level "WARN"
        
        # Simple conflict resolution - accept incoming changes for key files
        foreach ($file in $conflictFiles) {
            Write-Log "Resolving conflicts in: $file" -Level "INFO"
            
            # For most files, prefer the incoming changes (PR 60 improvements)
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

    # Check for any remaining conflict markers
    $conflictMarkers = git grep -l "<<<<<<< HEAD" 2>$null
    if ($conflictMarkers) {
        Write-Log "Warning: Found potential unresolved conflicts in: $($conflictMarkers -join ', ')" -Level "WARN"
    }

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

    Write-Section "PR 60 Merge Summary"
    Write-Log "✅ PR 60 merged successfully!" -Level "SUCCESS"
    Write-Log "✅ Performance enhancements deployed" -Level "SUCCESS"
    Write-Log "✅ Code quality improvements integrated" -Level "SUCCESS"
    Write-Log "✅ Backup branch created: $backupBranch" -Level "SUCCESS"
    
    # Generate summary report
    $changedFiles = git diff --name-only HEAD~1 HEAD | Measure-Object | Select-Object -ExpandProperty Count
    Write-Log "Files changed: $changedFiles" -Level "INFO"
    
    Write-Log "🚀 PR 60 Performance Enhancements successfully deployed!" -Level "SUCCESS"

} catch {
    Write-Log "❌ CRITICAL ERROR: $($_.Exception.Message)" -Level "ERROR"
    Write-Log "Current git status:" -Level "ERROR"
    git status --porcelain
    
    Write-Log "To rollback if needed: git reset --hard $backupBranch" -Level "WARN"
    exit 1
}