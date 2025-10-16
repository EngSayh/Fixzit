# PowerShell script to remove all MockDB references from the codebase
param(
    [switch]$WhatIf = $false
)

Write-Host "🧹 Cleaning up MockDB references from the entire codebase..." -ForegroundColor Green

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
        if ($content -match [regex]::Escape($OldText)) {
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

# Function to remove lines containing specific patterns
function Remove-LinesContaining {
    param(
        [string]$FilePath,
        [string[]]$Patterns,
        [switch]$WhatIf
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath
        $originalCount = $content.Count
        
        foreach ($pattern in $Patterns) {
            $content = $content | Where-Object { $_ -notmatch $pattern }
        }
        
        if ($content.Count -lt $originalCount) {
            if ($WhatIf) {
                Write-Host "Would remove lines from: $FilePath" -ForegroundColor Yellow
            } else {
                Set-Content -Path $FilePath -Value $content
                Write-Host "✅ Cleaned lines from: $FilePath" -ForegroundColor Green
            }
        }
    }
}

# Get all TypeScript model files
$modelFiles = Get-ChildItem -Path "src/server/models" -Filter "*.ts" -Recurse | Where-Object { $_.Name -notlike "*test*" }

Write-Host "Found $($modelFiles.Count) model files to process" -ForegroundColor Cyan

foreach ($file in $modelFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Blue
    
    # Remove MockModel imports
    Remove-LinesContaining -FilePath $file.FullName -Patterns @(
        'import.*MockModel.*mockDb',
        'from.*mockDb'
    ) -WhatIf:$WhatIf
    
    # Fix export statements - replace MockDB conditionals with pure MongoDB
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content) {
        # Pattern 1: export const ModelName = isMockDB ? new MockModel('name') : (models.Model || model(...))
        $pattern1 = 'export const (\w+) = isMockDB\s*\?\s*new MockModel\([^)]+\)[^:]*:\s*\(([^)]+)\)'
        if ($content -match $pattern1) {
            $modelName = $matches[1]
            $mongoModel = $matches[2]
            $replacement = "export const $modelName = $mongoModel"
            Replace-TextInFile -FilePath $file.FullName -OldText $matches[0] -NewText $replacement -WhatIf:$WhatIf
        }
        
        # Pattern 2: export const ModelName = isMockDB ? new MockModel('name') as any : (models.Model || model(...))
        $pattern2 = 'export const (\w+) = isMockDB\s*\?\s*new MockModel\([^)]+\)\s*as any\s*:\s*\(([^)]+)\)'
        if ($content -match $pattern2) {
            $modelName = $matches[1]
            $mongoModel = $matches[2]
            $replacement = "export const $modelName = $mongoModel"
            Replace-TextInFile -FilePath $file.FullName -OldText $matches[0] -NewText $replacement -WhatIf:$WhatIf
        }
    }
}

# Clean up other files with isMockDB references
$otherFiles = @(
    "src/lib/AutoFixManager.ts",
    "src/server/finance/invoice.service.ts"
)

foreach ($file in $otherFiles) {
    if (Test-Path $file) {
        Write-Host "Processing: $file" -ForegroundColor Blue
        Remove-LinesContaining -FilePath $file -Patterns @(
            'if.*isMockDB',
            'if.*!isMockDB'
        ) -WhatIf:$WhatIf
    }
}

# Remove USE_MOCK_DB from env.example
if (Test-Path "env.example") {
    Remove-LinesContaining -FilePath "env.example" -Patterns @('USE_MOCK_DB') -WhatIf:$WhatIf
}

# Clean up test files
$testFiles = Get-ChildItem -Path "tests" -Filter "*.ts" -Recurse | Where-Object { $_.Name -like "*test*" -or $_.Name -like "*spec*" }
foreach ($file in $testFiles) {
    Write-Host "Processing test: $($file.Name)" -ForegroundColor Blue
    Remove-LinesContaining -FilePath $file.FullName -Patterns @(
        'MockModel',
        'mockDb',
        'jest\.dontMock.*mockDb'
    ) -WhatIf:$WhatIf
}

Write-Host "🎉 MockDB cleanup complete!" -ForegroundColor Green

if ($WhatIf) {
    Write-Host "This was a dry run. Use without -WhatIf to actually make changes." -ForegroundColor Yellow
} else {
    Write-Host "All MockDB references have been removed. System now uses MongoDB exclusively." -ForegroundColor Green
}