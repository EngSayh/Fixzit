# Fixzit AI Assistant Privacy & Sharing Policy

**Version**: 1.0  
**Last Updated**: January 2025  
**Enforcement**: Programmatic (Code-Level)

## Executive Summary

The Fixzit AI Assistant operates under strict privacy controls to ensure data security, tenant isolation, and regulatory compliance. This policy defines what information the assistant can and cannot share, enforcement mechanisms, and audit requirements.

## Core Principles

1. **Tenant Isolation**: No data sharing across organizational boundaries
2. **Least Privilege**: Users only access data they need for their role
3. **Data Minimization**: Return only necessary information
4. **Transparency**: Clear denial messages when access is restricted
5. **Auditability**: All interactions logged for compliance

## What the AI Assistant CAN Share

### 1. User's Own Data
- Personal work orders and maintenance tickets
- Assigned properties and units
- Individual task assignments
- Personal notifications and alerts
- Profile information and preferences

### 2. Tenant-Scoped Data (Within Organization)
Based on user role:
- **Tenants**: Own unit information, submitted tickets
- **Technicians**: Assigned work orders, property access info
- **Property Managers**: All properties under management
- **Finance**: Financial reports within organization
- **HR**: Employee data within organization
- **Admins**: All data within tenant organization

### 3. Public Information
- Platform features and capabilities
- General help and guidance
- How-to instructions for allowed modules
- System status and announcements
- Marketplace listings (public view)

### 4. Role-Specific Financial Data
Only for authorized roles:
- **Property Owners**: Own property statements, income reports
- **Finance Team**: Organization-wide financial data
- **Management**: Summary reports and KPIs
- **Corporate Admin**: Full financial access

## What the AI Assistant CANNOT Share

### 1. Cross-Tenant Data ❌
- Information from other organizations
- Other companies' properties or users
- Cross-organization financial data
- Competitor information
- Multi-tenant aggregates

### 2. Sensitive Personal Information ❌
- Other users' personal details (PII)
- Email addresses (automatically redacted)
- Phone numbers (automatically redacted)
- National IDs (automatically redacted)
- Payment card information

### 3. System Security Information ❌
- Passwords or authentication tokens
- API keys or secrets
- Internal system configuration
- Database connection strings
- Security vulnerabilities

### 4. Restricted Module Data ❌
Without proper role:
- HR/Payroll data (HR role required)
- Financial statements (Finance role required)
- System settings (Admin role required)
- Compliance documents (Compliance role required)

### 5. Bulk Data Exports ❌
- Complete user lists
- All properties without filters
- Mass data downloads
- Unfiltered database dumps

## Enforcement Mechanisms

### 1. Pre-Request Validation
```javascript
// Automatic enforcement before processing
- Verify user session exists
- Check organization ID (orgId)
- Validate user role permissions
- Apply tenant isolation filters
```

### 2. Data Classification
All requests are classified into:
- `PUBLIC`: Available to all
- `TENANT_SCOPED`: Within organization only
- `OWNER_SCOPED`: Property owner data
- `USER_SCOPED`: Individual user only
- `SENSITIVE`: Highly restricted

### 3. Runtime Filtering
```javascript
// All database queries include:
{ orgId: user.orgId }  // Tenant isolation
{ userId: user.id }    // User-specific data
{ roles: { $in: user.roles } }  // Role-based access
```

### 4. Response Sanitization
- Automatic PII redaction
- Email masking: `[EMAIL_REDACTED]`
- Phone masking: `[PHONE_REDACTED]`
- ID masking: `[ID_REDACTED]`
- Token masking: `[TOKEN_REDACTED]`

### 5. Denial Messages

**English**:
- "I cannot share information about other organizations to protect data privacy."
- "You need finance permissions to access financial statements."
- "I can only show data from your organization."
- "This information requires administrator access."

**Arabic**:
- "لا يمكنني مشاركة معلومات عن منظمات أخرى لحماية خصوصية البيانات."
- "تحتاج إلى صلاحيات مالية للوصول إلى البيانات المالية."
- "يمكنني فقط عرض البيانات من منظمتك."
- "هذه المعلومات تتطلب صلاحيات المسؤول."

## Audit Requirements

### 1. Conversation Logging
Every interaction is logged with:
- User ID and role
- Organization ID
- Timestamp (UTC)
- Request message
- Response provided
- Tools executed
- Data accessed
- Denial reasons (if any)

### 2. Retention Policy
- Conversation logs: 90 days
- Audit trails: 1 year
- Security incidents: 3 years
- Aggregated metrics: Indefinite

### 3. Access Logs Review
- Weekly review of denied requests
- Monthly audit of cross-tenant attempts
- Quarterly security assessment
- Annual compliance review

## Special Scenarios

### 1. Emergency Access
Super Admins may access cross-tenant data only for:
- Security incidents
- System maintenance
- Legal compliance
- With explicit audit trail

### 2. Property Owner Rights
Property owners can:
- View own financial statements
- Access own property data
- See tenant information for owned units
- Cannot see other owners' data

### 3. Vendor Access
Vendors can only:
- View own products and services
- See assigned work orders
- Access public marketplace
- Cannot see competitor data

### 4. Guest Users
Guests are limited to:
- Public marketplace browsing
- General platform information
- Sign-up and contact info
- No authenticated features

## Compliance

### GDPR Compliance
- Right to access own data ✓
- Data minimization ✓
- Purpose limitation ✓
- Storage limitation ✓

### CCPA Compliance
- Transparency about data use ✓
- User control over data ✓
- Non-discrimination ✓

### Saudi Data Protection
- Local data residency ✓
- Arabic language support ✓
- Cultural sensitivity ✓

## Implementation Verification

### Code-Level Checks
```typescript
// Every AI response goes through:
1. classifyDataRequest(message, userRole)
2. canAccessDataClass(userRole, dataClass)
3. enforcePrivacy(user, request)
4. redactPII(response)
5. auditLog(interaction)
```

### Testing Requirements
- Unit tests for each privacy rule
- Integration tests for role scenarios
- Penetration testing for bypass attempts
- Regular security audits

## Incident Response

### If Privacy Violation Occurs:
1. Immediate access suspension
2. Audit log investigation
3. User notification (if required)
4. Remediation actions
5. Policy update (if needed)

### Reporting Channels
- Internal: security@fixzit.internal
- External: privacy@fixzit.com
- Regulator: As per jurisdiction

## Updates and Amendments

This policy is reviewed quarterly and updated as needed. Changes are:
1. Documented in version control
2. Approved by Security and Legal teams
3. Implemented in code before activation
4. Communicated to all stakeholders
5. Monitored for compliance

---

**Note**: This policy is enforced programmatically through the codebase. Manual overrides are not possible without code changes, ensuring consistent application of privacy rules.
