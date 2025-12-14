# Environment Variable Cleanup Action Plan
**Date:** 2025-12-14  
**Owner:** Eng. Sultan Al Hassni  
**Goal:** Eliminate env var naming confusion between GitHub Actions and Vercel

---

## TL;DR - Do This Today (5 minutes)

✅ **Your codebase already handles all mismatches via lib/env.ts aliasing**

But to stop future confusion:

1. **Set canonical keys explicitly in both platforms** (even if aliases exist)
2. **Run env doctor script** before deploys: `pnpm exec tsx scripts/env-doctor.ts --strict`
3. **Schedule cleanup** to remove unused secrets next sprint

---

## ✅ What Your Scan Confirmed

| Finding | Status |
|---------|--------|
| AUTH_SECRET/NEXTAUTH_SECRET handled | ✅ `resolveAuthSecret()` in lib/config/constants.ts |
| SendGrid aliases supported | ✅ lib/env.ts maps SEND_GRID → SENDGRID_API_KEY |
| Google OAuth aliases supported | ✅ lib/env.ts maps OAUTH_CLIENT_GOOGLE* → GOOGLE_CLIENT_* |
| Maps key correct | ✅ Code uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (not server-side) |
| MongoDB URI aliases | ✅ lib/env.ts supports DATABASE_URL, MONGODB_URL, MONGO_URL |

**Verdict:** Your alias system is production-ready. The "problem" is operational (platform confusion), not technical.

---

## 📋 Immediate Actions (Next 24h)

### 1. Verify Current State

Run the doctor script:

```bash
# Check current env config
pnpm exec tsx scripts/env-doctor.ts

# Strict mode (recommended for CI)
pnpm exec tsx scripts/env-doctor.ts --strict
```

### 2. Set Canonical Keys in Both Platforms

Even though aliases work, explicitly set canonical keys to reduce confusion:

#### GitHub Actions Secrets

```bash
# Check current secrets
gh secret list

# Ensure these canonical keys exist (same value as aliases):
gh secret set AUTH_SECRET --body "$(gh secret get NEXTAUTH_SECRET)"
gh secret set SENDGRID_API_KEY --body "$(gh secret get SEND_GRID)"

# For Google Maps (if client-side maps are used):
# Only NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is used by components/GoogleMap.tsx
# GOOGLE_MAPS_API_KEY (server-side) is NOT consumed - can be deleted
gh secret delete GOOGLE_MAPS_API_KEY  # ← Unused, safe to remove
```

#### Vercel Environment Variables

```bash
# Check current secrets
vercel env ls

# Ensure canonical keys exist:
vercel env add AUTH_SECRET production    # Same value as NEXTAUTH_SECRET
vercel env add SENDGRID_API_KEY production  # Same value as SEND_GRID
```

### 3. Update .env.local (Already Done ✅)

The `.env.example` now clearly shows:
- ✅ Canonical keys marked as "CANONICAL KEY"
- ✅ Aliases marked as "legacy alias"
- ✅ Platform compatibility notes
- ✅ Runtime verification comments

---

## 🧹 Cleanup Sprint (Next Week)

### Phase 1: Remove Unused Secrets

| Secret | Location | Action | Reason |
|--------|----------|--------|--------|
| `GOOGLE_MAPS_API_KEY` | GitHub Actions | 🗑️ Delete | Not used (only `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is consumed) |

```bash
gh secret delete GOOGLE_MAPS_API_KEY
```

### Phase 2: Deprecate Legacy Aliases (Later)

After canonical keys are confirmed stable in production:

**Vercel:**
```bash
# Remove legacy keys after 1 month of canonical keys working
vercel env rm SEND_GRID production
vercel env rm SEND_GRID_EMAIL_FIXZIT_TOKEN production
vercel env rm OAUTH_CLIENT_GOOGLE production
```

**GitHub Actions:**
```bash
# Keep NEXTAUTH_SECRET for now (many workflows may reference it)
# Phase it out over 3-6 months
```

---

## 🤖 Add to CI Pipeline

### Option A: Pre-deploy Check (Recommended)

Add to `.github/workflows/deploy-production.yml`:

```yaml
- name: Environment Doctor Check
  run: pnpm exec tsx scripts/env-doctor.ts --strict
  env:
    NODE_ENV: production
    AUTH_SECRET: ${{ secrets.AUTH_SECRET }}
    MONGODB_URI: ${{ secrets.MONGODB_URI }}
    SENDGRID_API_KEY: ${{ secrets.SENDGRID_API_KEY }}
    # ... other required secrets
```

### Option B: Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Only run in dev (skip in CI)
if [ -z "$CI" ]; then
  pnpm exec tsx scripts/env-doctor.ts
fi
```

---

## 📊 Verification Evidence

### Runtime Usage Scan Results

```bash
# Production code ONLY uses canonical keys (or resolveAuthSecret fallback)
rg "process\.env\.(AUTH_SECRET|NEXTAUTH_SECRET)" --type ts | grep -v test | grep -v docs

# Results show:
# - lib/config/constants.ts: resolveAuthSecret() handles both
# - auth.config.ts: Uses NEXTAUTH_SECRET || AUTH_SECRET
# - components/GoogleMap.tsx: Uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
# - config/sendgrid.config.ts: Uses SENDGRID_API_KEY
```

### Alias System Test

```bash
# Test SendGrid alias (should work)
SEND_GRID=test-key pnpm exec tsx -e "
  import { requireEnv } from './lib/env';
  console.log('✅ Alias resolved:', requireEnv('SENDGRID_API_KEY'));
"

# Test Google OAuth alias (should work)
OAUTH_CLIENT_GOOGLE=test-secret pnpm exec tsx -e "
  import { requireEnv } from './lib/env';
  console.log('✅ Alias resolved:', requireEnv('GOOGLE_CLIENT_SECRET'));
"
```

---

## 🎯 Success Criteria

After completing this plan:

- [ ] `pnpm exec tsx scripts/env-doctor.ts --strict` passes in CI
- [ ] Both GitHub Actions and Vercel have canonical keys set explicitly
- [ ] .env.example clearly documents SSOT vs legacy keys
- [ ] Unused secrets removed (GOOGLE_MAPS_API_KEY)
- [ ] No more "which key do I use?" questions

---

## 📚 Related Documentation

| Document | Purpose |
|----------|---------|
| [docs/ENV_VAR_MISMATCH_ANALYSIS.md](ENV_VAR_MISMATCH_ANALYSIS.md) | Comprehensive technical analysis |
| [lib/env.ts](../lib/env.ts) | Alias system implementation |
| [lib/config/constants.ts](../lib/config/constants.ts) | Config SSOT + AUTH_SECRET resolver |
| [.env.example](.env.example) | Updated with canonical key markers |
| [scripts/env-doctor.ts](../scripts/env-doctor.ts) | Environment validation script |

---

## ⚡ Quick Reference Table

### GitHub Actions → Vercel Key Mapping

| Concept | GitHub Actions | Vercel | Canonical (SSOT) | Status |
|---------|---------------|--------|------------------|--------|
| Auth Secret | NEXTAUTH_SECRET | AUTH_SECRET | **AUTH_SECRET** | ✅ Aliased |
| MongoDB | MONGODB_URI | (same) | **MONGODB_URI** | ✅ OK |
| SendGrid | SEND_GRID + SEND_GRID_EMAIL_FIXZIT_TOKEN | (various) | **SENDGRID_API_KEY** | ✅ Aliased |
| Google OAuth ID | GOOGLE_CLIENT_ID | (same) | **GOOGLE_CLIENT_ID** | ✅ OK |
| Google OAuth Secret | OAUTH_CLIENT_GOOGLE | GOOGLE_CLIENT_SECRET | **GOOGLE_CLIENT_SECRET** | ✅ Aliased |
| Google Maps (client) | ~~GOOGLE_MAPS_API_KEY~~ (unused) | (not set) | **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY** | ⚠️ Set in both |

---

## 🚨 If Something Breaks

### Auth Sessions Failing

```bash
# Check if resolveAuthSecret() is working
pnpm exec tsx -e "
  import { Config } from './lib/config/constants';
  console.log('Auth secret resolved:', !!Config.auth.nextAuthSecret);
"
```

### Email Not Sending

```bash
# Check if SendGrid alias is resolving
pnpm exec tsx -e "
  import { requireEnv } from './lib/env';
  console.log('SendGrid key found:', !!requireEnv('SENDGRID_API_KEY'));
"
```

### Google Login Broken

```bash
# Check if OAuth keys are resolving
pnpm exec tsx -e "
  import { requireEnv } from './lib/env';
  console.log('Google ID:', !!requireEnv('GOOGLE_CLIENT_ID'));
  console.log('Google Secret:', !!requireEnv('GOOGLE_CLIENT_SECRET'));
"
```

---

## 📞 Support

**Questions?**
- Check [docs/ENV_VAR_MISMATCH_ANALYSIS.md](ENV_VAR_MISMATCH_ANALYSIS.md) for technical deep-dive
- Run `pnpm exec tsx scripts/env-doctor.ts` for current status
- Review lib/env.ts for supported aliases

**Last Updated:** 2025-12-14T04:30:00+03:00

---

**END OF ACTION PLAN**
