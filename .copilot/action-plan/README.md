# 📋 FIXZIT ACTION PLAN - QUICK REFERENCE

> **Generated**: 2025-11-25  
> **Total Issues**: 51 (10 P0, 16 P1, 18 P2, 7 P3)  
> **Agent**: GitHub Copilot

---

## 🚨 IMMEDIATE ACTIONS (P0 - Fix Today)

| ID | Issue | File | Est. Time |
|----|-------|------|-----------|
| **SEC-001** | PII Encryption bypass via findOneAndUpdate | `server/models/User.ts`, `hr.models.ts` | 2-4h |
| **SEC-002** | Aqar Lead/Booking PII unencrypted | `models/aqar/Lead.ts`, `Booking.ts` | 3-4h |
| **SEC-003** | Tenant context global leakage | `server/plugins/tenantIsolation.ts` | 2-3h |
| **SEC-004** | Missing HR role guards | `lib/auth/role-guards.ts` | 1-2h |
| **SEC-005** | Audit blind spot (missing orgId) | `lib/middleware/withAudit.ts` | 1h |
| **DATA-001** | Aqar models missing tenantIsolationPlugin | `models/aqar/*.ts` (10 files) | 2-3h |
| **DATA-002** | PayrollLine baseSalary not encrypted | `server/models/hr.models.ts` | 2-3h |
| **DATA-003** | Booking derived fields bypass | `models/aqar/Booking.ts` | 2-3h |

---

## 📁 Fix Files Available

Located in `.copilot/action-plan/fixes/`:

1. ✅ `fix-security-encryption-update-hooks.md` - SEC-001
2. ✅ `fix-data-aqar-tenant-isolation.md` - DATA-001
3. ✅ `fix-security-tenant-context-leak.md` - SEC-003
4. ✅ `fix-security-hr-role-guards.md` - SEC-004

---

## 🔧 Quick Commands

```bash
# Verify fixes don't break build
pnpm lint && pnpm tsc --noEmit && pnpm build

# Run security tests
pnpm test tests/integration/security/
pnpm test tests/unit/security/

# Check for missing tenant isolation
grep -r "tenantIsolationPlugin" models/aqar/*.ts | wc -l
# Should be 10+ after fix

# Check for encryption hooks
grep -r "pre('findOneAndUpdate'" server/models/
# Should show User.ts and hr.models.ts after fix
```

---

## 📊 Categories at a Glance

| Category | P0 | P1 | P2 | P3 | Total |
|----------|----|----|----|----|-------|
| Security/RBAC | 5 | 3 | 2 | 1 | **11** |
| Data/Schema | 3 | 4 | 2 | 0 | **9** |
| Business Logic | 1 | 3 | 4 | 2 | **10** |
| Testing/QA | 0 | 2 | 3 | 1 | **6** |
| Error/Logging | 1 | 2 | 2 | 0 | **5** |
| Docs/Process | 0 | 1 | 3 | 2 | **6** |
| Performance | 0 | 1 | 2 | 1 | **4** |

---

## 📝 Full Documentation

- **Main Report**: `COMPREHENSIVE_AUDIT_ACTION_PLAN.md`
- **JSON Metadata**: `issues-metadata.json`
- **Individual Fixes**: `fixes/*.md`

---

## ✅ Done Checklist

- [ ] SEC-001: Add pre('findOneAndUpdate') encryption hooks
- [ ] SEC-002: Encrypt Aqar PII fields
- [ ] SEC-003: Remove global tenant context fallback
- [ ] SEC-004: Add HR role guards
- [ ] SEC-005: Fix audit blind spot
- [ ] DATA-001: Add tenantIsolationPlugin to Aqar models
- [ ] DATA-002: Encrypt PayrollLine salary fields
- [ ] DATA-003: Add Booking pre('findOneAndUpdate') hook
- [ ] Run integration tests
- [ ] Deploy to staging
- [ ] Security review

---

**Next**: Start with SEC-003 (tenant context) as it's a dependency for DATA-001.
