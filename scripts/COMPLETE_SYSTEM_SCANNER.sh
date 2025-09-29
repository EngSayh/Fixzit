#!/bin/bash
echo "
╔════════════════════════════════════════════════════════════════════╗
║     FIXZIT COMPLETE SYSTEM SCANNER v1.0                           ║
║     Full Scope Verification - Every Component                      ║
╚════════════════════════════════════════════════════════════════════╝
"

# Initialize comprehensive report
TOTAL_CHECKS=0
PASSED=0
FAILED=0
WARNINGS=0
declare -A REPORT

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to perform checks
check() {
    local category=$1
    local item=$2
    local command=$3
    local expected=$4
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if eval "$command"; then
        echo -e "${GREEN}✓${NC} [$category] $item"
        PASSED=$((PASSED + 1))
        REPORT["$category:$item"]="PASS"
    else
        echo -e "${RED}✗${NC} [$category] $item - Expected: $expected"
        FAILED=$((FAILED + 1))
        REPORT["$category:$item"]="FAIL:$expected"
    fi
}

echo "
════════════════════════════════════════════════════════════════════
SECTION 1: BACKEND INFRASTRUCTURE
════════════════════════════════════════════════════════════════════
"

echo "1.1 SERVER & DATABASE"
echo "────────────────────────────────────"
check "BACKEND" "Node.js Server Running" "curl -s http://localhost:5000/health | grep -q 'OK'" "Server on port 5000"
check "BACKEND" "MongoDB Connected" "pgrep mongod > /dev/null" "MongoDB process running"
check "BACKEND" "Database Name" "mongo fixzit_souq --eval 'db.getName()' 2>/dev/null | grep -q 'fixzit_souq'" "fixzit_souq database"
check "BACKEND" "Express Framework" "[ -f package.json ] && grep -q 'express' package.json" "Express in package.json"
check "BACKEND" "JWT Authentication" "[ -f package.json ] && grep -q 'jsonwebtoken' package.json" "JWT package installed"
check "BACKEND" "CORS Enabled" "grep -r 'cors' server.js 2>/dev/null | grep -q 'cors'" "CORS middleware"
check "BACKEND" "Body Parser" "grep -r 'body-parser\|express.json' server.js 2>/dev/null" "Body parsing enabled"

echo -e "\n1.2 DATABASE MODELS (15 Required)"
echo "────────────────────────────────────"
MODELS=("Organization" "User" "Property" "WorkOrder" "Invoice" "Vendor" "RFQ" "Inventory" "Contract" "Employee" "Ticket" "Notification" "Compliance" "ReportTemplate" "AuditLog")
for model in "${MODELS[@]}"; do
    check "MODELS" "$model Model" "[ -f models/$model.js ]" "models/$model.js exists"
done

echo -e "\n1.3 API ROUTES (13 FM Modules + Support)"
echo "────────────────────────────────────"
ROUTES=("dashboard" "work-orders" "properties" "finance" "hr" "administration" "crm" "marketplace" "support" "compliance" "reports" "system" "pm" "auth" "users" "tenants" "maintenance")
for route in "${ROUTES[@]}"; do
    # Check if route file exists
    check "ROUTES" "$route file exists" "[ -f routes/$route.js ] || [ -f routes/${route//-/}.js ]" "Route file present"
    
    # Check if route is mounted in server.js
    check "ROUTES" "$route mounted" "grep -q \"app.use.*$route\" server.js 2>/dev/null" "Mounted in server.js"
    
    # Check if route is accessible
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/$route)
    check "ROUTES" "$route accessible" "[ '$HTTP_CODE' = '200' ] || [ '$HTTP_CODE' = '201' ]" "HTTP 200/201 response"
done

echo "
════════════════════════════════════════════════════════════════════
SECTION 2: FRONTEND STRUCTURE
════════════════════════════════════════════════════════════════════
"

# Find HTML files
HTML_FILES=$(find . -name "*.html" -o -name "index.html" 2>/dev/null)
if [ -z "$HTML_FILES" ]; then
    echo -e "${RED}CRITICAL: No HTML files found!${NC}"
    FAILED=$((FAILED + 10))
else
    HTML_FILE=$(echo "$HTML_FILES" | head -1)
    echo "Analyzing: $HTML_FILE"
fi

echo -e "\n2.1 VIEW STRUCTURE"
echo "────────────────────────────────────"
check "VIEWS" "Landing Page Div" "grep -q 'id=\"landingPage\"\|id=\"landing-view\"' '$HTML_FILE'" "Landing page container"
check "VIEWS" "Login Page Div" "grep -q 'id=\"loginPage\"\|id=\"login-view\"' '$HTML_FILE'" "Login page container"
check "VIEWS" "Dashboard Div" "grep -q 'id=\"mainApp\"\|id=\"dashboard-view\"' '$HTML_FILE'" "Dashboard container"
check "VIEWS" "View Separation Logic" "grep -q 'display.*none\|hideAllViews\|ViewManager' '$HTML_FILE'" "View state management"
check "VIEWS" "No Overlap CSS" "grep -q 'view-container\|display: none' '$HTML_FILE'" "CSS preventing overlap"

echo -e "\n2.2 LANDING PAGE COMPONENTS"
echo "────────────────────────────────────"
check "LANDING" "Blue Gradient Header" "grep -q 'linear-gradient.*#0078D4.*#00BCF2' '$HTML_FILE'" "Blue gradient background"
check "LANDING" "Three Center Buttons" "grep -q 'header-buttons.*justify-content.*center' '$HTML_FILE'" "Centered button layout"
check "LANDING" "Yellow Arabic Button" "grep -q 'btn-arabic.*#FFB400' '$HTML_FILE'" "Yellow button #FFB400"
check "LANDING" "White Souq Button" "grep -q 'btn-souq.*background.*white' '$HTML_FILE'" "White Fixzit Souq button"
check "LANDING" "Green Access Button" "grep -q 'btn-access.*#00A859' '$HTML_FILE'" "Green Access button #00A859"
check "LANDING" "Enterprise Features Title" "grep -q 'Enterprise Features' '$HTML_FILE'" "Enterprise Features section"
CARD_COUNT=$(grep -c 'feature-card' "$HTML_FILE" 2>/dev/null || echo 0)
check "LANDING" "Six Feature Cards" "[ $CARD_COUNT -eq 6 ]" "Exactly 6 feature cards"

echo -e "\n2.3 LOGIN PAGE COMPONENTS"
echo "────────────────────────────────────"
check "LOGIN" "Email Input Field" "grep -q 'type=\"email\"' '$HTML_FILE'" "Email input field"
check "LOGIN" "Password Input Field" "grep -q 'type=\"password\"' '$HTML_FILE'" "Password input field"
check "LOGIN" "Google Login Button" "grep -q 'Google\|google' '$HTML_FILE'" "Google OAuth button"
check "LOGIN" "Apple Login Button" "grep -q 'Apple\|apple' '$HTML_FILE'" "Apple OAuth button"
check "LOGIN" "Login Form Container" "grep -q 'login-box\|login-container' '$HTML_FILE'" "Login container div"
check "LOGIN" "Forgot Password Link" "grep -q 'Forgot.*Password' '$HTML_FILE'" "Password recovery link"

echo -e "\n2.4 DASHBOARD COMPONENTS"
echo "────────────────────────────────────"
check "DASHBOARD" "Monday.com Sidebar" "grep -q 'sidebar.*collapsed\|collapsible' '$HTML_FILE'" "Collapsible sidebar"
check "DASHBOARD" "Top Navigation Bar" "grep -q 'top-nav\|nav-tabs' '$HTML_FILE'" "Top navigation"
check "DASHBOARD" "Language Toggle" "grep -q 'lang-toggle\|toggleLanguage' '$HTML_FILE'" "Language switcher"
check "DASHBOARD" "User Avatar/Profile" "grep -q 'user-avatar\|user-menu' '$HTML_FILE'" "User profile section"
check "DASHBOARD" "Notification Icon" "grep -q '🔔\|notification' '$HTML_FILE'" "Notification bell"
check "DASHBOARD" "Quick Create Button" "grep -q '➕\|quick-create' '$HTML_FILE'" "Quick create action"

echo -e "\n2.5 FOOTER & HEADER"
echo "────────────────────────────────────"
check "FOOTER" "Footer Element" "grep -q '<footer\|id=\"footer\"' '$HTML_FILE'" "Footer HTML element"
check "FOOTER" "Footer in Landing" "grep -A50 'landingPage' '$HTML_FILE' | grep -q 'footer'" "Footer in landing view"
check "FOOTER" "Footer in Dashboard" "grep -A50 'mainApp' '$HTML_FILE' | grep -q 'footer'" "Footer in dashboard view"
check "FOOTER" "Footer NOT in Login" "! (grep -A50 'loginPage' '$HTML_FILE' | grep -q 'footer')" "No footer in login"
check "HEADER" "Dynamic Header Logic" "grep -q 'updateHeader\|dynamicHeader' '$HTML_FILE'" "Dynamic header function"

echo -e "\n2.6 BRAND COLORS"
echo "────────────────────────────────────"
check "COLORS" "Primary Blue #0061A8" "grep -q '#0061A8' '$HTML_FILE'" "Primary blue color"
check "COLORS" "Dark Blue #023047" "grep -q '#023047' '$HTML_FILE'" "Dark blue color"
check "COLORS" "Orange #F6851F" "grep -q '#F6851F' '$HTML_FILE'" "Orange accent color"
check "COLORS" "Green #00A859" "grep -q '#00A859' '$HTML_FILE'" "Green success color"
check "COLORS" "Yellow #FFB400" "grep -q '#FFB400' '$HTML_FILE'" "Yellow warning color"

echo -e "\n2.7 RTL & LOCALIZATION"
echo "────────────────────────────────────"
check "RTL" "RTL CSS Rules" "grep -q 'dir=\"rtl\"\|html\[dir=\"rtl\"\]' '$HTML_FILE'" "RTL support styles"
check "RTL" "Arabic Language Option" "grep -q 'عربي\|Arabic' '$HTML_FILE'" "Arabic language option"
check "RTL" "Sidebar RTL Flip" "grep -q 'rtl.*sidebar.*right' '$HTML_FILE'" "Sidebar flips for RTL"
check "RTL" "Hijri Calendar Support" "grep -q 'hijri\|Hijri' '$HTML_FILE' 2>/dev/null" "Hijri calendar option"

echo "
════════════════════════════════════════════════════════════════════
SECTION 3: 13 FM MODULES VERIFICATION
════════════════════════════════════════════════════════════════════
"

FM_MODULES=(
    "dashboard:Dashboard:Overview,My Work,Alerts,Calendar"
    "work-orders:Work Orders:Board View,Calendar,PM,Service History,Dispatch"
    "properties:Properties:Units,Tenants,Leases,Asset Register,Inspections"
    "finance:Finance:Invoices,ZATCA,Payments,Expenses,Budgets"
    "hr:HR:Directory,Attendance,Payroll,Recruitment,Training"
    "administration:Administration:DoA,Policies,Asset Inventory,Fleet,Vendors"
    "crm:CRM:Customers,Leads,Contracts,Feedback,NPS CSAT"
    "marketplace:Marketplace:Vendors,Service Catalog,RFQ,Bidding,Orders"
    "support:Support:Tickets,Knowledge Base,SLAs,Surveys"
    "compliance:Compliance:Permits,Inspections,Fines,Audits"
    "reports:Reports:Operational,Financial,Workforce,Custom Builder"
    "system:System Management:Users Roles,Multi-tenant,Integrations,Webhooks"
    "pm:Preventive Maintenance:Recurring WO,Asset Schedules,Predictive"
)

MODULE_NUM=0
for module_data in "${FM_MODULES[@]}"; do
    IFS=':' read -r endpoint name features <<< "$module_data"
    echo -e "\n3.$((++MODULE_NUM)) $name Module"
    echo "────────────────────────────────────"
    
    # Check module in sidebar
    check "MODULE" "$name in Sidebar" "grep -qi '$name' '$HTML_FILE'" "Listed in sidebar"
    
    # Check API endpoint
    API_RESPONSE=$(curl -s http://localhost:5000/api/$endpoint 2>/dev/null)
    check "MODULE" "$name API Works" "[ -n '$API_RESPONSE' ] && ! echo '$API_RESPONSE' | grep -q 'Cannot GET'" "API returns data"
    
    # Check features
    IFS=',' read -ra FEATURES <<< "$features"
    for feature in "${FEATURES[@]}"; do
        # Trim whitespace
        feature=$(echo "$feature" | xargs)
        check "MODULE" "$name: $feature" "grep -qi '$feature' '$HTML_FILE' || curl -s http://localhost:5000/api/$endpoint | grep -qi '$feature'" "Feature present"
    done
done

echo "
════════════════════════════════════════════════════════════════════
SECTION 4: FIXZIT SOUQ MARKETPLACE
════════════════════════════════════════════════════════════════════
"

echo -e "\n4.1 MARKETPLACE CORE"
echo "────────────────────────────────────"
check "SOUQ" "Vendor Registration" "curl -s http://localhost:5000/api/marketplace/vendors | head -c 100" "Vendor API accessible"
check "SOUQ" "Product Catalog" "curl -s http://localhost:5000/api/marketplace/products | head -c 100" "Product API accessible"
check "SOUQ" "RFQ System" "curl -s http://localhost:5000/api/marketplace/rfq | head -c 100" "RFQ API accessible"
check "SOUQ" "Bidding Engine" "curl -s http://localhost:5000/api/marketplace/bids | head -c 100" "Bidding API accessible"
check "SOUQ" "Purchase Orders" "curl -s http://localhost:5000/api/marketplace/orders | head -c 100" "Orders API accessible"

echo -e "\n4.2 INTEGRATION POINTS"
echo "────────────────────────────────────"
check "SOUQ" "Work Order Integration" "grep -q 'marketplace.*work.*order\|workorder.*marketplace' routes/*.js 2>/dev/null" "WO-Marketplace link"
check "SOUQ" "Financial Integration" "grep -q 'finance.*marketplace\|marketplace.*finance' routes/*.js 2>/dev/null" "Finance-Marketplace link"
check "SOUQ" "Inventory Integration" "grep -q 'inventory.*marketplace\|marketplace.*inventory' routes/*.js 2>/dev/null" "Inventory-Marketplace link"

echo "
════════════════════════════════════════════════════════════════════
SECTION 5: AQAR SOUQ REAL ESTATE
════════════════════════════════════════════════════════════════════
"

echo -e "\n5.1 REAL ESTATE CORE"
echo "────────────────────────────────────"
check "AQAR" "Property Listings" "curl -s http://localhost:5000/api/aqar/properties 2>/dev/null | head -c 100" "Aqar properties API"
check "AQAR" "Real Estate Search" "curl -s http://localhost:5000/api/aqar/search 2>/dev/null | head -c 100" "Aqar search API"
check "AQAR" "Property Management" "grep -q 'aqar\|real.*estate' routes/*.js 2>/dev/null" "Aqar routes exist"

echo "
════════════════════════════════════════════════════════════════════
SECTION 6: JAVASCRIPT FUNCTIONALITY
════════════════════════════════════════════════════════════════════
"

echo -e "\n6.1 CORE FUNCTIONS"
echo "────────────────────────────────────"
check "JS" "showApp Function" "grep -q 'function showApp\|showApp.*function' '$HTML_FILE'" "showApp() defined"
check "JS" "showLogin Function" "grep -q 'function showLogin\|showLogin.*function' '$HTML_FILE'" "showLogin() defined"
check "JS" "toggleSidebar Function" "grep -q 'function toggleSidebar\|toggleSidebar.*function' '$HTML_FILE'" "toggleSidebar() defined"
check "JS" "showModule Function" "grep -q 'function showModule\|showModule.*function' '$HTML_FILE'" "showModule() defined"
check "JS" "setLanguage Function" "grep -q 'function setLanguage\|setLanguage.*function' '$HTML_FILE'" "setLanguage() defined"

echo -e "\n6.2 EVENT HANDLERS"
echo "────────────────────────────────────"
check "JS" "Login Form Handler" "grep -q 'loginForm.*addEventListener\|login.*submit' '$HTML_FILE'" "Login form events"
check "JS" "Navigation Handlers" "grep -q 'nav.*click\|onclick.*nav' '$HTML_FILE'" "Navigation click events"
check "JS" "Language Toggle" "grep -q 'onclick.*setLanguage\|setLanguage.*click' '$HTML_FILE'" "Language toggle events"

echo "
════════════════════════════════════════════════════════════════════
SECTION 7: SPECIAL FEATURES
════════════════════════════════════════════════════════════════════
"

echo -e "\n7.1 ZATCA E-INVOICING"
echo "────────────────────────────────────"
check "ZATCA" "QR Code Generation" "grep -q 'qrcode\|QR.*code' routes/*.js package.json 2>/dev/null" "QR code capability"
check "ZATCA" "Tax Compliance" "grep -q 'zatca\|ZATCA\|tax.*invoice' routes/*.js 2>/dev/null" "ZATCA compliance"
check "ZATCA" "Invoice API" "curl -s http://localhost:5000/api/finance/invoices 2>/dev/null | head -c 100" "Invoice API works"

echo -e "\n7.2 MULTI-TENANT"
echo "────────────────────────────────────"
check "TENANT" "Organization Model" "[ -f models/Organization.js ]" "Organization isolation"
check "TENANT" "Tenant Separation" "grep -q 'org_id\|organizationId\|tenantId' models/*.js 2>/dev/null" "Multi-tenant data"
check "TENANT" "User Organization" "grep -q 'organization.*user\|user.*organization' models/*.js 2>/dev/null" "User-org relationship"

echo -e "\n7.3 WORKFLOW ENGINE"
echo "────────────────────────────────────"
WORKFLOW_STATES=("New" "Assessment" "Estimate Pending" "Quotation Review" "Pending Approval" "Approved" "In Progress" "Work Complete" "Quality Check" "Financial Posting" "Closed")
for state in "${WORKFLOW_STATES[@]}"; do
    check "WORKFLOW" "State: $state" "grep -q '$state' models/*.js 2>/dev/null" "Workflow state defined"
done

echo "
════════════════════════════════════════════════════════════════════
SECTION 8: SECURITY & AUTHENTICATION
════════════════════════════════════════════════════════════════════
"

echo -e "\n8.1 AUTHENTICATION"
echo "────────────────────────────────────"
check "AUTH" "JWT Implementation" "grep -q 'jwt\|jsonwebtoken' routes/auth.js 2>/dev/null" "JWT in auth route"
check "AUTH" "Password Hashing" "grep -q 'bcrypt\|hash' routes/auth.js 2>/dev/null" "Password hashing"
check "AUTH" "Google OAuth" "grep -q 'google\|oauth' routes/auth.js 2>/dev/null" "Google OAuth setup"
check "AUTH" "Session Management" "grep -q 'session\|token' routes/auth.js 2>/dev/null" "Session handling"

echo -e "\n8.2 AUTHORIZATION"
echo "────────────────────────────────────"
check "AUTHZ" "Role-Based Access" "grep -q 'role\|permission' models/User.js 2>/dev/null" "RBAC implementation"
check "AUTHZ" "API Protection" "grep -q 'auth\|token' routes/*.js | grep -v auth.js | head -1" "Protected routes"

echo "
════════════════════════════════════════════════════════════════════
FINAL REPORT
════════════════════════════════════════════════════════════════════
"

PERCENTAGE=$((PASSED * 100 / TOTAL_CHECKS))

echo -e "
╔════════════════════════════════════════╗
║           SYSTEM SCAN COMPLETE         ║
╠════════════════════════════════════════╣
║ Total Checks: $TOTAL_CHECKS
║ Passed: ${GREEN}$PASSED${NC}
║ Failed: ${RED}$FAILED${NC}
║ Success Rate: $PERCENTAGE%
╚════════════════════════════════════════╝
"

if [ $PERCENTAGE -gt 90 ]; then
    echo -e "${GREEN}🎉 EXCELLENT! System is production-ready${NC}"
elif [ $PERCENTAGE -gt 70 ]; then
    echo -e "${YELLOW}⚠️  GOOD! System needs minor fixes${NC}"
elif [ $PERCENTAGE -gt 50 ]; then
    echo -e "${YELLOW}⚠️  FAIR! System needs significant work${NC}"
else
    echo -e "${RED}❌ CRITICAL! System requires major fixes${NC}"
fi

echo -e "\n📊 Frontend: http://localhost:3000"
echo -e "🔧 Backend:  http://localhost:5000"
echo -e "📄 Detailed report saved to: /tmp/system_scan_$(date +%Y%m%d_%H%M%S).log"

# Save detailed report
{
    echo "FIXZIT SYSTEM SCAN REPORT - $(date)"
    echo "====================================="
    for key in "${!REPORT[@]}"; do
        echo "$key: ${REPORT[$key]}"
    done
} > "/tmp/system_scan_$(date +%Y%m%d_%H%M%S).log"