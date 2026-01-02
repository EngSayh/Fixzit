# Duplicate Detection - Windows PowerShell version
# Run: .\scripts\detect-duplicates.ps1 [-FailOnDuplicates]

param(
    [switch]$FailOnDuplicates
)

$ErrorActionPreference = "Stop"
$ThresholdMB = if ($env:THRESHOLD_MB) { [double]$env:THRESHOLD_MB } else { 1.0 }
$ReportFile = "duplicate-detection-report.json"

Write-Host "=== Duplicate File Detection for CI/CD ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "Mode: $(if ($FailOnDuplicates) { 'Strict (will fail build)' } else { 'Report only' })"
Write-Host ""

# Directories and files to skip
$SkipDirs = @(
    'node_modules', '.next', 'dist', '.git',
    'playwright-report', 'test-results', '__pycache__',
    'logs', 'coverage', '.archive', 'tests\state'
)
$SkipFiles = @(
    'tsconfig.tsbuildinfo', 'pnpm-lock.yaml',
    'package-lock.json', '.DS_Store', 'yarn.lock',
    'duplicate-detection-report.json'
)

function Get-FileHashMD5 {
    param([string]$Path)
    try {
        $hash = Get-FileHash -Path $Path -Algorithm MD5 -ErrorAction Stop
        return $hash.Hash.ToLower()
    } catch {
        return $null
    }
}

function Should-Skip {
    param([string]$Path)
    $relativePath = $Path -replace [regex]::Escape((Get-Location).Path + "\"), ""
    
    foreach ($dir in $SkipDirs) {
        if ($relativePath -match "^$([regex]::Escape($dir))[\\/]" -or $relativePath -match "[\\/]$([regex]::Escape($dir))[\\/]") {
            return $true
        }
    }
    
    $fileName = Split-Path $Path -Leaf
    if ($SkipFiles -contains $fileName) {
        return $true
    }
    
    return $false
}

Write-Host "Scanning files..." -ForegroundColor Yellow

$fileHashes = @{}
$totalFiles = 0

Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    if (-not (Should-Skip $_.FullName)) {
        $totalFiles++
        $hash = Get-FileHashMD5 -Path $_.FullName
        if ($hash) {
            if (-not $fileHashes.ContainsKey($hash)) {
                $fileHashes[$hash] = @()
            }
            $fileHashes[$hash] += @{
                path = $_.FullName -replace [regex]::Escape((Get-Location).Path + "\"), ".\"
                size = $_.Length
            }
        }
    }
}

Write-Host "Scanned $totalFiles files" -ForegroundColor Green

# Find duplicates
$duplicates = $fileHashes.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 }
$duplicateGroups = @($duplicates).Count

if ($duplicateGroups -gt 0) {
    Write-Host "`n[!] Found $duplicateGroups groups of duplicate files`n" -ForegroundColor Yellow
    
    $results = @()
    $totalWaste = 0
    
    $sortedDuplicates = $duplicates | Sort-Object { -$_.Value[0].size }
    
    foreach ($dup in $sortedDuplicates) {
        $hashVal = $dup.Key
        $files = $dup.Value
        $groupSize = $files[0].size
        $duplicateCount = $files.Count - 1
        $wastedSpace = $groupSize * $duplicateCount
        $totalWaste += $wastedSpace
        
        $group = @{
            hash = $hashVal
            size = $groupSize
            count = $files.Count
            wasted_space = $wastedSpace
            files = $files | ForEach-Object { $_.path }
        }
        
        $results += $group
        
        Write-Host "Duplicate Group (Hash: $($hashVal.Substring(0, 8))...)" -ForegroundColor Magenta
        Write-Host "  Size: $($groupSize.ToString('N0')) bytes each"
        Write-Host "  Count: $($files.Count) copies"
        Write-Host "  Waste: $($wastedSpace.ToString('N0')) bytes ($([math]::Round($wastedSpace / 1MB, 2)) MB)"
        foreach ($f in $files) {
            Write-Host "    - $($f.path)" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    $wastedMB = $totalWaste / 1MB
    Write-Host "Total wasted space: $($totalWaste.ToString('N0')) bytes ($([math]::Round($wastedMB, 2)) MB)" -ForegroundColor Yellow
    
    $output = @{
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        total_files_scanned = $totalFiles
        duplicate_groups = $duplicateGroups
        total_wasted_bytes = $totalWaste
        total_wasted_mb = [math]::Round($wastedMB, 2)
        duplicates = $results
    }
    
    $output | ConvertTo-Json -Depth 10 | Set-Content -Path $ReportFile -Encoding UTF8
    
    if ($wastedMB -gt $ThresholdMB) {
        if ($FailOnDuplicates) {
            Write-Host "`n[X] Build failed: Duplicate files exceed ${ThresholdMB}MB threshold" -ForegroundColor Red
            exit 1
        } else {
            Write-Host "[!] Duplicates exceed ${ThresholdMB}MB threshold (report saved), but build allowed (no -FailOnDuplicates)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[i] Duplicates detected ($($duplicateGroups) groups) but total waste is under ${ThresholdMB}MB threshold; build allowed" -ForegroundColor Cyan
    }
} else {
    Write-Host "[OK] No duplicate files found" -ForegroundColor Green
    
    $output = @{
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        total_files_scanned = $totalFiles
        duplicate_groups = 0
        total_wasted_bytes = 0
        total_wasted_mb = 0
        duplicates = @()
    }
    
    $output | ConvertTo-Json -Depth 10 | Set-Content -Path $ReportFile -Encoding UTF8
}

Write-Host ""
Write-Host "=== Detection Complete ===" -ForegroundColor Cyan
Write-Host "Report saved: $ReportFile"
Write-Host "[OK] Duplicate detection passed" -ForegroundColor Green
exit 0
