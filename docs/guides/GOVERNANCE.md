# Fixzit GOVERNANCE v4 + STRICT Rules

## Absolute Global Rules (Layout Freeze)

**NO CHANGES ALLOWED** to the following without explicit approval:

1. **Landing Page Layout** - 3 buttons, hero section, verified baseline
2. **Login/Auth Pages** - Clean login form, no layout mutations
3. **Header/Topbar** - Brand + Search + Lang + QuickActions + Notifications + UserMenu
4. **Sidebar** - Monday-style layout, fixed module order (Dashboard, Properties, Units, Work Orders, Finance, Reports, Marketplace, Settings)

**Branding Tokens (STRICT)**:

- Primary: `#0061A8` (Blue)
- Success: `#00A859` (Green)
- Warning: `#FFB400` (Yellow)
- NO custom colors without explicit approval

**Language Selector Standards**:

- Flags + Native names + ISO codes
- Supported: English (en), العربية (ar), עברית (he)
- RTL support mandatory for ar/he

**Currency Icon Rules**:

- SAR: ﷼ (U+FDFC)
- ILS: ₪ (U+20AA)
- NO font-based icons, use Unicode glyphs

## Definition of Done (DoD)

✅ **TypeScript**: Zero errors (`tsc --noEmit`)  
✅ **ESLint**: Zero warnings (`eslint . --max-warnings=0`)  
✅ **Build**: Successful production build (`next build`)  
✅ **SSR Check**: No `window`/`document` in server components  
✅ **Hydration**: No mismatch errors in console  
✅ **MongoDB**: No direct `MongoClient.connect()`, use `@/lib/db`  
✅ **No Duplicates**: De-dupe scan shows 0 new duplicates  
✅ **Artifacts**: `.fixzit/artifacts/` logs attached to PR

## Halt–Fix–Verify Protocol

1. **HALT** - Stop at first error
2. **FIX** - Root cause only, no workarounds
3. **VERIFY** - Re-run ALL gates, attach proof
4. **REPEAT** - If any gate fails, go back to step 1

**NO BYPASSING GATES**.
