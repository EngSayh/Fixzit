# Fixzit Backend Architecture

## 🏗️ System Architecture Overview

**CLARIFICATION**: Fixzit uses **Next.js API Routes ONLY**. There is **NO separate Express backend** on port 5000.

---

## Architecture Decision: Next.js 15 App Router

### Why Next.js API Routes?

1. **Unified Codebase**: Frontend and backend in one repository
2. **TypeScript Throughout**: Full type safety from database to UI
3. **Automatic API Routes**: File-based routing in `/app/api/*`
4. **Serverless-Ready**: Easy deployment to Vercel, AWS Lambda, etc.
5. **Built-in Optimizations**: Automatic code splitting, image optimization, etc.

### Technology Stack

```
┌─────────────────────────────────────────┐
│         Next.js 15.5.4 (App Router)     │
├─────────────────────────────────────────┤
│  Frontend: React 18 + TailwindCSS       │
│  Backend: API Routes (Serverless)       │
│  Database: MongoDB 7.0 (Mongoose ODM)   │
│  Auth: JWT (jsonwebtoken + crypto)      │
│  Payment: PayTabs (Saudi Arabia)        │
│  Maps: Google Maps API                  │
│  E-Invoicing: ZATCA (Saudi compliance)  │
└─────────────────────────────────────────┘
```

---

## API Routes Structure

All backend logic is in `/app/api/*` directory:

```
app/api/
├── auth/
│   ├── login/route.ts          # POST /api/auth/login
│   ├── signup/route.ts         # POST /api/auth/signup
│   ├── logout/route.ts         # POST /api/auth/logout
│   └── me/route.ts             # GET /api/auth/me
│
├── work-orders/
│   ├── route.ts                # GET/POST /api/work-orders
│   ├── [id]/
│   │   ├── route.ts            # GET/PATCH/DELETE /api/work-orders/:id
│   │   ├── assign/route.ts     # POST /api/work-orders/:id/assign
│   │   ├── status/route.ts     # PATCH /api/work-orders/:id/status
│   │   ├── checklists/route.ts # POST /api/work-orders/:id/checklists
│   │   └── materials/route.ts  # POST /api/work-orders/:id/materials
│   ├── export/route.ts         # GET /api/work-orders/export
│   └── import/route.ts         # POST /api/work-orders/import
│
├── billing/
│   ├── subscribe/route.ts      # POST /api/billing/subscribe
│   ├── quote/route.ts          # POST /api/billing/quote
│   ├── charge-recurring/route.ts
│   └── callback/
│       └── paytabs/route.ts    # POST /api/billing/callback/paytabs
│
├── invoices/
│   ├── route.ts                # GET/POST /api/invoices
│   └── [id]/route.ts           # GET/PATCH/DELETE /api/invoices/:id
│
├── assets/
│   ├── route.ts                # GET/POST /api/assets
│   └── [id]/route.ts           # GET/PATCH/DELETE /api/assets/:id
│
├── properties/                 # Aqar module (Real estate)
│   ├── route.ts
│   └── [id]/route.ts
│
├── ats/                        # Applicant Tracking System
│   ├── jobs/
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       ├── apply/route.ts
│   │       └── publish/route.ts
│   ├── applications/
│   │   └── [id]/route.ts
│   ├── moderation/route.ts
│   └── convert-to-employee/route.ts
│
├── marketplace/
│   ├── products/route.ts
│   ├── categories/route.ts
│   └── search/route.ts
│
├── support/
│   ├── tickets/
│   │   ├── route.ts
│   │   ├── my/route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       └── reply/route.ts
│   └── incidents/route.ts
│
├── help/
│   ├── articles/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   └── ask/route.ts            # AI-powered help
│
├── notifications/
│   ├── route.ts
│   ├── [id]/route.ts
│   └── bulk/route.ts
│
├── copilot/                    # AI Assistant
│   ├── chat/route.ts
│   ├── knowledge/route.ts
│   └── profile/route.ts
│
└── ... (100+ total routes)
```

---

## Request Flow Architecture

### 1. Client Request

```
Browser/App → HTTPS → Next.js Server (localhost:3000 or production domain)
```

### 2. Middleware Layer

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // 1. Security headers
  // 2. CORS handling
  // 3. Request logging
  // 4. Route protection (optional)
}
```

### 3. API Route Handler

```typescript
// app/api/work-orders/route.ts
export async function GET(req: NextRequest) {
  // 1. Rate limiting
  const rl = rateLimit(key, 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  // 2. Authentication
  const user = await getSessionUser(req);
  if (!user) return unauthorizedError();

  // 3. Authorization (RBAC)
  if (!hasPermission(user, "READ")) return forbiddenError();

  // 4. Tenant isolation
  const data = await WorkOrder.find({ tenantId: user.orgId });

  // 5. Response
  return createSecureResponse({ data }, 200, req);
}
```

### 4. Database Layer

```typescript
// lib/models/WorkOrder.ts
import mongoose from "mongoose";

const WorkOrderSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  status: { type: String, enum: ["OPEN", "IN_PROGRESS", "COMPLETED"] },
  // ... more fields
});

export const WorkOrder =
  mongoose.models.WorkOrder || mongoose.model("WorkOrder", WorkOrderSchema);
```

---

## Security Architecture

### 1. Authentication Flow

```
┌────────┐                 ┌──────────────┐                ┌──────────┐
│ Client │                 │  Next.js API  │                │ MongoDB  │
└───┬────┘                 └──────┬───────┘                └────┬─────┘
    │                             │                              │
    │  POST /api/auth/login       │                              │
    ├─────────────────────────────>                              │
    │  { email, password }        │                              │
    │                             │  Find user by email          │
    │                             ├──────────────────────────────>
    │                             │                              │
    │                             │  User document               │
    │                             <──────────────────────────────┤
    │                             │                              │
    │                             │  Verify password (bcrypt)    │
    │                             │                              │
    │                             │  Generate JWT token          │
    │                             │  (includes: id, email,       │
    │                             │   role, orgId, exp: 7d)      │
    │                             │                              │
    │  { token, user }            │                              │
    <─────────────────────────────┤                              │
    │                             │                              │
    │  Store token (httpOnly      │                              │
    │  cookie or localStorage)    │                              │
    │                             │                              │
```

### 2. Protected Route Flow

```
┌────────┐                 ┌──────────────┐                ┌──────────┐
│ Client │                 │  Next.js API  │                │ MongoDB  │
└───┬────┘                 └──────┬───────┘                └────┬─────┘
    │                             │                              │
    │  GET /api/work-orders       │                              │
    │  Authorization: Bearer ...  │                              │
    ├─────────────────────────────>                              │
    │                             │                              │
    │                             │  Verify JWT signature        │
    │                             │  Decode payload              │
    │                             │                              │
    │                             │  Find user by ID             │
    │                             ├──────────────────────────────>
    │                             │                              │
    │                             │  User document               │
    │                             <──────────────────────────────┤
    │                             │                              │
    │                             │  Check RBAC permissions      │
    │                             │                              │
    │                             │  Query with tenant filter    │
    │                             │  { tenantId: user.orgId }    │
    │                             ├──────────────────────────────>
    │                             │                              │
    │                             │  Filtered results            │
    │                             <──────────────────────────────┤
    │                             │                              │
    │  { data: [...] }            │                              │
    <─────────────────────────────┤                              │
    │                             │                              │
```

### 3. Tenant Isolation

**CRITICAL**: Every database query MUST include tenant filtering:

```typescript
// ❌ WRONG - Cross-tenant data leakage
const workOrders = await WorkOrder.find({ status: "OPEN" });

// ✅ CORRECT - Tenant isolation
const workOrders = await WorkOrder.find({
  tenantId: user.orgId,
  status: "OPEN",
});
```

---

## Performance Optimization

### 1. Connection Pooling

```typescript
// lib/mongodb-unified.ts
let cachedConnection: typeof mongoose | null = null;

export async function connectToDatabase() {
  if (cachedConnection) {
    return cachedConnection;
  }

  const conn = await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
  });

  cachedConnection = conn;
  return conn;
}
```

### 2. Rate Limiting

```typescript
// server/security/rateLimit.ts
// In-memory rate limiter (use MongoDB for distributed systems)
const rateLimit = (key: string, limit: number, windowMs: number) => {
  // Track requests per key
  // Return { allowed: boolean }
};
```

### 3. Caching Strategy

```typescript
// Response caching example (implement with MongoDB)
export async function GET(req: NextRequest) {
  const cacheKey = `work-orders:${user.orgId}`;

  // Check cache
  const cached = await mongodb.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Query database
  const data = await WorkOrder.find({ tenantId: user.orgId });

  // Cache for 5 minutes
  await mongodb.setex(cacheKey, 300, JSON.stringify(data));

  return createSecureResponse({ data }, 200, req);
}
```

---

## Deployment Architecture

### Development

```
┌──────────────────────┐
│  localhost:3000      │
│  ├── Frontend        │
│  ├── API Routes      │
│  └── MongoDB (Docker)│
└──────────────────────┘
```

### Production (Vercel)

```
┌─────────────────────────────────────────┐
│            Vercel Edge Network           │
│  ┌───────────────────────────────────┐  │
│  │  yourdomain.com (Next.js)         │  │
│  │  ├── Static Pages (CDN)           │  │
│  │  ├── Serverless Functions         │  │
│  │  │   └── API Routes (auto-scale)  │  │
│  │  └── ISR Cache                    │  │
│  └───────────────┬───────────────────┘  │
└──────────────────┼──────────────────────┘
                   │
          ┌────────┴────────┐
          │                 │
     ┌────▼────┐      ┌─────▼─────┐
     │ MongoDB │      │   MongoDB   │
     │  Atlas  │      │  (Cache)  │
     └─────────┘      └───────────┘
```

### Production (Self-Hosted)

```
┌─────────────────────────────────────────┐
│         Load Balancer (nginx)            │
└──────────┬──────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼──┐      ┌───▼──┐
│ PM2  │      │ PM2  │
│ Node │      │ Node │
│ :3000│      │ :3000│
└───┬──┘      └───┬──┘
    │             │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │   MongoDB   │
    │   Replica   │
    │     Set     │
    └─────────────┘
```

---

## Module Architecture

### Core Modules

1. **Facilities Management (FM)** - Main module
   - Work orders, assets, properties, projects

2. **Aqar** - Real estate module
   - Property listings, map view, clustering

3. **ATS** - Applicant Tracking System
   - Job postings, applications, hiring pipeline

4. **Marketplace** - Service marketplace
   - Products, categories, search

5. **Billing** - Payment processing
   - Subscriptions, invoices, PayTabs integration

6. **Support** - Customer support
   - Tickets, incidents, help center

7. **Copilot** - AI assistant
   - Chat, knowledge base, embeddings

### Module Enabling/Disabling

```bash
# .env
ENABLE_AQAR_MODULE="true"
ENABLE_ATS_MODULE="true"
ENABLE_MARKETPLACE="true"
```

---

## Port 5000 Clarification

**Historical Note**: Earlier development versions may have mentioned an Express backend on port 5000. This was removed during consolidation.

**Current Reality**:

- ✅ Port 3000: Next.js (frontend + backend API routes)
- ❌ Port 5000: NOT USED

**If you see port 5000 references**:

- They are legacy comments/documentation
- The system works entirely on port 3000
- No separate backend server is needed or started

---

## API Documentation

### OpenAPI 3.0 Specification

Most routes include OpenAPI documentation:

```typescript
/**
 * @openapi
 * /api/work-orders:
 *   get:
 *     summary: List work orders
 *     tags: [work-orders]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(req: NextRequest) {
  // Implementation
}
```

Access documentation at: `/api-docs` (if swagger-ui configured)

---

## Migration Path (Legacy to Current)

If upgrading from an older version with Express backend:

1. **Database**: No changes needed (MongoDB schema unchanged)
2. **API Endpoints**: Same paths, just served by Next.js instead of Express
3. **Authentication**: JWT implementation unchanged (same token format)
4. **Frontend**: No changes (still calls `/api/*` endpoints)

**Key Difference**: Server startup command

- Old: `npm run dev` (started both Next.js and Express)
- New: `npm run dev` (starts Next.js only, serves everything)

---

## Conclusion

**Fixzit uses a modern, unified architecture** with Next.js 15 handling both frontend and backend responsibilities. This eliminates the complexity of managing separate frontend and backend codebases while providing:

- **Type safety** end-to-end with TypeScript
- **Scalability** through serverless deployment
- **Performance** with automatic optimizations
- **Developer experience** with hot reload and integrated tooling
- **Production readiness** with built-in security and performance features

**No separate backend server needed!** 🎉

---

**Last Updated**: 2025-10-09  
**Architecture Version**: 2.0 (Next.js API Routes Only)
