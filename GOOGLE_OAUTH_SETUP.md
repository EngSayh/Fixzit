# 🔐 Google OAuth Configuration - Quick Start

## ⚠️ Current Status
Google OAuth credentials are **not yet configured** in your local environment files.

## 🚀 Quick Setup (5 minutes)

### Option 1: Automated Script (Recommended)
```bash
./scripts/setup-google-oauth.sh
```

This script will:
- ✅ Check your current configuration
- ✅ Prompt for your Google OAuth credentials
- ✅ Update both `.env.local` and `.env.test`
- ✅ Create backups of your files
- ✅ Verify the setup

### Option 2: Manual Setup

1. **Get Google OAuth credentials** from:
   https://console.cloud.google.com/apis/credentials

2. **Add to `.env.local`**:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
   ```

3. **Add to `.env.test`** (same credentials):
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
   ```

4. **Restart your server**:
   ```bash
   pnpm dev
   ```

## 📋 GitHub Secrets (for CI/CD)

Your GitHub Secrets are already configured:
- ✅ `GOOGLE_CLIENT_ID` 
- ✅ `GOOGLE_CLIENT_SECRET`

But they need to be added to your **local environment** too!

GitHub Secrets only work in CI/CD workflows. For local development and testing, you need the credentials in your `.env.local` and `.env.test` files.

## ✅ Verify Setup

After adding credentials, you should see:
```
✅ Google OAuth configured successfully.
```

Instead of:
```
⚠️  Google OAuth not configured. Only credentials authentication will be available.
```

## 📚 Full Documentation

For detailed setup instructions, see:
- [Google OAuth Setup Guide](./docs/GOOGLE_OAUTH_SETUP.md)
- [TypeScript Audit Report](./TYPESCRIPT_AUDIT_REPORT.md) - See "Authentication Configuration" section

## 🐛 Troubleshooting

**Still seeing warnings?**
1. Check file names: `.env.local` (not `.env.local.txt`)
2. Verify credentials are not empty
3. Restart dev server
4. Run: `grep GOOGLE .env.local` to verify

**Need help?**
```bash
cat docs/GOOGLE_OAUTH_SETUP.md
```

---

**Quick Commands:**
```bash
# Automated setup
./scripts/setup-google-oauth.sh

# Manual verification
grep GOOGLE .env.local .env.test

# Restart dev server
pnpm dev
```
