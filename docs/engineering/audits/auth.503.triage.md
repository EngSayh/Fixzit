# 503 Status Code Triage Report

**Generated:** 2025-12-21
**Total 503 Occurrences:** 28

## Classification Rules

| Status | When to Use |
|--------|-------------|
| ✅ **Correct 503** | Service genuinely unavailable (DB down, external API unreachable) |
| ❌ **Auth Masking** | Unauthenticated/forbidden requests returning 503 instead of 401/403 |
| ⚠️ **Review Needed** | Ambiguous cases requiring code review |

---

## Triage Results

### ✅ CORRECT: Service Availability Errors (Retryable)

| File | Line | Context | Verdict |
|------|------|---------|---------|
| `app/api/upload/presigned-url/route.ts` | 72 | Catch block after `getSessionUser()` throws non-auth error | ✅ Service failure, not auth |
| `app/api/files/resumes/[file]/route.ts` | 45, 124 | Catch block for auth service failure (DB down) | ✅ Correct |
| `app/api/vendor/apply/route.ts` | 73, 98 | Email/notification service unavailable | ✅ Correct |
| `app/api/notifications/route.ts` | 170 | Push notification service failure | ✅ Correct |
| `app/api/ats/jobs/public/route.ts` | 90 | External job board API failure | ✅ Correct |
| `app/api/trial-request/route.ts` | 177 | Health check failure | ✅ Correct |
| `app/api/fm/reports/process/route.ts` | 91, 215, 225 | Report generation service failure | ✅ Correct |
| `app/api/auth/reset-password/route.ts` | 122 | Email service unavailable | ✅ Correct |
| `app/api/auth/forgot-password/route.ts` | 114 | Email service unavailable | ✅ Correct |
| `app/api/fm/inspections/vendor-assignments/route.ts` | 107, 251 | Inspection service failure | ✅ Correct |
| `server/middleware/subscriptionCheck.ts` | 176-177 | Auth service failure (NOT auth failure) | ✅ Correct |
| `app/api/auth/test/session/route.ts` | 89, 113 | Test endpoint health check | ✅ Correct |
| `app/api/auth/otp/send/route.ts` | 590, 613, 845 | SMS/email OTP service unavailable | ✅ Correct |
| `app/api/auth/otp/verify/route.ts` | 177, 200 | OTP verification service failure | ✅ Correct |
| `app/api/auth/verify/send/route.ts` | 80 | Verification email service failure | ✅ Correct |
| `app/api/health/ready/route.ts` | 109, 123 | Readiness probe failure | ✅ Correct |
| `app/api/souq/search/route.ts` | 439 | Search service unavailable | ✅ Correct |

---

## Key Pattern Verification

All 503 occurrences follow this pattern:

```typescript
try {
  user = await getSessionUser(req);
} catch (error) {
  // Check if it's a known auth error → return 401
  if (isUnauthorizedError(error)) {
    return { status: 401, error: "Unauthorized" };
  }
  // Unknown error (DB down, network issue) → 503
  logger.error("[endpoint] Auth service failure", { error });
  return { status: 503, error: "Auth service unavailable" };
}
```

**Verdict:** ✅ **No auth masking detected.** All 503 usages are for genuine service availability issues, not authentication failures.

---

## Recommendations

1. **No immediate fixes required** - All 503 patterns are correct
2. **Consider retry headers** - Add `Retry-After` header for 503 responses
3. **Monitoring** - Alert on 503 spikes to detect real service outages

---

## Related Files

- `reports/auth.503.txt` - Raw grep output
- `server/middleware/subscriptionCheck.ts` - Key pattern reference
