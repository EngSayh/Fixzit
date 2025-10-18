# Production E2E Test Secrets Management Guide

**Created:** October 16, 2025  
**Status:** ✅ Required for Production Testing  
**Security Level:** 🔴 Critical

---

## 🔒 Required Environment Variables

### All Required Variables

```bash
PRODUCTION_URL      # Production URL to test (e.g., https://fixzit-souq.com)
ADMIN_EMAIL         # Admin user email
ADMIN_PASSWORD      # Admin user password
PM_EMAIL            # Property Manager email
PM_PASSWORD         # Property Manager password
TENANT_EMAIL        # Tenant user email
TENANT_PASSWORD     # Tenant user password
VENDOR_EMAIL        # Vendor user email
VENDOR_PASSWORD     # Vendor user password
HR_EMAIL            # HR Manager email
HR_PASSWORD         # HR Manager password
```

### Automation-Only Secrets (CI/CD)

These secrets are **only required for automated workflows** (GitHub Actions rotation job, secret updates, etc.). They are **NOT** required for running the E2E tests manually.

```bash
# ADMIN_TOKEN - API authentication token for production password updates
# Type: JWT Bearer token or API key
# Purpose: Authenticates API calls that update user passwords during rotation
# Scopes/Roles Required:
#   - user:write or user:update permission
#   - Minimal scope: only password update endpoint access
#   - Should be a service account token, not a user's personal token
# Creation:
#   1. Create a dedicated service account in your production system
#   2. Assign ONLY password update permissions (no read/delete)
#   3. Generate API token via: /api/service-accounts/create-token
#   4. Store in GitHub Secrets as: ADMIN_TOKEN
# Security Best Practices:
#   - Rotate every 90 days (same schedule as user passwords)
#   - Use short-lived tokens if your API supports it (24-48 hour TTL)
#   - Monitor usage logs for unexpected API calls
#   - Revoke immediately if compromised

# REPO_ACCESS_TOKEN - GitHub token for updating repository secrets
# Type: GitHub Personal Access Token (PAT) or Fine-Grained PAT
# Purpose: Allows GitHub Actions to update repository secrets programmatically
# Required Permissions (Fine-Grained PAT Recommended):
#   - Repository: Secrets (Read and Write)
#   - Scope: Only this repository (not all repos)
# Minimal Scopes for Classic PAT:
#   - repo (full control of private repositories)
#   - Note: Classic PATs are broader; use Fine-Grained for least privilege
# Creation (Fine-Grained PAT - Recommended):
#   1. Go to: GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
#   2. Click "Generate new token"
#   3. Name: "E2E Secret Rotation Bot"
#   4. Expiration: 90 days (match rotation schedule)
#   5. Repository access: Only select "EngSayh/Fixzit"
#   6. Permissions → Repository → Secrets: Read and Write
#   7. Generate and copy token
#   8. Store in GitHub Secrets as: REPO_ACCESS_TOKEN
# Creation (Classic PAT - Alternative):
#   1. Go to: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
#   2. Generate with 'repo' scope
#   3. Store in GitHub Secrets as: REPO_ACCESS_TOKEN
# Security Best Practices:
#   - Rotate every 90 days (set expiration when creating)
#   - Use Fine-Grained PAT with minimal permissions (Secrets read/write only)
#   - Never commit this token to code or logs
#   - Use GitHub's built-in token scanning protection
#   - Consider using GitHub Apps instead for better auditability

# Usage in CI/CD:
#   - Used by: .github/workflows/rotate-secrets.yml
#   - ADMIN_TOKEN: Calls production API to update user passwords
#   - REPO_ACCESS_TOKEN: Updates GitHub Secrets with new passwords via actions-set-secret
#   - Both tokens should be stored as GitHub Repository Secrets
#   - Both should be rotated on the same 90-day schedule as user credentials
```

### Why All Variables Are Required

- ✅ **No hardcoded defaults** - Prevents credential exposure
- ✅ **Fail-fast validation** - Script exits immediately if any variable is missing
- ✅ **Clear error messages** - Shows exactly which variables are missing
- ✅ **Security by design** - Forces proper secrets management

---

## 🎯 Test Account Requirements

### Account Creation Checklist

#### 1. **Dedicated Test Accounts**

- [ ] Create separate accounts specifically for testing
- [ ] Use distinct email addresses (e.g., `test-admin@company.com`)
- [ ] Never use production admin or user accounts
- [ ] Document account purposes in your secrets manager

#### 2. **Permission-Scoped Accounts**

Each test account should have **minimal permissions**:

```
Admin Account:
  ✅ Read-only access to most resources
  ❌ No delete permissions
  ❌ No user management
  ✅ Dashboard access only

Property Manager:
  ✅ Read properties
  ✅ View work orders
  ❌ No financial access
  ❌ No system settings

Tenant:
  ✅ View own properties
  ✅ Submit requests
  ❌ No access to other tenants
  ❌ No admin features

Vendor:
  ✅ View assigned work orders
  ✅ Update work order status
  ❌ No financial data
  ❌ No property creation

HR Manager:
  ✅ View employees
  ✅ View attendance
  ❌ No payroll access
  ❌ No termination rights
```

#### 3. **Account Isolation**

- [ ] Test accounts in separate tenant/organization
- [ ] Limited data visibility
- [ ] Cannot affect production users
- [ ] Sandboxed environment if possible

---

## 🔐 Secrets Management Options

### Option 1: GitHub Secrets (Recommended for GitHub Actions)

#### Setup

```bash
# Navigate to your repository
# Go to: Settings → Secrets and variables → Actions → New repository secret

# Add each secret:
Name: PRODUCTION_URL
Value: https://your-production-url.com

Name: ADMIN_EMAIL
Value: test-admin@company.com

Name: ADMIN_PASSWORD
Value: <secure-password>

# Repeat for all 11 required variables
```

#### GitHub Actions Workflow

```yaml
# .github/workflows/production-e2e.yml
name: Production E2E Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:      # Manual trigger

jobs:
  test:
    runs-on: ubuntu-latest
    environment: production  # Use environment secrets
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Run Production E2E Tests
        env:
          PRODUCTION_URL: ${{ secrets.PRODUCTION_URL }}
          ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
          ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
          PM_EMAIL: ${{ secrets.PM_EMAIL }}
          PM_PASSWORD: ${{ secrets.PM_PASSWORD }}
          TENANT_EMAIL: ${{ secrets.TENANT_EMAIL }}
          TENANT_PASSWORD: ${{ secrets.TENANT_PASSWORD }}
          VENDOR_EMAIL: ${{ secrets.VENDOR_EMAIL }}
          VENDOR_PASSWORD: ${{ secrets.VENDOR_PASSWORD }}
          HR_EMAIL: ${{ secrets.HR_EMAIL }}
          HR_PASSWORD: ${{ secrets.HR_PASSWORD }}
        run: node scripts/testing/e2e-production-test.js
      
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-results
          path: e2e-test-results/
```

---

### Option 2: GitLab CI/CD Variables

#### Setup

```bash
# Navigate to: Settings → CI/CD → Variables

# Add each variable:
Key: PRODUCTION_URL
Value: https://your-production-url.com
Protected: ✅ Yes
Masked: ✅ Yes
Environment scope: production

# Repeat for all variables
```

#### GitLab CI Configuration

```yaml
# .gitlab-ci.yml
production-e2e:
  stage: test
  image: node:18
  environment:
    name: production
  only:
    - schedules
  script:
    - node scripts/testing/e2e-production-test.js
  artifacts:
    when: always
    paths:
      - e2e-test-results/
```

---

### Option 3: HashiCorp Vault

#### Setup

```bash
# Store secrets in Vault
vault kv put secret/e2e-production \
  PRODUCTION_URL="https://your-production-url.com" \
  ADMIN_EMAIL="test-admin@company.com" \
  ADMIN_PASSWORD="<secure-password>" \
  PM_EMAIL="test-pm@company.com" \
  PM_PASSWORD="<secure-password>" \
  TENANT_EMAIL="test-tenant@company.com" \
  TENANT_PASSWORD="<secure-password>" \
  VENDOR_EMAIL="test-vendor@company.com" \
  VENDOR_PASSWORD="<secure-password>" \
  HR_EMAIL="test-hr@company.com" \
  HR_PASSWORD="<secure-password>"
```

#### Retrieve and Use

```bash
#!/bin/bash
# scripts/testing/run-e2e-with-vault.sh

# Fetch secrets from Vault
SECRETS=$(vault kv get -format=json secret/e2e-production | jq -r '.data.data')

# Export as environment variables
export PRODUCTION_URL=$(echo $SECRETS | jq -r '.PRODUCTION_URL')
export ADMIN_EMAIL=$(echo $SECRETS | jq -r '.ADMIN_EMAIL')
export ADMIN_PASSWORD=$(echo $SECRETS | jq -r '.ADMIN_PASSWORD')
# ... export all variables

# Run tests
node scripts/testing/e2e-production-test.js
```

---

### Option 4: AWS Secrets Manager

#### Store Secrets

```bash
# Create secret
aws secretsmanager create-secret \
  --name production-e2e-credentials \
  --secret-string '{
    "PRODUCTION_URL": "https://your-production-url.com",
    "ADMIN_EMAIL": "test-admin@company.com",
    "ADMIN_PASSWORD": "<secure-password>",
    "PM_EMAIL": "test-pm@company.com",
    "PM_PASSWORD": "<secure-password>",
    "TENANT_EMAIL": "test-tenant@company.com",
    "TENANT_PASSWORD": "<secure-password>",
    "VENDOR_EMAIL": "test-vendor@company.com",
    "VENDOR_PASSWORD": "<secure-password>",
    "HR_EMAIL": "test-hr@company.com",
    "HR_PASSWORD": "<secure-password>"
  }'
```

#### Retrieve and Use

```bash
#!/bin/bash
# scripts/testing/run-e2e-with-aws.sh

# Fetch secret
SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id production-e2e-credentials \
  --query SecretString \
  --output text)

# Export variables
export $(echo $SECRET_JSON | jq -r 'to_entries|map("\(.key)=\(.value|tostring)")|.[]')

# Run tests
node scripts/testing/e2e-production-test.js
```

---

## 🔄 Secret Rotation Strategy

### Rotation Schedule

| Secret Type | Rotation Frequency | Method |
|-------------|-------------------|--------|
| All Passwords | **Every 90 days** | Automated via secrets manager |
| After incidents | **Immediate** | Manual emergency rotation |
| Team changes | **Within 24 hours** | Automated onboarding/offboarding |

### Rotation Process

#### Automated Rotation (Recommended)

```yaml
# GitHub Action for secret rotation
name: Rotate E2E Credentials

on:
  schedule:
    - cron: '0 0 1 */3 *'  # Every 3 months

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - name: Generate New Passwords
        run: |
          # Generate secure passwords
          NEW_ADMIN_PASS=$(openssl rand -base64 32)
          NEW_PM_PASS=$(openssl rand -base64 32)
          # ... generate all passwords
          
      - name: Update User Passwords in Production
        run: |
          # Call your API to update passwords
          curl -X POST "${{ secrets.PRODUCTION_URL }}/api/admin/update-password" \
            -H "Authorization: Bearer ${{ secrets.ADMIN_TOKEN }}" \
            -d "{ \"userId\": \"${{ secrets.ADMIN_USER_ID }}\", \"password\": \"$NEW_ADMIN_PASS\" }"
          
      - name: Update GitHub Secrets
        uses: hmanzur/actions-set-secret@v2.0.0
        with:
          name: 'ADMIN_PASSWORD'
          value: ${{ env.NEW_ADMIN_PASS }}
          repository: ${{ github.repository }}
          token: ${{ secrets.REPO_ACCESS_TOKEN }}
```

#### Manual Rotation

```bash
# 1. Generate new passwords
NEW_PASS=$(openssl rand -base64 32)

# 2. Update in production
# (via your user management interface)

# 3. Update in secrets manager
vault kv patch secret/e2e-production ADMIN_PASSWORD="$NEW_PASS"
# or
gh secret set ADMIN_PASSWORD --body "$NEW_PASS"
# or
aws secretsmanager update-secret \
  --secret-id production-e2e-credentials \
  --secret-string "$(echo $SECRET_JSON | jq ".ADMIN_PASSWORD=\"$NEW_PASS\"")"

# 4. Verify new credentials
node scripts/testing/e2e-production-test.js
```

---

## 📋 Security Checklist

### Before Running Tests

- [ ] All secrets stored in secrets manager (not in code)
- [ ] Test accounts created with minimal permissions
- [ ] Accounts isolated from production users
- [ ] Secret rotation schedule configured
- [ ] CI/CD pipeline configured with secrets
- [ ] Secrets masked in logs
- [ ] Access to secrets restricted to authorized personnel

### Regular Audits

- [ ] Monthly: Review test account permissions
- [ ] Quarterly: Rotate all passwords
- [ ] Annually: Review and update security policies
- [ ] After incidents: Immediate credential rotation

---

## ⚠️ Security Best Practices

### ✅ DO

- Use dedicated test accounts
- Store secrets in secrets managers
- Rotate credentials regularly
- Use minimal permissions
- Monitor for suspicious activity
- Mask secrets in logs
- Restrict access to secrets
- Use HTTPS for all connections

### ❌ DON'T

- Hardcode credentials in code
- Commit secrets to version control
- Use production admin accounts for testing
- Share credentials via email/chat
- Use same passwords across accounts
- Store secrets in plain text files
- Give test accounts full admin access
- Run tests against production with write access

---

## 🚨 Incident Response

### If Credentials Are Compromised

1. **Immediate Actions:**

   ```bash
   # 1. Disable compromised accounts
   # (via your admin interface)
   
   # 2. Generate new credentials
   NEW_PASS=$(openssl rand -base64 32)
   
   # 3. Update secrets immediately
   gh secret set ADMIN_PASSWORD --body "$NEW_PASS"
   
   # 4. Notify security team
   # 5. Review access logs
   ```

2. **Investigation:**
   - Review Git history for exposed secrets
   - Check CI/CD logs for credential exposure
   - Audit recent test runs
   - Review access logs for suspicious activity

3. **Prevention:**
   - Enable secret scanning (GitHub Advanced Security)
   - Add pre-commit hooks to detect secrets
   - Regular security training
   - Implement least-privilege access

---

## 📚 Additional Resources

### Tools

- **GitHub Secret Scanning**: Automatically detect exposed secrets
- **git-secrets**: Pre-commit hook to prevent secrets in commits
- **TruffleHog**: Find secrets in git history
- **Vault**: Enterprise secret management
- **AWS Secrets Manager**: Cloud-native secrets
- **Azure Key Vault**: Azure secrets management

### Documentation

- GitHub Secrets: <https://docs.github.com/en/actions/security-guides/encrypted-secrets>
- GitLab Variables: <https://docs.gitlab.com/ee/ci/variables/>
- HashiCorp Vault: <https://www.vaultproject.io/docs>
- AWS Secrets Manager: <https://docs.aws.amazon.com/secretsmanager/>

---

## 🎯 Quick Start

### For GitHub Actions

```bash
# 1. Add secrets to GitHub
gh secret set PRODUCTION_URL
gh secret set ADMIN_EMAIL
gh secret set ADMIN_PASSWORD
# ... add all 11 secrets

# 2. Create workflow file
# Copy the GitHub Actions example above to .github/workflows/production-e2e.yml

# 3. Test manually
gh workflow run production-e2e.yml
```

### For Local Testing

```bash
# 1. Create .env.production file (gitignored!)
cat > .env.production << 'EOF'
PRODUCTION_URL=https://your-url.com
ADMIN_EMAIL=test-admin@company.com
ADMIN_PASSWORD=your-secure-password
# ... all variables
EOF

# 2. Load and run
source .env.production
node scripts/testing/e2e-production-test.js
```

---

*Security Guide Created: October 16, 2025*  
*Last Updated: October 16, 2025*  
*Status: Production-Ready ✅*
