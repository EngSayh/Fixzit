# Communication Logs QA Test Plan

**Date:** November 16, 2025  
**Purpose:** Verify SMS OTP login flow and admin broadcast functionality with full `communication_logs` tracking  
**Environment:** Staging  
**Prerequisites:** MongoDB access, Twilio configured, Super Admin credentials

---

## 📋 Test Overview

This QA plan verifies that all communication events (OTP sends, admin broadcasts) are properly logged to the `communication_logs` MongoDB collection with complete metadata.

---

## 🧪 Test 1: SMS OTP Login Journey (Full Flow)

### Objective
Verify that OTP send, resend, and verification events are logged with correct status transitions.

### Prerequisites
- Valid user account with phone number in staging
- Phone number in Twilio verified list (or production Twilio account)
- Access to MongoDB staging database

### Test Steps

#### Step 1.1: Initial OTP Send
1. Navigate to staging login page: `https://staging.fixzit.com/login`
2. Enter valid credentials:
   - **Email or Employee Number:** `test.user@fixzit.com` (or `EMP001`)
   - **Password:** `[your test password]`
3. Click **"Sign in with SMS OTP"**
4. **Expected Result:**
   - Success message: "OTP sent to ****1234"
   - No console errors
   - SMS received on phone

#### Step 1.2: Verify Initial OTP Log Entry
Run this MongoDB query:

```javascript
db.communication_logs.find({
  recipient: "+966501234567", // Replace with actual phone
  channel: "otp",
  type: "otp"
}).sort({ createdAt: -1 }).limit(1).pretty()
```

**Expected Fields:**
```json
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "channel": "otp",
  "type": "otp",
  "recipient": "+966501234567",
  "subject": "Login verification OTP",
  "message": "SMS OTP login requested for test.user@fixzit.com",
  "status": "sent",
  "metadata": {
    "phone": "+966501234567",
    "otpExpiresAt": ISODate("2025-11-16T12:15:00.000Z"),
    "otpAttempts": 3,
    "rateLimitRemaining": 4,
    "identifier": "test.user@fixzit.com"
  },
  "createdAt": ISODate("2025-11-16T12:10:00.000Z"),
  "sentAt": ISODate("2025-11-16T12:10:00.123Z")
}
```

✅ **Pass Criteria:**
- Log entry exists
- `status: "sent"`
- `sentAt` timestamp present
- `metadata.identifier` matches login identifier
- `metadata.rateLimitRemaining` is 4 (5 max - 1 send)

---

#### Step 1.3: Resend OTP
1. On OTP input screen, click **"Resend code"**
2. **Expected Result:**
   - Success message: "New OTP sent"
   - New SMS received

#### Step 1.4: Verify Resend Log Entry
Run this query:

```javascript
db.communication_logs.find({
  recipient: "+966501234567",
  channel: "otp"
}).sort({ createdAt: -1 }).limit(2).pretty()
```

**Expected Result:**
- **2 log entries** (original + resend)
- Newest entry has `metadata.rateLimitRemaining: 3` (5 max - 2 sends)
- Different `createdAt` timestamps (≥5 seconds apart)

✅ **Pass Criteria:**
- 2 distinct log entries
- Both `status: "sent"`
- Rate limit decremented correctly

---

#### Step 1.5: Enter OTP and Complete Login
1. Enter the **latest OTP code** (from resend SMS)
2. Click **"Verify"**
3. **Expected Result:**
   - Successfully logged in
   - Redirected to `/dashboard`

#### Step 1.6: Verify No Additional Logs for Verification
Run this query:

```javascript
db.communication_logs.find({
  recipient: "+966501234567",
  channel: "otp"
}).count()
```

**Expected Result:**
- **Count: 2** (send + resend only)
- Verification does NOT create a new log entry (it only validates the existing OTP)

✅ **Pass Criteria:**
- Total 2 OTP logs (not 3)
- No "verification" log entry

---

### Test 1 Summary Table

| Test Case | Expected Logs | Status Field | Metadata Keys |
|-----------|---------------|--------------|---------------|
| Initial OTP Send | 1 | `sent` | `rateLimitRemaining: 4` |
| Resend OTP | 2 total | `sent` | `rateLimitRemaining: 3` |
| Verify OTP | 2 total (no new) | N/A | N/A |

---

## 🧪 Test 2: Admin Broadcast via Dashboard

### Objective
Verify that admin broadcast creates individual log entries for each recipient × channel combination, and that the dashboard displays them correctly.

### Prerequisites
- Super Admin account credentials
- Access to Admin panel in staging
- At least 3 test users with email + phone

### Test Steps

#### Step 2.1: Send Admin Broadcast
1. Sign in as **Super Admin**: `admin@fixzit.com`
2. Navigate to **Dashboard → Administration → Notifications**
3. Click **"Send Broadcast"**
4. Configure broadcast:
   - **Recipients:** "All Users" (or select 3 test users)
   - **Channels:** ☑️ Email + ☑️ SMS
   - **Subject:** "Test Broadcast Nov 16"
   - **Message:** "This is a test broadcast message for QA verification."
   - **Priority:** Normal
5. Click **"Send Now"**
6. **Expected Result:**
   - Success message: "Notifications sent successfully"
   - Results summary:
     ```
     Email: 3 sent, 0 failed
     SMS: 3 sent, 0 failed
     Total: 3 recipients
     ```

#### Step 2.2: Verify Broadcast in Notification History Tab
1. Open **"Notification History"** tab in admin panel
2. **Expected Result:**
   - Latest entry shows:
     - Subject: "Test Broadcast Nov 16"
     - Channels: Email, SMS
     - Recipients: 3
     - Status: Sent
     - Timestamp: [current time]

✅ **Pass Criteria:**
- Broadcast appears in history
- Correct recipient count
- Both channels shown

---

#### Step 2.3: Verify Individual Logs in MongoDB
Run this query to find all logs for this broadcast:

```javascript
db.communication_logs.find({
  "metadata.broadcastId": { $exists: true }
}).sort({ createdAt: -1 }).limit(10).pretty()
```

**Expected Result:**
- **6 log entries** (3 users × 2 channels = 6)
- All have same `metadata.broadcastId` (ObjectId)
- 3 entries with `channel: "email"`
- 3 entries with `channel: "sms"`

**Sample Entry (Email):**
```json
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "channel": "email",
  "type": "broadcast",
  "recipient": "user1@fixzit.com",
  "subject": "Test Broadcast Nov 16",
  "message": "This is a test broadcast message...",
  "status": "sent",
  "metadata": {
    "email": "user1@fixzit.com",
    "name": "Test User 1",
    "priority": "normal",
    "broadcastId": "673866a1b2c3d4e5f6789abc",
    "triggeredBy": "admin-user-id",
    "triggeredByEmail": "admin@fixzit.com",
    "sendgridId": "sg_abc123"
  },
  "createdAt": ISODate("2025-11-16T12:30:00.000Z"),
  "sentAt": ISODate("2025-11-16T12:30:00.456Z")
}
```

**Sample Entry (SMS):**
```json
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "channel": "sms",
  "type": "broadcast",
  "recipient": "+966501234567",
  "subject": "Test Broadcast Nov 16",
  "message": "Test Broadcast Nov 16\n\nThis is a test broadcast message...",
  "status": "sent",
  "metadata": {
    "phone": "+966501234567",
    "name": "Test User 1",
    "priority": "normal",
    "broadcastId": "673866a1b2c3d4e5f6789abc",
    "triggeredBy": "admin-user-id",
    "segments": 1
  },
  "createdAt": ISODate("2025-11-16T12:30:00.000Z"),
  "sentAt": ISODate("2025-11-16T12:30:00.789Z")
}
```

✅ **Pass Criteria:**
- 6 total logs (3 users × 2 channels)
- All share same `broadcastId`
- `triggeredBy` and `triggeredByEmail` correctly set
- Email logs have `sendgridId`
- SMS logs have `segments` count

---

#### Step 2.4: Verify Communication Dashboard Display
1. Navigate to **Administration → Communication Dashboard**
2. Apply filters:
   - **Type:** Broadcast
   - **Date Range:** Today
3. **Expected Result:**
   - Table shows 6 entries
   - Columns display:
     - Channel (Email/SMS)
     - Recipient (email or phone)
     - Subject
     - Status (Sent)
     - Sent At (timestamp)

#### Step 2.5: Test Dashboard Filtering
1. Filter by **Channel: Email**
   - **Expected:** 3 entries (email only)
2. Filter by **Channel: SMS**
   - **Expected:** 3 entries (SMS only)
3. Search by **Recipient:** `user1@fixzit.com`
   - **Expected:** 1 entry (email to that user)

✅ **Pass Criteria:**
- Filters work correctly
- Search returns correct results
- All 6 entries visible when no filters applied

---

#### Step 2.6: Verify Export Functionality (Optional)
1. Click **"Export CSV"** button
2. **Expected Result:**
   - CSV downloaded with 6 rows
   - Columns: Channel, Recipient, Subject, Status, Sent At, Type

✅ **Pass Criteria:**
- CSV contains all 6 broadcast entries
- Data matches dashboard table

---

### Test 2 Summary Table

| Test Case | Expected Logs | Unique `broadcastId` | Metadata Keys |
|-----------|---------------|----------------------|---------------|
| Email to 3 users | 3 | Same for all | `email`, `sendgridId`, `triggeredByEmail` |
| SMS to 3 users | 3 | Same for all | `phone`, `segments` |
| **Total** | **6** | **1 unique** | `broadcastId`, `triggeredBy`, `priority` |

---

## 📊 MongoDB Verification Queries

### Query 1: Count All Communication Logs
```javascript
db.communication_logs.countDocuments()
```
**Expected:** At least 8 (2 OTP + 6 broadcast)

### Query 2: Group by Channel
```javascript
db.communication_logs.aggregate([
  {
    $group: {
      _id: "$channel",
      count: { $sum: 1 }
    }
  }
])
```
**Expected Result:**
```json
[
  { "_id": "otp", "count": 2 },
  { "_id": "email", "count": 3 },
  { "_id": "sms", "count": 3 }
]
```

### Query 3: Check Broadcast ID Consistency
```javascript
db.communication_logs.aggregate([
  {
    $match: { type: "broadcast" }
  },
  {
    $group: {
      _id: "$metadata.broadcastId",
      count: { $sum: 1 },
      channels: { $addToSet: "$channel" }
    }
  }
])
```
**Expected Result:**
```json
[
  {
    "_id": "673866a1b2c3d4e5f6789abc",
    "count": 6,
    "channels": ["email", "sms"]
  }
]
```

### Query 4: Verify Status Distribution
```javascript
db.communication_logs.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  }
])
```
**Expected Result:**
```json
[
  { "_id": "sent", "count": 8 }
]
```
*All should be "sent" in successful test run*

---

## ✅ Final Checklist

### OTP Flow
- [ ] Initial OTP logged with `status: "sent"`
- [ ] Rate limit metadata decrements correctly
- [ ] Resend creates separate log entry
- [ ] Verification does NOT create new log
- [ ] All logs have correct `userId`, `recipient`, `metadata`

### Admin Broadcast
- [ ] Broadcast creates 6 logs (3 users × 2 channels)
- [ ] All logs share same `broadcastId`
- [ ] Email logs have `sendgridId`
- [ ] SMS logs have `segments` count
- [ ] `triggeredBy` and `triggeredByEmail` populated
- [ ] Notification History tab shows broadcast
- [ ] Communication Dashboard displays all 6 entries
- [ ] Filters and search work correctly

### Data Integrity
- [ ] All `createdAt` timestamps are valid
- [ ] `sentAt` timestamps present for successful sends
- [ ] No duplicate log entries (unique `_id`)
- [ ] `userId` matches actual user ObjectIds
- [ ] Phone numbers in E.164 format (`+966...`)
- [ ] Email addresses valid

---

## 🐛 Common Issues & Troubleshooting

### Issue 1: OTP Log Not Created
**Symptoms:** Query returns 0 results  
**Causes:**
- `logCommunication()` failed silently
- MongoDB connection issue
- Wrong database/collection name

**Fix:**
- Check application logs for `[Communication] Log error`
- Verify MongoDB connection string
- Confirm collection name is `communication_logs` (not `communicationLogs`)

### Issue 2: Broadcast Creates Fewer Than 6 Logs
**Symptoms:** Only 3 logs instead of 6  
**Causes:**
- One channel (email or SMS) failed for all users
- Users missing phone numbers
- Twilio balance depleted

**Fix:**
- Check results summary in API response
- Verify `results.email.failed` and `results.sms.failed` counts
- Check Twilio console for send failures
- Verify users have valid phone numbers

### Issue 3: Dashboard Shows Wrong Count
**Symptoms:** Dashboard shows 4 entries, MongoDB has 6  
**Causes:**
- Dashboard query has filter bug
- Pagination limit too low
- Missing index on `communication_logs`

**Fix:**
- Check browser console for API errors
- Verify `/api/admin/communications` response
- Add index: `db.communication_logs.createIndex({ createdAt: -1 })`

---

## 📝 Test Execution Log Template

```
Date: ______________
Tester: ____________
Environment: ________

Test 1: OTP Flow
- Initial Send: ☐ PASS ☐ FAIL
- Resend: ☐ PASS ☐ FAIL
- Verification: ☐ PASS ☐ FAIL
- MongoDB Logs: ☐ PASS ☐ FAIL

Test 2: Broadcast
- Send Success: ☐ PASS ☐ FAIL
- History Tab: ☐ PASS ☐ FAIL
- MongoDB Logs: ☐ PASS ☐ FAIL
- Dashboard Display: ☐ PASS ☐ FAIL
- Filters/Search: ☐ PASS ☐ FAIL

Issues Found:
______________________________
______________________________

Overall Status: ☐ ALL PASS ☐ ISSUES FOUND
```

---

## 🚀 Next Steps After Verification

1. **If All Tests Pass:**
   - Mark communication logging as **Production Ready**
   - Create Jira ticket for Phase 2 (Twilio webhooks, delivery status updates)
   - Update `COMMUNICATION_DASHBOARD_GUIDE.md` with "✅ Verified" badge

2. **If Tests Fail:**
   - Document specific failures in Jira
   - Attach MongoDB query results and screenshots
   - Assign to backend engineer for fixes
   - Re-run QA after fixes deployed

---

**Document Status:** Ready for QA Execution  
**Last Updated:** November 16, 2025  
**Owner:** QA Team / Eng. Sultan Al-Hassni
