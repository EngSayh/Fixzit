# Fixzit System Test Script

Write-Host "🧪 FIXZIT SYSTEM TESTING SCRIPT" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Test configuration
$baseUrlFrontend = "http://localhost:3000"
$baseUrlBackend = "http://localhost:5000"

# Test results
$results = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    Write-Host "`n🔍 Testing: $Name" -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "✅ SUCCESS" -ForegroundColor Green
        
        $global:results += @{
            Name = $Name
            Status = "PASS"
            Response = $response
        }
        
        return $response
    }
    catch {
        Write-Host "❌ FAILED: $_" -ForegroundColor Red
        
        $global:results += @{
            Name = $Name
            Status = "FAIL"
            Error = $_.Exception.Message
        }
        
        return $null
    }
}

Write-Host "`n📡 Testing Backend Server Connection..." -ForegroundColor Cyan
try {
    $null = Invoke-RestMethod -Uri "$baseUrlBackend/api/status" -Method GET
    Write-Host "✅ Backend server is running" -ForegroundColor Green
}
catch {
    Write-Host "❌ Backend server is not responding at $baseUrlBackend" -ForegroundColor Red
    Write-Host "Please ensure the backend server is running: cd packages/fixzit-souq-server && npm start" -ForegroundColor Yellow
}

Write-Host "`n🌐 Testing Frontend Server Connection..." -ForegroundColor Cyan
try {
    $frontendResponse = Invoke-WebRequest -Uri $baseUrlFrontend -Method GET
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend server is running" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Frontend server is not responding at $baseUrlFrontend" -ForegroundColor Red
    Write-Host "Please ensure the frontend server is running: npm run dev" -ForegroundColor Yellow
}

Write-Host "`n🔐 1. Testing Authentication..." -ForegroundColor Cyan

# Test login
$loginBody = @{
    email = "admin@fixzit.co"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Test-Endpoint -Name "Admin Login" -Method "POST" -Url "$baseUrlBackend/api/auth/login" -Body $loginBody

if ($loginResponse) {
    $token = $loginResponse.token
    $authHeaders = @{
        "Authorization" = "Bearer $token"
        "x-tenant-id" = "demo-tenant"
    }
    Write-Host "🔑 Token obtained: $($token.Substring(0, 20))..." -ForegroundColor Gray
}

Write-Host "`n📦 2. Testing Asset Management..." -ForegroundColor Cyan

# Create asset
$assetBody = @{
    name = "Test HVAC Unit"
    type = "HVAC"
    category = "Cooling System"
    propertyId = "test-property-1"
    status = "ACTIVE"
    criticality = "HIGH"
} | ConvertTo-Json

$assetResponse = Test-Endpoint -Name "Create Asset" -Method "POST" -Url "$baseUrlFrontend/api/assets" -Headers $authHeaders -Body $assetBody

# Surface created asset id (use variable)
if ($assetResponse) {
    $assetId = $assetResponse.id
    if (-not $assetId) { $assetId = $assetResponse._id }
    if (-not $assetId) { $assetId = $assetResponse.Id }
    if ($assetId) { Write-Host "   → Asset ID: $assetId" -ForegroundColor Gray }
}

# List assets
Test-Endpoint -Name "List Assets" -Method "GET" -Url "$baseUrlFrontend/api/assets" -Headers $authHeaders

Write-Host "`n🏢 3. Testing Property Management..." -ForegroundColor Cyan

# Create property
$propertyBody = @{
    name = "Test Tower A"
    type = "COMMERCIAL"
    address = @{
        street = "123 Test Street"
        city = "Riyadh"
        region = "Central"
        coordinates = @{
            lat = 24.7136
            lng = 46.6753
        }
    }
} | ConvertTo-Json

$propertyResponse = Test-Endpoint -Name "Create Property" -Method "POST" -Url "$baseUrlFrontend/api/properties" -Headers $authHeaders -Body $propertyBody

# Surface created property id (use variable)
if ($propertyResponse) {
    $propId = $propertyResponse.id
    if (-not $propId) { $propId = $propertyResponse._id }
    if (-not $propId) { $propId = $propertyResponse.Id }
    if ($propId) { Write-Host "   → Property ID: $propId" -ForegroundColor Gray }
}

# List properties
Test-Endpoint -Name "List Properties" -Method "GET" -Url "$baseUrlFrontend/api/properties" -Headers $authHeaders

Write-Host "`n👥 4. Testing Tenant Management..." -ForegroundColor Cyan

# Create tenant
$tenantBody = @{
    name = "Test Company LLC"
    type = "COMPANY"
    contact = @{
        primary = @{
            name = "John Doe"
            email = "john@testcompany.com"
        }
    }
    address = @{
        current = @{
            street = "456 Business Ave"
            city = "Riyadh"
            region = "North"
        }
    }
} | ConvertTo-Json

$tenantResponse = Test-Endpoint -Name "Create Tenant" -Method "POST" -Url "$baseUrlFrontend/api/tenants" -Headers $authHeaders -Body $tenantBody

# Surface created tenant id (use variable)
if ($tenantResponse) {
    $tenantId = $tenantResponse.id
    if (-not $tenantId) { $tenantId = $tenantResponse._id }
    if (-not $tenantId) { $tenantId = $tenantResponse.Id }
    if ($tenantId) { Write-Host "   → Tenant ID: $tenantId" -ForegroundColor Gray }
}

# List tenants
Test-Endpoint -Name "List Tenants" -Method "GET" -Url "$baseUrlFrontend/api/tenants" -Headers $authHeaders

Write-Host "`n🚚 5. Testing Vendor Management..." -ForegroundColor Cyan

# Create vendor
$vendorBody = @{
    name = "Test Maintenance Co"
    type = "SERVICE_PROVIDER"
    contact = @{
        primary = @{
            name = "Ahmed Ali"
            email = "ahmed@maintenance.com"
        }
        address = @{
            street = "789 Service Road"
            city = "Riyadh"
            region = "East"
        }
    }
} | ConvertTo-Json

$vendorResponse = Test-Endpoint -Name "Create Vendor" -Method "POST" -Url "$baseUrlFrontend/api/vendors" -Headers $authHeaders -Body $vendorBody

# Surface created vendor id (use variable)
if ($vendorResponse) {
    $vendorId = $vendorResponse.id
    if (-not $vendorId) { $vendorId = $vendorResponse._id }
    if (-not $vendorId) { $vendorId = $vendorResponse.Id }
    if ($vendorId) { Write-Host "   → Vendor ID: $vendorId" -ForegroundColor Gray }
}

# List vendors
Test-Endpoint -Name "List Vendors" -Method "GET" -Url "$baseUrlFrontend/api/vendors" -Headers $authHeaders

Write-Host "`n📋 6. Testing Project Management..." -ForegroundColor Cyan

# Create project
$projectBody = @{
    name = "Test Renovation Project"
    type = "RENOVATION"
    timeline = @{
        startDate = (Get-Date).ToString("yyyy-MM-dd")
        endDate = (Get-Date).AddDays(90).ToString("yyyy-MM-dd")
    }
    budget = @{
        total = 500000
        currency = "SAR"
    }
} | ConvertTo-Json

$projectResponse = Test-Endpoint -Name "Create Project" -Method "POST" -Url "$baseUrlFrontend/api/projects" -Headers $authHeaders -Body $projectBody

# Surface created project id (use variable)
if ($projectResponse) {
    $projectId = $projectResponse.id
    if (-not $projectId) { $projectId = $projectResponse._id }
    if (-not $projectId) { $projectId = $projectResponse.Id }
    if ($projectId) { Write-Host "   → Project ID: $projectId" -ForegroundColor Gray }
}

# List projects
Test-Endpoint -Name "List Projects" -Method "GET" -Url "$baseUrlFrontend/api/projects" -Headers $authHeaders

Write-Host "`n💰 7. Testing Invoice Management..." -ForegroundColor Cyan

# Create invoice
$invoiceBody = @{
    type = "SERVICE"
    issuer = @{
        name = "Fixzit Facilities Management"
        taxId = "300012345678900"
        address = "King Fahd Road, Riyadh"
    }
    recipient = @{
        name = "Test Client Company"
        address = "Test Street, Riyadh"
    }
    issueDate = (Get-Date).ToString("yyyy-MM-dd")
    dueDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    items = @(
        @{
            description = "Maintenance Service"
            quantity = 1
            unitPrice = 5000
        }
    )
} | ConvertTo-Json

$invoiceResponse = Test-Endpoint -Name "Create Invoice" -Method "POST" -Url "$baseUrlFrontend/api/invoices" -Headers $authHeaders -Body $invoiceBody

# Surface created invoice number/id (use variable)
if ($invoiceResponse) {
    $invNum = $invoiceResponse.number
    if (-not $invNum) { $invNum = $invoiceResponse.id }
    if (-not $invNum) { $invNum = $invoiceResponse._id }
    if ($invNum) { Write-Host "   → Invoice: $invNum" -ForegroundColor Gray }
}

# List invoices
Test-Endpoint -Name "List Invoices" -Method "GET" -Url "$baseUrlFrontend/api/invoices" -Headers $authHeaders

Write-Host "`n📊 8. Testing Work Orders..." -ForegroundColor Cyan

# List work orders
Test-Endpoint -Name "List Work Orders" -Method "GET" -Url "$baseUrlFrontend/api/work-orders" -Headers $authHeaders

Write-Host "`n🎯 9. Testing RFQs..." -ForegroundColor Cyan

# Create RFQ
$rfqBody = @{
    title = "Test HVAC Maintenance RFQ"
    description = "Annual maintenance for HVAC systems"
    category = "Maintenance"
    location = @{
        city = "Riyadh"
        region = "Central"
    }
    specifications = @(
        @{
            item = "HVAC Maintenance"
            description = "Annual service"
            quantity = 10
            unit = "units"
        }
    )
    timeline = @{
        publishDate = (Get-Date).ToString("yyyy-MM-dd")
        bidDeadline = (Get-Date).AddDays(14).ToString("yyyy-MM-dd")
    }
    budget = @{
        estimated = 100000
        currency = "SAR"
    }
} | ConvertTo-Json

$rfqResponse = Test-Endpoint -Name "Create RFQ" -Method "POST" -Url "$baseUrlFrontend/api/rfqs" -Headers $authHeaders -Body $rfqBody

# Surface created RFQ id (use response)
if ($rfqResponse) {
    $rfqId = $rfqResponse.id
    if (-not $rfqId) { $rfqId = $rfqResponse._id }
    if (-not $rfqId) { $rfqId = $rfqResponse.Id }
    if ($rfqId) { Write-Host "   → RFQ ID: $rfqId" -ForegroundColor Gray }
}

# List RFQs
Test-Endpoint -Name "List RFQs" -Method "GET" -Url "$baseUrlFrontend/api/rfqs" -Headers $authHeaders

Write-Host "`n📈 10. Testing Frontend Pages..." -ForegroundColor Cyan

$frontendPages = @(
    "/login",
    "/fm/dashboard",
    "/fm/assets",
    "/fm/properties", 
    "/fm/tenants",
    "/fm/vendors",
    "/fm/projects",
    "/fm/rfqs",
    "/fm/invoices",
    "/fm/work-orders",
    "/notifications"
)

foreach ($page in $frontendPages) {
    Write-Host "Testing page: $page" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$baseUrlFrontend$page" -Method GET
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Page loads successfully" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "❌ Page failed to load: $_" -ForegroundColor Red
    }
}

Write-Host "`n📝 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

$passCount = ($global:results | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($global:results | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $global:results.Count

Write-Host "`nTotal Tests: $totalCount" -ForegroundColor White
Write-Host "✅ Passed: $passCount" -ForegroundColor Green
Write-Host "❌ Failed: $failCount" -ForegroundColor Red

if ($failCount -gt 0) {
    Write-Host "`n⚠️ FAILED TESTS:" -ForegroundColor Yellow
    $global:results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "- $($_.Name): $($_.Error)" -ForegroundColor Red
    }
}

Write-Host "`n🏁 Testing Complete!" -ForegroundColor Cyan
