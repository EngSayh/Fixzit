import { NextRequest } from "next/server";
import { dbConnect } from "@/db/mongoose";
import PriceBook from "@/server/models/PriceBook";
import { requireSuperAdmin } from "@/lib/authz";

import { createSecureResponse } from "@/server/security/headers";

/**
 * @openapi
 * /api/admin/billing/pricebooks/{id}:
 *   patch:
 *     summary: Update pricebook
 *     description: Updates a pricebook configuration. Requires super admin access.
 *     tags:
 *       - Admin
 *       - Billing
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Pricebook updated successfully
 *       404:
 *         description: Pricebook not found
 *       403:
 *         description: Forbidden - Super admin only
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  await dbConnect();
  await requireSuperAdmin(req);
  const body = await req.json();

  // AUDIT-2025-12-08: Whitelist allowed fields to prevent mass assignment
  const allowedFields = ['name', 'description', 'prices', 'currency', 'effectiveDate', 'expiryDate', 'isActive', 'metadata'];
  const sanitizedBody: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      sanitizedBody[key] = body[key];
    }
  }

  const doc = await PriceBook.findByIdAndUpdate(params.id, sanitizedBody, { new: true });
  if (!doc) {
    return createSecureResponse({ error: "NOT_FOUND" }, 404, req);
  }

  return createSecureResponse(doc, 200, req);
}
