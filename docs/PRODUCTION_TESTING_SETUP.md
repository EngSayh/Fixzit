# Production-Ready Testing Setup Guide

## Overview

This guide explains how to set up Playwright E2E tests with **real MongoDB connection** for production-ready testing. This ensures your tests accurately reflect production behavior.

## Prerequisites

1. **MongoDB Running**
   - Local: `mongodb://localhost:27017/fixzit_test`
   - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/fixzit_test`

2. **Test Users Created**
   - Create 6 test users in your database (one for each role)
   - Use the admin panel or seed script to create them

3. **Environment Configuration**
   - `.env.test` with correct credentials and secrets
   - `NEXTAUTH_SECRET` must match your dev server

## Quick Start

### 1. Configure Test Environment

Copy `.env.test` and update with your real MongoDB connection:

```bash
# .env.test
ALLOW_OFFLINE_MONGODB=false   # accepts "true"/"1" to enable offline
MONGODB_URI=mongodb://localhost:27017/fixzit_test
BASE_URL=http://localhost:3000

# CRITICAL: Must match your dev server's secret
AUTH_SECRET=your-actual-secret-key-32-chars-minimum
NEXTAUTH_SECRET=your-actual-secret-key-32-chars-minimum

# Test user credentials (must exist in your database)
TEST_SUPERADMIN_IDENTIFIER=superadmin@test.fixzit.co
TEST_SUPERADMIN_PASSWORD=Test@1234
TEST_ADMIN_IDENTIFIER=admin@test.fixzit.co
TEST_ADMIN_PASSWORD=Test@1234
# ... (other roles)
```

### 2. Start MongoDB

**Local MongoDB:**

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**MongoDB Atlas:**

- Ensure your IP is whitelisted
- Connection string includes credentials

### 3. Create Test Users

**Option A: Admin Panel**

1. Start your app: `pnpm dev`
2. Login as superadmin
3. Navigate to User Management
4. Create 6 test users with correct roles

**Option B: Seed Script (if available)**

```bash
pnpm db:seed:test-users
```

**Option C: Manual MongoDB Insert**

```javascript
// Connect to MongoDB
use fixzit_test;

// Create test users (adjust fields as needed)
db.users.insertMany([
  {
    email: "superadmin@test.fixzit.co",
    phone: "+966500000001",
    role: "SUPER_ADMIN",
    password: "$2a$10$hashedpassword", // Hash Test@1234
    verified: true,
    // ... other required fields
  },
  // ... other roles
]);
```

### 4. Start Development Server

**Critical: Use the same NEXTAUTH_SECRET as .env.test**

```bash
# Load from .env.local (ensure it matches .env.test)
MONGODB_URI=mongodb://localhost:27017/fixzit_test pnpm dev

# Or specify inline
MONGODB_URI=mongodb://localhost:27017/fixzit_test \
NEXTAUTH_SECRET=your-actual-secret-key-32-chars-minimum \
pnpm dev
```

### 5. Regenerate Auth States

```bash
./scripts/regenerate-test-auth.sh
```

**Expected Output:**

```
🔐 Regenerating Playwright authentication states (Production-Ready)...

📋 Configuration:
   BASE_URL: http://localhost:3000
   MONGODB: mongodb://localhost:27017/f...
   OFFLINE: false

📡 Checking if app is running...
✅ App is running

🔄 Running authentication setup...

🗄️  PRODUCTION MODE - Authenticating with real MongoDB and OTP flow

🔑 SuperAdmin: Authenticating superadmin@test.fixzit.co...
  📤 Sending OTP request...
  ✅ OTP received: 123456
  🔐 Verifying OTP...
  ✅ OTP verified, token received
  🛡️  Getting CSRF token...
  ✅ CSRF token obtained
  🔓 Creating session...
  ✅ Session created
  🏠 Loading dashboard...
✅ SuperAdmin - Authentication complete

... (repeats for all 6 roles)

📋 Verifying state files...

✅ superadmin.json (1234 bytes)
✅ admin.json (1198 bytes)
✅ manager.json (1205 bytes)
✅ technician.json (1187 bytes)
✅ tenant.json (1176 bytes)
✅ vendor.json (1192 bytes)

✅ Authentication states regenerated successfully!

Run tests with:
  pnpm playwright test --project='Desktop:EN:Admin'
```

### 6. Run Tests

```bash
# All tests
pnpm playwright test

# Specific project
pnpm playwright test --project='Desktop:EN:Admin'

# Smoke tests
pnpm playwright test tests/specs/smoke.spec.ts

# With UI mode
pnpm playwright test --ui
```

## Troubleshooting

### Error: "no matching decryption secret"

**Cause:** NEXTAUTH_SECRET mismatch between `.env.test` and dev server

**Fix:**

1. Check `NEXTAUTH_SECRET` in both files
2. Ensure they match exactly (case-sensitive)
3. Restart dev server after changing
4. Regenerate auth states: `./scripts/regenerate-test-auth.sh`

### Error: "Failed to send OTP"

**Cause:** Test user doesn't exist in database or wrong credentials

**Fix:**

1. Verify user exists: `db.users.findOne({email: "admin@test.fixzit.co"})`
2. Check credentials in `.env.test` match database
3. Ensure password is correct (try logging in via UI)

### Error: "App not running"

**Cause:** Development server not started

**Fix:**

```bash
MONGODB_URI=mongodb://localhost:27017/fixzit_test pnpm dev
```

### Error: "MongoDB connection timeout"

**Cause:** MongoDB not running or connection string incorrect

**Fix:**

1. Start MongoDB: `brew services start mongodb-community`
2. Check connection: `mongosh mongodb://localhost:27017`
3. Verify MONGODB_URI in `.env.test`

### Tests Pass But Show 401 Errors in Logs

**Cause:** Auth tokens expired or regenerated with wrong secret

**Fix:**

1. Check server logs for exact error
2. Compare NEXTAUTH_SECRET between `.env.test` and dev server
3. Regenerate states: `./scripts/regenerate-test-auth.sh`

### State Files Too Small (<100 bytes)

**Cause:** Authentication failed during setup

**Fix:**

1. Check `tests/setup-auth.ts` output for specific errors
2. Enable detailed logging: `NODE_ENV=development`
3. Verify OTP dev mode is enabled
4. Check app logs during auth setup

## Offline Mode (CI/CD)

For CI/CD environments without database access:

```bash
# .env.test
ALLOW_OFFLINE_MONGODB=true    # accepts "true"/"1" to enable offline
```

**Warning:** Offline mode creates mock JWT sessions that:

- Bypass real authentication
- Grant all permissions
- Should NOT be used for production validation

Use offline mode only for:

- UI smoke tests in CI pipelines
- Visual regression testing
- Component rendering tests

## Production Parity Checklist

✅ Real MongoDB connection configured  
✅ Test users exist in database with correct roles  
✅ NEXTAUTH_SECRET matches dev server  
✅ Auth states regenerated within last 30 days  
✅ Tests pass without 401 errors  
✅ OTP flow works for all 6 roles  
✅ Session cookies properly set

## Advanced Configuration

### Custom MongoDB Database

```bash
# .env.test
MONGODB_URI=mongodb://localhost:27017/my_custom_test_db
```

### MongoDB Atlas with Authentication

```bash
# .env.test
MONGODB_URI=mongodb+srv://testuser:testpass@cluster.mongodb.net/fixzit_test?retryWrites=true&w=majority
```

### Custom Test Timeout

```typescript
// tests/playwright.config.ts
timeout: 180_000, // 3 minutes per test
```

### Parallel Execution

```bash
# Run tests in parallel (use with caution on shared test DB)
pnpm playwright test --workers=4
```

## Best Practices

1. **Isolate Test Data**
   - Use dedicated test database (`fixzit_test`)
   - Don't use production database for tests
   - Reset test data between test suites if needed

2. **Keep Auth States Fresh**
   - Regenerate every 30 days (JWT expiry)
   - Regenerate after NEXTAUTH_SECRET changes
   - Regenerate after test user password changes

3. **Monitor Test Stability**
   - Track flaky tests in CI
   - Use retry mechanism (configured in playwright.config.ts)
   - Review traces for failed tests

4. **Secure Secrets**
   - Never commit `.env.test` with real credentials
   - Use GitHub Secrets in CI
   - Rotate test passwords regularly

## Support

For issues or questions:

- Check app logs: `pnpm dev` output
- Review Playwright traces: `pnpm exec playwright show-trace path/to/trace.zip`
- Consult main README: `tests/README.md`
