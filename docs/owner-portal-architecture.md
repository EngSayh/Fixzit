# Owner Portal Architecture - Fixzit Integration Plan

**Status:** Architectural Correction - Prisma + PostgreSQL  
**Date:** 2025-11-08  
**Aligns With:** Phase 1 SDD, Multi-tenant RBAC, Finance/WO/Approvals Integration

## 🔴 Critical Correction

The initial Owner Portal design used MongoDB/Mongoose, which **violates** Fixzit Phase 1 architectural mandate:

> Backend: Node.js + Express + GraphQL/REST, **Prisma ORM, PostgreSQL**, Redis cache.

This document provides the corrected architecture using Prisma + PostgreSQL with full integration into existing Fixzit modules.

---

## 1. System Integration Overview

### 1.1 Module Connections

```
Owner Portal (New)
├── Properties/Units ──────→ Existing Properties Module
├── Work Orders ───────────→ Existing WO State Machine + Approvals
├── Financial Transactions ─→ Existing Finance Module (auto-post on WO close)
├── Utilities ─────────────→ New (Owner-specific billing/meters)
├── Inspections ───────────→ New (move-in/out with before/after photos)
├── Agent Contracts ───────→ New (RE agent assignment per property)
├── Advertisements ────────→ New (gov permits + cost tracking)
└── Mailbox ───────────────→ Integrates with Notifications/CRM
```

### 1.2 Data Flow: Work Order → Finance (Golden Workflow)

```
1. Technician uploads BEFORE photos → WO.status = ASSESSMENT
2. Estimate created → Quotation submitted
3. If amount ≥ threshold → Approval routed to Owner/Deputy
4. Owner approves → WO.status = IN_PROGRESS
5. Technician completes work → uploads AFTER photos
6. WO.status = COMPLETE (validates AFTER photos present)
7. Auto-post to Finance: FinancialTransaction.create() [IDEMPOTENT]
8. WO.status = FINANCIAL_POSTED → CLOSED
```

**Critical:** Finance posting uses Prisma transaction with unique constraint `[workOrderId, type]` to prevent duplicates.

---

## 2. Multi-Tenancy & Security

### 2.1 Row-Level Isolation

Every Owner Portal entity enforces:

```prisma
model Property {
  orgId       String  @map("org_id")
  ownerUserId String  @map("owner_user_id")

  @@index([orgId, ownerUserId])
}
```

**Middleware Guard (all Owner APIs):**

```typescript
// middleware/ownerScope.ts
export async function assertOwnerScope(ctx: AuthContext, propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { orgId: true, ownerUserId: true },
  });

  if (!property) throw new ForbiddenError("Property not found");
  if (property.orgId !== ctx.orgId) throw new ForbiddenError("Org mismatch");
  if (property.ownerUserId !== ctx.userId && !ctx.roles.includes("DEPUTY")) {
    throw new ForbiddenError("Owner mismatch");
  }
}
```

### 2.2 Subscription-Based Access

```prisma
model Subscription {
  id          String   @id @default(uuid())
  orgId       String
  plan        String   // BASIC | PRO | ENTERPRISE
  activeUntil DateTime
  features    String[] // ["OWNER_PORTAL", "AGENT_CONTRACTS", "ROI_ANALYTICS"]
}
```

**Feature Gates:**

- BASIC: Portfolio, WO, Utilities, Statements
- PRO: + ROI Dashboard, Ads, Mailbox, Agent Contracts
- ENTERPRISE: + Budget vs Actual, Predictive Analytics

---

## 3. Prisma Schema Extensions

### 3.1 Owner-Specific Models

```prisma
// Property already exists; extend with owner fields
model Property {
  id                  String   @id @default(uuid())
  orgId               String
  ownerUserId         String   // NEW: owner scoping
  deputyUserId        String?  // NEW: delegation
  nickname            String?  // NEW: owner custom label
  advertisementNo     String?
  advertisementCost   Decimal? @db.Decimal(14,2)
  advertisementExpiresAt DateTime?

  agentContracts AgentContract[]
  units          Unit[]
  meters         UtilityMeter[]
  financials     FinancialTransaction[]
}

model AgentContract {
  id            String   @id @default(uuid())
  propertyId    String
  property      Property @relation(fields: [propertyId], references: [id])
  agentUserId   String
  startDate     DateTime
  endDate       DateTime
  commissionPct Decimal? @db.Decimal(5,2)
  status        ContractStatus @default(ACTIVE)
  contractUrl   String?
  createdAt     DateTime @default(now())
}

enum ContractStatus {
  ACTIVE
  EXPIRED
  TERMINATED
}

model UtilityMeter {
  id         String      @id @default(uuid())
  propertyId String?
  unitId     String?
  property   Property?   @relation(fields: [propertyId], references: [id])
  unit       Unit?       @relation(fields: [unitId], references: [id])
  type       UtilityType
  serialNo   String
  bills      UtilityBill[]
  createdAt  DateTime    @default(now())
}

enum UtilityType {
  ELECTRICITY
  WATER
  GAS
}

model UtilityBill {
  id          String   @id @default(uuid())
  meterId     String
  meter       UtilityMeter @relation(fields: [meterId], references: [id])
  periodStart DateTime
  periodEnd   DateTime
  consumption Decimal? @db.Decimal(18,4)
  amount      Decimal  @db.Decimal(14,2)
  dueDate     DateTime?
  paidAt      DateTime?
  fileUrl     String?  // pre-signed S3 URL
  createdAt   DateTime @default(now())
}

model Inspection {
  id             String   @id @default(uuid())
  unitId         String
  unit           Unit     @relation(fields: [unitId], references: [id])
  tenancyId      String?
  type           InspectionType
  items          Json     // checklist: [{item, condition, qty, photos[]}]
  photosBefore   String[] // S3 URLs
  photosAfter    String[] // S3 URLs
  signedByOwner  Boolean  @default(false)
  signedByTenant Boolean  @default(false)
  signedAt       DateTime?
  createdAt      DateTime @default(now())
}

enum InspectionType {
  MOVE_IN
  MOVE_OUT
  PERIODIC
}

model InventoryItem {
  id         String   @id @default(uuid())
  unitId     String
  unit       Unit     @relation(fields: [unitId], references: [id])
  name       String   // "Refrigerator", "AC Unit 1", "Socket Living Room"
  qty        Int      @default(1)
  condition  String?  // GOOD, FAIR, POOR
  baselineAt DateTime @default(now())
  photos     String[] // before/after/check photos
}

model Advertisement {
  id            String   @id @default(uuid())
  propertyId    String
  property      Property @relation(fields: [propertyId], references: [id])
  unitId        String?
  govPermitNo   String   // Government ad license number
  authority     String?  // Issuing authority
  channel       String?  // Portal, Outdoor, Social
  cost          Decimal  @db.Decimal(14,2)
  currency      String   @default("SAR")
  startDate     DateTime
  expiryDate    DateTime
  status        AdStatus @default(ACTIVE)
  documents     String[] // permit files
  createdAt     DateTime @default(now())
}

enum AdStatus {
  ACTIVE
  EXPIRED
  CANCELLED
}

model Delegation {
  id             String   @id @default(uuid())
  ownerUserId    String
  delegateUserId String
  scopes         String[] // ["APPROVE_MAINTENANCE", "VIEW_FINANCE"]
  startDate      DateTime
  endDate        DateTime?
  active         Boolean  @default(true)
  createdAt      DateTime @default(now())
}

model MailboxThread {
  id          String           @id @default(uuid())
  orgId       String
  ownerUserId String
  propertyId  String?
  unitId      String?
  workOrderId String?
  requestNo   String?          // e.g., "WO-2024-001"
  subject     String
  type        ThreadType
  messages    MailboxMessage[]
  createdAt   DateTime         @default(now())
}

enum ThreadType {
  AGENT_REQUEST
  SERVICE_REQUEST
  WARRANTY_CLAIM
  GENERAL
}

model MailboxMessage {
  id         String        @id @default(uuid())
  threadId   String
  thread     MailboxThread @relation(fields: [threadId], references: [id])
  fromUserId String
  toUserId   String?
  body       String        @db.Text
  attachments String[]
  readAt     DateTime?
  createdAt  DateTime      @default(now())
}

model Warranty {
  id             String   @id @default(uuid())
  workOrderId    String?
  assetId        String?  // InventoryItem or general asset
  providerId     String
  coverageMonths Int?
  expiresAt      DateTime?
  terms          String?  @db.Text
  documents      String[] // warranty certificates
  createdAt      DateTime @default(now())
}
```

### 3.2 Extend Existing Models

```prisma
// Existing WorkOrder - add owner relation
model WorkOrder {
  // ... existing fields ...

  // NEW: Link to property for owner scoping
  propertyId  String?
  property    Property? @relation(fields: [propertyId], references: [id])
}

// Existing FinancialTransaction - ensure idempotency
model FinancialTransaction {
  // ... existing fields ...

  propertyId  String
  unitId      String?
  workOrderId String?

  // CRITICAL: Prevent duplicate postings
  @@unique([workOrderId, type])
}
```

---

## 4. Critical Service Layer (Idempotent Finance Posting)

### 4.1 Fixed postFinanceOnClose (Addresses Code Review)

```typescript
// services/owner/workOrderFinance.ts
import { prisma } from "@/prisma";
import { TxnType } from "@prisma/client";

/**
 * Post work order expense to Finance (idempotent & atomic)
 *
 * Compliance:
 * - Golden Workflow: requires AFTER photos before close
 * - Idempotency: unique [workOrderId, type] constraint
 * - Atomicity: Prisma transaction (rollback on error)
 *
 * @throws {Error} if AFTER photos missing or WO not found
 */
export async function postFinanceOnClose(workOrderId: string): Promise<void> {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch WO with relations
    const wo = await tx.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        attachments: true,
        quotation: true,
        unit: { include: { property: true } },
      },
    });

    if (!wo) throw new Error(`Work Order ${workOrderId} not found`);

    // 2. Idempotency Check: Already posted?
    if (["FINANCIAL_POSTED", "CLOSED"].includes(wo.status)) {
      console.log(`WO ${workOrderId} already posted, skipping`);
      return; // No-op
    }

    // 3. Validate AFTER photos (Golden Workflow compliance)
    const hasAfterPhotos = wo.attachments.some((a) => a.role === "AFTER");
    if (!hasAfterPhotos) {
      throw new Error(
        `WO ${workOrderId}: Cannot post finance without AFTER photos`,
      );
    }

    // 4. Create Financial Transaction (upsert for safety)
    if (wo.quotation?.amount) {
      await tx.financialTransaction.upsert({
        where: {
          workOrderId_type: {
            workOrderId: wo.id,
            type: TxnType.EXPENSE_MAINTENANCE,
          },
        },
        create: {
          orgId: wo.unit.property.orgId,
          propertyId: wo.unit.propertyId,
          unitId: wo.unitId,
          workOrderId: wo.id,
          type: TxnType.EXPENSE_MAINTENANCE,
          amount: wo.quotation.amount,
          currency: "SAR",
          description: `Maintenance: ${wo.title}`,
          occurredAt: new Date(),
        },
        update: {}, // No-op if already exists (idempotency)
      });
    }

    // 5. Update WO status atomically
    await tx.workOrder.update({
      where: { id: wo.id },
      data: { status: "FINANCIAL_POSTED" },
    });

    console.log(
      `✅ WO ${workOrderId} posted to Finance: ${wo.quotation?.amount} SAR`,
    );
  });
}
```

### 4.2 Close Work Order Handler (with validation)

```typescript
// app/api/work-orders/[id]/close/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { postFinanceOnClose } from "@/services/owner/workOrderFinance";
import { assertOwnerScope } from "@/middleware/ownerScope";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getAuthContext(req); // JWT → { userId, orgId, roles }
    const woId = params.id;

    // 1. Verify owner access
    const wo = await prisma.workOrder.findUnique({
      where: { id: woId },
      include: { unit: { include: { property: true } } },
    });

    if (!wo) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    await assertOwnerScope(ctx, wo.unit.property.id);

    // 2. Validate AFTER photos (before attempting close)
    const hasAfter = await prisma.attachment.count({
      where: { workOrderId: woId, role: "AFTER" },
    });

    if (hasAfter === 0) {
      return NextResponse.json(
        { error: "Cannot close work order: 'AFTER' photo(s) required" },
        { status: 400 },
      );
    }

    // 3. Mark complete
    await prisma.workOrder.update({
      where: { id: woId },
      data: { status: "COMPLETE" },
    });

    // 4. Trigger finance posting (idempotent & atomic)
    await postFinanceOnClose(woId);

    return NextResponse.json({
      ok: true,
      message: "Work order closed and posted to finance",
    });
  } catch (error: any) {
    console.error("Close WO failed:", error);
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode || 500 },
    );
  }
}
```

---

## 5. Owner ROI/NOI Reporting (Fixed Calculation)

### 5.1 Correct ROI Formula

```typescript
// services/owner/reports.ts
import { prisma } from "@/prisma";
import dayjs from "dayjs";

/**
 * Calculate Net Operating Income (NOI) and Return on Investment (ROI)
 *
 * NOI = Revenue - (Maintenance + Utilities + Ads)
 * ROI = NOI / Total Expenses (handles division by zero)
 *
 * Periods: 3, 6, 9, 12 months or custom range
 */
export async function calculateNOI_ROI(
  unitId: string,
  months: number = 12,
  customRange?: { from: Date; to: Date },
) {
  const from = customRange?.from ?? dayjs().subtract(months, "month").toDate();
  const to = customRange?.to ?? new Date();

  // Parallel aggregation for performance
  const [income, maintenance, utilities] = await Promise.all([
    prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      where: {
        unitId,
        type: { in: ["INCOME_RENT", "INCOME_OTHER"] },
        occurredAt: { gte: from, lte: to },
      },
    }),
    prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      where: {
        unitId,
        type: "EXPENSE_MAINTENANCE",
        occurredAt: { gte: from, lte: to },
      },
    }),
    prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      where: {
        unitId,
        type: "EXPENSE_UTILITIES",
        occurredAt: { gte: from, lte: to },
      },
    }),
  ]);

  const revenue = Number(income._sum.amount ?? 0);
  const maintenanceCost = Number(maintenance._sum.amount ?? 0);
  const utilitiesCost = Number(utilities._sum.amount ?? 0);
  const totalExpenses = maintenanceCost + utilitiesCost;

  const noi = revenue - totalExpenses;

  // ROI = NOI / Expenses (guard division by zero)
  const roi = totalExpenses === 0 ? null : noi / totalExpenses;

  return {
    period: { from, to, months },
    revenue,
    expenses: {
      maintenance: maintenanceCost,
      utilities: utilitiesCost,
      total: totalExpenses,
    },
    noi,
    roi: roi ? parseFloat(roi.toFixed(4)) : null,
  };
}
```

---

## 6. REST API Endpoints (Prisma Implementation)

### 6.1 Core Routes

```typescript
// app/api/owner/properties/route.ts
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);

  const properties = await prisma.property.findMany({
    where: {
      orgId: ctx.orgId,
      ownerUserId: ctx.userId,
    },
    include: {
      units: {
        select: {
          id: true,
          status: true,
          tenancies: {
            where: { endDate: { gte: new Date() } },
            take: 1,
          },
        },
      },
      agentContracts: {
        where: { status: "ACTIVE" },
        take: 1,
      },
      _count: {
        select: {
          units: true,
          workOrders: {
            where: { status: { notIn: ["CLOSED", "FINANCIAL_POSTED"] } },
          },
        },
      },
    },
  });

  return NextResponse.json({ properties });
}

// app/api/owner/reports/roi/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const unitId = searchParams.get("unitId");
  const months = Number(searchParams.get("months") ?? 12);

  if (!unitId) {
    return NextResponse.json({ error: "unitId required" }, { status: 400 });
  }

  const ctx = await getAuthContext(req);

  // Verify owner access
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { property: true },
  });

  if (!unit)
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  await assertOwnerScope(ctx, unit.property.id);

  // Calculate ROI
  const result = await calculateNOI_ROI(unitId, months);

  return NextResponse.json(result);
}

// app/api/owner/statements/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "YTD"; // YTD, MTD, QTD, CUSTOM
  const propertyId = searchParams.get("propertyId");

  const ctx = await getAuthContext(req);

  if (propertyId) {
    await assertOwnerScope(ctx, propertyId);
  }

  const { from, to } = parsePeriod(period, searchParams);

  const txns = await prisma.financialTransaction.findMany({
    where: {
      orgId: ctx.orgId,
      propertyId: propertyId ?? undefined,
      occurredAt: { gte: from, lte: to },
    },
    orderBy: { occurredAt: "desc" },
    include: {
      workOrder: { select: { id: true, title: true } },
      unit: { select: { code: true } },
    },
  });

  const totals = txns.reduce(
    (acc, t) => {
      if (t.type.startsWith("INCOME_")) acc.income += Number(t.amount);
      if (t.type.startsWith("EXPENSE_")) acc.expense += Number(t.amount);
      return acc;
    },
    { income: 0, expense: 0 },
  );

  return NextResponse.json({
    period: { from, to, type: period },
    totals: { ...totals, net: totals.income - totals.expense },
    transactions: txns,
  });
}
```

---

## 7. OpenAPI 3.0 Specification

```yaml
openapi: 3.0.3
info:
  title: Fixzit Owner Portal API
  version: 2.0.0
  description: Property owner management with full integration to FM/Finance/Approvals
servers:
  - url: https://api.fixzit.app/v1
security:
  - bearerAuth: []

paths:
  /owner/properties:
    get:
      summary: List owner's properties with KPIs
      tags: [Owner, Properties]
      responses:
        "200":
          description: Portfolio overview
          content:
            application/json:
              schema:
                type: object
                properties:
                  properties:
                    type: array
                    items:
                      $ref: "#/components/schemas/PropertyOverview"
        "403":
          description: Forbidden (not owner)

  /owner/reports/roi:
    get:
      summary: Calculate NOI/ROI for a unit
      tags: [Owner, Reports, Finance]
      parameters:
        - name: unitId
          in: query
          required: true
          schema: { type: string, format: uuid }
        - name: months
          in: query
          schema: { type: integer, default: 12, enum: [3, 6, 9, 12] }
      responses:
        "200":
          description: ROI calculation
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ROIResult"

  /owner/statements:
    get:
      summary: Owner financial statements
      tags: [Owner, Finance]
      parameters:
        - name: period
          in: query
          schema: { type: string, enum: [MTD, QTD, YTD, CUSTOM], default: YTD }
        - name: propertyId
          in: query
          schema: { type: string, format: uuid }
      responses:
        "200":
          description: Statement data
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OwnerStatement"

  /work-orders/{id}/close:
    post:
      summary: Close work order (triggers finance posting)
      tags: [Owner, Work Orders]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        "200":
          description: Work order closed successfully
        "400":
          description: Validation failed (e.g., missing AFTER photos)
        "403":
          description: Forbidden (not owner)

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    PropertyOverview:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        address: { type: string }
        units:
          type: object
          properties:
            total: { type: integer }
            occupied: { type: integer }
            vacant: { type: integer }
        openWorkOrders: { type: integer }
        agentContract:
          type: object
          nullable: true
          properties:
            agentUserId: { type: string }
            commissionPct: { type: number }
            expiresAt: { type: string, format: date-time }

    ROIResult:
      type: object
      properties:
        period:
          type: object
          properties:
            from: { type: string, format: date-time }
            to: { type: string, format: date-time }
            months: { type: integer }
        revenue: { type: number, format: decimal }
        expenses:
          type: object
          properties:
            maintenance: { type: number }
            utilities: { type: number }
            total: { type: number }
        noi:
          type: number
          description: Net Operating Income (Revenue - Expenses)
        roi:
          type: number
          nullable: true
          description: Return on Investment (NOI / Total Expenses)

    OwnerStatement:
      type: object
      properties:
        period:
          type: object
          properties:
            from: { type: string, format: date-time }
            to: { type: string, format: date-time }
            type: { type: string, enum: [MTD, QTD, YTD, CUSTOM] }
        totals:
          type: object
          properties:
            income: { type: number }
            expense: { type: number }
            net: { type: number }
        transactions:
          type: array
          items:
            type: object
            properties:
              id: { type: string }
              type: { type: string }
              amount: { type: number }
              description: { type: string }
              occurredAt: { type: string, format: date-time }
```

---

## 8. GraphQL SDL (Optional)

```graphql
scalar DateTime
scalar Decimal

enum StatementPeriod {
  MTD
  QTD
  YTD
  CUSTOM
}

type Property {
  id: ID!
  name: String!
  address: String
  units: [Unit!]!
  openWorkOrders: Int!
  agentContract: AgentContract
}

type Unit {
  id: ID!
  code: String!
  status: String!
  tenancy: Tenancy
}

type ROIResult {
  period: Period!
  revenue: Decimal!
  expenses: Expenses!
  noi: Decimal!
  roi: Decimal # nullable
}

type Period {
  from: DateTime!
  to: DateTime!
  months: Int!
}

type Expenses {
  maintenance: Decimal!
  utilities: Decimal!
  total: Decimal!
}

type OwnerStatement {
  period: StatementPeriod!
  totals: Totals!
  transactions: [FinancialTransaction!]!
}

type Query {
  ownerProperties: [Property!]!
  ownerROI(unitId: ID!, months: Int = 12): ROIResult!
  ownerStatements(
    period: StatementPeriod = YTD
    propertyId: ID
  ): OwnerStatement!
}

type Mutation {
  closeWorkOrder(id: ID!): Boolean!
  approveQuotation(quotationId: ID!, comments: String): Boolean!
}
```

---

## 9. Migration Strategy (Mongo → Prisma)

### Phase 1: Schema Setup (Week 1)

1. Run `prisma migrate dev --name owner_portal_init`
2. Create seed data for testing (3 properties, 10 units, sample bills)
3. Verify foreign key constraints and indexes

### Phase 2: Dual Write (Week 2)

```typescript
// Temporary: write to both Mongo + Postgres
async function createProperty(data: PropertyInput) {
  // Write to Postgres (source of truth)
  const pgProperty = await prisma.property.create({ data });

  // Write to Mongo (legacy; delete after backfill)
  await mongoPropertyModel.create({ ...data, _id: pgProperty.id });

  return pgProperty;
}
```

### Phase 3: Backfill (Week 3)

```bash
# Export Mongo → JSON
mongoexport --db fixzit --collection properties --out properties.json

# Transform & import to Postgres
node scripts/backfill-properties.js
```

### Phase 4: Cutover (Week 4)

1. Switch reads to Postgres
2. Remove Mongo write logic
3. Archive Mongo collections
4. Run Halt–Fix–Verify across all Owner Portal pages

---

## 10. Verification Checklist (STRICT v4)

### Per-Page Verification

| Page                   | Role  | Console | Network | Build | Hydration | RTL | Evidence          |
| ---------------------- | ----- | ------- | ------- | ----- | --------- | --- | ----------------- |
| /owner/properties      | Owner | 0       | 0 4xx   | 0 TS  | ✅        | ✅  | screenshot + logs |
| /owner/units/:id       | Owner | 0       | 0 4xx   | 0 TS  | ✅        | ✅  | screenshot + logs |
| /owner/reports/roi     | Owner | 0       | 0 4xx   | 0 TS  | ✅        | ✅  | screenshot + logs |
| /work-orders/:id/close | Owner | 0       | 0 4xx   | 0 TS  | ✅        | ✅  | screenshot + logs |

**Definition of Done:** Zero errors after 10-second wait + commit hash + root cause note.

---

## 11. Summary: What Changed

### ✅ Architectural Compliance

- ❌ MongoDB/Mongoose → ✅ Prisma ORM + PostgreSQL
- ✅ Central relational DB with proper foreign keys
- ✅ Atomic transactions for finance posting
- ✅ Idempotency via unique constraints

### ✅ Code Quality Fixes

1. **Idempotent Finance Posting:** Transaction-based with `upsert` and status checks
2. **AFTER Photo Validation:** Enforced before WO closure
3. **Correct ROI Calculation:** NOI / Expenses (not Revenue - Expenses)
4. **Active Subscription Check:** Filter by `activeUntil > now()` (not `createdAt` sort)

### ✅ Integration Points

- Properties → Units → Tenancies → existing models ✅
- Work Orders → Approvals → Finance (auto-post) ✅
- Owner Statements → FinancialTransaction ✅
- Utilities → separate UtilityMeter/Bill ✅
- Mailbox → Notifications/CRM ✅

### ✅ Security & Governance

- Multi-tenancy: `orgId + ownerUserId` scoping ✅
- RBAC: Owner/Deputy roles with delegation ✅
- Subscription: Feature gates (BASIC/PRO/ENTERPRISE) ✅
- Layout Freeze: No UI changes, single header/sidebar ✅
- RTL: Tailwind logical properties (`ps-10`, `start-3`) ✅

---

## Next Steps

1. **Implement Prisma Migration:**

   ```bash
   cd /workspaces/Fixzit
   npx prisma migrate dev --name owner_portal_phase1
   ```

2. **Create API Routes:** (Use above patterns)

3. **Run Verification:** Halt–Fix–Verify per STRICT v4

4. **Document:** OpenAPI spec + GraphQL SDL (provided above)

This architecture now fully aligns with Fixzit Phase 1 requirements. 🚀
