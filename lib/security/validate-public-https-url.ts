/**
 * SSRF Protection: Validate Public HTTPS URLs (synchronous)
 *
 * Enforces HTTPS-only and blocks localhost, private/link-local IPs,
 * internal TLDs, and direct IP addressing.
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
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.0.0.0/8
  /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
];

function normalizeHost(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

function getIPv6FirstHextet(hostname: string): number | null {
  const normalized = normalizeHost(hostname);
  if (!normalized.includes(":")) return null;
  const withoutZone = normalized.split("%")[0];
  const firstSegment = withoutZone.split(":")[0];
  if (!firstSegment) return null;
  const parsed = Number.parseInt(firstSegment, 16);
  return Number.isNaN(parsed) ? null : parsed;
}

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
  const normalized = normalizeHost(hostname);
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

function isIPv6LinkLocal(hostname: string): boolean {
  const hextet = getIPv6FirstHextet(hostname);
  return hextet !== null && hextet >= 0xfe80 && hextet <= 0xfebf;
}

function isIPv6UniqueLocal(hostname: string): boolean {
  const hextet = getIPv6FirstHextet(hostname);
  return hextet !== null && hextet >= 0xfc00 && hextet <= 0xfdff;
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

  const host = normalizeHost(parsed.hostname);

  if (isLocalhost(host)) {
    throw new URLValidationError(LOCALHOST_MESSAGES);
  }

  if (
    isPrivateIp(host) ||
    isLinkLocal(host) ||
    isIPv6LinkLocal(host) ||
    isIPv6UniqueLocal(host)
  ) {
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

export async function isValidPublicHttpsUrl(urlString: string): Promise<boolean> {
  try {
    validatePublicHttpsUrl(urlString);
    return true;
  } catch {
    return false;
  }
}
