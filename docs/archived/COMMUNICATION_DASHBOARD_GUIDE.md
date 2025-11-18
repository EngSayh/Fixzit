# Communication Dashboard - Implementation Summary

## ✅ Implementation Complete

A comprehensive communication tracking dashboard has been created for super admins to monitor all SMS, Email, WhatsApp, and OTP communications with full history logging per customer.

---

## 🎯 Features Implemented

### 1. Communication Logging System (`lib/communication-logger.ts`)

**Core Functions:**
- ✅ `logCommunication()` - Log any communication (SMS/Email/WhatsApp/OTP)
- ✅ `updateCommunicationStatus()` - Update delivery status
- ✅ `getUserCommunications()` - Get history for specific user
- ✅ `getCommunicationStats()` - Calculate delivery/failure rates

**Data Structure:**
```typescript
interface CommunicationLog {
  userId: string;              // Customer ID
  channel: 'sms' | 'email' | 'whatsapp' | 'otp';
  type: 'notification' | 'otp' | 'marketing' | 'transactional' | 'alert';
  recipient: string;           // Phone or email
  subject?: string;            // For email
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  metadata: {
    twilioSid?: string;        // For tracking
    sendgridId?: string;
    cost?: number;             // Cost tracking
    segments?: number;         // SMS segments
    otpCode?: string;          // For OTP audit
    triggeredBy?: string;      // Admin ID or 'system'
  };
  createdAt: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
}
```

### 2. Admin API Endpoint (`app/api/admin/communications/route.ts`)

**GET /api/admin/communications**

**Query Parameters:**
- `userId` - Filter by specific user
- `channel` - Filter by channel (sms/email/whatsapp/otp/all)
- `status` - Filter by status (sent/delivered/failed/pending)
- `startDate` / `endDate` - Date range filter
- `search` - Search in recipient, subject, or message
- `limit` / `skip` - Pagination (default: 50 per page, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "communications": [...],
    "pagination": {
      "total": 1234,
      "limit": 50,
      "skip": 0,
      "pages": 25,
      "currentPage": 1
    },
    "statistics": {
      "totalSent": 1234,
      "totalDelivered": 1150,
      "totalFailed": 34,
      "totalPending": 50,
      "smsCount": 800,
      "emailCount": 300,
      "whatsappCount": 100,
      "otpCount": 34,
      "deliveryRate": "93.19%",
      "failureRate": "2.75%"
    }
  }
}
```

**Security:**
- ✅ Super admin authentication required
- ✅ Session validation with NextAuth
- ✅ User data joined from users collection

### 3. Dashboard UI Component (`components/admin/CommunicationDashboard.tsx`)

**Features:**
- 📊 **Statistics Cards**:
  - Total Sent
  - Delivery Rate (with delivered count)
  - Failure Rate (with failed count)
  - By Channel breakdown (SMS/Email/WhatsApp/OTP)

- 🔍 **Filters**:
  - Search by user name, phone, or email
  - Filter by channel (All/SMS/Email/WhatsApp/OTP)
  - Filter by status (All/Pending/Sent/Delivered/Failed)

- 📋 **Communications Table**:
  - Date/Time
  - User details (name + email)
  - Channel with icon
  - Recipient (phone/email)
  - Status badge
  - Message preview
  - View details button

- 🔄 **Actions**:
  - Export to CSV
  - Refresh data
  - Paginated view (50 per page)

- 👁️ **Detail Modal**:
  - Full communication details
  - User information
  - Channel & status
  - Complete message
  - Timestamps (sent, delivered)
  - Error messages (if failed)
  - Metadata (Twilio SID, cost, etc.)

**Internationalization:**
- ✅ Full bilingual support (English/Arabic)
- ✅ RTL layout support
- ✅ All text translatable

---

## 📁 Files Created

1. **`lib/communication-logger.ts`** (320 lines)
   - Communication logging utility
   - Database operations
   - Statistics calculator

2. **`app/api/admin/communications/route.ts`** (200 lines)
   - REST API endpoint
   - Advanced filtering & aggregation
   - Super admin authorization

3. **`components/admin/CommunicationDashboard.tsx`** (600+ lines)
   - Full dashboard UI
   - Search, filter, pagination
   - Export to CSV
   - Detail modal

---

## 🗄️ Database Schema

### Collection: `communication_logs`

**Indexes (Recommended):**
```javascript
db.communication_logs.createIndex({ userId: 1, createdAt: -1 });
db.communication_logs.createIndex({ channel: 1, status: 1 });
db.communication_logs.createIndex({ createdAt: -1 });
db.communication_logs.createIndex({ status: 1 });
db.communication_logs.createIndex({ "metadata.twilioSid": 1 });
db.communication_logs.createIndex({ "metadata.sendgridId": 1 });
```

**Aggregation Pipeline:**
- Lookup user details from `users` collection
- Filter by multiple criteria
- Sort by creation date (newest first)
- Count matching documents
- Paginate results
- Calculate statistics

---

## 🔌 Integration Guide

### 1. Integrate with SMS Service (`lib/sms.ts`)

**Current:**
```typescript
export async function sendSMS(to: string, message: string): Promise<SMSResult>
```

**Enhanced (add userId parameter):**
```typescript
export async function sendSMS(to: string, message: string, userId?: string): Promise<SMSResult> {
  let logId: string | undefined;
  
  // Log as pending
  if (userId) {
    const { logCommunication } = await import('./communication-logger');
    const result = await logCommunication({
      userId,
      channel: 'sms',
      type: 'notification',
      recipient: to,
      message,
      status: 'pending',
      metadata: { segments: Math.ceil(message.length / 160) },
    });
    logId = result.logId;
  }

  // Send SMS via Twilio
  const smsResult = await client.messages.create({ ... });

  // Update status to sent
  if (logId) {
    const { updateCommunicationStatus } = await import('./communication-logger');
    await updateCommunicationStatus(logId, 'sent', {
      twilioSid: smsResult.sid,
    });
  }

  return smsResult;
}
```

**Update OTP Send Endpoint:**
```typescript
// app/api/auth/otp/send/route.ts

// After user validation, before sending OTP:
const { logCommunication } = await import('@/lib/communication-logger');
const logResult = await logCommunication({
  userId: user._id.toString(),
  channel: 'otp',
  type: 'otp',
  recipient: userPhone,
  message: `Your Fixzit verification code is: ${otp}`,
  status: 'pending',
  metadata: {
    otpCode: otp,  // For audit
    otpExpiresAt: new Date(expiresAt),
  },
});

const smsResult = await sendOTP(userPhone, otp);

// Update status
if (smsResult.success && logResult.logId) {
  const { updateCommunicationStatus } = await import('@/lib/communication-logger');
  await updateCommunicationStatus(logResult.logId, 'sent', {
    twilioSid: smsResult.messageSid,
  });
}
```

### 2. Integrate with Email Service (`lib/email.ts`)

**Enhanced:**
```typescript
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  userId?: string,
  options?: { ... }
): Promise<EmailResult> {
  let logId: string | undefined;

  // Log as pending
  if (userId) {
    const { logCommunication } = await import('./communication-logger');
    const result = await logCommunication({
      userId,
      channel: 'email',
      type: 'notification',
      recipient: to,
      subject,
      message: body,
      status: 'pending',
    });
    logId = result.logId;
  }

  // Send via SendGrid
  const emailResult = await sgMail.send({ ... });

  // Update status
  if (logId) {
    const { updateCommunicationStatus } = await import('./communication-logger');
    await updateCommunicationStatus(logId, 'sent', {
      sendgridId: emailResult[0].headers['x-message-id'],
    });
  }

  return emailResult;
}
```

### 3. Integrate WhatsApp Channel (`lib/whatsapp.ts`)

**Configuration:**
- `WHATSAPP_BUSINESS_API_KEY`, `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_TEMPLATE_NAMESPACE` (Meta/Cloud API) or Twilio sandbox credentials

**Sending Helper:**
```typescript
export async function sendWhatsAppMessage(
  to: string,
  template: string,
  variables: string[],
  userId?: string,
) {
  let logId: string | undefined;

  if (userId) {
    const { logCommunication } = await import('./communication-logger');
    const result = await logCommunication({
      userId,
      channel: 'whatsapp',
      type: 'notification',
      recipient: to,
      message: `${template} ${variables.join(' ')}`.trim(),
      status: 'pending',
    });
    logId = result.logId;
  }

  const payload = buildWhatsAppPayload({ to, template, variables });
  const response = await fetch(WHATSAPP_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_BUSINESS_API_KEY}` },
    body: JSON.stringify(payload),
  });

  if (logId) {
    const { updateCommunicationStatus } = await import('./communication-logger');
    await updateCommunicationStatus(logId, response.ok ? 'sent' : 'failed', {
      whatsappMessageId: response.ok ? (await response.json()).messages?.[0]?.id : undefined,
      errorMessage: response.ok ? undefined : await response.text(),
    });
  }

  return response;
}
```

**Delivery Receipts:**
- Register a webhook (`/api/webhooks/whatsapp`) to update message status.
- Map incoming `statuses` events to `updateCommunicationStatus(logId, 'delivered' | 'failed', metadata)`.

### 4. Integrate with Admin Notifications

**Update `app/api/admin/notifications/send/route.ts`:**
```typescript
// For each recipient, log the communication:
const { logCommunication } = await import('@/lib/communication-logger');

for (const recipient of allRecipients) {
  // Send SMS
  if (channels.includes('sms') && recipient.phone) {
    await logCommunication({
      userId: recipient.id,
      channel: 'sms',
      type: 'broadcast',
      recipient: recipient.phone,
      message: body.message,
      status: 'pending',
      metadata: {
        broadcastId: notificationId,  // Link to broadcast campaign
        triggeredBy: session.user.id,  // Admin who sent it
      },
    });
    
    await sendSMS(recipient.phone, body.message, recipient.id);
  }

  // Send Email
  if (channels.includes('email') && recipient.email) {
    await logCommunication({
      userId: recipient.id,
      channel: 'email',
      type: 'broadcast',
      recipient: recipient.email,
      subject: body.subject,
      message: body.message,
      status: 'pending',
      metadata: {
        broadcastId: notificationId,
        triggeredBy: session.user.id,
      },
    });
    
    await sendEmail(recipient.email, body.subject, body.message, recipient.id);
  }
}
```

---

## 🎨 Add to Admin Panel

### Update `app/administration/page.tsx`

**1. Add Import:**
```typescript
import CommunicationDashboard from '@/components/admin/CommunicationDashboard';
import { MessageSquare } from 'lucide-react';
```

**2. Add Tab:**
```typescript
const tabs = [
  // ... existing tabs
  { id: 'communications', label: t('admin.tabs.communications', 'Communications'), icon: MessageSquare, superAdminOnly: true },
];
```

**3. Add Content:**
```typescript
{activeTab === 'communications' && isSuperAdmin && (
  <CommunicationDashboard t={t} isRTL={isRTL} />
)}
```

---

## 🌍 Translation Keys

### English (`i18n/dictionaries/en.ts`)
```typescript
communications: {
  title: 'Communication Dashboard',
  subtitle: 'Track all SMS, Email, and WhatsApp communications',
  export: 'Export',
  refresh: 'Refresh',
  loading: 'Loading communications...',
  noData: 'No communications found',
  search: 'Search by user, phone, email...',
  stats: {
    totalSent: 'Total Sent',
    deliveryRate: 'Delivery Rate',
    failureRate: 'Failure Rate',
    byChannel: 'By Channel',
  },
  filter: {
    allChannels: 'All Channels',
    allStatuses: 'All Statuses',
  },
  table: {
    date: 'Date',
    user: 'User',
    channel: 'Channel',
    recipient: 'Recipient',
    status: 'Status',
    message: 'Message',
    actions: 'Actions',
  },
  view: 'View',
  previous: 'Previous',
  next: 'Next',
  page: 'Page',
  of: 'of',
  details: {
    title: 'Communication Details',
    user: 'User',
    channel: 'Channel',
    status: 'Status',
    recipient: 'Recipient',
    subject: 'Subject',
    message: 'Message',
    sent: 'Sent At',
    delivered: 'Delivered At',
    error: 'Error',
    metadata: 'Metadata',
  },
},
```

### Arabic (`i18n/dictionaries/ar.ts`)
```typescript
communications: {
  title: 'لوحة الاتصالات',
  subtitle: 'تتبع جميع اتصالات الرسائل النصية والبريد الإلكتروني والواتساب',
  export: 'تصدير',
  refresh: 'تحديث',
  loading: 'جاري تحميل الاتصالات...',
  noData: 'لا توجد اتصالات',
  search: 'البحث بالمستخدم أو الهاتف أو البريد...',
  stats: {
    totalSent: 'إجمالي المرسلة',
    deliveryRate: 'معدل التسليم',
    failureRate: 'معدل الفشل',
    byChannel: 'حسب القناة',
  },
  // ... etc
},
```

---

## 📊 Usage Examples

### Example 1: View All Communications
```http
GET /api/admin/communications?limit=50&skip=0
```

### Example 2: Filter by User
```http
GET /api/admin/communications?userId=507f1f77bcf86cd799439011
```

### Example 3: Filter by Channel & Status
```http
GET /api/admin/communications?channel=sms&status=failed
```

### Example 4: Search + Date Range
```http
GET /api/admin/communications?search=+966501234567&startDate=2024-12-01&endDate=2024-12-31
```

### Example 5: Export Failed SMS
1. Filter: channel=sms, status=failed
2. Click "Export" button
3. Downloads CSV with all failed SMS

---

## 🔍 Monitoring & Analytics

### Key Metrics to Track

**Delivery Performance:**
- Delivery Rate (target: >95%)
- Failure Rate (target: <5%)
- Average delivery time

**By Channel:**
- SMS: Count, cost, segments, delivery rate
- Email: Count, open rate (if tracked), bounce rate
- WhatsApp: Count, read status
- OTP: Count, verification success rate

**By User:**
- Total communications per user
- Most communicated users
- Users with failed deliveries

**Cost Tracking:**
- Total SMS cost (segments × price)
- Email cost (SendGrid usage)
- Cost per user
- Cost per campaign

### Recommended Queries

**1. Daily Communication Summary:**
```javascript
db.communication_logs.aggregate([
  {
    $match: {
      createdAt: {
        $gte: ISODate("2024-12-01"),
        $lte: ISODate("2024-12-31")
      }
    }
  },
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      total: { $sum: 1 },
      sms: { $sum: { $cond: [{ $eq: ["$channel", "sms"] }, 1, 0] } },
      email: { $sum: { $cond: [{ $eq: ["$channel", "email"] }, 1, 0] } },
      delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
      failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } }
    }
  },
  { $sort: { _id: 1 } }
]);
```

**2. Top 10 Users by Communication:**
```javascript
db.communication_logs.aggregate([
  {
    $group: {
      _id: "$userId",
      total: { $sum: 1 },
      sms: { $sum: { $cond: [{ $eq: ["$channel", "sms"] }, 1, 0] } },
      email: { $sum: { $cond: [{ $eq: ["$channel", "email"] }, 1, 0] } }
    }
  },
  { $sort: { total: -1 } },
  { $limit: 10 },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "user"
    }
  }
]);
```

**3. Failed Communications Report:**
```javascript
db.communication_logs.find({
  status: "failed",
  createdAt: { $gte: ISODate("2024-12-01") }
}).sort({ createdAt: -1 });
```

---

## 🚀 Next Steps

### Phase 1: Integration (Immediate)
- [ ] Add `userId` parameter to `sendSMS()` and `sendEmail()`
- [ ] Update OTP send endpoint to log communications
- [ ] Update admin notification broadcast to log communications
- [ ] Add Communication Dashboard tab to admin panel
- [ ] Add translation keys to dictionaries

### Phase 2: Delivery Tracking (Short-term)
- [ ] Twilio webhook for delivery status (`/api/webhooks/twilio`)
- [ ] SendGrid webhook for email events (`/api/webhooks/sendgrid`)
- [ ] Auto-update communication status on webhook events
- [ ] Email open tracking (SendGrid pixel)

### Phase 3: Advanced Features (Medium-term)
- [ ] Real-time dashboard updates (WebSocket/SSE)
- [ ] Advanced analytics charts (Chart.js/Recharts)
- [ ] Cost calculator per communication
- [ ] Budget alerts (SMS/Email limits)
- [ ] Automated retry for failed communications
- [ ] Communication templates library

### Phase 4: Compliance (Long-term)
- [ ] GDPR compliance (data retention policies)
- [ ] Audit trail for all communications
- [ ] User consent tracking
- [ ] Unsubscribe management
- [ ] Communication preferences per user

---

## 🛠️ Testing Checklist

- [ ] Log communication for test user
- [ ] View communication in dashboard
- [ ] Filter by channel (SMS/Email/OTP)
- [ ] Filter by status (Sent/Failed)
- [ ] Search by user name/phone/email
- [ ] View communication details
- [ ] Export to CSV
- [ ] Check statistics accuracy
- [ ] Test pagination
- [ ] Test RTL layout (Arabic)
- [ ] Test on mobile/tablet
- [ ] Verify super admin access only

---

## 📝 Documentation Links

- **API Docs:** `SMS_OTP_LOGIN_GUIDE.md` (SMS/OTP integration)
- **Admin Notifications:** Previous commit message (broadcast system)
- **Database:** `lib/mongodb-unified.ts` (connection management)
- **Authentication:** `auth.config.ts` (super admin checks)

---

**Status:** ✅ **Ready for Integration**  
**Last Updated:** December 2024  
**Version:** 1.0.0
