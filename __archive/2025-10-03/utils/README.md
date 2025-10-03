# Archived: utils/rbac.ts

**Date Archived**: October 3, 2025
**Reason**: Duplicate - merged into lib/rbac.ts

## What was merged:
- ROLES constant with display names
- MODULES array
- ROLE_MODULES mapping
- filterModulesByRole() helper function

## Canonical Location:
All RBAC functionality is now in: `lib/rbac.ts`

## Changes Made:
- Combined both implementations
- Added TypeScript types (Role, ModuleId)
- Consolidated all role definitions
- Added hasModuleAccess() helper function
- Maintained backward compatibility

## Migration:
All imports should use: `import { ... } from '@/lib/rbac'`
