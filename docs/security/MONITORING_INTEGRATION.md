# Security Monitoring Integration Guide

## Step 1: Update Rate-Limited Routes

For each rate-limited route, replace the import:

```typescript
// OLD:
import { enforceRateLimit } from '@/lib/middleware/rate-limit';

// NEW:
import { enforceRateLimit } from '@/lib/middleware/enhanced-rate-limit';
```

The enhanced version includes automatic monitoring hooks.

## Step 2: Update Middleware.ts

Update your `middleware.ts` file to use enhanced CORS:

```typescript
import { handleCorsRequest, addCorsHeaders } from '@/lib/middleware/enhanced-cors';

export async function middleware(request: NextRequest) {
  // Handle CORS with monitoring
  const corsResponse = handleCorsRequest(request);
  if (corsResponse) return corsResponse;
  
  // ... rest of middleware logic
  
  // Add CORS headers to response
  const response = NextResponse.next();
  return addCorsHeaders(response, request.headers.get('origin'));
}
```

## Step 3: Configure Environment Variables

Copy `.env.security.template` to `.env.local` and fill in values:

```bash
cp .env.security.template .env.local.security
# Edit .env.local.security with your values
# Then append to .env.local:
cat .env.local.security >> .env.local
```

## Step 4: Set Up Alerting Webhook (Optional)

Configure a webhook URL to receive security alerts:

### Option A: Slack
1. Create a Slack webhook: https://api.slack.com/messaging/webhooks
2. Set SECURITY_ALERT_WEBHOOK to your Slack webhook URL

### Option B: Discord
1. Create a Discord webhook in your server settings
2. Set SECURITY_ALERT_WEBHOOK to your Discord webhook URL

### Option C: Custom Service
1. Deploy a webhook receiver (see examples/webhook-receiver.ts)
2. Set SECURITY_ALERT_WEBHOOK to your service URL

## Step 5: Test Monitoring

Run the security test suite to generate events:

```bash
pnpm tsx scripts/security/run-all-security-tests.sh
```

Check your logs for security events:

```bash
grep "RateLimit|CORS|Auth" logs/*.log
```

## Step 6: Set Up Dashboard (Optional)

Use the queries in `docs/security/MONITORING_QUERIES.md` with your monitoring service.

### DataDog
1. Create a new dashboard
2. Add widgets using the provided queries
3. Set up monitors for alert thresholds

### New Relic
1. Create a new dashboard
2. Add NRQL queries based on the templates
3. Set up alert policies

### Grafana
1. Create a new dashboard
2. Add panels with LogQL/PromQL queries
3. Configure alerting rules

## Monitoring Metrics

The following metrics are tracked:

- **Rate Limit Hits:** Count of 429 responses per endpoint
- **CORS Violations:** Count of blocked origins per endpoint
- **Auth Failures:** Count of failed authentications per user
- **Alert Triggers:** Count of threshold breaches

## Alert Thresholds (Configurable)

- Rate Limit: 100 hits in 5 minutes
- CORS Violations: 50 blocks in 5 minutes
- Auth Failures: 10 failures in 5 minutes

Adjust these in `lib/security/monitoring.ts` as needed.