# Fixzit AI Chatbot Specification

## Overview

The Fixzit AI Chatbot is an intelligent, privacy-aware assistant designed to provide self-service support to users across all modules of the Fixzit platform. The chatbot maintains strict tenant isolation, respects user roles and permissions, and provides contextual assistance based on the user's scope and available actions.

## Core Features

### 1. Always-On Corner Widget
- **Floating Action Button**: Bottom-right corner, always visible
- **Collapsible Chat Interface**: Slide-up panel with chat history
- **Responsive Design**: Works on desktop, tablet, and mobile
- **RTL Support**: Full Arabic/English support with proper text direction

### 2. Privacy-First Architecture
- **Tenant Isolation**: Strict separation between different organizations
- **Role-Based Access**: Responses filtered by user permissions
- **PII Protection**: Personal data masked and secured
- **Audit Logging**: All conversations logged for compliance

### 3. Self-Service Capabilities
- **Work Order Management**: Create, list, and track tickets
- **Property Information**: Access property details within scope
- **System Guidance**: Help with navigation and features
- **Multi-language Support**: Arabic and English interfaces

### 4. Auto-Learning System
- **Knowledge Base Scanner**: Automatically indexes system documentation
- **Real-time Updates**: Learns from new features and changes
- **Contextual Responses**: Provides accurate, up-to-date information
- **Smart Search**: Finds relevant information across modules

## Technical Implementation

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Chat Widget   │───▶│  Chat API Route  │───▶│  Knowledge Base │
│  (React/TS)     │    │  (Next.js API)   │    │  (MongoDB)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Action Tools   │
                       │  (REST Endpoints)│
                       └──────────────────┘
```

### Components

#### 1. ChatWidget Component (`src/components/ai/ChatWidget.tsx`)
- **Purpose**: Main user interface for the chatbot
- **Features**:
  - Floating button with open/close state
  - Chat message display with RTL support
  - Quick action buttons for common tasks
  - Session management and user context
  - Error handling and loading states

#### 2. Chat API Route (`app/api/ai/chat/route.ts`)
- **Purpose**: Server-side processing of chat requests
- **Security Features**:
  - User session validation
  - Privacy policy enforcement
  - RBAC permission checking
  - Cross-tenant data protection
  - Audit logging

#### 3. Knowledge Scanner (`scripts/knowledge-scanner.ts`)
- **Purpose**: Auto-learning system for system documentation
- **Features**:
  - Scans source code and documentation
  - Extracts relevant information by module
  - Generates searchable knowledge base
  - Supports Arabic and English content

## Privacy & Security

### Data Isolation
- **Organization Scope**: All data filtered by `orgId`
- **User Scope**: Personal data limited to user's own information
- **Role-Based Access**: Information access controlled by user role
- **Audit Trail**: All access logged with timestamps and context

### Information Classification
The system classifies all information requests into categories:

1. **PUBLIC**: General system information, help guides
2. **TENANT_SCOPED**: Information within user's organization
3. **OWNER_SCOPED**: Information about user's own properties/units
4. **RESTRICTED**: Sensitive data requiring higher permissions
5. **PROHIBITED**: Cross-tenant or unauthorized data

### Privacy Policy Enforcement

```typescript
// Example privacy check in chat API
if (request.includes('other tenant') || request.includes('شركة مختلفة')) {
  return {
    allowed: false,
    message: 'لا يمكنني مشاركة معلومات مستأجرين آخرين لحماية خصوصية البيانات'
  };
}
```

## Integration Points

### Existing System Integration
- **Authentication**: Uses existing JWT/session system
- **RBAC**: Leverages current role-based access control
- **Database**: Works with existing MongoDB collections
- **UI Components**: Uses existing design system and components

### API Endpoints Used
- **Session Management**: `/api/session/me`
- **Work Orders**: `/api/work-orders` (create, list, update)
- **Properties**: `/api/properties` (read within scope)
- **User Management**: `/api/users` (for permissions)

## User Experience

### Guest Users
- Can browse marketplace without login
- Limited assistance for general questions
- Guided to sign in for personalized help
- Privacy notice prominently displayed

### Authenticated Users
- Personalized assistance based on role
- Access to self-service tools
- Contextual help for current page/module
- Quick actions for common tasks

### Role-Specific Features

#### Tenant Users
- Create maintenance tickets
- View own tickets and status
- Get property-specific information
- Access marketplace features

#### Property Managers
- All tenant features plus:
- Create tickets for managed properties
- View all tickets in scope
- Access property management tools

#### Administrators
- Full system access within tenant scope
- Advanced troubleshooting assistance
- System configuration guidance
- User management help

## Deployment & Configuration

### Environment Variables
```env
# AI Configuration
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini

# Database
MONGODB_URI=mongodb://localhost:27017/fixzit
MONGODB_DB=fixzit

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation Steps
1. Copy chatbot components to `src/components/ai/`
2. Add API routes to `app/api/ai/`
3. Update environment variables
4. Run knowledge scanner: `npm run scan-knowledge`
5. Add widget to main layout

### Auto-Learning Setup
1. Configure knowledge scanner paths
2. Set up cron job or CI integration
3. Enable real-time indexing for new content
4. Monitor knowledge base health

## Testing & Quality Assurance

### Test Coverage
- Unit tests for chat components
- Integration tests for API endpoints
- Privacy enforcement tests
- Cross-tenant isolation tests
- Arabic/English language tests

### Performance Benchmarks
- Response time < 2 seconds
- Memory usage < 100MB per conversation
- Knowledge search < 500ms
- Concurrent users: 100+ without degradation

## Monitoring & Analytics

### Metrics Tracked
- Conversation count by role
- Response accuracy and satisfaction
- Privacy violations prevented
- Knowledge base coverage
- Performance metrics

### Audit Requirements
- All conversations logged
- Privacy checks recorded
- Failed requests tracked
- User feedback collected

## Compliance & Standards

### KSA Compliance
- **PDPL Alignment**: Personal Data Protection Law compliance
- **NDMO Standards**: National Data Management Office guidelines
- **SAMA Requirements**: Saudi Arabian Monetary Authority data standards
- **CITF Framework**: Communications and Information Technology Commission

### International Standards
- **GDPR Equivalency**: Data protection standards
- **SOC 2 Type II**: Security and privacy controls
- **ISO 27001**: Information security management
- **WCAG 2.1 AA**: Accessibility standards

## Future Enhancements

### Planned Features
- **Voice Integration**: Voice-to-text and text-to-speech
- **Advanced Analytics**: Conversation insights and trends
- **Multi-Modal Support**: Image and document analysis
- **Proactive Assistance**: Context-aware suggestions
- **Integration Hub**: Connect with external systems

### Scalability Considerations
- **Horizontal Scaling**: Support for multiple AI providers
- **Caching Strategy**: Redis integration for session management
- **Database Optimization**: Vector database for better performance
- **Load Balancing**: Distribute requests across instances

## Support & Maintenance

### Regular Tasks
- **Knowledge Updates**: Weekly scanning and indexing
- **Privacy Audits**: Monthly review of access patterns
- **Performance Monitoring**: Daily health checks
- **User Feedback**: Quarterly satisfaction surveys

### Troubleshooting Guide
- **Widget Not Loading**: Check browser console for errors
- **Privacy Violations**: Review audit logs for patterns
- **Slow Responses**: Monitor database performance
- **Language Issues**: Verify locale detection

## Conclusion

The Fixzit AI Chatbot represents a comprehensive solution for intelligent self-service support while maintaining the highest standards of privacy, security, and compliance. The system integrates seamlessly with the existing Fixzit platform architecture and provides users with contextual, role-appropriate assistance.

The implementation follows all established patterns for tenant isolation, role-based access control, and privacy protection, ensuring that users receive helpful assistance without compromising data security or system integrity.
