# Manual Security Testing Instructions

**Date:** November 19, 2025  
**Status:** ⏸️ READY FOR EXECUTION  
**Estimated Time:** 45-60 minutes

---

## Overview

This document provides step-by-step instructions for manually validating the security implementations in the Fixzit platform. These tests verify rate limiting, CORS protection, MongoDB security, and other security controls.

---

## Prerequisites

### 1. Environment Setup

**Required:**
- Dev server running on `http://localhost:3000`
- Admin authentication token
- Test user account credentials
- MongoDB Atlas URI configured in `.env.local`

**Optional but Recommended:**
- Staging environment URL for production-like testing
- PostMan or Insomnia for API testing
- Browser developer tools for CORS testing

### 2. Start Dev Server

```bash
cd /Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit
pnpm dev
```

Wait for output: `Ready on http://localhost:3000`

---

## Test Suite 1: Rate Limiting Validation

**Purpose:** Verify API endpoints reject excessive requests with 429 status

### Test 1.1: OTP Send Rate Limit (10 req/min)

**Endpoint:** `POST /api/auth/otp/send`

**Steps:**
1. Open terminal
2. Run test script:
   ```bash
   ./scripts/security/test-rate-limiting.sh http://localhost:3000
   ```

**Expected Results:**
- First 10 requests: `200 OK`
- Request 11+: `429 Too Many Requests`
- Response includes `Retry-After` header
- After 1 minute: Rate limit resets

**Manual Testing (if script fails):**
```bash
# Send 15 requests rapidly
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/auth/otp/send \
    -H "Content-Type: application/json" \
    -d '{"phone": "+966501234567"}' \
    -w "\nStatus: %{http_code}\n" \
    -s
done
```

**Pass Criteria:**
- ✅ Requests 1-10 succeed
- ✅ Requests 11+ return 429
- ✅ Rate limit message clear: "Too many requests, please try again later"

---

### Test 1.2: OTP Verify Rate Limit (10 req/min)

**Endpoint:** `POST /api/auth/otp/verify`

**Steps:**
```bash
# Send 15 verification attempts
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/auth/otp/verify \
    -H "Content-Type: application/json" \
    -d '{"phone": "+966501234567", "code": "123456"}' \
    -w "\nStatus: %{http_code}\n" \
    -s
done
```

**Pass Criteria:**
- ✅ First 10 attempts processed (may fail auth, but not rate-limited)
- ✅ Attempts 11+ blocked with 429

---

### Test 1.3: Souq Claims API Rate Limit (20 req/min)

**Endpoint:** `POST /api/souq/claims`

**Prerequisites:** Need admin/seller authentication token

**Steps:**
```bash
# Get auth token first
TOKEN="<your-admin-token>"

# Send 25 requests
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/souq/claims \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"orderId": "test-order-'$i'", "reason": "Test claim"}' \
    -w "\nStatus: %{http_code}\n" \
    -s
done
```

**Pass Criteria:**
- ✅ First 20 requests processed
- ✅ Requests 21+ return 429

---

### Test 1.4: Evidence Upload Rate Limit (30 req/2min)

**Endpoint:** `POST /api/souq/claims/:claimId/evidence`

**Steps:**
```bash
TOKEN="<your-admin-token>"
CLAIM_ID="<existing-claim-id>"

# Send 35 upload attempts in 2 minutes
for i in {1..35}; do
  curl -X POST "http://localhost:3000/api/souq/claims/$CLAIM_ID/evidence" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: multipart/form-data" \
    -F "file=@test-image.jpg" \
    -w "\nStatus: %{http_code}\n" \
    -s
done
```

**Pass Criteria:**
- ✅ First 30 uploads succeed or properly fail (auth/validation)
- ✅ Uploads 31+ return 429
- ✅ Rate limit window: 2 minutes (120 seconds)

---

### Test 1.5: Claim Response Rate Limit (30 req/2min)

**Endpoint:** `POST /api/souq/claims/:claimId/respond`

**Steps:**
```bash
TOKEN="<your-admin-token>"
CLAIM_ID="<existing-claim-id>"

for i in {1..35}; do
  curl -X POST "http://localhost:3000/api/souq/claims/$CLAIM_ID/respond" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"response": "Test response '$i'", "action": "investigating"}' \
    -w "\nStatus: %{http_code}\n" \
    -s
done
```

**Pass Criteria:**
- ✅ First 30 responses processed
- ✅ Responses 31+ return 429

---

## Test Suite 2: CORS Protection Validation

**Purpose:** Verify only whitelisted origins can make cross-origin requests

### Test 2.1: Allowed Origin - fixzit.sa

**Steps:**
```bash
# Test from allowed origin
curl -X GET http://localhost:3000/api/health \
  -H "Origin: https://fixzit.sa" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep -E "(< Access-Control|< HTTP)"
```

**Pass Criteria:**
- ✅ Response includes: `Access-Control-Allow-Origin: https://fixzit.sa`
- ✅ Response includes: `Access-Control-Allow-Credentials: true`
- ✅ No CORS error in response

---

### Test 2.2: Allowed Origin - www.fixzit.sa

**Steps:**
```bash
curl -X GET http://localhost:3000/api/health \
  -H "Origin: https://www.fixzit.sa" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep -E "(< Access-Control|< HTTP)"
```

**Pass Criteria:**
- ✅ `Access-Control-Allow-Origin: https://www.fixzit.sa`
- ✅ Status: 200 OK

---

### Test 2.3: Blocked Origin - evil.com

**Steps:**
```bash
curl -X GET http://localhost:3000/api/health \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep -E "(< Access-Control|< HTTP)"
```

**Pass Criteria:**
- ❌ NO `Access-Control-Allow-Origin` header with evil.com
- ✅ Request may succeed but CORS headers not present for evil.com
- ✅ Browser would block response (server-side allows, client-side blocks)

---

### Test 2.4: Blocked Origin - fixzit.co (typo-squat)

**Steps:**
```bash
curl -X GET http://localhost:3000/api/health \
  -H "Origin: https://fixzit.co" \
  -v 2>&1 | grep "Access-Control"
```

**Pass Criteria:**
- ❌ No CORS headers for .co domain
- ✅ Only .sa domain allowed

---

### Test 2.5: Preflight Request Handling

**Steps:**
```bash
# OPTIONS request for preflight
curl -X OPTIONS http://localhost:3000/api/auth/login \
  -H "Origin: https://fixzit.sa" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  -v 2>&1 | grep -E "(< Access-Control|< HTTP)"
```

**Pass Criteria:**
- ✅ Status: 200 OK
- ✅ `Access-Control-Allow-Methods` includes POST
- ✅ `Access-Control-Allow-Headers` includes Content-Type, Authorization
- ✅ `Access-Control-Max-Age` present (cache preflight)

---

## Test Suite 3: MongoDB Security Validation

**Purpose:** Verify production mode rejects localhost MongoDB connections

### Test 3.1: Localhost Rejection in Production

**Prerequisites:** Set `NODE_ENV=production` temporarily

**Steps:**
```bash
# Backup current .env.local
cp .env.local .env.local.backup

# Test with localhost URI in production
cat >> .env.local << EOF
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/fixzit
EOF

# Try to start server
pnpm build 2>&1 | grep -i "mongodb\|database\|connection"
```

**Pass Criteria:**
- ❌ Build FAILS with clear error message
- ✅ Error contains: "MongoDB URI must use Atlas (mongodb+srv://) in production"
- ✅ Build does not proceed

**Cleanup:**
```bash
mv .env.local.backup .env.local
```

---

### Test 3.2: Atlas URI Acceptance in Production

**Steps:**
```bash
# Test with Atlas URI
cat > .env.test << EOF
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/fixzit?retryWrites=true&w=majority
EOF

# Test connection logic (dry-run)
NODE_ENV=production MONGODB_URI=mongodb+srv://test@cluster.mongodb.net/test node -e "
const uri = process.env.MONGODB_URI;
const isAtlas = uri.startsWith('mongodb+srv://');
console.log('Atlas URI:', isAtlas ? '✅ Valid' : '❌ Invalid');
process.exit(isAtlas ? 0 : 1);
"
```

**Pass Criteria:**
- ✅ Output: "Atlas URI: ✅ Valid"
- ✅ No error thrown

---

### Test 3.3: Dev Mode Localhost Allowance

**Steps:**
```bash
# Test localhost allowed in development
NODE_ENV=development MONGODB_URI=mongodb://localhost:27017/fixzit node -e "
const uri = process.env.MONGODB_URI;
const isDev = process.env.NODE_ENV !== 'production';
const isLocalhost = uri.includes('localhost') || uri.includes('127.0.0.1');
console.log('Dev mode allows localhost:', isDev && isLocalhost ? '✅ Valid' : '❌ Invalid');
"
```

**Pass Criteria:**
- ✅ Output: "Dev mode allows localhost: ✅ Valid"

---

### Test 3.4: Environment Variable Enforcement

**Steps:**
```bash
# Test missing MONGODB_URI
unset MONGODB_URI
NODE_ENV=production node -e "
try {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found');
  console.log('✅ Pass (should not reach here)');
} catch (err) {
  console.log('✅ Correctly rejected:', err.message);
}
"
```

**Pass Criteria:**
- ✅ Error thrown for missing MONGODB_URI
- ✅ Error message clear and actionable

---

## Test Suite 4: JWT Secret Enforcement

**Purpose:** Verify JWT operations fail without required secrets

### Test 4.1: Missing JWT_SECRET

**Steps:**
```bash
# Test JWT signing without secret
unset JWT_SECRET
node -e "
try {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET required');
  console.log('❌ Should have failed');
} catch (err) {
  console.log('✅ Correctly enforced:', err.message);
}
"
```

**Pass Criteria:**
- ✅ Throws error about missing JWT_SECRET
- ✅ No silent failures or default secrets

---

### Test 4.2: JWT Token Validation

**Steps:**
```bash
# Generate test token (requires valid secret)
TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod';
const token = jwt.sign({ userId: 'test-123' }, secret, { expiresIn: '1h' });
console.log(token);
")

# Test API endpoint with token
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nStatus: %{http_code}\n"
```

**Pass Criteria:**
- ✅ Valid token: 200 OK (or 401 if not actually valid user)
- ✅ Invalid token: 401 Unauthorized
- ✅ Missing token: 401 Unauthorized

---

## Test Suite 5: Error Boundary & Monitoring

**Purpose:** Verify security events are logged and monitored

### Test 5.1: Rate Limit Event Logging

**Steps:**
1. Trigger rate limit (any endpoint from Test Suite 1)
2. Check application logs:
   ```bash
   tail -f /tmp/fixzit-dev-server.log | grep -i "rate.limit\|429"
   ```

**Pass Criteria:**
- ✅ Log entry created with timestamp
- ✅ Log includes: endpoint, IP, user agent
- ✅ Log level: WARN or ERROR

---

### Test 5.2: CORS Violation Logging

**Steps:**
1. Send request with blocked origin
2. Check logs:
   ```bash
   tail -f /tmp/fixzit-dev-server.log | grep -i "cors\|origin"
   ```

**Pass Criteria:**
- ✅ CORS violation logged
- ✅ Includes: blocked origin, attempted endpoint
- ✅ Log level: WARN

---

### Test 5.3: Failed Auth Attempt Logging

**Steps:**
```bash
# Send invalid login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+966501234567", "password": "wrong-password"}' \
  -w "\nStatus: %{http_code}\n"

# Check logs
tail -20 /tmp/fixzit-dev-server.log | grep -i "auth\|login"
```

**Pass Criteria:**
- ✅ Failed auth attempt logged
- ✅ Includes: phone number (masked), timestamp, IP
- ✅ Does NOT include password in logs

---

## Test Reporting

### Automated Script Execution

**For comprehensive testing:**
```bash
# Run all security tests at once
./scripts/security/run-all-security-tests.sh http://localhost:3000

# View results
cat ./qa/security/COMPREHENSIVE_SECURITY_REPORT.md
```

---

### Manual Test Results Template

**Copy this template to `qa/security/MANUAL_TEST_RESULTS.md`:**

```markdown
# Manual Security Test Results

**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Environment:** Local Dev / Staging / Production
**Base URL:** http://localhost:3000

---

## Test Suite 1: Rate Limiting

| Test | Endpoint | Expected | Actual | Status |
|------|----------|----------|--------|--------|
| 1.1 OTP Send | POST /api/auth/otp/send | 10 req/min | ___ req/min | ⏸️/✅/❌ |
| 1.2 OTP Verify | POST /api/auth/otp/verify | 10 req/min | ___ req/min | ⏸️/✅/❌ |
| 1.3 Claims API | POST /api/souq/claims | 20 req/min | ___ req/min | ⏸️/✅/❌ |
| 1.4 Evidence Upload | POST /api/souq/claims/:id/evidence | 30 req/2min | ___ | ⏸️/✅/❌ |
| 1.5 Claim Response | POST /api/souq/claims/:id/respond | 30 req/2min | ___ | ⏸️/✅/❌ |

**Notes:** ___

---

## Test Suite 2: CORS Protection

| Test | Origin | Expected | Actual | Status |
|------|--------|----------|--------|--------|
| 2.1 fixzit.sa | https://fixzit.sa | Allowed | ___ | ⏸️/✅/❌ |
| 2.2 www.fixzit.sa | https://www.fixzit.sa | Allowed | ___ | ⏸️/✅/❌ |
| 2.3 evil.com | https://evil.com | Blocked | ___ | ⏸️/✅/❌ |
| 2.4 fixzit.co | https://fixzit.co | Blocked | ___ | ⏸️/✅/❌ |
| 2.5 Preflight | OPTIONS request | 200 OK | ___ | ⏸️/✅/❌ |

**Notes:** ___

---

## Test Suite 3: MongoDB Security

| Test | Scenario | Expected | Actual | Status |
|------|----------|----------|--------|--------|
| 3.1 Localhost in Prod | NODE_ENV=production + localhost | Build fails | ___ | ⏸️/✅/❌ |
| 3.2 Atlas in Prod | NODE_ENV=production + mongodb+srv:// | Build succeeds | ___ | ⏸️/✅/❌ |
| 3.3 Localhost in Dev | NODE_ENV=development + localhost | Allowed | ___ | ⏸️/✅/❌ |
| 3.4 Missing URI | No MONGODB_URI | Error thrown | ___ | ⏸️/✅/❌ |

**Notes:** ___

---

## Test Suite 4: JWT Security

| Test | Scenario | Expected | Actual | Status |
|------|----------|----------|--------|--------|
| 4.1 Missing Secret | No JWT_SECRET | Error | ___ | ⏸️/✅/❌ |
| 4.2 Valid Token | Proper JWT token | 200 OK | ___ | ⏸️/✅/❌ |

**Notes:** ___

---

## Test Suite 5: Monitoring

| Test | Event | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 5.1 Rate Limit | 429 response | Logged | ___ | ⏸️/✅/❌ |
| 5.2 CORS Violation | Blocked origin | Logged | ___ | ⏸️/✅/❌ |
| 5.3 Failed Auth | Wrong password | Logged (no PII) | ___ | ⏸️/✅/❌ |

**Notes:** ___

---

## Summary

**Total Tests:** 18  
**Passed:** ___  
**Failed:** ___  
**Blocked/Skipped:** ___

**Overall Security Score:** ___% (Passed / Total * 100)

**Recommendation:**
- [ ] APPROVED for production
- [ ] REQUIRES FIXES (list below)
- [ ] BLOCKED (needs re-test)

**Issues Found:** ___

**Sign-Off:**
- Tested by: ___
- Date: ___
- Next review: ___
```

---

## Troubleshooting

### Server Won't Start
```bash
# Check for port conflicts
lsof -i :3000
kill -9 <PID>

# Check environment variables
cat .env.local | grep -E "(MONGODB|JWT|NEXTAUTH)"

# Clear cache
rm -rf .next
pnpm dev
```

### Rate Limits Not Working
- Verify middleware is imported in affected routes
- Check `lib/security/enhanced-rate-limit.ts` for correct limits
- Ensure Redis or in-memory store is configured

### CORS Not Blocking
- Check `lib/security/cors-allowlist.ts` for origins
- Verify middleware order (CORS must be early)
- Test with browser (curl bypasses CORS on server-side)

---

## Next Steps After Testing

1. **Document Results:** Fill out manual test results template
2. **Fix Issues:** Address any failed tests
3. **Re-test:** Run tests again after fixes
4. **Update Reports:** Update `DEPLOYMENT_READINESS_REPORT.md`
5. **Sign-Off:** Create production readiness approval

---

## References

- Rate Limiting Implementation: `lib/security/enhanced-rate-limit.ts`
- CORS Configuration: `lib/security/cors-allowlist.ts`
- MongoDB Security: `lib/database/connect.ts`
- Security Monitoring: `lib/security/monitoring.ts`
- Automated Test Scripts: `scripts/security/run-all-security-tests.sh`
