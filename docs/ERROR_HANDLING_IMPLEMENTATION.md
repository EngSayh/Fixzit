# Fixzit Error Handling & Incident Management System (FEIS)

## 🎯 Overview

The Fixzit Error & Incident System (FEIS) provides comprehensive error handling with:
- Clear, indexed error codes with multilingual support (EN/AR)
- Non-blocking UI with toast notifications
- One-click "Copy details" and "Send to Support" functionality
- Automatic ticket creation for critical errors
- Guest user support with minimal information collection
- Full compliance with RFC 9457 (Problem Details)
- Integration with existing Support & Helpdesk module

## 📁 Implementation Structure

```
src/
├── errors/
│   ├── problem.ts          # RFC 9457 Problem Details types
│   └── registry.ts         # Comprehensive error code registry
├── lib/
│   ├── trace.ts           # Correlation ID and trace context
│   └── api/
│       └── problemResponse.ts  # API response helpers
├── hooks/
│   └── useErrorReporter.ts    # Main error reporting hook
├── contexts/
│   └── ErrorContext.tsx       # Global error state & toasts
├── components/
│   ├── ErrorPopup.tsx         # Non-blocking error dialog
│   └── system/
│       └── ErrorListeners.tsx # Global error listeners
├── providers/
│   └── ErrorProvider.tsx      # Error provider wrapper
└── server/
    └── models/
        └── ErrorEvent.ts      # MongoDB error tracking models

app/
├── api/
│   ├── support/
│   │   └── incidents/route.ts  # Fire-and-forget incident reporting
│   └── admin/
│       └── error-registry/route.ts  # Export error registry
```

## 🔧 Integration Guide

### 1. Add Error Provider to Layout

```typescript
// app/layout.tsx or your root layout
import ErrorProviderWrapper from '@/src/providers/ErrorProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          <ErrorProviderWrapper>
            {children}
          </ErrorProviderWrapper>
        </Providers>
      </body>
    </html>
  );
}
```

### 2. Handle Errors in Components

```typescript
import { useErrorReporter } from '@/src/hooks/useErrorReporter';
import { useError } from '@/src/contexts/ErrorContext';

export default function MyComponent() {
  const reporter = useErrorReporter();
  const { notify } = useError();

  const handleApiCall = async () => {
    try {
      const response = await fetch('/api/work-orders');
      if (!response.ok) {
        const problem = await response.json();
        
        // Report error and show notification
        const incidentId = await reporter.send(problem);
        await notify(problem.code, { incidentId });
      }
    } catch (error) {
      // Handle network errors
      await reporter.send(error as Error, {
        category: 'NETWORK',
        autoTicket: true
      });
    }
  };
}
```

### 3. Return Problem Details from APIs

```typescript
// app/api/work-orders/route.ts
import { problem, ErrorResponses } from '@/src/lib/api/problemResponse';

export async function POST(req: NextRequest) {
  try {
    // Validation
    const data = await req.json();
    if (!data.title) {
      return ErrorResponses.badRequest([
        { path: 'title', message: 'Title is required' }
      ]);
    }
    
    // Process...
    
  } catch (error) {
    return ErrorResponses.serverError('WO-API-SAVE-002', error.message);
  }
}
```

## 📋 Error Code Registry

### Code Format
```
MODULE-LAYER-CATEGORY-NNN
```

- **MODULE**: WO (Work Orders), FIN (Finance), PROP (Properties), etc.
- **LAYER**: API, UI, DB, NET
- **CATEGORY**: VAL (Validation), AUTH (Authorization), SAVE, FETCH, etc.
- **NNN**: Sequential number

### Severity Levels
- **P0**: Critical - System down, data loss risk
- **P1**: High - Major feature broken, blocking users
- **P2**: Medium - Feature degraded, workaround exists
- **P3**: Low - Minor issue, cosmetic

### Export Registry
```bash
# Export as JSON
GET /api/admin/error-registry?format=json

# Export as CSV
GET /api/admin/error-registry?format=csv
```

## 🎨 UI/UX Behavior

### Toast Notifications
- Appear bottom-right (bottom-left for RTL)
- Auto-dismiss after 8 seconds
- Show error title and incident ID
- "View details" link opens full dialog

### Error Dialog
- Non-blocking modal overlay
- Shows full error details
- Multiple errors displayed as list
- Copy button with confirmation
- Send to Support with one click
- Guest users prompted for email/phone

### Guest vs Authenticated Users
- **Authenticated**: User info auto-attached
- **Guests**: Simple form for name/email/phone
- Email required, others optional

## 🔐 Privacy & Security

- Stack traces are redacted for PII
- Passwords/tokens never logged
- Guest information handled separately
- Tenant isolation enforced
- Role-based visibility for error reports

## 📊 Monitoring & Analytics

### Error Event Collection
```typescript
{
  incidentId: string;
  code: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  module: string;
  occurrences: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  orgId?: string;
  user?: { userId, email, role };
  ticketId?: string;
}
```

### Dashboard Queries
```typescript
// Get error summary by module
const summary = await ErrorEvent.getModuleSummary(orgId, {
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  end: new Date()
});
```

## 🧪 Testing

### Manual Testing
1. Visit `/src/examples/error-handling-example.tsx`
2. Test each error type
3. Verify toasts appear
4. Check dialog functionality
5. Confirm ticket creation

### E2E Tests
```typescript
test('Error handling flow', async ({ page }) => {
  // Trigger error
  await page.click('[data-test="trigger-error"]');
  
  // Check toast
  await expect(page.locator('.error-toast')).toBeVisible();
  
  // Open details
  await page.click('text=View details');
  
  // Verify dialog
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  
  // Send to support
  await page.click('text=Send to Support');
  
  // Verify success
  await expect(page.locator('text=Report sent')).toBeVisible();
});
```

## 🚀 Deployment Checklist

- [ ] Set `MONGODB_URI` environment variable
- [ ] Run database migrations for error collections
- [ ] Configure Support module categories
- [ ] Set up error monitoring alerts
- [ ] Train support team on error codes
- [ ] Document common error resolutions

## 📈 Performance Considerations

- SendBeacon API for reliability on page unload
- Debounced error reporting (800ms aggregation)
- Maximum 5 toasts displayed
- Automatic cleanup of old occurrences
- Indexed queries for fast lookups

## 🌍 Internationalization

- Error messages in English and Arabic
- RTL support for all UI components
- Locale detection from user context
- Fallback to browser language

## 📚 References

- [RFC 9457 - Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc9457)
- [Apple Human Interface Guidelines - Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
- [Microsoft Error Message Guidelines](https://docs.microsoft.com/en-us/windows/win32/uxguide/mess-error)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
