/**
 * @fileoverview Search Entity Scoping - SEC-002
 * @description Role-based query scoping for tenant isolation and least-privilege access
 * @module api/search/_lib/scoping
 */

import { ObjectId } from "mongodb";
import { UserRole } from "@/types/user";
import type { SessionUser } from "@/server/middleware/withAuthRbac";
import type { SearchEntity } from "@/config/topbar-modules";
import { WORK_ORDERS_ENTITY } from "@/config/topbar-modules";
import { normalizeEntity, hasRole } from "./permissions";

export type ScopedQueryResult = { allowed: boolean; query: Record<string, unknown> };

// Convert string IDs to ObjectIds
const toObjectIds = (ids?: string[]) =>
  (ids || []).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

/**
 * Apply role-based scoping to search queries
 * Implements STRICT v4 least-privilege principle
 */
export function applyEntityScope(
  entity: SearchEntity,
  session: SessionUser,
  baseQuery: Record<string, unknown>,
): ScopedQueryResult {
  // Broad roles keep base org scoping - these roles see all org data
  // SEC-002: Aligned with ENTITY_PERMISSION_CONFIG allowedRoles
  const isSuperUser =
    session.isSuperAdmin ||
    hasRole(session, UserRole.SUPER_ADMIN) ||
    hasRole(session, UserRole.CORPORATE_ADMIN) ||
    hasRole(session, UserRole.CORPORATE_OWNER) ||
    hasRole(session, UserRole.ADMIN) ||
    hasRole(session, UserRole.MANAGER) ||
    hasRole(session, UserRole.FM_MANAGER) ||
    hasRole(session, UserRole.OPERATIONS_MANAGER) ||
    // TEAM_MEMBER and SUPPORT_AGENT are org-facing roles; they retain org-wide visibility for search
    hasRole(session, UserRole.TEAM_MEMBER) ||
    hasRole(session, UserRole.SUPPORT_AGENT);

  if (isSuperUser) {
    return { allowed: true, query: baseQuery };
  }

  const scopedQuery = { ...baseQuery };
  const scopedEntity = normalizeEntity(entity);

  switch (scopedEntity) {
    case WORK_ORDERS_ENTITY:
      return scopeWorkOrders(session, scopedQuery);
    case "properties":
      return scopeProperties(session, scopedQuery);
    case "units":
      return scopeUnits(session, scopedQuery);
    case "tenants":
      return { allowed: true, query: scopedQuery };
    case "vendors":
      return scopeVendors(session, scopedQuery);
    case "orders":
      return scopeOrders(session, scopedQuery);
    case "rfqs":
      return scopeRfqs(session, scopedQuery);
    case "products":
    case "services":
      return scopeProductsServices(session, scopedQuery);
    case "listings":
      return scopeListings(session, scopedQuery);
    case "projects":
      return scopeProjects(session, scopedQuery);
    case "agents":
      return { allowed: true, query: scopedQuery };
    default:
      return { allowed: true, query: scopedQuery };
  }
}

function scopeWorkOrders(
  session: SessionUser,
  scopedQuery: Record<string, unknown>,
): ScopedQueryResult {
  // Collect role-based conditions with OR semantics for multi-role users
  const roleConditions: Record<string, unknown>[] = [];

  if (hasRole(session, UserRole.TENANT) && ObjectId.isValid(session.id)) {
    roleConditions.push({ "requester.userId": new ObjectId(session.id) });
  }
  if (hasRole(session, UserRole.TECHNICIAN) && ObjectId.isValid(session.id)) {
    roleConditions.push({ "assignment.assignedTo.userId": new ObjectId(session.id) });
  }
  if (hasRole(session, UserRole.VENDOR) && session.vendorId && ObjectId.isValid(session.vendorId)) {
    roleConditions.push({ "assignment.assignedTo.vendorId": new ObjectId(session.vendorId) });
  }
  if (hasRole(session, UserRole.OWNER) && session.assignedProperties?.length) {
    roleConditions.push({ "location.propertyId": { $in: toObjectIds(session.assignedProperties) } });
  }
  if (hasRole(session, UserRole.PROPERTY_MANAGER) && session.assignedProperties?.length) {
    roleConditions.push({ "location.propertyId": { $in: toObjectIds(session.assignedProperties) } });
  }

  if (roleConditions.length === 0) {
    return { allowed: false, query: scopedQuery };
  }
  if (roleConditions.length === 1) {
    Object.assign(scopedQuery, roleConditions[0]);
  } else {
    scopedQuery.$or = roleConditions;
  }
  return { allowed: true, query: scopedQuery };
}

function scopeProperties(
  session: SessionUser,
  scopedQuery: Record<string, unknown>,
): ScopedQueryResult {
  // OR semantics: multi-role users see properties matching ANY role
  const roleConditions: Record<string, unknown>[] = [];
  if (hasRole(session, UserRole.OWNER) && session.assignedProperties?.length) {
    roleConditions.push({ _id: { $in: toObjectIds(session.assignedProperties) } });
  }
  if (hasRole(session, UserRole.PROPERTY_MANAGER) && session.assignedProperties?.length) {
    roleConditions.push({ _id: { $in: toObjectIds(session.assignedProperties) } });
  }
  if (hasRole(session, UserRole.TENANT) && session.units?.length) {
    roleConditions.push({ "units.unitId": { $in: toObjectIds(session.units) } });
  }
  if (roleConditions.length === 0) {
    return { allowed: false, query: scopedQuery };
  } else if (roleConditions.length === 1) {
    Object.assign(scopedQuery, roleConditions[0]);
  } else {
    scopedQuery.$or = roleConditions;
  }
  return { allowed: true, query: scopedQuery };
}

function scopeUnits(
  session: SessionUser,
  scopedQuery: Record<string, unknown>,
): ScopedQueryResult {
  // OR semantics: multi-role users see units matching ANY role
  const roleConditions: Record<string, unknown>[] = [];
  if (hasRole(session, UserRole.TENANT) && session.units?.length) {
    roleConditions.push({ _id: { $in: toObjectIds(session.units) } });
  }
  if (hasRole(session, UserRole.OWNER) && session.assignedProperties?.length) {
    roleConditions.push({ propertyId: { $in: toObjectIds(session.assignedProperties) } });
  }
  if (hasRole(session, UserRole.PROPERTY_MANAGER) && session.assignedProperties?.length) {
    roleConditions.push({ propertyId: { $in: toObjectIds(session.assignedProperties) } });
  }
  if (roleConditions.length === 0) {
    return { allowed: false, query: scopedQuery };
  } else if (roleConditions.length === 1) {
    Object.assign(scopedQuery, roleConditions[0]);
  } else {
    scopedQuery.$or = roleConditions;
  }
  return { allowed: true, query: scopedQuery };
}

function scopeVendors(
  session: SessionUser,
  scopedQuery: Record<string, unknown>,
): ScopedQueryResult {
  // SEC-002: VENDOR role scoped to own vendor record
  if (hasRole(session, UserRole.VENDOR)) {
    if (!session.vendorId || !ObjectId.isValid(session.vendorId)) {
      return { allowed: false, query: scopedQuery };
    }
    scopedQuery["_id"] = new ObjectId(session.vendorId);
  }
  // Other allowed roles (ADMIN, MANAGER, PROCUREMENT, etc.) see all vendors in org
  return { allowed: true, query: scopedQuery };
}

function scopeOrders(
  session: SessionUser,
  scopedQuery: Record<string, unknown>,
): ScopedQueryResult {
  // SEC-002: VENDOR sees only orders for their vendor
  if (hasRole(session, UserRole.VENDOR)) {
    if (!session.vendorId || !ObjectId.isValid(session.vendorId)) {
      return { allowed: false, query: scopedQuery };
    }
    scopedQuery["vendorId"] = new ObjectId(session.vendorId);
  }
  // Other allowed roles see all orders in org
  return { allowed: true, query: scopedQuery };
}

function scopeRfqs(
  session: SessionUser,
  scopedQuery: Record<string, unknown>,
): ScopedQueryResult {
  // SEC-002: VENDOR sees only RFQs they're invited to
  if (hasRole(session, UserRole.VENDOR)) {
    if (!session.vendorId || !ObjectId.isValid(session.vendorId)) {
      return { allowed: false, query: scopedQuery };
    }
    scopedQuery["invitedVendors.vendorId"] = new ObjectId(session.vendorId);
  }
  // Other allowed roles see all RFQs in org
  return { allowed: true, query: scopedQuery };
}

function scopeProductsServices(
  session: SessionUser,
  scopedQuery: Record<string, unknown>,
): ScopedQueryResult {
  // SEC-002: VENDOR sees only their own products/services
  if (hasRole(session, UserRole.VENDOR)) {
    if (!session.vendorId || !ObjectId.isValid(session.vendorId)) {
      return { allowed: false, query: scopedQuery };
    }
    scopedQuery["vendorId"] = new ObjectId(session.vendorId);
  }
  // Other allowed roles see all products/services in org
  return { allowed: true, query: scopedQuery };
}

function scopeListings(
  session: SessionUser,
  scopedQuery: Record<string, unknown>,
): ScopedQueryResult {
  // SEC-002: OWNER sees only their own listings (by listerId or propertyId)
  // VENDOR role is also in allowedRoles for listings, they see all in org
  if (hasRole(session, UserRole.OWNER)) {
    const roleConditions: Record<string, unknown>[] = [];
    // Owner can see listings they created (listerId matches their user ID)
    if (ObjectId.isValid(session.id)) {
      roleConditions.push({ listerId: new ObjectId(session.id) });
    }
    // Or listings for properties they own
    if (session.assignedProperties?.length) {
      roleConditions.push({ propertyId: { $in: toObjectIds(session.assignedProperties) } });
    }
    if (roleConditions.length === 0) {
      return { allowed: false, query: scopedQuery };
    }
    if (roleConditions.length === 1) {
      Object.assign(scopedQuery, roleConditions[0]);
    } else {
      scopedQuery.$or = roleConditions;
    }
  }
  // Other allowed roles (ADMIN, MANAGER, PROPERTY_MANAGER, VENDOR) see all listings in org
  return { allowed: true, query: scopedQuery };
}

function scopeProjects(
  session: SessionUser,
  scopedQuery: Record<string, unknown>,
): ScopedQueryResult {
  // SEC-002: OWNER sees only projects for their properties
  if (hasRole(session, UserRole.OWNER)) {
    if (!session.assignedProperties?.length) {
      return { allowed: false, query: scopedQuery };
    }
    scopedQuery["propertyId"] = { $in: toObjectIds(session.assignedProperties) };
  }
  // Other allowed roles see all projects in org
  return { allowed: true, query: scopedQuery };
}
