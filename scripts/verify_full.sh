#!/usr/bin/env bash
set -e

echo "🔍 Fixzit Full Verification Pipeline"
echo "====================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "\n${BLUE}== $1 ==${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "app.py" ]; then
    print_error "app.py not found. Please run this script from the project root directory."
    exit 1
fi

print_step "CODE QUALITY"
echo "Running code quality checks..."

# Format check
if command -v black &> /dev/null; then
    echo "📝 Checking code formatting with black..."
    if black --check . --quiet; then
        print_success "Code formatting check passed"
    else
        print_warning "Code formatting issues found. Run 'black .' to fix them."
    fi
else
    print_warning "black not installed, skipping format check"
fi

# Import sorting
if command -v isort &> /dev/null; then
    echo "📦 Checking import sorting..."
    if isort --check-only . --quiet; then
        print_success "Import sorting check passed"
    else
        print_warning "Import sorting issues found. Run 'isort .' to fix them."
    fi
else
    print_warning "isort not installed, skipping import check"
fi

# Linting
if command -v flake8 &> /dev/null; then
    echo "🔍 Running linting with flake8..."
    if flake8 . --quiet; then
        print_success "Linting check passed"
    else
        print_warning "Linting issues found. Check flake8 output above."
    fi
else
    print_warning "flake8 not installed, skipping lint check"
fi

# Type checking
if command -v mypy &> /dev/null; then
    echo "🏷️  Running type checking with mypy..."
    if mypy --ignore-missing-imports . --quiet; then
        print_success "Type checking passed"
    else
        print_warning "Type checking issues found. Check mypy output above."
    fi
else
    print_warning "mypy not installed, skipping type check"
fi

print_step "TESTS"
echo "Running test suite..."

if command -v pytest &> /dev/null; then
    echo "🧪 Running pytest with timeout..."
    if pytest -q --timeout=60; then
        print_success "All tests passed"
    else
        print_error "Some tests failed"
        exit 1
    fi
else
    print_warning "pytest not installed, skipping tests"
fi

print_step "PERFORMANCE BUDGETS"
echo "Checking performance budgets..."

if [ -f "scripts/perf_budgets.py" ]; then
    echo "📊 Running performance budget tests..."
    if python scripts/perf_budgets.py; then
        print_success "Performance budgets passed"
    else
        print_error "Performance budget violations detected"
        # Don't exit on performance failures in full pipeline
        print_warning "Continuing despite performance issues..."
    fi
else
    print_warning "Performance budget script not found"
fi

print_step "PERFORMANCE TRENDS"
echo "Collecting performance trend data..."

if [ -f "routes.txt" ]; then
    echo "📈 Collecting performance trends for configured routes..."
    if python scripts/perf_collect_routes.py; then
        print_success "Performance trend collection completed"
    else
        print_warning "Performance trend collection failed (non-blocking)"
    fi
else
    print_warning "No routes.txt file found, skipping trend collection"
fi

print_step "UPTIME MONITORING"
echo "Running uptime health checks..."

if [ -f "scripts/uptime_ping.py" ]; then
    echo "📡 Pinging monitored endpoints..."
    if python scripts/uptime_ping.py; then
        print_success "All endpoints are healthy"
    else
        print_warning "Some endpoints are experiencing issues (non-blocking)"
    fi
else
    print_warning "Uptime ping script not found"
fi

print_step "WEEKLY REPORTS (ALL tenants + ZIP)"
echo "Generating weekly HTML reports for all tenants..."

if [ -f "scripts/weekly_report.py" ]; then
    echo "📄 Generating comprehensive weekly reports for all tenants..."
    if python scripts/weekly_report.py --all --zip; then
        print_success "Weekly reports generated successfully"
        if [ -d "artifacts" ]; then
            echo "📁 Reports saved to artifacts/ directory:"
            ls -la artifacts/weekly-report-*.html 2>/dev/null || echo "   No HTML reports found"
            ls -la artifacts/weekly-reports-*.zip 2>/dev/null || echo "   No ZIP bundles found"
        fi
    else
        print_warning "Weekly report generation failed (non-blocking)"
    fi
else
    print_warning "Weekly report script not found"
fi

print_step "NOTIFICATION VERIFICATION"
echo "Testing notification configurations..."

# Test email configuration (dry run)
if [ -f "scripts/email_weekly_bundle.py" ]; then
    echo "📧 Testing email configuration (dry run)..."
    if python scripts/email_weekly_bundle.py --all --dry-run --no-zip; then
        print_success "Email configuration test passed"
    else
        print_warning "Email configuration test failed (non-blocking)"
    fi
else
    print_warning "Email bundle script not found"
fi

# Test Slack configuration
if [ -f "scripts/slack_digest.py" ]; then
    echo "💬 Testing Slack configuration..."
    python -c "
from scripts.lib.notify import NotifyConfig
from app.tenant import list_tenants
for t in list_tenants():
    cfg = NotifyConfig(t)
    if not cfg.slack_webhook:
        print(f'[{t}] no webhook (ok)')
    else:
        print(f'[{t}] webhook present')
print('Notification config checked')
" 2>/dev/null || print_warning "Slack configuration test failed"
else
    print_warning "Slack digest script not found"
fi

print_step "VERIFICATION SUMMARY"
echo "Pipeline execution completed!"

# Check if artifacts directory exists and show contents
if [ -d "artifacts" ]; then
    echo ""
    echo "📂 Generated artifacts:"
    ls -la artifacts/ | grep -E '\.(json|html|zip)$' | while read line; do
        echo "   📄 $line"
    done
fi

# Final success message
echo ""
print_success "Full verification pipeline completed!"
echo ""
echo "🎯 Next steps:"
echo "   • Review any warnings above"
echo "   • Check artifacts/ directory for reports"
echo "   • Open weekly report in browser if generated"
echo "   • Review performance trends in Health Dashboard"
echo ""

exit 0