# 🚀 Notification Smoke Test - Quick Start

**5-minute setup guide** for running notification smoke tests.

---

## 📝 Step 1: Fill `.env.local` (2 minutes)

Open `.env.local` and populate these sections:

### Common Test Settings

```bash
NOTIFICATIONS_SMOKE_USER_ID=your_mongodb_user_id_here
NOTIFICATIONS_SMOKE_NAME=Ops On-Call
NOTIFICATIONS_SMOKE_EMAIL=your-test-email@example.com
NOTIFICATIONS_SMOKE_PHONE=+966501234567
```

### Email (SendGrid)

```bash
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@fixzit.co
SENDGRID_FROM_NAME=Fixzit Notifications
```

### SMS (Twilio)

```bash
TWILIO_ACCOUNT_SID=ACyour_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

### Push (Firebase)

```bash
FIREBASE_ADMIN_PROJECT_ID=your-firebase-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### WhatsApp

```bash
WHATSAPP_BUSINESS_API_KEY=your_whatsapp_api_key_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
```

### Telemetry (REQUIRED for monitoring)

```bash
# Choose one:
NOTIFICATIONS_TELEMETRY_WEBHOOK=https://api.datadoghq.com/api/v1/events?api_key=YOUR_KEY
# OR
NOTIFICATIONS_TELEMETRY_WEBHOOK=https://events.pagerduty.com/v2/enqueue
# OR
NOTIFICATIONS_TELEMETRY_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Note:** Without this, dispatch metrics won't reach your monitoring system.

---

## 🔑 Step 2: Get API Keys (1 minute each)

### SendGrid

1. Go to [app.sendgrid.com/settings/api_keys](https://app.sendgrid.com/settings/api_keys)
2. Click **Create API Key** → Name: `Fixzit Notifications` → **Mail Send** permission
3. Copy key → Paste into `SENDGRID_API_KEY`

### Twilio

1. Go to [console.twilio.com](https://console.twilio.com)
2. Copy **Account SID** and **Auth Token** from dashboard
3. Go to **Phone Numbers** → Copy your active number
4. Paste all three into `.env.local`

### Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Select project → **⚙️ Settings** → **Service Accounts**
3. Click **Generate New Private Key** → Download JSON
4. Copy `project_id`, `client_email`, `private_key` to `.env.local`

---

## ⚠️ Step 0: Validate Configuration (30 seconds)

**IMPORTANT:** Run validation before testing any channel:

```bash
pnpm tsx scripts/validate-notification-env.ts
```

This ensures all required variables are set correctly.

---

## ▶️ Step 3: Run Tests (30 seconds)

### Test Email Only (Easiest First Test)

```bash
pnpm tsx qa/notifications/run-smoke.ts --channel email
```

**Expected Output:**

```
✅ Notification smoke test complete: {
  attempted: 1,
  succeeded: 1,
  failed: 0,
  skipped: 0
}
```

### Test Multiple Channels

```bash
# Email + SMS
pnpm tsx qa/notifications/run-smoke.ts --channel email --channel sms

# All channels
pnpm tsx qa/notifications/run-smoke.ts --channel email --channel sms --channel whatsapp --channel push
```

---

## ❗ Common Issues

### Email Test Fails

**Error:** `Missing required env vars: SENDGRID_API_KEY`

**Fix:** Fill `SENDGRID_API_KEY` in `.env.local`, restart terminal

---

### Email Sent But Not Received

**Reason:** Sender not verified in SendGrid

**Fix:**

1. Go to [app.sendgrid.com/settings/sender_auth](https://app.sendgrid.com/settings/sender_auth)
2. Click **Verify Single Sender**
3. Add `noreply@fixzit.co` → Verify via email

---

### SMS Test Fails (Taqnyat)

**Error:** `Invalid Saudi phone number format` or `not configured`

**Fix:**

1. Ensure `TAQNYAT_BEARER_TOKEN` and `TAQNYAT_SENDER_NAME` are set
2. Use a Saudi mobile number in E.164 format (`+9665XXXXXXXX`)
3. If testing without live sends, set `SMS_DEV_MODE=true` to avoid provider calls

---

### Push Test Skipped

**Reason:** User in MongoDB has no FCM tokens

**Fix:** Add `fcmTokens` array to user document:

```javascript
db.users.updateOne(
  { _id: ObjectId("your_user_id") },
  { $set: { fcmTokens: ["dXYZ123abc..."] } },
);
```

Get FCM token from your mobile/web app using Firebase SDK.

---

## 📋 Pre-Flight Checklist

Before running smoke tests, ensure:

- [ ] `.env.local` exists in project root
- [ ] MongoDB is running (local or Atlas connection works)
- [ ] Test user ID exists in MongoDB (for `NOTIFICATIONS_SMOKE_USER_ID`)
- [ ] SendGrid sender verified (check spam if testing first time)
- [ ] Twilio number is active and verified (if using trial account)
- [ ] Phone numbers are E.164 format (`+966...` not `05...`)
- [ ] Terminal restarted after editing `.env.local`

---

## 🆘 Still Not Working?

**Full Setup Guide:** See `NOTIFICATION_SMOKE_TEST_SETUP.md` for detailed troubleshooting

**Quick Debug:**

```bash
# Verify environment variables loaded
node -e "require('dotenv/config'); console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Missing')"

# Check MongoDB connection
pnpm tsx -e "import mongoose from 'mongoose'; await mongoose.connect(process.env.MONGODB_URI); console.log('✅ MongoDB connected'); process.exit(0)"
```

---

## 📞 Support Contacts

- **Service Status:**
  - SendGrid: [status.sendgrid.com](https://status.sendgrid.com)
  - Twilio: [status.twilio.com](https://status.twilio.com)
  - Firebase: [status.firebase.google.com](https://status.firebase.google.com)

- **Team:** `#engineering-support` Slack channel

---

**Happy Testing! 🎉**
