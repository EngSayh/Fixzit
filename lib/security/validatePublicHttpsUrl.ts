/**
 * Validate that a URL is public-facing and uses HTTPS.
 * Blocks localhost, private IP ranges, link-local/AWS metadata, and internal TLDs.
 * Throws an Error with a descriptive message when invalid.
 */
export function validatePublicHttpsUrl(url: string, fieldName: string): void {
  const parsed = new URL(url);

  if (parsed.protocol !== "https:") {
    throw new Error(`${fieldName} must use HTTPS (received ${parsed.protocol})`);
  }

  const host = parsed.hostname.toLowerCase();

  // Block localhost variants
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1") {
    throw new Error(`${fieldName} cannot reference localhost`);
  }

  // Block private IP ranges (RFC 1918)
  if (host.startsWith("192.168.") || host.startsWith("10.") || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw new Error(`${fieldName} cannot reference private IP ranges`);
  }

  // Block link-local (169.254.x.x) - AWS metadata endpoint
  if (host.startsWith("169.254.")) {
    throw new Error(`${fieldName} cannot reference link-local addresses (AWS metadata)`);
  }

  // Block internal TLDs
  if (host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error(`${fieldName} cannot reference internal domains`);
  }
}
