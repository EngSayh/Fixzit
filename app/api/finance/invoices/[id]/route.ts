/**
 * @description Manages individual invoice operations by ID.
 * GET retrieves invoice details. PATCH updates status or amount.
 * DELETE cancels invoice (only in DRAFT status).
 * @route GET /api/finance/invoices/[id]
 * @route PATCH /api/finance/invoices/[id]
 * @route DELETE /api/finance/invoices/[id]
 * @access Private - Users with FINANCE:VIEW/UPDATE permission
 * @param {string} id - Invoice ID (MongoDB ObjectId)
 * @param {Object} body - status, amount, dueDate (for PATCH)
 * @returns {Object} invoice: { number, status, amount, customer, items }
 * @throws {401} If not authenticated
 * @throws {403} If lacking FINANCE permission
 * @throws {404} If invoice not found
 * @throws {409} If status transition not allowed
 */
import { NextRequest } from "next/server";
import * as svc from "@/server/finance/invoice.service";
import { getUserFromToken } from "@/lib/auth";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

import { zodValidationError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";
import { canEditInvoices } from "@/lib/auth/role-guards";

// Restrict status updates to valid enum values only
const invoiceUpdateSchema = z.object({
  status: z
    .enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED", "VOID"])
    .optional(),
  amount: z.number().optional(),
  dueDate: z.string().or(z.date()).optional(),
  description: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Rate limit: 30 req/min per IP for update operations
  const rateLimitResponse = enforceRateLimit(req, {
    requests: 30,
    windowMs: 60_000,
    keyPrefix: "finance:invoices:patch",
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

    // Role-based access control - only finance roles can modify invoices
    if (!canEditInvoices(user.role)) {
      return createSecureResponse(
        { error: "Insufficient permissions to modify invoices" },
        403,
        req,
      );
    }

    const { data: rawBody, error: parseError } = await parseBodySafe(req, {
      logPrefix: "[PATCH /api/finance/invoices/:id]",
    });
    if (parseError) {
      return createSecureResponse({ error: parseError }, 400, req);
    }
    const body = invoiceUpdateSchema.parse(rawBody);

    const inv = await svc.post(
      user.orgId,
      params.id,
      body,
      user.id,
      getClientIP(req),
    );
    return createSecureResponse({ data: inv }, 200, req);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    return createSecureResponse(
      { error: "Failed to update invoice" },
      400,
      req,
    );
  }
}
