# Pull Request: Production Security Hardening (Atlas + Vercel + Runtime Guards)

**Branch:** `fix/security-atlas-vercel-hardening-20251214-1341`  
**Target:** `main`  
**Type:** Security (P0 - Critical)  
**Status:** ✅ Ready for merge (all checks pass)

---

## ⚠️ CRITICAL: ROLLOUT ORDER (PREVENTS PRODUCTION OUTAGE)

**The new code includes runtime guards that will FAIL STARTUP if security violations exist.**

**Execute these steps in EXACT ORDER:**

### Step 1: Fix Vercel Environment Variables (15 minutes) ⚡ DO FIRST
1. Recreate secrets as Sensitive (delete + re-add with Prod/Preview only)
2. Split `MONGODB_URI` by environment (least-privilege users)
3. Remove OTP bypass from Production/Preview
4. **Redeploy Preview** to verify guards pass
5. Test Preview deployment connects to MongoDB

### Step 2: Fix Atlas Database Users (5 minutes)
1. Clear `fixzitadmin` Description field (exposed secret)
2. Rotate `fixzitadmin` password immediately
3. Create least-privilege runtime users (fixzit-app-prod, fixzit-app-preview, fixzit-app-dev)
4. Update Vercel env vars with new connection strings
5. **Redeploy Preview** to verify connection

### Step 3: Remove Atlas 0.0.0.0/0 (After Static IPs)
1. Enable Vercel Static IPs (Project Settings → Connectivity)
2. Add Vercel egress IPs to Atlas Network Access (/32 entries)
3. **Test Preview** deployment connects
4. Delete 0.0.0.0/0 from Atlas Network Access
5. **Verify Preview** still connects

### Step 4: Merge PR → Deploy Production ✅
1. Merge this PR to main
2. **Production deployment will now enforce guards**
3. Verify Production connects to MongoDB
4. Monitor for any issues

**WHY THIS ORDER MATTERS:**

The new runtime guards will **block startup** if:
- OTP bypass is enabled in Production/Preview
- MongoDB URI points to localhost in Vercel environments
- Critical secrets are missing in Production

**If you merge before fixing Vercel/Atlas:** Deployment will fail or take prod down.

---

## 🚨 What This PR Fixes (P0 Issues Confirmed Live)

### 1. Vercel Secrets Are Revealable (P0 - MOST URGENT)

**Issue:** Vercel Team Environment Variables show "Click to reveal" button
- Secrets are NOT configured as Vercel "Sensitive" variables
- Any team member can reveal: `MONGODB_URI`, `AUTH_SECRET`, `TAQNYAT_BEARER_TOKEN`

**Fix:**
- ✅ Created [`docs/VERCEL_ENV_HARDENING.md`](docs/VERCEL_ENV_HARDENING.md) (500+ lines)
- ✅ Step-by-step: Delete + re-add secrets as Sensitive (Prod/Preview only)
- ✅ Split `MONGODB_URI` by environment (least-privilege users)
- ✅ Block OTP bypass in Production/Preview
- ✅ Vercel Static IPs setup (remove Atlas 0.0.0.0/0)
- ✅ Edge Middleware limitation documented
- ✅ Git verification commands (prove secrets not tracked)

---

### 2. Atlas Database Users Exposure (P0 - CRITICAL)

**Issue:** From Atlas Database Access screen:
- User `fixzitadmin` has **plaintext secret in Description field**
- Both `EngSayh` and `fixzitadmin` have **`atlasAdmin@admin`** (too permissive)

**Fix:**
- ✅ Updated [`docs/SECURITY_ATLAS_CHECKLIST.md`](docs/SECURITY_ATLAS_CHECKLIST.md)
- ✅ Added urgent Database Users section (new STEP 0/1)
- ✅ Clear Description, rotate password, create least-privilege users
- ✅ Moved 0.0.0.0/0 to STEP 2 (fix credentials first)

---

### 3. Atlas Network Exposed (P0)

**Issue:** IP Access List has `0.0.0.0/0` Active (internet-exposed cluster)

**Fix:**
- ✅ Documented removal process with Vercel Static IPs
- ✅ Explained integration dependency (can't remove wildcard if using integration)
- ✅ Provided Resource Policy JSON (Cedar format) to block permanently

---

### 4. Resource Policy JSON Format (Correction)

**Issue:** Previous format used incorrect structure

**Fix:**
- ✅ Corrected to **Cedar policy language** format:
  ```json
  {
    "name": "Policy Restricting Wildcard IP",
    "policies": [{
      "body": "forbid(principal, action == ResourcePolicy::Action::\"project.ipAccessList.modify\", resource) when { context.project.ipAccessList.contains(ip(\"0.0.0.0/0\")) };"
    }]
  }
  ```

---

## 🛡️ Code-Level Protection (Runtime Guards)

### What The Guards Enforce

**Created:** [`lib/config/env-guards.ts`](lib/config/env-guards.ts)

**Guards:**
1. **Block OTP bypass in Production/Preview**
   - `NEXTAUTH_BYPASS_OTP_ALL`, `ALLOW_TEST_USER_OTP_BYPASS`, `NEXTAUTH_BYPASS_OTP_CODE`
   - Must be removed from Prod/Preview environments
   - Allowed only in Development

2. **Block localhost MongoDB URIs in Vercel**
   - Detects `localhost`, `127.0.0.1`, `0.0.0.0`, `[::]`
   - Blocks startup if detected in Production/Preview

3. **Require critical secrets in Production**
   - `AUTH_SECRET`, `MONGODB_URI`
   - Must be set in Production environment

### Enforcement Points

**Primary:** [`instrumentation-node.ts`](instrumentation-node.ts)
- Runs on Next.js server startup
- Calls `validateProductionEnv()` before app initializes
- **Fails boot** if guards fail in Production

**Secondary:** [`lib/mongo.ts`](lib/mongo.ts) (NEW)
- Second enforcement point before DB connection
- Guards API routes that bypass instrumentation
- Ensures **no database access** with unsafe configuration

**CI:** [`scripts/ci/env-guard-check.ts`](scripts/ci/env-guard-check.ts)
- Pre-deployment validation: `pnpm env:check`
- Catches issues before deployment

---

## 📦 Files Changed

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| **docs/VERCEL_ENV_HARDENING.md** | NEW | 500+ | Complete Vercel env var remediation guide with ROLLOUT ORDER |
| **docs/SECURITY_ATLAS_CHECKLIST.md** | UPDATED | +150 | Database Users exposure, Resource Policy fix |
| **lib/config/env-guards.ts** | NEW | 260 | Production safety guards (runtime enforcement) |
| **lib/mongo.ts** | UPDATED | +25 | Second enforcement point (DB connection guard) |
| **instrumentation-node.ts** | UPDATED | +30 | Primary enforcement on server startup |
| **scripts/ci/env-guard-check.ts** | NEW | 45 | CI validation script (no secret leaks) |
| **package.json** | UPDATED | +1 | Added `pnpm env:check` script |
| **USER_ACTIONS_REQUIRED.md** | NEW | 300+ | Complete user action checklist with ROLLOUT ORDER |

---

## ✅ Verification (All Passing)

```bash
✅ pnpm env:check           # Guards pass in development
✅ pnpm lint --max-warnings=0  # 0 errors
✅ pnpm typecheck           # 0 errors
✅ .gitignore verified      # .env.* and .artifacts/ ignored
✅ No secret leaks          # Scripts never print env values
```

**Proof:**
```bash
# Secrets not tracked
git ls-files --error-unmatch .env.local 2>&1  # NOT tracked ✅
git ls-files --error-unmatch .artifacts/ 2>&1  # NOT tracked ✅

# .gitignore coverage
grep -n '\.env\.\*' .gitignore   # Line 23 ✅
grep -n '\.artifacts/' .gitignore # Line 117 ✅
```

---

## 📋 Manual Actions Required (NOT Code Changes)

**See:** [USER_ACTIONS_REQUIRED.md](USER_ACTIONS_REQUIRED.md) for complete step-by-step guide.

**Summary (NO SECRETS INCLUDED):**

### Priority 1: Vercel Environment Variables (Vercel UI)
- [ ] Delete secrets from Production environment
- [ ] Re-add as Sensitive (Prod/Preview only)
- [ ] Split `MONGODB_URI` by environment (prod/preview/dev users)
- [ ] Remove OTP bypass from Production/Preview
- [ ] Redeploy Preview and test

### Priority 2: Atlas Database Access (Atlas UI)
- [ ] Clear `fixzitadmin` Description field
- [ ] Rotate `fixzitadmin` password
- [ ] Create least-privilege users (fixzit-app-prod, fixzit-app-preview, fixzit-app-dev)
- [ ] Update Vercel env vars with new connection strings
- [ ] Redeploy Preview and test

### Priority 3: Atlas Network Access (Atlas UI - After Static IPs)
- [ ] Enable Vercel Static IPs
- [ ] Add Vercel egress IPs to Atlas (/32 entries)
- [ ] Test Preview deployment
- [ ] Delete 0.0.0.0/0 from Atlas
- [ ] Verify Preview still connects

---

## 🔒 Security Notes

### No Secrets in Git
- ✅ `.env.*` ignored (verified at line 23 of .gitignore)
- ✅ `.artifacts/` ignored (verified at line 117 of .gitignore)
- ✅ Scripts never print env values (only validation results)
- ✅ URI masking in all logs (password hidden)

### Cedar Policy Format
- ✅ Uses official MongoDB Cedar policy language
- ✅ Source: https://www.mongodb.com/docs/atlas/security/resource-policies/
- ✅ Requires Organization Owner role
- ✅ Blocks wildcard IP permanently (org-wide)

### Enforcement Philosophy
- **Fail-fast:** Refuse to boot with unsafe config (prevents silent bypasses)
- **Defense-in-depth:** Multiple enforcement points (instrumentation + DB connection + CI)
- **Environment-aware:** Production/Preview blocked, Development allowed (for testing)

---

## 🔗 References

- [Vercel Sensitive Environment Variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)
- [Vercel Static IPs](https://vercel.com/docs/connectivity/static-ips)
- [MongoDB Atlas ↔ Vercel Integration](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/)
- [MongoDB Resource Policies (Cedar)](https://www.mongodb.com/docs/atlas/security/resource-policies/)

---

## 📊 Testing

### Local Testing
```bash
# Run env guard checks
pnpm env:check
# Expected: ✅ Environment validation passed (development)

# Verify lint + typecheck
pnpm lint --max-warnings=0
pnpm typecheck
```

### Preview Deployment Testing (After Step 1/2)
1. Deploy to Preview environment
2. Check Vercel deployment logs for:
   - ✅ Environment validation passed
   - ✅ Connected to MongoDB
   - ❌ Any guard errors (if config still wrong)

### Production Deployment Testing (After Merge)
1. Merge PR to main
2. Deploy to Production
3. Monitor:
   - Application starts successfully
   - MongoDB connection established
   - No guard errors in logs

---

## 🚀 Rollout Timeline

| Step | Duration | When | Verification |
|------|----------|------|--------------|
| **1. Fix Vercel Env Vars** | 15 min | NOW | Preview deploys + connects |
| **2. Fix Atlas DB Users** | 5 min | After Step 1 | Preview connects with new users |
| **3. Remove 0.0.0.0/0** | 10 min | After Static IPs | Preview still connects |
| **4. Merge + Deploy Prod** | 5 min | After Step 3 | Production runs with guards |

**Total Time:** ~35 minutes from start to production deployment

---

## ✨ Post-Merge Benefits

1. **Immediate Protection:**
   - Secrets no longer revealable in Vercel UI
   - Atlas credentials rotated (compromised creds invalidated)
   - App uses least-privilege DB users (not atlasAdmin)

2. **Code-Level Enforcement:**
   - Runtime guards prevent unsafe configurations
   - **Impossible to deploy** with OTP bypass in production
   - **Impossible to connect** to localhost MongoDB in Vercel

3. **Long-Term Security:**
   - Vercel Static IPs + Atlas allowlist (controlled egress)
   - MongoDB Resource Policy (prevent wildcard IP from returning)
   - Documented playbook for future audits

---

**Ready to merge after completing Steps 1-3 in the rollout order.**

**Created:** 2025-12-14  
**Author:** VS Code Copilot Agent (Per Eng. Sultan's Final Security Review)  
**Commits:**
- `2057eb9eb` - fix(security): Atlas/Vercel hardening + production safety guards
- `628bf604b` - fix(security): Final hardening - rollout order + second enforcement + no secret leaks
