# Fixzit Production Errors Analysis (2025-12-14)

**Session**: https://fixzit.co console errors analysis  
**Branch**: `fix/security-atlas-vercel-hardening-20251214-1341`  
**Commit**: `fdb7207ae`

---

## Summary

You correctly identified that `NEXTAUTH_SUPERADMIN_EMAIL` and `NEXTAUTH_BYPASS_OTP_CODE` do NOT control access to https://fixzit.co/superadmin/login.

**Correct environment variables for `/superadmin/login`:**
- `SUPERADMIN_USERNAME` (e.g., `superadmin@fixzit.co`)
- `SUPERADMIN_PASSWORD_HASH` (bcrypt hash, cost factor 12)
- `SUPERADMIN_SECRET_KEY` (optional, for 2FA)

**Security issues to fix:**
- ❌ Remove `NEXTAUTH_BYPASS_OTP_CODE` from Production (backdoor)
- ❌ Remove `NEXTAUTH_BYPASS_OTP_ALL` from Production (disables OTP entirely)

---

## Console Errors (Production)

### 1. `/api/copilot/profile` → 500 Internal Server Error

**Issue**: `GET https://fixzit.co/api/copilot/profile` fails repeatedly with 500

**Root cause**: `resolveCopilotSession(req)` is throwing an error

**File**: [app/api/copilot/profile/route.ts](../app/api/copilot/profile/route.ts)

**Fix required**: Check `server/copilot/session.ts` - likely missing auth headers or session token validation issue

**Impact**: Copilot features fail for all users

---

### 2. `/api/subscriptions/tenant` → 404 Not Found

**Issue**: `GET https://fixzit.co/api/subscriptions/tenant` returns 404

**Root cause**: Route exists at [app/api/subscriptions/tenant/route.ts](../app/api/subscriptions/tenant/route.ts) but may require auth or specific tenant context

**Fix required**: Check if route should be accessible to anonymous users or if it needs tenant ID in path

**Impact**: Subscription data cannot be loaded

---

### 3. `/api/qa/health` → 401 Unauthorized

**Issue**: `GET https://fixzit.co/api/qa/health` returns 401 repeatedly

**Root cause**: Route requires `SUPER_ADMIN` role (line 63 in `app/api/qa/health/route.ts`)

```typescript
authContext = await requireSuperAdmin(req);
```

**Why it's failing**: 
- User is not logged in as superadmin
- Even if logged in via `/superadmin/login`, the session may not have `SUPER_ADMIN` role flag

**Fix required**: Either:
1. Make `/api/qa/health` accessible to authenticated admins (not just superadmins)
2. Ensure superadmin login sets proper role in session
3. Add a public health check endpoint for monitoring

**Impact**: Health monitoring unavailable in production

---

### 4. `/api/qa/reconnect` → 401 Unauthorized

**Issue**: `POST https://fixzit.co/api/qa/reconnect` returns 401 repeatedly

**Root cause**: Likely also requires `SUPER_ADMIN` role (check [app/api/qa/reconnect/route.ts](../app/api/qa/reconnect/route.ts))

**Impact**: Cannot reconnect to database from UI

---

### 5. `/api/qa/alert` → 403 Forbidden

**Issue**: `POST https://fixzit.co/api/qa/alert` returns 403

**Root cause**: Different from 401 - this is a permission issue, not authentication

**Fix required**: Check if route has IP whitelisting or other restrictions

**Impact**: Cannot send health alerts

---

## Action Plan

### Immediate (P0) - Fix Superadmin Login

1. **Remove security risk env vars from Vercel Production:**
   ```
   NEXTAUTH_BYPASS_OTP_CODE ❌ Remove
   NEXTAUTH_BYPASS_OTP_ALL ❌ Remove
   ```

2. **Set correct superadmin env vars:**
   ```bash
   # On your local machine
   read -s SUPERADMIN_PASSWORD && echo
   export SUPERADMIN_PASSWORD
   node scripts/generate-superadmin-hash.js
   unset SUPERADMIN_PASSWORD
   ```
   
   Then in Vercel Production:
   ```
   SUPERADMIN_USERNAME=superadmin@fixzit.co
   SUPERADMIN_PASSWORD_HASH=<hash from above> (mark Sensitive)
   SUPERADMIN_SECRET_KEY=<optional 2FA key> (mark Sensitive)
   ```

3. **Redeploy Vercel Production** (env vars only apply to new deployments)

4. **Test login** at https://fixzit.co/superadmin/login
   - Username: `superadmin@fixzit.co`
   - Password: Whatever you used to generate the hash
   - Access key: Leave blank unless you set `SUPERADMIN_SECRET_KEY`
   - Expected: Network tab shows 200 (not 401), cookie is set, refresh works

### P1 - Fix Console Errors

1. **Investigate `/api/copilot/profile` 500 error**
   - Check `server/copilot/session.ts`
   - Add error logging to identify exact failure point
   - Likely: missing auth context or invalid session token

2. **Fix `/api/qa/health` 401 errors**
   - Either relax auth requirement OR
   - Ensure superadmin login sets proper role in session

3. **Check `/api/subscriptions/tenant` 404**
   - Verify route is intended to be publicly accessible
   - May need tenant ID in URL path

### P2 - Documentation

- ✅ Updated [docs/SUPERADMIN_LOGIN_FIX.md](../docs/SUPERADMIN_LOGIN_FIX.md) with:
  - Clarification: `NEXTAUTH_SUPERADMIN_EMAIL` is NOT for `/superadmin/login`
  - Security warning: Remove `NEXTAUTH_BYPASS_OTP_CODE` from Production
  - Table listing all security-risk env vars

---

## Verification Commands

```bash
# After setting env vars and redeploying
curl -i -X POST https://fixzit.co/api/superadmin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin@fixzit.co","password":"YOUR_PASSWORD"}'

# Expected: HTTP/1.1 200 OK
# Expected: Set-Cookie: fixzit-superadmin-token=...

# Check health endpoint after login (with cookie)
curl -i https://fixzit.co/api/qa/health \
  -H "Cookie: fixzit-superadmin-token=YOUR_TOKEN"

# Expected: HTTP/1.1 200 OK (if role is properly set)
```

---

## References

- [lib/superadmin/auth.ts](../lib/superadmin/auth.ts) - Superadmin auth logic
- [app/api/superadmin/login/route.ts](../app/api/superadmin/login/route.ts) - Login endpoint
- [docs/SUPERADMIN_LOGIN_FIX.md](../docs/SUPERADMIN_LOGIN_FIX.md) - Complete fix guide
- [lib/config/env-guards.ts](../lib/config/env-guards.ts) - Production env var guards

---

**Last Updated**: 2025-12-14  
**Author**: GitHub Copilot (Claude Sonnet 4.5)
