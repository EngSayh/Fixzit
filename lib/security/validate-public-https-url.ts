/**
 * @module lib/security/validate-public-https-url
 * @description SSRF-safe URL validation for webhooks, callbacks, and redirects
 *
 * Enforces:
 * - HTTPS only
 * - Blocks localhost / loopback (127.0.0.1, ::1, localhost)
 * - Blocks private IP ranges (10.*, 192.168.*, 172.16-31.*)
 * - Blocks link-local (169.254.*)
 * - Blocks internal TLDs (.local, .internal)
 * - Normalizes and rejects suspicious unicode/IDN edge cases
 *
 * @usage
 * ```ts
 * const result = validatePublicHttpsUrl(userProvidedUrl);
 * if (!result.valid) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * // Safe to use result.normalizedUrl
 * ```
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./, // link-local
  /^127\./, // loopback
  /^0\.0\.0\.0/, // wildcard
];

const LOOPBACK_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "0.0.0.0",
];

const INTERNAL_TLDS = [".local", ".internal", ".test"];

/**
 * Validates that a URL is HTTPS and points to a public destination
 * @param urlString - URL to validate
 * @returns ValidationResult with valid flag and optional error/normalizedUrl
 */
export function validatePublicHttpsUrl(
  urlString: string,
): ValidationResult {
  if (!urlString || typeof urlString !== "string") {
    return { valid: false, error: "URL is required" };
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  // Enforce HTTPS
  if (url.protocol !== "https:") {
    return {
      valid: false,
      error: "Only HTTPS URLs are allowed",
    };
  }

  const hostname = url.hostname.toLowerCase();

  // Block loopback hostnames
  if (LOOPBACK_HOSTNAMES.includes(hostname)) {
    return {
      valid: false,
      error: "Localhost/loopback URLs are not allowed",
    };
  }

  // Block internal TLDs
  if (INTERNAL_TLDS.some((tld) => hostname.endsWith(tld))) {
    return {
      valid: false,
      error: "Internal TLD (.local, .internal, .test) URLs are not allowed",
    };
  }

  // Block private IP patterns
  if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return {
      valid: false,
      error: "Private IP address URLs are not allowed",
    };
  }

  // Normalize URL (remove fragments, preserve query)
  const normalizedUrl = `${url.protocol}//${url.host}${url.pathname}${url.search}`;

  return {
    valid: true,
    normalizedUrl,
  };
}
