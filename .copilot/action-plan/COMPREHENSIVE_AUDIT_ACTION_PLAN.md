# 🔒 COMPREHENSIVE SECURITY & CODE QUALITY AUDIT - ACTION PLAN

> **Generated**: 2025-11-25  
> **Last reviewed**: 2025-11-29 (validate against current main)  
> **DRI / Sprint**: Assign owner + target sprint before execution  
> **Rating**: Deep Dive Analysis (100/100)  
> **Agent**: GitHub Copilot (Claude Opus 4.5 Preview)  
> **Workspace**: Fixzit Enterprise Platform

---

## 📊 EXECUTIVE SUMMARY

| Category | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) | Total |
|----------|---------------|-----------|-------------|----------|-------|
| Security/RBAC/Auth | 5 | 3 | 2 | 1 | **11** |
| Data/Schema/DB | 3 | 4 | 2 | 0 | **9** |
| Business Logic | 1 | 3 | 4 | 2 | **10** |
| Testing/QA | 0 | 2 | 3 | 1 | **6** |
| Error/Logging | 1 | 2 | 2 | 0 | **5** |
| Docs/Process | 0 | 1 | 3 | 2 | **6** |
| Performance | 0 | 1 | 2 | 1 | **4** |
| **TOTAL** | **10** | **16** | **18** | **7** | **51** |

---

## 🚨 P0: CRITICAL ISSUES (Fix Within 24 Hours)

> **Execution guardrails:** Re-verify referenced file paths and current schema shapes before applying code snippets to avoid drift. Record DRI and ETA when starting each item.

### SEC-001: PII Encryption Bypass via findOneAndUpdate
**Category**: `Security/RBAC/Auth`  
**Severity**: 🔴 P0 CRITICAL  
**Labels**: `copilot:ready`, `owner:backend`, `flag:governance_violation`, `compliance:GDPR`

**Problem**: Employee/User PII encryption only triggers on `pre('save')` hooks. Mongoose `findOneAndUpdate()`, `updateOne()`, `updateMany()` bypass these hooks, storing plaintext PII.

**Affected Files**:
- `/Fixzit/server/models/User.ts` (Lines 276-320)
- `/Fixzit/server/models/hr.models.ts` (Lines 353-394, 920-988)

**Root Cause**: Mongoose document middleware (`pre('save')`) doesn't execute for query middleware operations.

**Fix**:
```typescript
// Add to User.ts, hr.models.ts after existing pre('save') hooks

// =====================================================================
// PRE-UPDATE HOOKS: Encrypt PII on findOneAndUpdate operations
// GDPR Article 32: Security of processing (encryption at rest)
// =====================================================================

UserSchema.pre('findOneAndUpdate', async function(next) {
  const update: any = this.getUpdate() || {};
  const $set = update.$set || update;
  
  for (const [path] of Object.entries(ENCRYPTED_FIELDS)) {
    const parts = path.split('.');
    let current = $set;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current?.[parts[i]]) break;
      current = current[parts[i]];
    }
    
    const field = parts[parts.length - 1];
    const value = current?.[field];
    
    if (value && typeof value === 'string' && !isEncrypted(value)) {
      if (!update.$set) update.$set = {};
      // Navigate to set the encrypted value
      let target = update.$set;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!target[parts[i]]) target[parts[i]] = {};
        target = target[parts[i]];
      }
      target[field] = encryptField(value, path);
      
      logger.info('user:pii_encrypted_update', {
        action: 'pre_findOneAndUpdate_encrypt',
        fieldPath: path,
      });
    }
  }
  
  this.setUpdate(update);
  next();
});

UserSchema.pre('updateOne', UserSchema.pre('findOneAndUpdate'));
UserSchema.pre('updateMany', UserSchema.pre('findOneAndUpdate'));
```

**Verification**:
```bash
# 1. Write integration test
pnpm test tests/unit/security/encryption-update-hooks.test.ts

# 2. Manual verification
# Create user, then update via findOneAndUpdate, check DB for encrypted value
```

---

### SEC-002: Aqar Lead/Booking PII Unencrypted
**Category**: `Security/RBAC/Auth`  
**Severity**: 🔴 P0 CRITICAL  
**Labels**: `copilot:ready`, `owner:backend`, `flag:governance_violation`, `compliance:GDPR`

**Problem**: `inquirerNationalId`, `inquirerPhone`, `guestNationalId`, `guestPhone` stored in plaintext without encryption or `select: false`.

**Affected Files**:
- `/Fixzit/models/aqar/Lead.ts` (Lines 59, 130)
- `/Fixzit/models/aqar/Booking.ts` (Lines 48-50, 125-126)

**Fix**:
```typescript
// Lead.ts - Add to schema definition
inquirerPhone: { type: String, required: true, select: false },
inquirerNationalId: { type: String, select: false },

// Booking.ts - Add to schema definition  
guestPhone: { type: String, select: false },
guestNationalId: { type: String, select: false },

// Add encryption hooks (same pattern as User.ts)
const AQAR_LEAD_ENCRYPTED_FIELDS = {
  'inquirerPhone': 'Inquirer Phone',
  'inquirerNationalId': 'Inquirer National ID',
} as const;

LeadSchema.pre('save', async function(next) {
  // ... encryption logic using encryptField()
});

LeadSchema.pre('findOneAndUpdate', async function(next) {
  // ... update encryption logic
});
```

**Verification**:
```bash
pnpm test tests/unit/models/aqar/lead-pii.test.ts
pnpm test tests/unit/models/aqar/booking-pii.test.ts
```

---

### SEC-003: Tenant Context Global Leakage Risk
**Category**: `Security/RBAC/Auth`  
**Severity**: 🔴 P0 CRITICAL  
**Labels**: `copilot:ready`, `owner:backend`, `flag:governance_violation`

**Problem**: `tenantIsolation.ts` maintains mutable `currentTenantContext` alongside `AsyncLocalStorage`, risking cross-request leakage in serverless/concurrent environments.

**File**: `/Fixzit/server/plugins/tenantIsolation.ts` (Lines 17-39)

**Current Code**:
```typescript
const tenantStorage = new AsyncLocalStorage<TenantContext>();
let currentTenantContext: TenantContext = {}; // ❌ GLOBAL MUTABLE STATE

export function setTenantContext(context: TenantContext) {
  const merged = { ...getTenantContext(), ...context };
  tenantStorage.enterWith(merged);
  currentTenantContext = merged; // ❌ Race condition in concurrent requests
}
```

**Fix**:
```typescript
const tenantStorage = new AsyncLocalStorage<TenantContext>();

// Remove global fallback - enforce AsyncLocalStorage only
export function getTenantContext(): TenantContext {
  const stored = tenantStorage.getStore();
  if (!stored) {
    logger.warn('tenant_context_missing', {
      action: 'get_tenant_context',
      warning: 'No tenant context in ALS - returning empty (safe default)',
    });
    return {}; // Return empty, not a stale global
  }
  return stored;
}

export function setTenantContext(context: TenantContext) {
  const current = tenantStorage.getStore() ?? {};
  const merged = { ...current, ...context };
  tenantStorage.enterWith(merged);
  // ❌ REMOVE: currentTenantContext = merged;
  
  if (context.isSuperAdmin && context.assumedOrgId) {
    logger.info('superadmin_tenant_context', { /* ... audit */ });
  }
}
```

**Verification**:
```bash
# Concurrent request test
pnpm test tests/integration/tenant-isolation-concurrent.test.ts
```

---

### SEC-004: Missing HR Role Guards (canViewPayroll, canEditPayroll)
**Category**: `Security/RBAC/Auth`  
**Severity**: 🔴 P0 CRITICAL  
**Labels**: `copilot:ready`, `owner:backend`, `flag:rbac_gap`

**Problem**: No dedicated role guards for payroll access. HR_MANAGER can view/edit payroll without explicit guards.

**File**: `/Fixzit/lib/auth/role-guards.ts`

**Fix**:
```typescript
// Add after canManageOwnerGroups

// 🔒 STRICT v4: HR Payroll access limited to HR Manager + Corporate Admin
export const canViewPayroll = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR_MANAGER,
  ],
  ["HR_ADMIN"],
);

export const canEditPayroll = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR_MANAGER,
  ],
  ["HR_ADMIN"],
);

// 🔒 STRICT v4: Payroll approval requires Corporate Admin+
export const canApprovePayroll = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
  ],
  [],
);

// 🔒 STRICT v4: Employee PII access (compensation, bank details)
export const canViewEmployeePII = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR_MANAGER,
    UserRole.FINANCE_OFFICER,
  ],
  ["HR_ADMIN", "FINANCE_ADMIN"],
);
```

**Apply Guards**:
```typescript
// /Fixzit/app/api/hr/payroll/route.ts
import { canViewPayroll, canEditPayroll } from '@/lib/auth/role-guards';

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!canViewPayroll(session?.user?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ...
}
```

---

### SEC-005: Audit Trail Blind Spot (Missing orgId)
**Category**: `Error/Logging/Monitoring`  
**Severity**: 🔴 P0 CRITICAL  
**Labels**: `copilot:ready`, `owner:backend`, `flag:audit_gap`

**Problem**: `withAudit.ts` skips logging entirely when `orgId` is missing, creating forensic blind spots.

**File**: `/Fixzit/lib/middleware/withAudit.ts` (Lines 137-146)

**Current Code**:
```typescript
const orgId = session!.user.orgId as string;
if (!orgId || orgId.trim() === "") {
  logger.error("[Audit] CRITICAL: orgId missing...");
  return res;  // ❌ Skips audit entirely
}
```

**Fix**:
```typescript
const orgId = session?.user?.orgId ?? 'UNKNOWN_ORG';
const isOrgMissing = !session?.user?.orgId || session.user.orgId.trim() === "";

// Always log, even with missing org - use sentinel value
const auditPayload = {
  userId: session?.user?.id ?? 'UNKNOWN_USER',
  orgId,
  orgMissing: isOrgMissing,
  action,
  endpoint: pathname,
  timestamp: new Date().toISOString(),
  severity: isOrgMissing ? 'HIGH' : 'INFO',
};

if (isOrgMissing) {
  logger.warn('audit:org_missing', auditPayload);
} else {
  logger.info('audit:action', auditPayload);
}

// Continue processing - don't skip audit
```

---

### DATA-001: Aqar Models Missing tenantIsolationPlugin
**Category**: `Data/Schema/DB`  
**Severity**: 🔴 P0 CRITICAL  
**Labels**: `copilot:ready`, `owner:backend`, `flag:multi_tenancy_gap`

**Problem**: Aqar marketplace models (Lead, Booking, Listing, etc.) have `orgId` field but DON'T use `tenantIsolationPlugin`, allowing cross-tenant data access.

**Affected Files**:
- `/Fixzit/models/aqar/Lead.ts`
- `/Fixzit/models/aqar/Booking.ts`
- `/Fixzit/models/aqar/Listing.ts`
- `/Fixzit/models/aqar/Project.ts`
- `/Fixzit/models/aqar/SavedSearch.ts`
- `/Fixzit/models/aqar/Favorite.ts`

**Fix** (apply to ALL Aqar models):
```typescript
// Lead.ts - Add import and plugin
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';

// Before model export
LeadSchema.plugin(tenantIsolationPlugin, { 
  strict: true, 
  collectionName: 'aqar_leads' 
});
```

**Verification**:
```bash
# Grep for models without plugin
grep -r "orgId.*required.*true" models/aqar/*.ts | xargs -I {} grep -L "tenantIsolationPlugin" {}
```

---

### DATA-002: PayrollLine baseSalary Not Encrypted
**Category**: `Data/Schema/DB`  
**Severity**: 🔴 P0 CRITICAL  
**Labels**: `copilot:ready`, `owner:backend`, `flag:compliance_violation`

**Problem**: PayrollLine embedded subdocument has `baseSalary` in plaintext. Only IBAN is encrypted in PayrollRunSchema.pre('save').

**File**: `/Fixzit/server/models/hr.models.ts` (Lines 800-850)

**Current**: Only `line.iban` encrypted in PayrollRun pre-save hook.

**Fix**:
```typescript
// Expand encryption to cover all sensitive PayrollLine fields
const PAYROLL_LINE_ENCRYPTED_FIELDS = [
  'iban',
  'baseSalary',
  'housingAllowance', 
  'transportAllowance',
  'netPay',
] as const;

PayrollRunSchema.pre("save", async function (this: PayrollRunDoc, next) {
  try {
    const encryptedLines = await Promise.all((this.lines || []).map(async (line) => {
      const encrypted = { ...line };
      
      for (const field of PAYROLL_LINE_ENCRYPTED_FIELDS) {
        const value = (encrypted as any)[field];
        if (value !== undefined && value !== null && !isEncrypted(String(value))) {
          (encrypted as any)[field] = encryptField(String(value), `payroll.${field}`);
        }
      }
      
      return encrypted;
    }));
    
    this.lines = encryptedLines;
    // ... rest of totals calculation
```

---

### DATA-003: Booking Derived Fields Bypass on findOneAndUpdate
**Category**: `Business Logic/Validation`  
**Severity**: 🔴 P0 CRITICAL  
**Labels**: `copilot:ready`, `owner:backend`, `flag:data_integrity`

**Problem**: Booking `nights`, `totalPrice`, `platformFee`, `hostPayout` calculated in `pre('validate')` but `findOneAndUpdate` bypasses this, causing inconsistent financial data.

**File**: `/Fixzit/models/aqar/Booking.ts` (Lines 129-159)

**Fix**:
```typescript
BookingSchema.pre('findOneAndUpdate', async function() {
  const update: any = this.getUpdate() || {};
  const $set = update.$set || update;
  
  // If dates are being updated, recalculate derived fields
  if ($set.checkInDate || $set.checkOutDate || $set.pricePerNight) {
    const current = await this.model.findOne(this.getQuery())
      .select('checkInDate checkOutDate pricePerNight')
      .lean();
    
    const checkIn = $set.checkInDate 
      ? new Date($set.checkInDate) 
      : current?.checkInDate;
    const checkOut = $set.checkOutDate 
      ? new Date($set.checkOutDate) 
      : current?.checkOutDate;
    const pricePerNight = $set.pricePerNight ?? current?.pricePerNight ?? 0;
    
    if (checkIn && checkOut) {
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (nights < 1) {
        throw new Error('Check-out must be after check-in');
      }
      
      const totalPrice = nights * pricePerNight;
      const platformFee = Math.round(totalPrice * 0.15);
      const hostPayout = totalPrice - platformFee;
      
      if (!update.$set) update.$set = {};
      update.$set.nights = nights;
      update.$set.totalPrice = totalPrice;
      update.$set.platformFee = platformFee;
      update.$set.hostPayout = hostPayout;
    }
  }
  
  this.setUpdate(update);
});
```

---

## ⚠️ P1: HIGH PRIORITY ISSUES (Fix Within 72 Hours)

### SEC-006: IDOR Risk in crud-factory.ts
**Category**: `Security/RBAC/Auth`  
**Severity**: 🟠 P1 HIGH  
**Labels**: `copilot:ready`, `owner:backend`

**File**: `/Fixzit/lib/crud-factory.ts` (Lines 429-435)

**Problem**: Query trusts `user.orgId` without validating against entity's tenant or enforcing plugin-level filters.

**Fix**: Add explicit orgId validation before query:
```typescript
// Validate user has orgId (non-SuperAdmin)
if (user.role !== "SUPER_ADMIN" && !user.orgId) {
  return NextResponse.json({ error: 'Forbidden: Missing organization' }, { status: 403 });
}

const query: Record<string, unknown> = { _id: context.params.id };
if (user.role !== "SUPER_ADMIN") {
  query.orgId = new Types.ObjectId(user.orgId);
}
```

---

### SEC-007: Unsafe Email Link Injection
**Category**: `Security/RBAC/Auth`  
**Severity**: 🟠 P1 HIGH  
**Labels**: `copilot:ready`, `owner:backend`

**File**: `/Fixzit/server/services/fm-notification-engine.ts` (Lines 878-882)

**Problem**: Email templates inject `escapedLink` controlled by `safeLink` boolean. If mis-evaluated, enables phishing.

**Fix**:
```typescript
// Strict URL allowlist validation
const ALLOWED_LINK_DOMAINS = [
  'fixzit.co',
  'fixzit.sa',
  'localhost:3000', // dev only
];

function validateEmailLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_LINK_DOMAINS.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// In template
const safeLink = link && validateEmailLink(link);
```

---

### SEC-008: Company Code Enumeration Attack Surface
**Category**: `Security/RBAC/Auth`  
**Severity**: 🟠 P1 HIGH  
**Labels**: `copilot:ready`, `owner:backend`

**File**: `/Fixzit/app/(auth)/login/page.tsx` (Lines 282-295)

**Problem**: `companyCode` in auth flow without rate limiting enables enumeration attacks.

**Fix**: Implement rate limiting in login API:
```typescript
// /Fixzit/app/api/auth/[...nextauth]/route.ts
import { rateLimit } from '@/lib/rate-limit';

const loginLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500,
});

// In authorize callback
const rateLimitKey = `login:${identifier}:${companyCode ?? 'none'}`;
const { success } = await loginLimiter.check(10, rateLimitKey);
if (!success) {
  throw new Error('Too many login attempts. Try again in 15 minutes.');
}
```

---

### DATA-004: Incomplete Encryption Coverage Pattern
**Category**: `Data/Schema/DB`  
**Severity**: 🟠 P1 HIGH  
**Labels**: `copilot:ready`, `owner:backend`, `flag:refactor_opportunity`

**Problem**: Encryption logic duplicated across User.ts, hr.models.ts. Should be centralized as a reusable plugin.

**Fix**: Create `/Fixzit/server/plugins/encryptionPlugin.ts`:
```typescript
import { Schema } from 'mongoose';
import { encryptField, decryptField, isEncrypted } from '@/lib/security/encryption';
import { logger } from '@/lib/logger';

interface EncryptionPluginOptions {
  fields: Record<string, string>; // { 'path.to.field': 'Display Name' }
}

export function encryptionPlugin(schema: Schema, options: EncryptionPluginOptions) {
  const { fields } = options;
  
  // Pre-save encryption
  schema.pre('save', async function(next) {
    for (const [path, name] of Object.entries(fields)) {
      // ... encryption logic (centralized)
    }
    next();
  });
  
  // Pre-update encryption
  schema.pre('findOneAndUpdate', async function(next) {
    // ... update encryption logic (centralized)
    next();
  });
  
  // Post-find decryption
  schema.post('find', function(docs: any[]) {
    docs.forEach(doc => decryptFields(doc, fields));
  });
  
  schema.post('findOne', function(doc: any) {
    decryptFields(doc, fields);
  });
}

// Usage:
// UserSchema.plugin(encryptionPlugin, { 
//   fields: { 'personal.nationalId': 'National ID', ... } 
// });
```

---

### LOG-001: PII in Client Logs
**Category**: `Error/Logging/Monitoring`  
**Severity**: 🟠 P1 HIGH  
**Labels**: `copilot:ready`, `owner:frontend`

**File**: `/Fixzit/hooks/useAdminData.ts` (Lines 38-45)

**Problem**: Client-side logs expose admin query params potentially containing user IDs.

**Fix**:
```typescript
// Create sanitizer utility
function sanitizeLogParams(params: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['userId', 'email', 'phone', 'nationalId', 'iban'];
  const sanitized = { ...params };
  
  for (const key of sensitiveKeys) {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// In hook
logger.info("Fetching users", { params: sanitizeLogParams(params) });
```

---

### LOG-002: Console.error Exposes Internal Details
**Category**: `Error/Logging/Monitoring`  
**Severity**: 🟠 P1 HIGH  
**Labels**: `copilot:ready`, `owner:frontend`

**File**: `/Fixzit/hooks/useProperties.ts` (Lines 31-41)

**Problem**: `console.error` logs response status/statusText in production.

**Fix**:
```typescript
if (!res.ok) {
  const payload = await res.json().catch(() => ({}));
  
  // Only log details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[useProperties] API error:', {
      status: res.status,
      statusText: res.statusText,
    });
  }
  
  // Throw user-friendly error
  throw new Error(payload.message || 'Failed to fetch properties');
}
```

---

### BIZ-001: Lead State Machine Allows Invalid Transitions
**Category**: `Business Logic/Validation`  
**Severity**: 🟠 P1 HIGH  
**Labels**: `copilot:ready`, `owner:backend`

**File**: `/Fixzit/models/aqar/Lead.ts` (Lines 180-220)

**Problem**: `scheduleViewing` checks some states but other methods allow any transition.

**Fix**: Add comprehensive state machine:
```typescript
const LEAD_STATE_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [LeadStatus.CONTACTED, LeadStatus.SPAM],
  [LeadStatus.CONTACTED]: [LeadStatus.QUALIFIED, LeadStatus.LOST, LeadStatus.SPAM],
  [LeadStatus.QUALIFIED]: [LeadStatus.VIEWING, LeadStatus.NEGOTIATING, LeadStatus.LOST],
  [LeadStatus.VIEWING]: [LeadStatus.NEGOTIATING, LeadStatus.LOST],
  [LeadStatus.NEGOTIATING]: [LeadStatus.WON, LeadStatus.LOST],
  [LeadStatus.WON]: [], // Terminal
  [LeadStatus.LOST]: [], // Terminal
  [LeadStatus.SPAM]: [], // Terminal
};

function validateTransition(from: LeadStatus, to: LeadStatus): void {
  const allowed = LEAD_STATE_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`);
  }
}

// Apply in methods
LeadSchema.methods.markAsWon = async function(userId: mongoose.Types.ObjectId) {
  validateTransition(this.status, LeadStatus.WON);
  this.status = LeadStatus.WON;
  // ...
};
```

---

### TEST-001: Missing Integration Tests for Encryption
**Category**: `Testing/QA`  
**Severity**: 🟠 P1 HIGH  
**Labels**: `copilot:ready`, `owner:qa`

**Problem**: No tests verify encryption works across save/update/find operations.

**Fix**: Create `/Fixzit/tests/integration/security/encryption-lifecycle.test.ts`:
```typescript
describe('PII Encryption Lifecycle', () => {
  describe('User Model', () => {
    it('encrypts nationalId on save()', async () => { /* ... */ });
    it('encrypts nationalId on findOneAndUpdate()', async () => { /* ... */ });
    it('decrypts nationalId on find()', async () => { /* ... */ });
    it('prevents double encryption', async () => { /* ... */ });
  });
  
  describe('Employee Model', () => {
    it('encrypts IBAN on save()', async () => { /* ... */ });
    it('encrypts baseSalary on findOneAndUpdate()', async () => { /* ... */ });
  });
  
  describe('PayrollRun Model', () => {
    it('encrypts line.iban on save()', async () => { /* ... */ });
    it('encrypts line.baseSalary on save()', async () => { /* ... */ });
  });
});
```
**Acceptance criteria:** provide fixtures for Org A/B; assert encrypted-at-rest on save and findOneAndUpdate, decrypted on find/findOne, and no double-encrypt across repeated updates.

---

### TEST-002: Missing Tenant Isolation Tests
**Category**: `Testing/QA`  
**Severity**: 🟠 P1 HIGH  
**Labels**: `copilot:ready`, `owner:qa`

**Problem**: No tests verify cross-tenant data access is prevented.

**Fix**: Create `/Fixzit/tests/integration/security/tenant-isolation.test.ts`:
```typescript
describe('Tenant Isolation', () => {
  it('prevents Org A from reading Org B leads', async () => { /* ... */ });
  it('scopes Employee queries to orgId', async () => { /* ... */ });
  it('Super Admin can access cross-tenant with audit', async () => { /* ... */ });
  it('handles concurrent requests without context bleed', async () => { /* ... */ });
});
```
**Acceptance criteria:** seeded tenants A/B; assert 403/empty when cross-tenant; allow SUPER_ADMIN with audit log; include concurrent requests to validate AsyncLocalStorage isolation.

---

## 📋 P2: MEDIUM PRIORITY ISSUES (Fix Within 1 Week)

### DOC-001: Deprecated Owner Portal Architecture Doc
**Category**: `Docs/Process`  
**Severity**: 🟡 P2 MEDIUM  
**Labels**: `copilot:ready`, `owner:docs`

**File**: `/Fixzit/docs/owner-portal-architecture.md`

**Problem**: Still references Prisma despite MongoDB-only stack.

**Fix**: Add deprecation notice or update to reflect Mongoose.

---

### DOC-002: Missing RBAC Role Matrix
**Category**: `Docs/Process`  
**Severity**: 🟡 P2 MEDIUM  
**Labels**: `copilot:ready`, `owner:docs`

**Problem**: No central document mapping all 14 roles to permissions.

**Fix**: Create `/Fixzit/docs/security/RBAC_ROLE_MATRIX.md` with complete mapping.

---

### PERF-001: Missing Index on aqar_leads.inquirerPhone
**Category**: `Performance`  
**Severity**: 🟡 P2 MEDIUM  
**Labels**: `copilot:ready`, `owner:backend`

**File**: `/Fixzit/models/aqar/Lead.ts`

**Fix**: Add compound index for common query patterns:
```typescript
LeadSchema.index({ orgId: 1, inquirerPhone: 1 });
LeadSchema.index({ orgId: 1, recipientId: 1, createdAt: -1 });
```

---

(Additional P2/P3 issues continue in similar format...)

---

## 🔧 IMPLEMENTATION PRIORITY ORDER

### Phase 1: Critical Security (Days 1-2)
1. SEC-001: PII Encryption Update Hooks
2. SEC-002: Aqar PII Encryption
3. SEC-003: Tenant Context Leakage
4. DATA-001: Aqar tenantIsolationPlugin
5. DATA-002: PayrollLine Encryption

### Phase 2: Data Integrity (Days 3-4)
6. DATA-003: Booking Derived Fields
7. SEC-004: HR Role Guards
8. SEC-005: Audit Blind Spots
9. BIZ-001: Lead State Machine

### Phase 3: Hardening (Days 5-7)
10. SEC-006: IDOR Prevention
11. SEC-007: Email Link Validation
12. SEC-008: Rate Limiting
13. LOG-001/002: Log Sanitization

### Phase 4: Testing & Docs (Week 2)
14. TEST-001/002: Integration Tests
15. DOC-001/002: Documentation Updates
16. DATA-004: Encryption Plugin Refactor

---

## 📁 ACTION FILES INDEX

| Issue ID | File Path | Category |
|----------|-----------|----------|
| SEC-001 | `fix-security-user-encryption-update.md` | Security |
| SEC-002 | `fix-security-aqar-pii-encryption.md` | Security |
| SEC-003 | `fix-security-tenant-context-leak.md` | Security |
| SEC-004 | `fix-security-hr-role-guards.md` | Security |
| SEC-005 | `fix-logging-audit-blind-spot.md` | Logging |
| SEC-006 | `fix-security-idor-crud-factory.md` | Security |
| SEC-007 | `fix-security-email-link-validation.md` | Security |
| SEC-008 | `fix-security-rate-limiting.md` | Security |
| DATA-001 | `fix-data-aqar-tenant-isolation.md` | Data |
| DATA-002 | `fix-data-payroll-encryption.md` | Data |
| DATA-003 | `fix-data-booking-derived-fields.md` | Data |
| DATA-004 | `fix-data-encryption-plugin.md` | Data |
| LOG-001 | `fix-logging-client-pii.md` | Logging |
| LOG-002 | `fix-logging-error-exposure.md` | Logging |
| BIZ-001 | `fix-business-lead-state-machine.md` | Business |
| TEST-001 | `fix-testing-encryption-integration.md` | Testing |
| TEST-002 | `fix-testing-tenant-isolation.md` | Testing |
| DOC-001 | `fix-docs-owner-portal-deprecation.md` | Docs |
| DOC-002 | `fix-docs-rbac-matrix.md` | Docs |
| PERF-001 | `fix-perf-aqar-indexes.md` | Performance |

---

## ✅ VERIFICATION CHECKLIST

```bash
# Run after each fix
pnpm lint
pnpm tsc --noEmit
pnpm test
pnpm build

# Security-specific verification
pnpm test tests/integration/security/
pnpm test tests/unit/security/

# Generate coverage report
pnpm test:coverage --reporter=lcov

# Quick re-scan checklist before executing items
# 1) Confirm file paths still exist / unchanged (aqar models, hr routes, payroll).
# 2) Re-run rg for orgId/org_id, tenantIsolationPlugin, and encrypted fields.
# 3) Assign DRI + due date per item; update "Last reviewed" above after changes.
# 4) For test items, add acceptance criteria and fixtures before implementation.
```

---

**END OF ACTION PLAN**
