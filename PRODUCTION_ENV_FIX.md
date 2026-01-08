# Production Environment Variable Fix Checklist

**Status:** Code deployed to production (dpl_7hTG52wW3HmaC6eb4PiNNZqadMKS) ✅  
**Issue:** Runtime configuration errors causing elevated error rates

---

## Critical Actions Required (Vercel Project Settings)

Go to: **Vercel → Project fixzit → Settings → Environment Variables → Production**

### 🔥 P0 - Delete These (Causing Errors)

```
❌ DELETE: MONGODB_URL
   Reason: Contains invalid hostname (a2ibxb...xzva) causing DNS ENOTFOUND
   Impact: MongoDB falls back to in-memory now (safe), but logs spam errors
   
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

### 🚨 Atlas Network Access (MongoDB 500s on `/api/issues`)

Current production logs show `MongoDB connection failed: Could not connect to any servers... IP isn't whitelisted`. Update Atlas network rules **before** redeploying:
1) Go to **MongoDB Atlas → Security → Network Access → IP Access List**.
2) Add the hosting egress:
   - If you have **Vercel Managed IPs/Private Networking**, add those static IPs.
   - Otherwise, temporarily add `0.0.0.0/0` with a short TTL, then replace with the correct Vercel egress IPs.
3) Click **Save** and wait for Atlas to deploy the rule.
4) Re-run production deploy and verify:
   - `curl -s https://fixzit.co/api/health | jq '.database'` → should return `"connected"`.
   - Authenticated `GET https://fixzit.co/api/issues` → 200 (no `DatabaseConnectionError`).

### 🚀 Post-deploy Smoke (automated)

Run a health + issues smoke after redeploy (requires a valid session token or bearer):
```bash
HEALTH_URL=https://fixzit.co/api/health \
ISSUES_URL=https://fixzit.co/api/issues \
ISSUES_COOKIE="next-auth.session-token=..." \
pnpm smoke:prod
```
Or use `ISSUES_BEARER="eyJhbGciOi..."` instead of `ISSUES_COOKIE`. Set `SKIP_ISSUES=1` for health-only.

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
   - `ENOTFOUND` MongoDB errors
   - `DISABLE_MONGODB_FOR_BUILD enabled` warnings
   - `TAP_WEBHOOK_SECRET not set` warnings

2. Test endpoints:
   - `https://fixzit.co/` → 200 ✅
   - `https://fixzit.co/superadmin/login` → Login form ✅
   - `https://fixzit.co/api/health` → 200 ✅

3. Check Observability → Functions:
   - Error rate should drop significantly
   - Top failing routes should be clear (not MongoDB/env spam)

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
- 23% error rate (MongoDB ENOTFOUND spam + DB stub + missing webhook secrets)
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
