# Long-Term Communication Enhancement Roadmap

## Overview

This document outlines the long-term (Priority 3) enhancements for the Fixzit communication system, including SMS delivery monitoring, MongoDB migration, and WhatsApp integration.

---

## 🎯 Priority 3 Tasks

### 1. Monitor SMS Delivery Rates

#### Objective

Implement comprehensive monitoring and analytics for SMS delivery to track success rates, identify issues, and optimize costs.

#### Implementation Steps

**A. Twilio Webhook Integration**
Create webhook endpoint to receive delivery status updates:

```typescript
// app/api/webhooks/twilio/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { updateCommunicationStatus } from "@/lib/communication-logger";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const messageSid = formData.get("MessageSid") as string;
    const messageStatus = formData.get("MessageStatus") as string;
    const errorCode = formData.get("ErrorCode") as string;

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      sent: "sent",
      delivered: "delivered",
      undelivered: "failed",
      failed: "failed",
    };

    const status = statusMap[messageStatus] || messageStatus;

    // Find communication log by Twilio SID
    const db = await getDatabase();
    const log = await db.collection("communication_logs").findOne({
      "metadata.twilioSid": messageSid,
    });

    if (log) {
      await updateCommunicationStatus(log._id.toString(), status, {
        twilioStatus: messageStatus,
        errorCode: errorCode || undefined,
        statusUpdatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Twilio Webhook] Error processing status", { error });
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
```

**B. Configure Twilio Webhook**

1. Log into Twilio Console
2. Go to Phone Numbers → Active Numbers → [Your Number]
3. Under "Messaging", set Status Callback URL:
   ```
   https://your-domain.com/api/webhooks/twilio/status
   ```
4. Select events: Sent, Delivered, Undelivered, Failed

**C. Create Analytics Dashboard**

Add analytics component to Communication Dashboard:

```typescript
// components/admin/SMSAnalytics.tsx
interface SMSAnalytics {
  totalSent: number;
  deliveryRate: number;
  averageDeliveryTime: string;
  failuresByCarrier: Record<string, number>;
  costAnalysis: {
    totalCost: number;
    costPerMessage: number;
    segments: { single: number; multi: number };
  };
  hourlyTrends: Array<{ hour: number; sent: number; delivered: number }>;
}

// Query example
const analytics = await db
  .collection("communication_logs")
  .aggregate([
    {
      $match: { channel: "sms", createdAt: { $gte: startDate, $lte: endDate } },
    },
    {
      $group: {
        _id: null,
        totalSent: { $sum: 1 },
        delivered: {
          $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
        },
        failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        totalCost: { $sum: "$metadata.cost" },
      },
    },
  ])
  .toArray();
```

**D. Alerting System**

```typescript
// jobs/sms-monitoring.ts
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";

export async function monitorSMSHealth() {
  const db = await getDatabase();

  // Check last hour failure rate
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const stats = await db
    .collection("communication_logs")
    .aggregate([
      { $match: { channel: "sms", createdAt: { $gte: oneHourAgo } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        },
      },
    ])
    .toArray();

  if (stats[0]) {
    const failureRate = (stats[0].failed / stats[0].total) * 100;

    // Alert if failure rate > 10%
    if (failureRate > 10) {
      await sendEmail(
        "admin@fixzit.com",
        "⚠️ High SMS Failure Rate Alert",
        `SMS failure rate is ${failureRate.toFixed(2)}% in the last hour. 
         Total: ${stats[0].total}, Failed: ${stats[0].failed}`,
      );

      logger.error("[SMS Monitoring] High failure rate detected", {
        failureRate,
        total: stats[0].total,
        failed: stats[0].failed,
      });
    }
  }
}

// Schedule with cron (runs every 15 minutes)
// Add to deployment/cron.yaml or use node-cron
```

---

### 2. Migrate OTP Storage from Memory to MongoDB (Production)

#### Objective

Move OTP storage from in-memory store to MongoDB for scalability, persistence, and multi-instance support.

#### Why MongoDB?

- **Persistence**: Survives app restarts
- **Scalability**: Supports multiple app instances
- **TTL**: Native expiration support
- **Atomic operations**: Race condition prevention

#### Implementation Steps

**A. Install MongoDB Client**

```bash
pnpm add mongodb
```

**B. Create MongoDB Client**

```typescript
// lib/mongodb-otp.ts
import { MongoClient } from "mongodb";
import { logger } from "./logger";

let mongodb: MongoClient | null = null;

export function getMongoDBClient(): MongoClient {
  if (!mongodb) {
    mongodb = new MongoClient({
      host: process.env.MONGODB_HOST || "localhost",
      port: parseInt(process.env.MONGODB_PORT || "27017"),
      password: process.env.MONGODB_PASSWORD,
      db: parseInt(process.env.MONGODB_OTP_DB || "1"), // Separate DB for OTP
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    mongodb.on("error", (error) => {
      logger.error("[MongoDB OTP] Connection error", { error });
    });

    mongodb.on("connect", () => {
      logger.info("[MongoDB OTP] Connected successfully");
    });
  }

  return mongodb;
}

interface OTPData {
  code: string;
  phone: string;
  userId: string;
  attempts: number;
  createdAt: number;
  expiresAt: number;
}

export class MongoDBOTPStore {
  private mongodb: MongoClient;
  private readonly OTP_TTL = 5 * 60; // 5 minutes in seconds
  private readonly MAX_ATTEMPTS = 3;
  private readonly RATE_LIMIT_TTL = 15 * 60; // 15 minutes

  constructor() {
    this.mongodb = getMongoDBClient();
  }

  private getOTPKey(phone: string): string {
    return `otp:${phone}`;
  }

  private getRateLimitKey(phone: string): string {
    return `otp:ratelimit:${phone}`;
  }

  async storeOTP(phone: string, code: string, userId: string): Promise<void> {
    const key = this.getOTPKey(phone);
    const data: OTPData = {
      code,
      phone,
      userId,
      attempts: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.OTP_TTL * 1000,
    };

    await this.mongodb.setex(key, this.OTP_TTL, JSON.stringify(data));
    logger.info("[MongoDB OTP] Stored OTP", { phone, userId });
  }

  async verifyOTP(
    phone: string,
    code: string,
  ): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
  }> {
    const key = this.getOTPKey(phone);
    const dataStr = await this.mongodb.get(key);

    if (!dataStr) {
      return { success: false, error: "OTP expired or not found" };
    }

    const data: OTPData = JSON.parse(dataStr);

    // Check expiration
    if (Date.now() > data.expiresAt) {
      await this.mongodb.del(key);
      return { success: false, error: "OTP expired" };
    }

    // Check attempts
    if (data.attempts >= this.MAX_ATTEMPTS) {
      await this.mongodb.del(key);
      return {
        success: false,
        error: "Maximum verification attempts exceeded",
      };
    }

    // Verify code
    if (data.code !== code) {
      data.attempts++;
      await this.mongodb.setex(
        key,
        Math.ceil((data.expiresAt - Date.now()) / 1000),
        JSON.stringify(data),
      );
      return {
        success: false,
        error: `Invalid OTP. ${this.MAX_ATTEMPTS - data.attempts} attempts remaining`,
      };
    }

    // Success - delete OTP
    await this.mongodb.del(key);
    logger.info("[MongoDB OTP] Verified successfully", {
      phone,
      userId: data.userId,
    });

    return { success: true, userId: data.userId };
  }

  async checkRateLimit(phone: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt?: number;
  }> {
    const key = this.getRateLimitKey(phone);
    const count = await this.mongodb.incr(key);

    if (count === 1) {
      // First request - set expiration
      await this.mongodb.expire(key, this.RATE_LIMIT_TTL);
    }

    const ttl = await this.mongodb.ttl(key);
    const maxAttempts = 5;

    if (count > maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + ttl * 1000,
      };
    }

    return {
      allowed: true,
      remaining: maxAttempts - count,
    };
  }

  async deleteOTP(phone: string): Promise<void> {
    await this.mongodb.del(this.getOTPKey(phone));
  }

  async getOTPInfo(phone: string): Promise<OTPData | null> {
    const key = this.getOTPKey(phone);
    const dataStr = await this.mongodb.get(key);
    return dataStr ? JSON.parse(dataStr) : null;
  }
}

export const mongodbOTPStore = new MongoDBOTPStore();
```

**C. Update OTP Send Endpoint**

```typescript
// app/api/auth/otp/send/route.ts
import { mongodbOTPStore } from "@/lib/mongodb-otp";

// Replace memoryOTPStore with mongodbOTPStore
const rateLimit = await mongodbOTPStore.checkRateLimit(userPhone);
if (!rateLimit.allowed) {
  return NextResponse.json(
    {
      success: false,
      error: `Too many OTP requests. Try again in ${Math.ceil((rateLimit.resetAt! - Date.now()) / 60000)} minutes.`,
    },
    { status: 429 },
  );
}

await mongodbOTPStore.storeOTP(userPhone, otp, user._id.toString());
```

**D. Update OTP Verify Endpoint**

```typescript
// app/api/auth/otp/verify/route.ts
import { mongodbOTPStore } from "@/lib/mongodb-otp";

const result = await mongodbOTPStore.verifyOTP(phone, otp);

if (!result.success) {
  return NextResponse.json(
    {
      success: false,
      error: result.error,
    },
    { status: 400 },
  );
}

// Continue with login...
```

**E. Environment Variables**

```bash
# .env
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_PASSWORD=your_mongodb_password
MONGODB_OTP_DB=1
```

**F. Docker Compose (Development)**

```yaml
# docker-compose.yml
services:
  mongodb:
    image: mongodb:7-alpine
    ports:
      - "6379:6379"
    command: mongodb-server --appendonly yes
    volumes:
      - mongodb_data:/data
    environment:
      - MONGODB_PASSWORD=${MONGODB_PASSWORD}

volumes:
  mongodb_data:
```

**G. Production Deployment (AWS/Azure/GCP)**

**AWS ElastiCache:**

```bash
# Create MongoDB cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id fixzit-otp-mongodb \
  --cache-node-type cache.t3.micro \
  --engine mongodb \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxx

# Get endpoint
aws elasticache describe-cache-clusters \
  --cache-cluster-id fixzit-otp-mongodb \
  --show-cache-node-info
```

**Azure Cache for MongoDB:**

```bash
az mongodb create \
  --name fixzit-otp-mongodb \
  --resource-group fixzit-rg \
  --location saudiarabia \
  --sku Basic \
  --vm-size c0
```

---

### 3. Consider WhatsApp OTP as Cheaper Alternative

#### Objective

Evaluate and implement WhatsApp Business API for OTP delivery as a cost-effective alternative to SMS.

#### Cost Comparison

| Method    | Cost (Saudi Arabia)        | Delivery Rate | Notes                     |
| --------- | -------------------------- | ------------- | ------------------------- |
| SMS       | $0.05 - $0.08 per message  | 95-98%        | Reliable, universal       |
| WhatsApp  | $0.005 - $0.01 per message | 90-95%        | Requires WhatsApp account |
| Voice OTP | $0.02 - $0.05 per call     | 85-90%        | Backup option             |

**Potential Savings:** 80-90% cost reduction

#### Prerequisites

1. WhatsApp Business Account
2. WhatsApp Business API access (requires Meta approval)
3. Verified business profile
4. 24-hour message template approval

#### Implementation Options

**Option A: Twilio WhatsApp API**

```typescript
// lib/whatsapp.ts
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

export async function sendWhatsAppOTP(
  to: string,
  otp: string,
): Promise<{ success: boolean; messageSid?: string }> {
  try {
    // Format: +966XXXXXXXXX → whatsapp:+966XXXXXXXXX
    const whatsappNumber = `whatsapp:${to}`;
    const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

    const message = await client.messages.create({
      from,
      to: whatsappNumber,
      body: `Your Fixzit verification code is: ${otp}\nValid for 5 minutes.\nDo not share this code.`,
      // Use approved template
      contentSid: process.env.TWILIO_WHATSAPP_TEMPLATE_SID,
      contentVariables: JSON.stringify({ "1": otp }),
    });

    return { success: true, messageSid: message.sid };
  } catch (error) {
    logger.error("[WhatsApp] Send failed", { error });
    return { success: false };
  }
}
```

**Option B: Meta Cloud API (Direct)**

```typescript
// lib/whatsapp-meta.ts
import axios from "axios";

export async function sendWhatsAppOTP(
  to: string,
  otp: string,
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to.replace("+", ""),
        type: "template",
        template: {
          name: "otp_verification", // Your approved template name
          language: { code: "ar" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    return { success: true, messageId: response.data.messages[0].id };
  } catch (error) {
    logger.error("[WhatsApp Meta] Send failed", { error });
    return { success: false };
  }
}
```

#### Message Template (Submit to Meta for Approval)

```
Category: AUTHENTICATION
Name: otp_verification
Language: Arabic (ar)

Body:
رمز التحقق الخاص بك في فيكزيت هو: {{1}}
صالح لمدة 5 دقائق.
لا تشارك هذا الرمز مع أي شخص.

Variables:
{{1}} = OTP code

English version:
Your Fixzit verification code is: {{1}}
Valid for 5 minutes.
Do not share this code.
```

#### Fallback Strategy

Implement intelligent channel selection:

```typescript
// lib/otp-delivery.ts
export async function sendOTPWithFallback(
  phone: string,
  otp: string,
  userId: string,
): Promise<{ success: boolean; channel: string; error?: string }> {
  // 1. Try WhatsApp first (cheaper)
  try {
    const whatsappResult = await sendWhatsAppOTP(phone, otp);
    if (whatsappResult.success) {
      await logCommunication({
        userId,
        channel: "whatsapp",
        type: "otp",
        recipient: phone,
        message: `Your verification code is: ${otp}`,
        status: "sent",
        metadata: { messageId: whatsappResult.messageId, cost: 0.01 },
      });
      return { success: true, channel: "whatsapp" };
    }
  } catch (error) {
    logger.warn("[OTP Delivery] WhatsApp failed, falling back to SMS", {
      error,
    });
  }

  // 2. Fallback to SMS
  try {
    const smsResult = await sendSMS(
      phone,
      `Your Fixzit verification code is: ${otp}`,
    );
    if (smsResult.success) {
      await logCommunication({
        userId,
        channel: "sms",
        type: "otp",
        recipient: phone,
        message: `Your verification code is: ${otp}`,
        status: "sent",
        metadata: { twilioSid: smsResult.messageSid, cost: 0.05 },
      });
      return { success: true, channel: "sms" };
    }
  } catch (error) {
    logger.error("[OTP Delivery] SMS also failed", { error });
  }

  return {
    success: false,
    channel: "none",
    error: "All delivery methods failed",
  };
}
```

#### User Preference System

Allow users to choose OTP delivery method:

```typescript
// models/UserPreferences.ts
interface UserPreferences {
  userId: string;
  otpChannel: "whatsapp" | "sms" | "auto";
  whatsappOptIn: boolean;
  phoneVerified: boolean;
  whatsappVerified: boolean;
}

// Check user preference before sending
const preferences = await db.collection("user_preferences").findOne({ userId });
const preferredChannel = preferences?.otpChannel || "auto";

if (preferredChannel === "whatsapp" && preferences?.whatsappOptIn) {
  // Send via WhatsApp
} else if (preferredChannel === "sms") {
  // Send via SMS
} else {
  // Auto: Try WhatsApp first, fallback to SMS
}
```

#### WhatsApp Setup Checklist

- [ ] Create Meta Business Account
- [ ] Verify business identity
- [ ] Request WhatsApp Business API access
- [ ] Create WhatsApp Business App
- [ ] Submit message templates for approval
- [ ] Configure webhook for delivery status
- [ ] Test in sandbox environment
- [ ] Go live with production number
- [ ] Implement opt-in flow for users
- [ ] Add WhatsApp icon to login page
- [ ] Monitor delivery rates
- [ ] Set up cost tracking

---

## 📊 Success Metrics

### SMS Monitoring

- Delivery rate > 95%
- Average delivery time < 10 seconds
- Failure rate < 5%
- Alert response time < 5 minutes

### MongoDB Migration

- Zero OTP loss during deployment
- Support for 10,000+ concurrent OTP sessions
- OTP verification latency < 100ms
- 99.9% MongoDB uptime

### WhatsApp Integration

- Cost reduction of 80%+
- Delivery rate > 90%
- User opt-in rate > 60%
- Fallback success rate 100%

---

## 🔐 Security Considerations

1. **Rate Limiting**: Enforce strict limits on all channels
2. **Encryption**: Store OTPs encrypted in MongoDB
3. **Audit Trail**: Log all OTP operations
4. **Brute Force Protection**: Lock account after repeated failures
5. **Channel Verification**: Verify user owns phone before WhatsApp
6. **Compliance**: Follow GDPR/PDPL for message storage

---

## 📅 Implementation Timeline

| Task                        | Estimated Time | Priority |
| --------------------------- | -------------- | -------- |
| SMS Monitoring (Webhooks)   | 2-3 days       | P3-A     |
| SMS Analytics Dashboard     | 3-4 days       | P3-A     |
| MongoDB Migration (Dev)       | 2-3 days       | P3-B     |
| MongoDB Production Deployment | 1-2 days       | P3-B     |
| WhatsApp API Setup          | 5-7 days       | P3-C     |
| WhatsApp Integration        | 3-4 days       | P3-C     |
| Fallback Strategy           | 2-3 days       | P3-C     |
| User Preference UI          | 2-3 days       | P3-C     |

**Total Estimated Time:** 20-29 days

---

## 💰 Cost Analysis

### Current (SMS Only)

- 10,000 OTPs/month × $0.06 = **$600/month**

### After WhatsApp (70% WhatsApp, 30% SMS)

- 7,000 WhatsApp × $0.01 = $70
- 3,000 SMS × $0.06 = $180
- **Total: $250/month**
- **Savings: $350/month ($4,200/year)**

### MongoDB Costs

- AWS ElastiCache t3.micro: ~$15/month
- Azure Basic C0: ~$18/month
- **Net Savings: Still $335/month**

---

## 📝 Next Steps

1. ✅ **Immediate**: Review and approve this roadmap
2. 🔄 **Week 1-2**: Implement SMS monitoring with Twilio webhooks
3. 🔄 **Week 3-4**: Migrate OTP to MongoDB (dev environment)
4. 🔄 **Week 5-6**: Test MongoDB in staging
5. 🔄 **Week 7**: Deploy MongoDB to production
6. 🔄 **Week 8-10**: Set up WhatsApp Business API
7. 🔄 **Week 11-12**: Implement WhatsApp integration
8. 🔄 **Week 13**: User testing and rollout

---

**Document Version:** 1.0  
**Last Updated:** November 16, 2025  
**Status:** Planning Phase

