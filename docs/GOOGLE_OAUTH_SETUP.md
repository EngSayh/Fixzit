# Google OAuth Setup Guide

## 🎯 Problem

You're seeing this warning in tests/development:

```
⚠️  Google OAuth not configured. Only credentials authentication will be available.
```

This happens because `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables are not set.

---

## ✅ Solution: Configure Google OAuth Credentials

### Step 1: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Sign in with your Google account

2. **Create/Select a Project**
   - Click "Select a project" → "New Project"
   - Name: `Fixzit Dev` (or your preferred name)
   - Click "Create"

3. **Configure OAuth Consent Screen**
   - Go to "OAuth consent screen" in left menu
   - User Type: Select "Internal" (for workspace users) or "External" (for public)
   - Click "Create"
   - Fill in:
     - App name: `Fixzit`
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Skip for now (click "Save and Continue")
   - Test users: Add your email if using External
   - Click "Save and Continue"

4. **Create OAuth 2.0 Client ID**
   - Go to "Credentials" in left menu
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: "Web application"
   - Name: `Fixzit Web Client`
   - **Authorized redirect URIs** - Add these:
     ```
     http://localhost:3000/api/auth/callback/google
     http://127.0.0.1:3000/api/auth/callback/google
     ```
     For production, also add:
     ```
     https://yourdomain.com/api/auth/callback/google
     ```
   - Click "Create"

5. **Copy Your Credentials**
   - You'll see a popup with:
     - **Client ID**: Something like `123456789-abc.apps.googleusercontent.com`
     - **Client Secret**: Something like `GOCSPX-abc123xyz`
   - **IMPORTANT**: Copy these immediately! You'll need them next.

---

### Step 2: Add Credentials to Local Environment

#### For Development (`.env.local`)

1. **Copy the example file** (if you haven't already):

   ```bash
   cd /Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit
   cp .env.example .env.local
   ```

2. **Edit `.env.local`**:

   ```bash
   # Using nano
   nano .env.local

   # Or using VS Code
   code .env.local
   ```

3. **Add your Google credentials**:

   ```env
   # Find the Google OAuth section and replace with your credentials:
   GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-actual-client-secret
   ```

4. **Save the file**:
   - nano: Press `Ctrl+X`, then `Y`, then `Enter`
   - VS Code: Press `Cmd+S`

#### For Testing (`.env.test`)

1. **Copy the test example file**:

   ```bash
   cp .env.test.example .env.test
   ```

2. **Edit `.env.test`** with the same Google credentials:

   ```bash
   nano .env.test
   ```

3. **Add your Google credentials**:

   ```env
   GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-actual-client-secret
   ```

4. **Save the file**

---

### Step 3: Add Credentials to GitHub Secrets (for CI/CD)

1. **Go to your GitHub repository**:
   - Navigate to: `https://github.com/YOUR_USERNAME/Fixzit`

2. **Open Settings → Secrets and variables → Actions**

3. **Add Repository Secrets**:
   - Click "New repository secret"
   - Name: `GOOGLE_CLIENT_ID`
   - Value: Your Client ID
   - Click "Add secret"
   - Click "New repository secret" again
   - Name: `GOOGLE_CLIENT_SECRET`
   - Value: Your Client Secret
   - Click "Add secret"

4. **Verify Secrets Are Set**:
   - You should see both secrets listed (values are hidden)
   - These will be automatically used in GitHub Actions workflows

---

### Step 4: Verify Configuration

#### Test Locally

1. **Restart your dev server**:

   ```bash
   pnpm dev
   ```

2. **Check the console** - You should see:

   ```
   ✅ Google OAuth configured successfully.
   ```

   Instead of:

   ```
   ⚠️  Google OAuth not configured.
   ```

3. **Test Google login**:
   - Visit: http://localhost:3000/login
   - You should see a "Sign in with Google" button
   - Click it to test OAuth flow

#### Test E2E Tests

1. **Run Playwright tests**:

   ```bash
   pnpm exec playwright test tests/specs/smoke.spec.ts --project="Mobile:AR:Tenant"
   ```

2. **Check for warnings** - Console should NOT show:
   ```
   ⚠️  Google OAuth not configured.
   ```

---

## 🔒 Security Best Practices

### ✅ DO:

- ✅ Keep separate credentials for **development** and **production**
- ✅ Add `.env.local` and `.env.test` to `.gitignore` (already done)
- ✅ Rotate secrets if accidentally committed to git
- ✅ Use different Google Cloud projects for dev/prod
- ✅ Restrict OAuth redirect URIs to your actual domains

### ❌ DON'T:

- ❌ **Never commit** `.env.local` or `.env.test` to git
- ❌ **Never share** your Client Secret publicly
- ❌ **Never use** production credentials in development
- ❌ **Never hardcode** credentials in source code

---

## 🐛 Troubleshooting

### Issue 1: "Google OAuth not configured" warning still appears

**Cause**: Environment variables not loaded

**Solutions**:

1. Verify file names are exact: `.env.local` (not `.env.local.txt`)
2. Restart your dev server (`Ctrl+C`, then `pnpm dev`)
3. Check file contents:
   ```bash
   grep GOOGLE .env.local
   ```
   Should show your credentials (not empty)

### Issue 2: "redirect_uri_mismatch" error

**Cause**: Redirect URI not authorized in Google Console

**Solution**:

1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add exact redirect URI:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. Click "Save"
5. Wait 5 minutes for changes to propagate

### Issue 3: CI tests still show warnings

**Cause**: GitHub Secrets not configured or not passed to workflow

**Solution**:

1. Verify secrets in GitHub: Settings → Secrets → Actions
2. Check workflow file uses secrets:
   ```yaml
   env:
     GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
     GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
   ```
3. Re-run the workflow

### Issue 4: "Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set"

**Cause**: Only one credential is set (partial configuration)

**Solution**:

- Either set **both** credentials, or remove **both** to use credentials-only auth
- Check both `.env.local` and `.env.test` files

---

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth Google Provider](https://next-auth.js.org/providers/google)
- [Fixzit Auth Documentation](./docs/AUTHENTICATION.md)

---

## 📝 Quick Reference

```bash
# Development
# File: .env.local
GOOGLE_CLIENT_ID=your-dev-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-dev-client-secret

# Testing
# File: .env.test
GOOGLE_CLIENT_ID=your-test-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-test-client-secret

# Production (Environment Variables)
GOOGLE_CLIENT_ID=your-prod-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-prod-client-secret

# GitHub Secrets (for CI/CD)
GOOGLE_CLIENT_ID → Repository secret
GOOGLE_CLIENT_SECRET → Repository secret
```

---

**Last Updated**: November 21, 2025  
**Status**: ✅ Ready for production deployment
