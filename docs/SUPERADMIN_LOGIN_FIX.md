# Superadmin Login Production Fix (401 Unauthorized)

**Issue**: `POST https://fixzit.co/api/superadmin/login` returns **401 Unauthorized**

**Root Cause**: Production environment variables don't match login credentials.

---

## Authentication Logic

[lib/superadmin/auth.ts](../lib/superadmin/auth.ts) validates against **environment variables**:

1. `SUPERADMIN_USERNAME` (default: "superadmin")
2. `SUPERADMIN_PASSWORD_HASH` or `SUPERADMIN_PASSWORD`
3. `SUPERADMIN_SECRET_KEY` (optional - if set, becomes required)

**Database credentials are NOT used for superadmin login.**

---

## Production Fix (Vercel)

### Step 1: Set Environment Variables

In **Vercel → fixzit → Settings → Environment Variables → Production**:

| Variable | Value | Notes |
|----------|-------|-------|
| `SUPERADMIN_USERNAME` | (your choice) | Must match exactly what you type in login form |
| `SUPERADMIN_PASSWORD_HASH` | (bcrypt hash) | Generate with script below |
| `SUPERADMIN_SECRET_KEY` | (optional) | If set, "Access key" field becomes **required** |
| `NEXTAUTH_URL` | `https://fixzit.co` | Required for session stability |
| `AUTH_SECRET` | (stable secret) | Mark as **Sensitive** |

### Step 2: Generate Password Hash Securely

```bash
# Read password without showing it (won't appear in history)
read -s SUPERADMIN_PASSWORD && echo

# Generate bcrypt hash
node scripts/generate-superadmin-hash.js

# Clear the variable
unset SUPERADMIN_PASSWORD
```

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

**Status**: Waiting for Eng. Sultan to update Vercel Production env vars and redeploy.
