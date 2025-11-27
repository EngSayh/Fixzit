# GitHub Actions Workflow Secrets Documentation

This document explains the secrets used in GitHub Actions workflows and why they're not required for local development.

## ⚠️ VSCode Warning Suppression

The warnings about missing secrets in VSCode's Problems tab are **expected and can be ignored** for local development. These secrets are only required when running in production CI/CD environments (GitHub Actions or Vercel).

## Secret Configuration

### Where to Configure Secrets

#### For GitHub Actions:
1. Navigate to your repository on GitHub
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Add the secrets listed below

#### For Vercel Deployment:
1. Navigate to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add the secrets with appropriate environment scope (Production/Preview/Development)

## Required Secrets by Workflow

### 1. Build & Upload Sourcemaps (`build-sourcemaps.yml`)

| Secret | Required | Purpose | How to Get |
|--------|----------|---------|------------|
| `SENTRY_AUTH_TOKEN` | Optional | Upload sourcemaps to Sentry for error tracking | Create at https://sentry.io/settings/account/api/auth-tokens/ |
| `SENTRY_ORG` | Optional | Your Sentry organization slug | Found in Sentry URL: `sentry.io/organizations/{org-slug}/` |
| `SENTRY_PROJECT` | Optional | Your Sentry project name | Found in Sentry project settings |

**Note:** Workflow continues without Sentry secrets. Sourcemaps are still generated and archived as artifacts.

### 2. Agent Governor CI (`agent-governor.yml`)

| Secret/Variable | Required | Purpose | How to Get |
|----------------|----------|---------|------------|
| `MONGODB_URI` | Optional | Database connection for builds | Use local MongoDB or fallback value provided |
| `NEXTAUTH_SECRET` | Optional | Session encryption key | Generated automatically or use: `openssl rand -base64 32` |
| `NEXTAUTH_URL` (var) | Required | Application base URL | Set to `http://localhost:3000` for local or your production URL |

**Note:** Build uses `SKIP_ENV_VALIDATION=true` and `DISABLE_MONGODB_FOR_BUILD=true` fallbacks.

### 3. PR Agent (`pr_agent.yml`)

| Secret | Required | Purpose | How to Get |
|--------|----------|---------|------------|
| `OPENAI_KEY` | Required | Power AI-driven code reviews | Create at https://platform.openai.com/api-keys |

**Note:** PR Agent only runs on pull requests when configured.

### 4. E2E Tests (`e2e-tests.yml`)

| Secret | Required | Purpose | How to Get |
|--------|----------|---------|------------|
| `NEXTAUTH_SECRET` | Required | Session encryption for test users | Generate with: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Optional | Enable Google OAuth in E2E tests | Create at https://console.cloud.google.com/apis/credentials |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Optional | Google OAuth secret | Found in Google Cloud Console credentials |
| `MONGODB_URI` | Optional | Test database connection | Uses containerized MongoDB service by default |

**Note:** Tests work without Google OAuth (skips OAuth-specific tests). For forked PRs, secrets are auto-generated.

## Local Development

### ❌ You DO NOT need these secrets for local development because:

1. **Local builds** use environment variables from `.env.local` or `.env`
2. **VSCode linting** of workflow files will show warnings - **this is expected and harmless**
3. **Workflows only run on GitHub Actions** servers, not locally
4. **Most secrets have fallback values** for CI builds

### ✅ For local development, you only need:

- `.env.local` file with your local database connection
- Local MongoDB instance or Docker container
- Node.js 20+ and pnpm 9+

### How to Suppress VSCode Warnings

VSCode will show warnings like:
```
Context access might be invalid: SENTRY_AUTH_TOKEN
Context access might be invalid: GOOGLE_OAUTH_CLIENT_SECRET
```

**These warnings are safe to ignore** because:
1. The workflows are designed to handle missing secrets gracefully
2. They include conditional checks: `if: ${{ env.SECRET_NAME != '' }}`
3. They use fallback values with `|| 'default-value'` syntax
4. They have `continue-on-error: true` for non-critical steps

To reduce noise in VSCode:
- These warnings don't affect local development
- They only appear in workflow YAML files
- The actual code has no errors

## Security Best Practices

### ✅ DO:
- Store secrets in GitHub Settings → Secrets (never in code)
- Use different secrets for production and staging
- Rotate secrets regularly (quarterly recommended)
- Use minimum required permissions for API tokens
- Review secret access in workflow logs (secrets are masked)

### ❌ DON'T:
- Commit secrets to `.env` files in git
- Share secrets in chat/email/documents
- Use production secrets in development
- Store secrets in environment variables on shared machines
- Log secret values (even partial values)

## Troubleshooting

### Workflow fails with "missing secret" error:
1. Verify secret is added in GitHub Settings → Secrets
2. Check secret name matches exactly (case-sensitive)
3. Ensure secret has a value (not empty)
4. For forked PRs, secrets are not available by design (security)

### Sentry upload fails:
- Workflow continues - this is non-critical
- Sourcemaps are still archived as artifacts
- Check `SENTRY_AUTH_TOKEN` has `project:write` scope

### Google OAuth tests skipped:
- Normal when `GOOGLE_CLIENT_ID` or `GOOGLE_OAUTH_CLIENT_SECRET` missing
- Tests will skip OAuth flows gracefully
- Set secrets to enable full OAuth testing

## Database Migration Scripts

### RBAC v4.1 Migration (`scripts/migrate-rbac-v4.1.ts`)

The STRICT v4.1 RBAC migration script is designed for production use with comprehensive safety features.

#### Usage

**Basic Migration** (Recommended):
```bash
npx ts-node scripts/migrate-rbac-v4.1.ts
```

**Dry-Run** (Preview changes without modifying database):
```bash
npx ts-node scripts/migrate-rbac-v4.1.ts --dry-run
```

**Custom Batch Size** (For large datasets > 50k users):
```bash
npx ts-node scripts/migrate-rbac-v4.1.ts --batch-size=1000
```

**Organization-Specific** (Multi-tenant):
```bash
npx ts-node scripts/migrate-rbac-v4.1.ts --org=abc123xyz
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--dry-run` | flag | false | Preview changes without modifying database |
| `--org=<id>` | string | all | Migrate only users from specific organization |
| `--batch-size=<n>` | number | 500 | Process N users per batch |

#### Environment Variables

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `MONGODB_URI` | ✅ Yes | Database connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `BATCH_SIZE` | ❌ No | Override default batch size | `1000` |

#### Features

**Transaction Safety**: All changes wrapped in MongoDB transaction with automatic rollback on error

**Batching**: Configurable batch size (default: 500 users) for large datasets

**Progress Tracking**: Real-time percentage, elapsed time, and ETA display

**Performance Metrics**: Duration, throughput (users/sec), batch timings, failed user IDs

#### Best Practices

**Before Running**:
1. ✅ Always run `--dry-run` first on staging
2. ✅ Create database backup
3. ✅ Verify MongoDB version >= 4.0
4. ✅ Schedule during low-traffic window

**After Migration**:
1. ✅ Verify statistics (updated count = total count)
2. ✅ Run test suite: `pnpm test tests/domain/fm.behavior.v4.1.test.ts`
3. ✅ Monitor error logs for 1 hour

#### Complete Guide

For comprehensive deployment instructions, rollback procedures, and troubleshooting, see:

📘 **[RBAC v4.1 Deployment Guide](./RBAC_V4_1_DEPLOYMENT.md)**

---

## Contact

For questions about secrets configuration:
- Check workflow files for inline comments
- Review GitHub Actions documentation: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- Contact DevOps team for production secret access

For questions about database migrations:
- Review the [Deployment Guide](./RBAC_V4_1_DEPLOYMENT.md)
- Check migration script comments: `scripts/migrate-rbac-v4.1.ts`
- Contact Platform Engineering team for production migrations

---

**Last Updated:** 2024
**Maintained By:** DevOps & Platform Engineering Teams
