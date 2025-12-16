# Deployment Troubleshooting: Superadmin Issues

## Issue Summary (2025-12-16)

**Problem:** Code fixes deployed but production still shows old behavior
- **DEPLOY-001:** FM shell still rendering on `/superadmin/*` routes
- **DEPLOY-002:** Translation keys showing raw (`superadmin.title` instead of translated text)

**User Verification:** Confirmed on live production at `https://fixzit.co/superadmin/issues`

---

## Root Cause Analysis

### Code Status: ✅ ALL FIXES ARE IN REPO

**Commit d2340e646** (Dec 16, 2025):
- ✅ FM shell bypass in `ClientLayout.tsx` (line 397-400)
- ✅ `normalizeLocale()` function in `I18nProvider.tsx`
- ✅ Superadmin layout uses `normalizeLocale()`

**Commit 9bf8afa97** (Dec 16, 2025):
- ✅ Currency selector added to header
- ✅ Footer added to layout
- ✅ Dynamic username from session

**Dictionary Status:**
- ✅ `i18n/generated/en.dictionary.json` contains `superadmin.title` (line 27377)
- ✅ `i18n/generated/ar.dictionary.json` contains `superadmin.title` (line 27377)
- ✅ `i18n/dictionaries/en.ts` imports from generated JSON
- ✅ `i18n/dictionaries/ar.ts` imports from generated JSON

### Production Status: ❌ STALE CODE DEPLOYED

**Most Likely Causes:**
1. **Vercel Edge Cache** holding old JS bundles (TTL: up to 60 seconds)
2. **Browser Cache** holding old page/assets (localStorage + service workers)
3. **Build Cache** in Vercel not invalidated after commit
4. **CDN Propagation** delay (Vercel Edge locations updating)

---

## Immediate Actions

### 1. Force Vercel Rebuild (Clear Build Cache)

```bash
# Option A: Via Vercel CLI
vercel env pull .env.local  # Sync env vars
vercel --prod --force       # Force rebuild, skip cache

# Option B: Via Vercel Dashboard
# 1. Go to https://vercel.com/your-project/deployments
# 2. Find commit 9bf8afa97
# 3. Click "..." → "Redeploy"
# 4. Check "Clear Build Cache"
# 5. Click "Redeploy"
```

### 2. Verify Deployment SHA Matches

```bash
# Check what commit is deployed
curl -s https://fixzit.co/api/health | jq '.commit'

# Should return: "9bf8afa97" or later
# If older → deployment didn't trigger
```

### 3. Clear Browser Cache (User Action)

**For User Testing:**
1. Open DevTools (F12)
2. Right-click Refresh button → "Empty Cache and Hard Reload"
3. Or: Go to `chrome://settings/clearBrowserData`
4. Clear "Cached images and files" for Last hour
5. Reload `/superadmin/issues`

### 4. Bypass Edge Cache (Testing)

Add cache-busting query param:
```
https://fixzit.co/superadmin/issues?v=9bf8afa97
```

---

## Verification Steps (After Redeploy)

### A) Check FM Shell Bypass

1. Visit: `https://fixzit.co/superadmin/issues`
2. **Expected:** NO FM sidebar (Work Orders / Properties / etc.)
3. **Expected:** NO "تسجيل الدخول" (Sign In) link in header
4. **Expected:** Superadmin sidebar with "Issue Tracker" active
5. **Expected:** Footer at bottom with Fixzit logo

**View Source Check:**
```bash
curl -s https://fixzit.co/superadmin/issues | grep -c "isSuperadminRoute"
# Should return: 0 (inline code minified)
# But check bundle: should contain early return logic
```

### B) Check Translation Keys

1. Switch language to Arabic (العربية button)
2. **Expected:** Header shows "المسؤول الأعلى" (not `superadmin.title`)
3. **Expected:** Logout shows "تسجيل الخروج" (not `superadmin.logout`)
4. **Expected:** Stats show Arabic numbers/text

**Console Check:**
```javascript
// Open DevTools Console
window.__NEXT_DATA__.props.pageProps.locale
// Should return: "ar" (not "ar-SA")
```

### C) Check Dynamic Username

1. Look at header user badge
2. **Expected:** Shows "EngSayh" or actual superadmin username
3. **Expected:** NOT hardcoded "EngSayh" for all users

**Network Check:**
```bash
curl -H "Cookie: superadmin_token=YOUR_TOKEN" \
  https://fixzit.co/api/superadmin/session | jq '.user.username'
# Should return actual username from token
```

---

## Alternative: Route Group Refactor (If Issues Persist)

If cache issues continue, implement proper Next.js route groups:

### Current Structure (Problem)
```
app/
  layout.tsx                    // Root
  page.tsx                      // Landing
  superadmin/
    layout.tsx                  // Superadmin shell
    issues/page.tsx
```

**Issue:** `ClientLayout` wraps everything, needs conditional logic

### Recommended Structure (Clean)
```
app/
  layout.tsx                    // ONLY global providers
  (marketing)/
    layout.tsx                  // Landing shell
    page.tsx
    about/page.tsx
  (fm)/
    layout.tsx                  // FM shell (ClientLayout)
    fm/
      work-orders/page.tsx
      properties/page.tsx
  (superadmin)/
    layout.tsx                  // Superadmin shell
    superadmin/
      layout.tsx                // Already exists
      issues/page.tsx
  login/page.tsx                // Normal user login
```

**Benefits:**
- No conditional logic in `ClientLayout`
- FM shell never renders for superadmin routes
- Each route group has own layout
- Cleaner separation of concerns

**Implementation:**
1. Create `app/(superadmin)/layout.tsx` → empty wrapper
2. Move `app/superadmin/*` to `app/(superadmin)/superadmin/*`
3. Remove `isSuperadminRoute` check from `ClientLayout`

---

## Monitoring

### Post-Deploy Checks (Every Deploy)

```bash
# 1. Check deployment status
gh api /repos/EngSayh/Fixzit/deployments \
  --jq '.[0] | {sha: .sha, state: .state, url: .url}'

# 2. Verify commit deployed
curl -s https://fixzit.co/api/health | jq '{commit, timestamp}'

# 3. Check Vercel logs
vercel logs --prod --limit 50 | grep superadmin

# 4. Monitor Sentry (if enabled)
# Look for "isSuperadminRoute" in breadcrumbs
```

### Health Checks

Add to `app/api/health/route.ts`:
```typescript
export async function GET() {
  return NextResponse.json({
    status: "ok",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    timestamp: new Date().toISOString(),
    superadminBypass: true, // Confirms ClientLayout logic deployed
  });
}
```

---

## Contingency Plan

If redeploy doesn't fix production:

### Option 1: Add Debug Logging
```typescript
// components/ClientLayout.tsx (line 197)
if (isSuperadminRoute) {
  console.log("[ClientLayout] Superadmin bypass triggered", { pathname });
  return <>{children}</>;
}
```

Deploy, check browser console on `/superadmin/issues`

### Option 2: Add Middleware Override
```typescript
// middleware.ts
if (req.nextUrl.pathname.startsWith("/superadmin")) {
  const response = NextResponse.next();
  response.headers.set("X-Superadmin-Route", "true");
  response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  return response;
}
```

Forces fresh page load every time

### Option 3: Service Worker Clear
```javascript
// Check if service worker is caching
navigator.serviceWorker.getRegistrations()
  .then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
```

---

## Lessons Learned

1. **Always verify deployment SHA** matches expected commit
2. **Add health endpoint** with commit SHA for quick verification
3. **Clear browser cache** when testing code changes
4. **Use route groups** for cleaner separation (next refactor)
5. **Add cache-busting** headers for superadmin routes
6. **Monitor Vercel build logs** for warnings about missing imports

---

## Contact

**Issue Owner:** Eng. Sultan Al Hassni  
**Deployment Date:** Dec 16, 2025  
**Last Verified:** Commit 9bf8afa97  
**Status:** ⏳ Awaiting production verification
