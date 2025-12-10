# 🔐 Notification Credentials - Quick Reference Guide

## ⚡ Quick Start (Choose One Method)

### Method 1: Interactive Setup (Recommended)

```bash
bash scripts/setup-notification-credentials.sh
```

### Method 2: Manual Setup (Copy-paste into .env.local)

Edit `.env.local` and add these values:

---

## 📋 Step 1: Common Settings (REQUIRED for all tests)

```bash
# Get user ID from MongoDB
NOTIFICATIONS_SMOKE_USER_ID=<paste_mongodb_user_id>
NOTIFICATIONS_SMOKE_NAME=Test User
NOTIFICATIONS_SMOKE_EMAIL=<your_email@example.com>
NOTIFICATIONS_SMOKE_PHONE=<+966501234567>
```

**How to get user ID:**

```bash
# Option A: Use mongosh
mongosh "mongodb://localhost:27017/fixzit" --eval 'db.users.findOne({}, {_id: 1, email: 1})'

# Option B: Check your database UI (MongoDB Compass, Studio 3T)
# Look for _id field in users collection
```

---

## 📧 Step 2: Email via SendGrid (Optional - for email tests)

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@fixzit.co
SENDGRID_FROM_NAME=Fixzit Notifications
```

**Get API Key:**

1. Go to https://app.sendgrid.com/settings/api_keys
2. Click "Create API Key"
3. Name: `Fixzit Notifications`
4. Permissions: **Mail Send** (Full Access)
5. Copy the key (starts with `SG.`)

**Test command:**

```bash
pnpm tsx qa/notifications/run-smoke.ts --channel email
```

---

## 📱 Step 3: SMS via Taqnyat (Required for SMS)

```bash
TAQNYAT_BEARER_TOKEN=your_taqnyat_api_token
TAQNYAT_SENDER_NAME=YOUR_REGISTERED_SENDER
```

**Get Credentials:**

1. Go to https://www.taqnyat.sa
2. Generate an API token
3. Use your CITC-approved sender name

**Test command:**

```bash
pnpm tsx qa/notifications/run-smoke.ts --channel sms
```

---

## 🔔 Step 4: Push via Firebase (Optional - for push tests)

```bash
FIREBASE_ADMIN_PROJECT_ID=your-firebase-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...\n-----END PRIVATE KEY-----\n"
```

**Get Service Account:**

1. Go to https://console.firebase.google.com
2. Select your project
3. Click ⚙️ **Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download JSON file
6. Copy values from JSON:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY` (keep \n newlines!)

**Important:** User must have `fcmTokens` array in MongoDB for push to work!

**Test command:**

```bash
pnpm tsx qa/notifications/run-smoke.ts --channel push
```

---

## 💬 Step 5: WhatsApp Business (Optional - for WhatsApp tests)

```bash
WHATSAPP_BUSINESS_API_KEY=your_whatsapp_api_key_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
```

**Get Credentials:**

1. Go to https://business.facebook.com
2. Select your business
3. Go to **WhatsApp** → **API Setup**
4. Copy **API Key** and **Phone Number ID**

**Test command:**

```bash
pnpm tsx qa/notifications/run-smoke.ts --channel whatsapp
```

---

## 📊 Step 6: Telemetry Webhook (REQUIRED - for monitoring)

```bash
NOTIFICATIONS_TELEMETRY_WEBHOOK=https://your-monitoring-service.com/webhook
```

**⚠️ IMPORTANT:** Without this webhook, dispatch metrics won't reach your monitoring system. Operations teams won't see alerts in Datadog/PagerDuty/Slack.

**Supported Services:**

- **Datadog Events API:** `https://api.datadoghq.com/api/v1/events?api_key=YOUR_KEY`
- **PagerDuty Events v2:** `https://events.pagerduty.com/v2/enqueue`
- **Slack Incoming Webhook:** `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`

---

## ✅ Verification Steps

### 1. Validate Configuration

```bash
pnpm tsx scripts/validate-notification-env.ts
```

**Expected Output:**

```
🔍 Notification Environment Validation
═══════════════════════════════════════

✅ Common (All Channels)    [READY]     4/4 variables configured
✅ Email (SendGrid)          [READY]     3/3 variables configured
✅ SMS (Twilio)             [READY]     3/3 variables configured
✅ Push (Firebase)          [READY]     3/3 variables configured
✅ WhatsApp                 [READY]     2/2 variables configured

🎯 Status: 5/5 channels ready for testing
```

### 2. Run Individual Channel Tests

```bash
# Test email only (easiest to set up)
pnpm tsx qa/notifications/run-smoke.ts --channel email

# Test SMS
pnpm tsx qa/notifications/run-smoke.ts --channel sms

# Test multiple channels
pnpm tsx qa/notifications/run-smoke.ts --channel email --channel sms

# Test all channels
pnpm tsx qa/notifications/run-smoke.ts --channel email --channel sms --channel whatsapp --channel push
```

### 3. Check Results

- ✅ **Email:** Check inbox for notification
- ✅ **SMS:** Check phone for text message
- ✅ **Push:** Check device for push notification
- ✅ **WhatsApp:** Check WhatsApp for business message

---

## 🚨 Common Issues & Fixes

### Issue 1: "NOT-CONFIGURED" errors

**Problem:** Missing environment variables

**Fix:**

1. Check `.env.local` has the variables
2. Restart terminal/VS Code to reload environment
3. Run validation again: `pnpm tsx scripts/validate-notification-env.ts`

---

### Issue 2: SendGrid 401 Unauthorized

**Problem:** Invalid API key

**Fix:**

1. Verify key starts with `SG.`
2. Check key has **Mail Send** permission
3. Key must not be revoked in SendGrid dashboard

---

### Issue 3: Twilio 20003 Authentication Error

**Problem:** Invalid credentials

**Fix:**

1. Verify Account SID starts with `AC`
2. Check Auth Token is correct (32 chars)
3. Account must be active (not suspended)

---

### Issue 4: Firebase 403 Forbidden

**Problem:** Invalid service account or permissions

**Fix:**

1. Download new service account JSON
2. Ensure `private_key` has `\n` newlines preserved
3. Check Firebase project is active

---

### Issue 5: User not found in MongoDB

**Problem:** Invalid `NOTIFICATIONS_SMOKE_USER_ID`

**Fix:**

```bash
# Find a valid user ID
mongosh "mongodb://localhost:27017/fixzit" --eval '
  db.users.findOne(
    { role: "SUPER_ADMIN" },
    { _id: 1, email: 1, "contact.phone": 1 }
  )
'
```

---

## 📚 Additional Documentation

- **Full Setup Guide:** `NOTIFICATION_SMOKE_TEST_SETUP.md` (12,500 words, comprehensive)
- **Quick Start:** `NOTIFICATION_SMOKE_TEST_QUICKSTART.md` (5-minute version)
- **Implementation Docs:** `NOTIFICATION_SETUP_COMPLETE.md` (architecture overview)

---

## 🎯 Minimal Setup for Quick Testing

**Just want to test email?** Only need 4 variables:

```bash
# .env.local (minimum for email testing)
NOTIFICATIONS_SMOKE_USER_ID=673a24e7c1b2d3e4f5a6b7c8
NOTIFICATIONS_SMOKE_EMAIL=your-email@example.com
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@fixzit.co
```

Then run:

```bash
pnpm tsx qa/notifications/run-smoke.ts --channel email
```

---

**Last Updated:** November 17, 2025  
**Status:** Ready for credential population  
**Estimated Setup Time:** 5-10 minutes per service
