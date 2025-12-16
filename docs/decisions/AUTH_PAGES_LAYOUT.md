# Route Group Architecture - Auth Pages Decision

## Status: INTENTIONAL - Auth pages have full ClientLayout shell

### Decision
Auth pages (`/login`, `/signup`) remain under the `(app)` route group and inherit the full `ClientLayout` with header, sidebar, and footer.

### Rationale
1. **Branding Consistency**: Layout Freeze requirement mandates universal shell across all routes (except superadmin)
2. **User Experience**: Users can navigate to public pages (marketplace, help, about) from auth pages via header/footer
3. **ClientLayout Logic**: Already handles auth routes explicitly via `isAuthPage` check (line 204-207 in ClientLayout.tsx)
   - Skips auth probe on auth pages to avoid 401 noise
   - Prevents unnecessary API calls during login/signup flow

### Implementation
- Auth pages are in `app/(app)/login/` and `app/(app)/signup/`
- They inherit `ClientLayout` from `app/(app)/layout.tsx`
- `ClientLayout` detects auth routes via `AUTH_ROUTES` config and adjusts behavior accordingly

### Alternative (Minimal Shell)
If a minimal shell is desired in the future:
1. Move `/login` and `/signup` into `app/(auth)/` route group
2. Remove passthrough in `app/(auth)/layout.tsx`
3. Create minimal layout with logo + language selector only
4. Update `config/routes/public.ts` imports if needed

### Files Referenced
- `app/(app)/layout.tsx` - Provides ClientLayout wrapper
- `app/(app)/login/page.tsx` - Login page (client component)
- `app/(app)/signup/page.tsx` - Signup page (client component)
- `components/ClientLayout.tsx:204-207` - Auth route detection logic
- `config/routes/public.ts:22-26` - AUTH_ROUTES definition
- `app/(auth)/layout.tsx` - Placeholder for future minimal shell (currently passthrough)

### Verification
- ✅ Login page renders with full shell (header, sidebar, footer)
- ✅ Signup page renders with full shell
- ✅ No auth probe API calls on auth routes (see ClientLayout.tsx:260)
- ✅ Branding consistency maintained (Layout Freeze compliance)
- ✅ Tests pass with updated `@/app/(app)/...` imports

### Related Commits
- `898f7b882` - Created (app) route group with ClientLayout
- `db4018455` - Fixed test imports, created (auth) placeholder

Last Updated: 2025-12-16 (Session ID: db4018455)
