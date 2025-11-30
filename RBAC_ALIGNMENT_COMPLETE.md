# RBAC Role Enum Alignment - STRICT v4.1 Complete

## Summary

All Role enum definitions have been aligned to the STRICT v4.1 canonical matrix. The single source of truth is now `domain/fm/fm.behavior.ts`.

## Canonical Roles (9)

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Platform operator, cross-org access |
| `ADMIN` | Tenant admin, org-scoped full access |
| `CORPORATE_OWNER` | Portfolio owner |
| `TEAM_MEMBER` | Corporate staff (requires SubRole) |
| `TECHNICIAN` | Field worker |
| `PROPERTY_MANAGER` | Manages subset of properties |
| `TENANT` | End-user |
| `VENDOR` | External service provider |
| `GUEST` | Public visitor |

## Sub-Roles (4) - TEAM_MEMBER Specializations

| SubRole | Description |
|---------|-------------|
| `FINANCE_OFFICER` | Finance module only + reports |
| `HR_OFFICER` | HR module + PII access + reports |
| `SUPPORT_AGENT` | Support + CRM + reports |
| `OPERATIONS_MANAGER` | Wider scope: WO + Properties + Support |

## Legacy Role Mapping

| Legacy Role | Canonical Role |
|-------------|----------------|
| `CORPORATE_ADMIN` | `ADMIN` |
| `PROPERTY_OWNER` | `CORPORATE_OWNER` |
| `OWNER` | `CORPORATE_OWNER` |
| `MANAGEMENT` | `TEAM_MEMBER` |
| `FINANCE` | `TEAM_MEMBER` + SubRole.FINANCE_OFFICER |
| `HR` | `TEAM_MEMBER` + SubRole.HR_OFFICER |
| `EMPLOYEE` | `TEAM_MEMBER` |
| `FM_MANAGER` | `PROPERTY_MANAGER` |
| `OWNER_DEPUTY` | `PROPERTY_MANAGER` |
| `CUSTOMER` | `TENANT` |
| `AUDITOR` | `GUEST` |
| `VIEWER` | `GUEST` |

## Files Updated

### Core Type Definitions
- ✅ `domain/fm/fm.behavior.ts` - Canonical Role enum source, NOTIFY section updated
- ✅ `types/user.ts` - Added normalizeRole helper, deprecation comments
- ✅ `types/fm/enums.ts` - Aligned FMRole with canonical Role, re-exports
- ✅ `src/types/copilot.ts` - Imports canonical Role/SubRole, LegacyRole type

### Validators
- ✅ `modules/users/validator.ts` - Updated roleEnum with canonical + legacy support, added subRole field

### Audit Scripts
- ✅ `scripts/fixzit-unified-audit-system.js` - Added STRICT v4.1 mapping comments
- ✅ `scripts/unified-audit-system.js` - Added STRICT v4.1 mapping comments
- ✅ `scripts/qa/halt-fix-verify.mjs` - Added canonical roles to test matrix

### Lint Fixes
- ✅ `app/help/[slug]/page.tsx` - Fixed any type to Partial<Article>
- ✅ `app/page.tsx` - Use next/link Link component

## Usage Guidelines

### For New Code
```typescript
import { Role, SubRole } from "@/domain/fm/fm.behavior";

// Check role access
if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
  // Admin access
}

// Team member with sub-role
if (user.role === Role.TEAM_MEMBER && user.subRole === SubRole.FINANCE_OFFICER) {
  // Finance officer access
}
```

### For Legacy Code Migration
```typescript
import { normalizeRole } from "@/types/user";

const canonicalRole = normalizeRole(legacyRoleString);
```

## Verification
- ✅ TypeScript compilation passes
- ✅ ESLint checks pass
- ✅ All changes committed and pushed

## Commit
- **Hash**: 90f98804f
- **Branch**: main
- **Date**: $(date)
