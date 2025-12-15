# Production Environment Variable Fix Checklist

**Status:** Code deployed to production (dpl_7hTG52wW3HmaC6eb4PiNNZqadMKS) ✅  
**Issue:** Runtime configuration errors causing elevated error rates

---

## Critical Actions Required (Vercel Project Settings)

Go to: **Vercel → Project fixzit → Settings → Environment Variables → Production**

### 🔥 P0 - Delete These (Causing Errors)

```
❌ DELETE: REDIS_URL
   Reason: Contains invalid hostname (a2ibxb...xzva) causing DNS ENOTFOUND
   Impact: Redis falls back to in-memory now (safe), but logs spam errors
   
❌ DELETE: DISABLE_MONGODB_FOR_BUILD  
   Reason: If active at runtime, returns stub DB handle → 500s
   Impact: All database operations fail silently
```

### ✅ P0 - Add These (Required by Strict Validation)

```bash
# Generate secrets locally:
AUTH_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -base64 32)
```

**Set in Vercel Production:**
```
AUTH_SECRET=<paste generated>
JWT_SECRET=<paste generated>
CRON_SECRET=<paste generated>
MONGODB_URI=mongodb+srv://your-atlas-connection-string
NEXTAUTH_URL=https://fixzit.co
```

### ⚠️ P1 - Add These (Payment Security)

```
TAP_WEBHOOK_SECRET=<from Tap dashboard>
TAP_LIVE_SECRET_KEY=sk_live_<from Tap>
NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY=pk_live_<from Tap>
TAP_ENVIRONMENT=live
```

---

## After Setting Variables

**Redeploy:** Vercel → Deployments → Latest production → **Redeploy**

---

## Verification (After Redeploy)

1. Check Vercel Runtime Logs - should NOT see:
   - `ENOTFOUND` Redis errors
   - `DISABLE_MONGODB_FOR_BUILD enabled` warnings
   - `TAP_WEBHOOK_SECRET not set` warnings

2. Test endpoints:
   - `https://fixzit.co/` → 200 ✅
   - `https://fixzit.co/superadmin/login` → Login form ✅
   - `https://fixzit.co/api/health` → 200 ✅

3. Check Observability → Functions:
   - Error rate should drop significantly
   - Top failing routes should be clear (not Redis/env spam)

---

## Code-Level Fix Applied

✅ Added `import "server-only"` to:
- `lib/mongo.ts` (prevents bundling into client/edge)
- `lib/mongodb-unified.ts` (prevents bundling into client/edge)

This eliminates the `topLevelAwait` warning and prevents MongoDB from being pulled into client/edge bundles via auth.config.ts import chain.

---

## Build Hygiene Note

⚠️ Vercel shows pnpm version mismatch:
- Lock file: pnpm 10.x
- package.json: pnpm 9.0.0

**Action (not urgent):** Align versions to prevent future build drift:
```json
"packageManager": "pnpm@10.0.0"
```

---

## Expected Outcome

**Before:**
- 23% error rate (Redis ENOTFOUND spam + DB stub + missing webhook secrets)
- Unclear which routes are actually broken

**After:**
- <5% error rate (only real application errors)
- Clear visibility into actual failing routes
- Payments functional with webhook verification
- Database operations working

---

**Last Updated:** 2025-12-15  
**Deployed Commit:** 2130836b0296a432f832d3247d5b16516638a41f  
**Production Deployment:** dpl_7hTG52wW3HmaC6eb4PiNNZqadMKS
