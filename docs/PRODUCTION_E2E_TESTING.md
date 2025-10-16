# Production E2E Testing Guide

## Overview

This suite tests your **live production system** with comprehensive security and proper secrets management.

**🔒 IMPORTANT:** This script now **requires** all environment variables to be set. No default values are used for security.

**📚 For complete secrets management guide, see:** [`PRODUCTION_E2E_SECRETS_MANAGEMENT.md`](PRODUCTION_E2E_SECRETS_MANAGEMENT.md)

## Prerequisites

### Required Environment Variables (ALL REQUIRED):
```bash
PRODUCTION_URL      # Production URL
ADMIN_EMAIL         # Admin user email
ADMIN_PASSWORD      # Admin user password
PM_EMAIL            # Property Manager email
PM_PASSWORD         # Property Manager password
TENANT_EMAIL        # Tenant user email
TENANT_PASSWORD     # Tenant user password
VENDOR_EMAIL        # Vendor user email
VENDOR_PASSWORD     # Vendor user password
HR_EMAIL            # HR Manager email
HR_PASSWORD         # HR Manager password
```

**Note:** The script will exit with an error if any variable is missing.

## Setup

### 1. Configure Secrets (Choose One Method)

**Option A: GitHub Secrets** (Recommended for CI/CD)
```bash
# Add to: Settings → Secrets and variables → Actions
# Add all 11 required variables
```

**Option B: Environment File** (Local testing only)
```bash
# Create .env.production.test (gitignored!)
cat > .env.production.test << 'EOF'
PRODUCTION_URL=https://your-url.com
ADMIN_EMAIL=test-admin@company.com
ADMIN_PASSWORD=your-secure-password
PM_EMAIL=test-pm@company.com
PM_PASSWORD=your-secure-password
TENANT_EMAIL=test-tenant@company.com
TENANT_PASSWORD=your-secure-password
VENDOR_EMAIL=test-vendor@company.com
VENDOR_PASSWORD=your-secure-password
HR_EMAIL=test-hr@company.com
HR_PASSWORD=your-secure-password
EOF
```

**Option C: HashiCorp Vault / AWS Secrets Manager**
See [`PRODUCTION_E2E_SECRETS_MANAGEMENT.md`](PRODUCTION_E2E_SECRETS_MANAGEMENT.md) for full guide

### 2. Run the Tests

```bash
# Option 1: Run with environment file
source .env.production.test
node scripts/testing/e2e-production-test.js

# Option 2: Run with inline environment variables
PRODUCTION_URL=https://fixzit-souq.com \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=yourpassword \
PM_EMAIL=pm@example.com \
PM_PASSWORD=pmpassword \
TENANT_EMAIL=tenant@example.com \
TENANT_PASSWORD=tenantpassword \
VENDOR_EMAIL=vendor@example.com \
VENDOR_PASSWORD=vendorpassword \
HR_EMAIL=hr@example.com \
HR_PASSWORD=hrpassword \
node scripts/testing/e2e-production-test.js
```

## What Gets Tested

### 1. Public Pages (No Authentication)
- ✅ Landing Page (/)
- ✅ Login Page (/login)
- ✅ Marketplace (/marketplace)
- ✅ Help Center (/help)
- ✅ Careers (/careers)

### 2. Login Functionality
- ✅ Admin login
- ✅ Property Manager login
- ✅ Tenant login
- ✅ Vendor login
- ✅ HR Manager login

### 3. Protected Pages (Auth Required)
- ✅ Dashboard (/dashboard)
- ✅ Properties (/properties)
- ✅ Work Orders (/work-orders)
- ✅ Tenants (/tenants)
- ✅ Vendors (/vendors)
- ✅ RFQs (/rfqs)
- ✅ Finance (/finance)
- ✅ HR Employees (/hr/employees)
- ✅ HR Attendance (/hr/attendance)
- ✅ Settings (/settings)

### 4. API Health Checks
- ✅ API Health (/api/health)
- ✅ Database Health (/api/health/database)

## Test Results

Results are saved in two formats:

1. **JSON**: `e2e-test-results/production-e2e-{timestamp}.json`
2. **Markdown Report**: `e2e-test-results/PRODUCTION_E2E_REPORT_{date}.md`

## Understanding Results

### Status Codes

| Code | Meaning | Expected For |
|------|---------|--------------|
| 200 | Success | Public pages, successful API calls |
| 401 | Unauthorized | Protected pages without auth (expected) |
| 403 | Forbidden | Protected pages with insufficient permissions (expected) |
| 404 | Not Found | Page doesn't exist (investigate) |
| 500 | Server Error | Server problem (investigate immediately) |

### Test Statuses

- ✅ **Passed**: Test completed successfully
- ❌ **Failed**: Test failed (needs investigation)
- ⚠️ **Skipped**: Test skipped (usually due to missing credentials)

## Example Output

```
═══════════════════════════════════════════════════════════
🚀 PRODUCTION E2E TEST SUITE
═══════════════════════════════════════════════════════════
📍 Base URL: https://fixzit-souq.com
⏰ Started: 2025-10-16T10:30:00.000Z
═══════════════════════════════════════════════════════════

📋 TEST SECTION 1: PUBLIC PAGES (No Authentication)

🧪 Testing: Landing Page (anonymous)
   URL: https://fixzit-souq.com/
   ✅ PASSED: 200 in 245ms

🧪 Testing: Login Page (anonymous)
   URL: https://fixzit-souq.com/login
   ✅ PASSED: 200 in 189ms

...

═══════════════════════════════════════════════════════════
📊 TEST RESULTS SUMMARY
═══════════════════════════════════════════════════════════
Total Tests:   25
✅ Passed:     23 (92.0%)
❌ Failed:     2 (8.0%)
⚠️  Skipped:   0
⏱️  Duration:  12.45s
═══════════════════════════════════════════════════════════
```

## Security Notes

⚠️ **IMPORTANT SECURITY CONSIDERATIONS:**

1. **Never commit credentials**: The `.env.production.test` file is gitignored
2. **Use test accounts**: Create dedicated test accounts in production
3. **Limited permissions**: Test accounts should have minimal necessary permissions
4. **Monitor logs**: Check production logs after running tests
5. **Rate limiting**: Be aware of rate limits on production
6. **Off-peak testing**: Run tests during low-traffic periods
7. **Read-only when possible**: Tests should not modify production data

## Troubleshooting

### Tests timing out

```bash
# Increase timeout in the script
# Edit scripts/testing/e2e-production-test.js
# Change: timeout: 30000 → timeout: 60000
```

### SSL/Certificate errors

```bash
# For testing only (not recommended for production)
NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/testing/e2e-production-test.js
```

### Connection refused

- Check if production URL is correct
- Check if site is accessible from your network
- Check if there's a firewall blocking requests

### Authentication failures

- Verify credentials in `.env.production.test`
- Check if accounts are active in production
- Verify email/password combination manually

## Advanced Usage

### Test Specific User Only

```bash
# Test only admin user
PRODUCTION_URL=https://fixzit-souq.com \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=pass123 \
node scripts/testing/e2e-production-test.js
```

### Test Specific Pages

Edit the `CONFIG.pages` array in the script to include only pages you want to test.

### Custom Reporting

Modify the `generateMarkdownReport()` function to customize report format.

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/production-e2e.yml
name: Production E2E Tests
on:
  schedule:
    - cron: '0 2 * * *'  # Run daily at 2 AM
  workflow_dispatch:  # Allow manual trigger

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: |
          PRODUCTION_URL=${{ secrets.PRODUCTION_URL }} \
          ADMIN_EMAIL=${{ secrets.ADMIN_EMAIL }} \
          ADMIN_PASSWORD=${{ secrets.ADMIN_PASSWORD }} \
          node scripts/testing/e2e-production-test.js
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: e2e-results
          path: e2e-test-results/
```

## Support

For issues or questions:
- Check the test report in `e2e-test-results/`
- Review production logs
- Check GitHub Issues
- Contact: support@fixzit-souq.com
