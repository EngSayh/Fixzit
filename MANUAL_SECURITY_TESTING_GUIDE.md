# 🔐 Manual Security Testing Guide

**Last Updated:** November 17, 2025  
**Prerequisites:** Development environment running, `.env.local` configured  
**Time Required:** 30-45 minutes  
**Target:** Validate all security fixes before staging/production deployment

---

## 📋 Overview

This guide provides step-by-step instructions to manually verify all security implementations:

✅ **Rate Limiting** - OTP endpoints protected against brute-force  
✅ **CORS Policy** - Only trusted origins can access API  
✅ **Environment Secrets** - No hardcoded values, fail-fast validation  
✅ **MongoDB Security** - Atlas-only enforcement in production  
✅ **Docker Secrets** - Compose files require all secrets

---

## 🎯 Test 1: Rate Limiting Validation

### Test 1.1: OTP Send Rate Limiting

**Expected Behavior:** After 10 requests/minute, API returns `429 Too Many Requests`

**Steps:**

```bash
# Terminal 1: Start dev server
pnpm dev

# Terminal 2: Run rate limit test
for i in {1..15}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/auth/otp/send \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber": "+966501234567"}' \
    -w "\nHTTP Status: %{http_code}\n\n" \
    -s | jq '.error // .message' 2>/dev/null || echo "No JSON response"
  sleep 4
done
```

**Expected Output:**
```
Request 1-10: HTTP Status: 200 (OTP sent successfully)
Request 11-15: HTTP Status: 429 (Rate limit exceeded)
```

**Pass Criteria:**
- ✅ First 10 requests succeed
- ✅ Requests 11-15 return 429
- ✅ Error message: "Too many requests. Please try again later."

---

### Test 1.2: OTP Verify Rate Limiting

**Expected Behavior:** After 10 requests/minute, API returns `429 Too Many Requests`

**Steps:**

```bash
# Test OTP verify endpoint
for i in {1..15}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/auth/otp/verify \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber": "+966501234567", "otp": "123456"}' \
    -w "\nHTTP Status: %{http_code}\n\n" \
    -s | jq '.error // .message' 2>/dev/null || echo "No JSON response"
  sleep 4
done
```

**Expected Output:**
```
Request 1-10: HTTP Status: 400 or 401 (Invalid OTP - expected)
Request 11-15: HTTP Status: 429 (Rate limit exceeded)
```

**Pass Criteria:**
- ✅ Requests 11-15 return 429 (rate limit works)
- ✅ Rate limiting happens BEFORE OTP validation (security best practice)

---

### Test 1.3: Claims API Rate Limiting

**Expected Behavior:** Claims endpoints protected (10 req/min)

**Steps:**

```bash
# Get auth token first (replace with actual user credentials)
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@fixzit.sa", "password": "test123"}' \
  -s | jq -r '.token')

# Test claims creation endpoint
for i in {1..12}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/souq/claims \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"orderId": "test", "reason": "damaged"}' \
    -w "\nHTTP Status: %{http_code}\n\n" \
    -s | jq '.error // .message' 2>/dev/null || echo "No JSON response"
  sleep 5
done
```

**Pass Criteria:**
- ✅ First 10 requests succeed or fail with business logic errors (not rate limit)
- ✅ Requests 11-12 return 429
- ✅ Error message includes rate limit text

---

## 🌐 Test 2: CORS Policy Validation

### Test 2.1: Valid Origin (Should Succeed)

**Expected Behavior:** Requests from allowed origins work

**Steps:**

```bash
# Test with valid production origin
curl -X GET http://localhost:3000/api/health \
  -H "Origin: https://fixzit.sa" \
  -v 2>&1 | grep -E "(HTTP/|Access-Control)"

# Test with valid staging origin
curl -X GET http://localhost:3000/api/health \
  -H "Origin: https://staging.fixzit.sa" \
  -v 2>&1 | grep -E "(HTTP/|Access-Control)"

# Test with localhost (dev only)
curl -X GET http://localhost:3000/api/health \
  -H "Origin: http://localhost:3000" \
  -v 2>&1 | grep -E "(HTTP/|Access-Control)"
```

**Expected Output:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://fixzit.sa
Access-Control-Allow-Credentials: true
```

**Pass Criteria:**
- ✅ All valid origins return 200
- ✅ `Access-Control-Allow-Origin` header matches request origin
- ✅ `Access-Control-Allow-Credentials: true` present

---

### Test 2.2: Invalid Origin (Should Fail)

**Expected Behavior:** Requests from evil origins blocked

**Steps:**

```bash
# Test with malicious origin
curl -X POST http://localhost:3000/api/auth/otp/send \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+966501234567"}' \
  -v 2>&1 | grep -E "(HTTP/|Access-Control)"

# Test with .co domain (should be blocked in production)
curl -X POST http://localhost:3000/api/auth/otp/send \
  -H "Origin: https://fixzit.co" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+966501234567"}' \
  -v 2>&1 | grep -E "(HTTP/|Access-Control)"
```

**Expected Output:**
```
HTTP/1.1 403 Forbidden
(No Access-Control-Allow-Origin header)
```

**Pass Criteria:**
- ✅ Request returns 403 or 500 (origin rejected)
- ✅ NO `Access-Control-Allow-Origin` header in response
- ✅ Error logged in server console: "CORS policy blocked origin: https://evil.com"

---

### Test 2.3: CORS Preflight (OPTIONS)

**Expected Behavior:** Preflight requests handled correctly

**Steps:**

```bash
# Test OPTIONS preflight request
curl -X OPTIONS http://localhost:3000/api/auth/otp/send \
  -H "Origin: https://fixzit.sa" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v 2>&1 | grep -E "(HTTP/|Access-Control)"
```

**Expected Output:**
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://fixzit.sa
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

**Pass Criteria:**
- ✅ Returns 204 No Content
- ✅ All CORS headers present
- ✅ Allowed methods include POST
- ✅ `Max-Age` set (caching enabled)

---

## 🔐 Test 3: Environment Secrets Validation

### Test 3.1: Production Mode Without Secrets

**Expected Behavior:** App fails to start if secrets missing

**Steps:**

```bash
# Backup current .env.local
cp .env.local .env.local.backup

# Remove JWT_SECRET and try to start
sed -i.tmp '/^JWT_SECRET=/d' .env.local

# Try to start in production mode
NODE_ENV=production pnpm start 2>&1 | head -20

# Restore .env.local
mv .env.local.backup .env.local
```

**Expected Output:**
```
Error: Environment variable JWT_SECRET is required but not set
    at requireEnv (/lib/env.ts:15:11)
    at /lib/mongo.ts:8:23
```

**Pass Criteria:**
- ✅ App exits immediately (doesn't start)
- ✅ Clear error message about missing JWT_SECRET
- ✅ No "Server listening on port 3000" message

---

### Test 3.2: Test Fallbacks Work in Development

**Expected Behavior:** Dev mode allows test fallbacks

**Steps:**

```bash
# Remove JWT_SECRET
sed -i.tmp '/^JWT_SECRET=/d' .env.local

# Try to start in dev mode
NODE_ENV=development pnpm dev 2>&1 | grep -E "(JWT_SECRET|using test fallback)" | head -5

# Restore .env.local
mv .env.local.backup .env.local
```

**Expected Output:**
```
⚠️  JWT_SECRET not set, using test fallback (development only)
✅ JWT_SECRET resolved: dev-secret-... (32 chars)
```

**Pass Criteria:**
- ✅ App starts successfully in dev mode
- ✅ Warning logged about test fallback
- ✅ No crashes

---

### Test 3.3: Validate All Required Secrets Present

**Expected Behavior:** Validation script confirms all secrets set

**Steps:**

```bash
# Run validation script
pnpm tsx scripts/validate-notification-env.ts
```

**Expected Output:**
```
✅ Checking environment variables...

Core Secrets:
  ✅ JWT_SECRET: Set (32 characters)
  ✅ NEXTAUTH_SECRET: Set (44 characters)
  ✅ MONGODB_URI: Set (mongodb+srv://...)

Notification Secrets:
  ✅ SENDGRID_API_KEY: Set (SG.****...)
  ✅ TWILIO_ACCOUNT_SID: Set (AC****)
  ⚠️  WHATSAPP_BUSINESS_API_KEY: Not set (optional)

All required secrets present!
```

**Pass Criteria:**
- ✅ All core secrets marked as ✅
- ✅ Script exits with code 0
- ✅ Optional secrets can be missing

---

## 🗄️ Test 4: MongoDB Atlas Enforcement

### Test 4.1: Production Rejects Localhost URI

**Expected Behavior:** Production fails if non-Atlas URI used

**Steps:**

```bash
# Backup MongoDB URI
ORIGINAL_URI=$(grep "^MONGODB_URI=" .env.local | cut -d'=' -f2-)

# Try localhost URI in production
sed -i.tmp "s|^MONGODB_URI=.*|MONGODB_URI=mongodb://localhost:27017/fixzit|" .env.local

# Try to connect in production mode
NODE_ENV=production node -e "require('./lib/mongo.ts')" 2>&1 | head -10

# Restore original URI
sed -i.tmp "s|^MONGODB_URI=.*|MONGODB_URI=$ORIGINAL_URI|" .env.local
```

**Expected Output:**
```
Error: FATAL: Production requires MongoDB Atlas (mongodb+srv:// protocol).
Local or self-hosted MongoDB is not allowed in production.
    at enforceAtlasInProduction (/lib/mongo.ts:89:11)
```

**Pass Criteria:**
- ✅ Connection fails immediately
- ✅ Error mentions "Atlas-only" or "mongodb+srv://"
- ✅ No database connection established

---

### Test 4.2: Atlas URI Works in Production

**Expected Behavior:** Atlas URIs allowed in production

**Steps:**

```bash
# Ensure Atlas URI is set (should already be in .env.local)
grep "^MONGODB_URI=mongodb+srv://" .env.local

# Test connection in production mode
NODE_ENV=production node -e "
  const { connectToDatabase } = require('./lib/mongo.ts');
  connectToDatabase()
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ Connection failed:', err.message));
" 2>&1
```

**Expected Output:**
```
✅ Connected to MongoDB Atlas
```

**Pass Criteria:**
- ✅ Connection succeeds
- ✅ No warnings about localhost
- ✅ TLS/SSL enabled automatically

---

### Test 4.3: Development Allows Localhost

**Expected Behavior:** Dev mode allows localhost fallback

**Steps:**

```bash
# Use localhost in dev mode
MONGODB_URI=mongodb://localhost:27017/fixzit_dev node -e "
  const { connectToDatabase } = require('./lib/mongo.ts');
  connectToDatabase()
    .then(() => console.log('✅ Connected to local MongoDB'))
    .catch(err => console.error('❌ Connection failed:', err.message));
" 2>&1
```

**Expected Output:**
```
⚠️  Using localhost MongoDB URI (development only)
✅ Connected to local MongoDB
```

**Pass Criteria:**
- ✅ Connection succeeds
- ✅ Warning logged about localhost
- ✅ No production enforcement triggered

---

## 🐳 Test 5: Docker Secrets Enforcement

### Test 5.1: Docker Compose Fails Without Secrets

**Expected Behavior:** Compose exits if secrets not set

**Steps:**

```bash
# Unset all secrets
unset JWT_SECRET MONGO_INITDB_ROOT_PASSWORD MEILI_MASTER_KEY

# Try to start services
docker-compose up -d 2>&1 | grep -E "(JWT_SECRET|MONGO_INITDB_ROOT_PASSWORD|MEILI_MASTER_KEY|error)"
```

**Expected Output:**
```
ERROR: The variable JWT_SECRET is not set. Set JWT_SECRET before running.
ERROR: The variable MONGO_INITDB_ROOT_PASSWORD is not set. Set MONGO_INITDB_ROOT_PASSWORD before running.
ERROR: The variable MEILI_MASTER_KEY is not set. Set MEILI_MASTER_KEY before running.
```

**Pass Criteria:**
- ✅ `docker-compose up` fails immediately
- ✅ Clear error messages for each missing secret
- ✅ No containers started

---

### Test 5.2: Docker Compose Works With Secrets

**Expected Behavior:** Compose starts when secrets provided

**Steps:**

```bash
# Set all required secrets
export JWT_SECRET="test-jwt-secret-32-characters-long"
export MONGO_INITDB_ROOT_PASSWORD="strong_mongo_password_123"
export MEILI_MASTER_KEY="test-meili-master-key-32-chars"

# Start services
docker-compose up -d

# Check services started
docker-compose ps

# Clean up
docker-compose down
```

**Expected Output:**
```
Creating network "fixzit_default" ... done
Creating fixzit_mongodb_1      ... done
Creating fixzit_meilisearch_1  ... done
Creating fixzit_app_1          ... done

NAME                   STATUS
fixzit_mongodb_1       Up 5 seconds
fixzit_meilisearch_1   Up 5 seconds
fixzit_app_1           Up 3 seconds
```

**Pass Criteria:**
- ✅ All services start successfully
- ✅ No error messages
- ✅ Containers show "Up" status

---

## 📊 Test Results Summary

### Quick Checklist

Copy this table to track your test progress:

| Test | Status | Notes |
|------|--------|-------|
| **Rate Limiting** | | |
| └─ OTP Send (10 req/min) | ☐ | |
| └─ OTP Verify (10 req/min) | ☐ | |
| └─ Claims API (10 req/min) | ☐ | |
| **CORS Policy** | | |
| └─ Valid origins allowed | ☐ | |
| └─ Invalid origins blocked | ☐ | |
| └─ Preflight requests work | ☐ | |
| **Environment Secrets** | | |
| └─ Prod fails without secrets | ☐ | |
| └─ Dev allows test fallbacks | ☐ | |
| └─ Validation script passes | ☐ | |
| **MongoDB Security** | | |
| └─ Prod rejects localhost | ☐ | |
| └─ Atlas URI works in prod | ☐ | |
| └─ Dev allows localhost | ☐ | |
| **Docker Secrets** | | |
| └─ Compose fails without secrets | ☐ | |
| └─ Compose works with secrets | ☐ | |

---

## 🚨 Failure Scenarios

### What to Do If Tests Fail

#### Rate Limiting Tests Fail
```bash
# Check rate limit middleware is imported
grep -r "enforceRateLimit" app/api/

# Verify rate limit configuration
cat lib/middleware/rate-limit.ts

# Check Redis connection (if using Redis backend)
redis-cli ping
```

#### CORS Tests Fail
```bash
# Check CORS allowlist
cat lib/security/cors-allowlist.ts

# Verify middleware.ts uses allowlist
grep "isOriginAllowed" middleware.ts

# Check Next.js CORS config
grep "cors" next.config.js
```

#### Environment Secrets Tests Fail
```bash
# Check requireEnv implementation
cat lib/env.ts

# Verify all production files use requireEnv
grep -r "requireEnv" lib/ | grep -v node_modules

# Test validation script
pnpm tsx scripts/validate-notification-env.ts --verbose
```

#### MongoDB Tests Fail
```bash
# Check MongoDB connection logic
cat lib/mongo.ts | grep -A 20 "enforceAtlasInProduction"

# Verify environment variable
echo $MONGODB_URI

# Test connection manually
mongosh "$MONGODB_URI" --eval "db.version()"
```

#### Docker Tests Fail
```bash
# Check docker-compose.yml syntax
docker-compose config

# Verify env var substitution
docker-compose config | grep -E "(JWT_SECRET|MONGO_INITDB_ROOT_PASSWORD)"

# Check for hardcoded values
grep -E "(jwt_secret|mongo.*password)" docker-compose.yml
```

---

## 📈 Security Score Calculation

After completing all tests, calculate your security score:

```
Total Tests: 15
Passing Tests: ____ / 15

Security Score = (Passing Tests / Total Tests) × 100
Security Score = (____ / 15) × 100 = _____%
```

**Grading:**
- 🟢 **90-100%** (14-15 tests): Excellent - Production ready
- 🟡 **80-89%** (12-13 tests): Good - Minor fixes needed
- 🟠 **70-79%** (11 tests): Fair - Security review required
- 🔴 **<70%** (<11 tests): Poor - Do not deploy

---

## ✅ Production Readiness Checklist

Before deploying to production, ensure:

- [ ] All 15 manual tests pass
- [ ] Security score ≥ 90%
- [ ] Automated tests added for critical paths
- [ ] Security scan completed (Snyk/ZAP)
- [ ] Staging validation completed
- [ ] Monitoring/alerting configured
- [ ] Team security review completed
- [ ] Incident response plan documented

---

## 📚 Related Documentation

- **Security Fixes Report:** `SECURITY_FIXES_COMPLETED.md`
- **Environment Setup:** `NOTIFICATION_CREDENTIALS_GUIDE.md`
- **Action Plan:** `ACTION_PLAN_NOV_17.md`
- **Pending Tasks:** `PENDING_TASKS_NOV_11-17_UPDATED.md`

---

## 🆘 Need Help?

### Common Issues

**Issue:** Rate limiting not working
```bash
# Solution: Restart dev server (rate limit state resets)
pkill -f "next dev"
pnpm dev
```

**Issue:** CORS headers missing
```bash
# Solution: Check middleware is running
grep "middleware.ts" next.config.js
```

**Issue:** Docker secrets not interpolating
```bash
# Solution: Use docker-compose config to debug
export JWT_SECRET="test123"
docker-compose config | grep JWT_SECRET
```

---

**Last Updated:** November 17, 2025  
**Test Environment:** Development (localhost:3000)  
**Estimated Time:** 30-45 minutes  
**Prerequisites:** `.env.local` configured, `pnpm dev` running
