/**
 * Domain Configuration
 *
 * Centralized domain and URL configuration.
 * All domain references should use these constants for consistency.
 *
 * @module lib/config/domains
 */

/**
 * Base domain configuration
 * Derives from environment variables with sensible defaults
 */
export const DOMAINS = {
  /** Primary application domain */
  primary: process.env.NEXT_PUBLIC_BASE_URL || "https://fixzit.co",

  /** API domain (same as primary for monolith) */
  api: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://fixzit.co",

  /** CDN/Assets domain */
  cdn: process.env.NEXT_PUBLIC_CDN_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://fixzit.co",

  /** App subdomain for authenticated users */
  app: process.env.NEXT_PUBLIC_APP_URL || "https://app.fixzit.co",

  /** Dashboard subdomain */
  dashboard: process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dashboard.fixzit.co",

  /** Staging environment */
  staging: process.env.NEXT_PUBLIC_STAGING_URL || "https://staging.fixzit.co",
} as const;

/**
 * Email domain configuration
 * Used for sending emails from the platform
 */
export const EMAIL_DOMAINS = {
  /** Primary email domain */
  primary: process.env.EMAIL_DOMAIN || "fixzit.co",

  /** No-reply sender */
  noReply: process.env.SENDGRID_FROM_EMAIL || `noreply@${process.env.EMAIL_DOMAIN || "fixzit.co"}`,

  /** Support email */
  support: process.env.SUPPORT_EMAIL || `support@${process.env.EMAIL_DOMAIN || "fixzit.co"}`,

  /** Sales email */
  sales: process.env.SALES_EMAIL || `sales@${process.env.EMAIL_DOMAIN || "fixzit.co"}`,

  /** Privacy inquiries */
  privacy: process.env.PRIVACY_EMAIL || `privacy@${process.env.EMAIL_DOMAIN || "fixzit.co"}`,

  /** Legal inquiries */
  legal: process.env.LEGAL_EMAIL || `legal@${process.env.EMAIL_DOMAIN || "fixzit.co"}`,

  /** Notifications sender */
  notifications: process.env.NOTIFICATIONS_EMAIL || `notifications@${process.env.EMAIL_DOMAIN || "fixzit.co"}`,

  /** Invoices/billing */
  invoices: process.env.INVOICES_EMAIL || `invoices@${process.env.EMAIL_DOMAIN || "fixzit.co"}`,

  /** Admin notifications/contact */
  admin: process.env.ADMIN_EMAIL || `admin@${process.env.EMAIL_DOMAIN || "fixzit.co"}`,

  /** Fulfillment center contact */
  fulfillment: process.env.FULFILLMENT_EMAIL || `fulfillment@${process.env.EMAIL_DOMAIN || "fixzit.co"}`,
} as const;

/**
 * Build a full URL from a path
 *
 * @param path - The path to append to the base URL
 * @param base - The base domain to use (defaults to primary)
 * @returns Full URL string
 */
export function buildUrl(path: string, base: keyof typeof DOMAINS = "primary"): string {
  const baseUrl = DOMAINS[base].replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Build a mailto link
 *
 * @param type - The type of email address to use
 * @returns mailto: URL
 */
export function buildMailto(type: keyof typeof EMAIL_DOMAINS): string {
  return `mailto:${EMAIL_DOMAINS[type]}`;
}

/**
 * Get the current base URL (handles Vercel deployments)
 *
 * @returns The current base URL
 */
export function getCurrentBaseUrl(): string {
  // Check for Vercel deployment URL first
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  return DOMAINS.primary;
}

/**
 * Check if a URL is from a trusted domain
 *
 * @param url - The URL to check
 * @returns Whether the URL is from a trusted domain
 */
export function isTrustedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const trustedHosts = [
      new URL(DOMAINS.primary).hostname,
      new URL(DOMAINS.app).hostname,
      new URL(DOMAINS.dashboard).hostname,
    ];
    return trustedHosts.some(host => parsed.hostname.endsWith(host));
  } catch {
    return false;
  }
}
