#!/usr/bin/env pwsh
# Verify Imports
# Runs the import analysis tool

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verifying Imports" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "analyze-imports.js") {
    node analyze-imports.js
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    if ($exitCode -eq 0) {
        Write-Host "✅ All imports are valid!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Import issues found - see report above" -ForegroundColor Yellow
    }
    
    exit $exitCode
} else {
    Write-Host "❌ Error: analyze-imports.js not found" -ForegroundColor Red
    exit 1
}
