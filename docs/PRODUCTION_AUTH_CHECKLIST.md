# Production Authentication Checklist

## Required Environment Variables for Auth to Work

The following environment variables **MUST** be set in your production environment (Vercel, AWS, etc.) for authentication to function correctly.

### Critical Variables (Auth Won't Work Without These)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_SECRET` | ✅ **REQUIRED** | 32+ character secret for JWT signing. Generate with: `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | ✅ **REQUIRED** for Vercel/proxied deployments | Set to `true` to allow NextAuth to trust the host header behind a proxy |
| `NEXTAUTH_URL` | ✅ **REQUIRED** | Your production URL (e.g., `https://app.fixzit.co`) |

### Generate a Secret

```bash
# Generate a secure 32-byte secret
openssl rand -base64 32
```

### Vercel Environment Setup

1. Go to your Vercel project settings
2. Navigate to **Settings → Environment Variables**
3. Add the following for **Production** environment:

```env
NEXTAUTH_SECRET=<your-generated-secret>
AUTH_TRUST_HOST=true
NEXTAUTH_URL=https://your-domain.com
```

## Common Auth Errors and Fixes

### 500 Error on `/api/auth/session` or `/api/auth/csrf`

**Cause**: Missing `NEXTAUTH_SECRET` or `AUTH_TRUST_HOST`

**Fix**:
1. Ensure `NEXTAUTH_SECRET` is set (32+ characters)
2. Set `AUTH_TRUST_HOST=true` for proxied deployments

### 401 Error on `/api/auth/otp/send`

**Cause**: Invalid credentials or user not found in database

**Fix**:
1. Check if user exists in production database
2. Verify password is correct
3. Check if user status is `ACTIVE`

### "There was a problem with the server configuration"

This NextAuth error message appears when:
- `NEXTAUTH_SECRET` is missing or invalid
- `trustHost` is false and running behind a proxy
- Database connection fails during auth callback

## Super Admin OTP Verification

**Production Security**: In production (`NODE_ENV=production`), OTP verification is **always required** for all users including super admins. This ensures proper MFA security.

### Development Bypass (Dev Only)

The bypass only works when ALL these conditions are true:

```typescript
isSuperAdmin && isDevelopment && explicitBypass
```

Where:
- `isSuperAdmin`: User has SUPER_ADMIN role
- `isDevelopment`: `NODE_ENV !== 'production'`
- `explicitBypass`: `NEXTAUTH_SUPERADMIN_BYPASS_OTP=true`

### Production Super Admin Login (Recommended)

1. **Configure SMS Gateway**: Ensure SMS provider (Twilio, etc.) is properly configured
2. **Update User Phone**: Ensure super admin user has a valid phone number in the database
3. **Test OTP Flow**: Verify OTP is sent and received on the configured phone number

### Required Environment Variables

```env
# SMS Gateway Configuration (Twilio example)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+966xxxxxxxxx
```

### Production Test Phone Configuration

For production testing, the designated test phone number is configured in the database:

```
Phone: +966552233456
```

**Usage**:
- ✅ This phone number is used by the **Super Admin** for full privileged access
- ✅ Super admin manages all test users and can update phone numbers as needed
- ✅ OTP will be sent to this number for authentication

### Fallback Phone (Emergency Use Only)

```env
# ⚠️ SECURITY WARNING: Avoid in production unless absolutely necessary
# Only use for time-bound emergency break-glass procedures
# Remove immediately after emergency access is no longer needed
# NEXTAUTH_SUPERADMIN_FALLBACK_PHONE=+966500000000
```

**Caution**: Do not set `NEXTAUTH_SUPERADMIN_FALLBACK_PHONE` in production unless there is a documented, time-limited break-glass procedure approved by security. Using a static fallback phone weakens MFA assurance by bypassing user-profile phone validation.

### Troubleshooting OTP Issues

1. **OTP Not Received**: Check SMS gateway configuration and phone number format
2. **Invalid Phone Format**: Ensure phone is in Saudi format (+966XXXXXXXXX)
3. **User Not Found**: Verify super admin user exists in database with `status: 'ACTIVE'`
4. **Rate Limited**: Wait 5 minutes between OTP requests

## Environment Variable Validation

Auth config validates environment at startup. Check logs for messages like:

```text
Missing required runtime configuration: NEXTAUTH_URL. These are required for production runtime.
Missing secrets: NEXTAUTH_SECRET or AUTH_SECRET. Authentication will not work.
```

## Testing Auth Configuration

### Quick Health Check

```bash
# Test session endpoint (should return empty session, not 500)
curl -s https://your-domain.com/api/auth/session

# Expected: {"user":null} or {} (empty object)
# Error: 500 status with HTML error page
```

### Full Auth Flow Test

1. Navigate to `/login`
2. Enter valid credentials
3. Verify OTP is sent (or bypassed in dev)
4. Check redirect to `/dashboard`

## Checklist Before Deployment

- [ ] `NEXTAUTH_SECRET` set (32+ chars, unique per environment)
- [ ] `AUTH_TRUST_HOST=true` set for Vercel/proxied deployments
- [ ] `NEXTAUTH_URL` set to production domain with https
- [ ] Database connection string (`MONGODB_URI`) is correct
- [ ] SMS gateway configured for OTP (if using SMS)
- [ ] Super admin user exists in database with `status: 'ACTIVE'`
- [ ] Test login flow on staging before production
- [ ] Finance index migration executed: run `MONGODB_URI=<prod-uri> pnpm tsx scripts/drop-legacy-fm-transaction-index.ts` and verify `db.fm_financial_transactions.getIndexes()` only includes the org-scoped unique `{ orgId: 1, transactionNumber: 1 }` (legacy global `{ transactionNumber: 1 }` removed)

## Vercel Specific Notes

1. **Preview deployments**: Use separate secrets from production
2. **Edge runtime**: Auth handlers must use `runtime = 'nodejs'`
3. **Serverless function timeout**: Increase if DB connections are slow

---

**Last Updated**: 2025-12-01  
**Version**: 1.1
