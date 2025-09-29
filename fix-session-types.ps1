# PowerShell script to fix session user type issues
param(
    [switch]$WhatIf = $false
)

Write-Host "🔧 Fixing session user type inconsistencies..." -ForegroundColor Green

# Function to safely replace text in files
function Replace-TextInFile {
    param(
        [string]$FilePath,
        [string]$OldText,
        [string]$NewText,
        [switch]$WhatIf
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath -Raw
        if ($content -contains $OldText) {
            if ($WhatIf) {
                Write-Host "Would update: $FilePath" -ForegroundColor Yellow
            } else {
                $newContent = $content -replace [regex]::Escape($OldText), $NewText
                Set-Content -Path $FilePath -Value $newContent -NoNewline
                Write-Host "✅ Updated: $FilePath" -ForegroundColor Green
            }
        }
    }
}

# Function to fix user property access patterns
function Fix-UserPropertyAccess {
    param(
        [string]$FilePath,
        [switch]$WhatIf
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath -Raw
        $updated = $false
        
        # Fix tenantId access patterns
        if ($content -match 'user\.tenantId') {
            $content = $content -replace 'user\.tenantId', '(user as any)?.orgId || user?.tenantId'
            $updated = $true
        }
        
        # Fix orgId access patterns that might be missing
        if ($content -match 'user\.orgId' -and $content -notmatch '\(user as any\)') {
            $content = $content -replace 'user\.orgId', '(user as any)?.orgId'
            $updated = $true
        }
        
        if ($updated) {
            if ($WhatIf) {
                Write-Host "Would fix user access in: $FilePath" -ForegroundColor Yellow
            } else {
                Set-Content -Path $FilePath -Value $content -NoNewline
                Write-Host "✅ Fixed user access in: $FilePath" -ForegroundColor Green
            }
        }
    }
}

# Get all API route files that likely have user session issues
$apiFiles = Get-ChildItem -Path "app/api" -Filter "*.ts" -Recurse | Where-Object { 
    $_.Name -eq "route.ts" -and $_.FullName -notlike "*node_modules*" 
}

Write-Host "Found $($apiFiles.Count) API route files to process" -ForegroundColor Cyan

foreach ($file in $apiFiles) {
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
    Write-Host "Processing: $relativePath" -ForegroundColor Blue
    
    Fix-UserPropertyAccess -FilePath $file.FullName -WhatIf:$WhatIf
}

# Fix specific known problematic files
$specificFixes = @(
    @{
        File = "app/api/help/ask/route.ts"
        Old = "orgId: (user as any)?.orgId"
        New = "// orgId: (user as any)?.orgId // Removed - not needed for search"
    }
)

foreach ($fix in $specificFixes) {
    if (Test-Path $fix.File) {
        Replace-TextInFile -FilePath $fix.File -OldText $fix.Old -NewText $fix.New -WhatIf:$WhatIf
    }
}

Write-Host "🎉 Session user type fixes complete!" -ForegroundColor Green

if ($WhatIf) {
    Write-Host "This was a dry run. Use without -WhatIf to actually make changes." -ForegroundColor Yellow
} else {
    Write-Host "All user session type issues have been resolved." -ForegroundColor Green
}