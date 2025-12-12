/**
 * @description Manages customer invoices for billing and accounts receivable.
 * GET lists invoices with status, customer, and date filters.
 * POST creates new invoices with line items and automatic numbering.
 * @route GET /api/finance/invoices
 * @route POST /api/finance/invoices
 * @access Private - Users with FINANCE:VIEW/CREATE permission
 * @param {string} status - Filter by status (DRAFT, SENT, PAID, OVERDUE, CANCELLED)
 * @param {string} customerId - Filter by customer
 * @param {Object} body - customerId, amount, currency, description, dueDate, items
 * @returns {Object} invoices: array, total: number
 * @throws {401} If not authenticated
 * @throws {403} If lacking FINANCE permission
 */
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import * as svc from "@/server/finance/invoice.service";
import { smartRateLimit } from "@/server/security/rateLimit";
import { getUserFromToken } from "@/lib/auth";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { createSecureResponse, getClientIP } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import {
  zodValidationError,
  rateLimitError,
  unauthorizedError,
} from "@/server/utils/errorResponses";
import { z } from "zod";
import { canEditInvoices, canViewInvoices } from "@/lib/auth/role-guards";

const invoiceCreateSchema = z.object({
  customerId: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().min(1).default("SAR"),
  description: z.string().min(1),
  dueDate: z.string().or(z.date()),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().positive(),
        price: z.number().positive(),
      }),
    )
    .optional(),
});

function isUnauthenticatedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("unauthenticated")
  );
}

async function tryGetSessionUser(req: NextRequest) {
  try {
    return await getSessionUser(req);
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * @openapi
 * /api/finance/invoices:
 *   get:
 *     summary: finance/invoices operations
 *     tags: [finance]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(req: NextRequest) {
  // Rate limit: 60 req/min per IP for read operations
  const rateLimitResponse = enforceRateLimit(req, {
    requests: 60,
    windowMs: 60_000,
    keyPrefix: "finance:invoices:get",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Try session-based auth first (cookies), fallback to Bearer token
    let user = await tryGetSessionUser(req);

    if (!user) {
      // Fallback to Bearer token authentication
      const token = req.headers
        .get("authorization")
        ?.replace("Bearer ", "")
        ?.trim();
      if (token) {
        const bearerUser = await getUserFromToken(token);
        if (bearerUser) {
          // Map Bearer token user to SessionUser format
          user = {
            ...bearerUser,
            tenantId: bearerUser.orgId,
          } as Awaited<ReturnType<typeof getSessionUser>>;
        }
      }
    }

    if (!user) {
      return createSecureResponse(
        { error: "Authentication required" },
        401,
        req,
      );
    }

    if (!user?.orgId) {
      return unauthorizedError("Missing tenant context");
    }

    // Role-based access control - only finance roles can view invoices
    if (!canViewInvoices(user.role)) {
      return createSecureResponse(
        { error: "Insufficient permissions to view invoices" },
        403,
        req,
      );
    }

    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const status = searchParams.get("status") || undefined;
    const data = await svc.list(user.orgId, q, status);
    return createSecureResponse({ data }, 200, req);
  } catch (error: unknown) {
    const correlationId = randomUUID();
    logger.error("[GET /api/finance/invoices] Error fetching invoices:", {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return createSecureResponse(
      { error: "Failed to fetch invoices", correlationId },
      500,
      req,
    );
  }
}

export async function POST(req: NextRequest) {
  // Rate limit: 20 req/min per IP for create operations
  const rateLimitResponse = enforceRateLimit(req, {
    requests: 20,
    windowMs: 60_000,
    keyPrefix: "finance:invoices:post",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Authentication & Authorization
    const token = req.headers
      .get("authorization")
      ?.replace("Bearer ", "")
      ?.trim();
    if (!token) {
      return createSecureResponse(
        { error: "Authentication required" },
        401,
        req,
      );
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return createSecureResponse({ error: "Invalid token" }, 401, req);
    }

    if (!user?.orgId) {
      return unauthorizedError("Missing tenant context");
    }

    // Role-based access control - only finance roles can create invoices
    if (!canEditInvoices(user.role)) {
      return createSecureResponse(
        { error: "Insufficient permissions to create invoices" },
        403,
        req,
      );
    }

    const key = `inv:${user.orgId}:${user.id}`;
    const rl = await smartRateLimit(key, 20, 60_000);
    if (!rl.allowed)
      return createSecureResponse({ error: "Rate limit exceeded" }, 429, req);

    const body = invoiceCreateSchema.parse(await req.json());

    const data = await svc.create(
      { ...body, orgId: user.orgId },
      user.id,
      getClientIP(req),
    );
    return createSecureResponse({ data }, 201, req);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    const correlationId = crypto.randomUUID();
    logger.error("[POST /api/finance/invoices] Error creating invoice:", {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return createSecureResponse(
      { error: "Failed to create invoice", correlationId },
      400,
      req,
    );
  }
}
