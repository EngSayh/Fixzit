#!/usr/bin/env bash
# Enhanced Fixzit Doctor - Comprehensive System Health Check
# Version: 2.0 (with 5 critical upgrades)
# Date: November 14, 2025

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
FIXES_APPLIED=0

# Flags
FIX_MODE=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --fix)
      FIX_MODE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Usage: $0 [--fix] [--verbose]"
      exit 1
      ;;
  esac
done

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
  ((ERRORS++))
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
  ((WARNINGS++))
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_fix() {
  echo -e "${GREEN}[FIXED]${NC} $1"
  ((FIXES_APPLIED++))
}

echo "======================================"
echo "   Fixzit System Health Check v2.0"
echo "======================================"
echo ""

# UPGRADE 1: Node Version Check (18/20 required)
echo "## Checking Node.js Version..."
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  if echo "$NODE_VERSION" | grep -qE 'v(18|20)\.'; then
    log_success "Node.js version: $NODE_VERSION (supported)"
  else
    log_error "Node.js version: $NODE_VERSION (unsupported). Requires v18 or v20 LTS"
    if [[ "$FIX_MODE" == true ]]; then
      log_info "Please install Node.js 20 LTS manually: https://nodejs.org"
    fi
  fi
else
  log_error "Node.js not found. Install Node.js 20 LTS"
fi
echo ""

# Check Next.js Version (should be 14.x or 15.x)
echo "## Checking Next.js Version..."
if [ -f "package.json" ]; then
  NEXT_VERSION=$(grep -o '"next": "[^"]*"' package.json | cut -d'"' -f4)
  if [[ "$NEXT_VERSION" == 14.* ]] || [[ "$NEXT_VERSION" == ^14.* ]] || [[ "$NEXT_VERSION" == ~14.* ]]; then
    log_success "Next.js version: $NEXT_VERSION (supported)"
  elif [[ "$NEXT_VERSION" == 15.* ]] || [[ "$NEXT_VERSION" == ^15.* ]] || [[ "$NEXT_VERSION" == ~15.* ]]; then
    log_success "Next.js version: $NEXT_VERSION (supported)"
  else
    log_error "Next.js version: $NEXT_VERSION (unsupported)"
  fi
else
  log_error "package.json not found"
fi
echo ""

# Check Directory Structure
echo "## Checking Directory Structure..."
REQUIRED_DIRS=(
  "app"
  "app/dashboard"
  "app/_shell"
  "components"
  "lib"
  "server/models/souq"
  "services/souq"
  "public"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    log_success "Directory exists: $dir"
  else
    log_error "Missing directory: $dir"
    if [[ "$FIX_MODE" == true ]]; then
      mkdir -p "$dir"
      log_fix "Created directory: $dir"
    fi
  fi
done
echo ""

# UPGRADE 2: CSS Variable Check (no @apply with vars)
echo "## Checking globals.css for @apply Issues..."
if [ -f "app/globals.css" ]; then
  if grep -q '@apply.*--' app/globals.css; then
    log_error "Found @apply with CSS variables (causes Tailwind compile error)"
    log_warning "Manual review required: @apply cannot be used with CSS variables"
    log_info "Please convert @apply directives with CSS variables to plain CSS"
  else
    log_success "globals.css: No @apply with CSS variables"
  fi
else
  log_error "app/globals.css not found"
fi
echo ""

# UPGRADE 3: Tailwind Config Check (dark mode plugin)
echo "## Checking tailwind.config.js..."
if [ -f "tailwind.config.js" ]; then
  if grep -q "darkMode.*'class'" tailwind.config.js; then
    log_success "tailwind.config.js: dark mode configured"
  else
    log_warning "tailwind.config.js: dark mode not configured"
    if [[ "$FIX_MODE" == true ]]; then
      log_info "Adding darkMode: 'class' to tailwind.config.js..."
      # Simple patch (assumes standard config structure)
      if grep -q "module.exports" tailwind.config.js; then
        sed -i.tmp "s/module.exports = {/module.exports = {\n  darkMode: 'class',/" tailwind.config.js
        rm tailwind.config.js.tmp
        log_fix "tailwind.config.js: Added darkMode: 'class'"
      fi
    fi
  fi
  
  # Check for RTL plugin
  if grep -q "require('tailwindcss-rtl')" tailwind.config.js || grep -q "tailwindcss-logical" tailwind.config.js; then
    log_success "tailwind.config.js: RTL plugin configured"
  else
    log_warning "tailwind.config.js: RTL plugin not found (install tailwindcss-logical)"
  fi
else
  log_error "tailwind.config.js not found"
fi
echo ""

# UPGRADE 4: tsconfig Check (paths alias)
echo "## Checking tsconfig.json..."
if [ -f "tsconfig.json" ]; then
  if grep -q '"@/\*"' tsconfig.json; then
    log_success "tsconfig.json: @/* path alias configured"
  else
    log_warning "tsconfig.json: @/* path alias missing"
    if [[ "$FIX_MODE" == true ]]; then
      log_info "Adding @/* alias to tsconfig.json..."
      # Patch compilerOptions.paths
      if ! grep -q '"paths"' tsconfig.json; then
        sed -i.tmp '/"compilerOptions": {/a\    "paths": {\n      "@/*": ["./*"]\n    },' tsconfig.json
        rm tsconfig.json.tmp
        log_fix "tsconfig.json: Added @/* alias"
      fi
    fi
  fi
  
  if grep -q '"strict": true' tsconfig.json; then
    log_success "tsconfig.json: strict mode enabled"
  else
    log_warning "tsconfig.json: strict mode disabled (recommended for production)"
  fi
else
  log_error "tsconfig.json not found"
fi
echo ""

# Check AppShell Location (should be in /dashboard/layout.tsx, not root)
echo "## Checking AppShell Location..."
if [ -f "app/layout.tsx" ]; then
  if grep -q "AppShell" app/layout.tsx; then
    log_error "AppShell found in root layout.tsx (causes layout leaks)"
    if [[ "$FIX_MODE" == true ]]; then
      log_info "Move AppShell to app/dashboard/layout.tsx manually"
      log_warning "Automatic fix skipped (requires manual code review)"
    fi
  else
    log_success "Root layout.tsx: Clean (no AppShell)"
  fi
fi

if [ -f "app/dashboard/layout.tsx" ]; then
  if grep -q "AppShell" app/dashboard/layout.tsx; then
    log_success "AppShell correctly placed in /dashboard/layout.tsx"
  else
    log_warning "AppShell not found in /dashboard/layout.tsx"
  fi
else
  log_warning "app/dashboard/layout.tsx not found"
fi
echo ""

# Check ErrorBoundary
echo "## Checking ErrorBoundary..."
if [ -f "components/ErrorBoundary.tsx" ]; then
  log_success "ErrorBoundary component exists"
  if grep -q "componentDidCatch" components/ErrorBoundary.tsx; then
    log_success "ErrorBoundary: Has componentDidCatch"
  else
    log_warning "ErrorBoundary: Missing componentDidCatch"
  fi
else
  log_error "components/ErrorBoundary.tsx not found"
fi
echo ""

# UPGRADE 5: React Component Tree Check (detect multiple <html> tags)
echo "## Checking for React Tree Issues..."
if command -v rg &> /dev/null; then
  HTML_COUNT=$(rg -c '<html' app/ -g '*.tsx' 2>/dev/null || echo "0")
  if [ "$HTML_COUNT" -gt 1 ]; then
    log_error "Multiple <html> tags found (causes hydration errors)"
    rg '<html' app/ -g '*.tsx' | head -5
    log_info "Only root layout.tsx should have <html>"
  else
    log_success "React tree: No duplicate <html> tags"
  fi
else
  log_info "ripgrep (rg) not installed - skipping React tree check"
fi
echo ""

# Check MongoDB Connection
echo "## Checking MongoDB Configuration..."
if [ -f "lib/db.ts" ] || [ -f "lib/mongodb-unified.ts" ]; then
  log_success "MongoDB connection file exists"
  
  if [ -f ".env.local" ]; then
    if grep -q "MONGODB_URI" .env.local; then
      log_success ".env.local: MONGODB_URI configured"
    else
      log_error ".env.local: MONGODB_URI missing"
    fi
  else
    log_warning ".env.local not found (required for MongoDB)"
  fi
else
  log_error "MongoDB connection file (lib/db.ts) not found"
fi
echo ""

# Check Souq Models
echo "## Checking Souq Models..."
SOUQ_MODELS=(
  "server/models/souq/Seller.ts"
  "server/models/souq/Product.ts"
  "server/models/souq/Listing.ts"
  "server/models/souq/Order.ts"
  "server/models/souq/Review.ts"
)

for model in "${SOUQ_MODELS[@]}"; do
  if [ -f "$model" ]; then
    log_success "Model exists: $model"
  else
    log_warning "Missing model: $model"
  fi
done
echo ""

# Check API Routes
echo "## Checking Souq API Routes..."
SOUQ_APIS=(
  "app/api/souq/sellers/route.ts"
  "app/api/souq/listings/route.ts"
  "app/api/souq/orders/route.ts"
  "app/api/souq/reviews/route.ts"
)

for api in "${SOUQ_APIS[@]}"; do
  if [ -f "$api" ]; then
    log_success "API exists: $api"
  else
    log_warning "Missing API: $api"
  fi
done
echo ""

# Check for Tailwind Safelist Warning
echo "## Checking Tailwind Safelist..."
if [ -f "tailwind.config.js" ]; then
  if grep -q "safelist" tailwind.config.js; then
    SAFELIST_COUNT=$(grep -c "safelist" tailwind.config.js)
    if [ "$SAFELIST_COUNT" -gt 50 ]; then
      log_warning "tailwind.config.js: Large safelist ($SAFELIST_COUNT items) - consider dynamic classes"
    else
      log_success "tailwind.config.js: Safelist reasonable ($SAFELIST_COUNT items)"
    fi
  fi
fi
echo ""

# Check TypeScript Compilation
echo "## Running TypeScript Check..."
if [ -f "tsconfig.json" ]; then
  if command -v npx &> /dev/null; then
    log_info "Running: npx tsc --noEmit"
    if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
      log_error "TypeScript compilation errors found"
      if [[ "$VERBOSE" == true ]]; then
        npx tsc --noEmit 2>&1 | grep "error TS" | head -10
      fi
    else
      log_success "TypeScript: No compilation errors"
    fi
  else
    log_warning "npx not available - skipping TypeScript check"
  fi
fi
echo ""

# Check ESLint
echo "## Running ESLint Check..."
if [ -f ".eslintrc.json" ] || [ -f "eslint.config.mjs" ]; then
  if command -v npx &> /dev/null; then
    log_info "Running: npx eslint . --ext .ts,.tsx --max-warnings 0"
    if npx eslint . --ext .ts,.tsx --max-warnings 0 2>&1 | grep -q "error"; then
      log_warning "ESLint errors/warnings found"
      if [[ "$VERBOSE" == true ]]; then
        npx eslint . --ext .ts,.tsx --max-warnings 0 2>&1 | head -10
      fi
    else
      log_success "ESLint: No errors"
    fi
  fi
fi
echo ""

# Summary
echo "======================================"
echo "           HEALTH CHECK SUMMARY"
echo "======================================"
echo -e "${RED}Errors:${NC}   $ERRORS"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
if [[ "$FIX_MODE" == true ]]; then
  echo -e "${GREEN}Fixes:${NC}    $FIXES_APPLIED"
fi
echo ""

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}✅ System is healthy!${NC}"
  exit 0
elif [ "$ERRORS" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  System has warnings but no critical errors${NC}"
  exit 0
else
  echo -e "${RED}❌ System has critical errors - please fix them${NC}"
  if [[ "$FIX_MODE" != true ]]; then
    echo ""
    echo "Run with --fix flag to auto-fix issues:"
    echo "  bash $0 --fix"
  fi
  exit 1
fi
