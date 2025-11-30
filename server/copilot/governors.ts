/**
 * System Governors - Access Control and Policy Enforcement
 *
 * This module implements system-level governance to ensure users follow
 * established policies when accessing AI features.
 */

import { CopilotSession } from "./session";
import { logger } from "@/lib/logger";

export interface GovernorContext {
  session: CopilotSession;
  message: string;
  locale: "en" | "ar";
  endpoint: string;
}

export interface GovernorResult {
  allowed: boolean;
  reason?: string;
  governor?: string;
}

/**
 * Rate limiting governor - prevent abuse
 */
function checkRateLimit(_context: GovernorContext): GovernorResult {
  // Rate limiting is handled at the route level
  // This is a placeholder for additional business logic
  return { allowed: true };
}

/**
 * Role-based access governor - enforce RBAC
 */
function checkRoleAccess(context: GovernorContext): GovernorResult {
  const { session } = context;

  // Super admin and owner have full access
  // 🔒 STRICT v4.1: Use canonical role names with legacy fallbacks
  if (
    session.role === "SUPER_ADMIN" ||
    session.role === "CORPORATE_OWNER" || // Canonical (was OWNER)
    session.role === "OWNER" || // Legacy alias
    session.role === "ADMIN" ||
    session.role === "CORPORATE_ADMIN" // Legacy alias for ADMIN
  ) {
    return { allowed: true };
  }

  // Property manager has limited access
  // 🔒 STRICT v4.1: PROPERTY_MANAGER is canonical, FM_MANAGER is legacy alias
  if (session.role === "PROPERTY_MANAGER" || session.role === "FM_MANAGER") {
    // Check if asking for sensitive financial data
    const sensitiveKeywords = [
      "revenue",
      "profit",
      "salary",
      "cost",
      "expense",
      "إيرادات",
      "ربح",
      "راتب",
      "تكلفة",
      "مصروف",
    ];

    const hasSensitiveKeyword = sensitiveKeywords.some((keyword) =>
      context.message.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (hasSensitiveKeyword) {
      return {
        allowed: false,
        reason:
          context.locale === "ar"
            ? "ليست لديك صلاحية الوصول إلى المعلومات المالية الحساسة."
            : "You do not have permission to access sensitive financial information.",
        governor: "role_access",
      };
    }

    return { allowed: true };
  }

  // Technician has very limited access
  if (session.role === "TECHNICIAN") {
    // Only allow work order and maintenance related queries
    const allowedKeywords = [
      "work order",
      "maintenance",
      "task",
      "repair",
      "fix",
      "أمر عمل",
      "صيانة",
      "مهمة",
      "إصلاح",
      "تصليح",
    ];

    const hasAllowedKeyword = allowedKeywords.some((keyword) =>
      context.message.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (!hasAllowedKeyword) {
      return {
        allowed: false,
        reason:
          context.locale === "ar"
            ? "يمكنك فقط الاستفسار عن أوامر العمل والصيانة."
            : "You can only inquire about work orders and maintenance.",
        governor: "role_access",
      };
    }

    return { allowed: true };
  }

  // Tenant has read-only access (STRICT v4: CUSTOMER deprecated, use TENANT)
  if (session.role === "TENANT") {
    // Block any attempt to modify data
    const modifyKeywords = [
      "create",
      "update",
      "delete",
      "modify",
      "change",
      "إنشاء",
      "تحديث",
      "حذف",
      "تعديل",
      "تغيير",
    ];

    const hasModifyKeyword = modifyKeywords.some((keyword) =>
      context.message.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (hasModifyKeyword) {
      return {
        allowed: false,
        reason:
          context.locale === "ar"
            ? "ليست لديك صلاحية تعديل البيانات. يمكنك فقط عرض المعلومات."
            : "You do not have permission to modify data. You can only view information.",
        governor: "role_access",
      };
    }

    return { allowed: true };
  }

  // Default deny for unknown roles
  return {
    allowed: false,
    reason:
      context.locale === "ar"
        ? "دورك غير مصرح له باستخدام هذه الميزة."
        : "Your role is not authorized to use this feature.",
    governor: "role_access",
  };
}

/**
 * Content safety governor - prevent malicious inputs
 */
function checkContentSafety(context: GovernorContext): GovernorResult {
  const { message } = context;

  // Block SQL injection attempts
  const sqlPatterns = [
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+\w+\s+set/i,
    /union\s+select/i,
    /;\s*drop/i,
  ];

  if (sqlPatterns.some((pattern) => pattern.test(message))) {
    logger.warn("[governors] SQL injection attempt detected", {
      userId: context.session.userId,
      message: message.slice(0, 100),
    });

    return {
      allowed: false,
      reason:
        context.locale === "ar"
          ? "تم اكتشاف محتوى غير آمن في رسالتك."
          : "Unsafe content detected in your message.",
      governor: "content_safety",
    };
  }

  // Block command injection attempts
  const commandPatterns = [
    /\$\(.*\)/,
    /`.*`/,
    /&&/,
    /\|\|/,
    /;\s*rm\s+-rf/i,
    /exec\s*\(/i,
  ];

  if (commandPatterns.some((pattern) => pattern.test(message))) {
    logger.warn("[governors] Command injection attempt detected", {
      userId: context.session.userId,
      message: message.slice(0, 100),
    });

    return {
      allowed: false,
      reason:
        context.locale === "ar"
          ? "تم اكتشاف محتوى غير آمن في رسالتك."
          : "Unsafe content detected in your message.",
      governor: "content_safety",
    };
  }

  // Block excessive length
  if (message.length > 5000) {
    return {
      allowed: false,
      reason:
        context.locale === "ar"
          ? "رسالتك طويلة جداً. الحد الأقصى 5000 حرف."
          : "Your message is too long. Maximum 5000 characters.",
      governor: "content_safety",
    };
  }

  return { allowed: true };
}

/**
 * Business hours governor - optional enforcement of business hours
 */
function checkBusinessHours(context: GovernorContext): GovernorResult {
  // Optional: Enforce business hours for certain roles
  // For now, always allow (can be configured via env var)
  const enforceBusinessHours = process.env.ENFORCE_AI_BUSINESS_HOURS === "true";

  if (!enforceBusinessHours) {
    return { allowed: true };
  }

  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday

  // Check if weekend (Friday/Saturday for Saudi Arabia)
  if (day === 5 || day === 6) {
    return {
      allowed: false,
      reason:
        context.locale === "ar"
          ? "خدمة الذكاء الاصطناعي متاحة فقط في أيام العمل."
          : "AI service is only available on business days.",
      governor: "business_hours",
    };
  }

  // Check if outside business hours (9 AM - 6 PM)
  if (hour < 9 || hour >= 18) {
    return {
      allowed: false,
      reason:
        context.locale === "ar"
          ? "خدمة الذكاء الاصطناعي متاحة من 9 صباحاً حتى 6 مساءً."
          : "AI service is available from 9 AM to 6 PM.",
      governor: "business_hours",
    };
  }

  return { allowed: true };
}

/**
 * Data isolation governor - ensure tenant isolation
 */
function checkDataIsolation(context: GovernorContext): GovernorResult {
  const { session, message } = context;

  // Ensure tenantId is present
  if (!session.tenantId) {
    logger.error("[governors] Missing tenantId in session", {
      userId: session.userId,
      role: session.role,
    });

    return {
      allowed: false,
      reason:
        context.locale === "ar"
          ? "خطأ في التحقق من الهوية. يرجى تسجيل الدخول مجدداً."
          : "Authentication error. Please log in again.",
      governor: "data_isolation",
    };
  }

  // Block attempts to access other tenants' data
  const crossTenantPatterns = [
    /tenantId\s*[:=]\s*['"]?(?!\s*$)/i,
    /orgId\s*[:=]\s*['"]?(?!\s*$)/i,
    /organizationId\s*[:=]\s*['"]?(?!\s*$)/i,
  ];

  if (crossTenantPatterns.some((pattern) => pattern.test(message))) {
    logger.warn("[governors] Cross-tenant access attempt detected", {
      userId: context.session.userId,
      tenantId: context.session.tenantId,
      message: message.slice(0, 100),
    });

    return {
      allowed: false,
      reason:
        context.locale === "ar"
          ? "لا يمكنك الوصول إلى بيانات منظمات أخرى."
          : "You cannot access data from other organizations.",
      governor: "data_isolation",
    };
  }

  return { allowed: true };
}

/**
 * Main validation function - runs all governors
 */
export async function validateSystemGovernors(
  context: GovernorContext,
): Promise<GovernorResult> {
  // Run all governors in sequence
  const governors = [
    checkRateLimit,
    checkRoleAccess,
    checkContentSafety,
    checkBusinessHours,
    checkDataIsolation,
  ];

  for (const governor of governors) {
    const result = governor(context);
    if (!result.allowed) {
      logger.info("[governors] Access denied", {
        governor: result.governor,
        userId: context.session.userId,
        role: context.session.role,
        endpoint: context.endpoint,
      });
      return result;
    }
  }

  return { allowed: true };
}

/**
 * Check if user has permission for specific AI features
 */
export function hasAIPermission(role: string, feature: string): boolean {
  const permissions: Record<string, string[]> = {
    SUPER_ADMIN: ["chat", "stream", "tools", "analytics", "admin"],
    ADMIN: ["chat", "stream", "tools", "analytics", "admin"],
    OWNER: ["chat", "stream", "tools", "analytics"],
    CORPORATE_ADMIN: ["chat", "stream", "tools", "analytics"],
    FM_MANAGER: ["chat", "stream", "tools", "analytics"],
    PROPERTY_MANAGER: ["chat", "stream", "tools"],
    FINANCE: ["chat", "stream", "analytics"],
    HR: ["chat", "stream"],
    PROCUREMENT: ["chat", "stream"],
    TECHNICIAN: ["chat", "stream"],
    EMPLOYEE: ["chat"],
    TENANT: ["chat"],
    CUSTOMER: ["chat"],
    VENDOR: ["chat"],
    AUDITOR: ["chat", "analytics"],
    GUEST: [],
  };

  const rolePermissions = permissions[role] || [];
  return rolePermissions.includes(feature);
}
