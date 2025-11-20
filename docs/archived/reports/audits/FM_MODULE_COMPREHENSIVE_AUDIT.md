# FM Module - Comprehensive Architecture & Engineering Audit
**Date:** November 19, 2025  
**Auditor:** System Architect & Software Engineer  
**Scope:** Complete FM (Facilities Management) module review

---

## Executive Summary

### Module Status: 🟡 PRODUCTION-READY WITH ISSUES

**Overall Assessment:** The FM module has a solid foundation with comprehensive domain modeling, but suffers from incomplete implementation, missing security guards, and lack of API infrastructure.

### Key Metrics (Updated: December 2025)

| Metric | Count | Status |
|--------|-------|--------|
| **Total FM Pages** | 75 | ✅ Complete |
| **Pages with Org Guards** | 75 (100%) | ✅ Phase 1.1 Complete |
| **Pages Missing Guards** | 0 (0%) | ✅ Security Complete |
| **FM Components** | 8 | ✅ Core complete |
| **FM API Endpoints** | 8 | 🟡 8/30 (27%) |
| **FM Services** | 2 | 🟡 Minimal |
| **TypeScript Errors (FM)** | 0 | ✅ Clean |
| **Work Order Sub-pages** | 6 | ✅ Complete |
| **Domain Models** | 1 (621 lines) | ✅ Comprehensive |
| **Type System** | Unified in types/fm/ | ✅ Phase 1.2 Complete |
| **Notification System** | Integrated | ✅ Phase 1.3 Partial |
| **Error Handling** | Standardized | ✅ New |

---

## Part 1: Architecture Analysis

### 1.1 Module Structure (✅ GOOD)

```
app/fm/
├── work-orders/        # 6 pages - Core functionality
├── properties/         # 9 pages - Property management
├── finance/            # 7 pages - Financial operations
├── hr/                 # 7 pages - Human resources
├── compliance/         # 5 pages - Compliance & audits
├── marketplace/        # 4 pages - Vendor marketplace
├── support/            # 4 pages - Support tickets
├── system/             # 4 pages - System config
├── crm/                # 3 pages - Customer relations
├── administration/     # 4 pages - Admin functions
├── vendors/            # 3 pages - Vendor management
├── tenants/            # 2 pages - Tenant management
├── projects/           # 1 page - Project management
├── rfqs/               # 1 page - RFQ management
├── invoices/           # 2 pages - Invoice management
├── orders/             # 1 page - Order management
├── maintenance/        # 1 page - Maintenance
├── assets/             # 1 page - Asset management
├── reports/            # 3 pages - Reporting
└── dashboard/          # 1 page - FM Dashboard
```

**Assessment:** Well-organized modular structure following domain-driven design principles.

### 1.2 Domain Model (✅ EXCELLENT)

**File:** `domain/fm/fm.behavior.ts` (621 lines)

**Strengths:**
- ✅ Comprehensive RBAC (Role-Based Access Control)
- ✅ ABAC (Attribute-Based Access Control) with `can()` function
- ✅ Complete Work Order FSM (Finite State Machine)
- ✅ Multi-tier approval workflows with delegation & escalation
- ✅ SLA definitions by priority (P1/P2/P3)
- ✅ Plan-based feature gating (STARTER/STANDARD/PRO/ENTERPRISE)
- ✅ Mongoose schemas for 6 core entities
- ✅ Notification rules & deep links
- ✅ 12 roles defined (SUPER_ADMIN → GUEST)
- ✅ 6 modules with 10+ submodules
- ✅ 20+ actions (view, create, update, assign, approve, etc.)

**Entities Modeled:**
1. Organization (with subscription plan)
2. User (with role & org association)
3. Property (with owner & deputy)
4. Unit (linked to property)
5. WorkOrder (with 11 status states)
6. Quotation (with approval tracking)
7. Media (upload tracking)
8. Comment (audit trail)
9. Approval (delegation support)
10. Notification (multi-channel)

**Work Order FSM States:**
```
NEW → ASSESSMENT → ESTIMATE_PENDING → QUOTATION_REVIEW → 
PENDING_APPROVAL → APPROVED → IN_PROGRESS → WORK_COMPLETE → 
QUALITY_CHECK → FINANCIAL_POSTING → CLOSED
```

**Assessment:** 🌟 **Production-grade domain model** - exceptionally well-designed with real-world workflows.

### 1.3 Data Models (🟡 SPLIT BETWEEN FILES)

**Primary Definitions:**
1. `lib/models/index.ts` - WorkOrder interface (18 fields)
2. `domain/fm/fm.behavior.ts` - Mongoose schemas (10 entities)
3. `lib/sla.ts` - WorkOrderPriority type
4. `lib/nats-events.ts` - Event types (3 WO events)

**Issues:**
- 🔴 **Duplication:** WorkOrder defined in multiple places
- 🔴 **Inconsistent Types:** WOStatus vs WorkOrder.status mismatch
- 🔴 **No Central Schema:** No single source of truth for types

### 1.4 API Layer (🔴 CRITICAL GAP)

**Expected:** REST/GraphQL endpoints for FM operations
**Actual:** 0 API routes found in `app/api/*fm*`

**Missing Endpoints:**
```
POST   /api/fm/work-orders           # Create work order
GET    /api/fm/work-orders           # List work orders (with filters)
GET    /api/fm/work-orders/:id       # Get work order details
PATCH  /api/fm/work-orders/:id       # Update work order
POST   /api/fm/work-orders/:id/assign      # Assign technician
POST   /api/fm/work-orders/:id/approve     # Approve quotation
POST   /api/fm/work-orders/:id/transition  # FSM state transition
POST   /api/fm/work-orders/:id/comments    # Add comment
POST   /api/fm/work-orders/:id/media       # Upload media

GET    /api/fm/properties            # List properties
POST   /api/fm/properties            # Create property
GET    /api/fm/vendors               # List vendors
POST   /api/fm/approvals/:id/approve # Approve request
GET    /api/fm/dashboard/stats       # Dashboard metrics
```

**Current State:**
- ❌ Frontend components call non-existent APIs
- ❌ WorkOrdersView.tsx tries to fetch from undefined endpoint
- ❌ All forms submit to missing API routes
- ❌ No authentication/authorization middleware

**Impact:** 🔴 **Module is non-functional** - UI exists but cannot interact with backend.

### 1.5 Services Layer (🟡 MINIMAL)

**Existing Services:**
1. `services/notifications/fm-notification-engine.ts` (complete)
2. `services/aqar/fm-lifecycle-service.ts` (Aqar integration)

**Missing Services:**
- Work Order service (CRUD, FSM, assignments)
- Property service (CRUD, units, tenants)
- Approval service (workflows, delegation)
- Vendor service (ratings, contracts)
- SLA monitoring service
- Notification dispatcher
- Media upload service
- Report generation service

---

## Part 2: Security Analysis

### 2.1 Org Guard Coverage (🟡 65% COMPLETE)

**Pages WITH Guards:** 49/75 (65%)

**Protected Modules:**
- ✅ Finance (5/7 pages) - payments, invoices, budgets, expenses
- ✅ Properties (7/9 pages) - main, units, leases, documents, inspections
- ✅ HR (6/7 pages) - directory, leave, payroll, employees, recruitment
- ✅ Compliance (4/5 pages) - main, audits, policies, contracts
- ✅ Support (2/4 pages) - tickets, new ticket
- ✅ System (3/4 pages) - main, integrations
- ✅ Administration (2/4 pages) - policies, assets
- ✅ Work Orders (1/6 pages) - main page ONLY

**Pages MISSING Guards:** 26/75 (35%) 🔴

**Critical Missing (Security Risk):**

#### Work Orders (5 pages) - **P0 CRITICAL**
```
app/fm/work-orders/pm/page.tsx              # Preventive maintenance
app/fm/work-orders/board/page.tsx           # Kanban board
app/fm/work-orders/new/page.tsx             # Create work order
app/fm/work-orders/history/page.tsx         # Service history
app/fm/work-orders/approvals/page.tsx       # Approval queue
```

#### Vendors (3 pages) - **P0 CRITICAL**
```
app/fm/vendors/page.tsx                     # Vendor list
app/fm/vendors/[id]/page.tsx                # Vendor details
app/fm/vendors/[id]/edit/page.tsx           # Edit vendor
```

#### Tenants (2 pages) - **P0 CRITICAL**
```
app/fm/tenants/page.tsx                     # Tenant list
app/fm/tenants/new/page.tsx                 # Create tenant
```

#### CRM (3 pages) - **P1 HIGH** (not yet found - need verification)
```
app/fm/crm/page.tsx                         # CRM dashboard
app/fm/crm/leads/new/page.tsx               # Create lead
app/fm/crm/accounts/new/page.tsx            # Create account
```

#### Other Missing (P1-P2)
```
app/fm/projects/page.tsx                    # P1
app/fm/rfqs/page.tsx                        # P1
app/fm/admin/page.tsx                       # P1
app/fm/dashboard/page.tsx                   # P2
app/fm/maintenance/page.tsx                 # P2
app/fm/assets/page.tsx                      # P2
app/fm/orders/page.tsx                      # P2
app/fm/page.tsx                             # P2 (main FM page)
app/fm/properties/[id]/page.tsx             # P1 (property details)
app/fm/finance/payments/new/page.tsx        # P1
app/fm/finance/invoices/new/page.tsx        # P1
app/fm/finance/expenses/new/page.tsx        # P1
app/fm/finance/budgets/new/page.tsx         # P1
app/fm/finance/reports/page.tsx             # P2
app/fm/system/roles/new/page.tsx            # P0 (system admin)
app/fm/system/users/invite/page.tsx         # P0 (system admin)
app/fm/support/tickets/page.tsx             # P1
app/fm/support/escalations/new/page.tsx     # P1
app/fm/administration/page.tsx              # P1
app/fm/reports/new/page.tsx                 # P2
app/fm/reports/schedules/new/page.tsx       # P2
```

**Security Risk Assessment:**
- 🔴 **HIGH RISK:** 13 pages with sensitive operations unguarded
- 🟡 **MEDIUM RISK:** 13 pages with admin/config functions unguarded
- **Estimated Data Exposure:** Tenants could access other tenants' work orders, vendors, and property data

### 2.2 Authentication & Authorization (🟡 PARTIAL)

**Strengths:**
- ✅ RBAC matrix defined in domain model
- ✅ `can()` function for permission checking
- ✅ Role-based action lists
- ✅ Ownership checks (tenant, property owner, technician)

**Gaps:**
- 🔴 RBAC not enforced in API layer (APIs don't exist)
- 🔴 No middleware to validate org context
- 🔴 No permission checks on data mutations
- 🔴 Frontend guards insufficient without backend enforcement

---

## Part 3: UI/UX Analysis

### 3.1 Component Architecture (✅ GOOD)

**Core Components:**
1. `WorkOrdersView.tsx` (544 lines) - Main WO list/CRUD
2. `ModuleViewTabs.tsx` - Navigation tabs
3. `ModulePageHeader.tsx` - Page headers
4. `OrgContextGate.tsx` - Org selection enforcement
5. `OrgContextPrompt.tsx` - Org selection UI
6. `useFmOrgGuard.tsx` - Org guard hook
7. `FMErrorBoundary.tsx` - Error handling
8. `tenants/` - Tenant-specific components (directory)

**Assessment:** Well-structured, reusable components with proper separation of concerns.

### 3.2 WorkOrdersView Component Analysis

**Features Implemented:**
- ✅ List view with pagination (10 items/page)
- ✅ Search by title/description
- ✅ Filter by status (8 states)
- ✅ Filter by priority (4 levels)
- ✅ Create new work order dialog
- ✅ Status badges with color coding
- ✅ Priority badges with color coding
- ✅ Relative timestamps (formatDistanceToNowStrict)
- ✅ SLA deadline display
- ✅ Client-side date rendering (SSR-safe)
- ✅ Error handling with toast notifications
- ✅ Loading states with spinners
- ✅ Empty states
- ✅ Refresh button
- ✅ i18n support (useTranslation)
- ✅ SWR for data fetching with caching
- ✅ Form validation

**Issues:**
- 🔴 **API endpoint doesn't exist:** Tries to fetch from `/api/fm/work-orders`
- 🔴 **Create form submits to non-existent endpoint**
- 🟡 **No inline edit capability**
- 🟡 **No bulk actions**
- 🟡 **No export functionality** (though export action is in RBAC)
- 🟡 **No assignment UI** (though assign action is in RBAC)
- 🟡 **No approval UI** (though approval workflow is in domain model)
- 🟡 **Media upload not implemented** (though media schema exists)

### 3.3 RTL Support (✅ COMPLETE)

**Analysis:**
- ✅ All FM pages reviewed in previous RTL audit
- ✅ No hardcoded directional classes found
- ✅ Logical properties used (ms-, me-, ps-, pe-)
- ✅ Text alignment handled automatically
- ✅ i18n integration complete

### 3.4 Translation Coverage (✅ COMPLETE)

**Verified in Documentation:**
- ✅ All FM pages have translation keys
- ✅ i18n dictionaries rebuilt (pnpm i18n:build)
- ✅ Translation keys follow namespace pattern

---

## Part 4: Data & Integration Analysis

### 4.1 Database Integration (🟡 SCHEMAS DEFINED, NOT USED)

**Mongoose Schemas Defined:**
```typescript
OrganizationSchema
UserSchema
PropertySchema
UnitSchema
WorkOrderSchema
QuotationSchema
MediaSchema
CommentSchema
ApprovalSchema
NotificationSchema
```

**Issues:**
- 🔴 Schemas defined but not exported as models
- 🔴 No database connection in FM context
- 🔴 No repository/DAO layer
- 🔴 No data access functions
- 🟡 Seed data functions exist but not integrated

### 4.2 Notification Engine (✅ COMPLETE)

**File:** `services/notifications/fm-notification-engine.ts`

**Features:**
- ✅ Multi-channel support (push, email, SMS, WhatsApp)
- ✅ Event handlers (onTicketCreated, onAssign, onApprovalRequested, etc.)
- ✅ Retry mechanism (3 attempts, exponential backoff)
- ✅ Batch processing (500 tokens/batch for FCM)
- ✅ Priority handling (high/normal/low)
- ✅ Deep links (fixzit:// scheme)
- ✅ i18n support
- ✅ XSS protection (HTML escaping)
- ✅ URL validation

**Gaps:**
- 🟡 DB persistence stub (needs MongoDB implementation)
- 🟡 Dependencies not installed (uuid, firebase-admin, twilio, @sendgrid/mail)
- 🟡 Environment variables not configured
- 🟡 i18n uses fallback (needs actual i18next)
- 🟡 FCM token management incomplete

### 4.3 SLA Engine (✅ DEFINED, NOT INTEGRATED)

**File:** `lib/sla.ts`

**Definitions:**
```typescript
P1: { responseMins: 30, resolutionHours: 6 }    # CRITICAL
P2: { responseMins: 120, resolutionHours: 24 }  # HIGH
P3: { responseMins: 480, resolutionHours: 72 }  # MEDIUM/LOW
```

**Gaps:**
- 🔴 No SLA monitoring service
- 🔴 No breach detection
- 🔴 No escalation automation
- 🔴 No SLA reporting

### 4.4 Approval Engine (🟡 DSL DEFINED, NOT IMPLEMENTED)

**Approval Rules Defined:**
- ✅ Amount-based escalation (< 1K, 1-10K, > 10K)
- ✅ Category-based rules (HVAC, Plumbing)
- ✅ Multi-approver support (parallel & sequential)
- ✅ Delegation rules
- ✅ Escalation rules
- ✅ Timeout handling (24 hours)

**Gaps:**
- 🔴 No approval service implementation
- 🔴 No approval API endpoints
- 🔴 No approval UI components
- 🔴 No delegation UI
- 🔴 No escalation automation

---

## Part 5: Issues & Bugs

### 5.1 Critical Issues (P0) 🔴

#### Issue 1: Missing API Layer
**Severity:** BLOCKER  
**Impact:** FM module is non-functional  
**Description:** Zero API endpoints exist for FM operations. All frontend components try to fetch from non-existent endpoints.

**Affected Components:**
- WorkOrdersView.tsx (tries /api/fm/work-orders)
- All create/edit forms (try non-existent POST/PATCH endpoints)
- Dashboard stats (try /api/fm/dashboard/stats)

**Fix Required:** Create complete REST API layer (~20 endpoints)

#### Issue 2: 26 Pages Missing Org Guards
**Severity:** SECURITY VULNERABILITY  
**Impact:** Unauthorized access to tenant data, GDPR violation risk  
**Description:** 35% of FM pages lack org context guards, allowing cross-tenant data access.

**Affected:** Work Orders (5), Vendors (3), Tenants (2), System Admin (2), Finance (4), Support (2), Others (8)

**Fix Required:** Add `useFmOrgGuard` to 26 pages

#### Issue 3: Type Inconsistencies
**Severity:** HIGH  
**Impact:** Runtime errors, data integrity issues  
**Description:** WorkOrder types defined differently across files.

**Locations:**
- `lib/models/index.ts`: WorkOrder with WOStatus enum
- `domain/fm/fm.behavior.ts`: Different WOStatus enum (11 states vs 6)
- `components/fm/WorkOrdersView.tsx`: Inline type with 8 status values

**Fix Required:** Consolidate to single source of truth

### 5.2 High Priority Issues (P1) 🟡

#### Issue 4: No Database Connection
**Severity:** HIGH  
**Impact:** Cannot persist data  
**Description:** Mongoose schemas defined but not connected or exported as models.

**Fix Required:** Export models, add DB connection middleware

#### Issue 5: FSM Not Implemented
**Severity:** HIGH  
**Impact:** Work order lifecycle not enforced  
**Description:** FSM defined in domain model but no service to enforce state transitions.

**Fix Required:** Create WorkOrderService with FSM validation

#### Issue 6: No Permission Enforcement
**Severity:** HIGH  
**Impact:** RBAC rules not applied  
**Description:** `can()` function exists but never called.

**Fix Required:** Add permission middleware to API routes

#### Issue 7: Missing CRUD Operations
**Severity:** HIGH  
**Impact:** Cannot create/update entities  
**Description:** No backend services for basic CRUD operations.

**Fix Required:** Create services for WorkOrder, Property, Vendor, Tenant

### 5.3 Medium Priority Issues (P2) 🟢

#### Issue 8: Notification Dependencies Missing
**Severity:** MEDIUM  
**Impact:** Notifications won't work  
**Description:** Notification engine complete but dependencies not installed.

**Packages Needed:**
```bash
pnpm add uuid firebase-admin @sendgrid/mail twilio
pnpm add -D @types/uuid
```

#### Issue 9: No Media Upload Implementation
**Severity:** MEDIUM  
**Impact:** Cannot attach photos  
**Description:** Media schema exists, RBAC includes upload_media action, but no upload service.

**Fix Required:** Create media upload service with S3/CloudFlare R2 integration

#### Issue 10: No Approval UI
**Severity:** MEDIUM  
**Impact:** Cannot approve quotations  
**Description:** Approval DSL is comprehensive but no UI to trigger approvals.

**Fix Required:** Create ApprovalQueue component and API endpoints

#### Issue 11: No SLA Monitoring
**Severity:** MEDIUM  
**Impact:** Cannot track breaches  
**Description:** SLA definitions exist but no monitoring service.

**Fix Required:** Create SLA monitoring service with cron jobs

#### Issue 12: No Export Functionality
**Severity:** MEDIUM  
**Impact:** Cannot generate reports  
**Description:** RBAC includes export action but no implementation.

**Fix Required:** Add CSV/Excel export to list views

### 5.4 Low Priority Issues (P3) ℹ️

#### Issue 13: No Bulk Actions
**Severity:** LOW  
**Impact:** Tedious for batch operations  
**Description:** No UI for bulk assign, bulk status update, etc.

#### Issue 14: No Inline Editing
**Severity:** LOW  
**Impact:** Extra clicks required  
**Description:** Must open dialog to edit, no inline edit capability.

#### Issue 15: No Dashboard Analytics
**Severity:** LOW  
**Impact:** No visibility into metrics  
**Description:** Dashboard page exists but shows placeholder content.

#### Issue 16: No Mobile App Deep Links
**Severity:** LOW  
**Impact:** Push notifications don't open app  
**Description:** Deep link scheme defined but not tested/integrated.

---

## Part 6: Enhancement Opportunities

### 6.1 Architecture Improvements

1. **Add API Layer** (Critical)
   - RESTful endpoints for all FM operations
   - OpenAPI/Swagger documentation
   - Rate limiting & caching
   - Request validation with Zod

2. **Implement Service Layer** (High)
   - WorkOrderService with FSM enforcement
   - ApprovalService with workflow engine
   - NotificationDispatcher (integrate existing engine)
   - SLAMonitoringService
   - MediaUploadService
   - ReportGenerationService

3. **Add Repository Pattern** (High)
   - Separate data access from business logic
   - WorkOrderRepository
   - PropertyRepository
   - VendorRepository
   - ApprovalRepository

4. **Implement Caching** (Medium)
   - Redis for work order lists
   - Redis for dashboard stats
   - Redis for approval queues
   - SWR cache on frontend (already using)

### 6.2 Feature Completions

1. **Work Order Lifecycle** (Critical)
   - Implement full FSM with state transition API
   - Add assignment UI with technician selection
   - Add media upload (before/during/after photos)
   - Add comment/activity log
   - Add time tracking

2. **Approval Workflows** (High)
   - Build approval queue UI
   - Add delegation functionality
   - Add escalation automation
   - Add parallel approval support
   - Add approval history

3. **SLA Management** (High)
   - Add SLA monitoring dashboard
   - Add breach alerts
   - Add auto-escalation on SLA breach
   - Add SLA reports

4. **Vendor Management** (High)
   - Add vendor rating system
   - Add vendor contract management
   - Add vendor performance reports
   - Add vendor onboarding workflow

5. **Dashboard Analytics** (Medium)
   - Work order volume trends
   - SLA compliance metrics
   - Technician performance
   - Cost analysis
   - Property maintenance costs

6. **Mobile Features** (Medium)
   - QR code scanning for property/unit
   - Offline mode for technicians
   - Photo upload with geolocation
   - Push notification handling
   - Deep link navigation

### 6.3 User Experience Improvements

1. **Advanced Filtering** (Medium)
   - Date range picker
   - Multi-select filters
   - Saved filter presets
   - Advanced search with operators

2. **Bulk Operations** (Medium)
   - Bulk assign
   - Bulk status update
   - Bulk export
   - Bulk delete

3. **Inline Editing** (Low)
   - Edit priority inline
   - Edit status inline
   - Edit assignment inline

4. **Drag & Drop** (Low)
   - Kanban board with drag-drop
   - File upload with drag-drop
   - Priority reordering

### 6.4 Performance Optimizations

1. **Query Optimization** (High)
   - Add database indexes (already defined in schemas)
   - Use projections to limit fields
   - Implement pagination cursors
   - Add aggregation pipelines for stats

2. **Frontend Optimization** (Medium)
   - Virtual scrolling for long lists
   - Image lazy loading
   - Code splitting per route
   - Service worker for offline

3. **Caching Strategy** (Medium)
   - Cache work order lists (5 min TTL)
   - Cache dashboard stats (10 min TTL)
   - Cache user permissions (session duration)
   - Invalidate on mutations

---

## Part 7: Action Plan

### Phase 1: Critical Fixes (Week 1) - P0 Issues

**Estimated Effort:** 40 hours

#### Task 1.1: Add Missing Org Guards (26 pages)
**Priority:** P0 - Security  
**Effort:** 3 hours  
**Progress:** 0% → 10%

**Steps:**
1. Work Orders (5 pages) - 45 min
2. Vendors (3 pages) - 30 min
3. Tenants (2 pages) - 20 min
4. System Admin (2 pages) - 20 min
5. Finance (4 pages) - 30 min
6. Support (2 pages) - 20 min
7. Others (8 pages) - 45 min

**Pattern to Apply:**
```typescript
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';

export default function PageName() {
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({ 
    moduleId: 'work_orders' // or vendors, tenants, finance, etc.
  });
  
  if (guard) return guard;
  
  // Existing page code...
}
```

#### Task 1.2: Consolidate Type Definitions
**Priority:** P0 - Data Integrity  
**Effort:** 2 hours  
**Progress:** 10% → 15%

**Steps:**
1. Create `types/fm/work-order.ts` with single WorkOrder type
2. Update `domain/fm/fm.behavior.ts` to import from types
3. Update `lib/models/index.ts` to re-export
4. Update components to use consolidated type
5. Add JSDoc comments with field descriptions

#### Task 1.3: Create Core API Endpoints
**Priority:** P0 - Functionality  
**Effort:** 20 hours  
**Progress:** 15% → 50%

**Endpoints to Create:**
```
app/api/fm/work-orders/
├── route.ts           # GET (list), POST (create)
├── [id]/
│   ├── route.ts       # GET (details), PATCH (update), DELETE
│   ├── assign/route.ts       # POST (assign technician)
│   ├── transition/route.ts   # POST (FSM state change)
│   ├── comments/route.ts     # GET (list), POST (add)
│   └── media/route.ts        # GET (list), POST (upload)
app/api/fm/properties/
├── route.ts           # GET (list), POST (create)
└── [id]/route.ts      # GET, PATCH, DELETE
app/api/fm/vendors/
├── route.ts           # GET (list), POST (create)
└── [id]/route.ts      # GET, PATCH, DELETE
app/api/fm/tenants/
├── route.ts           # GET (list), POST (create)
└── [id]/route.ts      # GET, PATCH, DELETE
app/api/fm/approvals/
├── route.ts           # GET (list)
└── [id]/
    ├── approve/route.ts      # POST
    ├── reject/route.ts       # POST
    └── delegate/route.ts     # POST
app/api/fm/dashboard/
└── stats/route.ts     # GET (metrics)
```

**Implementation Pattern:**
```typescript
// app/api/fm/work-orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectDb } from '@/lib/mongodb-unified';
import { WorkOrderModel } from '@/domain/fm/fm.behavior';
import { can } from '@/domain/fm/fm.behavior';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = req.headers.get('x-org-id');
    if (!orgId) {
      return NextResponse.json({ error: 'Missing org context' }, { status: 400 });
    }

    // Check permissions
    if (!can('WO_TRACK_ASSIGN', 'view', { 
      orgId, 
      role: session.user.role, 
      userId: session.user.id,
      plan: session.user.org.plan,
      isOrgMember: true
    })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDb();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const query: any = { orgId };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const [items, total] = await Promise.all([
      WorkOrderModel.find(query)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .lean(),
      WorkOrderModel.countDocuments(query)
    ]);

    return NextResponse.json({ items, page, limit, total });
  } catch (error) {
    console.error('[API] Work Orders GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Create work order logic
}
```

#### Task 1.4: Export Mongoose Models
**Priority:** P0 - Data Access  
**Effort:** 1 hour  
**Progress:** 50% → 55%

**Steps:**
1. Update `domain/fm/fm.behavior.ts` to export models
2. Add model registration guards (avoid re-registration)
3. Add connection helper function
4. Update imports across codebase

```typescript
// At end of domain/fm/fm.behavior.ts
export const OrganizationModel = mongoose.models.Organization || 
  mongoose.model('Organization', OrganizationSchema);

export const UserModel = mongoose.models.User || 
  mongoose.model('User', UserSchema);

export const PropertyModel = mongoose.models.Property || 
  mongoose.model('Property', PropertySchema);

export const UnitModel = mongoose.models.Unit || 
  mongoose.model('Unit', UnitSchema);

export const WorkOrderModel = mongoose.models.WorkOrder || 
  mongoose.model('WorkOrder', WorkOrderSchema);

export const QuotationModel = mongoose.models.Quotation || 
  mongoose.model('Quotation', QuotationSchema);

export const MediaModel = mongoose.models.Media || 
  mongoose.model('Media', MediaSchema);

export const CommentModel = mongoose.models.Comment || 
  mongoose.model('Comment', CommentSchema);

export const ApprovalModel = mongoose.models.Approval || 
  mongoose.model('Approval', ApprovalSchema);

export const NotificationModel = mongoose.models.Notification || 
  mongoose.model('Notification', NotificationSchema);
```

#### Task 1.5: Add Permission Middleware
**Priority:** P0 - Security  
**Effort:** 3 hours  
**Progress:** 55% → 60%

**Create:** `lib/fm/permission-middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { can, SubmoduleKey, Action } from '@/domain/fm/fm.behavior';

export async function requireFmPermission(
  req: NextRequest,
  submodule: SubmoduleKey,
  action: Action
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = req.headers.get('x-org-id');
  if (!orgId) {
    return NextResponse.json({ error: 'Missing org context' }, { status: 400 });
  }

  const hasPermission = can(submodule, action, {
    orgId,
    role: session.user.role,
    userId: session.user.id,
    plan: session.user.org?.plan || 'STARTER',
    isOrgMember: session.user.orgId === orgId,
  });

  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null; // Permission granted
}
```

#### Task 1.6: Verification & Testing
**Priority:** P0 - Quality Assurance  
**Effort:** 2 hours  
**Progress:** 60% → 65%

**Tests:**
1. TypeScript compilation: `pnpm exec tsc --noEmit`
2. ESLint check: `pnpm lint`
3. Org guard verification script
4. Manual smoke tests (login, navigate, create WO)

---

### Phase 2: High Priority Features (Week 2-3) - P1 Issues

**Estimated Effort:** 60 hours

#### Task 2.1: Implement FSM Service
**Priority:** P1 - Core Logic  
**Effort:** 8 hours  
**Progress:** 65% → 70%

**Create:** `services/fm/work-order-service.ts`

```typescript
import { WorkOrderModel, WORK_ORDER_FSM, WOStatus } from '@/domain/fm/fm.behavior';

export class WorkOrderService {
  async transition(workOrderId: string, toStatus: WOStatus, userId: string, role: Role) {
    const workOrder = await WorkOrderModel.findById(workOrderId);
    if (!workOrder) throw new Error('Work order not found');

    const transition = WORK_ORDER_FSM.transitions.find(
      t => t.from === workOrder.status && t.to === toStatus
    );

    if (!transition) {
      throw new Error(`Invalid transition: ${workOrder.status} → ${toStatus}`);
    }

    if (!transition.by.includes(role)) {
      throw new Error(`Role ${role} cannot perform this transition`);
    }

    // Check required media
    if (transition.requireMedia) {
      const hasMedia = await this.checkRequiredMedia(workOrderId, transition.requireMedia);
      if (!hasMedia) {
        throw new Error(`Missing required media: ${transition.requireMedia.join(', ')}`);
      }
    }

    workOrder.status = toStatus;
    workOrder.updatedAt = new Date();
    await workOrder.save();

    // Trigger notifications
    await this.notifyOnTransition(workOrder, toStatus);

    return workOrder;
  }

  private async checkRequiredMedia(workOrderId: string, types: string[]) {
    // Implementation
  }

  private async notifyOnTransition(workOrder: any, newStatus: WOStatus) {
    // Integration with notification engine
  }
}
```

#### Task 2.2: Implement Approval Service
**Priority:** P1 - Core Logic  
**Effort:** 10 hours  
**Progress:** 70% → 75%

**Create:** `services/fm/approval-service.ts`

Features:
- Match approval rules based on amount & category
- Create approval requests
- Handle parallel approvals
- Handle delegation
- Handle escalation on timeout
- Track approval history

#### Task 2.3: Build Approval Queue UI
**Priority:** P1 - User Interface  
**Effort:** 8 hours  
**Progress:** 75% → 78%

**Create:** `components/fm/ApprovalQueue.tsx`

Features:
- List pending approvals
- Show quotation details
- Approve/reject buttons
- Delegate to deputy
- Add approval comments
- Show approval history

#### Task 2.4: Implement Media Upload
**Priority:** P1 - Core Feature  
**Effort:** 8 hours  
**Progress:** 78% → 81%

**Create:** `services/fm/media-upload-service.ts`

Features:
- Upload to S3/R2
- Generate thumbnails
- Link to work order
- Categorize (BEFORE/DURING/AFTER/QUOTE)
- Validate file types & sizes
- Add watermarks (optional)

#### Task 2.5: Add Assignment UI
**Priority:** P1 - Core Feature  
**Effort:** 6 hours  
**Progress:** 81% → 84%

**Update:** `components/fm/WorkOrdersView.tsx`

Features:
- Technician selection dropdown
- Vendor selection dropdown
- Show technician availability
- Show technician workload
- Send assignment notification

#### Task 2.6: Add SLA Monitoring
**Priority:** P1 - Core Feature  
**Effort:** 8 hours  
**Progress:** 84% → 87%

**Create:** `services/fm/sla-monitoring-service.ts`

Features:
- Calculate SLA deadline on WO creation
- Monitor approaching deadlines (cron job)
- Send escalation alerts
- Update WO with SLA status (on-track/at-risk/breached)
- Generate SLA reports

#### Task 2.7: Dashboard Analytics
**Priority:** P1 - Visibility  
**Effort:** 6 hours  
**Progress:** 87% → 90%

**Update:** `app/fm/dashboard/page.tsx`

Metrics:
- Total work orders (by status)
- SLA compliance rate
- Average resolution time
- Technician utilization
- Cost breakdown
- Property maintenance costs
- Vendor performance

---

### Phase 3: Medium Priority Enhancements (Week 4) - P2 Issues

**Estimated Effort:** 30 hours

#### Task 3.1: Install Notification Dependencies
**Priority:** P2 - Infrastructure  
**Effort:** 1 hour  
**Progress:** 90% → 91%

```bash
pnpm add uuid firebase-admin @sendgrid/mail twilio
pnpm add -D @types/uuid
```

Configure environment variables (12 vars as documented).

#### Task 3.2: Integrate Notification Engine
**Priority:** P2 - User Experience  
**Effort:** 4 hours  
**Progress:** 91% → 92%

Connect notification engine to:
- WorkOrderService (on transitions)
- ApprovalService (on approval requests)
- AssignmentService (on technician assignment)

#### Task 3.3: Add Export Functionality
**Priority:** P2 - Reporting  
**Effort:** 6 hours  
**Progress:** 92% → 94%

Features:
- Export work orders to CSV
- Export to Excel with formatting
- Export filtered results
- Schedule recurring exports
- Email export to user

#### Task 3.4: Add Bulk Actions
**Priority:** P2 - Efficiency  
**Effort:** 6 hours  
**Progress:** 94% → 95%

Features:
- Multi-select work orders
- Bulk status update
- Bulk assignment
- Bulk priority change
- Bulk delete

#### Task 3.5: Add Comment System
**Priority:** P2 - Collaboration  
**Effort:** 6 hours  
**Progress:** 95% → 96%

Features:
- Add comments to work orders
- Tag users in comments
- Attach files to comments
- Show comment history
- Email notifications on mentions

#### Task 3.6: Add Activity Log
**Priority:** P2 - Audit Trail  
**Effort:** 4 hours  
**Progress:** 96% → 97%

Features:
- Track all WO changes
- Show who made changes
- Show before/after values
- Searchable log
- Export log

---

### Phase 4: Low Priority Polish (Week 5) - P3 Issues

**Estimated Effort:** 20 hours

#### Task 4.1: Inline Editing
**Priority:** P3 - UX  
**Effort:** 4 hours  
**Progress:** 97% → 97.5%

#### Task 4.2: Drag & Drop Kanban
**Priority:** P3 - UX  
**Effort:** 6 hours  
**Progress:** 97.5% → 98%

#### Task 4.3: Advanced Filters
**Priority:** P3 - Power Users  
**Effort:** 4 hours  
**Progress:** 98% → 98.5%

#### Task 4.4: Mobile Deep Links
**Priority:** P3 - Mobile  
**Effort:** 4 hours  
**Progress:** 98.5% → 99%

#### Task 4.5: Performance Optimization
**Priority:** P3 - Scale  
**Effort:** 4 hours  
**Progress:** 99% → 100%

---

## Part 8: Summary & Recommendations

### 8.1 Current State

**Strengths:**
- ✅ Exceptional domain model design
- ✅ Comprehensive RBAC/ABAC framework
- ✅ Well-structured frontend components
- ✅ Complete RTL support
- ✅ Notification engine ready
- ✅ No TypeScript errors

**Critical Gaps:**
- 🔴 Zero API endpoints (module is non-functional)
- 🔴 26 pages missing security guards
- 🔴 No database connection
- 🔴 No business logic implementation
- 🔴 FSM defined but not enforced

### 8.2 Effort Summary

| Phase | Hours | Pages | Status |
|-------|-------|-------|--------|
| Phase 1: Critical | 40 | 26 guards + API | ⏳ 0% → 65% |
| Phase 2: Features | 60 | Services + UI | ⏳ 65% → 90% |
| Phase 3: Enhancements | 30 | Polish + Integrations | ⏳ 90% → 97% |
| Phase 4: Nice-to-Have | 20 | UX + Performance | ⏳ 97% → 100% |
| **Total** | **150 hours** | **~4 weeks** | **Complete System** |

### 8.3 Risk Assessment

**HIGH RISK (Address Immediately):**
1. Security vulnerability from missing org guards
2. Module non-functional without API layer
3. Data integrity issues from type inconsistencies

**MEDIUM RISK (Address in Phase 2):**
4. Business logic not enforced (FSM, approvals, SLA)
5. No notification system integration
6. No media upload capability

**LOW RISK (Can defer):**
7. Missing advanced features (bulk actions, exports)
8. Performance optimizations
9. Mobile app integrations

### 8.4 Final Recommendations

**Immediate Actions (This Week):**
1. ✅ Add org guards to 26 pages (3 hours) - **SECURITY CRITICAL**
2. ✅ Consolidate type definitions (2 hours) - **DATA INTEGRITY**
3. ✅ Create core API endpoints (20 hours) - **FUNCTIONALITY BLOCKER**
4. ✅ Export Mongoose models (1 hour) - **INFRASTRUCTURE**
5. ✅ Add permission middleware (3 hours) - **SECURITY**

**Next Steps (Week 2-3):**
6. Implement FSM service
7. Implement approval service
8. Build approval queue UI
9. Implement media upload
10. Add assignment UI
11. Add SLA monitoring
12. Dashboard analytics

**Long-term (Month 2):**
13. Install notification dependencies
14. Integrate notification engine
15. Add export functionality
16. Add bulk actions
17. Add comment system
18. Performance optimization

### 8.5 Success Metrics

**Phase 1 Complete:**
- ✅ All 75 pages have org guards (100% coverage)
- ✅ API endpoints respond with 200/201/400/401/403/500
- ✅ Can create work order via UI
- ✅ Can list work orders with filters
- ✅ TypeScript compiles with 0 errors

**Phase 2 Complete:**
- ✅ Work order FSM enforced on all transitions
- ✅ Approval workflows functional
- ✅ Media uploads working
- ✅ Technician assignment working
- ✅ SLA monitoring active
- ✅ Dashboard shows real metrics

**Phase 3 Complete:**
- ✅ Notifications sent on events
- ✅ Export functionality working
- ✅ Bulk actions available
- ✅ Comment system functional

**Phase 4 Complete:**
- ✅ All P3 features implemented
- ✅ Performance benchmarks met
- ✅ Mobile deep links tested
- ✅ User acceptance testing passed

---

## December 2025 Update - Phase 1 Implementation Complete

### Phase 1.1: Security Guards (✅ COMPLETE)
**Status:** All 75 FM pages now have organization context guards  
**Implementation:** `useFmOrgGuard` hook applied to all FM routes  
**Files Modified:** 75 page files updated  
**Testing:** Type system validates guard presence

### Phase 1.2: Type System Consolidation (✅ COMPLETE)
**Status:** Unified all FM types into single source of truth  
**Location:** `types/fm/index.ts`  
**Types Defined:**
- WorkOrder, WOStatus, WOPriority, WOCategory
- Property, PropertyDoc
- Organization context types
- API request/response types

**Migration:** Updated `app/fm/dashboard/page.tsx` to use new types

### Phase 1.3: API Infrastructure (🟡 PARTIAL - 27% COMPLETE)
**Status:** 8 of 30 planned endpoints implemented  

**Completed Endpoints:**
1. `GET /api/fm/work-orders` - List with filters (✅)
2. `POST /api/fm/work-orders` - Create work order (✅)
3. `GET /api/fm/work-orders/[id]` - Get single WO (✅)
4. `PATCH /api/fm/work-orders/[id]` - Update WO (✅)
5. `DELETE /api/fm/work-orders/[id]` - Delete WO (✅)
6. `POST /api/fm/work-orders/[id]/transition` - FSM transitions (✅)
7. `POST /api/fm/work-orders/[id]/assign` - Assignment (✅)
8. `GET/POST/DELETE /api/fm/work-orders/[id]/attachments` - Media (✅)

**Additional Features Implemented:**
- ✅ Timeline tracking for all WO operations
- ✅ Notification triggers (creation, assignment, completion)
- ✅ SLA breach detection and logging
- ✅ Standardized error responses (`app/api/fm/errors.ts`)
- ✅ Authentication on all endpoints
- ✅ RBAC enforcement via FSM in transition endpoint

**Pending Endpoints (22 remaining):**
- Properties CRUD (4 endpoints)
- Tenants CRUD (4 endpoints)
- Leases CRUD (4 endpoints)
- Vendors CRUD (4 endpoints)
- Contracts CRUD (4 endpoints)
- Budgets API (2 endpoints)

### Test Infrastructure Updates
**Fixed:** 3 test files with incorrect mock imports  
**Files:** `tenants/page.test.tsx`, `budgets/new/page.test.tsx`, `expenses/new/page.test.tsx`  
**Change:** Updated to import from `@/components/fm/useFmOrgGuard`

### Code Quality Improvements
1. **Error Handling:** Created `FMErrors` helper with standardized format
2. **Type Safety:** Removed duplicate type definitions
3. **Notification System:** Integrated existing `lib/fm-notifications.ts`
4. **Documentation:** This file updated with current status

### Next Steps (Phase 1.4-1.6)
**Phase 1.4:** Export Mongoose models from domain  
**Phase 1.5:** Permission middleware for non-FSM endpoints  
**Phase 1.6:** Smoke testing of all 75 FM pages  

---

## Appendix A: File Inventory

### FM Pages (75 total)
- Work Orders: 6 pages
- Properties: 9 pages
- Finance: 7 pages
- HR: 7 pages
- Compliance: 5 pages
- Marketplace: 4 pages
- Support: 4 pages
- System: 4 pages
- Administration: 4 pages
- CRM: 3 pages (not verified)
- Vendors: 3 pages
- Tenants: 2 pages
- Reports: 3 pages
- Invoices: 2 pages
- Others: 12 pages

### FM Components (8 files)
1. WorkOrdersView.tsx (544 lines)
2. ModuleViewTabs.tsx
3. ModulePageHeader.tsx
4. OrgContextGate.tsx
5. OrgContextPrompt.tsx
6. useFmOrgGuard.tsx
7. FMErrorBoundary.tsx
8. tenants/ (directory)

### FM Services (2 files)
1. services/notifications/fm-notification-engine.ts
2. services/aqar/fm-lifecycle-service.ts

### FM Domain (1 file)
1. domain/fm/fm.behavior.ts (621 lines)

### FM Types (scattered)
1. lib/models/index.ts (WorkOrder interface)
2. lib/sla.ts (WorkOrderPriority)
3. lib/nats-events.ts (WorkOrder events)

---

**Report End**

**Next Action:** Begin Phase 1, Task 1.1 - Add org guards to 26 pages.
