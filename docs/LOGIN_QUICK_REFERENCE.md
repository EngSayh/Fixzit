# 🔑 Fixzit Login Quick Reference

## For Superadmin (Eng. Sultan)

**✅ CORRECT URL:**
```
https://fixzit.co/superadmin/login
```

**Credentials:**
- Email: `sultan.a.hassni@gmail.com`
- Password: [your password]
- OTP Code: `[REDACTED]` (bypass code)

**After Login:**
- Redirects to: `/superadmin/issues`
- Can access: `/superadmin/*` routes
- Cannot access: `/fm/*` routes (by design)

---

## For Normal Users

**✅ CORRECT URL:**
```
https://fixzit.co/login
```

**Requirements:**
- Must have `orgId` assigned to user account
- Will redirect to: `/fm/dashboard` (or role-appropriate page)
- Can access: `/fm/*` routes within their organization

---

## Common Issues

### Issue 1: "Logged in but stuck on login page"

**Cause:** Using wrong portal
- Superadmin at `/login` → infinite loop (no orgId)
- Normal user without orgId → infinite loop

**Fix:**
- Superadmin → use `/superadmin/login`
- Normal user → assign orgId in database

### Issue 2: "Session doesn't persist after refresh"

**Cause:** Cookie not being created

**Check:**
1. DevTools → Application → Cookies → fixzit.co
2. Look for: `__Secure-authjs.session-token`

**Fix if missing:**
- Verify `AUTH_SECRET` set in Vercel production
- Verify `NEXTAUTH_URL = https://fixzit.co`
- Check browser console for cookie errors

### Issue 3: "Cannot access FM routes after login"

**Cause:** Missing orgId or wrong role

**Check:**
1. User has `orgId` field set
2. User has appropriate role permissions
3. User `isActive: true`

**Fix:**
- Assign user to organization
- Update role/permissions
- Activate user account

---

## Production Environment Variables

**Required in Vercel:**

```bash
AUTH_SECRET=<32+ character secret>           # Sensitive: Yes
NEXTAUTH_URL=https://fixzit.co               # Sensitive: No
NEXTAUTH_SUPERADMIN_EMAIL=sultan.a.hassni@gmail.com  # Sensitive: No
MONGODB_URI=<Atlas connection string>        # Sensitive: Yes
```

---

## PR #555 Improvements (Coming Soon)

When PR #555 merges to production:

1. **Auto-redirect:** Using `/login` as superadmin → auto-redirect to `/superadmin/login`
2. **Escape hatch:** Middleware prevents infinite loops
3. **Better errors:** Clear messages guide users to correct portal

**Status:** Ready to merge (pending functional tests)

---

## Quick Diagnostic

Run this to check your account:

```bash
pnpm exec tsx scripts/diagnose-login-issue.ts
```

Checks:
- Environment variables
- Database connection
- User account configuration
- Correct login portal
- Session settings

---

## Need Help?

If login still doesn't work after using correct portal:

**Provide:**
1. Screenshot of DevTools → Cookies (after login attempt)
2. Screenshot of Console errors (F12 → Console)
3. Which URL you used exactly
4. Which browser (Chrome/Firefox/Safari)

**This helps diagnose:**
- Cookie configuration issues
- AUTH_SECRET missing/wrong
- NEXTAUTH_URL mismatch
- Browser security policies blocking cookies
- CORS or SameSite issues
