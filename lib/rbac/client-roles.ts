/**
 * Client-safe RBAC definitions.
 *
 * SINGLE SOURCE OF TRUTH: domain/fm/fm-lite.ts
 *
 * This file re-exports from fm-lite to ensure client/server RBAC consistency.
 * Do NOT define RBAC matrices here - all definitions come from fm-lite.
 *
 * @see domain/fm/fm-lite.ts for canonical RBAC definitions
 */

// Re-export all RBAC types and constants from the canonical source
export {
  Role,
  SubRole,
  Plan,
  ModuleKey,
  SubmoduleKey,
  PLAN_GATES,
  ROLE_MODULES,
  normalizeRole,
  normalizeSubRole,
  computeAllowedModules,
  inferSubRoleFromRole,
  type Action,
} from "@/domain/fm/fm-lite";
