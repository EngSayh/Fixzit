# Deployment Readiness - Next Steps Checklist

This document outlines the immediate steps to complete before deployment.

## Status Overview

✅ **COMPLETED:**

- MongoDB URI configured with cloud database (Atlas format)
- Environment variables added (ZATCA, MEILI_MASTER_KEY)
- TypeScript errors fixed (icon imports, type casting)
- Production build compiles locally (run `pnpm verify:routes` to list current pages)
- Navigation system updated with Manager role support
- Route verification documentation created
- Automated verification script created

⚠️ **PENDING MANUAL VERIFICATION:**

- HTTP route crawl completion
- FM workflow UI testing
- Unit test execution
- CI pipeline validation

---

## Step-by-Step Action Plan

### 1. Run Automated Verification ⏱️ 3-7 minutes

Execute the comprehensive verification script:

```bash
cd /Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit

# Run alias/nav verification first (mirrors CI deterministic checks)
pnpm verify:routes

# Full readiness script (HTTP crawl + TypeScript + tests)
./scripts/verify-deployment-readiness.sh

# Or skip tests for faster feedback
./scripts/verify-deployment-readiness.sh --skip-tests
```

> **Tip:** Run these commands from the repository root so `pnpm verify:routes` / `pnpm verify:routes:http` resolve correctly. The HTTP crawl inside the script boots Next.js on `http://127.0.0.1:4010` by default; set `ROUTE_VERIFY_BASE` if you need a different port/host.

**What this does:**

- ✅ Validates environment variables
- ✅ Checks TypeScript compilation (`pnpm tsc --noEmit`)
- ✅ Runs HTTP route verification via `pnpm verify:routes:http`
- ✅ Executes unit tests (`pnpm test`)
- ✅ Provides summary of any failures

**Expected outcome:** All checks pass, confirming build and route accessibility.

---

### 2. Manual FM Workflow Testing ⏱️ 15-30 minutes

Start the development server and test each updated workflow:

```bash
pnpm dev
```

Then navigate to and test:

| Workflow        | URL                                       | Actions to Test                              |
| --------------- | ----------------------------------------- | -------------------------------------------- |
| **Assets**      | http://localhost:3000/fm/assets           | Create new asset, verify API accepts payload |
| **Audits**      | http://localhost:3000/fm/compliance       | Create audit plan, check submission          |
| **CRM Account** | http://localhost:3000/fm/crm              | Add account/lead, verify persistence         |
| **Payments**    | http://localhost:3000/fm/finance/payments | Record payment, check validation             |
| **Invoices**    | http://localhost:3000/fm/finance/invoices | Generate invoice, verify ZATCA compliance    |
| **Reports**     | http://localhost:3000/fm/reports          | Build custom report, export data             |

**For each workflow:**

1. Fill out the form with test data
2. Submit and verify no console errors
3. Check network tab shows 200/201 response
4. Confirm data appears in list view

**Known issues to watch for:**

- Type mismatches in Select components (should be fixed)
- Missing environment variables causing API failures
- Icon rendering issues (FileShield, ClipboardPlus replacements)

#### 🔁 Superadmin Support Context Smoke Test

Super admins now rely on the SupportOrgSwitcher (`TopBar → Select customer`). Before signing off:

1. Log in as a superadmin user.
2. Open the SupportOrgSwitcher, search by corporate ID, and pick a tenant.
3. Visit `/fm/finance/invoices`, `/fm/finance/payments`, `/fm/properties`, `/fm/system/integrations`, and `/fm/support/tickets/new`.
4. Confirm each page loads data/forms instead of the “Select a customer organization” guard, and that the support-context banner shows the chosen tenant.
5. Clear the support context and verify the guard reappears.

Document any failures (e.g., cookies not applied, APIs still reading the old org) so we can patch before release.

---

### 3. Navigation & Role Testing ⏱️ 10-15 minutes

Verify the sidebar navigation with different roles and subscription plans:

#### Test Case 1: Manager + Standard Plan

```bash
# In MongoDB or your admin panel:
# 1. Set user role to 'MANAGER' or 'FM_MANAGER'
# 2. Set org subscriptionPlan to 'STANDARD'
# 3. Log in and verify sidebar shows appropriate modules
```

**Expected modules for Manager + Standard:**

- ✅ Dashboard
- ✅ Work Orders
- ✅ Properties
- ✅ Support
- ❌ Finance (not in Standard plan)
- ❌ HR (not in Standard plan)

#### Test Case 2: Manager + Premium Plan

```bash
# Change org subscriptionPlan to 'PREMIUM'
# Re-login and check sidebar
```

**Expected modules for Manager + Premium:**

- ✅ All modules from Standard
- ✅ Finance
- ✅ HR
- ✅ CRM
- ✅ Marketplace
- ✅ Reports

**Verify:**

- Badges show correct counts (pending work orders, invoices)
- Sub-menu items are accessible
- No console errors when navigating
- Arabic translations work (if RTL enabled)

---

### 4. Run Notification Smoke Tests ⏱️ 2-5 minutes

**Only if NOTIFICATIONS_SMOKE_EMAIL is configured in .env.local**

```bash
# Test email notifications
pnpm tsx qa/notifications/run-smoke.ts --channel email

# Test multiple channels (if configured)
pnpm tsx qa/notifications/run-smoke.ts --channel email --channel sms

# Or use the full verification script
./scripts/verify-deployment-readiness.sh --full
```

**Expected outcome:**

- ✅ Notification sent successfully
- ✅ No integration errors
- ✅ Telemetry webhook called (if configured)

**To skip:** If notification env vars aren't set, this test will be skipped automatically.

---

### 5. CI/CD Pipeline Validation ⏱️ 5-10 minutes

#### Update GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

```yaml
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.com
MEILI_URL=https://your-meilisearch-instance.com # or MEILI_HOST for self-hosted
MEILI_MASTER_KEY=...
SENDGRID_API_KEY=...
ZATCA_API_KEY=...
ZATCA_API_SECRET=...
ZATCA_ENVIRONMENT=sandbox
```

> ℹ️ **Local build tip:** When running `pnpm build` on your laptop, make sure `MONGODB_URI` points to a valid MongoDB Atlas cluster. If you only need to validate the UI bundle and don't have Atlas credentials, export `DISABLE_MONGODB_FOR_BUILD=true` before running the build so the Mongo client wrapper short-circuits immediately instead of timing out.

#### Trigger Workflow

```bash
# Option 1: Push to trigger PR workflow
git add .
git commit -m "feat: complete route verification and navigation updates"
git push origin your-branch

# Option 2: Manual workflow dispatch (if configured)
# Go to Actions → route-quality.yml → Run workflow
```

**Expected outcome:**

- ✅ Build completes successfully
- ✅ Route verification passes
- ✅ No TypeScript errors
- ✅ All tests pass

**If CI fails:**

1. Check workflow logs for specific error
2. Compare with local verification results
3. Ensure all secrets are set correctly
4. Verify `.github/workflows/route-quality.yml` has correct env vars

---

### 6. Documentation Updates ⏱️ 5 minutes

Review and update if needed:

- ✅ `/docs/ROUTE_VERIFICATION_GUIDE.md` - Route verification documentation
- ✅ `/scripts/verify-deployment-readiness.sh` - Automated verification script
- ⚠️ `README.md` or deployment docs - Add note about managed MongoDB requirement

**Suggested addition to main README:**

```markdown
## Production Deployment Requirements

### Database

- **MongoDB Atlas** (or compatible cloud database)
- Local MongoDB URIs (`mongodb://localhost`) are rejected in production builds
- See `/docs/ROUTE_VERIFICATION_GUIDE.md` for setup instructions

### Environment Variables

All production deployments require:

- `MONGODB_URI` - Cloud MongoDB connection string
- `NEXTAUTH_SECRET` - Authentication secret (generate with `openssl rand -base64 32`)
- `MEILI_MASTER_KEY` - Meilisearch API key
- `ZATCA_API_KEY`, `ZATCA_API_SECRET` - Saudi e-invoicing compliance

See `.env.example` for complete list.
```

---

## Validation Checklist

Before proceeding to staging/production deployment:

- [ ] **Automated Verification Script** passes all checks
- [ ] **HTTP Route Verification** shows ~205 routes returning <400 (update this count if new pages land)
- [ ] **TypeScript Compilation** completes with no errors
- [ ] **Unit Tests** all pass (or failures documented/fixed)
- [ ] **FM Workflows** manually tested and working:
  - [ ] Assets creation
  - [ ] Audit planner
  - [ ] CRM account/lead
  - [ ] Finance payments
  - [ ] Finance invoices
  - [ ] Report builder
- [ ] **Navigation & Roles** verified for Manager + Standard/Premium plans
- [ ] **CI Pipeline** passes on GitHub Actions
- [ ] **Documentation** updated with MongoDB requirements

---

## Troubleshooting

### Script fails at TypeScript check

**Issue:** Pre-existing type errors in unrelated files

**Solution:**

```bash
# Identify specific errors
pnpm tsc --noEmit | grep "error TS" | head -20

# Fix errors or exclude files temporarily in tsconfig.json
```

### HTTP route verification times out

**Issue:** Server doesn't start or routes are slow

**Solution:**

```bash
# Check for port conflicts (verify:routes:http defaults to 4010)
lsof -ti:4010 | xargs kill -9

# Test server manually (Next.js defaults to 3000 when you run pnpm start)
pnpm build --no-lint
pnpm start

# Check specific route
curl http://localhost:3000/fm/dashboard
```

### FM workflows return 500 errors

**Issue:** API endpoints failing due to missing dependencies

**Solution:**

1. Check browser console for specific error
2. Verify MongoDB connection in server logs
3. Ensure all required env vars are set:
   ```bash
   grep -E "^[A-Z_]+=" .env.local | wc -l
   # Should show 20+ variables
   ```

### CI fails but local passes

**Issue:** GitHub secrets not set or incorrect

**Solution:**

1. Compare local `.env.local` with GitHub secrets
2. Check secret names match exactly (case-sensitive)
3. Verify no trailing spaces or quotes in secret values
4. Re-run workflow after updating secrets

---

## Success Criteria

Deployment is ready when:

1. ✅ Verification script exits with code 0
2. ✅ Latest HTTP crawl hits every discovered route (205 today) with <400 responses
3. ✅ TypeScript compiles without errors
4. ✅ Unit tests pass (or failures are documented exceptions)
5. ✅ FM workflows accept and persist data correctly
6. ✅ Navigation shows appropriate modules for roles/plans
7. ✅ CI pipeline passes on GitHub Actions
8. ✅ Documentation is up-to-date and accurate

---

## Support

For issues during verification:

1. **Check logs:**
   - `/tmp/route-verify.log` - Route verification output
   - `/tmp/tsc-check.log` - TypeScript compilation
   - `/tmp/test-output.log` - Unit test results

2. **Run individual checks:**

   ```bash
   pnpm tsc --noEmit           # TypeScript only
   pnpm verify:routes:http     # Routes only
   pnpm test                    # Tests only
   ```

3. **Review documentation:**
   - `/docs/ROUTE_VERIFICATION_GUIDE.md`
   - `/scripts/verify-deployment-readiness.sh` (inline comments)

4. **Check environment:**
   ```bash
   # Verify all required vars are set
   cat .env.local | grep -v "^#" | grep "="
   ```

---

## Timeline Estimate

| Step                   | Duration  | Can Run in Parallel   |
| ---------------------- | --------- | --------------------- |
| Automated Verification | 3-7 min   | No                    |
| FM Workflow Testing    | 15-30 min | After build           |
| Navigation Testing     | 10-15 min | With workflow testing |
| Notification Tests     | 2-5 min   | Optional              |
| CI Pipeline            | 5-10 min  | After push            |
| Documentation          | 5 min     | Any time              |

**Total:** 40-72 minutes for complete verification

**Fast path (skip tests):** 20-35 minutes

---

## Next Phase: Staging Deployment

Once all checklist items are complete:

1. Create deployment branch: `git checkout -b deploy/staging`
2. Tag release: `git tag -a v2.0.26-rc1 -m "Release candidate with navigation updates"`
3. Deploy to staging environment
4. Run smoke tests on staging URL
5. Monitor logs for 24 hours
6. Proceed to production if no issues

See deployment runbook for detailed staging/production procedures.
