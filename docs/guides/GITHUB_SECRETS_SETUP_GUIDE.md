# GitHub Secrets Setup Guide for Fixzit

**Created**: October 16, 2025  
**Status**: 🚀 Production Ready  
**Purpose**: Configure GitHub repository secrets for CI/CD automation and secure credential management

---

## 📋 Overview

This guide provides step-by-step instructions to configure all required GitHub repository secrets for the Fixzit application. These secrets enable:

- ✅ Automated CI/CD deployments
- ✅ Secure credential management
- ✅ E2E test automation
- ✅ Production environment configuration

---

## 🔐 Required Secrets

### 1. Core Database & Authentication

| Secret Name   | Description                          | Required | Example Value                                        |
| ------------- | ------------------------------------ | -------- | ---------------------------------------------------- |
| `MONGODB_URI` | MongoDB Atlas connection string      | ✅ Yes   | `mongodb+srv://user:pass@cluster.mongodb.net/fixzit` |
| `MONGODB_DB`  | Database name                        | ✅ Yes   | `fixzit`                                             |
| `JWT_SECRET`  | JWT token signing secret (32+ chars) | ✅ Yes   | Generate: `openssl rand -hex 32`                     |

### 2. Payment Gateway (Tap Payments - Saudi Arabia)

| Secret Name          | Description                    | Required    | Example Value          |
| -------------------- | ------------------------------ | ----------- | ---------------------- |
| `TAP_LIVE_SECRET_KEY` | Tap live secret key           | ✅ Yes      | `sk_live_...`          |
| `TAP_TEST_SECRET_KEY` | Tap test secret key           | ✅ Yes      | `sk_test_...`          |
| `TAP_WEBHOOK_SECRET`  | Tap webhook signing secret    | ✅ Yes      | `whsec_...`            |
| `NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY` | Tap live public key | ✅ Yes | `pk_live_...`          |
| `NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY` | Tap test public key | ✅ Yes | `pk_test_...`          |

### 3. AWS Services

| Secret Name             | Description                | Required    | Example Value          |
| ----------------------- | -------------------------- | ----------- | ---------------------- |
| `AWS_ACCESS_KEY_ID`     | AWS access key for S3/SES  | 📋 Optional | `AKIA...`              |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key      | 📋 Optional | `wJalrXUtn...`         |
| `AWS_REGION`            | AWS region                 | 📋 Optional | `me-south-1` (Bahrain) |
| `AWS_S3_BUCKET`         | S3 bucket for file uploads | 📋 Optional | `fixzit-uploads`       |

### 4. Email Services

| Secret Name        | Description                       | Required    | Example Value           |
| ------------------ | --------------------------------- | ----------- | ----------------------- |
| `SENDGRID_API_KEY` | SendGrid API key                  | 📋 Optional | `SG.xxx...`             |
| `EMAIL_HOST`       | SMTP host (if not using SendGrid) | 📋 Optional | `smtp.gmail.com`        |
| `EMAIL_USER`       | SMTP username                     | 📋 Optional | `your_email@domain.com` |
| `EMAIL_PASS`       | SMTP password                     | 📋 Optional | `app_specific_password` |

### 5. SMS Services (Twilio)

| Secret Name           | Description         | Required    | Example Value     |
| --------------------- | ------------------- | ----------- | ----------------- |
| `TWILIO_ACCOUNT_SID`  | Twilio account SID  | 📋 Optional | `AC...`           |
| `TWILIO_AUTH_TOKEN`   | Twilio auth token   | 📋 Optional | `auth_token_here` |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | 📋 Optional | `+966xxxxxxxxx`   |

### 6. Monitoring & Error Tracking

| Secret Name       | Description               | Required    | Example Value               |
| ----------------- | ------------------------- | ----------- | --------------------------- |
| `SENTRY_DSN`      | Sentry error tracking DSN | 📋 Optional | `https://xxx@sentry.io/xxx` |
| `DATADOG_API_KEY` | Datadog API key           | 📋 Optional | `api_key_here`              |

### 7. Public Environment Variables

| Secret Name                       | Description                       | Required    | Example Value       |
| --------------------------------- | --------------------------------- | ----------- | ------------------- |
| `NEXT_PUBLIC_APP_URL`             | Application public URL            | ✅ Yes      | `https://fixzit.sa` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key (client-side) | 📋 Optional | `AIza...`           |

---

## 🚀 Setup Instructions

### Method 1: Using GitHub Web Interface (Recommended)

1. **Navigate to Repository Settings**:
   - Go to `https://github.com/EngSayh/Fixzit`
   - Click **Settings** → **Secrets and variables** → **Actions**

2. **Add Repository Secrets**:
   - Click **New repository secret**
   - Enter **Name** (exactly as shown in tables above)
   - Enter **Secret** value
   - Click **Add secret**

3. **Repeat** for all required secrets

### Method 2: Using GitHub CLI (gh)

```bash
# Prerequisites
gh auth login

# Add secrets one by one
gh secret set MONGODB_URI --body "mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/fixzit?retryWrites=true&w=majority&appName=Fixzit"

gh secret set MONGODB_DB --body "fixzit"

gh secret set JWT_SECRET --body "$(openssl rand -hex 32)"

gh secret set TAP_LIVE_SECRET_KEY --body "sk_live_your_key_here"

gh secret set TAP_WEBHOOK_SECRET --body "whsec_your_secret_here"

gh secret set NEXT_PUBLIC_APP_URL --body "https://fixzit.sa"

# Add optional secrets as needed
gh secret set AWS_ACCESS_KEY_ID --body "your_aws_key"
gh secret set AWS_SECRET_ACCESS_KEY --body "your_aws_secret"
```

### Method 3: Using Environment File (Batch Upload)

Create a temporary file `secrets.txt` (DO NOT COMMIT):

```bash
# Create secrets file
cat > /tmp/secrets.txt << 'EOF'
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/fixzit?retryWrites=true&w=majority&appName=Fixzit
MONGODB_DB=fixzit
JWT_SECRET=your_32_plus_character_jwt_secret_here
TAP_LIVE_SECRET_KEY=sk_live_your_key
TAP_WEBHOOK_SECRET=whsec_your_secret
NEXT_PUBLIC_APP_URL=https://fixzit.sa
EOF

# Upload all secrets
while IFS='=' read -r key value; do
  gh secret set "$key" --body "$value"
done < /tmp/secrets.txt

# Remove secrets file immediately
rm /tmp/secrets.txt
```

---

## ✅ Verification

### 1. List All Secrets

```bash
# List configured secrets (values are hidden)
gh secret list
```

### 2. Test in GitHub Actions

Create a test workflow `.github/workflows/test-secrets.yml`:

```yaml
name: Test Secrets Configuration

on:
  workflow_dispatch:

jobs:
  test-secrets:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Test MongoDB Connection
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          MONGODB_DB: ${{ secrets.MONGODB_DB }}
        run: |
          node test_mongodb.js

      - name: Verify Secrets Exist
        run: |
          echo "Checking required secrets..."
          if [ -z "${{ secrets.MONGODB_URI }}" ]; then
            echo "❌ MONGODB_URI not set"
            exit 1
          fi
          echo "✅ MONGODB_URI is configured"

          if [ -z "${{ secrets.JWT_SECRET }}" ]; then
            echo "❌ JWT_SECRET not set"
            exit 1
          fi
          echo "✅ JWT_SECRET is configured"

          echo "✅ All required secrets are configured"
```

### 3. Run E2E Tests with Secrets

```bash
# Trigger E2E tests that use secrets
gh workflow run e2e-tests.yml
```

---

## 🔧 Current Configuration

### ✅ Configured Locally (.env.local)

The following secrets are currently configured in `.env.local` (not committed to git):

```bash
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/fixzit?retryWrites=true&w=majority&appName=Fixzit
MONGODB_DB=fixzit
```

> **⚠️ SECURITY NOTE**: The actual MongoDB credentials should NEVER be committed to the repository. Replace `YOUR_USERNAME`, `YOUR_PASSWORD`, and `YOUR_CLUSTER` with your real values only in `.env.local` and GitHub Secrets.

### 📋 Action Required

**You need to manually add these secrets to GitHub** because the GitHub CLI doesn't have permission to manage secrets in this repository. Follow **Method 1 (Web Interface)** above.

---

## 📚 GitHub Actions Workflow Examples

### Example 1: Deploy to Production

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Build application
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          MONGODB_DB: ${{ secrets.MONGODB_DB }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
        run: npm run build

      - name: Deploy to GoDaddy
        env:
          DEPLOY_KEY: ${{ secrets.GODADDY_DEPLOY_KEY }}
        run: |
          # Add deployment commands here
          echo "Deploying to GoDaddy..."
```

### Example 2: Run E2E Tests

```yaml
name: E2E Tests

on:
  pull_request:
  workflow_dispatch:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          MONGODB_DB: ${{ secrets.MONGODB_DB }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🔒 Security Best Practices

### ✅ DO

- ✅ Generate strong random secrets: `openssl rand -hex 32`
- ✅ Use GitHub Secrets for all sensitive data
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Use different secrets for dev/staging/production
- ✅ Limit secret access to required workflows only
- ✅ Review GitHub Actions logs for accidental secret exposure

### ❌ DON'T

- ❌ Never commit secrets to `.env.local` or `.env`
- ❌ Never log secret values in GitHub Actions
- ❌ Don't use the same secrets across multiple projects
- ❌ Don't share secrets via email or chat
- ❌ Don't use weak or predictable secrets

---

## 📖 Reference Documentation

- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [MongoDB Atlas Connection Strings](https://www.mongodb.com/docs/atlas/driver-connection/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Tap Payments Integration](https://developers.tap.company/)

---

## 🆘 Troubleshooting

### Issue: "gh secret set" returns 403 Forbidden

**Cause**: GitHub CLI doesn't have permission to manage secrets in this repository.

**Solution**: Use Method 1 (Web Interface) instead.

### Issue: Secrets not available in workflow

**Cause**: Secrets are only available to workflows from the same repository.

**Solution**: Ensure workflow is triggered from the same repository.

### Issue: MongoDB connection fails in GitHub Actions

**Cause**: MongoDB Atlas IP whitelist doesn't include GitHub Actions IPs.

**Solution**:

1. Go to MongoDB Atlas → Network Access
2. Add `0.0.0.0/0` (allow from anywhere) for GitHub Actions
3. Or use specific GitHub Actions IP ranges

---

## ✅ Completion Checklist

- [ ] All required secrets added to GitHub repository
- [ ] MongoDB connection tested from GitHub Actions
- [ ] E2E tests pass with GitHub Secrets
- [ ] Deployment workflow configured
- [ ] Secrets rotation schedule established
- [ ] Team members have appropriate access levels
- [ ] `.env.local` never committed to git (.gitignore verified)
- [ ] Documentation updated with any project-specific secrets

---

**Next Steps**:

1. Add all secrets to GitHub repository (Method 1 recommended)
2. Run verification workflow
3. Test deployment with secrets
4. Document any additional project-specific secrets
5. Set up secret rotation reminders (90 days)

---

**Report Generated**: October 16, 2025  
**Status**: ✅ Ready for Implementation  
**Maintainer**: Eng. Sultan Al Hassni (@EngSayh)
