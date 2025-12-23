/**
 * @fileoverview Search RBAC Configuration - SEC-002
 * @description Permission configuration and role-based access control for search entities
 * @module api/search/_lib/permissions
 */

import { logger } from "@/lib/logger";
import { UserRole, type UserRoleType } from "@/types/user";
import type { SessionUser } from "@/server/middleware/withAuthRbac";
import type { SearchEntity } from "@/config/topbar-modules";
import {
  WORK_ORDERS_ENTITY,
  WORK_ORDERS_ENTITY_LEGACY,
} from "@/config/topbar-modules";

// ============================================================================
// SEARCH RBAC CONFIGURATION - SEC-002
// ============================================================================
// Use canonical "module:action" permission keys (Permission model format).
// Wildcards:
//   - "*" grants all
//   - "<module>:*" grants all actions within a module
// ============================================================================

export type EntityPermissionConfig = {
  permission: string; // canonical module:action
  allowedRoles: readonly UserRoleType[];
};

// Extended type to include legacy alias for backward compatibility
export type ExtendedSearchEntity = SearchEntity | typeof WORK_ORDERS_ENTITY_LEGACY;

export const ENTITY_PERMISSION_CONFIG: Record<ExtendedSearchEntity, EntityPermissionConfig> = {
  workOrders: {
    permission: "workorders:read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.FM_MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.TEAM_MEMBER,
      UserRole.TECHNICIAN,
      UserRole.VENDOR,
      UserRole.OWNER,
      UserRole.TENANT,
      UserRole.SUPPORT_AGENT,
    ],
  },
  [WORK_ORDERS_ENTITY_LEGACY]: {
    permission: "workorders:read", // legacy alias for backwards compatibility
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.FM_MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.TEAM_MEMBER,
      UserRole.TECHNICIAN,
      UserRole.VENDOR,
      UserRole.OWNER,
      UserRole.TENANT,
      UserRole.SUPPORT_AGENT,
    ],
  },
  properties: {
    permission: "properties:read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.FM_MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.TEAM_MEMBER,
      UserRole.OWNER,
      UserRole.TENANT,
    ],
  },
  units: {
    permission: "properties:read", // units belong to properties
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.FM_MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.TEAM_MEMBER,
      UserRole.OWNER,
      UserRole.TENANT,
    ],
  },
  tenants: {
    permission: "tenants:read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.FM_MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.SUPPORT_AGENT,
      UserRole.HR,
      UserRole.HR_OFFICER,
    ],
  },
  vendors: {
    permission: "vendors:read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.FM_MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.PROCUREMENT,
      UserRole.FINANCE,
      UserRole.FINANCE_OFFICER,
      UserRole.VENDOR,
    ],
  },
  invoices: {
    permission: "finance:invoice.read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.FINANCE,
      UserRole.FINANCE_OFFICER,
      UserRole.PROCUREMENT,
      UserRole.AUDITOR,
    ],
  },
  products: {
    permission: "souq:products.read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.PROCUREMENT,
      UserRole.FINANCE,
      UserRole.FINANCE_OFFICER,
      UserRole.FM_MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.VENDOR,
    ],
  },
  services: {
    permission: "souq:services.read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.PROCUREMENT,
      UserRole.FINANCE,
      UserRole.FINANCE_OFFICER,
      UserRole.FM_MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.VENDOR,
    ],
  },
  rfqs: {
    permission: "souq:rfq.read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.PROCUREMENT,
      UserRole.FINANCE,
      UserRole.FINANCE_OFFICER,
      UserRole.FM_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.VENDOR,
    ],
  },
  orders: {
    permission: "souq:orders.read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.PROCUREMENT,
      UserRole.FINANCE,
      UserRole.FINANCE_OFFICER,
      UserRole.VENDOR,
    ],
  },
  listings: {
    permission: "aqar:listings.read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.FM_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.OWNER,
      UserRole.VENDOR,
    ],
  },
  projects: {
    permission: "aqar:projects.read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.FM_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.OWNER,
    ],
  },
  agents: {
    permission: "aqar:agents.read",
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.CORPORATE_ADMIN,
      UserRole.CORPORATE_OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.PROPERTY_MANAGER,
      UserRole.FM_MANAGER,
      UserRole.OPERATIONS_MANAGER,
      UserRole.OWNER,
      UserRole.SUPPORT_AGENT,
    ],
  },
};

// Normalize legacy entity names to canonical form
export const normalizeEntity = (entity: string): SearchEntity =>
  entity === WORK_ORDERS_ENTITY_LEGACY ? WORK_ORDERS_ENTITY : (entity as SearchEntity);

// Check if session has a specific permission
export const hasPermissionKey = (session: SessionUser, permission: string): boolean => {
  if (session.isSuperAdmin) return true;
  const normalizedPermission = permission.toLowerCase();
  const moduleKey = normalizedPermission.split(":")[0];
  const permissions = (session.permissions || []).map((p) => String(p).toLowerCase());

  if (permissions.includes("*")) return true;
  if (moduleKey && permissions.includes(`${moduleKey}:*`)) return true;
  return permissions.includes(normalizedPermission);
};

// Check if session has a specific role
export const hasRole = (session: SessionUser, role: UserRoleType): boolean => {
  if (!role) return false;
  const target = role.toUpperCase();
  const primary = session.role?.toUpperCase();
  if (primary === target) return true;
  return (session.roles || []).some((r) => String(r).toUpperCase() === target);
};

// Evaluate whether the requester can search a given entity
export function canSearchEntity(session: SessionUser, entity: SearchEntity): boolean {
  const normalizedEntity = normalizeEntity(entity);
  if (session.isSuperAdmin) return true;

  const config = ENTITY_PERMISSION_CONFIG[normalizedEntity];
  if (!config) {
    logger.warn("[search] Unknown entity requested", { entity: normalizedEntity });
    return false;
  }

  if (hasPermissionKey(session, config.permission)) {
    return true;
  }

  return config.allowedRoles.some((role) => hasRole(session, role));
}
