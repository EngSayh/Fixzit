#!/bin/bash
# =============================================================================
# Deployment Readiness Verification Script
# =============================================================================
# This script validates that all systems are ready for deployment by running:
# 1. TypeScript compilation check
# 2. HTTP route verification
# 3. Unit tests
# 4. Notification smoke tests (optional)
#
# Usage:
#   ./scripts/verify-deployment-readiness.sh
#   ./scripts/verify-deployment-readiness.sh --skip-tests
#   ./scripts/verify-deployment-readiness.sh --full  # includes notification tests
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Load env vars from .env.local if available (mimics Next.js/PNPM behavior)
if [ -f ".env.local" ]; then
  # shellcheck disable=SC1091
  set -a
  source ".env.local"
  set +a
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
SKIP_TESTS=false
FULL_VERIFICATION=false
FAILED_STEPS=()

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests)
      SKIP_TESTS=true
      ;;
    --full)
      FULL_VERIFICATION=true
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-tests    Skip unit tests"
      echo "  --full          Run full verification including notification smoke tests"
      echo "  --help, -h      Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
  shift
done

print_header() {
  echo ""
  echo -e "${BLUE}================================================================${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}================================================================${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
  FAILED_STEPS+=("$1")
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

check_env_vars() {
  print_header "Step 1: Environment Variables Check"
  
  local required_vars=(
    "MONGODB_URI"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "MEILI_MASTER_KEY"
    "SENDGRID_API_KEY"
    "SENDGRID_FROM_EMAIL"
    "SENDGRID_FROM_NAME"
    "SMS_DEV_MODE"
    "ZATCA_API_KEY"
    "ZATCA_API_SECRET"
    "ZATCA_ENVIRONMENT"
  )
  
  local missing_vars=()
  
  for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
      missing_vars+=("$var")
    fi
  done
  # Require either MEILI_HOST or MEILI_URL for marketplace/search routes
  if [ -z "$MEILI_HOST" ] && [ -z "$MEILI_URL" ]; then
    missing_vars+=("MEILI_HOST/MEILI_URL")
  fi

  if [ ${#missing_vars[@]} -eq 0 ]; then
    print_success "All required environment variables are set"
  else
    print_error "Missing required environment variables: ${missing_vars[*]}"
    print_info "Please check .env.local or set them in your environment"
    return 1
  fi
  
  # Check MongoDB URI format
  if [[ ! "$MONGODB_URI" =~ ^mongodb(\+srv)?:// ]]; then
    print_error "MONGODB_URI format is invalid"
    return 1
  fi
  
  # Check if using localhost in production
  if [[ "$MONGODB_URI" =~ (localhost|127\.0\.0\.1|0\.0\.0\.0) ]] && [[ "$NODE_ENV" == "production" ]]; then
    print_error "MONGODB_URI uses localhost but NODE_ENV is production"
    print_info "Production builds require a cloud MongoDB URI (Atlas, DocumentDB, etc.)"
    return 1
  fi
  
  print_success "MongoDB URI format is valid"
}

check_typescript() {
  print_header "Step 2: TypeScript Compilation Check"
  
  print_info "Running: pnpm tsc --noEmit"
  
  if pnpm tsc --noEmit 2>&1 | tee /tmp/tsc-check.log; then
    print_success "TypeScript compilation passed"
  else
    print_error "TypeScript compilation failed"
    print_info "See /tmp/tsc-check.log for details"
    echo ""
    echo "Common type errors to check:"
    grep -A 2 "error TS" /tmp/tsc-check.log | head -20 || true
    return 1
  fi
}

verify_routes_http() {
  print_header "Step 3: HTTP Route Verification"
  
  print_info "Running: pnpm verify:routes:http"
  print_info "This will build the production bundle and verify all routes are accessible"
  print_warning "This may take 2-5 minutes..."
  
  if pnpm verify:routes:http 2>&1 | tee /tmp/route-verify.log; then
    print_success "HTTP route verification passed"
    
    # Extract summary
    echo ""
    echo "Route Verification Summary:"
    grep -E "✓|✅|Route (app)|routes:" /tmp/route-verify.log | tail -20 || true
  else
    print_error "HTTP route verification failed"
    print_info "See /tmp/route-verify.log for details"
    echo ""
    echo "Last 30 lines of output:"
    tail -30 /tmp/route-verify.log
    return 1
  fi
}

verify_org_context() {
  print_header "Step 4: Organization Context Validation"

  print_info "Running: pnpm verify:org-context"

  if pnpm verify:org-context 2>&1 | tee /tmp/org-context.log; then
    print_success "Organization guard coverage, translations, and APIs look healthy"
  else
    print_error "Organization context verification failed"
    print_info "See /tmp/org-context.log for more details"
    return 1
  fi
}

run_tests() {
  if [ "$SKIP_TESTS" = true ]; then
    print_header "Step 5: Unit Tests (SKIPPED)"
    print_warning "Unit tests skipped via --skip-tests flag"
    return 0
  fi
  
  print_header "Step 5: Unit Tests"
  
  print_info "Running: pnpm test"
  
  if pnpm test 2>&1 | tee /tmp/test-output.log; then
    print_success "All unit tests passed"
  else
    print_error "Some unit tests failed"
    print_info "See /tmp/test-output.log for details"
    echo ""
    echo "Failed tests:"
    grep -E "FAIL|✕" /tmp/test-output.log | head -20 || true
    return 1
  fi
}

run_notification_smoke_tests() {
  if [ "$FULL_VERIFICATION" = false ]; then
    print_header "Step 6: Notification Smoke Tests (SKIPPED)"
    print_info "Notification tests skipped. Use --full flag to include them"
    return 0
  fi
  
  print_header "Step 6: Notification Smoke Tests"
  
  # Check if notification env vars are set
  if [ -z "$NOTIFICATIONS_SMOKE_EMAIL" ]; then
    print_warning "NOTIFICATIONS_SMOKE_EMAIL not set, skipping notification tests"
    print_info "Set the following in .env.local to enable:"
    print_info "  NOTIFICATIONS_SMOKE_USER_ID=<test-user-id>"
    print_info "  NOTIFICATIONS_SMOKE_NAME=<test-name>"
    print_info "  NOTIFICATIONS_SMOKE_EMAIL=<test-email>"
    return 0
  fi
  
  print_info "Running: pnpm tsx qa/notifications/run-smoke.ts --channel email"
  
  if pnpm tsx qa/notifications/run-smoke.ts --channel email 2>&1 | tee /tmp/notification-smoke.log; then
    print_success "Notification smoke tests passed"
  else
    exit_code=$?
    if [ $exit_code -eq 2 ]; then
      print_warning "Notification tests completed with partial failures"
    else
      print_error "Notification smoke tests failed"
      print_info "See /tmp/notification-smoke.log for details"
      return 1
    fi
  fi
}

verify_fm_workflows() {
  print_header "Step 7: FM Workflow Validation"
  
  print_info "Manual validation required for FM workflows:"
  echo ""
  echo "  1. Assets Creation (app/fm/assets)"
  echo "  2. Audit Planner (app/fm/compliance)"
  echo "  3. CRM Account/Lead (app/fm/crm)"
  echo "  4. Finance Payments (app/fm/finance/payments)"
  echo "  5. Finance Invoices (app/fm/finance/invoices)"
  echo "  6. Report Builder (app/fm/reports)"
  echo ""
  print_info "These workflows require UI interaction and should be tested manually"
  print_warning "Run 'pnpm dev' and test each workflow through the browser"
}

print_summary() {
  echo ""
  print_header "Verification Summary"
  
  if [ ${#FAILED_STEPS[@]} -eq 0 ]; then
    print_success "All automated verification steps passed! ✨"
    echo ""
    print_info "Next steps:"
    echo "  1. Manually test FM workflows (see Step 6 above)"
    echo "  2. Trigger CI workflow: .github/workflows/route-quality.yml"
    echo "  3. Verify deployment on staging environment"
    echo ""
    return 0
  else
    print_error "Verification failed! The following steps had errors:"
    echo ""
    for step in "${FAILED_STEPS[@]}"; do
      echo "  • $step"
    done
    echo ""
    print_info "Please fix the errors and run this script again"
    echo ""
    return 1
  fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                                                                ║${NC}"
  echo -e "${BLUE}║        Fixzit Deployment Readiness Verification Script        ║${NC}"
  echo -e "${BLUE}║                                                                ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  
  check_env_vars || true
  check_typescript || true
  verify_routes_http || true
  verify_org_context || true
  run_tests || true
  run_notification_smoke_tests || true
  verify_fm_workflows
  
  print_summary
  
  if [ ${#FAILED_STEPS[@]} -eq 0 ]; then
    exit 0
  else
    exit 1
  fi
}

main
