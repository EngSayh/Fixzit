# Bundle Optimization - Specific Action Plan

**Date**: 2024-01-XX  
**Current Score**: 82/100  
**Target Score**: 90-92/100  
**Current TBT**: 460ms  
**Target TBT**: <200ms

---

## 🎯 Priority 1: Middleware Optimization (HIGH IMPACT)

### Current State

- **File**: `middleware.ts` (228 lines)
- **Size**: 105 KB
- **Impact**: Runs on EVERY request at the edge
- **Target**: <60 KB (-45 KB, -43%)

### Issues Identified

```typescript
// Line 3: Heavy import
import { auth } from "@/auth"; // NextAuth.js runtime (~30-40 KB)
```

### Optimization Strategy

#### Option A: Conditional Auth Import (Recommended)

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ⚡ OPTIMIZATION: Lazy-load auth only for protected routes
async function getAuth() {
  const { auth } = await import("@/auth");
  return auth;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Only load auth for protected routes
  const authFn = await getAuth();
  const session = await authFn();

  // ... rest of logic
}
```

**Expected Impact:**

- Size: 105 KB → 60-65 KB (-40-45 KB)
- TBT: -40-50ms
- Edge latency: -10-15ms

---

#### Option B: Move Complex Logic to API Routes

```typescript
// middleware.ts - Keep lightweight
export function middleware(request: NextRequest) {
  // Only do routing and basic checks
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Add header for API route to handle auth
  const headers = new Headers(request.headers);
  headers.set("x-middleware-auth-required", "true");
  return NextResponse.next({ headers });
}

// app/api/auth/check/route.ts - Heavy auth logic
export async function GET(request: NextRequest) {
  const session = await auth();
  return Response.json({ authenticated: !!session });
}
```

**Expected Impact:**

- Size: 105 KB → 30-40 KB (-65-75 KB)
- Edge latency: -20-30ms

---

## 🎯 Priority 2: Global Layout Optimization (HIGH IMPACT)

### Current State

- **File**: `app/layout.tsx`
- **Providers**: 9 context providers loaded on every page
- **Components**: TopBar, Sidebar, Footer, CopilotWidget
- **Impact**: Affects shared bundle (102 KB)

### Issues Identified

#### 1. All Providers Load on Every Page

```tsx
// providers/Providers.tsx
<ErrorBoundary>
  <SessionProvider>           // NextAuth (~20 KB)
    <I18nProvider>            // i18n runtime (~10 KB)
      <TranslationProvider>   // Translation logic (~5 KB)
        <ResponsiveProvider>  // Window listeners (~2 KB)
          <CurrencyProvider>  // Currency logic (~3 KB)
            <ThemeProvider>   // Theme state (~2 KB)
              <TopBarProvider> // State management (~2 KB)
                <FormStateProvider> // Form state (~3 KB)
```

**Total overhead**: ~47 KB loaded on EVERY page (even public landing pages)

---

### Optimization Strategy

#### Solution 1: Split Providers by Route Type

```tsx
// providers/PublicProviders.tsx (NEW FILE)
"use client";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { I18nProvider } from "@/i18n/I18nProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function PublicProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
```

```tsx
// providers/AuthenticatedProviders.tsx (NEW FILE)
"use client";
import { SessionProvider } from "next-auth/react";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { CurrencyProvider } from "@/contexts/CurrencyProvider";
import { ResponsiveProvider } from "@/contexts/ResponsiveContext";
import { TopBarProvider } from "@/contexts/TopBarContext";
import { FormStateProvider } from "@/contexts/FormStateContext";
import PublicProviders from "./PublicProviders";

export default function AuthenticatedProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicProviders>
      <SessionProvider>
        <TranslationProvider>
          <ResponsiveProvider>
            <CurrencyProvider>
              <TopBarProvider>
                <FormStateProvider>{children}</FormStateProvider>
              </TopBarProvider>
            </CurrencyProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      </SessionProvider>
    </PublicProviders>
  );
}
```

```tsx
// app/layout.tsx (MODIFIED)
import PublicProviders from "@/providers/PublicProviders";
import AuthenticatedProviders from "@/providers/AuthenticatedProviders";
import ClientLayout from "@/components/ClientLayout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname(); // Note: Need to make this a client component or use different approach
  const isPublicRoute = ["/", "/about", "/privacy", "/terms"].includes(
    pathname,
  );

  const ProviderComponent = isPublicRoute
    ? PublicProviders
    : AuthenticatedProviders;

  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`min-h-screen bg-background ${inter.className} ${tajawal.variable}`}
      >
        <ProviderComponent>
          <ClientLayout>{children}</ClientLayout>
          <Toaster />
        </ProviderComponent>
      </body>
    </html>
  );
}
```

**Expected Impact:**

- Public pages: -30 KB bundle (-63% provider overhead)
- Protected pages: No change
- Homepage LCP: -0.2-0.3s
- TBT (public): -30-40ms

---

#### Solution 2: Dynamic Import Heavy Providers (Simpler Alternative)

```tsx
// app/layout.tsx
"use client";
import dynamic from "next/dynamic";

// Lazy-load non-critical providers
const SessionProvider = dynamic(() =>
  import("next-auth/react").then((mod) => ({ default: mod.SessionProvider })),
);

const CurrencyProvider = dynamic(() =>
  import("@/contexts/CurrencyContext").then((mod) => ({
    default: mod.CurrencyProvider,
  })),
);

const FormStateProvider = dynamic(() =>
  import("@/contexts/FormStateContext").then((mod) => ({
    default: mod.FormStateProvider,
  })),
);
```

**Expected Impact:**

- Shared bundle: 102 KB → 85-90 KB (-12-17 KB)
- Initial load faster, providers load on demand
- TBT: -20-30ms

---

## 🎯 Priority 3: ClientLayout Component Optimization (MEDIUM IMPACT)

### Current State

- **File**: `components/ClientLayout.tsx`
- **Lines**: 200+
- **Always imports**: TopBar, Sidebar, Footer, dynamic components

### Issues Identified

```tsx
// Line 5: Always imported even for auth pages
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
```

### Optimization Strategy

```tsx
// components/ClientLayout.tsx
"use client";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

// ⚡ OPTIMIZATION: Lazy-load layout components
const TopBar = dynamic(() => import("./TopBar"), {
  loading: () => <div className="h-16 bg-background border-b" />,
  ssr: true,
});

const Sidebar = dynamic(() => import("./Sidebar"), {
  loading: () => <div className="w-64 bg-background border-r" />,
  ssr: true,
});

const Footer = dynamic(() => import("./Footer"), {
  ssr: true,
});

const CopilotWidget = dynamic(() => import("./CopilotWidget"), {
  ssr: false,
  loading: () => null,
});

const AutoIncidentReporter = dynamic(() => import("./AutoIncidentReporter"), {
  ssr: false,
});

const ResponsiveLayout = dynamic(() => import("./ResponsiveLayout"), {
  ssr: true,
});

const AutoFixInitializer = dynamic(() => import("./AutoFixInitializer"), {
  ssr: false,
});

const PreferenceBroadcast = dynamic(() => import("./PreferenceBroadcast"), {
  ssr: false,
});

const HtmlAttrs = dynamic(() => import("./HtmlAttrs"), {
  ssr: true,
});

export default function ClientLayout({ children }: { children: ReactNode }) {
  // ... rest of component logic
}
```

**Expected Impact:**

- Shared bundle: -15-20 KB (layout components)
- Initial render faster
- TBT: -20-30ms
- Better code splitting

---

## 🎯 Priority 4: Login Page Optimization (HIGH IMPACT - Critical User Flow)

### Current State

- **Page**: `app/login/page.tsx`
- **Size**: 228 KB first load (+126 KB over baseline)
- **Impact**: First page many users see

### Expected Issues (needs verification)

```tsx
// Likely imports (to verify):
import { signIn } from "next-auth/react"; // OAuth handling
import { useForm } from "react-hook-form"; // Form validation
import { zodResolver } from "@hookform/resolvers/zod"; // Schema validation
```

### Optimization Strategy

```tsx
// app/login/page.tsx
"use client";
import dynamic from "next/dynamic";

// ⚡ OPTIMIZATION: Lazy-load OAuth buttons
const OAuthSection = dynamic(() => import("@/components/auth/OAuthSection"), {
  loading: () => <div className="space-y-2 h-24" />,
  ssr: false,
});

// ⚡ OPTIMIZATION: Lazy-load form validation (only when user starts typing)
const LoginFormWithValidation = dynamic(
  () => import("@/components/auth/LoginFormWithValidation"),
  { ssr: false },
);

export default function LoginPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <h1>Login</h1>

      {/* Simple form loads first */}
      {!showForm ? (
        <SimpleLoginForm onFocus={() => setShowForm(true)} />
      ) : (
        <LoginFormWithValidation />
      )}

      {/* OAuth loads after main form */}
      <OAuthSection />
    </div>
  );
}
```

**Expected Impact:**

- Size: 228 KB → 150-170 KB (-58-78 KB, -25-34%)
- Initial render: Immediate
- TBT: -40-50ms
- Perceived performance: Much faster

---

## 🎯 Priority 5: Remove Duplicate Dependencies (QUICK WIN)

### Issues Identified from Build Output

```bash
# Mongoose duplicate index warnings
(node:120905) [MONGOOSE] Warning: Duplicate schema index on {"orgId":1}
(node:120905) [MONGOOSE] Warning: Duplicate schema index on {"documents.expiryDate":1}
(node:120905) [MONGOOSE] Warning: Duplicate schema index on {"code":1}
(node:120905) [MONGOOSE] Warning: Duplicate schema index on {"createdAt":-1}
```

### Action Required

```bash
# Search for duplicate index definitions
grep -r "index: true" models/ | grep "orgId"
grep -r "schema.index" models/ | grep "orgId"
```

```typescript
// Example fix in models/Property.ts (or similar)
// BEFORE:
const propertySchema = new Schema({
  orgId: { type: String, required: true, index: true }, // ❌ Duplicate
  // ...
});
propertySchema.index({ orgId: 1 }); // ❌ Duplicate

// AFTER:
const propertySchema = new Schema({
  orgId: { type: String, required: true }, // ✅ No inline index
  // ...
});
propertySchema.index({ orgId: 1 }); // ✅ Only one index definition
```

**Expected Impact:**

- Build time: Slightly faster
- Runtime: Minimal (indexes already exist)
- Clean build output: ✅

---

## 📊 Implementation Plan & Timeline

### Phase 1: Quick Wins (Day 1-2) - Target: 85-87/100

**Priority Order:**

1. ✅ **Middleware optimization** (1-2 hours)
   - Expected: -40 KB, -40ms TBT
2. ✅ **Login page optimization** (2-3 hours)
   - Expected: -60 KB, -45ms TBT
3. ✅ **Fix Mongoose duplicates** (30 mins)
   - Clean build warnings

**Day 1 End Expected:**

- Score: 84-86/100 (+2-4 points)
- TBT: 370-420ms (-40-90ms)
- LCP: 2.9-3.1s (-0.1-0.3s)

---

### Phase 2: Provider Optimization (Day 3-4) - Target: 87-89/100

4. ✅ **Split providers** (4-6 hours)
   - Expected: -20-30 KB shared bundle, -30ms TBT
5. ✅ **ClientLayout dynamic imports** (2-3 hours)
   - Expected: -15-20 KB, -25ms TBT

**Day 4 End Expected:**

- Score: 87-89/100 (+3-5 points from Day 1)
- TBT: 310-370ms (-90-150ms from start)
- LCP: 2.7-2.9s (-0.3-0.5s from start)

---

### Phase 3: Deep Optimization (Week 2) - Target: 90-92/100

6. ⏳ **SSR optimization** (if needed)
   - Database query optimization
   - Redis caching layer
   - Expected: -0.2-0.4s LCP

7. ⏳ **Additional code splitting** (if needed)
   - Admin components
   - Heavy feature modules
   - Expected: -30-50ms TBT

**Week 2 End Expected:**

- Score: 90-92/100 ✅ **TARGET ACHIEVED**
- TBT: 180-250ms ✅ (<200ms target)
- LCP: 2.3-2.7s ✅ (<2.5s target)

---

## 🔄 Validation Process

After each phase:

```bash
# 1. Build
pnpm build

# 2. Check bundle size
ANALYZE=true pnpm build
# Compare .next/analyze/client.html with previous

# 3. Run Lighthouse
pnpm start &
sleep 5
lighthouse http://localhost:3000 \
  --output=json \
  --output-path=./lighthouse-phase-X.json \
  --only-categories=performance

# 4. Compare scores
echo "Previous:" && jq '.categories.performance.score * 100' lighthouse-previous.json
echo "Current:" && jq '.categories.performance.score * 100' lighthouse-phase-X.json

# 5. Check TBT improvement
echo "TBT:" && jq '.audits["total-blocking-time"].numericValue' lighthouse-phase-X.json
```

---

## 📝 Implementation Checklist

### Immediate Actions (Today)

- [ ] Read bundle analysis reports in browser
  ```bash
  "$BROWSER" file:///workspaces/Fixzit/.next/analyze/client.html
  ```
- [ ] Identify top 5 heaviest modules in shared chunk
- [ ] Take baseline Lighthouse measurement
  ```bash
  pnpm build && pnpm start &
  lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-baseline-day-1.json
  ```

### Phase 1 Implementation

- [ ] Optimize `middleware.ts` (Option A or B)
- [ ] Test middleware with protected and public routes
- [ ] Optimize `app/login/page.tsx`
- [ ] Fix Mongoose duplicate indexes
- [ ] Run bundle analysis again
- [ ] Measure Lighthouse score (expect 84-86/100)

### Phase 2 Implementation

- [ ] Create `providers/PublicProviders.tsx`
- [ ] Create `providers/AuthenticatedProviders.tsx`
- [ ] Update `app/layout.tsx` to use conditional providers
- [ ] Add dynamic imports to `ClientLayout.tsx`
- [ ] Test all page types (public, auth, protected)
- [ ] Run bundle analysis
- [ ] Measure Lighthouse score (expect 87-89/100)

### Phase 3 (If Needed)

- [ ] Profile SSR performance with Chrome DevTools
- [ ] Implement database query optimizations
- [ ] Add Redis caching layer
- [ ] Run final Lighthouse audit
- [ ] Target achieved: 90-92/100 ✅

---

## 🚨 Risk Assessment

### Low Risk (Safe to implement)

- ✅ Dynamic imports for heavy components
- ✅ Fixing Mongoose duplicates
- ✅ Login page code splitting

### Medium Risk (Test thoroughly)

- ⚠️ Middleware optimization (affects all routes)
- ⚠️ Provider splitting (ensure all contexts available)

### High Risk (Careful testing required)

- 🔴 Changing provider hierarchy
- 🔴 SSR changes that affect hydration

### Testing Strategy

1. **Unit tests**: Ensure all providers work correctly
2. **Integration tests**: Test auth flows end-to-end
3. **Manual testing**: Test all major page types
4. **Performance testing**: Lighthouse before/after each phase

---

## 📈 Expected Results Summary

| Phase       | Score  | TBT       | LCP      | Shared Bundle | Time      |
| ----------- | ------ | --------- | -------- | ------------- | --------- |
| **Current** | 82/100 | 460ms     | 3.2s     | 102 KB        | -         |
| **Phase 1** | 85-87  | 370-420ms | 2.9-3.1s | 95-100 KB     | 1-2 days  |
| **Phase 2** | 87-89  | 310-370ms | 2.7-2.9s | 75-85 KB      | 3-4 days  |
| **Phase 3** | 90-92  | 180-250ms | 2.3-2.7s | 70-80 KB      | 1-2 weeks |

**Final Target: 90-92/100 ✅**

---

## 🎯 Success Criteria

- [ ] Lighthouse score: ≥90/100
- [ ] TBT: <200ms
- [ ] LCP: <2.5s
- [ ] Shared bundle: <80 KB
- [ ] Login page: <180 KB
- [ ] Middleware: <60 KB
- [ ] All tests passing
- [ ] No regression in functionality

---

## Next Steps

**Ready to start? Choose one:**

1. **Option A: Start with middleware** (biggest single impact)
   - Follow "Priority 1" instructions above
   - Expected time: 1-2 hours
   - Expected impact: +2-3 points

2. **Option B: Start with login page** (critical user flow)
   - Follow "Priority 4" instructions above
   - Expected time: 2-3 hours
   - Expected impact: +2-3 points

3. **Option C: Do both in parallel** (if comfortable)
   - Middleware first (affects all routes)
   - Then login page
   - Combined impact: +4-6 points

**Recommendation**: Start with middleware (Priority 1, Option A) - it's the safest and has the highest impact per hour of work.

---

**Status**: ✅ Ready to implement  
**Next Action**: Choose priority and begin implementation  
**Expected Timeline**: 1-2 weeks to reach 90-92/100
