#!/usr/bin/env pwsh
# PowerShell Code Quality Checker for Fixzit
# Checks for common issues and best practices

param(
    [string]$Path = "scripts",
    [switch]$Fix = $false
)

Write-Host "POWERSHELL CODE QUALITY CHECKER" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor DarkGray
Write-Host ""

$issues = @()
$scripts = Get-ChildItem -Path $Path -Filter "*.ps1" -Recurse

foreach ($script in $scripts) {
    Write-Host "Checking: $($script.Name)" -ForegroundColor Yellow
    $content = Get-Content $script.FullName -Raw
    $lines = Get-Content $script.FullName
    
    # Check 1: Unused variable assignments from Invoke-WebRequest
    $unusedWebRequests = Select-String -Path $script.FullName -Pattern '\$(\w+)\s*=\s*Invoke-WebRequest' | Where-Object {
        $lineNum = $_.LineNumber
        # Check if variable is used after assignment
        $afterLines = $lines[$lineNum..$lines.Count] -join "`n"
        -not ($afterLines -match ("\$" + [regex]::Escape($_.Matches[0].Groups[1].Value)))
    }
    
    if ($unusedWebRequests) {
        foreach ($match in $unusedWebRequests) {
            $issues += @{
                File = $script.Name
                Line = $match.LineNumber
                Issue = "Unused variable assignment from Invoke-WebRequest"
                Severity = "Warning"
            }
            Write-Host "  WARNING Line $($match.LineNumber): Unused variable assignment" -ForegroundColor Yellow
        }
    }
    
    # Check 2: Missing error handling
    if ($content -notmatch '\$ErrorActionPreference') {
        $issues += @{
            File = $script.Name
            Line = 1
            Issue = "Missing ErrorActionPreference setting"
            Severity = "Info"
        }
        Write-Host "  INFO: Missing ErrorActionPreference setting" -ForegroundColor Cyan
    }
    
    # Check 3: Using Write-Host vs Write-Output
    $writeHostCount = (Select-String -Path $script.FullName -Pattern 'Write-Host').Count
    if ($writeHostCount -gt 10) {
        Write-Host "  INFO: High usage of Write-Host ($writeHostCount occurrences)" -ForegroundColor Cyan
    }
    
    # Check 4: Hardcoded URLs
    $hardcodedUrls = Select-String -Path $script.FullName -Pattern 'http://localhost:\d+|https://localhost:\d+'
    if ($hardcodedUrls) {
        foreach ($url in $hardcodedUrls) {
            Write-Host "  INFO: Line $($url.LineNumber): Hardcoded localhost URL" -ForegroundColor Cyan
        }
    }
    
    # Check 5: Missing parameter validation
    if ($content -match 'param\s*\(' -and $content -notmatch '\[Parameter\(') {
        Write-Host "  INFO: Parameters without validation attributes" -ForegroundColor Cyan
    }
    
    # Check 6: Using aliases instead of full cmdlet names
    $commonAliases = @('?', '%', 'foreach', 'where', 'select', 'gci', 'gi', 'si', 'ni', 'ri', 'cpi', 'cvpa', 'rvpa')
    foreach ($alias in $commonAliases) {
        if ($content -match "\b$alias\b") {
            Write-Host "  INFO: Using alias '$alias' instead of full cmdlet name" -ForegroundColor Cyan
        }
    }
    
    # Check 7: Missing script documentation
    if ($content -notmatch '^#.*\n#.*\n' -and $lines.Count -gt 20) {
        Write-Host "  INFO: Missing script header documentation" -ForegroundColor Cyan
    }
    
    # Check 8: Inconsistent string quotes
    $singleQuotes = (Select-String -Path $script.FullName -Pattern "'[^']*'").Count
    $doubleQuotes = (Select-String -Path $script.FullName -Pattern '"[^"]*"').Count
    if ($singleQuotes -gt 0 -and $doubleQuotes -gt 0) {
        $ratio = [Math]::Abs($singleQuotes - $doubleQuotes) / ($singleQuotes + $doubleQuotes)
        if ($ratio -gt 0.3) {
            Write-Host "  INFO: Inconsistent quote usage (Single: $singleQuotes, Double: $doubleQuotes)" -ForegroundColor Cyan
        }
    }
    
    Write-Host ""
}

# Summary
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "=======" -ForegroundColor DarkGray
Write-Host "Scripts analyzed: $($scripts.Count)" -ForegroundColor White
Write-Host "Total issues found: $($issues.Count)" -ForegroundColor White

if ($issues.Count -gt 0) {
    Write-Host ""
    Write-Host "Issues by severity:" -ForegroundColor Yellow
    $issues | Group-Object Severity | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
}

# Recommendations
Write-Host ""
Write-Host "RECOMMENDATIONS" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor DarkGray
Write-Host "1. Use `$null = ` for unused return values" -ForegroundColor Gray
Write-Host "2. Set `$ErrorActionPreference` at script start" -ForegroundColor Gray
Write-Host "3. Use full cmdlet names for better readability" -ForegroundColor Gray
Write-Host "4. Add script documentation headers" -ForegroundColor Gray
Write-Host "5. Consider using configuration files for URLs" -ForegroundColor Gray
Write-Host ""

# Export results
if ($issues.Count -gt 0) {
    $reportPath = "scripts/powershell-quality-report.json"
    $issues | ConvertTo-Json -Depth 3 | Out-File $reportPath
    Write-Host "Detailed report saved to: $reportPath" -ForegroundColor Green
}
