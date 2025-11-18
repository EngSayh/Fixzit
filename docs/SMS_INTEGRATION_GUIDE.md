# SMS Integration - Testing Guide

## ✅ Implementation Complete

All SMS functionality has been integrated using Twilio for Saudi market notifications.

## Configuration

Add these environment variables to your `.env.local` file:

```bash
# Twilio SMS Configuration (Saudi Arabia)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+966XXXXXXXXX  # Your Twilio Saudi number
```

**Note**: These values should already be in your GitHub secrets.

## Features Implemented

### 1. Core SMS Service (`lib/sms.ts`)

```typescript
import { sendSMS, sendOTP, formatSaudiPhoneNumber } from '@/lib/sms';

// Send SMS
const result = await sendSMS('+966501234567', 'Your message here');
// Returns: { success: true, messageSid: 'SM...' }

// Send OTP
await sendOTP('+966501234567', '123456');

// Format phone numbers
formatSaudiPhoneNumber('0501234567') // '+966501234567'
formatSaudiPhoneNumber('966501234567') // '+966501234567'
formatSaudiPhoneNumber('501234567') // '+966501234567'
```

### 2. Seller Notifications (`services/notifications/seller-notification-service.ts`)

Automatically sends SMS for:
- ✅ **Budget Low**: When ad budget < threshold
- ✅ **Budget Depleted**: When ad budget runs out
- ✅ **Refund Processed**: When refund is completed
- ✅ **Withdrawal Complete**: When payout is sent

All messages are bilingual (Arabic/English) based on seller's preferred locale.

### 3. Test API Endpoint

**Endpoint**: `POST /api/sms/test`

#### Test Configuration
```bash
curl -X POST http://localhost:3000/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{"testConfig": true}'
```

**Response**:
```json
{
  "success": true,
  "message": "Twilio configuration is valid"
}
```

#### Send Test SMS
```bash
curl -X POST http://localhost:3000/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0501234567",
    "message": "Test message from Fixzit"
  }'
```

**Response**:
```json
{
  "success": true,
  "messageSid": "SM1234567890abcdef",
  "message": "SMS sent successfully"
}
```

## Phone Number Formats Supported

The system automatically handles these Saudi phone formats:

| Input Format | Output (E.164) |
|--------------|----------------|
| `0501234567` | `+966501234567` |
| `966501234567` | `+966501234567` |
| `501234567` | `+966501234567` |
| `+966501234567` | `+966501234567` |
| `050 123 4567` | `+966501234567` |
| `+966 50 123 4567` | `+966501234567` |

## Testing Seller Notifications

### 1. Start Development Server
```bash
pnpm dev
```

### 2. Test Configuration
```bash
# Test if Twilio credentials are valid
curl -X POST http://localhost:3000/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{"testConfig": true}'
```

### 3. Send Test Message to Your Phone
```bash
# Replace with your Saudi mobile number
curl -X POST http://localhost:3000/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0501234567",
    "message": "This is a test from Fixzit SMS service"
  }'
```

### 4. Test Seller Notification (Budget Alert)

Create a test seller and trigger notification:

```typescript
import { sendSellerNotification } from '@/services/notifications/seller-notification-service';

// Send budget low alert
await sendSellerNotification(
  'SELLER123',
  'BUDGET_LOW',
  {
    budgetRemaining: 50,
    campaignName: 'Summer Sale Campaign'
  }
);
```

**Expected SMS (Arabic)**:
```
تنبيه فيكسزت: رصيد إعلانات منخفض - 50 ريال. أضف رصيد للاستمرار.
```

**Expected SMS (English)**:
```
Fixzit Alert: Ad budget low - 50 SAR remaining. Add funds to continue.
```

## Monitoring

### Check SMS Status
```typescript
import { getSMSStatus } from '@/lib/sms';

const status = await getSMSStatus('SM1234567890abcdef');
console.log(status);
// {
//   status: 'delivered',
//   dateCreated: 2024-11-16T...,
//   dateSent: 2024-11-16T...,
// }
```

### Message Statuses (Twilio)
- `queued` - Message queued for sending
- `sending` - Message is being sent
- `sent` - Message sent to carrier
- `delivered` - Message delivered to recipient
- `failed` - Message failed to send
- `undelivered` - Message not delivered

## Bulk SMS (Marketing)

```typescript
import { sendBulkSMS } from '@/lib/sms';

const recipients = ['+966501234567', '+966509876543'];
const message = 'Special offer: 20% off all products this weekend!';

const result = await sendBulkSMS(recipients, message, {
  delayMs: 1000 // 1 second delay between messages
});

console.log(result);
// { sent: 2, failed: 0, results: [...] }
```

## Error Handling

The SMS service includes comprehensive error handling:

```typescript
const result = await sendSMS('invalid-number', 'Test');

if (!result.success) {
  console.error(result.error);
  // "Invalid Saudi phone number format: invalid-number"
}
```

## Production Checklist

- [x] Twilio account created
- [x] Saudi Arabia phone number purchased (+966)
- [ ] Environment variables added to production
- [ ] Test SMS sent successfully
- [ ] Seller notification templates verified
- [ ] Phone number validation tested
- [ ] Bulk SMS rate limiting configured
- [ ] Delivery status monitoring set up

## Costs (Twilio Pricing)

**Saudi Arabia SMS Pricing** (as of 2024):
- Outbound SMS: ~$0.07 USD per message
- Phone number rental: ~$15 USD/month

**Estimate for 1000 sellers**:
- Budget alerts: ~2 SMS/seller/month = 2000 SMS = $140/month
- Refunds: ~1 SMS/seller/month = 1000 SMS = $70/month
- Withdrawals: ~2 SMS/seller/month = 2000 SMS = $140/month

**Total**: ~$350/month for 1000 active sellers

## Troubleshooting

### "Twilio not configured"
- Check environment variables are set correctly
- Verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

### "Invalid phone number format"
- Ensure phone number starts with 05 (Saudi mobile)
- Valid: 0501234567, +966501234567
- Invalid: 0112345678 (landline), 0401234567 (wrong prefix)

### "Message failed to send"
- Check Twilio account balance
- Verify phone number is active
- Check Twilio dashboard for error details

### "Rate limit exceeded"
- Twilio has rate limits per account
- Use `sendBulkSMS` with delay for batch sending
- Consider upgrading Twilio plan for higher limits

## Next Steps

1. **Test with your phone number**:
   ```bash
   curl -X POST http://localhost:3000/api/sms/test \
     -H "Content-Type: application/json" \
     -d '{"phone": "YOUR_PHONE", "message": "Test from Fixzit"}'
   ```

2. **Monitor first week**:
   - Check SMS delivery rates
   - Verify message content in both languages
   - Track costs in Twilio dashboard

3. **Set up alerts**:
   - Twilio usage alerts (80% of budget)
   - Failed message notifications
   - Daily delivery reports

## Support

For issues or questions:
- Twilio Documentation: https://www.twilio.com/docs
- Twilio Console: https://console.twilio.com
- Internal: Contact DevOps team

---

**Implementation Status**: ✅ COMPLETE  
**Commit**: `a55ed4320` - "feat(sms): Integrate Twilio SMS for Saudi market notifications"  
**Date**: November 16, 2024
