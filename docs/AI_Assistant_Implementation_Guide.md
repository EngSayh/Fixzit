# Fixzit AI Assistant Implementation Guide

## Overview

The Fixzit AI Assistant is a privacy-first, always-available chatbot that provides self-service support to users across all modules of the Fixzit platform. It maintains strict tenant isolation, respects user roles and permissions, and provides contextual assistance.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Chat Widget   │───▶│  Chat API Route  │───▶│  Knowledge Base │
│  (React/TS)     │    │  (Next.js API)   │    │  (MongoDB)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Tool Actions   │
                       │  (RBAC Secured)  │
                       └──────────────────┘
```

## Key Components

### 1. Chat Widget (`src/components/ai/ChatWidget.tsx`)
- Always-on floating button (bottom-right, z-index: 9999)
- Slide-up chat interface with message history
- RTL/LTR support based on user locale
- Privacy notice showing tenant scope
- Quick action buttons for common tasks

### 2. Chat API (`app/api/ai/chat/route.ts`)
- Session validation and user authentication
- Privacy enforcement (cross-tenant blocking)
- Intent analysis and tool routing
- Knowledge base retrieval
- Conversation logging for audit

### 3. Privacy Policy (`src/lib/ai/privacy-policy.ts`)
- Data classification system
- Role-based access control
- PII redaction functions
- Enforcement mechanisms

### 4. Tool System (`src/lib/ai/tools.ts`)
- Structured tool definitions with Zod schemas
- Role-based tool access
- Parameter extraction from natural language
- Formatted responses in AR/EN

### 5. Knowledge Ingestion (`scripts/ingest-knowledge.ts`)
- Automatic scanning of docs, code, and APIs
- Embedding generation (mock or OpenAI)
- MongoDB storage with tenant isolation
- CI/CD integration for auto-learning

## Available Tools

### 1. Create Work Order
- **Command**: `/new-ticket` or natural language
- **Roles**: All authenticated users
- **Parameters**: title, description, priority, category
- **Example**: "Create a work order for AC not working"

### 2. List Work Orders
- **Command**: `/my-tickets` or natural language
- **Roles**: All authenticated users
- **Parameters**: status filter, limit, ownership
- **Example**: "Show my open tickets"

### 3. Approve Quotation
- **Command**: `/approve` or natural language
- **Roles**: Property Owner, Management, Finance, Admin
- **Parameters**: workOrderId, action, comments
- **Example**: "Approve quote for WO-123"

### 4. Owner Statements
- **Command**: `/statements` or natural language
- **Roles**: Property Owner, Finance, Management, Admin
- **Parameters**: ownerId, period (YTD/MTD)
- **Example**: "Show my YTD financial statements"

### 5. Schedule Maintenance
- **Command**: `/schedule` or natural language
- **Roles**: Technician, Management, Admin
- **Parameters**: propertyId, type, frequency
- **Example**: "Schedule monthly AC maintenance"

### 6. Dispatch Technician
- **Command**: `/dispatch` or natural language
- **Roles**: Technician, Management, Admin
- **Parameters**: workOrderId, technicianId, date
- **Example**: "Assign technician to WO-123"

## Privacy & Security

### Data Classification
1. **PUBLIC**: General help and guidance
2. **TENANT_SCOPED**: Data within user's organization
3. **OWNER_SCOPED**: Financial data for property owners
4. **USER_SCOPED**: Individual user's data only
5. **SENSITIVE**: System credentials, bulk exports

### Enforcement Mechanisms
- All queries filtered by `orgId`
- Role-based tool access
- PII redaction in responses
- Cross-tenant request blocking
- Audit logging of all interactions

### Privacy Responses
The assistant will politely refuse requests that violate privacy:
- "I cannot share information about other organizations"
- "You need finance permissions to access financial statements"
- "I can only show your own tickets and properties"

## Integration Steps

### 1. Environment Setup
```bash
# Required environment variables
MONGODB_URI=mongodb://localhost:27017/fixzit
MONGODB_DB=fixzit
OPENAI_API_KEY=sk-... # Optional, uses mock if not set
INGEST_KEY=super-secret-key
```

### 2. Install Dependencies
```bash
npm install openai zod mongodb jose
npm install -D @playwright/test
```

### 3. Database Setup
```javascript
// Create indexes for knowledge base
db.kb_documents.createIndex({ 
  embedding: "cosmosSearch" 
}, { 
  name: "vector_index",
  cosmosSearchOptions: {
    kind: "vector-ivf",
    numLists: 100,
    similarity: "COS",
    dimensions: 1536
  }
});

// Create conversation logs collection
db.ai_conversations.createIndex({ userId: 1, orgId: 1, timestamp: -1 });
```

### 4. Mount the Widget
```tsx
// In your layout or page
import ChatWidget from '@/src/components/ai/ChatWidget';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <ChatWidget />
    </>
  );
}
```

### 5. Knowledge Base Ingestion
```bash
# Initial ingestion
npm run ingest-knowledge

# Watch mode for development
npm run ingest-knowledge -- --watch

# CI/CD integration
# Add to your build pipeline
node scripts/ingest-knowledge.ts
```

## Customization

### Adding New Tools
1. Define schema in `src/lib/ai/tools.ts`
2. Create API endpoint in `app/api/ai/tools/`
3. Add tool definition to `AI_TOOLS` array
4. Update intent detection patterns

### Customizing Responses
1. Edit knowledge base content in docs
2. Update response templates in tools
3. Modify privacy messages
4. Add new language support

### Branding
- Colors: Update button background (`#0061A8`)
- Position: Modify `bottom-4 right-4` classes
- Size: Adjust `w-14 h-14` for button size
- Icons: Replace MessageCircle/X icons

## Testing

### Unit Tests
```bash
npm test src/lib/ai
```

### E2E Tests
```bash
npm run test:e2e tests/e2e/ai-assistant.spec.ts
```

### Manual Testing Checklist
- [ ] Widget appears on all pages
- [ ] Opens/closes properly
- [ ] RTL support works
- [ ] Privacy notice visible
- [ ] Tools execute correctly
- [ ] Cross-tenant blocking works
- [ ] Audit logs created
- [ ] Mobile responsive

## Monitoring & Maintenance

### Health Checks
- Monitor API response times
- Check knowledge base freshness
- Review denied requests
- Audit conversation logs

### Performance
- Knowledge base query optimization
- Response caching for common questions
- Rate limiting per user
- Connection pooling for MongoDB

### Security Updates
- Regular dependency updates
- Review privacy policy enforcement
- Update role permissions
- Audit log retention policy

## Troubleshooting

### Common Issues

1. **Widget not appearing**
   - Check z-index conflicts
   - Verify component is mounted
   - Check browser console for errors

2. **Session errors**
   - Ensure auth cookies are set
   - Check JWT expiration
   - Verify session endpoint

3. **Tool execution failures**
   - Check role permissions
   - Verify API endpoints exist
   - Review parameter validation

4. **Knowledge base issues**
   - Run ingestion script
   - Check MongoDB connection
   - Verify index creation

## Compliance

The AI Assistant adheres to:
- GDPR: Data minimization, right to access
- Multi-tenant isolation: Strict orgId filtering
- Audit requirements: Full conversation logging
- Accessibility: WCAG AA compliance
- RTL support: Full Arabic interface

## Future Enhancements

1. **Voice Interface**: Speech-to-text input
2. **Proactive Assistance**: Context-aware suggestions
3. **Advanced Analytics**: Usage patterns and insights
4. **Integration Webhooks**: Third-party tool connections
5. **Offline Mode**: Cached responses for common queries
