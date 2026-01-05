# Feature Gates Pattern

> **Last Updated:** 2026-01-05 by [AGENT-0022]

## Overview

Fixzit uses a **feature-gate pattern** to gracefully handle optional services and modules. When a feature's backing service is not configured, the API returns **HTTP 501 (Not Implemented)** with a clear error message—instead of crashing or returning misleading errors.

This is **intentional design**, not a bug.

## Why 501 Instead of 500?

| Status Code | Meaning | When Used |
|-------------|---------|-----------|
| **500** | Server Error | Something broke unexpectedly |
| **501** | Not Implemented | Feature is disabled or not configured |
| **503** | Service Unavailable | Temporary outage (retry later) |

Using 501 tells clients:
- The endpoint exists but is intentionally disabled
- This is a configuration issue, not a code bug
- No point retrying—configure the service first

## Feature Gate Categories

### 1. Storage (S3) Gates

**Affected Endpoints:**
- `POST /api/upload/presigned-url`
- `POST /api/upload/scan`
- `POST /api/upload/verify-metadata`
- `POST /api/files/resumes/presign`
- `POST /api/work-orders/[id]/attachments/presign`
- `POST /api/onboarding/[caseId]/documents/request-upload`

**Required Environment Variables:**
```env
AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
AWS_S3_BUCKET=<your-bucket-name>
AWS_REGION=<your-region>
```

**Production Status:** ✅ Configured in Vercel

**Local Development:** Optional. Only needed if testing file uploads.
- Use [LocalStack](https://localstack.cloud/) for local S3 emulation
- Or configure real AWS credentials in `.env.local`

---

### 2. Email (SendGrid) Gates

**Affected Endpoints:**
- `POST /api/support/welcome-email`
- Email notification routes

**Required Environment Variables:**
```env
SENDGRID_API_KEY=<your-sendgrid-key>
# OR legacy name:
SEND_GRID=<your-sendgrid-key>
```

**Production Status:** ✅ Configured in GitHub Secrets as `SEND_GRID`

**Local Development:** Optional. Only needed if testing email sending.
- Use [Mailtrap](https://mailtrap.io/) for email testing
- Or configure real SendGrid API key in `.env.local`

---

### 3. Module Feature Flags

**Marketplace Module:**
```env
MARKETPLACE_ENABLED=true
```

Affects:
- `GET/POST /api/marketplace/products`
- `GET /api/marketplace/categories`

**ATS Module:**
```env
ATS_ENABLED=true
```

Previously affected (now removed):
- ~~`GET /api/feeds/linkedin`~~ (deleted)
- ~~`GET /api/feeds/indeed`~~ (deleted)
- ~~`POST /api/integrations/linkedin/apply`~~ (deleted)

**Production Status:** ✅ Both enabled in Vercel

---

### 4. GraphQL API

**Affected Endpoints:**
- `POST /api/graphql`

**Requirement:** The `graphql-yoga` package must be installed.

**Status:** Optional feature. Not installed by default.

---

## Checking Configuration Status

### Via API (Development Only)

```bash
curl http://localhost:3000/api/dev/check-env
```

Returns which services are configured.

### Via Code

```typescript
import { isS3Configured } from "@/lib/storage/s3-config";
import { isMarketplaceEnabled } from "@/lib/marketplace/flags";

if (!isS3Configured()) {
  // Handle gracefully
}
```

---

## Adding New Feature Gates

When adding a new optional feature:

1. **Create a check function** in `lib/<feature>/flags.ts`:
   ```typescript
   export const isFeatureXEnabled = () =>
     process.env.FEATURE_X_ENABLED === "true";
   ```

2. **Guard the route** at the top of the handler:
   ```typescript
   if (!isFeatureXEnabled()) {
     return NextResponse.json(
       { error: "Feature X not available in this deployment" },
       { status: 501 }
     );
   }
   ```

3. **Document in `.env.example`** with the `⚠️ FEATURE-GATED` marker.

4. **Add to this file** in the appropriate category.

---

## Troubleshooting

### "I'm getting 501 locally but it works in production"

**Expected behavior.** Production (Vercel) has the secrets configured; your local environment doesn't.

**Fix:**
1. Check if you actually need to test that feature locally
2. If yes, add the required env vars to `.env.local`
3. If no, ignore the 501—it's working as designed

### "How do I know what's configured in production?"

```bash
# GitHub Secrets
gh secret list

# Vercel Environment Variables
vercel env ls
```

### "The scan found 15+ 501 issues—is this a problem?"

**No.** The scan correctly identified feature-gated endpoints. These are design decisions, not bugs. See the scan triage in `docs/PENDING_MASTER.md` for details.

---

## Related Documentation

- [.env.example](./../.env.example) — Environment variable reference
- [AWS Secrets Setup Guide](./AWS_SECRETS_SETUP_GUIDE.md) — S3 configuration
- [SendGrid Setup Checklist](./SENDGRID_SETUP_CHECKLIST.md) — Email configuration
