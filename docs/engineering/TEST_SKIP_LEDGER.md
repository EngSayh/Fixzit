# Test Skip Ledger

**Generated:** 2025-12-21
**Total Skip Markers:** 925

## Summary

| Category | Count | Status |
|----------|-------|--------|
| `describe.skip` (WIP test suites) | 909 | 📋 Documented |
| `test.skip` with credential guards | 9 | ✅ Intentional |
| `it.skip` / `test.skip` conditional | 16 | 📋 Documented |

---

## Classification

### ✅ Intentional Skips (Credential Guards)

These tests skip when environment credentials are not configured - **correct CI behavior**:

```
tests/e2e/auth.spec.ts - TEST_ADMIN_EMAIL/PASSWORD required
tests/e2e/health-endpoints.spec.ts - HEALTH_CHECK_TOKEN required
tests/e2e/critical-flows.spec.ts - TEST_CREDENTIALS required
tests/e2e/subrole-api-access.spec.ts - API credentials required
```

**Action:** None - proper CI gating

---

### 📋 WIP Test Suites (`describe.skip`)

These are test suites marked as work-in-progress. Example files:

| File | Reason |
|------|--------|
| `tests/api/vendors.route.test.ts` | WIP: Vendors API implementation pending |
| `tests/api/healthcheck.route.test.ts` | WIP: Healthcheck tests |
| `tests/api/reviews/reviews.route.test.ts` | WIP: Reviews API |

**Action:** Track in backlog, enable as features complete

---

### ⚠️ No `.only()` Found

```bash
rg -n "(describe|it|test)\.only\(" tests app server lib
# Output: (empty)
```

✅ **Verified:** No accidental `.only()` that would skip other tests

---

## Test Count Reconciliation

| Metric | Value |
|--------|-------|
| Test Files Passed | 494 |
| Test Files Skipped | 460 |
| Total Tests Passed | 3936 |
| Total Tests Skipped | 11 |
| Total Tests Todo | 54 |

The **460 skipped test files** are from `describe.skip` blocks in WIP test suites - not a quality concern.

---

## Recommendations

1. **Convert `describe.skip` to `describe.todo`** for clearer intent
2. **Create issues** for each WIP test suite to track completion
3. **Add CI check** to prevent `.only()` from being committed
4. **Monitor skip count** - alert if it increases unexpectedly

---

## Related Files

- `reports/tests.skip.txt` - Full grep output
- `reports/tests.only.txt` - Empty (verified clean)
