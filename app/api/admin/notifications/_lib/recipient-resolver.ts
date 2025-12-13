/**
 * @fileoverview Notification Recipient Resolver
 * @description Resolves recipient queries based on type (users, tenants, corporate, all)
 * @module api/admin/notifications/_lib/recipient-resolver
 */

import { ObjectId, type Document, type Filter, type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/db/collections";
import { logger } from "@/lib/logger";

export interface NotificationContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface RecipientQuery {
  type: "users" | "tenants" | "corporate" | "all";
  ids?: string[];
}

/**
 * Build a query filter from recipient IDs
 * Returns null if IDs are provided but none are valid
 */
export function buildRecipientQuery(ids?: string[]): Filter<Document> | null {
  if (!ids?.length) {
    return {};
  }

  const objectIds = ids
    .map((id) => {
      try {
        return new ObjectId(id);
      } catch (error) {
        logger.warn("[Admin Notification] Invalid recipient id provided", {
          id,
          error,
        });
        return null;
      }
    })
    .filter((value): value is ObjectId => value !== null);

  if (!objectIds.length) {
    return null;
  }

  return { _id: { $in: objectIds } };
}

/**
 * Resolve users as notification recipients
 */
export async function resolveUserRecipients(
  db: Db,
  orgId: ObjectId,
  ids?: string[],
): Promise<{ contacts: NotificationContact[]; error?: string }> {
  const query = buildRecipientQuery(ids);
  if (ids?.length && query === null) {
    return { contacts: [], error: "Invalid user recipient IDs" };
  }

  // SECURITY: Always scope to orgId to prevent cross-tenant exposure
  const users = await db
    .collection(COLLECTIONS.USERS)
    .find({
      orgId,
      ...(query ?? {}),
    })
    .toArray();

  return {
    contacts: users.map((u) => ({
      id: u._id.toString(),
      name: u.name || u.email,
      email: u.email,
      phone: u.phone,
    })),
  };
}

/**
 * Resolve tenants as notification recipients
 */
export async function resolveTenantRecipients(
  db: Db,
  orgId: ObjectId,
  ids?: string[],
): Promise<{ contacts: NotificationContact[]; error?: string }> {
  const query = buildRecipientQuery(ids);
  if (ids?.length && query === null) {
    return { contacts: [], error: "Invalid tenant recipient IDs" };
  }

  // SECURITY: Always scope to orgId to prevent cross-tenant exposure
  const tenants = await db
    .collection(COLLECTIONS.TENANTS)
    .find({
      orgId,
      ...(query ?? {}),
    })
    .toArray();

  return {
    contacts: tenants.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      email: t.email || t.contactEmail,
      phone: t.phone || t.contactPhone,
    })),
  };
}

/**
 * Resolve corporate organizations as notification recipients
 */
export async function resolveCorporateRecipients(
  db: Db,
  orgId: ObjectId,
  isSuperAdmin: boolean,
  ids?: string[],
): Promise<{ contacts: NotificationContact[]; error?: string }> {
  const query = buildRecipientQuery(ids);
  if (ids?.length && query === null) {
    return { contacts: [], error: "Invalid corporate recipient IDs" };
  }

  const corps = await db
    .collection(COLLECTIONS.ORGANIZATIONS)
    .find(query ?? (!isSuperAdmin ? { _id: orgId } : {}))
    .toArray();

  return {
    contacts: corps.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      email: c.contactEmail,
      phone: c.contactPhone,
    })),
  };
}

/**
 * Resolve all users in organization as notification recipients
 */
export async function resolveAllRecipients(
  db: Db,
  orgId: ObjectId,
  isSuperAdmin: boolean,
): Promise<{ contacts: NotificationContact[] }> {
  // Fetch all users; non-super-admins are scoped to their org
  const users = await db
    .collection(COLLECTIONS.USERS)
    .find(!isSuperAdmin ? { orgId } : {})
    .toArray();

  return {
    contacts: users.map((u) => ({
      id: u._id.toString(),
      name: u.name || u.email,
      email: u.email,
      phone: u.phone,
    })),
  };
}

/**
 * Main resolver - dispatches to appropriate handler based on recipient type
 */
export async function resolveRecipients(
  db: Db,
  orgId: ObjectId,
  recipients: RecipientQuery,
  isSuperAdmin: boolean,
): Promise<{ contacts: NotificationContact[]; error?: string }> {
  switch (recipients.type) {
    case "users":
      return resolveUserRecipients(db, orgId, recipients.ids);
    case "tenants":
      return resolveTenantRecipients(db, orgId, recipients.ids);
    case "corporate":
      return resolveCorporateRecipients(db, orgId, isSuperAdmin, recipients.ids);
    case "all":
      return resolveAllRecipients(db, orgId, isSuperAdmin);
    default:
      return { contacts: [], error: "Invalid recipient type" };
  }
}
