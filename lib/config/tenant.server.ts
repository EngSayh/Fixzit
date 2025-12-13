/**
 * Server-only tenant configuration loader
 *
 * This module contains MongoDB-dependent tenant loading logic
 * and should ONLY be imported in server-side code (API routes, server actions, etc.)
 *
 * @module lib/config/tenant.server
 */

import "server-only";

import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { ObjectId } from "mongodb";
import type { TenantConfig } from "./tenant";
import { DEFAULT_TENANT_CONFIG, tenantCache } from "./tenant";

const pendingTenantFetches = new Map<string, Promise<void>>();

/**
 * Load tenant configuration from database (server-only)
 *
 * @param orgId - Organization ID
 * @returns Promise that resolves when tenant is cached
 */
export async function loadTenantConfigFromDatabase(orgId: string): Promise<void> {
  if (pendingTenantFetches.has(orgId)) {
    return pendingTenantFetches.get(orgId) as Promise<void>;
  }

  const fetchPromise = (async () => {
    try {
      const db = await getDatabase();
      const normalizedOrgId = ObjectId.isValid(orgId) ? new ObjectId(orgId) : null;

      // Build filter ensuring _id is always ObjectId or not included
      const orgIdFilter: Record<string, unknown> = normalizedOrgId
        ? { $or: [{ orgId }, { _id: normalizedOrgId }] }
        : { orgId };

      const organization =
        (await db.collection(COLLECTIONS.ORGANIZATIONS).findOne(orgIdFilter)) ||
        (await db.collection(COLLECTIONS.TENANTS).findOne(orgIdFilter));

      if (!organization) {
        return;
      }

      const config: TenantConfig = {
        ...DEFAULT_TENANT_CONFIG,
        orgId,
        name: organization.name || DEFAULT_TENANT_CONFIG.name,
        domain: organization.domain || organization.website || DEFAULT_TENANT_CONFIG.domain,
        supportEmail:
          organization.contact?.primary?.email || DEFAULT_TENANT_CONFIG.supportEmail,
        supportPhone:
          organization.contact?.primary?.phone || DEFAULT_TENANT_CONFIG.supportPhone,
        currency:
          organization.settings?.currency ||
          organization.subscription?.price?.currency ||
          DEFAULT_TENANT_CONFIG.currency,
        timezone: organization.settings?.timezone || DEFAULT_TENANT_CONFIG.timezone,
        branding: {
          ...DEFAULT_TENANT_CONFIG.branding,
          ...(organization.branding || {}),
          logoUrl:
            organization.branding?.logo ||
            organization.logo ||
            DEFAULT_TENANT_CONFIG.branding.logoUrl,
        },
        features: {
          ...DEFAULT_TENANT_CONFIG.features,
          multiLanguage:
            organization.settings?.locale != null
              ? true
              : DEFAULT_TENANT_CONFIG.features.multiLanguage,
          smsNotifications:
            organization.settings?.notifications?.sms ??
            DEFAULT_TENANT_CONFIG.features.smsNotifications,
          emailNotifications:
            organization.settings?.notifications?.email ??
            DEFAULT_TENANT_CONFIG.features.emailNotifications,
          mfaRequired:
            organization.settings?.security?.mfaRequired ??
            DEFAULT_TENANT_CONFIG.features.mfaRequired,
        },
      };

      tenantCache.set(orgId, config);
    } catch (error) {
      // Fail silently and keep default config; GraphQL/REST callers will still receive defaults
      void error;
    } finally {
      pendingTenantFetches.delete(orgId);
    }
  })();

  pendingTenantFetches.set(orgId, fetchPromise);
  await fetchPromise;
}

/**
 * Get tenant configuration from database (server-only, async)
 *
 * @param orgId - Organization ID
 * @returns Tenant configuration
 */
export async function getTenantConfigAsync(orgId?: string): Promise<TenantConfig> {
  if (!orgId || orgId === "default") {
    return DEFAULT_TENANT_CONFIG;
  }

  // Check cache first
  const cached = tenantCache.get(orgId);
  if (cached) {
    return cached;
  }

  // Load from database
  await loadTenantConfigFromDatabase(orgId);

  // Return cached or default
  return tenantCache.get(orgId) || { ...DEFAULT_TENANT_CONFIG, orgId };
}
