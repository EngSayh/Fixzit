# MASTER PENDING REPORT — Fixzit Project

**Last Updated**: 2025-12-10T14:00 +03:00  
**Version**: 3.0 (Consolidated from all prior pending reports)  
**Branch**: main  
**Status**: Active

---

## 🚨 CRITICAL - Production Blockers (USER ACTION REQUIRED)

### ISSUE-VERCEL-001: Production Environment Variables

**Status**: ⏳ PENDING USER ACTION

**Current Production Health** (as of 2025-12-10T10:42 UTC):
```json
{
  "mongodb": "error",
  "sms": "not_configured",
  "redis": "disabled",
  "email": "disabled"
}
```

**Required Actions in Vercel Dashboard → Settings → Environment Variables:**

| Variable | Action Required |
|----------|-----------------|
| `MONGODB_URI` | Remove `<>` placeholder brackets, add `/fixzit` database name |
| `TAQNYAT_BEARER_TOKEN` | Set the Taqnyat API bearer token |
| `TAQNYAT_SENDER_NAME` | Set sender name (e.g., `Fixzit`) |

**Correct MONGODB_URI Format:**
```
mongodb+srv://fixzitadmin:REAL_PASSWORD@fixzit.vgfiiff.mongodb.net/fixzit?retryWrites=true&w=majority&appName=Fixzit
```

**Verification Commands After Fix:**
```bash
curl -s https://fixzit.co/api/health/ready | jq '.checks'
# Expected: {"mongodb":"ok","redis":"disabled","email":"disabled","sms":"ok"}

curl -s https://fixzit.co/api/health
# Expected: {"status":"healthy",...}
```

---

## ✅ COMPLETED (December 2025 Session)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | PR #508 Merged | ✅ | Lazy env var loading, health check improvements |
| 2 | Translation Audit | ✅ | 31,179 keys, 100% EN/AR parity |
| 3 | [AR] Placeholders | ✅ | 37 fixed with proper Arabic |
| 4 | Missing Translation Keys | ✅ | 9 keys added |
| 5 | OTP Test Fix | ✅ | Salt behavior test corrected |
| 6 | Health Check SMS Status | ✅ | Added SMS provider status check |
| 7 | Lazy Env Var Loading | ✅ | `lib/mongo.ts` uses getter functions |
| 8 | Database Cleanup Script | ✅ | `scripts/clear-database-keep-demo.ts` created |
| 9 | ISSUES_REGISTER v2.3 | ✅ | Updated with all resolved issues |
| 10 | TypeCheck | ✅ | 0 errors |
| 11 | Lint | ✅ | 0 errors |
| 12 | API Tests | ✅ | 1885/1885 passing |
| 13 | Model Tests | ✅ | 91/91 passing |
| 14 | Ejar Font Inheritance Fix | ✅ | PR created for font fixes |

---

## 🟧 HIGH Priority

| # | Item | Status | Details | Owner |
|---|------|--------|---------|-------|
| H.1 | E2E Tests | 🔲 | `USE_DEV_SERVER=true pnpm test:e2e` | Agent |
| H.2 | GitHub Actions | ⚠️ | All workflows fail in 2-6s - runner/secrets issue | External |
| H.3 | Production SMS Health | ⏳ | Pending DB + SMS env vars | User |
| H.4 | Auth/JWT Secret Alignment | 🔲 | `AUTH_SECRET/NEXTAUTH_SECRET` identical across envs | Agent |
| H.5 | approveQuotation Tool | 🔲 | Missing in `server/copilot/tools.ts` | Agent |

---

## 🟨 MODERATE Priority

| # | Item | Status | Details |
|---|------|--------|---------|
| M.1 | AI Memory Population | 🔲 | 353 batches in `ai-memory/batches/`, master-index empty |
| M.2 | Dynamic Translation Keys | ⚠️ | 4 files use template literals - cannot be statically audited |
| M.3 | Mongo TLS Dry-Run Test | 🔲 | Assert `tls: true` for non-SRV URIs |
| M.4 | OpenAPI Spec Regeneration | 🔲 | Run `npm run openapi:build` |
| M.5 | UI/AppShell/Design Sweep | 🔲 | Standardize primitives, RTL spacing |
| M.6 | Payment Config | 🔲 | Set Tap secrets in prod |

### Dynamic Translation Key Files (Manual Review Required)
1. `app/fm/properties/leases/page.tsx`
2. `app/fm/properties/page.tsx`
3. `app/reports/page.tsx`
4. `components/admin/RoleBadge.tsx`

---

## 🟩 LOW Priority / Enhancements

| # | Item | Benefit |
|---|------|---------|
| L.1 | RTL CSS Audit | Run `pnpm lint:rtl` |
| L.2 | Console.log Cleanup | Search stray logs |
| L.3 | Test Speed Optimization | Add `--bail 1` |
| L.4 | setupTestDb Helper | Less boilerplate |
| L.5 | 3-Tier Health Status | healthy/degraded/unhealthy |
| L.6 | Taqnyat Unit Tests | Phone normalization, error masking |
| L.7 | OTP Failure Path Tests | When suites exist |

---

## 🔧 PROCESS IMPROVEMENTS

| # | Area | Current State | Improvement |
|---|------|---------------|-------------|
| P.1 | Pre-commit Hooks | Translation audit manual | Add `node scripts/audit-translations.mjs` |
| P.2 | CI/CD Health Smoke | Workflows broken | Add production health check after deploy |
| P.3 | Environment Validation | Runtime errors | Add startup script to validate env vars |
| P.4 | Database Connection Retry | Single attempt | Add exponential backoff for cold starts |
| P.5 | Test Speed | API tests ~140s | Increase parallelism, shared Mongo server |

---

## 📊 HISTORICAL ISSUE COUNTS (From Nov 2025 Scans)

### Resolved Categories ✅

| Category | Count | Status |
|----------|-------|--------|
| Implicit 'any' types | ~42 | ✅ Completed |
| Explicit 'any' types | 10 | ✅ Completed |
| console.log/error/warn | 225+ | ✅ Migrated to logger |
| parseInt without radix | 41 | ✅ Completed |
| PR Management | 110 | ✅ All merged |

### Outstanding Categories ⚠️

| Category | Count | Status |
|----------|-------|--------|
| TODO/FIXME comments | 34+ | 🔲 Not Started |
| Empty catch blocks | TBD | 🔲 Not Started |
| eslint-disable comments | TBD | 🔲 Not Started |
| new Date() in JSX | 47 | 🔲 Not Started |
| Date.now() in JSX | 20 | 🔲 Not Started |
| Dynamic i18n keys | 112+ | ⚠️ 4 documented, rest TBD |
| Duplicate files | 11 | 🔲 Not Started |
| Missing docstrings | ~669 | 🔲 Not Started |

---

## 🎯 EXECUTION ORDER

### Immediate (USER Required)
1. ⏳ Update `MONGODB_URI` in Vercel Dashboard
2. ⏳ Set `TAQNYAT_BEARER_TOKEN` and `TAQNYAT_SENDER_NAME`
3. ⏳ Verify production health: `curl https://fixzit.co/api/health`

### After Production Stable (Agent)
1. 🔲 Run E2E tests with `USE_DEV_SERVER=true`
2. 🔲 Investigate GitHub Actions runner issue
3. 🔲 Add `approveQuotation` tool to copilot
4. 🔲 Process AI memory batches

### Future Sprints
1. 🔲 Address Date hydration issues (67 instances)
2. 🔲 Address remaining dynamic i18n keys
3. 🔲 Clean up TODO/FIXME comments
4. 🔲 Add missing docstrings

---

## 📝 VERIFICATION COMMANDS

```bash
# Core verification
pnpm typecheck
pnpm lint
pnpm test:api
pnpm test:models

# E2E testing
USE_DEV_SERVER=true pnpm test:e2e

# Production health
curl -s https://fixzit.co/api/health | jq '.'
curl -s https://fixzit.co/api/health/ready | jq '.checks'

# Translation audit
node scripts/audit-translations.mjs

# AI Memory
node tools/smart-chunker.js
node tools/merge-memory.js
```

---

## 🔗 CONSOLIDATED FROM

This report supersedes and consolidates:
- `docs/archived/PENDING_ITEMS_REPORT.md`
- `docs/archived/PENDING_REPORT_2025-12-10T10-20-55Z.md`
- `docs/archived/PENDING_REPORT_2025-12-10T10-26-13Z.md`
- `docs/archived/PENDING_REPORT_2025-12-10T10-34-18Z.md`
- `docs/archived/PENDING_REPORT_2025-12-10T10-35-17Z.md`
- `docs/archived/PENDING_REPORT_2025-12-10T10-35-34Z.md`
- `docs/archived/DAILY_PROGRESS_REPORTS/2025-12-10_CONSOLIDATED_PENDING.md`
- `docs/archived/DAILY_PROGRESS_REPORTS/PENDING_TASKS_MASTER.md`
- `docs/audits/PENDING_TASKS_REPORT.md`

---

**Next Update**: After production health is verified stable
