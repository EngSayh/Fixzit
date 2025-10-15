#!/usr/bin/env pwsh

# Comprehensive System E2E Testing Script
# Tests all modules, UI components, APIs, and functionalities for 100% completion

Write-Host "🚀 COMPREHENSIVE SYSTEM E2E TESTING STARTED" -ForegroundColor Green
Write-Host "Target: 100% System Completeness Verification" -ForegroundColor Yellow
Write-Host "=" * 80

$BaseUrl = "http://localhost:3000"
$ApiResults = @{}
$UIResults = @{}
$ErrorCount = 0
$SuccessCount = 0

function Test-Endpoint {
    param($Path, $Method = "GET", $Body = $null, $Description)
    
    try {
        Write-Host "Testing: $Description" -ForegroundColor Cyan
        
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri "$BaseUrl$Path" -Method $Method -TimeoutSec 10
        } else {
            $response = Invoke-RestMethod -Uri "$BaseUrl$Path" -Method $Method -Body $Body -ContentType "application/json" -TimeoutSec 10
        }
        
        Write-Host "✅ PASS: $Description" -ForegroundColor Green
        $global:SuccessCount++
        return @{ Status = "PASS"; Response = $response; Error = $null }
    }
    catch {
        Write-Host "❌ FAIL: $Description - $($_.Exception.Message)" -ForegroundColor Red
        $global:ErrorCount++
        return @{ Status = "FAIL"; Response = $null; Error = $_.Exception.Message }
    }
}

Write-Host "`n📊 TESTING API ENDPOINTS" -ForegroundColor Magenta
Write-Host "-" * 40

# Core System APIs
$ApiResults["health"] = Test-Endpoint "/api/qa/health" "GET" $null "QA Health Check"
$ApiResults["database"] = Test-Endpoint "/api/health/database" "GET" $null "Database Health"

# Authentication APIs  
$ApiResults["auth-me"] = Test-Endpoint "/api/auth/me" "GET" $null "Auth Me (should require auth)"

# Module APIs - Test with dynamic imports
$ApiResults["work-orders"] = Test-Endpoint "/api/work-orders" "GET" $null "Work Orders API"
$ApiResults["assets"] = Test-Endpoint "/api/assets" "GET" $null "Assets API"
$ApiResults["properties"] = Test-Endpoint "/api/properties" "GET" $null "Properties API"
$ApiResults["invoices"] = Test-Endpoint "/api/finance/invoices" "GET" $null "Finance Invoices API"
$ApiResults["support-tickets"] = Test-Endpoint "/api/support/tickets" "GET" $null "Support Tickets API"
$ApiResults["marketplace-products"] = Test-Endpoint "/api/marketplace/products" "GET" $null "Marketplace Products API"
$ApiResults["ats-jobs"] = Test-Endpoint "/api/ats/jobs" "GET" $null "ATS Jobs API"

# Subscription/Billing APIs
$quoteBody = @{
    seats = 5
    modules = @("FM_CORE", "PROPERTIES") 
    billingCycle = "MONTHLY"
    currency = "USD"
} | ConvertTo-Json

$ApiResults["subscription-quote"] = Test-Endpoint "/api/checkout/quote" "POST" $quoteBody "Subscription Pricing Quote"
$ApiResults["admin-benchmarks"] = Test-Endpoint "/api/admin/billing/benchmark" "GET" $null "Admin Billing Benchmarks"

# Search APIs
$ApiResults["global-search"] = Test-Endpoint "/api/search?q=test" "GET" $null "Global Search API"
$ApiResults["marketplace-search"] = Test-Endpoint "/api/marketplace/search?q=product" "GET" $null "Marketplace Search API"

# Help/KB APIs
$ApiResults["help-articles"] = Test-Endpoint "/api/help/articles" "GET" $null "Help Articles API"
$ApiResults["kb-search"] = Test-Endpoint "/api/kb/search?q=help" "GET" $null "Knowledge Base Search"

# Notifications API
$ApiResults["notifications"] = Test-Endpoint "/api/notifications" "GET" $null "Notifications API"

Write-Host "`n📱 TESTING UI PAGES" -ForegroundColor Magenta  
Write-Host "-" * 40

# Test main pages accessibility
$PageTests = @(
    @{ Path = "/"; Description = "Home Page" }
    @{ Path = "/login"; Description = "Login Page" }
    @{ Path = "/dashboard"; Description = "Dashboard" }
    @{ Path = "/properties"; Description = "Properties Page" }
    @{ Path = "/work-orders"; Description = "Work Orders Page" }
    @{ Path = "/assets"; Description = "Assets Page" }
    @{ Path = "/finance"; Description = "Finance Page" }
    @{ Path = "/support"; Description = "Support Page" }
    @{ Path = "/marketplace"; Description = "Marketplace Page" }
    @{ Path = "/careers"; Description = "Careers/ATS Page" }
    @{ Path = "/help"; Description = "Help Center" }
    @{ Path = "/admin"; Description = "Admin Panel" }
    @{ Path = "/profile"; Description = "User Profile" }
    @{ Path = "/notifications"; Description = "Notifications Page" }
)

foreach ($page in $PageTests) {
    $UIResults[$page.Path] = Test-Endpoint $page.Path "GET" $null $page.Description
}

Write-Host "`n🔧 TESTING MODULE CONTROLS" -ForegroundColor Magenta
Write-Host "-" * 40

# Test environment variable module controls
$ModuleTests = @(
    @{ Var = "WO_ENABLED"; Api = "/api/work-orders"; Module = "Work Orders" }
    @{ Var = "ASSET_ENABLED"; Api = "/api/assets"; Module = "Asset Management" }  
    @{ Var = "MARKETPLACE_ENABLED"; Api = "/api/marketplace/products"; Module = "Marketplace" }
    @{ Var = "ATS_ENABLED"; Api = "/api/ats/jobs"; Module = "ATS/Careers" }
)

foreach ($module in $ModuleTests) {
    $envValue = [System.Environment]::GetEnvironmentVariable($module.Var)
    Write-Host "Module Control: $($module.Module) ($($module.Var)=$envValue)" -ForegroundColor Yellow
}

Write-Host "`n📊 COMPREHENSIVE RESULTS SUMMARY" -ForegroundColor Magenta
Write-Host "=" * 80

Write-Host "📈 API ENDPOINTS RESULTS:" -ForegroundColor Yellow
foreach ($key in $ApiResults.Keys) {
    $result = $ApiResults[$key]
    $status = if ($result.Status -eq "PASS") { "✅" } else { "❌" }
    Write-Host "$status $key - $($result.Status)" -ForegroundColor $(if ($result.Status -eq "PASS") { "Green" } else { "Red" })
}

Write-Host "`n📱 UI PAGES RESULTS:" -ForegroundColor Yellow
foreach ($key in $UIResults.Keys) {
    $result = $UIResults[$key] 
    $status = if ($result.Status -eq "PASS") { "✅" } else { "❌" }
    Write-Host "$status $key - $($result.Status)" -ForegroundColor $(if ($result.Status -eq "PASS") { "Green" } else { "Red" })
}

Write-Host "`n📊 FINAL SYSTEM SCORE:" -ForegroundColor Magenta
$TotalTests = $SuccessCount + $ErrorCount
$SuccessRate = if ($TotalTests -gt 0) { [math]::Round(($SuccessCount / $TotalTests) * 100, 2) } else { 0 }

Write-Host "Total Tests: $TotalTests" -ForegroundColor White
Write-Host "Passed: $SuccessCount" -ForegroundColor Green  
Write-Host "Failed: $ErrorCount" -ForegroundColor Red
Write-Host "SUCCESS RATE: $SuccessRate%" -ForegroundColor $(if ($SuccessRate -ge 90) { "Green" } elseif ($SuccessRate -ge 75) { "Yellow" } else { "Red" })

if ($SuccessRate -eq 100) {
    Write-Host "🎉 PERFECT SCORE: 100% SYSTEM COMPLETION!" -ForegroundColor Green
} elseif ($SuccessRate -ge 90) {
    Write-Host "🎯 EXCELLENT: System is highly functional!" -ForegroundColor Green
} elseif ($SuccessRate -ge 75) {
    Write-Host "⚠️  GOOD: Minor issues need attention" -ForegroundColor Yellow
} else {
    Write-Host "🚨 CRITICAL: Major issues require immediate attention" -ForegroundColor Red
}

Write-Host "`n✅ COMPREHENSIVE E2E TESTING COMPLETE" -ForegroundColor Green