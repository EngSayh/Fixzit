/**
 * Tenant Configuration Utility
 *
 * Provides organization-specific configuration for multi-tenant support.
 * Enables white-label and rebrand compatibility.
 *
 * This module is CLIENT-SAFE and can be imported by any component.
 * For server-side database loading, import from '@/lib/config/tenant.server'
 *
 * @module lib/config/tenant
 */

import { Config } from "./constants";

/**
 * Tenant-specific configuration settings
 */
export interface TenantConfig {
  /** Organization ID */
  orgId: string;
  /** Display name for the organization */
  name: string;
  /** Primary domain for the organization */
  domain: string;
  /** Support email address */
  supportEmail: string;
  /** Support phone number */
  supportPhone: string;
  /** Default currency code (ISO 4217) */
  currency: string;
  /** Timezone for the organization */
  timezone: string;
  /** Brand colors */
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
  };
  /** Feature flags */
  features: {
    multiLanguage: boolean;
    smsNotifications: boolean;
    emailNotifications: boolean;
    mfaRequired: boolean;
  };
}

/**
 * Default tenant configuration from environment
 */
export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  orgId: "default",
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || Config.company.name,
  domain: process.env.NEXT_PUBLIC_BASE_URL || "https://fixzit.co",
  supportEmail: process.env.SUPPORT_EMAIL || Config.company.supportEmail,
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || Config.company.supportPhone,
  currency: process.env.DEFAULT_CURRENCY || "SAR",
  timezone: process.env.DEFAULT_TIMEZONE || "Asia/Riyadh",
  branding: {
    primaryColor: process.env.BRAND_PRIMARY_COLOR || "#0066CC",
    secondaryColor: process.env.BRAND_SECONDARY_COLOR || "#004499",
    logoUrl: process.env.BRAND_LOGO_URL,
  },
  features: {
    multiLanguage: process.env.FEATURE_MULTI_LANGUAGE !== "false",
    smsNotifications: process.env.FEATURE_SMS_NOTIFICATIONS !== "false",
    emailNotifications: process.env.FEATURE_EMAIL_NOTIFICATIONS !== "false",
    mfaRequired: process.env.FEATURE_MFA_REQUIRED === "true",
  },
};

/**
 * Cache for tenant configurations (shared between client and server)
 */
export const tenantCache = new Map<string, TenantConfig>();

/**
 * Get tenant configuration by organization ID
 *
 * This returns cached configuration or defaults. On the server side,
 * use getTenantConfigAsync from '@/lib/config/tenant.server' for
 * database-backed configuration.
 *
 * @param orgId - Organization ID (use 'default' for system defaults)
 * @returns Tenant configuration
 *
 * @example
 * ```ts
 * const config = getTenantConfig("org_123");
 * console.log(config.currency); // "SAR"
 * ```
 */
export function getTenantConfig(orgId?: string): TenantConfig {
  // Return default if no orgId provided
  if (!orgId || orgId === "default") {
    return DEFAULT_TENANT_CONFIG;
  }

  // Check cache first
  const cached = tenantCache.get(orgId);
  if (cached) {
    return cached;
  }

  // Return default config with orgId override
  // Server-side code should use getTenantConfigAsync for DB lookup
  return { ...DEFAULT_TENANT_CONFIG, orgId };
}

/**
 * Get the default currency for an organization
 *
 * @param orgId - Organization ID (optional)
 * @returns Currency code (ISO 4217)
 *
 * @example
 * ```ts
 * const currency = getCurrency("org_123"); // "SAR"
 * ```
 */
export function getCurrency(orgId?: string): string {
  return getTenantConfig(orgId).currency;
}

/**
 * Get the support contact information for an organization
 *
 * @param orgId - Organization ID (optional)
 * @returns Support contact details
 */
export function getSupportContact(orgId?: string): { email: string; phone: string } {
  const config = getTenantConfig(orgId);
  return {
    email: config.supportEmail,
    phone: config.supportPhone,
  };
}

/**
 * Get the timezone for an organization
 *
 * @param orgId - Organization ID (optional)
 * @returns Timezone identifier (IANA)
 */
export function getTimezone(orgId?: string): string {
  return getTenantConfig(orgId).timezone;
}

/**
 * Check if a feature is enabled for an organization
 *
 * @param feature - Feature name
 * @param orgId - Organization ID (optional)
 * @returns Whether the feature is enabled
 */
export function isFeatureEnabled(
  feature: keyof TenantConfig["features"],
  orgId?: string
): boolean {
  return getTenantConfig(orgId).features[feature];
}

/**
 * Clear the tenant configuration cache
 * Useful after configuration updates
 */
export function clearTenantCache(): void {
  tenantCache.clear();
}

/**
 * Update tenant configuration in cache
 *
 * @param orgId - Organization ID
 * @param config - Partial configuration to update
 */
export function updateTenantConfig(
  orgId: string,
  config: Partial<TenantConfig>
): TenantConfig {
  const existing = getTenantConfig(orgId);
  const updated = {
    ...existing,
    ...config,
    branding: { ...existing.branding, ...config.branding },
    features: { ...existing.features, ...config.features },
  };
  tenantCache.set(orgId, updated);
  return updated;
}

export default {
  getTenantConfig,
  getCurrency,
  getSupportContact,
  getTimezone,
  isFeatureEnabled,
  clearTenantCache,
  updateTenantConfig,
};
