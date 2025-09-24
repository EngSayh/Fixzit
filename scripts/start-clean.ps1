#!/usr/bin/env pwsh
# Start Clean Script for Fixzit Enterprise
# Ensures a clean start with no cache issues

Write-Host "🚀 FIXZIT CLEAN START" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor DarkGray
Write-Host ""

# Check if .next exists and is potentially corrupted
if (Test-Path ".next") {
    $lastWrite = (Get-Item ".next").LastWriteTime
    $hoursSinceWrite = (New-TimeSpan -Start $lastWrite -End (Get-Date)).TotalHours
    
    if ($hoursSinceWrite -gt 24) {
        Write-Host "⚠️  Build cache is older than 24 hours, cleaning..." -ForegroundColor Yellow
        & .\scripts\clean-build.ps1
    }
}

# Check for MongoDB
Write-Host "🔍 Checking MongoDB connection..." -ForegroundColor Yellow
try {
    $mongoCheck = & mongosh --eval "db.version()" --quiet 2>$null
    if ($mongoCheck) {
        Write-Host "✅ MongoDB is running" -ForegroundColor Green
        $env:USE_MOCK_DB = "false"
    } else {
        throw "MongoDB not responding"
    }
} catch {
    Write-Host "⚠️  MongoDB not available, using mock database" -ForegroundColor Yellow
    $env:USE_MOCK_DB = "true"
}

# Set environment variables
Write-Host ""
Write-Host "📋 Setting environment..." -ForegroundColor Yellow
$env:NODE_OPTIONS = "--max-old-space-size=4096"
$env:SUPPRESS_MONGODB_WARNINGS = "true"
Write-Host "✅ Environment configured" -ForegroundColor Green

# Start the dev server
Write-Host ""
Write-Host "🚀 Starting development server..." -ForegroundColor Cyan
npm run dev
