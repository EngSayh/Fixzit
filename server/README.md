# Server Directory

## 📋 Overview

This directory contains all server-side code including database models, business logic, utilities, and API integrations.

## 📁 Structure

```
server/
├── models/               # Mongoose database models
│   ├── aqar/            # Real estate marketplace models
│   ├── finance/         # Financial management models
│   ├── marketplace/     # General marketplace models
│   ├── plugins/         # Mongoose plugins (tenancy, audit, etc.)
│   ├── Employee.ts      # Core employee model
│   ├── Project.ts       # Core project model
│   ├── User.ts          # User authentication model
│   ├── WorkOrder.ts     # Work order model
│   ├── FMPMPlan.ts      # Facility Management PM Plans
│   ├── FMApproval.ts    # FM Approval workflows
│   ├── FMFinancialTransaction.ts  # FM Financial transactions
│   └── [Other models]
├── lib/                 # Server utilities and helpers
│   ├── authContext.ts   # Authentication context management
│   ├── rbac.config.ts   # Role-based access control
│   └── [Other utilities]
├── copilot/            # Copilot integration logic
├── security/           # Security utilities (headers, etc.)
└── webhooks/           # Webhook handlers
```

## 🗄️ Database Models

### Core Models

#### User & Authentication

- **User.ts** - User accounts with authentication
- **Tenant.ts** - Multi-tenant isolation
- **Organization.ts** - Organization/company accounts

#### Human Resources

- **Employee.ts** (31 lines) - Core employee data
- **models/hr/Employee.ts** (140 lines) - Extended HR-specific employee model

#### Work Management

- **WorkOrder.ts** - Maintenance work orders
- **Project.ts** - General projects (different from Aqar projects)
- **Asset.ts** - Asset tracking

#### Facility Management

- **FMPMPlan.ts** - Preventive Maintenance plans
- **FMApproval.ts** - Approval workflow engine
- **FMFinancialTransaction.ts** - FM financial transactions

### Module-Specific Models

#### Finance (`finance/`)

- **Payment.ts** - Payment tracking (Finance module)
- **Journal.ts** - General ledger journal
- **ChartAccount.ts** - Chart of accounts
- **LedgerEntry.ts** - Double-entry bookkeeping

#### Real Estate (`aqar/`)

- **Payment.ts** - Aqar package payments (different from finance Payment)
- **Project.ts** - Real estate development projects (different from core Project)
- **Property.ts** - Property listings
- **Listing.ts** - Property listings

#### Marketplace

- **RFQ.ts** - Request for quotation (marketplace)
- **Vendor.ts** - Vendor management
- **Product.ts** - Marketplace products

### Model Naming Clarification

Some models have similar names but serve **different purposes**:

| Model       | Location                     | Purpose                           |
| ----------- | ---------------------------- | --------------------------------- |
| Employee.ts | `server/models/`             | Core employee (31 lines, minimal) |
| Employee.ts | `models/hr/`                 | HR-specific extended (140 lines)  |
| Payment.ts  | `server/models/finance/`     | Finance module payments           |
| Payment.ts  | `models/aqar/`               | Aqar package payments             |
| Project.ts  | `server/models/`             | General business projects         |
| Project.ts  | `models/aqar/`               | Real estate development projects  |
| RFQ.ts      | `server/models/`             | Core RFQ model                    |
| RFQ.ts      | `server/models/marketplace/` | Marketplace-specific RFQ          |

**These are NOT duplicates** - they serve different business domains.

## 🔌 Mongoose Plugins

Located in `server/models/plugins/`:

- **tenantIsolation.ts** - Multi-tenant data isolation
- **tenantAudit.ts** - Audit trail for tenant operations
- **auditPlugin.ts** - Change tracking and audit logs

### Using Plugins

```typescript
import { tenantIsolationPlugin } from "./plugins/tenantIsolation";
import { auditPlugin } from "./plugins/auditPlugin";

const mySchema = new Schema({
  // ... fields
});

mySchema.plugin(tenantIsolationPlugin);
mySchema.plugin(auditPlugin);

export const MyModel = model("MyModel", mySchema);
```

## 🛠️ Server Utilities

### Authentication Context (`lib/authContext.ts`)

Manages request context for authentication:

```typescript
import { runWithContext, getRequestContext } from "@/server/lib/authContext";

// Set context for async operations
await runWithContext({ userId, tenantId, role }, async () => {
  // Operations here have access to context
  const ctx = getRequestContext();
});
```

### RBAC Configuration (`lib/rbac.config.ts`)

Role-based access control definitions and utilities.

## 🔐 Security

### Headers (`security/headers.ts`)

Security header configuration for Next.js middleware:

```typescript
import { getSecurityHeaders } from "@/server/security/headers";

const headers = getSecurityHeaders();
```

## 📡 Webhooks

Webhook handlers for external integrations located in `server/webhooks/`.

## 🎯 Usage Guidelines

### Importing Models

```typescript
// Import from server/models
import { User } from "@/server/models/User";
import { WorkOrder } from "@/server/models/WorkOrder";
import { Payment } from "@/server/models/finance/Payment";
import { Property } from "@/server/models/aqar/Property";

// Import HR-specific models from models/hr
import { Employee } from "@/models/hr/Employee";
```

### Creating New Models

```typescript
// server/models/MyModel.ts
import { Schema, model, models } from "mongoose";
import { tenantIsolationPlugin } from "./plugins/tenantIsolation";
import { auditPlugin } from "./plugins/auditPlugin";

const myModelSchema = new Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    // ... other fields
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

// Add plugins
myModelSchema.plugin(tenantIsolationPlugin);
myModelSchema.plugin(auditPlugin);

export const MyModel = models.MyModel || model("MyModel", myModelSchema);
```

### Model Conventions

1. **PascalCase** for model names: `User.ts`, `WorkOrder.ts`
2. **Singular** naming: `User` not `Users`
3. **TypeScript** with proper type exports
4. **Plugins** for cross-cutting concerns (tenancy, audit)
5. **Timestamps** enabled for audit trails

## 🔄 Database Connection

Models automatically connect via:

```typescript
import { connectToDatabase } from "@/lib/mongodb-unified";

const db = await connectToDatabase();
```

## 🧪 Testing

Model tests use Vitest with MongoDB Memory Server:

```typescript
import { describe, it, expect } from "vitest";
import { User } from "@/server/models/User";

describe("User Model", () => {
  it("should create a user", async () => {
    const user = await User.create({
      email: "test@example.com",
      name: "Test User",
    });
    expect(user.email).toBe("test@example.com");
  });
});
```

## 📚 Related Documentation

- [Model Consolidation Strategy](/docs/architecture/MODEL_CONSOLIDATION_STRATEGY.md)
- [MongoDB Unified Connection](/docs/archived/reports/MONGODB_UNIFIED_VERIFICATION_COMPLETE.md)
- [Multi-Tenancy Guide](/docs/architecture/MULTI_TENANCY.md)
- [RBAC & Security](/docs/architecture/RBAC_STRICT_V4.md)

## 🔑 Key Features

### Multi-Tenancy

All models support tenant isolation via `tenantIsolationPlugin`. Data is automatically scoped by organization.

### Audit Trails

Models with `auditPlugin` track all changes with user, timestamp, and modification details.

### Type Safety

Full TypeScript support with InferSchemaType for compile-time type checking:

```typescript
import { InferSchemaType } from "mongoose";

const userSchema = new Schema({
  /* ... */
});
export type UserType = InferSchemaType<typeof userSchema>;
```

## ⚠️ Important Notes

1. **Model Location Matters** - Use `@/server/models/` for core models, `@/models/{domain}/` for domain-specific
2. **No Duplicate Imports** - Always import from the correct location for your use case
3. **Plugin Order** - Apply plugins in correct order (tenancy before audit)
4. **Timestamps** - Enable timestamps for all models that need audit trails

---

**Last Updated:** 2025-11-01  
**Maintained by:** Fixzit Development Team
