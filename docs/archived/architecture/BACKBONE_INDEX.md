# Fixzit Backbone Index

**Single Source of Truth for Canonical File Locations**

Last Updated: 2025-10-05
Agent Governor Version: 1.0
Status: INITIALIZED

---

## Purpose

This index tracks the **canonical** location for every major component, service, utility, and integration in the Fixzit system. Before creating any new file, agents MUST search this index first.

## Consolidation Status Legend

- ✅ **CANONICAL** - Single authoritative implementation
- ⚠️ **NEEDS MERGE** - Duplicates exist, consolidation required
- 🔄 **IN PROGRESS** - Currently being consolidated
- ❌ **DEPRECATED** - Do not use, will be removed

---

## Core Application Structure

### App Router (Next.js 13+)

```
app/                          # Next.js App Router
├── (auth)/                   # Auth layout group
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── (dashboard)/              # Dashboard layout group
│   ├── dashboard/
│   ├── properties/
│   ├── units/
│   ├── work-orders/
│   ├── finance/
│   ├── reports/
│   ├── marketplace/
│   ├── settings/
│   ├── hr/
│   ├── crm/
│   ├── support/
│   ├── compliance/
│   └── system-management/
├── api/                      # API Routes
└── layout.tsx                # Root layout
```

### Components Architecture

```
components/
├── ui/                       # Base UI components (shadcn/ui)
│   ├── button.tsx            ✅ CANONICAL
│   ├── input.tsx             ✅ CANONICAL
│   ├── dialog.tsx            ✅ CANONICAL
│   └── ...
├── layout/                   # Layout components
│   ├── Header.tsx            ✅ CANONICAL - Single global header
│   ├── Sidebar.tsx           ✅ CANONICAL - Monday-style sidebar
│   ├── Footer.tsx            ✅ CANONICAL - Version, copyright, help
│   └── MainLayout.tsx        ✅ CANONICAL - Global layout wrapper
├── auth/                     # Authentication components
├── properties/               # Property management components
├── work-orders/              # Work order components
├── finance/                  # Finance components
└── marketplace/              # Marketplace components
```

---

## Libraries & Utilities

### Database

```
lib/
├── db.ts                     ✅ CANONICAL - MongoDB connection singleton
├── mongodb-unified.ts        ✅ CANONICAL - Unified MongoDB/Mongoose client
└── repositories/             # Data access layer
    ├── base.repository.ts    ✅ CANONICAL - Base repository pattern
    ├── property.repository.ts
    ├── workorder.repository.ts
    └── ...
```

> **Note:** Fixzit uses MongoDB Atlas with Mongoose exclusively.
> Prisma/PostgreSQL references in legacy docs are deprecated.

### Authentication & Authorization

```
lib/auth/
├── session.ts                ✅ CANONICAL - Session management
├── jwt.ts                    ✅ CANONICAL - JWT utilities
├── rbac.ts                   ✅ CANONICAL - RBAC implementation
├── roles.ts                  ✅ CANONICAL - Role definitions (snake_case)
└── permissions.ts            ✅ CANONICAL - Permission matrix
```

### Payments & Integrations

```
lib/integrations/
├── payments/
│   ├── paytabs/
│   │   ├── core.ts           ✅ CANONICAL - Gateway primitives
│   │   │                     # createPaymentPage, verifyPayment, validateCallback
│   │   ├── subscription.ts   ✅ CANONICAL - Business flows
│   │   │                     # normalizePayload, finalizeSubscription
│   │   └── index.ts          ✅ CANONICAL - Public API exports
│   ├── stripe/               # Future payment provider
│   └── index.ts              # Payment provider registry
├── zatca/
│   ├── core.ts               ✅ CANONICAL - ZATCA e-invoicing
│   ├── validation.ts
│   └── index.ts
└── maps/
    ├── google.ts             ✅ CANONICAL - Google Maps integration
    └── index.ts
```

### Utilities

```
lib/utils/
├── cn.ts                     ✅ CANONICAL - Class name utility (shadcn)
├── format.ts                 ✅ CANONICAL - Date/number formatting
├── validation.ts             ✅ CANONICAL - Input validation helpers
├── currency.ts               ✅ CANONICAL - Currency formatting (SAR, ILS)
├── rtl.ts                    ✅ CANONICAL - RTL/LTR utilities
└── api.ts                    ✅ CANONICAL - API client utilities
```

---

## API Routes

### Structure

```
app/api/
├── auth/                     # Authentication endpoints
│   ├── login/route.ts        ✅ CANONICAL
│   ├── logout/route.ts       ✅ CANONICAL
│   ├── register/route.ts     ✅ CANONICAL
│   └── refresh/route.ts      ✅ CANONICAL
├── properties/               # Property management
│   ├── route.ts              ✅ CANONICAL - List/Create
│   └── [id]/route.ts         ✅ CANONICAL - Read/Update/Delete
├── work-orders/              # Work order management
│   ├── route.ts              ✅ CANONICAL
│   └── [id]/route.ts         ✅ CANONICAL
├── finance/                  # Finance module
│   ├── subscriptions/
│   │   ├── route.ts          ✅ CANONICAL
│   │   └── [id]/route.ts     ✅ CANONICAL
│   └── invoices/
├── payments/                 # Payment processing
│   ├── paytabs/
│   │   ├── create/route.ts   ✅ CANONICAL
│   │   ├── verify/route.ts   ✅ CANONICAL
│   │   └── callback/route.ts ✅ CANONICAL
│   └── webhooks/
└── marketplace/              # Marketplace endpoints
```

---

## Configuration Files

### Core Config

```
├── next.config.js            ✅ CANONICAL - Next.js configuration
├── tailwind.config.js        ✅ CANONICAL - Tailwind + brand tokens
├── tsconfig.json             ✅ CANONICAL - TypeScript configuration
├── eslint.config.js          ✅ CANONICAL - ESLint rules
├── postcss.config.js         ✅ CANONICAL - PostCSS configuration
└── components.json           ✅ CANONICAL - shadcn/ui config
```

### Environment

```
├── .env.example              ✅ CANONICAL - Environment template
├── env.example               ✅ CANONICAL - Backup template
└── .env.local                🚫 NEVER COMMIT - Local secrets
```

### Testing

```
├── jest.config.js            ✅ CANONICAL - Jest configuration
├── playwright.config.ts      ✅ CANONICAL - E2E test config
└── vitest.config.ts          ✅ CANONICAL - Vitest config (if used)
```

---

## Governance & Documentation

### Agent Governor System

```
├── agent-governor.yaml       ✅ CANONICAL - Agent configuration
├── AGENT_GOVERNOR.md         ✅ CANONICAL - Full playbook
├── AGENT_OPERATOR_HEADER.md  ✅ CANONICAL - Quick reference
├── GOVERNANCE.md             ✅ CANONICAL - Project governance
├── .github/
│   ├── copilot.yaml          ✅ CANONICAL - GitHub Copilot auto-approve
│   ├── pull_request_template.md ✅ CANONICAL - PR template
│   └── workflows/
│       └── agent-governor.yml ✅ CANONICAL - CI verification
```

### Scripts & Tools

```
├── tools/
│   └── agent-runner.sh       ✅ CANONICAL - Command wrapper
├── scripts/
│   ├── inventory.sh          ✅ CANONICAL - Duplicate detection
│   └── cleanup_space.sh      ✅ CANONICAL - Disk cleanup (≥60% free)
├── .runner/
│   ├── auto-approve.sh       ✅ CANONICAL - Non-interactive runner
│   └── tasks.yaml            ✅ CANONICAL - Task definitions
└── logs/
    └── auto-approve.log      # Auto-generated
```

### Documentation

```
docs/
├── inventory/                # Generated by agent:inventory
│   ├── inventory.txt         # File listing
│   ├── exports.txt           # Export map
│   ├── hotspots.txt          # Payment hotspots
│   └── duplicate-names.txt   # Duplicate detection
├── AGENT_LIVE_PROGRESS.md    ✅ CANONICAL - Real-time progress
├── requirements/             # Feature requirements
└── architecture/             # System architecture docs
```

---

## Module-Specific Canonical Files

### Properties Module

```
lib/properties/
├── property.service.ts       ✅ CANONICAL - Business logic
├── property.types.ts         ✅ CANONICAL - TypeScript types
├── property.validation.ts    ✅ CANONICAL - Validation schemas
└── property.utils.ts         ✅ CANONICAL - Utility functions
```

### Work Orders Module

```
lib/work-orders/
├── workorder.service.ts      ✅ CANONICAL - Business logic
├── workorder.types.ts        ✅ CANONICAL - TypeScript types
├── workorder.workflow.ts     ✅ CANONICAL - Workflow state machine
└── workorder.validation.ts   ✅ CANONICAL - Validation schemas
```

### Finance Module

```
lib/finance/
├── subscription.service.ts   ✅ CANONICAL - Subscription management
├── invoice.service.ts        ✅ CANONICAL - Invoice generation
├── payment.service.ts        ✅ CANONICAL - Payment processing
└── finance.types.ts          ✅ CANONICAL - TypeScript types
```

---

## Known Duplicates (To Be Consolidated)

### High Priority

```
⚠️  Multiple paytabs implementations
    - CANONICAL: lib/integrations/payments/paytabs/core.ts
    - TO MERGE: [Run agent:inventory to detect]

⚠️  Multiple MongoDB connection patterns
    - CANONICAL: lib/db.ts
    - TO MERGE: [Run agent:inventory to detect]

⚠️  Duplicate header/layout components
    - CANONICAL: components/layout/Header.tsx
    - CANONICAL: components/layout/Sidebar.tsx
    - TO MERGE: [Run agent:inventory to detect]
```

---

## Search Before Create Protocol

Before creating ANY new file, the agent MUST:

1. **Search this index** for the canonical location
2. **Run inventory scan**: `npm run agent:inventory`
3. **Check for duplicates**: Review `docs/inventory/duplicate-names.txt`
4. **Search exports**: Grep `docs/inventory/exports.txt`
5. **Search hotspots**: Check `docs/inventory/hotspots.txt` for related code
6. **If exists**: MERGE into canonical file, don't create new
7. **If new**: Add to this index and commit

---

## Update Protocol

This index must be updated:

- ✅ After creating any new canonical file
- ✅ After consolidating duplicates
- ✅ After major refactoring
- ✅ When directory structure changes
- ✅ Before opening PR (verify accuracy)

**Last Consolidation Sweep:** Not yet run
**Next Scheduled Sweep:** Task #4 (Run duplicate scan)

---

## Performance Targets (Per Canonical File)

All canonical implementations must meet:

- **API endpoints:** ≤200ms (list), ≤100ms (item), ≤300ms (create/update)
- **Page loads:** ≤1.5s
- **Build time:** No file should add >2s to build
- **Bundle size:** Monitor with `npm run bundle:check`

---

## Verification

To verify this index is accurate:

```bash
# Run full inventory
npm run agent:inventory

# Check for duplicates
cat docs/inventory/duplicate-names.txt

# Verify canonical files exist
cat docs/inventory/inventory.txt | grep "lib/integrations/payments/paytabs/core.ts"
```

---

**This index is the agent's map. Keep it current. Search before create. Merge before delete.**
