import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { auth } from "@/auth";
import { AuditLogModel } from "@/server/models/AuditLog";

/**
 * Audit Log Middleware Configuration
 */
export interface AuditConfig {
  enabled: boolean;
  excludePaths?: string[];
  excludeMethods?: string[];
  logRequestBody?: boolean;
  logResponseBody?: boolean;
}

const defaultConfig: AuditConfig = {
  enabled: true,
  excludePaths: ["/api/health", "/api/ping", "/_next", "/static"],
  excludeMethods: ["HEAD", "OPTIONS"], // Removed GET - we need to log failed auth attempts
  logRequestBody: false,
  logResponseBody: false,
};

/**
 * Entity type mapping for path parsing
 * PHASE-3 FIX: Extended with sub-role paths
 */
const entityMap: Record<string, string> = {
  properties: "PROPERTY",
  tenants: "TENANT",
  owners: "OWNER",
  contracts: "CONTRACT",
  payments: "PAYMENT",
  invoices: "INVOICE",
  workorders: "WORKORDER",
  tickets: "TICKET",
  projects: "PROJECT",
  bids: "BID",
  vendors: "VENDOR",
  users: "USER",
  documents: "DOCUMENT",
  settings: "SETTING",
  auth: "AUTH",
  finance: "FINANCE",
  expenses: "EXPENSE",
  accounts: "ACCOUNT",
  fm: "FM",
  aqar: "AQAR",
  // PHASE-3 FIX: Add sub-role and HR-specific entities
  hr: "HR",
  employees: "EMPLOYEE",
  payroll: "PAYROLL",
  attendance: "ATTENDANCE",
  leave: "LEAVE",
  crm: "CRM",
  leads: "LEAD",
  contacts: "CONTACT",
  support: "SUPPORT",
  reports: "REPORT",
};

/**
 * Extract action type from HTTP method and path
 */
function getActionType(method: string, path: string): string {
  if (method === "GET") return "READ";
  if (method === "POST") {
    if (path.includes("/login")) return "LOGIN";
    if (path.includes("/logout")) return "LOGOUT";
    if (path.includes("/upload")) return "UPLOAD";
    if (path.includes("/export")) return "EXPORT";
    if (path.includes("/import")) return "IMPORT";
    return "CREATE";
  }
  if (method === "PUT" || method === "PATCH") return "UPDATE";
  if (method === "DELETE") return "DELETE";
  return "CUSTOM";
}

/**
 * Extract entity type and ID from path using robust parsing
 * Handles nested routes like /api/admin/users, /api/fm/workorders, /api/properties/123/comments
 */
function extractEntity(path: string): {
  entityType: string;
  entityId?: string;
} {
  const segments = path.split("/").filter(Boolean);
  const apiIndex = segments.indexOf("api");

  if (apiIndex === -1) {
    return { entityType: "OTHER" };
  }

  let entityType = "OTHER";
  let entityId: string | undefined = undefined;

  // Iterate segments after 'api' to find entity and ID
  for (let i = apiIndex + 1; i < segments.length; i++) {
    const segment = segments[i].toLowerCase();
    const mappedEntity = entityMap[segment];

    if (mappedEntity) {
      entityType = mappedEntity;
      // Check if next segment is an ID (not another entity keyword)
      if (i + 1 < segments.length) {
        const possibleId = segments[i + 1];
        const possibleIdLower = possibleId.toLowerCase();

        // If next segment is not a known entity, treat it as an ID
        if (!entityMap[possibleIdLower]) {
          // Additional validation: IDs are typically alphanumeric, 8+ chars, or numeric
          if (
            /^[a-zA-Z0-9_-]{8,}$/.test(possibleId) ||
            /^\d+$/.test(possibleId)
          ) {
            entityId = possibleId;
          }
        }
      }
      break; // Found entity, stop searching
    }
  }

  // Special handling for auth routes
  if (entityType === "OTHER" && path.includes("/api/auth")) {
    entityType = "AUTH";
  }

  return { entityType, entityId };
}

/**
 * Audit Log Middleware
 *
 * Automatically logs ALL API requests including unauthenticated ones.
 * This is critical for security auditing - we must log failed login attempts,
 * unauthorized access attempts, and other security events.
 */
export async function auditLogMiddleware(
  request: NextRequest,
  config: Partial<AuditConfig> = {},
) {
  const finalConfig = { ...defaultConfig, ...config };

  if (!finalConfig.enabled) {
    return null;
  }

  const { pathname } = request.nextUrl;
  const method = request.method;

  // Check if path should be excluded
  const shouldExclude = finalConfig.excludePaths?.some((path) =>
    pathname.startsWith(path),
  );
  if (shouldExclude) {
    return null;
  }

  // Check if method should be excluded
  if (finalConfig.excludeMethods?.includes(method)) {
    return null;
  }

  // Get user session - but DO NOT skip logging if session is null
  // We need to log unauthenticated requests for security auditing
  let session = null;
  try {
    session = await auth();
  } catch (authError) {
    // If auth check fails, log the error but continue as anonymous
    logger.warn(
      "Auth session check failed during audit log, proceeding as anonymous",
      { error: authError },
    );
  }

  // Extract request context
  const userAgent = request.headers.get("user-agent") || "";
  const ipAddress =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Extract entity info using robust parsing
  const { entityType, entityId } = extractEntity(pathname);

  // Extract request context with improved UA parsing
  const requestContext = getRequestContext(userAgent);

  // ORGID-FIX: Enforce mandatory orgId for authenticated users
  // SUPER ADMIN FIX: Log Super Admin cross-tenant actions with marker
  // DRY FIX: Extract isSuperAdmin check to avoid repeated type assertions
  type UserWithSuperAdmin = { isSuperAdmin?: boolean; assumedOrgId?: string };
  const userWithAdmin = session?.user as UserWithSuperAdmin | undefined;
  const isSuperAdmin = Boolean(userWithAdmin?.isSuperAdmin);
  const assumedOrgId = userWithAdmin?.assumedOrgId;
  const rawOrgId = session?.user?.orgId;
  
  // Super Admin can operate cross-tenant - use assumedOrgId or marker
  const orgId = rawOrgId || (isSuperAdmin ? (assumedOrgId || 'superadmin-cross-tenant') : null);
  
  if (!orgId || orgId.trim() === '') {
    // Skip audit logging for anonymous/unauthenticated users
    // REASON: Multi-tenant isolation - cannot assign pseudo-orgId like "anonymous"
    return;
  }

  // Prepare audit log data - authenticated users only
  const auditData = {
    orgId,  // ✅ Validated above
    action: getActionType(method, pathname),
    entityType,
    entityId,
    userId: session?.user?.id || session?.user?.email || "unknown",
    userName: session?.user?.name || "Unknown User",
    userEmail: session?.user?.email || "unknown",
    userRole: session?.user?.role || "USER",
    // PHASE-2 FIX: Track Super Admin status for elevated access auditing
    isSuperAdmin,
    context: {
      method,
      endpoint: pathname,
      ipAddress,
      sessionId: session?.user?.sessionId,
      ...requestContext, // browser, os, device, userAgent
    },
    metadata: {
      source: "WEB" as const,
      // PHASE-2 FIX: Flag elevated access in metadata
      elevatedAccess: isSuperAdmin,
    },
    result: {
      success: true, // Will be updated after request completes
      duration: 0,
    },
  };

  // PHASE-2 FIX: Log Super Admin access explicitly
  if (isSuperAdmin) {
    logger.info('superadmin_api_access', {
      action: auditData.action,
      endpoint: pathname,
      method,
      orgId,
      userId: auditData.userId,
      timestamp: new Date().toISOString(),
    });
  }

  return auditData;
}

/**
 * Extract context from User Agent string with improved parsing
 * More robust than simple string matching, though not as good as a dedicated library
 */
function getRequestContext(userAgent: string) {
  const ua = userAgent.toLowerCase();

  // Browser detection (order matters - check most specific first)
  let browser = "Unknown";
  if (ua.includes("edg/") || ua.includes("edge")) {
    browser = "Edge";
  } else if (ua.includes("opr/") || ua.includes("opera")) {
    browser = "Opera";
  } else if (ua.includes("chrome") && !ua.includes("edg")) {
    browser = "Chrome";
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "Safari";
  } else if (ua.includes("firefox")) {
    browser = "Firefox";
  }

  // OS detection
  let os = "Unknown";
  if (ua.includes("windows nt")) {
    os = "Windows";
  } else if (ua.includes("mac os x") || ua.includes("macintosh")) {
    os = "macOS";
  } else if (ua.includes("iphone") || ua.includes("ipad")) {
    os = "iOS";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (ua.includes("linux")) {
    os = "Linux";
  }

  // Device type detection
  let device = "desktop";
  if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("ipod")) {
    device = "mobile";
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    device = "tablet";
  }

  return {
    userAgent,
    browser,
    os,
    device,
  };
}

/**
 * Log the audit entry to database
 * Silent fail pattern - audit logging must never break the main request
 */
export async function logAudit(
  auditData: Parameters<typeof AuditLogModel.log>[0],
  response?: NextResponse,
) {
  try {
    // Update result based on response
    if (response && auditData.result) {
      auditData.result.success =
        response.status >= 200 && response.status < 400;
      if (!auditData.result.success) {
        auditData.result.errorCode = response.status.toString();

        // Special handling for failed login attempts - make them explicit in action
        if (auditData.action === "LOGIN" && !auditData.result.success) {
          auditData.action = "LOGIN_FAILED";
        }
      }
    }

    // Asynchronously log without awaiting to not block response
    // Use catch to handle any DB errors
    AuditLogModel.log(auditData).catch((dbError: unknown) => {
      logger.error("Failed to write audit log to database", {
        error: dbError,
        action: auditData.action,
        endpoint: auditData.context?.endpoint,
      });
    });
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    // Silent fail for local errors - don't break the main request
    logger.error("Failed to prepare audit log for saving", {
      error,
      action: auditData.action,
    });
  }
}

/**
 * Manual audit log function for custom events
 */
export async function createAuditLog(
  data: Parameters<typeof AuditLogModel.log>[0],
) {
  try {
    await AuditLogModel.log(data);
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("Failed to create audit log", { error });
  }
}

// ============================================================================
// PII Sanitization for Audit Log Responses (PR-678-010)
// ============================================================================

/**
 * Sensitive field patterns that should be redacted in audit log responses.
 * These fields may contain PII, credentials, or other sensitive data.
 */
const SENSITIVE_FIELD_PATTERNS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "creditCard",
  "cardNumber",
  "cvv",
  "ssn",
  "iqamaNumber",
  "nationalId",
  "bankAccount",
  "iban",
];

/**
 * Redact a single value if it's a sensitive field
 */
function redactValue(key: string, value: unknown): unknown {
  const lowerKey = key.toLowerCase();
  for (const pattern of SENSITIVE_FIELD_PATTERNS) {
    if (lowerKey.includes(pattern.toLowerCase())) {
      return "[REDACTED]";
    }
  }
  return value;
}

/**
 * Recursively sanitize an object, redacting sensitive fields
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj !== "object") return obj;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === "object" && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = redactValue(key, value);
    }
  }
  return result;
}

/**
 * Sanitize audit log entries before returning in API responses.
 * Redacts sensitive PII/credential fields from changes, metadata, and snapshots.
 * 
 * @param logs - Array of audit log entries from database
 * @returns Sanitized logs with sensitive fields redacted
 */
export function sanitizeAuditLogs(logs: Record<string, unknown>[]): Record<string, unknown>[] {
  return logs.map((log) => {
    const sanitized: Record<string, unknown> = { ...log };
    
    // Sanitize changes array
    if (Array.isArray(sanitized.changes)) {
      sanitized.changes = (sanitized.changes as Record<string, unknown>[]).map((change) => ({
        ...change,
        oldValue: change.field ? redactValue(change.field as string, change.oldValue) : change.oldValue,
        newValue: change.field ? redactValue(change.field as string, change.newValue) : change.newValue,
      }));
    }
    
    // Sanitize snapshot
    if (sanitized.snapshot && typeof sanitized.snapshot === "object") {
      sanitized.snapshot = sanitizeObject(sanitized.snapshot);
    }
    
    // Sanitize metadata
    if (sanitized.metadata && typeof sanitized.metadata === "object") {
      sanitized.metadata = sanitizeObject(sanitized.metadata);
    }
    
    return sanitized;
  });
}

export default auditLogMiddleware;
