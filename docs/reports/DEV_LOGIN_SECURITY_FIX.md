# Server-Safe Dev Login Helpers - Security Fix

## 🔴 Critical Security Issue Fixed

**Problem**: Original implementation used `require('./credentials')` inside a **client component**, which caused Next.js to bundle secrets into the client-side JavaScript bundle. Passwords were visible in the browser.

**Solution**: Complete architectural refactor to server-only credentials with zero exposure to client.

---

## 🏗️ New Architecture

### Server-Only Credentials
- **`dev/credentials.server.ts`** (gitignored) - Real secrets never leave server
- **`dev/credentials.example.ts`** (committed) - Template for developers
- TypeScript types ensure compile-time safety

### API Endpoints

#### `/api/dev/demo-accounts` (GET)
- Returns **sanitized** credential list (NO PASSWORDS)
- Only sends role, description, color, icon, email/employeeNumber
- Server-side dynamic import of credentials

#### `/api/dev/demo-login` (POST)
- Accepts `{ role: string }`
- Looks up credentials **server-side only**
- Calls `/api/auth/login` internally with password
- Forwards Set-Cookie headers to establish session
- Password **never** reaches browser

### Page Structure

#### `app/dev/login-helpers/page.tsx` (Server Component)
- Hard-blocks if `NEXT_PUBLIC_ENABLE_DEMO_LOGIN !== 'true'` and `NODE_ENV !== 'development'`
- Returns 404 in production
- No secrets in this file

#### `app/dev/login-helpers/DevLoginClient.tsx` (Client Component)
- Fetches sanitized account list from `/api/dev/demo-accounts`
- Displays `[hidden]` for passwords
- Auto-login button calls `/api/dev/demo-login` (server-side)
- Copy button only copies identifier (email/employeeNumber), never password

### Middleware Guard

#### `middleware.ts`
- Belt-and-suspenders protection
- Redirects `/dev/login-helpers` and `/api/dev/*` to `/login` if not dev-enabled
- Prevents accidental production exposure even if client bundle leaks

---

## 🔒 Security Improvements

| Before | After |
|--------|-------|
| ❌ `require('./credentials')` in client component | ✅ Server-only dynamic import |
| ❌ Passwords bundled into browser JS | ✅ Passwords never leave server |
| ❌ Passwords visible in DOM | ✅ Only `[hidden]` shown |
| ❌ Client-side login with exposed credentials | ✅ Server-side login, cookies set by server |
| ❌ Single env check in client | ✅ Triple guards (server component + middleware + API) |

---

## 📁 Files Changed

### New Files
- `dev/credentials.example.ts` - Template with example structure
- `dev/credentials.server.ts` - Gitignored placeholder (re-exports example by default)
- `app/api/dev/demo-accounts/route.ts` - Sanitized account list API
- `app/api/dev/demo-login/route.ts` - Server-side login API
- `app/dev/login-helpers/DevLoginClient.tsx` - Safe client UI

### Modified Files
- `app/dev/login-helpers/page.tsx` - Now server component gate
- `middleware.ts` - Added dev helpers guard
- `.gitignore` - Added `/dev/credentials.server.ts`

### Removed Files
- `app/dev/login-helpers/credentials.example.ts` - Moved to `/dev/`
- (Old client implementation removed)

---

## 🎨 UX Improvements

- Loading states on auto-login buttons
- Disabled state while logging in
- Empty state with setup instructions
- Stable `data-testid` attributes for E2E testing
- Cleaner UI with `[hidden]` password display

---

## 🧪 E2E Test Hooks

All interactive elements have stable selectors:

```typescript
// Card containers
`data-testid="dev-card-${role}"`

// Auto-login buttons
`data-testid="dev-autologin-${role}"`

// Copy buttons
`data-testid="dev-copy-${role}"`

// Back to login link
`data-testid="back-to-login"`
```

---

## 📖 Developer Usage

### Setup
1. Copy template:
   ```bash
   cp dev/credentials.example.ts dev/credentials.server.ts
   ```

2. Fill in real credentials:
   ```typescript
   export const DEMO_CREDENTIALS: DemoCredential[] = [
     {
       role: 'SuperAdmin',
       loginType: 'personal',
       email: 'super@fixzit.co',
       password: 'YOUR_REAL_PASSWORD',
       description: 'Full system access',
       color: 'bg-red-100 text-red-800 border-red-200',
       icon: 'Shield'
     },
     // ... more roles
   ];
   ```

3. Never commit `dev/credentials.server.ts` (already gitignored)

### Access Page
- **Dev**: Automatically available at `/dev/login-helpers`
- **Production**: Set `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true` (not recommended)

### How It Works
1. Page loads, fetches sanitized account list
2. User clicks "Auto Login"
3. Client sends `{ role: "Admin" }` to `/api/dev/demo-login`
4. Server looks up credentials, calls auth endpoint with password
5. Server sets session cookie, returns success
6. Client redirects to dashboard

---

## 🚨 Production Safety

### Triple Protection
1. **Server Component**: `notFound()` if not dev-enabled
2. **Middleware**: Redirects `/dev/*` and `/api/dev/*` to `/login`
3. **API Routes**: Return 403 if not dev-enabled

### What If Flag is Accidentally Set in Production?
- Middleware still blocks access
- API returns 403 forbidden
- Credentials file may not exist in prod (gitignored)
- Even if all checks pass, users need valid credentials that exist in DB

---

## 🔄 Migration Notes

### Breaking Changes
- Old `app/dev/login-helpers/credentials.ts` → `dev/credentials.server.ts`
- Old client component → split into server component + client UI
- Must copy new example file and populate real credentials

### Non-Breaking
- Same user-facing functionality
- Same URL: `/dev/login-helpers`
- Same env var: `NEXT_PUBLIC_ENABLE_DEMO_LOGIN`

---

## ✅ Testing Checklist

- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] `/dev/login-helpers` loads in dev
- [ ] Account list displays correctly
- [ ] Auto-login works for all roles
- [ ] Copy button copies identifier only
- [ ] Passwords never visible in DOM
- [ ] Passwords never visible in Network tab
- [ ] `/dev/login-helpers` returns 404 in prod (without flag)
- [ ] `/api/dev/*` returns 403 in prod (without flag)
- [ ] Middleware redirects if accessed directly

---

## 📊 Impact

### Security
- ✅ Zero credential exposure to client
- ✅ Server-side authentication only
- ✅ Triple-layer production guards

### Developer Experience
- ✅ Same quick-login workflow
- ✅ Clear setup instructions
- ✅ Better visual feedback (loading states)
- ✅ E2E-testable with stable selectors

### Code Quality
- ✅ Server/client separation
- ✅ Type-safe credentials
- ✅ Graceful error handling
- ✅ Consistent with Next.js best practices

---

**Commit**: `[pending]`  
**Branch**: `fix/auth-duplicate-requests-and-debug-logs`  
**Related Issue**: Dev credentials security audit  
**Impact**: Critical security fix - prevents credential leakage
