$ErrorActionPreference = "Stop"

# 🔒 SECURITY: Block execution in production
if ($env:NODE_ENV -eq "production") {
  Write-Error "❌ This script is not allowed in production environment"
  exit 1
}

# 🔐 Get test password from environment variable
$TEST_PASSWORD = if ($env:TEST_PASSWORD) { $env:TEST_PASSWORD } elseif ($env:DEMO_DEFAULT_PASSWORD) { $env:DEMO_DEFAULT_PASSWORD } else { $null }
if (-not $TEST_PASSWORD) {
  Write-Error "❌ TEST_PASSWORD or DEMO_DEFAULT_PASSWORD environment variable required"
  exit 1
}

$testPages = @(
  '/',
  '/login',
  '/fm/dashboard',
  '/fm/work-orders',
  '/fm/properties',
  '/fm/assets',
  '/fm/tenants',
  '/fm/vendors',
  '/fm/projects',
  '/fm/rfqs',
  '/fm/invoices',
  '/fm/finance',
  '/fm/hr',
  '/fm/crm',
  '/fm/support',
  '/fm/compliance',
  '/fm/reports',
  '/fm/system',
  '/marketplace',
  '/notifications',
  '/profile',
  '/settings'
)

$testApis = @(
  '/api/auth/login',
  '/api/work-orders',
  '/api/properties',
  '/api/assets',
  '/api/tenants',
  '/api/vendors',
  '/api/projects',
  '/api/rfqs',
  '/api/invoices'
)

$results = @{
  pages = @()
  apis = @()
  errors = @()
}

Write-Host "Starting comprehensive system test..." -ForegroundColor Cyan

# Test pages
Write-Host "Testing Pages:" -ForegroundColor Yellow
foreach ($page in $testPages) {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000$page" -Method GET -TimeoutSec 10
    Write-Host "[OK] $page" -ForegroundColor Green
    $results.pages += @{ page = $page; status = "OK" }
  }
  catch {
    Write-Host "[ERROR] $page - $($_.Exception.Message)" -ForegroundColor Red
    $results.errors += @{ page = $page; error = $_.Exception.Message }
  }
}

# Test APIs
Write-Host "Testing APIs:" -ForegroundColor Yellow
foreach ($api in $testApis) {
  try {
    if ($api -eq '/api/auth/login') {
      $body = '{"email":"admin@fixzit.co","password":"' + $TEST_PASSWORD + '"}'
      $response = Invoke-WebRequest -Uri "http://localhost:3000$api" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10
    } else {
      $response = Invoke-WebRequest -Uri "http://localhost:3000$api" -Method GET -TimeoutSec 10
    }
    Write-Host "[OK] $api" -ForegroundColor Green
    $results.apis += @{ api = $api; status = "OK" }
  }
  catch {
    Write-Host "[ERROR] $api - $($_.Exception.Message)" -ForegroundColor Red
    $results.errors += @{ api = $api; error = $_.Exception.Message }
  }
}

# Test authentication flow
Write-Host "Testing Authentication:" -ForegroundColor Yellow
try {
  $loginBody = '{"email":"admin@fixzit.co","password":"' + $TEST_PASSWORD + '"}'
  $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -TimeoutSec 10

  if ($loginResponse.StatusCode -eq 200) {
    Write-Host "[OK] Admin login successful" -ForegroundColor Green

    # Test authenticated API calls
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $cookieHeader = "fixzit_auth=$($loginData.token)"
    $authResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/me" -Headers @{ "Cookie" = $cookieHeader } -TimeoutSec 10

    if ($authResponse.StatusCode -eq 200) {
      Write-Host "[OK] Authenticated API call successful" -ForegroundColor Green
      $results.apis += @{ api = "/api/auth/me"; status = "OK" }
    } else {
      Write-Host "[ERROR] Authenticated API call failed" -ForegroundColor Red
      $results.errors += @{ api = "/api/auth/me"; error = $authResponse.StatusCode }
    }
  } else {
    Write-Host "[ERROR] Admin login failed" -ForegroundColor Red
    $results.errors += @{ api = "/api/auth/login"; error = $loginResponse.StatusCode }
  }
}
catch {
  Write-Host "[ERROR] Authentication test failed: $($_.Exception.Message)" -ForegroundColor Red
  $results.errors += @{ api = "/api/auth/login"; error = $_.Exception.Message }
}

# Summary
Write-Host "Test Summary:" -ForegroundColor Cyan
Write-Host "Pages tested: $($results.pages.Count)"
Write-Host "APIs tested: $($results.apis.Count)"
Write-Host "Errors found: $($results.errors.Count)"

if ($results.errors.Count -gt 0) {
  Write-Host "Errors found:" -ForegroundColor Red
  foreach ($error in $results.errors) {
    Write-Host "- $($error.page) $($error.api): $($error.error)" -ForegroundColor Red
  }
} else {
  Write-Host "All tests passed!" -ForegroundColor Green
}

$results
