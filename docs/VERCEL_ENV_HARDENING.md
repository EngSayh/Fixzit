# Vercel Environment Variables Hardening Guide

**Last Updated:** 2025-12-14  
**Severity:** P0 (Critical Security Configuration)

---

## 🚨 Critical Finding: Secrets Are Currently Revealable

### What "Click to Reveal" Means

If your Vercel environment variables show a **"Click to reveal"** button, they are **NOT configured as Sensitive variables**. Sensitive environment variables:

- **Cannot be revealed** after saving (Vercel docs: [Sensitive Environment Variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables))
- Are **encrypted at rest** and only decrypted at deploy time
- Prevent accidental exposure in Vercel UI, logs, or API responses

### Current State Assessment

Based on the Vercel Team Environment Variables screen:

- ❌ **MONGODB_URI** is revealable (NOT Sensitive)
- ❌ **AUTH_SECRET / NEXTAUTH_SECRET** is revealable (NOT Sensitive)
- ❌ **TAQNYAT_BEARER_TOKEN** is revealable (NOT Sensitive)
- ❌ **TAQNYAT_WEBHOOK_PHRASE** is revealable (NOT Sensitive)
- ❌ Multiple other secrets set for "All Environments" (Production + Preview + Development)

**Risk:** Any team member with Vercel UI access can reveal these secrets.

---

## 📋 Immediate Remediation Steps

### Step 1: Understand Sensitive Variable Limitations

Vercel's Sensitive toggle is **only available for Production + Preview environments** (not Development). [Source](https://vercel.com/docs/environment-variables/sensitive-environment-variables)

**Why:** Development environments often need local access to env values for debugging.

### Step 2: Recreate Secrets as Sensitive (Production + Preview)

**Important:** You **cannot convert** an existing env var to Sensitive. You must **delete and re-add**.

#### For Each Secret (Do This in Vercel UI):

1. **Before deletion:** Copy the current value to a secure location (password manager)
2. **Delete** the existing env var
3. **Re-add** with:
   - **Key:** Same name
   - **Value:** Paste from secure location
   - **Environments:** Select **Production + Preview** ONLY (not Development)
   - **Enable "Sensitive"** toggle (will appear when Development is not selected)
4. **Save**

**Result:** Value is now encrypted and cannot be revealed.

### Step 3: Add Separate Development Values

Development environments need their own values (not production secrets):

1. **Add new env var** with same key:
   - **Environments:** Select **Development** ONLY
   - **Value:** Use dev-specific value (e.g., dev DB, test tokens)
   - **Sensitive:** OFF (Development cannot be Sensitive)

---

## 🔑 Which Variables MUST Be Sensitive

### Database Credentials (Highest Priority)

- ✅ **MONGODB_URI** (Production + Preview as Sensitive)
  - Production: `mongodb+srv://fixzit-app-prod:<password>@fixzit.vgfiiff.mongodb.net/fixzit?retryWrites=true&w=majority`
  - Development: `mongodb+srv://fixzit-app-dev:<password>@fixzit.vgfiiff.mongodb.net/fixzit?retryWrites=true&w=majority`

### Authentication Secrets

- ✅ **AUTH_SECRET** / **NEXTAUTH_SECRET**
- ✅ **NEXTAUTH_BYPASS_OTP_CODE** (if used; should be DEV-ONLY, see Step 5)

### SMS/Email Provider Tokens

- ✅ **TAQNYAT_BEARER_TOKEN**
- ✅ **TAQNYAT_WEBHOOK_PHRASE**
- ✅ **SENDGRID_API_KEY** (or any email provider secret)

### Payment Gateway Credentials

- ✅ **TAP_SECRET_KEY** (if using Tap Payments)
- ✅ **PAYTABS_SERVER_KEY** (if using PayTabs)

### AWS/Cloud Provider Keys

- ✅ **AWS_ACCESS_KEY_ID**
- ✅ **AWS_SECRET_ACCESS_KEY**
- ✅ **AWS_SESSION_TOKEN** (if using temporary credentials)

---

## 📖 Variables That Are NOT Secrets (Can Remain Non-Sensitive)

These are safe to be revealable (but can still be protected):

- ✅ **NEXT_PUBLIC_*** keys (publicly exposed to client anyway)
- ✅ **PUBLIC_ORG_ID**
- ✅ **DEFAULT_ORG_ID**
- ✅ **VERCEL_ENV**, **VERCEL_URL** (Vercel system variables)
- ✅ **NODE_ENV**, **PORT** (standard runtime config)

---

## 🚧 Step 4: Split MONGODB_URI by Environment (Least Privilege)

### Why This Matters

MongoDB Atlas ↔ Vercel integration creates broad DB users (e.g., `readWriteAnyDatabase` across non-system DBs). [Source](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/)

**Best Practice:** Create separate least-privilege users per environment.

### Atlas Database Users Target State

| User | Role | Environments |
|------|------|--------------|
| `fixzit-app-prod` | `readWrite` on `fixzit` DB only | Vercel Production |
| `fixzit-app-preview` | `readWrite` on `fixzit` DB only | Vercel Preview |
| `fixzit-app-dev` | `readWrite` on `fixzit` DB only | Local Development |
| `fixzit-admin` | `atlasAdmin@admin` | Human break-glass only (not used by app) |

### Vercel Env Var Configuration

**Production:**
```
MONGODB_URI=mongodb+srv://fixzit-app-prod:<password>@fixzit.vgfiiff.mongodb.net/fixzit?retryWrites=true&w=majority
Environments: Production
Sensitive: ✅ Enabled
```

**Preview:**
```
MONGODB_URI=mongodb+srv://fixzit-app-preview:<password>@fixzit.vgfiiff.mongodb.net/fixzit?retryWrites=true&w=majority
Environments: Preview
Sensitive: ✅ Enabled
```

**Development:**
```
MONGODB_URI=mongodb+srv://fixzit-app-dev:<password>@fixzit.vgfiiff.mongodb.net/fixzit?retryWrites=true&w=majority
Environments: Development
Sensitive: ❌ Disabled (not available for Development)
```

---

## 🔒 Step 5: Block OTP Bypass in Production (Critical)

### Current Risk

OTP bypass variables are set for "All Environments" (including Production). This allows bypassing 2FA in production.

### Required State

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `NEXTAUTH_BYPASS_OTP_ALL` | ❌ MUST NOT EXIST | ❌ MUST NOT EXIST | ✅ Optional (for dev) |
| `ALLOW_TEST_USER_OTP_BYPASS` | ❌ MUST NOT EXIST | ❌ MUST NOT EXIST | ✅ Optional (for dev) |
| `NEXTAUTH_BYPASS_OTP_CODE` | ❌ MUST NOT EXIST | ❌ MUST NOT EXIST | ✅ Optional (for dev) |

### Vercel UI Actions

1. **Delete** these variables from Production environment:
   - `NEXTAUTH_BYPASS_OTP_ALL`
   - `ALLOW_TEST_USER_OTP_BYPASS`
   - `NEXTAUTH_BYPASS_OTP_CODE`

2. **Re-add** only for Development environment:
   - `NEXTAUTH_BYPASS_OTP_ALL=false` (or omit entirely)
   - Development only

**Code-level enforcement:** See `lib/config/env-guards.ts` (added in this PR) which will **fail startup** if OTP bypass is enabled in Production.

---

## 🌐 Step 6: MongoDB Atlas ↔ Vercel Integration Dependency

### If You Are Using the MongoDB Atlas ↔ Vercel Integration

MongoDB's official documentation states:

> Vercel deployments use dynamic IP addresses, and Atlas must allow all IP addresses (`0.0.0.0/0`). Atlas may even add it automatically as part of the integration.

**Source:** [Integrate with Vercel - MongoDB Atlas](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/)

**Implications:**

1. **Cannot remove `0.0.0.0/0`** while using the integration (dynamic IPs)
2. Integration may create **broad DB users** (`readWriteAnyDatabase`)
3. Integration is **convenient** but **not least-privilege**

### To Remove `0.0.0.0/0` from Atlas

**Must switch to manual `MONGODB_URI` connection:**

1. **Remove** MongoDB Atlas ↔ Vercel integration from Vercel
2. **Enable Vercel Static IPs:**
   - Vercel Dashboard → Your Project → Settings → **Connectivity** → Static IPs
   - Copy the egress IPs (2-3 IPs per region)
   - [Vercel Static IPs Documentation](https://vercel.com/docs/connectivity/static-ips)
3. **Add Static IPs to Atlas Network Access:**
   - Atlas → Network Access → Add IP Address
   - Add each Vercel egress IP as `/32` entry (exact IP)
4. **Delete `0.0.0.0/0` from Atlas Network Access**
5. **Update Vercel env vars:**
   - Use least-privilege DB users (see Step 4)
   - Set as Sensitive (see Step 2)
6. **Redeploy** to apply new env vars

**Important Limitation:** Vercel Static IPs **do NOT apply to Edge Middleware**. If you move DB calls to Edge runtime, this approach won't work. [Source](https://vercel.com/docs/connectivity/static-ips)

---

## 📊 Step 7: Understand Shared vs Project Env Vars

### Hierarchy

Vercel supports two levels of environment variables:

1. **Team-level Shared Env Vars** (apply to all linked projects)
2. **Project-level Env Vars** (apply to one project)

**Override Rule:** Project-level env vars **override** shared env vars if same key + environment. [Source](https://vercel.com/docs/environment-variables/shared-environment-variables)

### When to Use Each

| Type | Use Case |
|------|----------|
| **Team Shared** | Cross-project constants (e.g., `TEAM_REGION=us-east-1`) |
| **Project-level** | Secrets (safer isolation per project) |

**Recommendation:** Use **project-level** for all secrets to minimize blast radius.

---

## 🔄 Step 8: Redeploy After Env Changes

**Critical:** Environment variable changes **only apply to new deployments**. [Source](https://vercel.com/docs/environment-variables/managing-environment-variables)

### After Updating Env Vars in Vercel UI:

1. **Production:**
   ```bash
   # Trigger production deployment (assuming main branch)
   git push origin main
   # OR
   vercel deploy --prod
   ```

2. **Preview:**
   ```bash
   # Push to any preview branch
   git push origin feat/your-branch
   ```

3. **Development:**
   ```bash
   # Pull env vars locally
   vercel env pull .env.local
   # Restart dev server
   pnpm dev
   ```

**Verification:**
```bash
# Check what's deployed
vercel env ls

# Verify a specific var is set (will show "Sensitive" for Sensitive vars)
vercel env ls | grep MONGODB_URI
```

---

## 🔍 Step 9: Verify Secrets Are Not Tracked in Git

### Commands (Run Locally)

```bash
# 1. Prove .env.local is ignored (rule exists)
git check-ignore -v .env.local
# Expected: .gitignore:23:.env.*    .env.local

# 2. Prove .env.local is NOT tracked (file not in git index)
git ls-files --error-unmatch .env.local >/dev/null 2>&1 && \
  echo "❌ .env.local is TRACKED (BAD)" || \
  echo "✅ .env.local is NOT tracked"
# Expected: ✅ .env.local is NOT tracked

# 3. Same for .artifacts/import-report.json
git check-ignore -v .artifacts/import-report.json || true
git ls-files --error-unmatch .artifacts/import-report.json >/dev/null 2>&1 && \
  echo "❌ import-report.json is TRACKED (BAD)" || \
  echo "✅ import-report.json is NOT tracked"
# Expected: ✅ import-report.json is NOT tracked
```

**Why Both Checks:**

- `git check-ignore` proves the ignore rule exists
- `git ls-files --error-unmatch` proves the file isn't already tracked (classic gotcha: if a file was committed before `.gitignore`, the ignore rule won't remove it)

**If a file is tracked:** Remove from git:
```bash
git rm --cached .env.local
git commit -m "chore: Remove accidentally tracked .env.local"
```

---

## 🚀 Step 10: Sync Development Env from Vercel (No Secrets in Git)

### Developer Workflow

```bash
# 1. Install Vercel CLI (if not already installed)
npm install -g vercel

# 2. Link your local project to Vercel
vercel link

# 3. Pull environment variables for development
vercel env pull .env.local
# This populates .env.local with Development-scoped values

# 4. Start dev server
pnpm dev
```

**Documentation:** [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

**Never commit `.env.local` to git.** Use `vercel env pull` to sync locally.

---

## 📋 Final Verification Checklist

Run these commands to prove production readiness:

```bash
# 1. Secrets not tracked in git
git ls-files --error-unmatch .env.local && echo "❌ TRACKED" || echo "✅ NOT tracked"
git ls-files --error-unmatch .artifacts/ && echo "❌ TRACKED" || echo "✅ NOT tracked"

# 2. Env guards pass (blocks OTP bypass in prod)
pnpm env:check
# Expected: ✅ All guards pass

# 3. Lint + typecheck pass
pnpm lint --max-warnings=0
pnpm typecheck

# 4. Verify Vercel env vars are Sensitive (in UI)
# → Check: "Click to reveal" should NOT appear for secrets

# 5. Verify Atlas has least-privilege users (in UI)
# → Check: App uses readWrite@fixzit only (not atlasAdmin)

# 6. Verify Atlas Network Access (in UI)
# → Check: 0.0.0.0/0 is NOT present (or documented as controlled exception)
```

---

## 🔗 References

- [Vercel Sensitive Environment Variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)
- [Vercel Shared Environment Variables](https://vercel.com/docs/environment-variables/shared-environment-variables)
- [Vercel Managing Environment Variables](https://vercel.com/docs/environment-variables/managing-environment-variables)
- [Vercel Static IPs](https://vercel.com/docs/connectivity/static-ips)
- [MongoDB Atlas ↔ Vercel Integration](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/)
- [MongoDB Atlas Network Access](https://www.mongodb.com/docs/atlas/security/ip-access-list/)

---

## 📞 Support

If you encounter issues:

1. **Vercel env vars not updating:** Trigger a new deployment
2. **Atlas connection fails after IP changes:** Check Network Access allowlist
3. **Env guards failing:** Review `lib/config/env-guards.ts` for specific error messages

---

**Next Steps:** Follow the remediation steps above, then proceed to [SECURITY_ATLAS_CHECKLIST.md](./SECURITY_ATLAS_CHECKLIST.md) for MongoDB Atlas hardening.
