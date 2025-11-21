# GitHub Secrets Setup Guide

**Date**: October 15, 2025  
**Status**: Manual setup required (GitHub CLI lacks permissions)

## SendGrid Configuration

### API Key Details

- **Service**: Twilio SendGrid
- **Account Type**: Trial (expires November 1, 2025)
- **API Key Name**: Fixzit App connection
- **Reputation**: 100%

### Required Secrets

#### 1. SENDGRID_API_KEY

```
SG.<your_sendgrid_api_key>
```

#### 2. FROM_EMAIL

```
noreply@fixzit.co
```

## How to Add Secrets Manually

### Via GitHub Web Interface

1. **Navigate to Repository Settings**
   - Go to: <https://github.com/EngSayh/Fixzit>
   - Click **Settings** tab
   - Click **Secrets and variables** → **Actions**

2. **Add SENDGRID_API_KEY**
   - Click **New repository secret**
   - Name: `SENDGRID_API_KEY`
   - Secret: `SG.<your_sendgrid_api_key>`
   - Click **Add secret**

3. **Add FROM_EMAIL**
   - Click **New repository secret**
   - Name: `FROM_EMAIL`
   - Secret: `noreply@fixzit.co`
   - Click **Add secret**

### Via GitHub CLI (Alternative)

If you have proper permissions on your local machine:

```bash
# Set SENDGRID_API_KEY
gh secret set SENDGRID_API_KEY \
  --body "SG.<your_sendgrid_api_key>" \
  --repo EngSayh/Fixzit

# Set FROM_EMAIL
gh secret set FROM_EMAIL \
  --body "noreply@fixzit.co" \
  --repo EngSayh/Fixzit
```

## Environment Variables for Local Development

Create `.env.local` file in project root (never commit this file):

```bash
# SendGrid Email Service
SENDGRID_API_KEY=SG.<your_sendgrid_api_key>
FROM_EMAIL=noreply@fixzit.co

# MongoDB Connection (to be configured)
MONGODB_URI=mongodb://localhost:27017/fixzit
```

## Verification

After adding secrets, verify they're accessible:

```bash
# List all repository secrets (won't show values)
gh secret list --repo EngSayh/Fixzit
```

Expected output:

```
SENDGRID_API_KEY  Updated YYYY-MM-DD
FROM_EMAIL        Updated YYYY-MM-DD
```

## Next Steps

1. ✅ **Add secrets via GitHub web interface** (recommended)
2. ⏳ **Install SendGrid SDK**: `pnpm add @sendgrid/mail`
3. ⏳ **Implement email service** in `app/api/support/welcome-email/route.ts`
4. ⏳ **Test email delivery** with real SendGrid account

## Security Notes

- ✅ Never commit secrets to Git
- ✅ Regenerate the SendGrid API key if you ever stored the real value in documentation; the key has been intentionally redacted here.
- ✅ Always use environment variables or GitHub Secrets
- ✅ Rotate API keys before production deployment
- ⚠️ Trial account expires Nov 1, 2025 - upgrade before production
- ✅ SendGrid reputation at 100% - maintain good sending practices

## Support

- SendGrid Dashboard: <https://app.sendgrid.com/>
- API Documentation: <https://docs.sendgrid.com/>
- Account: Trial - upgrade required before Nov 1, 2025
