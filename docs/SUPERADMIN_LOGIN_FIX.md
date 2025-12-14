# Superadmin Login Production Fix (401 Unauthorized)

**Issue**: `POST https://fixzit.co/api/superadmin/login` returns **401 Unauthorized**

**Root Cause**: Production environment variables don't match login credentials.

**Important**: This document describes the tooling fix. The actual production 401 is fixed only by setting correct Vercel env vars and redeploying.

---

## Authentication Logic

[lib/superadmin/auth.ts](../lib/superadmin/auth.ts) validates against **environment variables**:

1. `SUPERADMIN_USERNAME` (default: "superadmin")
2. `SUPERADMIN_PASSWORD_HASH` or `SUPERADMIN_PASSWORD`
3. `SUPERADMIN_SECRET_KEY` (optional - if set, becomes required)

**Database credentials are NOT used for superadmin login.**

---

## Production Fix (Vercel)

### Step 1: Define Superadmin Credentials (Environment Variables Only)

**Superadmin credentials are NOT stored in the database.** They are defined entirely by Vercel Production environment variables.

In **Vercel → fixzit → Settings → Environment Variables → Production**:

#### Required
| Variable | Example Value | Notes |
|----------|---------------|-------|
| `SUPERADMIN_USERNAME` | `superadmin@fixzit.co` | Must match **exactly** what you type in login form |
| `SUPERADMIN_PASSWORD_HASH` | (bcrypt hash) | Generate with script below (mark **Sensitive**) |

#### Optional 2FA
| Variable | Notes |
**Option A: Using the hash generator script**
```bash
read -s SUPERADMIN_PASSWORD && echo
node scripts/generate-superadmin-hash.js
unset SUPERADMIN_PASSWORD
```

**Option B: Inline (no dependencies)**
```bash
read -s SUPERADMIN_PASSWORD && echo
node - <<'NODE'
(async () => {
  const pwd = process.env.SUPERADMIN_PASSWORD;
  if (!pwd) throw new Error("Missing SUPERADMIN_PASSWORD");
  let bcrypt;
  try { bcrypt = require("bcryptjs"); } catch { bcrypt = require("bcrypt"); }
  const hash = await bcrypt.hash(pwd, 12);
  console.log(hash);
})();
NODEtable secret, mark **Sensitive**) |

### Step 2: Generate Password Hash Securely

```bash
# Read password without showing it (won't appear in history)
read -s SUPERADMIN_PASSWORD && echo

# Generate bcrypt hash
node scripts/generate-superadmin-hash.js

Go to https://fixzit.co/superadmin/login and enter:

- **Username**: Whatever you set in `SUPERADMIN_USERNAME` (e.g., `superadmin@fixzit.co`)
- **Password**: The password you used to generate the hash
- **Access key**: Only if you set `SUPERADMIN_SECRET_KEY` (otherwise leave blank)

**Expected results:**
1. Network tab: `POST /api/superadmin/login` returns **200** (not 401)
2. Cookie is set
3. Refresh maintains authentication
Copy the hash output and set it as `SUPERADMIN_PASSWORD_HASH` in Vercel (mark as **Sensitive**).

### Step 3: Redeploy Production

After changing env vars, trigger a **new Production deployment** in Vercel.

### Step 4: Verify Fix

1. Go to https://fixzit.co/superadmin/login
2. Enter credentials matching the env vars
3. Check Network tab: `POST /api/superadmin/login` should return **200** (not 401)
4. Refresh page - should stay authenticated

---

## Security Notes

1. **Never commit credentials** to git (passwords, hashes, secrets)
2. **Rotate credentials** if ever exposed in commits/messages/logs
3. Use `read -s` or stdin to avoid password in shell history
4. Mark all auth secrets as **Sensitive** in Vercel

---

## P2: Top-Level Await (Separate Issue)

Vercel build warnings about `lib/mongo.ts` are unrelated to the 401 error. Track as P2 cleanup after auth is fixed.

---

## References to Obsolete Scripts

The following scripts were deleted (auth is env-based, not DB-based):
- `scripts/setup-production-superadmin.ts`
- `scripts/fix-superadmin-login.ts`
- `scripts/fix-superadmin-password.js`
- `scripts/quick-fix-superadmin.ts`
- `scripts/update-superadmin-credentials.ts`
- `scripts/setup-superadmin.sh`
- `scripts/setup-superadmin-simple.js`
- `scripts/run-fixzit-superadmin-tests.sh`

If you need to reference superadmin setup, use this document instead.

---

**Status**: Waiting for Eng. Sultan to update Vercel Production env vars and redeploy.
