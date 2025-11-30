# RBAC Parity Tooling Guide

This document explains the RBAC drift detection and prevention tooling in Fixzit.

## Overview

Fixzit uses a **three-file RBAC architecture** that must stay synchronized:

| File | Purpose | Environment |
|------|---------|-------------|
| `domain/fm/fm.behavior.ts` | **Server** - Canonical RBAC source | Server-side only (has Mongoose) |
| `domain/fm/fm.types.ts` | **Client/Shared** - Types and client-safe RBAC | Both server and client |
| `domain/fm/fm-lite.ts` | **Client Façade** - Lightweight re-exports | Client-side only |

**Why three files?** The server file contains Mongoose schemas which can't be imported in client components. The types file provides client-safe RBAC functions. The lite file is a minimal façade for UI components.

## Tooling Commands

### 1. Static Parity Lint (`lint:rbac`)

```bash
pnpm lint:rbac
```

**What it checks** (7 dimensions):
1. `ROLE_MODULE_ACCESS` - Role → Module access maps match (server vs client)
2. `ROLE_ACTIONS` - Role → Submodule → Actions match (server vs client)
3. `SUB_ROLE_ACTIONS` - Sub-role action grants match (server vs client)
4. `SUBMODULE_REQUIRED_SUBROLE` - Submodule restrictions match (server vs client)
5. `PLAN_GATES` - Plan tier feature gates match (server vs client)
6. `computeAllowedModules` - Union behavior matches (server vs client vs lite)
7. `ROLE_MODULES` - Lite façade modules match server `ROLE_MODULE_ACCESS`

**When to run:**
- Automatically runs in CI via `lint:ci`
- Run locally before committing RBAC changes
- Run after modifying any of the three RBAC files

**Script location:** `scripts/lint-rbac-parity.ts`

### 2. Parity Test Suite (`rbac:parity`)

```bash
pnpm rbac:parity
```

**What it tests** (66 tests across 11 categories):
- Static data structure parity (5 tests)
- `can()` behavioral parity across roles (7 tests)
- Sub-role enforcement (7 tests)
- Plan gate enforcement (4 tests)
- Tenant create/unit scoping (5 tests)
- Property scoping (CORPORATE_OWNER, PROPERTY_MANAGER) (7 tests)
- `computeAllowedModules` union behavior (6 tests)
- Tenant requester fallback (2 tests)
- Technician assignment parity (4 tests)
- Cross-role sub-role boundaries (4 tests)
- Plan downgrade scenarios (5 tests)
- Org membership edge cases (3 tests)
- Vendor role parity (7 tests)

**When to run:**
- After modifying `can()` function logic
- After changing property/tenant scoping rules
- After modifying sub-role enforcement logic

**Test file:** `tests/domain/fm.can-parity.test.ts`

### 3. Client Roles Generation Check (`rbac:client:check`)

```bash
pnpm rbac:client:check
```

**What it does:**
- Verifies that `lib/rbac/client-roles.ts` correctly re-exports from `fm-lite.ts`
- Ensures the client-safe façade is up to date

**Script location:** `scripts/rbac/generate-client-roles.ts`

## CI Integration

The `lint:ci` script runs static RBAC checks:

```json
"lint:ci": "npm run lint:prod && npm run rbac:client:check && npm run lint:rbac && npm run typecheck"
```

This ensures **static** RBAC drift is caught before merge.

**Note:** The behavioral parity tests (`rbac:parity`) are not included in `lint:ci` to keep CI fast. Run `pnpm rbac:parity` locally when modifying `can()` logic or scoping rules. Consider adding it to CI if behavioral drift becomes a concern.

## Adding New Roles/Modules/Sub-roles

### Adding a New Role

1. **Add to `fm.behavior.ts`:**
   ```typescript
   export enum Role {
     // ... existing roles
     NEW_ROLE = "NEW_ROLE",
   }
   ```

2. **Add to `ROLE_MODULE_ACCESS`** in both `fm.behavior.ts` AND `fm.types.ts`:
   ```typescript
   [Role.NEW_ROLE]: {
     DASHBOARD: true,
     WORK_ORDERS: true,
     // ... define module access
   },
   ```

3. **Add to `ROLE_ACTIONS`** in both files:
   ```typescript
   [Role.NEW_ROLE]: {
     WO_CREATE: ["view", "create"],
     // ... define submodule actions
   },
   ```

4. **Add to `ROLE_MODULES`** in `fm-lite.ts`:
   ```typescript
   [Role.NEW_ROLE]: [
     ModuleKey.DASHBOARD,
     ModuleKey.WORK_ORDERS,
     // ... list allowed modules
   ],
   ```

5. **Run parity checks:**
   ```bash
   pnpm lint:rbac && pnpm rbac:parity
   ```

### Adding a New Sub-role

1. **Add to `SubRole` enum** in `fm.behavior.ts`:
   ```typescript
   export enum SubRole {
     // ... existing sub-roles
     NEW_SPECIALIST = "NEW_SPECIALIST",
   }
   ```

2. **Add to `SUB_ROLE_ACTIONS`** in both `fm.behavior.ts` AND `fm.types.ts`:
   ```typescript
   [SubRole.NEW_SPECIALIST]: {
     SOME_SUBMODULE: ["view", "create", "update"],
   },
   ```

3. **If submodule requires this sub-role**, add to `SUBMODULE_REQUIRED_SUBROLE` in both files:
   ```typescript
   SOME_SUBMODULE: [SubRole.NEW_SPECIALIST],
   ```

4. **Add module access for sub-role** in `fm-lite.ts` `ROLE_MODULES`:
   ```typescript
   [SubRole.NEW_SPECIALIST]: [
     ModuleKey.DASHBOARD,
     ModuleKey.SOME_MODULE,
   ],
   ```

5. **Verify `computeAllowedModules` union behavior:**
   - TEAM_MEMBER + NEW_SPECIALIST should get TEAM_MEMBER base modules PLUS NEW_SPECIALIST modules
   - Test with `pnpm rbac:parity`

### Adding a New Module

1. **Add to `ModuleKey` enum** in all three files
2. **Update `ROLE_MODULE_ACCESS`** for each role that should access it
3. **Update `ROLE_MODULES`** in `fm-lite.ts`
4. **Add submodules** to `SubmoduleKey` if needed
5. **Update `PLAN_GATES`** to define which plans unlock the module's submodules

### Adding a New Submodule

1. **Add to `SubmoduleKey` enum** in all three files
2. **Update `PLAN_GATES`** in both `fm.behavior.ts` AND `fm.types.ts`
3. **Update `ROLE_ACTIONS`** for roles that should have access
4. **If sub-role restricted**, update `SUBMODULE_REQUIRED_SUBROLE`

## Common Parity Errors

### "PLAN_GATES mismatch"

**Cause:** Server and client have different values for a plan/submodule combination.

**Fix:** Ensure `PLAN_GATES` in `fm.types.ts` exactly matches `fm.behavior.ts`. Server is canonical.

### "computeAllowedModules mismatch"

**Cause:** The module union logic differs between files.

**Fix:** Ensure all three files use the same pattern:
```typescript
return [...new Set([...baseModules, ...subRoleModules])];
```

### "ROLE_MODULES vs ROLE_MODULE_ACCESS mismatch"

**Cause:** `fm-lite.ts` `ROLE_MODULES` array doesn't match the modules where `ROLE_MODULE_ACCESS[role][module] === true`.

**Fix:** Update `ROLE_MODULES` in `fm-lite.ts` to include exactly the modules that are `true` in the server's `ROLE_MODULE_ACCESS`.

## Architecture Decisions

### Why Server is Canonical

The server (`fm.behavior.ts`) is the **single source of truth** because:
1. It enforces actual authorization (API routes check against server RBAC)
2. It contains Mongoose schemas with tenant scoping
3. Client RBAC is for **UI visibility only** - never trust client for security

### Why Union for Sub-roles

Sub-roles **extend** base role permissions, they don't replace them:
```typescript
// TEAM_MEMBER + FINANCE_OFFICER gets:
// - All TEAM_MEMBER modules (Dashboard, Work Orders, CRM, Support, Reports)
// - PLUS Finance module from FINANCE_OFFICER
```

This is intentional - a Finance Officer should still see Work Orders, not lose access to core features.

### Why Three Files

| Concern | Solution |
|---------|----------|
| Mongoose can't run in browser | Server file has schemas, others don't |
| Client needs RBAC for UI | Types file provides client-safe functions |
| Bundle size | Lite file is minimal re-exports only |
| Type safety | All files share the same enums/types |

## Related Files

- `app/api/fm/permissions.ts` - API authorization wrapper using `computeAllowedModules`
- `lib/rbac/client-roles.ts` - Client-safe re-exports from `fm-lite.ts`
- `components/admin/SubRoleSelector.tsx` - UI component using `computeAllowedModules`
- `hooks/useFMPermissions.ts` - React hook for permission checks

## Issues Register

RBAC drift issues are tracked in `docs/ISSUES_REGISTER.md`:
- RBAC-DRIFT-006: computeAllowedModules Override Instead of Union
- RBAC-DRIFT-007: Tenant Requester Fallback Missing
- RBAC-DRIFT-008: hasModuleAccess Incomplete Sub-Role Handling
- RBAC-DRIFT-009: fm-lite ROLE_MODULES Drift
- RBAC-DRIFT-010: PLAN_GATES Server/Client Mismatch

All resolved as of November 2025.
