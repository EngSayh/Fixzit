/**
 * API Guard Middleware
 *
 * Provides server-side permission checking for API routes.
 * Use requirePermission() to wrap API handlers with permission requirements.
 *
 * Usage:
 * ```typescript
 * import { requirePermission } from '@/lib/apiGuard';
 *
 * async function handler(req, res) {
 *   // Your API logic here
 * }
 *
 * export default requirePermission('finance:invoice.create', handler);
 * ```
 */

import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { logger } from "@/lib/logger";
import { auth } from "@/auth";
import { can, createRbacContext } from "./rbac";
import { audit } from "./audit";

function deriveOrgId(
  req: NextApiRequest,
  sessionOrgId?: string | null,
): string {
  const headerOrg =
    (req.headers["x-org-id"] as string | undefined) ||
    (req.headers["x-organization-id"] as string | undefined);
  const orgId = sessionOrgId || headerOrg;
  return orgId?.trim() || "unknown";
}

/**
 * Require a specific permission to access an API route
 *
 * @param required Permission key (e.g., "finance:invoice.create")
 * @param handler Next.js API handler function
 * @returns Wrapped handler with permission check
 */
export function requirePermission(
  required: string,
  handler: NextApiHandler,
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Get session
      const session = await auth();

      if (!session?.user) {
        // Audit failed access attempt
        await audit({
          actorId: "anonymous",
          actorEmail: "anonymous",
          action: "api.access.denied",
          orgId: deriveOrgId(req),
          meta: {
            path: req.url,
            method: req.method,
            required,
            reason: "not_authenticated",
          },
          ipAddress:
            (req.headers["x-forwarded-for"] as string) ||
            req.socket.remoteAddress,
          success: false,
        });

        return res
          .status(401)
          .json({ error: "Unauthorized", message: "Authentication required" });
      }

      // Create RBAC context
      const ctx = createRbacContext(session.user);

      // Check permission
      if (!can(ctx, required)) {
        // Audit failed permission check
        await audit({
          actorId: session.user.id || "unknown",
          actorEmail: session.user.email || "unknown",
          action: "api.access.forbidden",
          orgId: deriveOrgId(req, session.user.orgId),
          meta: {
            path: req.url,
            method: req.method,
            required,
            reason: "insufficient_permissions",
            userPermissions: ctx.permissions,
            isSuperAdmin: ctx.isSuperAdmin,
          },
          ipAddress:
            (req.headers["x-forwarded-for"] as string) ||
            req.socket.remoteAddress,
          success: false,
        });

        return res.status(403).json({
          error: "Forbidden",
          message: `Permission required: ${required}`,
          required,
        });
      }

      // Audit successful access (for sensitive operations)
      if (required.includes("admin:") || required.includes("super")) {
        await audit({
          actorId: session.user.id || "unknown",
          actorEmail: session.user.email || "unknown",
          action: "api.access.granted",
          orgId: deriveOrgId(req, session.user.orgId),
          meta: {
            path: req.url,
            method: req.method,
            required,
            isSuperAdmin: ctx.isSuperAdmin,
          },
          ipAddress:
            (req.headers["x-forwarded-for"] as string) ||
            req.socket.remoteAddress,
          success: true,
        });
      }

      // Call original handler
      return handler(req, res);
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("[apiGuard] Error:", { error });

      await audit({
        actorId: "system",
        actorEmail: "system",
        action: "api.access.error",
        orgId: deriveOrgId(req),
        meta: {
          path: req.url,
          method: req.method,
          required,
          error: error instanceof Error ? error.message : String(error),
        },
        success: false,
      });

      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}

/**
 * Require ANY of the specified permissions
 *
 * @param requiredAny Array of permission keys
 * @param handler Next.js API handler function
 * @returns Wrapped handler with permission check
 */
export function requireAnyPermission(
  requiredAny: string[],
  handler: NextApiHandler,
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const session = await auth();

      if (!session?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const ctx = createRbacContext(session.user);

      // Check if user has any of the required permissions
      const hasPermission =
        ctx.isSuperAdmin ||
        requiredAny.some((perm) => ctx.permissions.includes(perm));

      if (!hasPermission) {
        await audit({
          actorId: session.user.id || "unknown",
          actorEmail: session.user.email || "unknown",
          action: "api.access.forbidden",
          orgId: deriveOrgId(req, session.user.orgId),
          meta: {
            path: req.url,
            method: req.method,
            requiredAny,
            reason: "insufficient_permissions",
          },
          success: false,
        });

        return res.status(403).json({
          error: "Forbidden",
          message: `One of these permissions required: ${requiredAny.join(", ")}`,
          requiredAny,
        });
      }

      return handler(req, res);
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("[apiGuard] Error:", { error });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}

/**
 * Require ALL of the specified permissions
 *
 * @param requiredAll Array of permission keys
 * @param handler Next.js API handler function
 * @returns Wrapped handler with permission check
 */
export function requireAllPermissions(
  requiredAll: string[],
  handler: NextApiHandler,
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const session = await auth();

      if (!session?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const ctx = createRbacContext(session.user);

      // Check if user has all required permissions
      const hasAllPermissions =
        ctx.isSuperAdmin ||
        requiredAll.every((perm) => ctx.permissions.includes(perm));

      if (!hasAllPermissions) {
        await audit({
          actorId: session.user.id || "unknown",
          actorEmail: session.user.email || "unknown",
          action: "api.access.forbidden",
          orgId: deriveOrgId(req, session.user.orgId),
          meta: {
            path: req.url,
            method: req.method,
            requiredAll,
            reason: "insufficient_permissions",
          },
          success: false,
        });

        return res.status(403).json({
          error: "Forbidden",
          message: `All these permissions required: ${requiredAll.join(", ")}`,
          requiredAll,
        });
      }

      return handler(req, res);
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("[apiGuard] Error:", { error });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}

/**
 * Require Super Admin access
 *
 * @param handler Next.js API handler function
 * @returns Wrapped handler with Super Admin check
 */
export function requireSuperAdmin(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const session = await auth();

      if (!session?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const ctx = createRbacContext(session.user);

      if (!ctx.isSuperAdmin) {
        await audit({
          actorId: session.user.id || "unknown",
          actorEmail: session.user.email || "unknown",
          action: "api.access.forbidden",
          meta: {
            path: req.url,
            method: req.method,
            required: "super_admin",
            reason: "not_super_admin",
          },
          success: false,
        });

        return res.status(403).json({
          error: "Forbidden",
          message: "Super Admin access required",
        });
      }

      // Audit Super Admin access
      await audit({
        actorId: session.user.id || "unknown",
        actorEmail: session.user.email || "unknown",
        action: "api.super_admin.access",
        meta: {
          path: req.url,
          method: req.method,
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress,
        success: true,
      });

      return handler(req, res);
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("[apiGuard] Error:", { error });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}

/**
 * Helper to get RBAC context from API request
 * Useful when you need to check permissions inside your handler
 *
 * @param req Next.js API request
 * @param res Next.js API response
 * @returns RBAC context or null if not authenticated
 */
export async function getRbacContext(
  _req: NextApiRequest,
  _res: NextApiResponse,
): Promise<ReturnType<typeof createRbacContext> | null> {
  const session = await auth();
  if (!session?.user) return null;
  return createRbacContext(session.user);
}
