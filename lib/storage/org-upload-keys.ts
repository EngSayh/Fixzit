import { Config } from "@/lib/config/constants";

type ValidationResult =
  | { ok: true; org: string }
  | { ok: false; status: number; message: string };

export function sanitizeTenantId(value: string | null | undefined): string | null {
  if (!value) return null;
  const sanitized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
  return sanitized.length ? sanitized : null;
}

function trimSlashes(input: string): string {
  return input.replace(/^\/+|\/+$/g, "");
}

/**
 * Extract the tenant/org prefix from an upload key.
 * Supports optional uploads prefix (e.g., "uploads/tenant-a/file.txt").
 */
export function extractOrgFromKey(
  key: string,
  uploadsPrefix: string = Config.aws.s3.uploadsPrefix,
): string | null {
  if (!key || typeof key !== "string") return null;
  const parts = key.split("/").filter(Boolean);
  if (parts.includes("..")) return null;

  const prefix = trimSlashes(uploadsPrefix || "");
  if (prefix && parts[0] === prefix) {
    return sanitizeTenantId(parts[1]);
  }
  return sanitizeTenantId(parts[0]);
}

/**
 * Validate that the provided key belongs to the caller's org/tenant.
 * Returns a structured result for consistent 4xx responses.
 */
export function validateOrgScopedKey(params: {
  key: string;
  allowedOrgId: string | null | undefined;
  uploadsPrefix?: string;
}): ValidationResult {
  const { key, allowedOrgId, uploadsPrefix = Config.aws.s3.uploadsPrefix } =
    params;
  if (!key || typeof key !== "string") {
    return { ok: false, status: 400, message: "Missing key" };
  }

  const sanitizedAllowed = sanitizeTenantId(allowedOrgId);
  if (!sanitizedAllowed) {
    return {
      ok: false,
      status: 401,
      message: "Organization context required",
    };
  }

  const keyOrg = extractOrgFromKey(key, uploadsPrefix);
  if (!keyOrg) {
    return {
      ok: false,
      status: 400,
      message: "Key must include organization prefix",
    };
  }

  if (keyOrg !== sanitizedAllowed) {
    return {
      ok: false,
      status: 403,
      message: "Key not permitted for this organization",
    };
  }

  return { ok: true, org: keyOrg };
}
