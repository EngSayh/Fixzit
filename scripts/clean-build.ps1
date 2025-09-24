#!/usr/bin/env pwsh
# Clean Build Script for Fixzit Enterprise
# Removes all build caches and temporary files

Write-Host "🧹 FIXZIT CLEAN BUILD SCRIPT" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor DarkGray
Write-Host ""

# Stop any running Node processes
Write-Host "1️⃣ Stopping Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Clean build directories
Write-Host "2️⃣ Cleaning build directories..." -ForegroundColor Yellow
$buildDirs = @(
    ".next",
    ".turbo",
    ".swc",
    "dist",
    "build",
    ".cache",
    "node_modules/.cache",
    "node_modules/.vite",
    ".parcel-cache"
)

foreach ($dir in $buildDirs) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ Removed: $dir" -ForegroundColor Green
    }
}

# Clean temporary files
Write-Host "3️⃣ Cleaning temporary files..." -ForegroundColor Yellow
$tempPatterns = @("*.tmp", "*.temp", "*.log", "*.pid")
foreach ($pattern in $tempPatterns) {
    $files = Get-ChildItem -Path . -Filter $pattern -Recurse -ErrorAction SilentlyContinue
    if ($files) {
        Remove-Item $files.FullName -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ Removed $($files.Count) $pattern files" -ForegroundColor Green
    }
}

# Clean TypeScript build info
Write-Host "4️⃣ Cleaning TypeScript cache..." -ForegroundColor Yellow
$tsBuildInfo = Get-ChildItem -Path . -Filter "*.tsbuildinfo" -Recurse -ErrorAction SilentlyContinue
if ($tsBuildInfo) {
    Remove-Item $tsBuildInfo.FullName -Force
    Write-Host "   ✓ Removed TypeScript build info" -ForegroundColor Green
}

# Clean webpack cache
Write-Host "5️⃣ Cleaning webpack cache..." -ForegroundColor Yellow
$webpackCache = Get-ChildItem -Path . -Filter "webpack.cache.*" -Recurse -ErrorAction SilentlyContinue
if ($webpackCache) {
    Remove-Item $webpackCache.FullName -Force -Recurse
    Write-Host "   ✓ Removed webpack cache" -ForegroundColor Green
}

# Clean ESLint cache
Write-Host "6️⃣ Cleaning ESLint cache..." -ForegroundColor Yellow
if (Test-Path ".eslintcache") {
    Remove-Item ".eslintcache" -Force
    Write-Host "   ✓ Removed ESLint cache" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "✅ BUILD CACHE CLEANED!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run 'npm install' to ensure dependencies are fresh" -ForegroundColor Gray
Write-Host "2. Run 'npm run dev' to start with a clean build" -ForegroundColor Gray
Write-Host ""
