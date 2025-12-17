/**
 * SSRF Protection: Validate Public HTTPS URLs (synchronous)
 *
 * Enforces HTTPS-only and blocks localhost, private/link-local IPs, internal TLDs,
 * and direct IP addressing. Throws URLValidationError with user-facing messages.
 */
export class URLValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "URLValidationError";
  }
}

const LOCALHOST_MESSAGES = "Localhost/loopback URLs are not allowed";
const PRIVATE_IP_MESSAGE = "Private IP address URLs are not allowed";
const HTTPS_MESSAGE = "Only HTTPS URLs are allowed";
const INTERNAL_TLD_MESSAGE =
  "Internal TLD (.local, .internal, .test) URLs are not allowed";
const DIRECT_IP_MESSAGE = "Direct IP addresses are discouraged";
const INVALID_MESSAGE = "Invalid URL format";

const PRIVATE_RANGES = [
  /^10\.(\d{1,3}\.){2}\d{1,3}$/, // 10.0.0.0/8
  /^192\.168\.(\d{1,3}\.)\d{1,3}$/, // 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[01])\.(\d{1,3}\.)\d{1,3}$/, // 172.16.0.0/12
];

function isIPv4(hostname: string): boolean {
  const ipv4 = hostname.match(
    /^(?<a>\d{1,3})\.(?<b>\d{1,3})\.(?<c>\d{1,3})\.(?<d>\d{1,3})$/,
  );
  if (!ipv4?.groups) return false;
  return (["a", "b", "c", "d"] as const).every(
    (oct) => Number(ipv4.groups![oct]) <= 255,
  );
}

function isLocalhost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized === "::" ||
    normalized === "[::1]" ||
    normalized === "[::]"
  );
}

function isPrivateIp(hostname: string): boolean {
  return PRIVATE_RANGES.some((pattern) => pattern.test(hostname));
}

function isLinkLocal(hostname: string): boolean {
  return hostname.startsWith("169.254.");
}

export function validatePublicHttpsUrl(urlString: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new URLValidationError(INVALID_MESSAGE);
  }

  if (parsed.protocol !== "https:") {
    throw new URLValidationError(HTTPS_MESSAGE);
  }

  const host = parsed.hostname.toLowerCase();

  if (isLocalhost(host)) {
    throw new URLValidationError(LOCALHOST_MESSAGES);
  }

  if (isPrivateIp(host) || isLinkLocal(host)) {
    throw new URLValidationError(PRIVATE_IP_MESSAGE);
  }

  if (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".test")
  ) {
    throw new URLValidationError(INTERNAL_TLD_MESSAGE);
  }

  if (isIPv4(host)) {
    throw new URLValidationError(DIRECT_IP_MESSAGE);
  }

  return parsed;
}

export function isValidPublicHttpsUrl(urlString: string): boolean {
  try {
    validatePublicHttpsUrl(urlString);
    return true;
  } catch {
    return false;
  }
}
