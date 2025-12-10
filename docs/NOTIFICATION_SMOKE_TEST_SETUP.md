# 🔔 Notification Smoke Test Setup Guide

Complete guide for configuring and running end-to-end notification smoke tests across all channels (Push, Email, SMS, WhatsApp).

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Service-Specific Setup](#service-specific-setup)
4. [Running Smoke Tests](#running-smoke-tests)
5. [Troubleshooting](#troubleshooting)
6. [CI/CD Integration](#cicd-integration)

---

## 🔧 Prerequisites

### Required Services Account Setup

Before running smoke tests, you'll need accounts and API keys for:

- ✅ **MongoDB** - Running locally or Atlas (for storing FCM tokens)
- 🔥 **Firebase** - For Push Notifications ([console.firebase.google.com](https://console.firebase.google.com))
- 📧 **SendGrid** - For Email ([app.sendgrid.com](https://app.sendgrid.com))
- 📱 **Taqnyat** - For SMS ([taqnyat.sa](https://taqnyat.sa)) - CITC-compliant for Saudi Arabia
- 💬 **WhatsApp Business API** - For WhatsApp (via Meta)

### Test User Requirements

1. **MongoDB User Document** with valid `fcmTokens` array (for push testing)
2. **Valid Email Address** (for email testing)
3. **Valid Phone Number** in E.164 format (for SMS/WhatsApp testing)

---

## ⚙️ Environment Configuration

### Step 1: Copy Environment Template

The `.env.local` file has been pre-configured with all notification variables. Fill in your credentials:

```bash
# Open .env.local in your editor
code .env.local
```

### Step 2: Configure Common Smoke Test Settings

```bash
# === SMOKE TEST CONFIGURATION ===
# User ID from your MongoDB users collection
NOTIFICATIONS_SMOKE_USER_ID=507f1f77bcf86cd799439011

# Recipient name (for display in notifications)
NOTIFICATIONS_SMOKE_NAME=Ops On-Call

# Valid email address to receive test emails
NOTIFICATIONS_SMOKE_EMAIL=your-email@example.com

# Phone number in E.164 format (+[country code][number])
NOTIFICATIONS_SMOKE_PHONE=+966501234567

# Optional: Test work order data
NOTIFICATIONS_SMOKE_WORKORDER_ID=WO-TEST-001
NOTIFICATIONS_SMOKE_TENANT=Test Tenant Co.
```

---

## 🔥 Service-Specific Setup

### 1. Firebase Cloud Messaging (Push Notifications)

#### Get Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create new one)
3. Navigate to **Project Settings** ⚙️ → **Service Accounts**
4. Click **"Generate New Private Key"**
5. Download the JSON file

#### Configure in `.env.local`

```bash
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_MULTI_LINE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

⚠️ **Important:** Keep the `\n` newline characters in the private key string!

#### Prepare MongoDB User Document

Your test user **must** have FCM tokens in MongoDB:

```javascript
// MongoDB users collection
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "email": "test@example.com",
  "fcmTokens": [
    "dXYZ123abc...",  // Token from your mobile/web app
    "eFGH456def..."
  ]
}
```

**How to get FCM tokens:**

- Use Firebase SDK in your mobile/web app
- Call `messaging.getToken()` to get device token
- Store in user document via your app's token registration endpoint

---

### 2. SendGrid (Email Notifications)

#### Get API Key

1. Go to [SendGrid Dashboard](https://app.sendgrid.com)
2. Navigate to **Settings** → **API Keys**
3. Click **"Create API Key"**
4. Name: `Fixzit Notifications`
5. Permissions: **Mail Send** (Full Access)
6. Copy the generated key immediately (shown only once!)

#### Configure in `.env.local`

```bash
SENDGRID_API_KEY=SG.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
SENDGRID_FROM_EMAIL=noreply@fixzit.co
SENDGRID_FROM_NAME=Fixzit Notifications
```

#### Verify Sender Identity

**Important:** SendGrid requires sender verification!

1. Go to **Settings** → **Sender Authentication**
2. Option A: **Single Sender Verification** (quick, for testing)
   - Add `noreply@fixzit.co`
   - Verify via email link
3. Option B: **Domain Authentication** (production-ready)
   - Authenticate your domain with DNS records
   - Allows any `@fixzit.co` address

---

### 3. Taqnyat (SMS Notifications)

> **Note:** Taqnyat is the ONLY production SMS provider for Fixzit. It is CITC-compliant for Saudi Arabia.

#### Get Credentials

1. Go to [Taqnyat](https://taqnyat.sa)
2. Create an account or login
3. Navigate to **API Settings**
4. Generate a **Bearer Token**
5. Register a **Sender Name** (must be CITC-approved)

#### Configure in `.env.local`

```bash
TAQNYAT_BEARER_TOKEN=your_bearer_token_here
TAQNYAT_SENDER_NAME=Fixzit
```

#### Phone Number Format

- **International format WITHOUT + or 00 prefix:** `[country code][number]`
- **Examples:**
  - Saudi Arabia: `966501234567`
  - UAE: `971501234567`
  - Bahrain: `973xxxxxxxx`

#### Important Notes

- Max 1000 recipients per bulk request
- Sender name must be CITC-approved (8-11 alphanumeric characters)
- API Base URL: `https://api.taqnyat.sa/`

---

### 4. WhatsApp Business API

#### Option A: Meta WhatsApp Business Platform

1. Go to [Meta Business Suite](https://business.facebook.com)
2. Navigate to **WhatsApp** → **API Setup**
3. Get:
   - **Phone Number ID**
   - **WhatsApp Business API Key**

```bash
WHATSAPP_BUSINESS_API_KEY=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
```

#### Option B: Twilio WhatsApp API (Easier)

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Join sandbox via WhatsApp: Send code to `+1 415 523 8886`
4. Use same Twilio credentials as SMS:

```bash
# Reuse Twilio credentials
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token_here

# WhatsApp-specific
WHATSAPP_PHONE_NUMBER_ID=whatsapp:+14155238886
```

#### WhatsApp Template Messages

WhatsApp requires **pre-approved templates** for business messages. For testing:

- Use Twilio Sandbox (allows freeform messages to joined users)
- Or create/approve templates in Meta Business Manager

---

## 🚀 Running Smoke Tests

### Basic Usage

```bash
# Test specific channels
pnpm tsx qa/notifications/run-smoke.ts --channel email
pnpm tsx qa/notifications/run-smoke.ts --channel email --channel sms
pnpm tsx qa/notifications/run-smoke.ts --channel push --channel email --channel sms --channel whatsapp

# Test all configured channels
pnpm tsx qa/notifications/run-smoke.ts --channel email --channel sms --channel whatsapp --channel push
```

### Channel-Specific Tests

#### Email Only

```bash
pnpm tsx qa/notifications/run-smoke.ts --channel email
```

**Expected Output:**

```
Running Fixzit notification smoke test
Channels: email
Recipient: { userId: '507f...', email: 'test@example.com', phone: undefined }
Notification smoke test complete: {
  attempted: 1,
  succeeded: 1,
  failed: 0,
  skipped: 0,
  issues: []
}
```

#### SMS + WhatsApp

```bash
pnpm tsx qa/notifications/run-smoke.ts --channel sms --channel whatsapp
```

#### Push Notifications Only

```bash
pnpm tsx qa/notifications/run-smoke.ts --channel push
```

⚠️ **Note:** Push requires valid `fcmTokens` in MongoDB user document!

### Validation Before Running

The script validates environment variables before running:

```bash
# Missing credentials will produce clear errors:
❌ Missing required env vars for selected channels:
- email: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
- sms: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
```

### Expected Test Output

Successful smoke test output structure:

```json
{
  "attempted": 3, // Channels attempted
  "succeeded": 3, // Successful sends
  "failed": 0, // Failed sends
  "skipped": 0, // Skipped (missing config)
  "issues": [] // Error details (if any)
}
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Email Not Received

**Problem:** `succeeded: 1` but no email in inbox

**Solutions:**

- ✅ Check spam/junk folder
- ✅ Verify sender identity in SendGrid
- ✅ Check SendGrid Activity Feed for delivery status
- ✅ Verify `SENDGRID_FROM_EMAIL` matches verified sender

**Verify in SendGrid:**

```
Dashboard > Activity Feed > Search for NOTIFICATIONS_SMOKE_EMAIL
```

#### 2. SMS Not Sent (Twilio Trial)

**Problem:** `failed: 1` with "unverified number" error

**Solutions:**

- ✅ Add `NOTIFICATIONS_SMOKE_PHONE` to Twilio Verified Caller IDs
- ✅ Upgrade to paid Twilio account
- ✅ Ensure phone number is E.164 format (`+966...` not `05...`)

#### 3. Push Notification Failed

**Problem:** `skipped: 1` or `failed: 1` for push channel

**Solutions:**

- ✅ Ensure user document has `fcmTokens` array in MongoDB
- ✅ Verify Firebase credentials are correct
- ✅ Check `FIREBASE_ADMIN_PRIVATE_KEY` has `\n` preserved
- ✅ Ensure FCM token is valid (tokens expire after ~60 days)

**Verify MongoDB:**

```javascript
// In MongoDB shell or Compass
db.users.findOne({ _id: ObjectId("507f1f77bcf86cd799439011") });
// Should have: fcmTokens: ["dXYZ...", ...]
```

#### 4. WhatsApp Sandbox Not Working

**Problem:** WhatsApp messages not delivered

**Solutions:**

- ✅ Join Twilio WhatsApp sandbox (send code to `+1 415 523 8886`)
- ✅ Wait 1-2 minutes after joining before testing
- ✅ Use `whatsapp:+14155238886` format for sandbox number
- ✅ Check Twilio logs for delivery status

#### 5. Environment Variables Not Loaded

**Problem:** "Missing required env vars" even though `.env.local` is populated

**Solutions:**

- ✅ Ensure `.env.local` is in project root (next to `package.json`)
- ✅ Restart terminal/IDE after editing `.env.local`
- ✅ Check for syntax errors (no spaces around `=`)
- ✅ Use `dotenv/config` at top of script (already included)

**Verify environment loading:**

```bash
# Print loaded env vars (without sensitive values)
node -e "require('dotenv/config'); console.log(Object.keys(process.env).filter(k => k.includes('SENDGRID')))"
```

---

## 🏗️ CI/CD Integration

### GitHub Actions Example

```yaml
name: Notification Smoke Tests

on:
  push:
    branches: [main, develop]
  schedule:
    - cron: "0 8 * * *" # Daily at 8 AM UTC

jobs:
  smoke-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: pnpm install

      - name: Run notification smoke tests
        env:
          # Common
          NOTIFICATIONS_SMOKE_USER_ID: ${{ secrets.SMOKE_USER_ID }}
          NOTIFICATIONS_SMOKE_NAME: "CI Smoke Test"
          NOTIFICATIONS_SMOKE_EMAIL: ${{ secrets.SMOKE_EMAIL }}
          NOTIFICATIONS_SMOKE_PHONE: ${{ secrets.SMOKE_PHONE }}

          # Firebase
          FIREBASE_ADMIN_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          FIREBASE_ADMIN_CLIENT_EMAIL: ${{ secrets.FIREBASE_CLIENT_EMAIL }}
          FIREBASE_ADMIN_PRIVATE_KEY: ${{ secrets.FIREBASE_PRIVATE_KEY }}

          # SendGrid
          SENDGRID_API_KEY: ${{ secrets.SENDGRID_API_KEY }}
          SENDGRID_FROM_EMAIL: ${{ secrets.SENDGRID_FROM_EMAIL }}
          SENDGRID_FROM_NAME: "Fixzit CI"

          # Twilio
          TWILIO_ACCOUNT_SID: ${{ secrets.TWILIO_ACCOUNT_SID }}
          TWILIO_AUTH_TOKEN: ${{ secrets.TWILIO_AUTH_TOKEN }}
          TWILIO_PHONE_NUMBER: ${{ secrets.TWILIO_PHONE_NUMBER }}

          # WhatsApp
          WHATSAPP_BUSINESS_API_KEY: ${{ secrets.WHATSAPP_API_KEY }}
          WHATSAPP_PHONE_NUMBER_ID: ${{ secrets.WHATSAPP_PHONE_ID }}
        run: |
          pnpm tsx qa/notifications/run-smoke.ts --channel email --channel sms --channel whatsapp --channel push

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: smoke-test-results
          path: |
            smoke-test-output.log
```

### Setting GitHub Secrets

```bash
# Navigate to: Repository > Settings > Secrets and variables > Actions
# Add each secret:

SMOKE_USER_ID=507f1f77bcf86cd799439011
SMOKE_EMAIL=ops-oncall@fixzit.co
SMOKE_PHONE=+966501234567

FIREBASE_PROJECT_ID=fixzit-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@fixzit-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n

SENDGRID_API_KEY=SG.XXXXXXXXXXXXXXXX
SENDGRID_FROM_EMAIL=noreply@fixzit.co

TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567

WHATSAPP_API_KEY=EAAxxxxxxxxxxxx
WHATSAPP_PHONE_ID=123456789012345
```

---

## 📊 Monitoring & Alerts

### Optional: Send Results to Monitoring Service

Configure telemetry webhook in `.env.local`:

```bash
# Datadog Events API
NOTIFICATIONS_TELEMETRY_WEBHOOK=https://api.datadoghq.com/api/v1/events?api_key=YOUR_KEY

# PagerDuty Events API
NOTIFICATIONS_TELEMETRY_WEBHOOK=https://events.pagerduty.com/v2/enqueue
```

The smoke test script will POST results in this format:

```json
{
  "timestamp": "2025-11-17T14:30:00Z",
  "test": "notification-smoke",
  "status": "success",
  "metrics": {
    "attempted": 4,
    "succeeded": 4,
    "failed": 0,
    "skipped": 0
  },
  "channels": ["push", "email", "sms", "whatsapp"],
  "duration_ms": 3450
}
```

---

## ✅ Quick Start Checklist

- [ ] MongoDB running locally or connection to Atlas configured
- [ ] Test user created in MongoDB with valid `fcmTokens` (for push)
- [ ] Firebase project created, service account JSON downloaded
- [ ] SendGrid account created, API key generated, sender verified
- [ ] Twilio account created, phone number purchased, credentials copied
- [ ] WhatsApp Business API configured (or Twilio sandbox joined)
- [ ] `.env.local` populated with all credentials
- [ ] `NOTIFICATIONS_SMOKE_*` variables set with valid test recipient
- [ ] Ran: `pnpm tsx qa/notifications/run-smoke.ts --channel email` (first test)
- [ ] Verified email received in inbox
- [ ] Ran full test: `pnpm tsx qa/notifications/run-smoke.ts --channel email --channel sms --channel whatsapp --channel push`
- [ ] All channels show `succeeded: 1` in output

---

## 📚 Additional Resources

### Official Documentation

- **Firebase Admin SDK:** [firebase.google.com/docs/admin/setup](https://firebase.google.com/docs/admin/setup)
- **SendGrid API:** [docs.sendgrid.com/api-reference](https://docs.sendgrid.com/api-reference)
- **Twilio SMS API:** [twilio.com/docs/sms](https://www.twilio.com/docs/sms)
- **WhatsApp Business API:** [developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Twilio WhatsApp API:** [twilio.com/docs/whatsapp](https://www.twilio.com/docs/whatsapp)

### Internal Documentation

- `lib/integrations/notifications/README.md` - Notification system architecture
- `lib/fm-notifications.ts` - Type definitions and interfaces
- `scripts/notifications-smoke.ts` - Smoke test script source code

---

## 🆘 Support

If you encounter issues not covered in this guide:

1. **Check Logs:** The script outputs detailed error messages
2. **Service Status Pages:**
   - Firebase: [status.firebase.google.com](https://status.firebase.google.com)
   - SendGrid: [status.sendgrid.com](https://status.sendgrid.com)
   - Twilio: [status.twilio.com](https://status.twilio.com)
3. **Contact Team:** `#engineering-support` Slack channel
4. **Create Issue:** [github.com/fixzit/fixzit/issues](https://github.com/fixzit/fixzit/issues)

---

**Last Updated:** November 17, 2025  
**Version:** 1.0.0  
**Maintained By:** Engineering Team
