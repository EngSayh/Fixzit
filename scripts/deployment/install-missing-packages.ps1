#!/usr/bin/env pwsh
# Install Missing Packages
# Installs all packages identified as missing in import analysis

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing Missing Packages" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Production dependencies
$prodPackages = @(
    "express",
    "cors", 
    "helmet",
    "express-rate-limit",
    "express-mongo-sanitize",
    "compression",
    "morgan",
    "cookie-parser",
    "unified",
    "isomorphic-dompurify",
    "winston",
    "validator",
    "xss"
)

# Dev dependencies
$devPackages = @(
    "@jest/globals",
    "jest-mock"
)

$totalPackages = $prodPackages.Count + $devPackages.Count
$installed = 0
$failed = 0

Write-Host "Production packages to install: $($prodPackages.Count)" -ForegroundColor Yellow
Write-Host "Dev packages to install: $($devPackages.Count)" -ForegroundColor Yellow
Write-Host ""

# Install production packages
Write-Host "Installing production packages..." -ForegroundColor Green
Write-Host "-----------------------------------" -ForegroundColor Gray
foreach ($pkg in $prodPackages) {
    Write-Host "  [$($installed + 1)/$totalPackages] Installing $pkg..." -ForegroundColor Gray -NoNewline
    try {
        npm install $pkg --silent 2>&1 | Out-Null
        Write-Host " ✅" -ForegroundColor Green
        $installed++
    }
    catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""

# Install dev packages
Write-Host "Installing dev packages..." -ForegroundColor Green
Write-Host "-----------------------------------" -ForegroundColor Gray
foreach ($pkg in $devPackages) {
    Write-Host "  [$($installed + 1)/$totalPackages] Installing $pkg..." -ForegroundColor Gray -NoNewline
    try {
        npm install --save-dev $pkg --silent 2>&1 | Out-Null
        Write-Host " ✅" -ForegroundColor Green
        $installed++
    }
    catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Installed: $installed packages" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "❌ Failed: $failed packages" -ForegroundColor Red
}
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 All packages installed successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  Some packages failed to install" -ForegroundColor Yellow
    exit 1
}
