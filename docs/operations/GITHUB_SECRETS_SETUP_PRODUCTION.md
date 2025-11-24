# GitHub Secrets Configuration Guide

## Production-Ready CI/CD Secrets Setup

This guide provides step-by-step instructions for configuring repository secrets for GitHub Actions workflows.

## Required Secrets

### 1. Database & Authentication

| Secret Name       | Description                                      | Required    | Example                                                                          |
| ----------------- | ------------------------------------------------ | ----------- | -------------------------------------------------------------------------------- |
| `MONGODB_URI`     | MongoDB connection string (Atlas or self-hosted) | ✅ Required | `mongodb+srv://user:pass@cluster.mongodb.net/fixzit?retryWrites=true&w=majority` |
| `NEXTAUTH_SECRET` | NextAuth.js session encryption key (32+ chars)   | ✅ Required | Generate: `openssl rand -base64 32`                                              |
| `JWT_SECRET`      | JWT signing secret (64 hex chars)                | ✅ Required | Generate: `openssl rand -hex 32`                                                 |
| `NEXTAUTH_URL`    | Production URL for NextAuth callbacks            | ✅ Required | `https://fixzit.yourdomain.com`                                                  |

### 2. External Services

| Secret Name                       | Description                    | Required    | Example                                 |
| --------------------------------- | ------------------------------ | ----------- | --------------------------------------- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key | 📋 Optional | `AIza...`                               |
| `GOOGLE_CLIENT_ID`                | Google OAuth 2.0 Client ID     | 📋 Optional | `123456-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`            | Google OAuth 2.0 Client Secret | 📋 Optional | `GOCSPX-...`                            |

### 3. Internal API

| Secret Name          | Description                                | Required       | Example                          |
| -------------------- | ------------------------------------------ | -------------- | -------------------------------- |
| `INTERNAL_API_TOKEN` | Token for internal service-to-service auth | ⚠️ Recommended | Generate: `openssl rand -hex 32` |

### 4. CI/CD (GitHub Actions Only)

| Secret Name    | Description                              | Required         | Example |
| -------------- | ---------------------------------------- | ---------------- | ------- |
| `GITHUB_TOKEN` | Automatically provided by GitHub Actions | ✅ Auto-provided | N/A     |

## Setup Instructions

### Option 1: GitHub Web UI (Recommended)

1. **Navigate to Repository Settings**

   ```
   GitHub.com → Your Repo → Settings → Secrets and variables → Actions
   ```

2. **Click "New repository secret"**

3. **Add each secret individually:**
   - Name: `MONGODB_URI`
   - Value: `mongodb+srv://...`
   - Click "Add secret"

4. **Repeat for all required secrets**

### Option 2: GitHub CLI (Faster)

```bash
# Install GitHub CLI if not already installed
# brew install gh  (macOS)
# sudo apt install gh  (Ubuntu/Debian)

# Authenticate
gh auth login

# Add secrets from environment variables
gh secret set MONGODB_URI --body "$MONGODB_URI"
gh secret set NEXTAUTH_SECRET --body "$NEXTAUTH_SECRET"
gh secret set JWT_SECRET --body "$JWT_SECRET"
gh secret set NEXTAUTH_URL --body "https://fixzit.yourdomain.com"

# Or add secrets interactively (paste value when prompted)
gh secret set MONGODB_URI
gh secret set GOOGLE_CLIENT_ID
gh secret set GOOGLE_CLIENT_SECRET

# Verify secrets were added
gh secret list
```

### Option 3: GitHub CLI from File

```bash
# Create .env.secrets file (DO NOT COMMIT THIS)
cat << 'EOF' > .env.secrets
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/fixzit
NEXTAUTH_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -hex 32)
NEXTAUTH_URL=https://fixzit.yourdomain.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
EOF

# Load and set secrets
set -a
source .env.secrets
set +a

gh secret set MONGODB_URI --body "$MONGODB_URI"
gh secret set NEXTAUTH_SECRET --body "$NEXTAUTH_SECRET"
gh secret set JWT_SECRET --body "$JWT_SECRET"
gh secret set NEXTAUTH_URL --body "$NEXTAUTH_URL"
gh secret set GOOGLE_CLIENT_ID --body "$GOOGLE_CLIENT_ID"
gh secret set GOOGLE_CLIENT_SECRET --body "$GOOGLE_CLIENT_SECRET"

# IMPORTANT: Delete the file after setting secrets
rm .env.secrets
```

## Workflow Integration

### Update Existing Workflows

Your workflows in `.github/workflows/` should reference secrets like this:

```yaml
# Example: .github/workflows/fixzit-quality-gates.yml
name: Quality Gates

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest

    env:
      # Reference secrets
      MONGODB_URI: ${{ secrets.MONGODB_URI }}
      NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
      JWT_SECRET: ${{ secrets.JWT_SECRET }}
      NEXTAUTH_URL: ${{ secrets.NEXTAUTH_URL }}
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: ${{ secrets.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run type check
        run: pnpm typecheck

      - name: Run linter
        run: pnpm lint

      - name: Run tests
        run: pnpm test
```

## Secret Generation Commands

### NEXTAUTH_SECRET (32+ characters)

```bash
openssl rand -base64 32
```

### JWT_SECRET (64 hex characters)

```bash
openssl rand -hex 32
```

### INTERNAL_API_TOKEN (64 hex characters)

```bash
openssl rand -hex 32
```

### Verify Secret Strength

```bash
# Check length of generated secret
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" | wc -c
# Should output: 45+ characters
```

## Security Best Practices

### 1. Never Commit Secrets

```bash
# Add to .gitignore
echo ".env.secrets" >> .gitignore
echo ".env.production" >> .gitignore
```

### 2. Rotate Secrets Regularly

- **High Priority**: Every 90 days
  - `JWT_SECRET`
  - `NEXTAUTH_SECRET`
  - `INTERNAL_API_TOKEN`

- **Medium Priority**: Every 180 days
  - OAuth client secrets
  - API keys

### 3. Use Different Secrets for Different Environments

```
Development:   .env.local (local machine, not committed)
Staging:       GitHub Secrets → staging-* secrets
Production:    GitHub Secrets → production-* secrets
```

### 4. Limit Secret Access

- Only add secrets needed for CI/CD
- Don't expose production secrets in development
- Use environment-specific secret names if needed

## Verification Checklist

After setting up secrets, verify:

- [ ] All required secrets added to repository
- [ ] Workflows updated to reference `${{ secrets.SECRET_NAME }}`
- [ ] No secrets hardcoded in workflow files
- [ ] `.env.secrets` file deleted (if created)
- [ ] Secrets not exposed in logs
- [ ] CI/CD pipeline runs successfully
- [ ] Production deployment uses secrets correctly

## Testing GitHub Secrets

### 1. Create Test Workflow

Create `.github/workflows/test-secrets.yml`:

```yaml
name: Test Secrets

on:
  workflow_dispatch: # Manual trigger only

jobs:
  test-secrets:
    runs-on: ubuntu-latest
    steps:
      - name: Check MongoDB URI exists
        run: |
          if [ -z "$MONGODB_URI" ]; then
            echo "❌ MONGODB_URI not set"
            exit 1
          else
            echo "✅ MONGODB_URI is set"
          fi
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}

      - name: Check NEXTAUTH_SECRET exists
        run: |
          if [ -z "$NEXTAUTH_SECRET" ]; then
            echo "❌ NEXTAUTH_SECRET not set"
            exit 1
          else
            echo "✅ NEXTAUTH_SECRET is set (length: ${#NEXTAUTH_SECRET})"
          fi
        env:
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}

      - name: Check JWT_SECRET exists
        run: |
          if [ -z "$JWT_SECRET" ]; then
            echo "❌ JWT_SECRET not set"
            exit 1
          else
            echo "✅ JWT_SECRET is set (length: ${#JWT_SECRET})"
          fi
        env:
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

### 2. Run Test Workflow

```bash
# Trigger manually from GitHub UI
Actions → Test Secrets → Run workflow

# Or use GitHub CLI
gh workflow run test-secrets.yml
```

## Common Issues

### Issue 1: Secret Not Available in Workflow

**Problem**: `${{ secrets.MY_SECRET }}` is empty in workflow

**Solution**:

1. Check secret name matches exactly (case-sensitive)
2. Verify secret is set at repository level (not environment level)
3. Re-add secret if needed

### Issue 2: Secret Exposed in Logs

**Problem**: Secret value appears in workflow logs

**Solution**:

```yaml
# ❌ Bad - exposes secret
- name: Debug
  run: echo "Secret is ${{ secrets.MY_SECRET }}"

# ✅ Good - masks secret
- name: Debug
  run: echo "Secret exists"
  env:
    MY_SECRET: ${{ secrets.MY_SECRET }}
```

### Issue 3: Workflow Can't Access Secret

**Problem**: Workflow fails with "Secret not found"

**Solution**:

- Check if running on fork (forks can't access secrets)
- Verify workflow has correct permissions
- Ensure secret isn't environment-specific

## Status: READY FOR PRODUCTION ✅

All required secrets documented. Follow steps above to configure GitHub repository secrets for CI/CD pipelines.

## Quick Reference

```bash
# Generate all secrets at once
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "INTERNAL_API_TOKEN=$(openssl rand -hex 32)"

# Set all secrets (paste values when prompted)
gh secret set MONGODB_URI
gh secret set NEXTAUTH_SECRET
gh secret set JWT_SECRET
gh secret set NEXTAUTH_URL
gh secret set GOOGLE_CLIENT_ID
gh secret set GOOGLE_CLIENT_SECRET
gh secret set INTERNAL_API_TOKEN

# Verify
gh secret list
```
