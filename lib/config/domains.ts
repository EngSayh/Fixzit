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

  /** Fulfillment notifications */
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

  // Fall back to configured base URL
  return DOMAINS.primary;
}

/**
 * CORS allowlist - domains allowed for cross-origin requests
 */
export const CORS_ALLOWLIST = [
  DOMAINS.primary,
  DOMAINS.app,
  DOMAINS.dashboard,
  DOMAINS.staging,
  DOMAINS.api,
  // Add www variants
  DOMAINS.primary.replace("://", "://www."),
  // Development
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
].filter((url, index, self) => self.indexOf(url) === index); // Dedupe

/**
 * Check if a URL is in the CORS allowlist
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const normalizedOrigin = parsed.origin;
    const hostname = parsed.hostname.replace(/^www\./, "");
    return CORS_ALLOWLIST.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        const allowedHost = allowedUrl.hostname.replace(/^www\./, "");
        // Allow exact match or subdomains of allowed host
        return (
          normalizedOrigin === allowedUrl.origin ||
          hostname === allowedHost ||
          hostname.endsWith(`.${allowedHost}`)
        );
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

/**
 * External service URLs
 */
export const EXTERNAL_URLS = {
  /** Google Maps API */
  googleMaps: "https://maps.googleapis.com/maps/api/js",

  /** OpenAI API */
  openAi: "https://api.openai.com/v1",

  /** PayTabs payment gateway */
  payTabs: process.env.PAYTABS_BASE_URL || "https://secure.paytabs.sa",

  /** ZATCA e-invoicing */
  zatca: "https://gw-fatoora.zatca.gov.sa",

  /** Datadog logging */
  datadog: "https://http-intake.logs.datadoghq.com",

  /** WhatsApp deep link */
  whatsapp: "https://wa.me",
} as const;

/**
 * Build WhatsApp chat link
 *
 * @param phone - Phone number (will be cleaned)
 * @param message - Optional pre-filled message
 */
export function buildWhatsAppLink(phone: string, message?: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const baseUrl = `${EXTERNAL_URLS.whatsapp}/${cleanPhone}`;
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  return baseUrl;
}

/**
 * Check if a domain is trusted (belongs to our platform)
 */
export function isTrustedDomain(url: string): boolean {
  const stripWww = (h: string) => h.replace(/^www\./, "");
  try {
    const hostname = new URL(url).hostname;
    const primaryHost = stripWww(new URL(DOMAINS.primary).hostname);
    const configuredHosts = [
      primaryHost,
      stripWww(new URL(DOMAINS.app).hostname),
      stripWww(new URL(DOMAINS.dashboard).hostname),
      stripWww(new URL(DOMAINS.api).hostname),
      stripWww(new URL(DOMAINS.staging).hostname),
    ];

    const saVariant = process.env.PRIMARY_SA_DOMAIN
      ? stripWww(new URL(process.env.PRIMARY_SA_DOMAIN).hostname)
      : null;
    if (saVariant) {
      configuredHosts.push(saVariant);
    }

    return configuredHosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export type DomainKey = keyof typeof DOMAINS;
export type EmailDomainKey = keyof typeof EMAIL_DOMAINS;
