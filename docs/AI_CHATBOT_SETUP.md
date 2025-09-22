# Fixzit AI Chatbot Setup Guide

## Overview

This guide provides comprehensive instructions for implementing the Fixzit AI Chatbot system with privacy enforcement, tenant isolation, and KSA compliance.

## Prerequisites

### System Requirements
- **Next.js 14+** with App Router
- **MongoDB 6+** (mongos/sharded clusters supported)
- **Node.js 18+**
- **TypeScript 5+**
- **Tailwind CSS** (for styling)

### Required Services
- **OpenAI API** (for GPT models) - Optional for basic functionality
- **MongoDB Atlas** (recommended for production)

## Installation

### 1. Copy Files to Your Project

```bash
# Copy all AI chatbot files to your project
cp -r src/components/ai/ your-project/src/components/
cp -r app/api/ai/ your-project/app/api/
cp -r app/api/session/ your-project/app/api/
cp scripts/knowledge-scanner.ts your-project/scripts/
```

### 2. Install Dependencies

```bash
npm install openai zod mongodb jose langchain @langchain/community
npm install -D @playwright/test
```

### 3. Environment Variables

Add to your `.env.local`:

```env
# AI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/fixzit
MONGODB_DB=fixzit

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000/api

# Knowledge Base Configuration
KB_UPDATE_INTERVAL=3600000  # 1 hour
KB_MAX_ENTRIES=10000

# Privacy & Security
AI_AUDIT_LOG=true
AI_RATE_LIMIT=60  # requests per minute

# KSA Compliance
ENABLE_KSA_COMPLIANCE=true
PDPL_COMPLIANCE=true
ZATCA_INTEGRATION=false  # Enable when ready
```

### 4. Database Setup

#### Create Required Collections

```javascript
// MongoDB shell commands
use fixzit;

// AI conversations log
db.createCollection('ai_conversations');
db.ai_conversations.createIndex({ userId: 1, orgId: 1, timestamp: -1 });

// AI actions log
db.createCollection('ai_actions');
db.ai_actions.createIndex({ userId: 1, orgId: 1, timestamp: -1 });

// Knowledge base
db.createCollection('ai_knowledge_base');
db.ai_knowledge_base.createIndex({ module: 1, type: 1, tags: 1 });

// Work orders (if not exists)
db.createCollection('work_orders');
db.work_orders.createIndex({ createdBy: 1, orgId: 1, status: 1 });
```

### 5. Add Chat Widget to Layout

Update your main layout file (`app/layout.tsx`):

```typescript
// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import ChatWidget from '@/src/components/ai/ChatWidget';

const inter = Inter({ subsets: ['latin', 'arabic'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <body className={inter.className}>
        <div className="min-h-screen">
          {children}
          {/* AI Chatbot Widget - Always Available */}
          <ChatWidget />
        </div>
      </body>
    </html>
  );
}
```

### 6. Update Middleware (if needed)

Ensure your middleware allows public access to AI endpoints:

```typescript
// middleware.ts
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/api/session/me',
  '/api/ai/chat',
  '/api/ai/tools/*',
  // ... other public routes
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public AI endpoints
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // ... rest of middleware
}
```

## Configuration

### 1. Knowledge Base Setup

Run the knowledge scanner to index your system:

```bash
# Scan and index system documentation
npm run scan-knowledge

# Or run directly
npx tsx scripts/knowledge-scanner.ts src app docs
```

### 2. Arabic/RTL Support

The system automatically detects user locale:

```typescript
// Automatically detected from Accept-Language header
const locale = req.headers.get('accept-language')?.startsWith('ar') ? 'ar' : 'en';
const dir = locale === 'ar' ? 'rtl' : 'ltr';
```

### 3. Privacy Settings

Configure privacy enforcement in `src/lib/ai/privacy.ts`:

```typescript
export const PRIVACY_CONFIG = {
  enableCrossTenantCheck: true,
  enablePIIRedaction: true,
  enableAuditLogging: true,
  maxConversationHistory: 50,
  dataRetentionDays: 90,
  ksaCompliance: true
};
```

## Usage

### 1. Basic Chat

Users can start chatting immediately:

```typescript
// User types: "Create a maintenance ticket"
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Create a maintenance ticket' }],
    session: { userId, orgId, role, locale }
  })
});
```

### 2. Self-Service Commands

The chatbot supports slash commands:

- `/new-ticket` - Create maintenance ticket
- `/my-tickets` - List user's tickets
- `/help` - Show available commands
- `/status` - Check system status

### 3. Programmatic Usage

```typescript
// Create ticket programmatically
const ticketResponse = await fetch('/api/ai/tools/create-ticket', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    title: 'AC not working',
    description: 'Air conditioning unit in office is not cooling',
    priority: 'high'
  })
});
```

## Security & Privacy

### 1. Tenant Isolation

All queries are scoped by `orgId`:

```typescript
// Example: Work orders query
const tickets = await db.collection('work_orders')
  .find({ orgId: user.orgId, createdBy: user.id })
  .toArray();
```

### 2. Role-Based Access

Permissions checked against RBAC matrix:

```typescript
if (!canPerformAction(user.role, 'work_orders', 'create')) {
  return { error: 'Insufficient permissions' };
}
```

### 3. Audit Logging

All AI interactions logged:

```typescript
await db.collection('ai_actions').insertOne({
  type: 'create_ticket',
  userId: user.id,
  orgId: user.orgId,
  details: { title, description },
  timestamp: new Date(),
  source: 'ai_assistant'
});
```

## KSA Compliance

### 1. PDPL Compliance

- **Data Minimization**: Only necessary data collected
- **Purpose Limitation**: Data used only for intended purposes
- **Consent Management**: Clear consent for data processing
- **Data Subject Rights**: Support for access, correction, deletion requests

### 2. Data Protection Measures

```typescript
// PII redaction in responses
response = removeSaudiMobileNumbers(response);
response = removeNationalIDs(response);
response = removeEmailAddresses(response);
```

### 3. Audit Requirements

- All data access logged with timestamps
- Privacy impact assessments conducted
- Regular compliance reviews
- Incident response procedures

## Testing

### 1. Run Tests

```bash
# Install Playwright
npx playwright install

# Run AI chatbot tests
npm run test:ai

# Run all tests
npm test
```

### 2. Test Scenarios

```typescript
// Test privacy enforcement
test('should not allow cross-tenant data access', async () => {
  const response = await chatWithBot('Show me tickets from other departments');
  expect(response).toContain('privacy restrictions');
});

// Test role-based access
test('should allow tenant to create tickets', async () => {
  const response = await chatWithBot('/new-ticket title:Test priority:high');
  expect(response.ticketId).toBeDefined();
});

// Test Arabic language support
test('should respond in Arabic when locale is ar', async () => {
  const response = await chatWithBot('مساعدة', 'ar');
  expect(response).toContain('يمكنني مساعدتك');
});
```

## Monitoring & Analytics

### 1. Performance Monitoring

```typescript
// Track response times
const startTime = Date.now();
const response = await chatWithAI(message);
const endTime = Date.now();

await logMetric('ai_response_time', endTime - startTime);
```

### 2. Usage Analytics

```typescript
// Track popular features
const analytics = {
  totalConversations: await getConversationCount(),
  popularActions: await getPopularActions(),
  userSatisfaction: await getSatisfactionScores(),
  errorRate: await getErrorRate()
};
```

### 3. Privacy Monitoring

```typescript
// Monitor privacy violations
const privacyViolations = await db.collection('ai_actions')
  .find({ type: 'privacy_violation' })
  .count();

if (privacyViolations > threshold) {
  alertPrivacyTeam();
}
```

## Troubleshooting

### Common Issues

#### 1. Widget Not Loading
```bash
# Check browser console for errors
# Verify ChatWidget component is imported correctly
# Check if session API is responding
```

#### 2. Privacy Violations
```bash
# Check audit logs for violation patterns
# Review privacy policy configuration
# Verify user session includes orgId
```

#### 3. Slow Responses
```bash
# Check MongoDB connection
# Verify OpenAI API key
# Monitor knowledge base size
```

### Debug Commands

```bash
# Test session API
curl http://localhost:3000/api/session/me

# Test chat API
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# Run knowledge scanner
npm run scan-knowledge
```

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Knowledge base indexed
- [ ] Privacy policies reviewed
- [ ] Environment variables configured
- [ ] Database collections created
- [ ] Audit logging enabled

### Production Deployment
- [ ] Enable production MongoDB cluster
- [ ] Configure production OpenAI settings
- [ ] Set up monitoring and alerting
- [ ] Configure backup procedures
- [ ] Test with production data

### Post-Deployment
- [ ] Verify chatbot functionality
- [ ] Test privacy enforcement
- [ ] Monitor performance metrics
- [ ] Check audit logs
- [ ] Validate KSA compliance

## Support & Maintenance

### Regular Tasks
1. **Weekly**: Update knowledge base with new documentation
2. **Monthly**: Review privacy audit logs
3. **Quarterly**: Update AI models and dependencies
4. **Annually**: Conduct security assessment

### Emergency Procedures
1. **Privacy Incident**: Immediate investigation and user notification
2. **Service Outage**: Fallback to manual support
3. **Security Breach**: Isolate system and notify authorities

## Conclusion

The Fixzit AI Chatbot system is now ready for deployment. It provides intelligent assistance while maintaining strict privacy controls and KSA compliance. The system integrates seamlessly with your existing Fixzit architecture and provides self-service capabilities for users across all roles.

For additional support or customization, refer to the comprehensive documentation included in the package or contact the development team.
