# SendGrid Production Configuration Guide

## Overview

Fixzit now has a **production-ready SendGrid integration** with support for:

- ✅ Multiple sender identities (from/reply-to)
- ✅ Dynamic templates
- ✅ Webhook event tracking (delivery, opens, clicks, bounces)
- ✅ Unsubscribe groups
- ✅ IP pools for better deliverability
- ✅ MongoDB tracking for all email events
- ✅ Webhook signature verification

## Quick Setup

### 1. Basic Configuration (Required)

Add these secrets to GitHub Actions or your `.env` file:

```bash
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@fixzit.co
SENDGRID_FROM_NAME=Fixzit
```

### 2. Advanced Configuration (Recommended for Production)

```bash
# Reply-To Configuration (for customer responses)
SENDGRID_REPLY_TO_EMAIL=support@fixzit.co
SENDGRID_REPLY_TO_NAME=Fixzit Support

# Unsubscribe Group (for email preference management)
SENDGRID_UNSUBSCRIBE_GROUP_ID=12345

# IP Pool (for better deliverability with dedicated IPs)
SENDGRID_IP_POOL_NAME=your_pool_name

# Webhook Verification (for security)
SENDGRID_WEBHOOK_VERIFICATION_KEY=your_verification_key
```

### 3. Dynamic Templates (Optional but Recommended)

SendGrid dynamic templates provide:

- Professional, consistent branding
- Easy A/B testing
- No code deployments for email changes
- Better deliverability

```bash
SENDGRID_TEMPLATE_WELCOME=d-abc123...
SENDGRID_TEMPLATE_PASSWORD_RESET=d-def456...
SENDGRID_TEMPLATE_NOTIFICATION=d-ghi789...
SENDGRID_TEMPLATE_INVOICE=d-jkl012...
```

## SendGrid Dashboard Setup

### Step 1: Verify Sender Identity

1. Go to **Settings** → **Sender Authentication**
2. Verify your domain OR single sender
3. Add DNS records (SPF, DKIM, DMARC)
4. Wait for verification (~24-48 hours)

**Domain Authentication (Recommended)**:

- Better deliverability
- Can send from any `@fixzit.co` address
- Professional appearance

**Single Sender (Quick Start)**:

- Verify single email address
- Faster setup (~5 minutes)
- Limited to one sender

### Step 2: Create Dynamic Templates

1. Go to **Email API** → **Dynamic Templates**
2. Click **Create a Dynamic Template**
3. Name it (e.g., "Welcome Email")
4. Design your template using the editor
5. Add handlebar variables: `{{errorId}}`, `{{registrationLink}}`, etc.
6. Save and get the Template ID (e.g., `d-abc123...`)
7. Add to environment: `SENDGRID_TEMPLATE_WELCOME=d-abc123...`

**Template Variables Available**:

```javascript
{
  errorId: "ERR-ABC123",
  registrationLink: "https://fixzit.co/register?token=...",
  subject: "Welcome to Fixzit",
  currentYear: 2025,
  supportEmail: "support@fixzit.co"
}
```

### Step 3: Configure Unsubscribe Groups

1. Go to **Suppressions** → **Unsubscribe Groups**
2. Create groups:
   - Marketing Emails
   - System Notifications
   - Transactional Emails
   - Product Updates
3. Get the Group ID (e.g., `12345`)
4. Add to environment: `SENDGRID_UNSUBSCRIBE_GROUP_ID=12345`

### Step 4: Setup Event Webhook

1. Go to **Settings** → **Mail Settings** → **Event Webhook**
2. **HTTP Post URL**: `https://yourdomain.com/api/webhooks/sendgrid`
3. **Select Actions to Post**:
   - ✅ Processed
   - ✅ Delivered
   - ✅ Opened
   - ✅ Clicked
   - ✅ Bounced
   - ✅ Dropped
   - ✅ Spam Reports
   - ✅ Unsubscribes
4. **Enable Signed Event Webhook**: ✅ Enabled
5. **Verification Key**: Copy the key
6. Add to environment: `SENDGRID_WEBHOOK_VERIFICATION_KEY=your_key_here`
7. Click **Test Your Integration** to verify

### Step 5: IP Pools (Enterprise Only)

If you have dedicated IPs:

1. Go to **Settings** → **IP Addresses**
2. Create IP Pool (e.g., "Production")
3. Add your dedicated IPs to the pool
4. Add to environment: `SENDGRID_IP_POOL_NAME=Production`

## GitHub Secrets Setup

### Via GitHub Web Interface

1. Go to: https://github.com/EngSayh/Fixzit/settings/secrets/actions
2. Click **New repository secret**
3. Add each secret:

| Secret Name                         | Value             | Required                 |
| ----------------------------------- | ----------------- | ------------------------ |
| `SENDGRID_API_KEY`                  | Your API key      | ✅ Required              |
| `SENDGRID_FROM_EMAIL`               | noreply@fixzit.co | ✅ Required              |
| `SENDGRID_FROM_NAME`                | Fixzit            | ⚠️ Recommended           |
| `SENDGRID_REPLY_TO_EMAIL`           | support@fixzit.co | ⚠️ Recommended           |
| `SENDGRID_REPLY_TO_NAME`            | Fixzit Support    | ⚠️ Recommended           |
| `SENDGRID_UNSUBSCRIBE_GROUP_ID`     | Your group ID     | 📋 Optional              |
| `SENDGRID_IP_POOL_NAME`             | Your pool name    | 📋 Optional (Enterprise) |
| `SENDGRID_WEBHOOK_VERIFICATION_KEY` | Your key          | ⚠️ Recommended           |
| `SENDGRID_TEMPLATE_WELCOME`         | d-abc123...       | 📋 Optional              |
| `SENDGRID_TEMPLATE_PASSWORD_RESET`  | d-def456...       | 📋 Optional              |
| `SENDGRID_TEMPLATE_NOTIFICATION`    | d-ghi789...       | 📋 Optional              |
| `SENDGRID_TEMPLATE_INVOICE`         | d-jkl012...       | 📋 Optional              |

### Via GitHub CLI

```bash
# Required secrets
gh secret set SENDGRID_API_KEY --body "SG.your_api_key_here"
gh secret set SENDGRID_FROM_EMAIL --body "noreply@fixzit.co"
gh secret set SENDGRID_FROM_NAME --body "Fixzit"

# Recommended secrets
gh secret set SENDGRID_REPLY_TO_EMAIL --body "support@fixzit.co"
gh secret set SENDGRID_REPLY_TO_NAME --body "Fixzit Support"
gh secret set SENDGRID_WEBHOOK_VERIFICATION_KEY --body "your_key_here"

# Optional secrets
gh secret set SENDGRID_UNSUBSCRIBE_GROUP_ID --body "12345"
gh secret set SENDGRID_TEMPLATE_WELCOME --body "d-abc123..."
```

## Code Usage

### Sending Basic Email

```typescript
import sgMail from "@sendgrid/mail";
import { getSendGridConfig, getBaseEmailOptions } from "@/lib/sendgrid-config";

const config = getSendGridConfig();
sgMail.setApiKey(config.apiKey);

const baseOptions = getBaseEmailOptions();

await sgMail.send({
  ...baseOptions,
  to: "user@example.com",
  subject: "Welcome to Fixzit",
  html: "<h1>Welcome!</h1>",
  text: "Welcome!",
  customArgs: {
    emailId: "unique-id",
    type: "welcome",
  },
});
```

### Using Dynamic Template

```typescript
import { getTemplateId } from "@/lib/sendgrid-config";

const templateId = getTemplateId("welcome");

if (templateId) {
  await sgMail.send({
    ...baseOptions,
    to: "user@example.com",
    templateId,
    dynamicTemplateData: {
      errorId: "ERR-123",
      registrationLink: "https://...",
      currentYear: 2025,
    },
  });
}
```

## Monitoring & Analytics

### Email Logs Collection

All emails are tracked in MongoDB `email_logs` collection:

```javascript
{
  emailId: "WEL-ABC123",
  type: "welcome_email",
  recipient: "user@example.com",
  subject: "Welcome to Fixzit",
  status: "delivered",
  sentAt: ISODate("2025-10-24T12:00:00Z"),
  deliveredAt: ISODate("2025-10-24T12:00:05Z"),
  opened: true,
  openedAt: ISODate("2025-10-24T12:05:00Z"),
  clicked: true,
  clickedAt: ISODate("2025-10-24T12:06:00Z"),
  openCount: 3,
  clickCount: 2,
  clickedUrls: ["https://fixzit.co/register"],
  provider: "sendgrid",
  events: {
    processed: ISODate("..."),
    delivered: ISODate("..."),
    open: ISODate("..."),
    click: ISODate("...")
  }
}
```

### Query Email Status

```bash
# Check delivery status
curl "https://yourdomain.com/api/support/welcome-email?email=user@example.com"
```

### SendGrid Dashboard

1. Go to **Activity** → **Email Activity Feed**
2. Filter by:
   - Email address
   - Status (delivered, opened, clicked, bounced)
   - Date range
3. View detailed event logs

## Testing

### Local Development

```bash
# Set environment variables
cp env.example .env.local
# Add your SendGrid credentials

# Start dev server
pnpm dev

# Send test email
curl -X POST http://localhost:3000/api/support/welcome-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "subject": "Test Email",
    "errorId": "TEST-123",
    "registrationLink": "https://fixzit.co/register"
  }'
```

### Webhook Testing

```bash
# Install ngrok for local webhook testing
npm install -g ngrok

# Expose local server
ngrok http 3000

# Use ngrok URL in SendGrid webhook settings
# https://abc123.ngrok.io/api/webhooks/sendgrid
```

## Troubleshooting

### Issue: "Email service not configured"

**Solution**: Ensure `SENDGRID_API_KEY` is set:

```bash
echo $SENDGRID_API_KEY
# Should output: SG.xxx...
```

### Issue: "Invalid signature" on webhook

**Solution**:

1. Verify `SENDGRID_WEBHOOK_VERIFICATION_KEY` is correct
2. Check webhook is enabled in SendGrid dashboard
3. Ensure raw body is used for signature verification

### Issue: Emails going to spam

**Solution**:

1. Complete domain authentication (SPF, DKIM, DMARC)
2. Warm up IP addresses gradually
3. Monitor sender reputation
4. Use dedicated IP pool
5. Clean your email list regularly

### Issue: Template not found

**Solution**:

1. Verify template ID is correct: `d-abc123...`
2. Check template is active in SendGrid dashboard
3. Ensure environment variable is set correctly

## Best Practices

### 1. Deliverability

- ✅ Authenticate your domain (SPF, DKIM, DMARC)
- ✅ Use consistent "from" addresses
- ✅ Include unsubscribe links
- ✅ Monitor bounce rates (<5%)
- ✅ Clean email lists regularly
- ✅ Warm up new IPs gradually

### 2. Security

- ✅ Enable webhook signature verification
- ✅ Use HTTPS for webhook endpoints
- ✅ Rotate API keys regularly
- ✅ Use separate keys for dev/staging/production
- ✅ Monitor for unauthorized sends

### 3. Performance

- ✅ Use dynamic templates (faster than inline HTML)
- ✅ Batch send for bulk emails
- ✅ Monitor API rate limits
- ✅ Use IP pools to segregate traffic
- ✅ Track and optimize open/click rates

### 4. Compliance

- ✅ Include CAN-SPAM compliant footer
- ✅ Honor unsubscribe requests immediately
- ✅ Maintain suppression lists
- ✅ Include physical mailing address
- ✅ Follow GDPR requirements for EU users

## Support

- **SendGrid Dashboard**: https://app.sendgrid.com/
- **API Documentation**: https://docs.sendgrid.com/
- **Support**: support@sendgrid.com
- **Status Page**: https://status.sendgrid.com/

## Upgrade Path

### Trial Account Limitations

- 100 emails/day
- Expires: Check your account
- No dedicated IPs

### Production Account

1. Upgrade to Pro or Premier plan
2. Benefits:
   - Unlimited emails
   - Dedicated IPs
   - Priority support
   - Advanced analytics
   - Subuser management
3. Pricing: https://sendgrid.com/pricing/

---

**Last Updated**: October 24, 2025  
**Version**: 2.0.0 - Production Ready
