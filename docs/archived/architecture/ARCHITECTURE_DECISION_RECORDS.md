# Architecture Decision Records

This document contains key architecture decisions made for the Fixzit platform.

## ADR-001: Next.js 15 with App Router

### Status
Accepted

### Context
We needed to choose a React framework for building the Fixzit platform that supports:
- Server-side rendering for SEO
- API routes for backend functionality
- TypeScript first-class support
- Incremental adoption and migration path

### Decision
We chose Next.js 15 with the App Router architecture.

### Consequences
**Positive:**
- Server Components reduce client-side JavaScript bundle
- Built-in API routes eliminate need for separate backend
- Excellent TypeScript support
- Strong community and ecosystem
- Vercel deployment optimization

**Negative:**
- Learning curve for App Router patterns
- Some third-party libraries not yet compatible with Server Components
- Requires careful consideration of client vs server boundaries

---

## ADR-002: MongoDB with Mongoose ODM

### Status
Accepted

### Context
We needed a database solution that could handle:
- Flexible schema for evolving requirements
- Multi-tenant data isolation
- Complex document relationships
- High availability and scalability

### Decision
We chose MongoDB with Mongoose as the ODM.

### Consequences
**Positive:**
- Schema flexibility allows rapid iteration
- Mongoose provides validation and middleware
- Native support for hierarchical data (properties → buildings → units)
- Horizontal scaling capabilities

**Negative:**
- No native ACID transactions across collections (mitigated with sessions)
- Requires careful index management for performance
- Document size limits (16MB)

---

## ADR-003: Multi-Tenant Architecture via Organization IDs

### Status
Accepted

### Context
The platform serves multiple independent organizations (property management companies) that must have complete data isolation.

### Decision
Implement tenant isolation at the application layer using `organizationId` fields on all documents.

### Implementation
```typescript
// All queries must include organizationId
const workOrders = await WorkOrder.find({ 
  organizationId: session.user.organizationId,
  ...otherFilters 
});

// Middleware enforces tenant context
export const tenantMiddleware = (handler) => async (req, res) => {
  const organizationId = req.session?.user?.organizationId;
  if (!organizationId) throw new UnauthorizedError();
  req.tenantContext = { organizationId };
  return handler(req, res);
};
```

### Consequences
**Positive:**
- Single database instance reduces operational complexity
- Easy cross-tenant analytics for platform admins
- Simpler backup and restore procedures

**Negative:**
- Every query must be tenant-aware (enforced via middleware)
- Risk of data leakage if queries bypass middleware
- Index overhead for organizationId on every collection

---

## ADR-004: CSRF Protection via Custom Middleware

### Status
Accepted

### Context
Single-page applications with cookie-based auth are vulnerable to CSRF attacks.

### Decision
Implement CSRF protection using custom middleware that validates tokens on state-changing requests.

### Implementation
- Tokens stored in HTTP-only cookies
- Header-based validation (`X-CSRF-Token`)
- Automatic token rotation on session refresh
- Skip validation for safe methods (GET, HEAD, OPTIONS)

### Consequences
**Positive:**
- Protection against CSRF attacks
- Transparent to most API consumers
- Works with existing session management

**Negative:**
- Requires client-side token handling
- Additional header on every mutating request

---

## ADR-005: Rate Limiting Strategy

### Status
Accepted

### Context
Protect the platform from brute-force attacks and API abuse.

### Decision
Implement tiered rate limiting:
- **Login**: 5 attempts per minute per IP
- **API**: 100 requests per minute per user
- **Webhooks**: 10 requests per second per endpoint

### Implementation
```typescript
// In-memory rate limiting for login
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

// MongoDB-backed rate limiting for production API
const rateLimiter = new RateLimiter({
  store: new MongoStore({ client: mongodbClient }),
  max: 100,
  windowMs: 60 * 1000,
});
```

### Consequences
**Positive:**
- Protection against credential stuffing
- Fair resource allocation
- Configurable per endpoint

**Negative:**
- May affect legitimate high-volume users
- Requires MongoDB for distributed deployments

---

## ADR-006: Internationalization with next-intl

### Status
Accepted

### Context
The platform serves users in Oman with both Arabic (RTL) and English (LTR) requirements.

### Decision
Use `next-intl` with static message catalogs in JSON format.

### Structure
```
messages/
├── en.json    # English translations
└── ar.json    # Arabic translations (RTL)
```

### Key Patterns
- Namespace keys: `module.category.key` (e.g., `finance.payment.bankName`)
- ICU message format for pluralization
- Server-side locale detection with cookie persistence
- RTL layout via CSS logical properties

### Consequences
**Positive:**
- Type-safe translations with compile-time checks
- Efficient bundle splitting per locale
- Native RTL support

**Negative:**
- Must maintain 100% parity between catalogs
- Dynamic keys require careful handling

---

## ADR-007: Taqnyat as Sole SMS Provider

### Status
Accepted

### Context
SMS notifications are required for OTP, alerts, and marketing. Saudi Arabia requires CITC compliance for SMS services.

### Decision
Use Taqnyat exclusively as the SMS provider.

### Implementation
```typescript
// lib/sms-providers/taqnyat.ts
export const sendSMS = async (to: string, message: string) => {
  return fetch('https://api.taqnyat.sa/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.TAQNYAT_BEARER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipients: [to],
      body: message,
      sender: process.env.TAQNYAT_SENDER_NAME,
    }),
  });
};
```

### Consequences
**Positive:**
- CITC compliant for Saudi/GCC markets
- Single integration to maintain
- Reliable delivery rates

**Negative:**
- No failover provider
- Dependent on Taqnyat availability

---

## ADR-008: Vitest for Unit Testing

### Status
Accepted

### Context
Need a fast, TypeScript-native testing framework compatible with Vite.

### Decision
Use Vitest with separate configurations for client, server, and API tests.

### Configuration Files
- `vitest.config.ts` - Default client-side tests
- `vitest.config.api.ts` - API route tests
- `vitest.config.models.ts` - Database model tests

### Consequences
**Positive:**
- Native ESM and TypeScript support
- Compatible with Jest API (easy migration)
- Excellent VS Code integration
- Fast execution with HMR

**Negative:**
- Relatively new ecosystem
- Some edge cases with mocking ESM modules

---

## ADR-009: PayTabs for Payment Processing

### Status
Accepted

### Context
Need a payment gateway that supports GCC currencies (OMR, SAR, AED) and local payment methods.

### Decision
Integrate PayTabs as the primary payment processor.

### Security Measures
- Webhook signature validation
- Server-side only API key access
- PCI DSS compliance delegation to PayTabs
- Transaction logging and audit trails

### Consequences
**Positive:**
- Native GCC support with local acquiring
- Multiple payment methods (cards, bank transfers)
- Recurring billing support

**Negative:**
- Regional availability limitations
- Integration complexity for subscription billing

---

## ADR-010: Error Handling Standardization

### Status
Accepted

### Context
Consistent error handling improves developer experience and debugging.

### Decision
Standardize all API error responses with a consistent format.

### Format
```typescript
interface APIError {
  success: false;
  error: {
    code: string;        // Machine-readable code
    message: string;     // Human-readable message
    details?: object;    // Additional context
    timestamp: string;   // ISO timestamp
    requestId?: string;  // For support correlation
  };
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid input data |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

### Consequences
**Positive:**
- Consistent client-side error handling
- Easier debugging with request IDs
- Clear error categorization

**Negative:**
- Requires all endpoints to follow format
- Additional response transformation

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-01-01 | 1.0 | Engineering Team | Initial ADR documentation |
| 2025-01-15 | 1.1 | Engineering Team | Added ADR-010 Error Handling |
